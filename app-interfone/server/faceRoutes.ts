/**
 * Face Recognition API Routes
 *
 * POST /api/face/compare-visitors   — Compara foto contra visitantes cadastrados
 * POST /api/face/extract            — Extrai descriptor de uma foto (e opcionalmente salva)
 * POST /api/face/compare-two        — Compara duas fotos diretamente
 * GET  /api/face/status             — Verifica se o serviço está pronto
 * POST /api/face/register-my-face   — Morador registra seu rosto (selfie)
 * GET  /api/face/my-face-status     — Verifica se morador já cadastrou rosto
 * POST /api/face/selfie-auth        — Morador autentica por selfie para abrir portão
 */

import { Router, Request, Response } from "express";
import db from "./db.js";
import { authenticate, authorize } from "./middleware.js";
import { extractDescriptor, compareFaces, isReady } from "./faceService.js";

const router = Router();

const ensureModelsReady = (_req: Request, res: Response, next: Function) => {
  if (!isReady()) {
    res.status(503).json({ error: "Modelos de reconhecimento facial ainda carregando. Tente novamente em alguns segundos." });
    return;
  }
  next();
};

// ─── POST /compare-visitors — Compara foto com visitantes ───
router.post("/compare-visitors", authenticate, authorize("master", "administradora", "sindico", "funcionario"), ensureModelsReady, async (req: Request, res: Response) => {
  try {
    const { photo } = req.body;
    if (!photo) {
      res.status(400).json({ error: "Campo 'photo' (base64) é obrigatório." });
      return;
    }

    const descriptor = await extractDescriptor(photo);
    if (!descriptor) {
      res.json({ matched: false, error: "Nenhum rosto detectado na foto." });
      return;
    }

    res.json({
      matched: false,
      descriptor: descriptor,
    });
  } catch (err: any) {
    console.error("[FaceRoutes] Erro em compare-visitors:", err);
    res.status(500).json({ error: "Erro ao processar reconhecimento facial." });
  }
});

// ─── POST /extract — Extrai descriptor de uma foto ───
router.post("/extract", authenticate, authorize("master", "administradora", "sindico", "funcionario"), ensureModelsReady, async (req: Request, res: Response) => {
  try {
    const { photo } = req.body;
    if (!photo) {
      res.status(400).json({ error: "Campo 'photo' (base64) é obrigatório." });
      return;
    }

    const descriptor = await extractDescriptor(photo);
    if (!descriptor) {
      res.json({ success: false, error: "Nenhum rosto detectado." });
      return;
    }

    res.json({ success: true, descriptor });
  } catch (err: any) {
    console.error("[FaceRoutes] Erro em extract:", err);
    res.status(500).json({ error: "Erro ao extrair descriptor facial." });
  }
});

// ─── POST /compare-two — Compara duas fotos diretamente ───
router.post("/compare-two", authenticate, authorize("master", "administradora", "sindico", "funcionario"), ensureModelsReady, async (req: Request, res: Response) => {
  try {
    const { photo1, photo2 } = req.body;
    if (!photo1 || !photo2) {
      res.status(400).json({ error: "Campos 'photo1' e 'photo2' (base64) são obrigatórios." });
      return;
    }

    const [desc1, desc2] = await Promise.all([
      extractDescriptor(photo1),
      extractDescriptor(photo2),
    ]);

    if (!desc1) {
      res.json({ matched: false, error: "Nenhum rosto detectado na primeira foto." });
      return;
    }
    if (!desc2) {
      res.json({ matched: false, error: "Nenhum rosto detectado na segunda foto." });
      return;
    }

    let sum = 0;
    for (let i = 0; i < desc1.length; i++) {
      sum += (desc1[i] - desc2[i]) ** 2;
    }
    const distance = Math.sqrt(sum);
    const similarity = Math.max(0, Math.min(100, Math.round((1 - distance) * 100)));
    const matched = distance < 0.5;

    res.json({ matched, similarity, distance });
  } catch (err: any) {
    console.error("[FaceRoutes] Erro em compare-two:", err);
    res.status(500).json({ error: "Erro ao comparar fotos." });
  }
});

// ─── GET /status — Verifica se o serviço está pronto ───
router.get("/status", (_req: Request, res: Response) => {
  res.json({ ready: isReady() });
});

// ─── POST /register-my-face — Morador registra seu rosto (selfie) ───
router.post(
  "/register-my-face",
  authenticate,
  authorize("master", "administradora", "sindico", "funcionario", "morador"),
  ensureModelsReady,
  async (req: Request, res: Response) => {
    try {
      const { photo } = req.body;
      if (!photo) {
        res.status(400).json({ error: "Campo 'photo' (base64) é obrigatório." });
        return;
      }

      const descriptor = await extractDescriptor(photo);
      if (!descriptor) {
        res.json({ success: false, error: "Nenhum rosto detectado na foto. Posicione seu rosto no centro da câmera." });
        return;
      }

      db.prepare("UPDATE users SET face_descriptor = ? WHERE id = ?").run(
        JSON.stringify(descriptor),
        req.user!.id
      );

      res.json({ success: true, message: "Rosto cadastrado com sucesso!" });
    } catch (err: any) {
      console.error("[FaceRoutes] Erro ao registrar rosto:", err);
      res.status(500).json({ error: "Erro ao registrar rosto." });
    }
  }
);

// ─── GET /my-face-status — Verifica se morador já cadastrou rosto ───
router.get(
  "/my-face-status",
  authenticate,
  authorize("master", "administradora", "sindico", "funcionario", "morador"),
  (_req: Request, res: Response) => {
    const row = db.prepare("SELECT face_descriptor FROM users WHERE id = ?").get((_req as any).user!.id) as any;
    res.json({ registered: !!(row && row.face_descriptor) });
  }
);

// ─── POST /selfie-auth — Morador autentica por selfie para abrir portão ───
router.post(
  "/selfie-auth",
  authenticate,
  authorize("master", "administradora", "sindico", "funcionario", "morador"),
  ensureModelsReady,
  async (req: Request, res: Response) => {
    try {
      const { photo } = req.body;
      if (!photo) {
        res.status(400).json({ error: "Campo 'photo' (base64) é obrigatório." });
        return;
      }

      const userId = req.user!.id;

      const row = db.prepare("SELECT face_descriptor FROM users WHERE id = ?").get(userId) as any;
      if (!row || !row.face_descriptor) {
        res.json({ matched: false, error: "Você ainda não cadastrou seu rosto. Cadastre na Portaria Virtual." });
        return;
      }

      const selfieDescriptor = await extractDescriptor(photo);
      if (!selfieDescriptor) {
        res.json({ matched: false, error: "Nenhum rosto detectado. Posicione bem seu rosto na câmera." });
        return;
      }

      const storedDescriptor = JSON.parse(row.face_descriptor) as number[];
      const result = compareFaces(selfieDescriptor, [
        { id: userId, nome: req.user!.name, face_descriptor: storedDescriptor }
      ], 0.55);

      res.json({
        matched: result.matched,
        similarity: result.similarity,
        distance: result.distance,
      });
    } catch (err: any) {
      console.error("[FaceRoutes] Erro selfie-auth:", err);
      res.status(500).json({ error: "Erro ao autenticar por selfie." });
    }
  }
);

export default router;
