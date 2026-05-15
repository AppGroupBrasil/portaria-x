import { useState, type ReactNode } from "react";
import { HelpCircle, X, ArrowRight, Building, User } from "lucide-react";

/* ── Reusable styled blocks for tutorials ── */

const flowBoxStyle = (bg: string, border: string): React.CSSProperties => ({
  background: bg, borderRadius: "12px", padding: "14px", border: `2px solid ${border}`, marginBottom: "10px",
});

const flowHeaderStyle = (color: string): React.CSSProperties => ({
  display: "flex", alignItems: "center", gap: "8px", fontWeight: 800, fontSize: "14px", color, marginBottom: "8px",
});

const stepStyle: React.CSSProperties = {
  fontSize: "14px", color: "#374151", lineHeight: 1.7, margin: 0,
};

export function FlowPortaria({ children }: { children: ReactNode }) {
  return (
    <div style={flowBoxStyle("#eef0f5", "#2d3354")}>
      <div style={flowHeaderStyle("#2d3354")}>
        <Building style={{ width: "16px", height: "16px" }} />
        PORTARIA ENVIA
        <ArrowRight style={{ width: "14px", height: "14px" }} />
        <User style={{ width: "16px", height: "16px" }} />
        MORADOR RECEBE
      </div>
      <div style={stepStyle}>{children}</div>
    </div>
  );
}

export function FlowMorador({ children }: { children: ReactNode }) {
  return (
    <div style={flowBoxStyle("#f0fdf4", "#86efac")}>
      <div style={flowHeaderStyle("#166534")}>
        <User style={{ width: "16px", height: "16px" }} />
        MORADOR ENVIA
        <ArrowRight style={{ width: "14px", height: "14px" }} />
        <Building style={{ width: "16px", height: "16px" }} />
        PORTARIA RECEBE
      </div>
      <div style={stepStyle}>{children}</div>
    </div>
  );
}

export function TSection({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div style={{ marginBottom: "16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 800, fontSize: "15px", color: "var(--card-foreground)", marginBottom: "8px" }}>
        {icon}
        {title}
      </div>
      <div style={{ fontSize: "14px", color: "var(--muted-foreground)", lineHeight: 1.7 }}>{children}</div>
    </div>
  );
}

export function TStep({ n, children }: { n: number; children: ReactNode }) {
  return (
    <div style={{ display: "flex", gap: "10px", marginBottom: "6px" }}>
      <span style={{
        width: "22px", height: "22px", borderRadius: "50%", background: "#6366f1", color: "#fff",
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 800, flexShrink: 0, marginTop: "1px",
      }}>{n}</span>
      <span style={{ fontSize: "14px", color: "#374151", lineHeight: 1.6 }}>{children}</span>
    </div>
  );
}

export function TBullet({ children }: { children: ReactNode }) {
  return <p style={{ fontSize: "14px", color: "var(--muted-foreground)", lineHeight: 1.6, margin: "3px 0", paddingLeft: "8px" }}>• {children}</p>;
}

interface TutorialButtonProps {
  title: string;
  text?: string;
  children?: ReactNode;
}

export default function TutorialButton({ title, text, children }: TutorialButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "4px",
          padding: "5px 12px",
          borderRadius: "20px",
          border: "none",
          background: "rgba(255,255,255,0.2)",
          backdropFilter: "blur(4px)",
          color: "#fff",
          fontSize: "12px",
          fontWeight: 700,
          cursor: "pointer",
          whiteSpace: "nowrap",
          flexShrink: 0,
        }}
      >
        <HelpCircle style={{ width: "14px", height: "14px" }} />
        Tutorial
      </button>

      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            animation: "fadeIn 0.2s ease",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--color-card, #fff)",
              borderRadius: "20px",
              maxWidth: "420px",
              width: "100%",
              maxHeight: "80vh",
              overflow: "auto",
              boxShadow: "0 25px 60px rgba(0,0,0,0.3)",
              animation: "slideUp 0.25s ease",
            }}
          >
            {/* Header */}
            <div style={{
              background: "linear-gradient(135deg, #6366f1, #4f46e5)",
              borderRadius: "20px 20px 0 0",
              padding: "20px 24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <HelpCircle style={{ width: "22px", height: "22px", color: "#fff" }} />
                <span style={{ fontWeight: 800, fontSize: "16px", color: "#fff" }}>Tutorial</span>
              </div>
              <button
                onClick={() => setOpen(false)}
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  border: "none",
                  background: "rgba(255,255,255,0.2)",
                  color: "#fff",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <X style={{ width: "18px", height: "18px" }} />
              </button>
            </div>

            {/* Content */}
            <div style={{ padding: "24px" }}>
              <h3 style={{ fontWeight: 800, fontSize: "17px", color: "var(--card-foreground)", marginBottom: "14px" }}>
                {title}
              </h3>
              {children ? (
                <div style={{ fontSize: "15px", lineHeight: 1.7, color: "var(--muted-foreground)" }}>
                  {children}
                </div>
              ) : (
                <div style={{
                  fontSize: "15px",
                  lineHeight: 1.8,
                  color: "var(--muted-foreground)",
                  whiteSpace: "pre-line",
                }}>
                  {text}
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: "0 24px 24px" }}>
              <button
                onClick={() => setOpen(false)}
                style={{
                  width: "100%",
                  padding: "14px",
                  borderRadius: "12px",
                  border: "none",
                  background: "linear-gradient(135deg, #6366f1, #4f46e5)",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: "16px",
                  cursor: "pointer",
                }}
              >
                Entendi!
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </>
  );
}
