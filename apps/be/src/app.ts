import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import { env } from "./configs/env";
import router from "./routers";
import { errorMiddleware } from "./middlewares/error.middleware";

const app = express();

// ─── Bảo mật ───────────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      // Cho phép request không có origin (Postman, mobile...)
      if (!origin) return callback(null, true);

      const allowedOrigins = env.CORS_ORIGINS.split(",").map((o) => o.trim());

      const isLocalhost = /^https?:\/\/([^.]+\.)?localhost(:\d+)?$/.test(
        origin,
      );

      if (allowedOrigins.includes(origin) || isLocalhost) {
        callback(null, true);
      } else {
        callback(new Error(`CORS blocked: ${origin}`));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// ─── Parse request ─────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser()); // ← chuyển lên đây cùng nhóm parse

// ─── HTTP logging ──────────────────────────────────
app.use(morgan("dev"));

// ─── Health check ──────────────────────────────────
app.get("/health", (_, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ─── Routes ─────────────────────────────
app.use("/api", router);

// ─── Error middleware ─────────────────────────────
app.use(errorMiddleware);

export default app;
