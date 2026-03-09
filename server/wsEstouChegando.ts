/**
 * ═══════════════════════════════════════════════════════════
 * ESTOU CHEGANDO — WebSocket Server
 * Real-time arrival notifications between morador ↔ portaria
 *
 * Events:
 *   morador → server:
 *     { type: "register-morador" }
 *     { type: "location-update", latitude, longitude, vehicle_type, ... }
 *
 *   server → portaria:
 *     { type: "arrival-notification", event }
 *     { type: "location-update", event }
 *     { type: "arrival-cancelled", event_id }
 *
 *   portaria → server:
 *     { type: "register-portaria" }
 *     { type: "confirm-arrival", event_id }
 *
 *   server → morador:
 *     { type: "arrival-confirmed", event_id, confirmed_by }
 * ═══════════════════════════════════════════════════════════
 */

import { WebSocketServer, WebSocket } from "ws";
import http from "http";
import https from "https";
import fs from "fs";
import path from "path";
import type { Server } from "http";
import type { IncomingMessage } from "http";
import jwt from "jsonwebtoken";
import db, { type DbUser } from "./db.js";
import { sendPushToPortaria } from "./pushService.js";
import { pulseDevice } from "./ewelinkService.js";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-production-32chars!!";
const COOKIE_NAME = "session_token";

interface ArrivalWsClient {
  ws: WebSocket;
  type: "morador" | "portaria";
  userId: number;
  condominioId: number;
}

// Connection pools indexed by condominioId
const moradorPool = new Map<number, ArrivalWsClient>();      // moradorId → client
const portariaPool = new Map<number, ArrivalWsClient[]>();    // condominioId → clients[]

// Last known distance per moradorId (for direction detection via WS)
const wsLastDistances = new Map<number, number>();

function parseCookie(cookieHeader: string | undefined, name: string): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.split(";").map(c => c.trim()).find(c => c.startsWith(`${name}=`));
  return match ? match.slice(name.length + 1) : null;
}

function authenticateWsArrival(req: IncomingMessage): DbUser | null {
  try {
    let token: string | null = null;
    try {
      const url = new URL(req.url || "", `http://${req.headers.host || "localhost"}`);
      token = url.searchParams.get("token");
    } catch {}
    if (!token) {
      token = parseCookie(req.headers.cookie, COOKIE_NAME);
    }
    if (!token) return null;
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
    return db.prepare("SELECT * FROM users WHERE id = ?").get(decoded.userId) as DbUser | null;
  } catch {
    return null;
  }
}

/** Haversine distance in meters */
function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Check if current time is within active schedule */
function isWithinSchedule(condominioId: number): boolean {
  const startRow = db.prepare("SELECT value FROM condominio_config WHERE condominio_id = ? AND key = 'estou_chegando_horario_inicio'").get(condominioId) as { value: string } | undefined;
  const endRow = db.prepare("SELECT value FROM condominio_config WHERE condominio_id = ? AND key = 'estou_chegando_horario_fim'").get(condominioId) as { value: string } | undefined;
  const inicio = startRow?.value || null;
  const fim = endRow?.value || null;
  if (!inicio || !fim) return true;
  const now = new Date();
  const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  if (inicio <= fim) return hhmm >= inicio && hhmm <= fim;
  return hhmm >= inicio || hhmm <= fim;
}

/** Send JSON to a WS client safely */
function wsSend(client: ArrivalWsClient, data: any) {
  if (client.ws.readyState === WebSocket.OPEN) {
    client.ws.send(JSON.stringify(data));
  }
}

/** Broadcast to all portaria clients of a condominium */
function broadcastToPortaria(condominioId: number, data: any) {
  const pool = portariaPool.get(condominioId);
  if (!pool) return;
  const json = JSON.stringify(data);
  for (const client of pool) {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(json);
    }
  }
}

