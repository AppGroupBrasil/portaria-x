import { useState, useRef, useEffect } from "react";
import { Palette, Check, RefreshCw } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { THEME_LIST, type ThemeId } from "@/lib/themes";

/* ═══════════════════════════════════════════════
   ThemePicker — Seletor de tema visual premium
   Aparece como botão na header, abre um dropdown
   ═══════════════════════════════════════════════ */

export default function ThemePicker() {
  const { theme, setTheme, p } = useTheme();
  const [open, setOpen] = useState(false);
  const [pendingTheme, setPendingTheme] = useState<ThemeId | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Reset pending when dropdown closes
  useEffect(() => {
    if (!open) setPendingTheme(null);
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(!open)}
        aria-label="Alterar tema visual"
        style={{
          width: 44,
          height: 44,
          borderRadius: 14,
          background: p.btnBg,
          border: p.btnBorder,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.15s",
          position: "relative",
        }}
      >
        <Palette style={{ width: 20, height: 20, color: p.text }} />
        {/* Active swatch dot */}
        <div
          style={{
            position: "absolute",
            bottom: 4,
            right: 4,
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: p.accent,
            border: `2px solid ${p.isDarkBase ? "rgba(0,0,0,0.3)" : "#fff"}`,
          }}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            minWidth: 220,
            borderRadius: 16,
            padding: "8px",
            background: p.isDarkBase ? "rgba(15,23,42,0.95)" : "#fff",
            border: p.cardBorder,
            boxShadow: `0 12px 40px ${p.isDarkBase ? "rgba(0,0,0,0.5)" : "rgba(0,0,0,0.14)"}`,
            backdropFilter: "blur(20px)",
            zIndex: 9999,
            animation: "fade-in 0.15s ease-out forwards",
          }}
        >
          <p
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "1.5px",
              textTransform: "uppercase",
              color: p.textMuted,
              padding: "6px 12px 8px",
              margin: 0,
            }}
          >
            Tema Visual
          </p>
          {THEME_LIST.map((t) => {
            const isActive = theme === t.id;
            return (
              <button
                key={t.id}
                onClick={() => {
                  if (t.id !== theme) {
                    setTheme(t.id as ThemeId);
                    setPendingTheme(t.id as ThemeId);
                  }
                }}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "none",
                  background: isActive
                    ? p.isDarkBase
                      ? "rgba(255,255,255,0.08)"
                      : "rgba(0,53,128,0.06)"
                    : "transparent",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "background 0.1s",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.background = p.isDarkBase ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)";
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.background = "transparent";
                }}
              >
                {/* Swatch */}
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    background: t.swatch,
                    border: `2px solid ${isActive ? t.accent : p.isDarkBase ? "rgba(255,255,255,0.1)" : "#e2e8f0"}`,
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "border 0.15s",
                  }}
                >
                  {isActive && <Check style={{ width: 14, height: 14, color: t.id === "light" ? "#003580" : "#fff" }} />}
                </div>
                {/* Label */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      fontSize: 13,
                      fontWeight: isActive ? 700 : 500,
                      color: isActive ? (p.isDarkBase ? "#fff" : "#1e293b") : p.textSecondary,
                      margin: 0,
                    }}
                  >
                    {t.name}
                  </p>
                </div>
                {isActive && (
                  <div
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: t.accent,
                      flexShrink: 0,
                    }}
                  />
                )}
              </button>
            );
          })}

          {/* Botão Aplicar Tema — aparece quando seleciona tema diferente */}
          {pendingTheme && (
            <div style={{ padding: "8px 4px 4px", borderTop: `1px solid ${p.isDarkBase ? "rgba(255,255,255,0.08)" : "#e2e8f0"}`, marginTop: 4 }}>
              <button
                onClick={() => globalThis.window.location.reload()}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "none",
                  background: THEME_LIST.find(t => t.id === pendingTheme)?.accent || p.accent,
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                  transition: "opacity 0.15s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.85"; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
              >
                <RefreshCw style={{ width: 14, height: 14 }} />
                Aplicar Tema
              </button>
              <p style={{ fontSize: 10, color: p.textMuted, textAlign: "center", margin: "6px 0 2px", lineHeight: 1.3 }}>
                A página será recarregada
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
