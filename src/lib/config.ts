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
 * In dev, the frontend connects to the Vite origin and relies on the dev proxy
 * to forward WebSocket traffic to the backend. This avoids mixed-content
 * failures when Vite runs on HTTPS locally.
 * In prod / Capacitor, same origin or API_BASE.
 */
export function buildWsUrl(path: string): string {
  if (API_BASE) {
    return API_BASE.replace(/^http/, "ws") + path;
  }

  const proto = globalThis.window.location.protocol === "https:" ? "wss:" : "ws:";
  const hostname = globalThis.window.location.hostname;
  const port = globalThis.window.location.port;

  // Dev: connect to Vite itself and let the proxy forward the WS connection.
  if (port && port !== "80" && port !== "443" && port !== "3001") {
    return `${proto}//${hostname}:${port}${path}`;
  }

  // Prod: same-origin
  return `${proto}//${globalThis.window.location.host}${path}`;
}
