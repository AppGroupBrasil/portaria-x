import { useState } from "react";
import { ChevronDown, ChevronUp, HelpCircle } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

interface Props {
  steps: string[];
}

export default function ComoFunciona({ steps }: Props) {
  const { p } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <div style={{ borderRadius: 14, border: p.featureBorder, background: p.surfaceBg, overflow: "hidden", marginBottom: 8 }}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between cursor-pointer"
        style={{ padding: "14px 16px", color: p.text, background: "transparent", border: "none", minHeight: "48px" }}
      >
        <div className="flex items-center" style={{ gap: 8 }}>
          <HelpCircle style={{ width: 16, height: 16, color: p.accentBright }} />
          <span style={{ fontWeight: 700, fontSize: 13, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Como Funciona
          </span>
        </div>
        {open
          ? <ChevronUp style={{ width: 16, height: 16, color: p.textDim }} />
          : <ChevronDown style={{ width: 16, height: 16, color: p.textDim }} />}
      </button>
      {open && (
        <div style={{ padding: "0 16px 14px", borderTop: `1px solid ${p.divider}` }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingTop: 10 }}>
            {steps.map((step, i) => (
              <p key={i} style={{ fontSize: 12, lineHeight: 1.5, color: p.textDim, margin: 0 }}>
                {step}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
