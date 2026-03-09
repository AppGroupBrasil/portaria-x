/* ═══════════════════════════════════════════════════════════
   Capacitor / Web environment configuration
   ═══════════════════════════════════════════════════════════ */

/** True when running inside a Capacitor native shell (Android/iOS) */
export const isNative: boolean =
  typeof window !== "undefined" &&
  !!(window as any).Capacitor?.isNativePlatform?.();

/**
 * Base URL for all API calls.
 * - Web (dev):  "" → Vite proxy forwards /api to localhost:3001
 * - Web (prod): "" → Express serves SPA + API on same origin
 * - Capacitor:  uses VITE_API_URL env var (e.g. https://portariax.com.br)
 */
export const API_BASE: string =
  (import.meta as any).env?.VITE_API_URL ?? "";

/**
 * Public-facing origin used to build shareable links (QR codes, WhatsApp, etc.).
 * In Capacitor the WebView origin is capacitor://localhost — unusable for links.
 */
export const APP_ORIGIN: string =
  (import.meta as any).env?.VITE_APP_ORIGIN ??
  (isNative ? "https://www.portariax.com.br" : window.location.origin);

/**
 * Build a WebSocket URL from the current API base.
 * - Web dev:  ws://<host>:3001/ws/interfone  (direct to backend, bypasses Vite proxy)
 * - Web prod: wss://portariax.com.br/ws/interfone
 * - Capacitor: wss://portariax.com.br/ws/interfone
 */
/**
 * Build a WebSocket URL.
 * In dev, WebSocket servers run on dedicated ports to avoid Vite proxy issues:
 *   /ws/interfone      → port 3002
 *   /ws/estou-chegando  → port 3003
 * In prod / Capacitor, same origin or API_BASE.
 */
export function buildWsUrl(path: string): string {
  if (API_BASE) {
    return API_BASE.replace(/^http/, "ws") + path;
  }

  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  const hostname = window.location.hostname;
  const port = window.location.port;

  // Dev: Vite runs on 5173, route to dedicated WS ports
  if (port && port !== "80" && port !== "443" && port !== "3001") {
    const wsPort = path.includes("estou-chegando") ? "3003" : "3002";
    return `${proto}//${hostname}:${wsPort}${path}`;
  }

  // Prod: same-origin
  return `${proto}//${window.location.host}${path}`;
}
