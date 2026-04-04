/* ═══════════════════════════════════════════════════════════
   Centralized API fetch wrapper
   - Web: sends credentials via cookie (same-origin)
   - Capacitor: sends Authorization Bearer header
   ═══════════════════════════════════════════════════════════ */

import { API_BASE, isNative } from "./config";

const TOKEN_KEY = "auth_token";

// ─── Token helpers ───────────────────────────────────────
export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null) {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch {}
}

export function clearToken() {
  setToken(null);
}

// ─── Demo mode helpers ───────────────────────────────────
const DEMO_KEY = "portariax_demo";
function _isDemoMode(): boolean {
  try { return localStorage.getItem(DEMO_KEY) === "1"; } catch { return false; }
}

// Allowlisted auth paths that work even in demo mode
const DEMO_ALLOW = ["/api/auth/demo", "/api/auth/me", "/api/auth/logout"];

// Custom event fired when a mutating action is blocked in demo mode
export function onDemoBlocked(cb: () => void) {
  globalThis.window.addEventListener("portariax:demo-blocked", cb);
  return () => globalThis.window.removeEventListener("portariax:demo-blocked", cb);
}

// ─── Helper: resolve input to URL string ─────────────────
function resolveUrl(input: string | URL | Request): string {
  let url: string;
  if (typeof input === "string") {
    url = input;
  } else if (input instanceof URL) {
    url = input.href;
  } else {
    url = input.url;
  }
  if (url.startsWith("/")) {
    url = API_BASE + url;
  }
  return url;
}

// ─── Helper: block mutating requests in demo mode ────────
function maybeDemoBlock(url: string, method: string): Response | null {
  if (!_isDemoMode()) return null;
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(method)) return null;

  const path = url.replace(API_BASE, "");
  if (DEMO_ALLOW.some(a => path.startsWith(a))) return null;

  globalThis.window.dispatchEvent(new Event("portariax:demo-blocked"));
  return new Response(JSON.stringify({ error: "Modo demonstração — ação bloqueada.", demo: true }), {
    status: 403,
    headers: { "Content-Type": "application/json" },
  });
}

// ─── Helper: mobile fallback fetch ───────────────────────
const CONNECTION_ERR = "Falha de conexão com o servidor. Verifique a internet do celular e tente novamente.";

async function fetchWithFallback(url: string, fetchInit: RequestInit): Promise<Response> {
  try {
    return await fetch(url, fetchInit);
  } catch (err) {
    console.warn("Fetch failed:", err);
    if (!isNative) throw new Error(CONNECTION_ERR);

    const isWww = url.startsWith("https://www.portariax.com.br");
    const isApex = url.startsWith("https://portariax.com.br");
    if (!isWww && !isApex) throw new Error(CONNECTION_ERR);

    const altUrl = isWww
      ? url.replace("https://www.portariax.com.br", "https://portariax.com.br")
      : url.replace("https://portariax.com.br", "https://www.portariax.com.br");

    try {
      return await fetch(altUrl, fetchInit);
    } catch {
      throw new Error(CONNECTION_ERR);
    }
  }
}

// ─── Helper: handle blocked condomínio response ──────────
async function handleBlockedResponse(response: Response) {
  if (response.status !== 403) return;
  try {
    const cloned = response.clone();
    const body = await cloned.json();
    if (body.blocked) {
      clearToken();
      localStorage.setItem("blocked_message", body.error || "Usuário bloqueado! Entre em contato com seu síndico ou administradora.");
      globalThis.window.location.href = "/login";
    }
  } catch {
    // ignore parse errors
  }
}

// ─── apiFetch — drop-in replacement for fetch() ─────────
export async function apiFetch(
  input: string | URL | Request,
  init?: RequestInit
): Promise<Response> {
  const url = resolveUrl(input);

  const method = (init?.method || "GET").toUpperCase();
  const blocked = maybeDemoBlock(url, method);
  if (blocked) return blocked;

  const headers = new Headers(init?.headers);
  if (isNative) {
    const token = getToken();
    if (token && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  const fetchInit: RequestInit = {
    ...init,
    headers,
    credentials: isNative ? "omit" : "include",
  };

  const response = await fetchWithFallback(url, fetchInit);
  await handleBlockedResponse(response);
  return response;
}
