/**
 * ═══════════════════════════════════════════════════════════
 * ESTOU CHEGANDO — Arrival Notification System
 * Notifies portaria when a morador is APPROACHING the condominium.
 * Direction-aware: ignores when morador is LEAVING.
 * Schedule-aware: only active within configured hours.
 * ═══════════════════════════════════════════════════════════
 */

import { Router, Request, Response } from "express";
import db from "./db.js";
import { authenticate, authorize, hasMinRole } from "./middleware.js";
import { sendPushToPortaria } from "./pushService.js";
import { notifyPortariaWhatsApp } from "./whatsappService.js";

const router = Router();

// ─── Haversine — distance (meters) between two GPS points ─
function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth radius in meters
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Check if current time is within the active schedule ──
function isWithinSchedule(inicio: string | null, fim: string | null): boolean {
  if (!inicio || !fim) return true; // No schedule = always active
  const now = new Date();
  const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  // Handle overnight ranges (e.g., 22:00 → 06:00)
  if (inicio <= fim) {
    // Same-day range (e.g., 08:00 → 18:00)
    return hhmm >= inicio && hhmm <= fim;
  } else {
    // Overnight range (e.g., 22:00 → 06:00)
    return hhmm >= inicio || hhmm <= fim;
  }
}

// In-memory map of last known distance per morador (for direction detection)
const lastDistances = new Map<number, { distance: number; timestamp: number }>();

// ────────────────────────────────────────────────────────────
// GET /api/estou-chegando/config — Get condominio schedule + location config
// (Sindico / Admin)
// ────────────────────────────────────────────────────────────
router.get("/config", authenticate, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    if (!user.condominio_id) {
      res.status(400).json({ error: "Sem condomínio associado." });
      return;
    }

    const condo = db.prepare("SELECT latitude, longitude FROM condominios WHERE id = ?").get(user.condominio_id) as any;
    const configs = db.prepare(
      "SELECT key, value FROM condominio_config WHERE condominio_id = ? AND key LIKE 'estou_chegando_%'"
    ).all(user.condominio_id) as { key: string; value: string }[];

    const configMap: Record<string, string> = {};
    for (const c of configs) configMap[c.key] = c.value;

    res.json({
      latitude: condo?.latitude ?? null,
      longitude: condo?.longitude ?? null,
      enabled: configMap["estou_chegando_enabled"] !== "false",
      horario_inicio: configMap["estou_chegando_horario_inicio"] || "22:00",
      horario_fim: configMap["estou_chegando_horario_fim"] || "06:00",
      radius_default: parseInt(configMap["estou_chegando_radius"] || "200"),
    });
  } catch (err) {
    console.error("estou-chegando config GET error:", err);
    res.status(500).json({ error: "Erro interno do servidor." });
  }
});

// ────────────────────────────────────────────────────────────
// PUT /api/estou-chegando/config — Update condominio config
// (Sindico+ only)
// ────────────────────────────────────────────────────────────
router.put("/config", authenticate, authorize("sindico", "administradora", "master"), async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    if (!user.condominio_id) {
      res.status(400).json({ error: "Sem condomínio associado." });
      return;
    }

    const { latitude, longitude, enabled, horario_inicio, horario_fim, radius_default } = req.body;

    // Update coordinates on condominios table
    if (latitude !== undefined && longitude !== undefined) {
      db.prepare("UPDATE condominios SET latitude = ?, longitude = ?, updated_at = datetime('now') WHERE id = ?")
        .run(latitude, longitude, user.condominio_id);
    }

    // Upsert config keys
    const upsert = db.prepare(`
      INSERT INTO condominio_config (condominio_id, key, value, updated_at)
      VALUES (?, ?, ?, datetime('now'))
      ON CONFLICT(condominio_id, key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `);

    if (enabled !== undefined) upsert.run(user.condominio_id, "estou_chegando_enabled", String(enabled));
    if (horario_inicio) upsert.run(user.condominio_id, "estou_chegando_horario_inicio", horario_inicio);
    if (horario_fim) upsert.run(user.condominio_id, "estou_chegando_horario_fim", horario_fim);
    if (radius_default) upsert.run(user.condominio_id, "estou_chegando_radius", String(radius_default));

    res.json({ success: true });
  } catch (err) {
    console.error("estou-chegando config PUT error:", err);
    res.status(500).json({ error: "Erro interno do servidor." });
  }
});

