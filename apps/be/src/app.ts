import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import { env } from "./configs/env";
import router from "./routers";
import { errorMiddleware } from "./middlewares/error.middleware";

const app = express();

const privateNetworkOriginPattern =
  /^https?:\/\/(localhost|127\.0\.0\.1|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3})(:\d+)?$/;

app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      const allowedOrigins = env.CORS_ORIGINS.split(",").map((o) => o.trim());
      const isLocalhost = /^https?:\/\/([^.]+\.)?localhost(:\d+)?$/.test(
        origin,
      );
      const isPrivateNetworkOrigin = privateNetworkOriginPattern.test(origin);

      if (allowedOrigins.includes(origin) || isLocalhost || isPrivateNetworkOrigin) {
        callback(null, true);
      } else {
        callback(new Error(`CORS blocked: ${origin}`));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "x-tenant-slug",
      "X-Tenant-Slug",
      "x-store-slug",
      "X-Store-Slug",
    ],
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan("dev"));

app.get("/health", (_, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api", router);
app.use(errorMiddleware);

export default app;
