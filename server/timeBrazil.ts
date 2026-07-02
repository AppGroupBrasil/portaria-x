// ─────────────────────────────────────────────────────────────────────────────
// Data/hora no fuso do Brasil (America/Sao_Paulo), independente do fuso do
// servidor. Em produção o servidor roda em UTC; usar new Date().toISOString()
// ou getHours() diretamente gera datas/horas erradas (3h adiantadas). Estes
// helpers derivam a data/hora local do Brasil via Intl, sem depender do TZ do SO.
// ─────────────────────────────────────────────────────────────────────────────

const TZ = "America/Sao_Paulo";

/** Data local do Brasil no formato YYYY-MM-DD. */
export function brazilDateStr(d: Date = new Date()): string {
  // "en-CA" formata como YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** Hora local do Brasil no formato HH:MM (24h, 00–23). */
export function brazilTimeStr(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(d);
}
