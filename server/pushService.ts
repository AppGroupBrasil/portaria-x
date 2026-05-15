/**
 * ═══════════════════════════════════════════════════════════
 * PUSH NOTIFICATION SERVICE — Firebase Cloud Messaging (FCM)
 * Centralized service for sending push notifications.
 * ═══════════════════════════════════════════════════════════
 */

import admin from "firebase-admin";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import db from "./db.js";
import { logger } from "./logger.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── Initialize Firebase Admin SDK ───
let firebaseInitialized = false;

function initFirebase() {
  if (firebaseInitialized) return;

  const candidates = [
    process.env.FIREBASE_CREDENTIALS_PATH,
    path.join(__dirname, "..", "server", "firebase-service-account.json"),
    path.join(__dirname, "firebase-service-account.json"),
  ].filter((p): p is string => !!p);

  const credentialPath = candidates.find(p => fs.existsSync(p));
  if (!credentialPath) {
    logger.warn("⚠️  Firebase service account not found. Push notifications disabled.");
    return;
  }

  try {
    const serviceAccount = JSON.parse(fs.readFileSync(credentialPath, "utf-8"));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    firebaseInitialized = true;
    logger.info("  🔔 Firebase Admin SDK initialized (push ready)");
  } catch (err) {
    logger.error("Firebase init error:", err);
  }
}

// Initialize on module load
initFirebase();

// ─── Types ───
interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  /** Android channel ID */
  channelId?: string;
  /** Sound file name */
  sound?: string;
}

// ─── Send push to a specific user ───
export async function sendPushToUser(userId: number, payload: PushPayload): Promise<number> {
  if (!firebaseInitialized) return 0;

  const tokens = db.prepare(
    "SELECT token FROM device_tokens WHERE user_id = ? AND active = 1"
  ).all(userId) as { token: string }[];

  if (tokens.length === 0) return 0;

  return sendPushToTokens(tokens.map(t => t.token), payload);
}

// ─── Send push to all users with a specific role in a condominium ───
export async function sendPushToCondominioRole(
  condominioId: number,
  roles: string[],
  payload: PushPayload
): Promise<number> {
  if (!firebaseInitialized) return 0;

  const placeholders = roles.map(() => "?").join(",");
  const tokens = db.prepare(`
    SELECT dt.token 
    FROM device_tokens dt
    INNER JOIN users u ON u.id = dt.user_id
    WHERE u.condominio_id = ? 
      AND u.role IN (${placeholders})
      AND dt.active = 1
  `).all(condominioId, ...roles) as { token: string }[];

  if (tokens.length === 0) return 0;

  return sendPushToTokens(tokens.map(t => t.token), payload);
}

// ─── Send push to all portaria staff (funcionario + sindico) of a condominium ───
export async function sendPushToPortaria(condominioId: number, payload: PushPayload): Promise<number> {
  return sendPushToCondominioRole(condominioId, ["funcionario", "sindico", "administradora"], payload);
}

// ─── Send push to all moradores of a condominium ───
export async function sendPushToMoradores(condominioId: number, payload: PushPayload): Promise<number> {
  return sendPushToCondominioRole(condominioId, ["morador"], payload);
}

// ─── Core: send to FCM tokens ───
async function sendPushToTokens(tokens: string[], payload: PushPayload): Promise<number> {
  if (!firebaseInitialized || tokens.length === 0) return 0;

  const message: admin.messaging.MulticastMessage = {
    tokens,
    notification: {
      title: payload.title,
      body: payload.body,
    },
    data: payload.data || {},
    android: {
      priority: "high",
      notification: {
        channelId: payload.channelId || "portariax_default",
        sound: payload.sound || "default",
        priority: "high",
      },
    },
  };

  try {
    const response = await admin.messaging().sendEachForMulticast(message);

    // Deactivate invalid tokens
    if (response.failureCount > 0) {
      response.responses.forEach((resp, idx) => {
        if (resp.error) {
          const code = resp.error.code;
          if (
            code === "messaging/invalid-registration-token" ||
            code === "messaging/registration-token-not-registered"
          ) {
            db.prepare("UPDATE device_tokens SET active = 0 WHERE token = ?").run(tokens[idx]);
          }
        }
      });
    }

    return response.successCount;
  } catch (err) {
    logger.error("FCM send error:", err);
    return 0;
  }
}

export { firebaseInitialized };
