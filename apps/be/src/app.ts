import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./configs/env";

const app = express();

// ─── Bảo mật ───────────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: env.NODE_ENV === "development" ? "*" : [],
    credentials: true,
  }),
);

// ─── Parse request ─────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── HTTP logging ──────────────────────────────────
app.use(morgan("dev"));

// ─── Health check ──────────────────────────────────
app.get("/health", (_, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ─── Routes (thêm sau) ─────────────────────────────
// app.use('/api/v1', routes)

export default app;
