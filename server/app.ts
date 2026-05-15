import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import path from "node:path";
import { fileURLToPath } from "node:url";
import authRouter from "./auth.js";
import funcionariosRouter from "./funcionarios.js";
import blocosRouter from "./blocos.js";
import moradoresRouter from "./moradores.js";
import condominiosRouter from "./condominios.js";
import usersRouter from "./users.js";
import masterRouter from "./master.js";
import visitorsRouter from "./visitors.js";
import preAuthRouter from "./preAuthorizations.js";
import deliveryRouter from "./deliveryAuthorizations.js";
import vehicleRouter from "./vehicleAuthorizations.js";
import condominioConfigRouter from "./condominioConfig.js";
import correspondenciasRouter from "./correspondencias.js";
import livroProtocoloRouter from "./livroProtocolo.js";
import camerasRouter from "./cameras.js";
import rondasRouter from "./rondas.js";
import estouChegandoRouter from "./estouChegando.js";
import deviceTokensRouter from "./deviceTokens.js";
import visitorQRShareRouter from "./visitorQRShare.js";
import faceRouter from "./faceRoutes.js";
import gateRouter from "./gateRoutes.js";
import whatsappRouter from "./whatsappRoutes.js";
import { performBackup } from "./db.js";
import { authenticate, authorize } from "./middleware.js";
import { logger } from "./logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function createApp(): Promise<express.Express> {
  const app = express();
  const isProd = process.env.NODE_ENV === "production";

  // Security headers (helmet) — em prod bloqueia eval; em dev permite (Vite HMR).
  const scriptSrc = isProd
    ? ["'self'", "'unsafe-inline'"]
    : ["'self'", "'unsafe-inline'", "'unsafe-eval'"];

  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc,
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        imgSrc: ["'self'", "data:", "blob:", "https:", "http:"],
        connectSrc: ["'self'", "wss:", "ws:", "https:", "http:"],
        fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
        mediaSrc: ["'self'", "blob:", "data:"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  }));

  // CORS — restrito a origens conhecidas
  const ALLOWED_ORIGINS = new Set([
    "http://localhost:5173",
    "https://localhost:5173",
    "http://localhost:3001",
    "https://localhost",
    "https://portariax.com.br",
    "https://www.portariax.com.br",
    "capacitor://localhost",
    "http://localhost",
  ]);

  const isLocalNetworkOrigin = (origin: string): boolean => {
    if (isProd) return false;
    try {
      const url = new URL(origin);
      return /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(url.hostname);
    } catch { return false; }
  };

  app.use(cors({
    origin: (origin, callback) => {
      if (!origin || ALLOWED_ORIGINS.has(origin) || isLocalNetworkOrigin(origin || "")) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    credentials: true,
  }));

  app.use(express.json({ limit: "10mb" }));
  app.use(cookieParser());

  // Rate limiting global — 200 req/min por IP (apenas em produção)
  app.use("/api", rateLimit({
    windowMs: 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Muitas requisições. Tente novamente em 1 minuto." },
    skip: () => !isProd,
  }));

  // Rate limiting rigoroso para autenticação — 5 tentativas/15min
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Muitas tentativas de login. Tente novamente em 15 minutos." },
    skip: () => !isProd,
    keyGenerator: (req) => {
      const email = req.body?.email?.toLowerCase?.() || "";
      const ip = ipKeyGenerator(req.ip || req.socket.remoteAddress || "unknown");
      return `${ip}:${email}`;
    },
    validate: { xForwardedForHeader: false },
  });
  app.use("/api/auth/login", authLimiter);
  app.use("/api/auth/register", authLimiter);
  app.use("/api/auth/demo", authLimiter);

  // UTF-8 charset on all JSON responses
  app.use((_req, res, next) => {
    const origJson = res.json.bind(res);
    res.json = (body: any) => {
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      return origJson(body);
    };
    next();
  });

  // Request logging (dev only)
  if (!isProd && process.env.NODE_ENV !== "test") {
    app.use((req, res, next) => {
      const start = Date.now();
      res.on("finish", () => {
        const ms = Date.now() - start;
        logger.debug(`${req.method} ${req.path} ${res.statusCode} ${ms}ms`);
      });
      next();
    });
  }

  // Routes
  app.use("/api/auth", authRouter);
  app.use("/api/funcionarios", funcionariosRouter);
  app.use("/api/blocos", blocosRouter);
  app.use("/api/moradores", moradoresRouter);
  app.use("/api/condominios", condominiosRouter);
  app.use("/api/users", usersRouter);
  app.use("/api/master", masterRouter);
  app.use("/api/visitors", visitorsRouter);
  app.use("/api/pre-authorizations", preAuthRouter);
  app.use("/api/delivery-authorizations", deliveryRouter);
  app.use("/api/vehicle-authorizations", vehicleRouter);
  app.use("/api/condominio-config", condominioConfigRouter);
  app.use("/api/correspondencias", correspondenciasRouter);
  app.use("/api/livro-protocolo", livroProtocoloRouter);
  app.use("/api/cameras", camerasRouter);
  app.use("/api/rondas", rondasRouter);
  app.use("/api/estou-chegando", estouChegandoRouter);
  app.use("/api/device-tokens", deviceTokensRouter);
  app.use("/api/visitor-qr", visitorQRShareRouter);
  app.use("/api/face", faceRouter);
  app.use("/api/gate", gateRouter);
  app.use("/api/whatsapp", whatsappRouter);

  // Test routes — dev only
  if (!isProd && process.env.NODE_ENV !== "test") {
    const m = await import("./testRoutes.js");
    app.use("/api/test", m.default);
    logger.info("  🧪 Test routes enabled (dev only)");
  }

  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Manual backup (master only)
  app.post("/api/backup", authenticate, authorize("master"), (_req, res) => {
    const backupPath = performBackup();
    if (backupPath) res.json({ success: true, path: backupPath });
    else res.status(500).json({ error: "Falha ao criar backup." });
  });

  // Static frontend in production
  if (isProd) {
    const distPath = path.resolve(__dirname, "../dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Global error handler — prevents internal details from leaking
  app.use((err: any, _req: any, res: any, _next: any) => {
    logger.error("Unhandled error:", err);
    res.status(500).json({ error: "Erro interno do servidor." });
  });

  return app;
}
