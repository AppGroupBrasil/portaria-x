import { useEffect, useState } from "react";

type Variant = "info" | "warn" | "danger";

interface DialogState {
  type: "alert" | "confirm";
  title?: string;
  message: string;
  variant?: Variant;
  confirmLabel?: string;
  cancelLabel?: string;
  resolve: (v: any) => void;
}

let setStateRef: ((s: DialogState | null) => void) | null = null;
let pending: DialogState[] = [];

function show(s: DialogState) {
  if (setStateRef) setStateRef(s);
  else pending.push(s);
}

interface AlertOpts { title?: string; variant?: Variant; confirmLabel?: string; }
interface ConfirmOpts extends AlertOpts { cancelLabel?: string; }

export function dialogAlert(message: string, opts: AlertOpts = {}): Promise<void> {
  return new Promise((resolve) => {
    show({ type: "alert", message, ...opts, resolve });
  });
}

export function dialogConfirm(message: string, opts: ConfirmOpts = {}): Promise<boolean> {
  return new Promise((resolve) => {
    show({ type: "confirm", message, variant: "danger", ...opts, resolve });
  });
}

const COLORS = {
  info:   { accent: "#003580", icon: "ℹ" },
  warn:   { accent: "#d97706", icon: "⚠" },
  danger: { accent: "#dc2626", icon: "⚠" },
} as const;

export function DialogHost() {
  const [state, setState] = useState<DialogState | null>(null);

  useEffect(() => {
    setStateRef = setState;
    if (pending.length) {
      const next = pending.shift()!;
      setState(next);
    }
    return () => { setStateRef = null; };
  }, []);

  useEffect(() => {
    if (!state) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        state.resolve(state.type === "confirm" ? false : undefined);
        setState(null);
      } else if (e.key === "Enter") {
        state.resolve(state.type === "confirm" ? true : undefined);
        setState(null);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [state]);

  if (!state) return null;
  const c = COLORS[state.variant || "info"];
  const isConfirm = state.type === "confirm";

  const close = (value: boolean | undefined) => {
    state.resolve(isConfirm ? !!value : undefined);
    setState(null);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={(e) => { if (e.target === e.currentTarget) close(false); }}
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.55)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16, animation: "dlgFade 120ms ease-out",
      }}
    >
      <style>{`@keyframes dlgFade { from { opacity: 0 } to { opacity: 1 } }
@keyframes dlgPop { from { transform: scale(0.96); opacity: 0 } to { transform: scale(1); opacity: 1 } }`}</style>
      <div
        style={{
          background: "var(--card, #fff)",
          color: "var(--card-foreground, #111)",
          borderRadius: 14,
          maxWidth: 420, width: "100%",
          boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
          overflow: "hidden",
          animation: "dlgPop 140ms ease-out",
        }}
      >
        <div style={{ padding: "18px 20px 8px", display: "flex", gap: 12, alignItems: "flex-start" }}>
          <div style={{
            width: 36, height: 36, borderRadius: 999,
            background: c.accent + "22", color: c.accent,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, fontWeight: 700, flexShrink: 0,
          }}>{c.icon}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            {state.title && (
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, lineHeight: 1.3 }}>{state.title}</h3>
            )}
            <p style={{ margin: state.title ? "4px 0 0" : 0, fontSize: 14, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
              {state.message}
            </p>
          </div>
        </div>
        <div style={{
          display: "flex", gap: 8, justifyContent: "flex-end",
          padding: "12px 16px 16px",
        }}>
          {isConfirm && (
            <button
              onClick={() => close(false)}
              style={{
                padding: "8px 16px", borderRadius: 8, border: "1px solid rgba(0,0,0,0.15)",
                background: "transparent", color: "inherit", fontSize: 14, fontWeight: 500,
                cursor: "pointer",
              }}
            >{state.cancelLabel || "Cancelar"}</button>
          )}
          <button
            autoFocus
            onClick={() => close(true)}
            style={{
              padding: "8px 16px", borderRadius: 8, border: "none",
              background: c.accent, color: "#fff", fontSize: 14, fontWeight: 600,
              cursor: "pointer",
            }}
          >{state.confirmLabel || (isConfirm ? "Confirmar" : "OK")}</button>
        </div>
      </div>
    </div>
  );
}
