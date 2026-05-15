/**
 * ═══════════════════════════════════════════════════════════
 * DEVICE TOKENS — FCM token registration API
 * Stores device tokens for push notification delivery.
 * ═══════════════════════════════════════════════════════════
 */

import { Router, Request, Response } from "express";
import db from "./db.js";
import { authenticate } from "./middleware.js";
import { logger } from "./logger.js";

const router = Router();

// ────────────────────────────────────────────────────────────
// POST /api/device-tokens — Register or update a device token
// ────────────────────────────────────────────────────────────
router.post("/", authenticate, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const { token, platform, deviceInfo } = req.body;

    if (!token || typeof token !== "string" || token.length < 10) {
      res.status(400).json({ error: "Token inválido." });
      return;
    }

    // Upsert: if token already exists for this user, update; otherwise insert
    db.prepare(`
      INSERT INTO device_tokens (user_id, token, platform, device_info, active, updated_at)
      VALUES (?, ?, ?, ?, 1, datetime('now'))
      ON CONFLICT(user_id, token) DO UPDATE SET
        active = 1,
        platform = excluded.platform,
        device_info = excluded.device_info,
        updated_at = datetime('now')
    `).run(user.id, token, platform || "android", deviceInfo || null);

    // If this token was registered to another user, deactivate the old one
    db.prepare(
      "UPDATE device_tokens SET active = 0 WHERE token = ? AND user_id != ?"
    ).run(token, user.id);

    res.json({ success: true });
  } catch (err) {
    logger.error("device-tokens register error:", err);
    res.status(500).json({ error: "Erro interno do servidor." });
  }
});

// ────────────────────────────────────────────────────────────
// DELETE /api/device-tokens — Unregister a device token (logout)
// ────────────────────────────────────────────────────────────
router.delete("/", authenticate, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const { token } = req.body;

    if (token) {
      // Deactivate specific token
      db.prepare("UPDATE device_tokens SET active = 0, updated_at = datetime('now') WHERE user_id = ? AND token = ?")
        .run(user.id, token);
    } else {
      // Deactivate all tokens for this user
      db.prepare("UPDATE device_tokens SET active = 0, updated_at = datetime('now') WHERE user_id = ?")
        .run(user.id);
    }

    res.json({ success: true });
  } catch (err) {
    logger.error("device-tokens delete error:", err);
    res.status(500).json({ error: "Erro interno do servidor." });
  }
});

export default router;
