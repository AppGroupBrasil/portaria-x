const LEVEL = (process.env.LOG_LEVEL || (process.env.NODE_ENV === "production" ? "info" : "debug")).toLowerCase();
const ORDER = { debug: 10, info: 20, warn: 30, error: 40, silent: 99 } as const;
type Level = keyof typeof ORDER;
const threshold = ORDER[(LEVEL as Level) in ORDER ? (LEVEL as Level) : "info"];
// In production, emit JSON lines for log shippers (Loki/Datadog/etc.).
const isJson = process.env.NODE_ENV === "production" && process.env.LOG_FORMAT !== "text";

function emit(level: Level, args: unknown[]) {
  if (ORDER[level] < threshold) return;
  const stamp = new Date().toISOString();
  const fn = level === "error" || level === "warn" ? console.error : console.log;

  if (isJson) {
    fn(JSON.stringify({ ts: stamp, level, msg: args.map(formatArg).join(" ") }));
    return;
  }
  fn(`[${stamp}] [${level.toUpperCase()}]`, ...args);
}

function formatArg(a: unknown): string {
  if (a instanceof Error) return `${a.message}\n${a.stack}`;
  if (typeof a === "string") return a;
  try { return JSON.stringify(a); } catch { return Object.prototype.toString.call(a); }
}

export const logger = {
  debug: (...a: unknown[]) => emit("debug", a),
  info: (...a: unknown[]) => emit("info", a),
  warn: (...a: unknown[]) => emit("warn", a),
  error: (...a: unknown[]) => emit("error", a),
};
