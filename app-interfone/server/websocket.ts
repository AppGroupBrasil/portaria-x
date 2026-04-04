/**
 * ═══════════════════════════════════════════════════════════
 * INTERFONE DIGITAL — WebSocket Signaling Server
 * Handles WebRTC signaling (offer/answer/ICE candidates)
 * and call state management between visitor ↔ morador
 * Port: 4002 (standalone, separate from HTTP server on 4001)
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

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-production-32chars!!";
const COOKIE_NAME = "session_token";

function parseCookie(cookieHeader: string | undefined, name: string): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.split(";").map(c => c.trim()).find(c => c.startsWith(`${name}=`));
  return match ? match.slice(name.length + 1) : null;
}

function authenticateWs(req: IncomingMessage): DbUser | null {
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
    const decoded = jwt.verify(token, JWT_SECRET) as { userId?: number; funcId?: number };

    // Handle funcionario token
    if (decoded.funcId) {
      const func = db.prepare("SELECT * FROM funcionarios WHERE id = ?").get(decoded.funcId) as any;
      if (!func) return null;
      return {
        id: func.id,
        name: `${func.nome} ${func.sobrenome}`,
        email: func.login,
        phone: null,
        cpf: null,
        password: func.password,
        role: "funcionario",
        perfil: func.cargo,
        unit: null,
        block: null,
        condominio_id: func.condominio_id,
        parent_administradora_id: null,
        avatar_url: null,
        created_at: func.created_at,
        updated_at: func.updated_at,
      } as DbUser;
    }

    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(decoded.userId) as DbUser | undefined;
    return user || null;
  } catch {
    return null;
  }
}

interface WsClient {
  ws: WebSocket;
  type: "visitor" | "morador" | "funcionario";
  moradorId?: number;
  callId?: string;
  condominioId?: number;
  userId?: number;
}

const clients = new Map<string, WsClient>();
const moradorConnections = new Map<number, WsClient>();
const funcionarioConnections = new Map<number, WsClient[]>();

export function initSignalingServer(_server?: Server) {
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

  const wss = new WebSocketServer({ server: wsHttpServer, path: "/ws/interfone", perMessageDeflate: false });

  const WS_PORT = parseInt(process.env.WS_PORT || "4002");
  wsHttpServer.listen(WS_PORT, "0.0.0.0", () => {
    console.log(`  \u{1F4DE} Interfone WebSocket ready at ${hasCerts ? 'wss' : 'ws'}://0.0.0.0:${WS_PORT}/ws/interfone`);
  });

  wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
    let clientId = `client-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    console.log(`  [WS] New connection: ${clientId} from ${req.headers.origin || "no-origin"} url=${req.url?.substring(0,80)}`);

    const authUser = authenticateWs(req);
    console.log(`  [WS] Auth: ${authUser ? `userId=${authUser.id} role=${authUser.role}` : "anonymous"}`);
    const client: WsClient = { ws, type: "visitor", userId: authUser?.id };
    clients.set(clientId, client);

    ws.on("message", (raw: Buffer) => {
      try {
        const msg = JSON.parse(raw.toString());

        switch (msg.type) {
          case "register-morador": {
            if (!authUser || authUser.id !== msg.moradorId) {
              ws.send(JSON.stringify({ type: "error", message: "Não autenticado." }));
              ws.close(4001, "Unauthorized");
              return;
            }
            client.type = "morador";
            client.moradorId = authUser.id;
            client.condominioId = authUser.condominio_id ?? undefined;
            moradorConnections.set(authUser.id, client);
            ws.send(JSON.stringify({ type: "registered", moradorId: authUser.id }));
            break;
          }

          case "register-funcionario": {
            if (!authUser || authUser.id !== msg.funcionarioId) {
              ws.send(JSON.stringify({ type: "error", message: "Não autenticado." }));
              ws.close(4001, "Unauthorized");
              return;
            }
            client.type = "funcionario";
            client.moradorId = authUser.id;
            client.condominioId = authUser.condominio_id ?? undefined;
            moradorConnections.set(authUser.id, client);
            if (authUser.condominio_id && !funcionarioConnections.has(authUser.condominio_id)) {
              funcionarioConnections.set(authUser.condominio_id, []);
            }
            if (authUser.condominio_id) {
              funcionarioConnections.get(authUser.condominio_id)!.push(client);
            }
            ws.send(JSON.stringify({ type: "registered-funcionario", funcionarioId: authUser.id }));
            break;
          }

          case "portaria-call": {
            const { condominioId: cId, callId: pCallId, visitanteNome: pNome, bloco: pBloco } = msg;
            client.callId = pCallId;
            client.type = "visitor";

            const funcPool = funcionarioConnections.get(cId) || [];
            const onlineFunc = funcPool.find(f => f.ws.readyState === WebSocket.OPEN);
            if (onlineFunc) {
              onlineFunc.callId = pCallId;
              onlineFunc.ws.send(JSON.stringify({
                type: "incoming-call",
                callId: pCallId,
                visitanteNome: pNome || "Visitante",
                visitanteEmpresa: null,
                visitanteFoto: null,
                nivelSeguranca: 0,
                bloco: pBloco,
                apartamento: "PORTARIA",
                visitorClientId: clientId,
                isPortariaCall: true,
              }));
            } else {
              ws.send(JSON.stringify({ type: "call-unavailable", callId: pCallId, reason: "portaria_offline" }));
            }
            break;
          }

          case "call-request": {
            const { moradorId, callId, visitanteNome, visitanteEmpresa, visitanteFoto, nivelSeguranca, bloco, apartamento } = msg;
            client.callId = callId;
            client.type = "visitor";

            const moradorClient = moradorConnections.get(moradorId);
            if (moradorClient && moradorClient.ws.readyState === WebSocket.OPEN) {
              moradorClient.callId = callId;
              moradorClient.ws.send(JSON.stringify({
                type: "incoming-call",
                callId,
                visitanteNome,
                visitanteEmpresa,
                visitanteFoto,
                nivelSeguranca,
                bloco,
                apartamento,
                visitorClientId: clientId,
              }));
            } else {
              ws.send(JSON.stringify({ type: "call-unavailable", callId, reason: "morador_offline" }));
            }
            break;
          }

          case "auth-request": {
            const moradorClient2 = moradorConnections.get(msg.moradorId);
            if (moradorClient2 && moradorClient2.ws.readyState === WebSocket.OPEN) {
              moradorClient2.ws.send(JSON.stringify({
                type: "auth-request",
                callId: msg.callId,
                visitanteNome: msg.visitanteNome,
                visitanteEmpresa: msg.visitanteEmpresa,
                visitanteFoto: msg.visitanteFoto,
                visitorClientId: clientId,
              }));
            } else {
              ws.send(JSON.stringify({ type: "auth-rejected", callId: msg.callId, reason: "morador_offline" }));
            }
            break;
          }

          case "auth-accepted": {
            const visitorClient = findClientById(msg.visitorClientId);
            if (visitorClient) {
              visitorClient.ws.send(JSON.stringify({ type: "auth-accepted", callId: msg.callId }));
            }
            break;
          }

          case "auth-rejected": {
            const visitorClient2 = findClientById(msg.visitorClientId);
            if (visitorClient2) {
              visitorClient2.ws.send(JSON.stringify({ type: "auth-rejected", callId: msg.callId, reason: "rejected" }));
            }
            break;
          }

          case "call-answer": {
            const answerPeer = findPeerByCallId(msg.callId, clientId);
            if (answerPeer) {
              answerPeer.ws.send(JSON.stringify({ type: "call-answered", callId: msg.callId }));
            }
            break;
          }

          case "call-reject": {
            const rejectPeer = findPeerByCallId(msg.callId, clientId);
            if (rejectPeer) {
              rejectPeer.ws.send(JSON.stringify({ type: "call-rejected", callId: msg.callId }));
            }
            break;
          }

          case "webrtc-offer": {
            let target: WsClient | undefined;
            if (msg.targetType === "morador") {
              target = findClientByCallId(msg.callId, "morador");
            } else if (msg.targetType === "funcionario") {
              target = findClientByCallId(msg.callId, "funcionario");
            } else {
              target = findClientByCallId(msg.callId, "visitor");
            }
            if (!target) target = findPeerByCallId(msg.callId, clientId);
            if (target) {
              target.ws.send(JSON.stringify({ type: "webrtc-offer", callId: msg.callId, offer: msg.offer }));
            }
            break;
          }

          case "webrtc-answer": {
            let target2: WsClient | undefined;
            if (msg.targetType === "visitor") {
              target2 = findClientByCallId(msg.callId, "visitor");
            } else if (msg.targetType === "funcionario") {
              target2 = findClientByCallId(msg.callId, "funcionario");
            } else if (msg.targetType === "morador") {
              target2 = findClientByCallId(msg.callId, "morador");
            }
            if (!target2) target2 = findPeerByCallId(msg.callId, clientId);
            if (target2) {
              target2.ws.send(JSON.stringify({ type: "webrtc-answer", callId: msg.callId, answer: msg.answer }));
            }
            break;
          }

          case "ice-candidate": {
            let target3: WsClient | undefined;
            if (msg.targetType === "morador") {
              target3 = findClientByCallId(msg.callId, "morador");
            } else if (msg.targetType === "funcionario") {
              target3 = findClientByCallId(msg.callId, "funcionario");
            } else {
              target3 = findClientByCallId(msg.callId, "visitor");
            }
            if (!target3) target3 = findPeerByCallId(msg.callId, clientId);
            if (target3) {
              target3.ws.send(JSON.stringify({ type: "ice-candidate", callId: msg.callId, candidate: msg.candidate }));
            }
            break;
          }

          case "call-end": {
            const endPeer = findPeerByCallId(msg.callId, clientId);
            if (endPeer) {
              endPeer.ws.send(JSON.stringify({ type: "call-ended", callId: msg.callId }));
            }
            break;
          }

          case "open-gate": {
            const visitorGate = findClientByCallId(msg.callId, "visitor");
            if (visitorGate) {
              visitorGate.ws.send(JSON.stringify({ type: "gate-opened", callId: msg.callId }));
            }
            break;
          }

          case "internal-call": {
            if (!authUser) break;
            const { targetUserId, callId: iCallId, callerName: iCallerName } = msg;
            client.callId = iCallId;
            const iTarget = moradorConnections.get(targetUserId);
            if (iTarget && iTarget.ws.readyState === WebSocket.OPEN) {
              iTarget.callId = iCallId;
              iTarget.ws.send(JSON.stringify({
                type: "internal-incoming-call",
                callId: iCallId,
                callerName: iCallerName || authUser.name,
                callerRole: client.type,
                callerClientId: clientId,
              }));
            } else {
              ws.send(JSON.stringify({ type: "call-unavailable", callId: iCallId, reason: "offline" }));
            }
            break;
          }

          case "internal-call-portaria": {
            if (!authUser) break;
            const { callId: ipCallId, callerName: ipCallerName } = msg;
            client.callId = ipCallId;
            const funcPool2 = funcionarioConnections.get(authUser.condominio_id ?? 0) || [];
            const onlineFunc2 = funcPool2.find(f => f.ws.readyState === WebSocket.OPEN);
            if (onlineFunc2) {
              onlineFunc2.callId = ipCallId;
              onlineFunc2.ws.send(JSON.stringify({
                type: "internal-incoming-call",
                callId: ipCallId,
                callerName: ipCallerName || authUser.name,
                callerRole: "morador",
                callerClientId: clientId,
                bloco: (authUser as any).block || "",
                apartamento: (authUser as any).unit || "",
              }));
            } else {
              ws.send(JSON.stringify({ type: "call-unavailable", callId: ipCallId, reason: "portaria_offline" }));
            }
            break;
          }
        }
      } catch (err) {
        console.error("[WS Interfone] Error:", err);
      }
    });

    ws.on("close", () => {
      if (client.moradorId) {
        const current = moradorConnections.get(client.moradorId);
        if (current === client) {
          moradorConnections.delete(client.moradorId);
        }
      }
      if (client.type === "funcionario" && client.condominioId) {
        const pool = funcionarioConnections.get(client.condominioId);
        if (pool) {
          const idx = pool.indexOf(client);
          if (idx >= 0) pool.splice(idx, 1);
          if (pool.length === 0) funcionarioConnections.delete(client.condominioId);
        }
      }
      if (client.callId) {
        const otherType = client.type === "visitor" ? "morador" : "visitor";
        const other = findClientByCallId(client.callId, otherType);
        if (!other) {
          const other2 = findClientByCallId(client.callId, "funcionario");
          if (other2) other2.ws.send(JSON.stringify({ type: "call-ended", callId: client.callId, reason: "disconnected" }));
        } else {
          other.ws.send(JSON.stringify({ type: "call-ended", callId: client.callId, reason: "disconnected" }));
        }
      }
      clients.delete(clientId);
    });

    ws.on("error", () => {
      clients.delete(clientId);
      if (client.moradorId) {
        const current = moradorConnections.get(client.moradorId);
        if (current === client) {
          moradorConnections.delete(client.moradorId);
        }
      }
      if (client.type === "funcionario" && client.condominioId) {
        const pool = funcionarioConnections.get(client.condominioId);
        if (pool) {
          const idx = pool.indexOf(client);
          if (idx >= 0) pool.splice(idx, 1);
          if (pool.length === 0) funcionarioConnections.delete(client.condominioId);
        }
      }
    });
  });

  console.log("  Interfone WebSocket connections active");
}

function findClientById(id: string): WsClient | undefined {
  return clients.get(id);
}

function findClientByCallId(callId: string, type: "visitor" | "morador" | "funcionario"): WsClient | undefined {
  for (const [, c] of clients) {
    if (c.callId === callId && c.type === type && c.ws.readyState === WebSocket.OPEN) {
      return c;
    }
  }
  return undefined;
}

function findPeerByCallId(callId: string, excludeClientId: string): WsClient | undefined {
  for (const [id, c] of clients) {
    if (c.callId === callId && id !== excludeClientId && c.ws.readyState === WebSocket.OPEN) {
      return c;
    }
  }
  return undefined;
}