export function initArrivalWebSocket(_server?: Server) {
  const certsDir = path.resolve(process.cwd(), "certs");
  const hasCerts = fs.existsSync(path.join(certsDir, "key.pem")) && fs.existsSync(path.join(certsDir, "cert.pem"));

  const wsHttpServer = hasCerts
    ? https.createServer({
        key: fs.readFileSync(path.join(certsDir, "key.pem")),
        cert: fs.readFileSync(path.join(certsDir, "cert.pem")),
      }, (_req, res) => {
        res.writeHead(200, { "Content-Type": "text/plain", "Access-Control-Allow-Origin": "*" });
        res.end("WSS server");
      })
    : http.createServer((_req, res) => {
        res.writeHead(200, { "Content-Type": "text/plain", "Access-Control-Allow-Origin": "*" });
        res.end("WS server");
      });

  const WS_PORT = parseInt(process.env.WS_ARRIVAL_PORT || "3003");
  const wss = new WebSocketServer({ server: wsHttpServer, path: "/ws/estou-chegando", perMessageDeflate: false });

  wsHttpServer.listen(WS_PORT, "0.0.0.0", () => {
    console.log(`  \u{1F4CD} Estou Chegando WebSocket ready at ${hasCerts ? 'wss' : 'ws'}://0.0.0.0:${WS_PORT}/ws/estou-chegando`);
  });

  wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
    const authUser = authenticateWsArrival(req);
    if (!authUser || !authUser.condominio_id) {
      ws.send(JSON.stringify({ type: "error", message: "Não autenticado." }));
      ws.close(4001, "Unauthorized");
      return;
    }

    let client: ArrivalWsClient | null = null;

    ws.on("message", async (raw: Buffer) => {
      try {
        const msg = JSON.parse(raw.toString());

        switch (msg.type) {
          // ─── Morador registers ───
          case "register-morador": {
            if (authUser.role !== "morador") {
              ws.send(JSON.stringify({ type: "error", message: "Apenas moradores podem registrar." }));
              return;
            }
            client = { ws, type: "morador", userId: authUser.id, condominioId: authUser.condominio_id! };
            moradorPool.set(authUser.id, client);
            ws.send(JSON.stringify({ type: "registered", role: "morador" }));
            break;
          }

          // ─── Portaria registers ───
          case "register-portaria": {
            if (!["funcionario", "sindico", "administradora", "master"].includes(authUser.role)) {
              ws.send(JSON.stringify({ type: "error", message: "Sem permissão." }));
              return;
            }
            client = { ws, type: "portaria", userId: authUser.id, condominioId: authUser.condominio_id! };
            if (!portariaPool.has(authUser.condominio_id!)) {
              portariaPool.set(authUser.condominio_id!, []);
            }
            portariaPool.get(authUser.condominio_id!)!.push(client);
            ws.send(JSON.stringify({ type: "registered", role: "portaria" }));

            // Send currently active events immediately
            const activeEvents = db.prepare(`
              SELECT e.*, u.phone as morador_phone, u.avatar_url as morador_avatar
              FROM estou_chegando_events e
              LEFT JOIN users u ON u.id = e.morador_id
              WHERE e.condominio_id = ? AND e.status = 'approaching'
                AND e.created_at > datetime('now', '-30 minutes')
              ORDER BY e.created_at DESC
            `).all(authUser.condominio_id!);
            ws.send(JSON.stringify({ type: "active-events", events: activeEvents }));
            break;
          }

          // ─── Morador sends location update ───
          case "location-update": {
            if (!client || client.type !== "morador") return;
            const { latitude, longitude, vehicle_type, vehicle_plate, vehicle_model, vehicle_color, driver_name, radius_meters, auto_open_gate } = msg;
            if (!latitude || !longitude) return;

            // Check feature enabled
            const enabledRow = db.prepare("SELECT value FROM condominio_config WHERE condominio_id = ? AND key = 'estou_chegando_enabled'").get(client.condominioId) as any;
            if (enabledRow?.value === "false") {
              wsSend(client, { type: "feature-disabled" });
              return;
            }

            // Check schedule
            if (!isWithinSchedule(client.condominioId)) {
              wsSend(client, { type: "outside-schedule" });
              return;
            }

            // Get condominium location
            const condo = db.prepare("SELECT latitude, longitude FROM condominios WHERE id = ?").get(client.condominioId) as any;
            if (!condo?.latitude || !condo?.longitude) {
              wsSend(client, { type: "error", message: "Localização do condomínio não configurada." });
              return;
            }

            const distance = haversine(latitude, longitude, condo.latitude, condo.longitude);
            const effectiveRadius = radius_meters || 200;

            // Direction detection — only notify on APPROACHING
            const prevDistance = wsLastDistances.get(client.userId);
            const isApproaching = prevDistance === undefined || distance < prevDistance;
            wsLastDistances.set(client.userId, distance);

            if (!isApproaching) {
              wsSend(client, { type: "status", status: "leaving", distance: Math.round(distance) });
              return;
            }

            // Send distance status to morador
            wsSend(client, { type: "status", status: "approaching", distance: Math.round(distance), radius: effectiveRadius });

            if (distance > effectiveRadius) return; // Still outside radius

            // Check existing event
            const existing = db.prepare(
              "SELECT id FROM estou_chegando_events WHERE morador_id = ? AND status = 'approaching' AND created_at > datetime('now', '-10 minutes')"
            ).get(client.userId) as any;

            if (existing) {
              // Update position
              db.prepare("UPDATE estou_chegando_events SET latitude = ?, longitude = ?, distance_meters = ? WHERE id = ?")
                .run(latitude, longitude, Math.round(distance), existing.id);

              // Broadcast updated position to portaria
              broadcastToPortaria(client.condominioId, {
                type: "location-update",
                event_id: existing.id,
                morador_id: client.userId,
                latitude, longitude,
                distance: Math.round(distance),
              });
              return;
            }

            // Create new event
            const result = db.prepare(`
              INSERT INTO estou_chegando_events 
                (condominio_id, morador_id, morador_name, bloco, apartamento, status, 
                 vehicle_type, vehicle_plate, vehicle_model, vehicle_color, driver_name,
                 latitude, longitude, distance_meters, radius_meters)
              VALUES (?, ?, ?, ?, ?, 'approaching', ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
              client.condominioId, authUser.id, authUser.name, authUser.block, authUser.unit,
              vehicle_type || "proprio", vehicle_plate || null, vehicle_model || null,
              vehicle_color || null, driver_name || null,
              latitude, longitude, Math.round(distance), effectiveRadius
            );

            const eventId = Number(result.lastInsertRowid);

            // Load vehicle info
            const vehicles = db.prepare(
              "SELECT placa, modelo, cor FROM vehicle_authorizations WHERE morador_id = ? AND status = 'ativa' ORDER BY created_at DESC LIMIT 3"
            ).all(authUser.id);

            const newEvent = db.prepare("SELECT * FROM estou_chegando_events WHERE id = ?").get(eventId) as any;

            // Notify portaria with sound (WebSocket)
            broadcastToPortaria(client.condominioId, {
              type: "arrival-notification",
              event: { ...newEvent, morador_phone: authUser.phone, morador_avatar: (authUser as any).avatar_url, vehicles },
            });

            // Also send push notification to portaria staff (in case app is in background)
            sendPushToPortaria(client.condominioId, {
              title: "🚗 Morador Chegando!",
              body: `${authUser.name} (${authUser.block || ""}/${authUser.unit || ""}) está se aproximando — ${Math.round(distance)}m`,
              data: {
                type: "estou-chegando",
                event_id: String(eventId),
                morador_name: authUser.name,
                distance: String(Math.round(distance)),
              },
              channelId: "portariax_arrival",
              sound: "arrival_alert",
            }).catch(() => {});

            wsSend(client, { type: "notified", event_id: eventId, distance: Math.round(distance) });

            // ─── Auto-open vehicular gate if morador enabled it ───
            if (auto_open_gate) {
              try {
                // Find vehicular gate access point
                const vehicularAp = db.prepare(
                  `SELECT * FROM gate_access_points 
                   WHERE condominio_id = ? AND enabled = 1 AND device_id IS NOT NULL
                   AND (icon = 'Car' OR LOWER(name) LIKE '%veicular%' OR LOWER(name) LIKE '%veículo%' OR LOWER(name) LIKE '%veiculo%')
                   ORDER BY order_index ASC LIMIT 1`
                ).get(client.condominioId) as any;

                const ap = vehicularAp || db.prepare(
                  `SELECT * FROM gate_access_points 
                   WHERE condominio_id = ? AND enabled = 1 AND device_id IS NOT NULL
                   ORDER BY order_index ASC LIMIT 1`
                ).get(client.condominioId) as any;

                if (ap) {
                  // Get eWelink credentials
                  const credRows = db.prepare(
                    `SELECT key, value FROM system_config WHERE key LIKE 'gate_ewelink_%'`
                  ).all() as { key: string; value: string }[];
                  const credMap: Record<string, string> = {};
                  for (const r of credRows) credMap[r.key] = r.value;
                  const creds = {
                    appId: credMap.gate_ewelink_appid || "",
                    appSecret: credMap.gate_ewelink_appsecret || "",
                    email: credMap.gate_ewelink_email || "",
                    password: credMap.gate_ewelink_password || "",
                    region: credMap.gate_ewelink_region || "us",
                  };

                  if (creds.appId && creds.email) {
                    const duration = ap.pulse_duration || 1000;
                    const openResult = await pulseDevice(client.condominioId!, creds, ap.device_id, duration, ap.channel);
                    console.log(`  [Estou Chegando] Auto-open gate for ${authUser.name}: ${ap.name} → ${openResult.success ? 'OK' : openResult.error}`);

                    // Log the action
                    db.prepare(
                      `INSERT INTO gate_logs (condominio_id, user_id, user_name, action, details, created_at)
                       VALUES (?, ?, ?, 'estou_chegando_auto_open', ?, datetime('now'))`
                    ).run(client.condominioId, authUser.id, authUser.name, `${ap.name} — Estou Chegando (${Math.round(distance)}m)`);

                    // Notify morador that gate was opened
                    wsSend(client, {
                      type: "gate-auto-opened",
                      event_id: eventId,
                      access_point: ap.name,
                      success: openResult.success,
                    });
                  }
                }
              } catch (gateErr) {
                console.error("[Estou Chegando] Auto-open gate error:", gateErr);
              }
            }
            break;
          }

          // ─── Portaria confirms arrival ───
          case "confirm-arrival": {
            if (!client || client.type !== "portaria") return;
            const eventId2 = msg.event_id;

            const event = db.prepare(
              "SELECT * FROM estou_chegando_events WHERE id = ? AND condominio_id = ?"
            ).get(eventId2, client.condominioId) as any;
            if (!event) return;

            db.prepare(
              "UPDATE estou_chegando_events SET status = 'confirmed', confirmed_by = ?, confirmed_at = datetime('now') WHERE id = ?"
            ).run(client.userId, eventId2);

            // Notify the morador
            const moradorClient = moradorPool.get(event.morador_id);
            if (moradorClient) {
              wsSend(moradorClient, { type: "arrival-confirmed", event_id: eventId2, confirmed_by: authUser.name });
            }

            // Broadcast to all portaria clients
            broadcastToPortaria(client.condominioId, {
              type: "arrival-confirmed-broadcast", event_id: eventId2,
            });
            break;
          }

          // ─── Morador cancels ───
          case "cancel-arrival": {
            if (!client || client.type !== "morador") return;
            const cancelEvent = db.prepare(
              "SELECT id FROM estou_chegando_events WHERE morador_id = ? AND status = 'approaching' AND created_at > datetime('now', '-10 minutes')"
            ).get(client.userId) as any;
            if (!cancelEvent) return;

            db.prepare("UPDATE estou_chegando_events SET status = 'cancelled', cancelled_at = datetime('now') WHERE id = ?")
              .run(cancelEvent.id);
            wsLastDistances.delete(client.userId);

            broadcastToPortaria(client.condominioId, { type: "arrival-cancelled", event_id: cancelEvent.id, morador_id: client.userId });
            wsSend(client, { type: "cancelled", event_id: cancelEvent.id });
            break;
          }
        }
      } catch (err) {
        console.error("[WS Estou Chegando] Error:", err);
      }
    });

    ws.on("close", () => {
      if (!client) return;
      if (client.type === "morador") {
        moradorPool.delete(client.userId);
        wsLastDistances.delete(client.userId);
      } else if (client.type === "portaria") {
        const pool = portariaPool.get(client.condominioId);
        if (pool) {
          const idx = pool.indexOf(client);
          if (idx >= 0) pool.splice(idx, 1);
          if (pool.length === 0) portariaPool.delete(client.condominioId);
        }
      }
    });

    ws.on("error", () => {
      if (!client) return;
      if (client.type === "morador") moradorPool.delete(client.userId);
      else if (client.type === "portaria") {
        const pool = portariaPool.get(client.condominioId);
        if (pool) {
          const idx = pool.indexOf(client);
          if (idx >= 0) pool.splice(idx, 1);
          if (pool.length === 0) portariaPool.delete(client.condominioId);
        }
      }
    });
  });

  console.log("  📍 Estou Chegando WebSocket connections active");
}
