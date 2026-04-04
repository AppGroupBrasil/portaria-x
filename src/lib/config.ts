/* ═══════════════════════════════════════════════════════════
   Capacitor / Web environment configuration
   ═══════════════════════════════════════════════════════════ */

/** True when running inside a Capacitor native shell (Android/iOS) */
export const isNative: boolean =
  globalThis.window !== undefined &&
  !!(globalThis.window as any).Capacitor?.isNativePlatform?.();

const envApiBaseRaw = ((import.meta as any).env?.VITE_API_URL ?? "") as string;
const envApiBase = envApiBaseRaw.trim();

/**
 * Base URL for all API calls.
 * - Web (dev):  "" → Vite proxy forwards /api to localhost:3001
 * - Web (prod): "" → Express serves SPA + API on same origin
 * - Capacitor:  uses VITE_API_URL env var (e.g. https://portariax.com.br)
 */
export const API_BASE: string =
  // Web always uses same-origin to avoid CORS/env drift between www and apex.
  // Native needs an absolute host; fallback guarantees API reachability.
  isNative ? (envApiBase || "https://www.portariax.com.br") : "";

/**
 * Public-facing origin used to build shareable links (QR codes, WhatsApp, etc.).
 * In Capacitor the WebView origin is capacitor://localhost — unusable for links.
 */
export const APP_ORIGIN: string =
  (import.meta as any).env?.VITE_APP_ORIGIN ??
  (isNative ? "https://www.portariax.com.br" : globalThis.window.location.origin);

/**
 * Build a WebSocket URL.
 * In dev, the backend serves WebSocket endpoints directly on port 3001:
 *   /ws/estou-chegando  → port 3001
 * In prod / Capacitor, same origin or API_BASE.
 */
export function buildWsUrl(path: string): string {
  if (API_BASE) {
    return API_BASE.replace(/^http/, "ws") + path;
  }

  const proto = globalThis.window.location.protocol === "https:" ? "wss:" : "ws:";
  const hostname = globalThis.window.location.hostname;
  const port = globalThis.window.location.port;

  // Dev: Vite runs on 5173 while the backend serves HTTP + WS on 3001.
  if (port && port !== "80" && port !== "443" && port !== "3001") {
    const wsPort = path.includes("estou-chegando") ? "3001" : "3002";
    return `${proto}//${hostname}:${wsPort}${path}`;
  }

  // Prod: same-origin
  return `${proto}//${globalThis.window.location.host}${path}`;
}
