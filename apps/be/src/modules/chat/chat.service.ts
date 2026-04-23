import { PrismaClient as RetailClient } from "../../../generated/retail-client";
import { getGeminiModel } from "@/configs/ai.config";
import logger from "@/configs/logger";
import { ChatRepository } from "./chat.repository";
import { ContextBuilder } from "./context-builder";

const CUSTOMER_SYSTEM_PROMPT = (shopName: string, context: string) => `
Ban la tro ly mua sam AI cua cua hang "${shopName}".

NHIEM VU:
- Giup khach hang tim san pham phu hop
- Tu van san pham, gia ca, chuong trinh khuyen mai
- Huong dan su dung ma giam gia (voucher)
- Tra cuu trang thai don hang cua khach dua vao lich su mua hang duoc cung cap
- Tra loi than thien, tu nhien, bang tieng Viet
- Neu khach hoi ve san pham khong co trong du lieu, hay noi ro "Hien cua hang chua co san pham nay"

QUY TAC:
- KHONG bia thong tin ve san pham khong co trong du lieu
- KHONG dua ra gia khac voi du lieu
- Tra loi ngan gon, ro rang, de hieu
- Khi gioi thieu san pham, kem gia ca
- Neu co voucher/khuyen mai phu hop, chu dong goi y

DU LIEU CUA HANG:
${context}
`.trim();

const MERCHANT_SYSTEM_PROMPT = (shopName: string, context: string) => `
Ban la tro ly quan ly kinh doanh AI cua cua hang "${shopName}".

NHIEM VU:
- Phan tich tinh hinh kinh doanh, doanh thu, ton kho
- Goi y nhap hang khi ton kho thap
- De xuat thoi diem, chien luoc tao chuong trinh khuyen mai
- Phan tich san pham ban chay/e
- Tu van chien luoc gia va voucher

QUY TAC:
- Dua tren DU LIEU THUC TE ben duoi de dua ra goi y
- Goi y cu the, co so lieu minh hoa
- Tra loi bang tieng Viet, chuyen nghiep nhung de hieu
- Neu khong du du lieu de phan tich, noi ro can them thong tin gi

DU LIEU CUA HANG:
${context}
`.trim();

interface SendMessageDto {
  sessionId?: string;
  message: string;
}

interface ChatUser {
  tenantId: string;
  tenantSlug: string;
  userId: string;
  userType: "CUSTOMER" | "USER";
  userName?: string;
  dbName: string;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class ChatService {
  private repo: ChatRepository;
  private contextBuilder: ContextBuilder;

  constructor(private db: RetailClient) {
    this.repo = new ChatRepository();
    this.contextBuilder = new ContextBuilder(db);
  }

  async sendMessage(user: ChatUser, dto: SendMessageDto) {
    let sessionId = dto.sessionId;
    let isNewSession = false;

    if (!sessionId) {
      const session = await this.repo.createSession({
        tenant_id: user.tenantId,
        tenant_slug: user.tenantSlug,
        user_id: user.userId,
        user_type: user.userType,
        user_name: user.userName,
      });
      sessionId = session._id.toString();
      isNewSession = true;
    } else {
      const session = await this.repo.findSessionById(sessionId);
      if (!session || session.user_id !== user.userId) {
        throw new Error("Session khong ton tai hoac khong thuoc ve ban");
      }
    }

    await this.repo.createMessage({
      session_id: sessionId,
      role: "user",
      content: dto.message,
    });

    if (isNewSession) {
      await this.repo.updateSessionTitle(sessionId, dto.message);
    }

    const context = user.userType === "CUSTOMER"
      ? await this.contextBuilder.buildCustomerContext(user.tenantSlug, user.userId)
      : await this.contextBuilder.buildMerchantContext();

    const systemPrompt = user.userType === "CUSTOMER"
      ? CUSTOMER_SYSTEM_PROMPT(user.tenantSlug, context)
      : MERCHANT_SYSTEM_PROMPT(user.tenantSlug, context);

    const history = await this.repo.getHistory(sessionId);
    const aiReply = await this.callGemini(systemPrompt, history, dto.message);

    await this.repo.createMessage({
      session_id: sessionId,
      role: "assistant",
      content: aiReply,
    });

    logger.info(`[Chat] ${user.userType}:${user.userId} -> AI reply (${aiReply.length} chars)`, {
      tenant: user.tenantId,
      userId: user.userId,
      userType: user.userType,
    });

    return {
      session_id: sessionId,
      reply: aiReply,
    };
  }

  async getSessions(user: ChatUser) {
    return this.repo.findSessionsByUser(user.tenantId, user.userId, user.userType);
  }

  async getHistory(user: ChatUser, sessionId: string) {
    const session = await this.repo.findSessionById(sessionId);
    if (!session || session.user_id !== user.userId) {
      throw new Error("Session khong ton tai");
    }
    return this.repo.getHistory(sessionId);
  }

  private async callGemini(
    systemPrompt: string,
    history: Array<{ role: string; content: string }>,
    userMessage: string,
  ): Promise<string> {
    const model = getGeminiModel(systemPrompt);

    const chatHistory = history
      .filter((m) => m.role !== "system")
      .slice(-20)
      .map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

    const maxAttempts = 3;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        const chat = model.startChat({
          history: chatHistory as any,
        });

        const result = await chat.sendMessage(userMessage);
        return result.response.text();
      } catch (err: any) {
        const message = String(err?.message || "");
        const isRetryable = /503|429|high demand|service unavailable|overloaded|unavailable/i.test(message);

        logger.error(`[Chat] Gemini API error (attempt ${attempt}/${maxAttempts}): ${message}`, {
          tenant: "system",
          userId: "system",
          userType: "ADMIN",
        });

        if (!isRetryable || attempt === maxAttempts) {
          if (isRetryable) {
            return "AI dang qua tai tam thoi nen chua phan hoi on dinh. Vui long gui lai sau khoang 10-30 giay nua.";
          }

          return "Xin loi, toi dang gap su co ky thuat. Vui long thu lai sau it phut nua.";
        }

        await sleep(800 * attempt);
      }
    }

    return "AI dang qua tai tam thoi nen chua phan hoi on dinh. Vui long gui lai sau khoang 10-30 giay nua.";
  }
}