// ────────────────────────────────────────────────────────────
// POST /api/estou-chegando/notify — Morador sends GPS location
// System detects direction (approaching/leaving) and decides
// whether to notify portaria. Only APPROACHING triggers alert.
// ────────────────────────────────────────────────────────────
router.post("/notify", authenticate, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    if (!user.condominio_id) {
      res.status(400).json({ error: "Sem condomínio associado." });
      return;
    }

    const { latitude, longitude, vehicle_type, vehicle_plate, vehicle_model, vehicle_color, driver_name, radius_meters } = req.body;
    if (!latitude || !longitude) {
      res.status(400).json({ error: "Coordenadas obrigatórias." });
      return;
    }

    // 1) Check feature is enabled
    const enabledRow = db.prepare(
      "SELECT value FROM condominio_config WHERE condominio_id = ? AND key = 'estou_chegando_enabled'"
    ).get(user.condominio_id) as { value: string } | undefined;
    if (enabledRow?.value === "false") {
      res.status(403).json({ error: "Funcionalidade desativada pelo síndico." });
      return;
    }

    // 2) Check schedule
    const scheduleStart = db.prepare(
      "SELECT value FROM condominio_config WHERE condominio_id = ? AND key = 'estou_chegando_horario_inicio'"
    ).get(user.condominio_id) as { value: string } | undefined;
    const scheduleEnd = db.prepare(
      "SELECT value FROM condominio_config WHERE condominio_id = ? AND key = 'estou_chegando_horario_fim'"
    ).get(user.condominio_id) as { value: string } | undefined;

    if (!isWithinSchedule(scheduleStart?.value || null, scheduleEnd?.value || null)) {
      res.json({ status: "outside_schedule", message: "Fora do horário configurado." });
      return;
    }

    // 3) Get condominium location
    const condo = db.prepare("SELECT latitude, longitude FROM condominios WHERE id = ?").get(user.condominio_id) as any;
    if (!condo?.latitude || !condo?.longitude) {
      res.status(400).json({ error: "Localização do condomínio não configurada." });
      return;
    }

    // 4) Calculate distance
    const distance = haversine(latitude, longitude, condo.latitude, condo.longitude);
    const effectiveRadius = radius_meters || 200;

    // 5) Direction detection — only notify when APPROACHING
    const lastEntry = lastDistances.get(user.id);
    const isApproaching = !lastEntry || distance < lastEntry.distance;
    lastDistances.set(user.id, { distance, timestamp: Date.now() });

    // Clean old entries (> 30 min) to prevent memory leak
    const thirtyMinAgo = Date.now() - 30 * 60 * 1000;
    for (const [key, val] of lastDistances) {
      if (val.timestamp < thirtyMinAgo) lastDistances.delete(key);
    }

    if (!isApproaching) {
      // Morador is LEAVING — do NOT notify portaria
      res.json({
        status: "leaving",
        distance: Math.round(distance),
        message: "Afastando-se do condomínio. Sem notificação.",
      });
      return;
    }

    // 6) Check if within geofence radius
    if (distance > effectiveRadius) {
      res.json({
        status: "out_of_range",
        distance: Math.round(distance),
        radius: effectiveRadius,
        direction: "approaching",
        message: `Ainda fora do raio (${Math.round(distance)}m / ${effectiveRadius}m).`,
      });
      return;
    }

    // 7) Check if there's already an active event for this morador (avoid duplicates)
    const existingEvent = db.prepare(
      "SELECT id FROM estou_chegando_events WHERE morador_id = ? AND status = 'approaching' AND created_at > datetime('now', '-10 minutes')"
    ).get(user.id) as any;

    if (existingEvent) {
      // Update position of existing event
      db.prepare(
        "UPDATE estou_chegando_events SET latitude = ?, longitude = ?, distance_meters = ? WHERE id = ?"
      ).run(latitude, longitude, Math.round(distance), existingEvent.id);

      res.json({
        status: "updated",
        event_id: existingEvent.id,
        distance: Math.round(distance),
        direction: "approaching",
      });
      return;
    }

    // 8) Create new arrival event & notify portaria
    const result = db.prepare(`
      INSERT INTO estou_chegando_events 
        (condominio_id, morador_id, morador_name, bloco, apartamento, status, 
         vehicle_type, vehicle_plate, vehicle_model, vehicle_color, driver_name,
         latitude, longitude, distance_meters, radius_meters)
      VALUES (?, ?, ?, ?, ?, 'approaching', ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      user.condominio_id, user.id, user.name, user.block, user.unit,
      vehicle_type || "proprio", vehicle_plate || null, vehicle_model || null,
      vehicle_color || null, driver_name || null,
      latitude, longitude, Math.round(distance), effectiveRadius
    );

    const eventId = result.lastInsertRowid;

    // Also fetch any registered vehicles for this morador
    const vehicles = db.prepare(
      "SELECT placa, modelo, cor FROM vehicle_authorizations WHERE morador_id = ? AND status = 'ativa' ORDER BY created_at DESC LIMIT 3"
    ).all(user.id) as any[];

    // Send push notification to portaria staff
    sendPushToPortaria(user.condominio_id!, {
      title: "🚗 Morador Chegando!",
      body: `${user.name} (${user.block || ""}/${user.unit || ""}) está se aproximando — ${Math.round(distance)}m`,
      data: {
        type: "estou-chegando",
        event_id: String(eventId),
        morador_name: user.name,
        distance: String(Math.round(distance)),
      },
      channelId: "portariax_arrival",
      sound: "arrival_alert",
    }).catch(() => {});

    // WhatsApp: notify portaria about arriving morador
    notifyPortariaWhatsApp(
      user.condominio_id!,
      "whatsapp_notify_estou_chegando",
      `🚗 ${user.name} (${user.block || ""}/${user.unit || ""}) está se aproximando — ${Math.round(distance)}m`
    );

    res.json({
      status: "notified",
      event_id: eventId,
      distance: Math.round(distance),
      direction: "approaching",
      vehicles,
      message: "Portaria notificada!",
    });
  } catch (err) {
    console.error("estou-chegando notify error:", err);
    res.status(500).json({ error: "Erro interno do servidor." });
  }
});

// ────────────────────────────────────────────────────────────
// POST /api/estou-chegando/confirm/:id — Portaria confirms arrival
// ────────────────────────────────────────────────────────────
router.post("/confirm/:id", authenticate, authorize("funcionario", "sindico", "administradora", "master"), async (req: Request, res: Response) => {
  try {
    const eventId = parseInt(req.params.id as string);
    const user = req.user!;

    const event = db.prepare(
      "SELECT * FROM estou_chegando_events WHERE id = ? AND condominio_id = ?"
    ).get(eventId, user.condominio_id) as any;

    if (!event) {
      res.status(404).json({ error: "Evento não encontrado." });
      return;
    }

    db.prepare(
      "UPDATE estou_chegando_events SET status = 'confirmed', confirmed_by = ?, confirmed_at = datetime('now') WHERE id = ?"
    ).run(user.id, eventId);

    res.json({ success: true, event_id: eventId });
  } catch (err) {
    console.error("estou-chegando confirm error:", err);
    res.status(500).json({ error: "Erro interno do servidor." });
  }
});

// ────────────────────────────────────────────────────────────
// POST /api/estou-chegando/cancel/:id — Morador cancels
// ────────────────────────────────────────────────────────────
router.post("/cancel/:id", authenticate, async (req: Request, res: Response) => {
  try {
    const eventId = parseInt(req.params.id as string);
    const user = req.user!;

    const event = db.prepare(
      "SELECT * FROM estou_chegando_events WHERE id = ? AND morador_id = ?"
    ).get(eventId, user.id) as any;

    if (!event) {
      res.status(404).json({ error: "Evento não encontrado." });
      return;
    }

    db.prepare(
      "UPDATE estou_chegando_events SET status = 'cancelled', cancelled_at = datetime('now') WHERE id = ?"
    ).run(eventId);

    // Clear distance tracking for this morador
    lastDistances.delete(user.id);

    res.json({ success: true });
  } catch (err) {
    console.error("estou-chegando cancel error:", err);
    res.status(500).json({ error: "Erro interno do servidor." });
  }
});

// ────────────────────────────────────────────────────────────
// GET /api/estou-chegando/active — Portaria gets active arrivals
// ────────────────────────────────────────────────────────────
router.get("/active", authenticate, authorize("funcionario", "sindico", "administradora", "master"), async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    if (!user.condominio_id) {
      res.status(400).json({ error: "Sem condomínio associado." });
      return;
    }

    const events = db.prepare(`
      SELECT e.*, u.phone as morador_phone, u.avatar_url as morador_avatar
      FROM estou_chegando_events e
      LEFT JOIN users u ON u.id = e.morador_id
      WHERE e.condominio_id = ? AND e.status = 'approaching'
        AND e.created_at > datetime('now', '-30 minutes')
      ORDER BY e.created_at DESC
    `).all(user.condominio_id);

    res.json(events);
  } catch (err) {
    console.error("estou-chegando active error:", err);
    res.status(500).json({ error: "Erro interno do servidor." });
  }
});

// ────────────────────────────────────────────────────────────
// GET /api/estou-chegando/history — Event history
// ────────────────────────────────────────────────────────────
router.get("/history", authenticate, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    if (!user.condominio_id) {
      res.status(400).json({ error: "Sem condomínio associado." });
      return;
    }

    const limit = parseInt(req.query.limit as string) || 50;

    // Funcionarios+ see all events; moradores see only their own
    let events;
    if (["master", "administradora", "sindico", "funcionario"].includes(user.role)) {
      events = db.prepare(`
        SELECT e.*, u.phone as morador_phone
        FROM estou_chegando_events e
        LEFT JOIN users u ON u.id = e.morador_id
        WHERE e.condominio_id = ?
        ORDER BY e.created_at DESC LIMIT ?
      `).all(user.condominio_id, limit);
    } else {
      events = db.prepare(`
        SELECT * FROM estou_chegando_events
        WHERE morador_id = ?
        ORDER BY created_at DESC LIMIT ?
      `).all(user.id, limit);
    }

    res.json(events);
  } catch (err) {
    console.error("estou-chegando history error:", err);
    res.status(500).json({ error: "Erro interno do servidor." });
  }
});

// ────────────────────────────────────────────────────────────
// GET /api/estou-chegando/my-active — Morador checks their active event
// ────────────────────────────────────────────────────────────
router.get("/my-active", authenticate, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const event = db.prepare(`
      SELECT * FROM estou_chegando_events 
      WHERE morador_id = ? AND status = 'approaching'
        AND created_at > datetime('now', '-30 minutes')
      ORDER BY created_at DESC LIMIT 1
    `).get(user.id);

    res.json(event || null);
  } catch (err) {
    console.error("estou-chegando my-active error:", err);
    res.status(500).json({ error: "Erro interno do servidor." });
  }
});

export default router;
