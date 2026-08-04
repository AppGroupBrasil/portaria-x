import { useEffect, useRef, useState } from "react";
import { Clock } from "lucide-react";

interface TimePickerModalProps {
  open: boolean;
  label: string;
  value: string;
  isDark: boolean;
  onClose: () => void;
  onConfirm: (value: string) => void;
}

const HORAS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTOS = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));

export default function TimePickerModal({ open, label, value, isDark, onClose, onConfirm }: TimePickerModalProps) {
  const [hora, setHora] = useState("08");
  const [minuto, setMinuto] = useState("00");
  const horaRef = useRef<HTMLDivElement>(null);
  const minutoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const [h, m] = (value || "").split(":");
    const hh = HORAS.includes(h) ? h : "08";
    const mm = MINUTOS.includes(m) ? m : "00";
    setHora(hh);
    setMinuto(mm);
    const scroll = (box: HTMLDivElement | null, val: string) => {
      const alvo = box?.querySelector<HTMLElement>(`[data-val="${val}"]`);
      if (alvo) box!.scrollTop = alvo.offsetTop - box!.clientHeight / 2 + alvo.clientHeight / 2;
    };
    scroll(horaRef.current, hh);
    scroll(minutoRef.current, mm);
  }, [open, value]);

  if (!open) return null;

  const colunaStyle = {
    background: isDark ? "rgba(255,255,255,0.06)" : "#f8fafc",
    border: isDark ? "1px solid rgba(255,255,255,0.12)" : "1px solid #cbd5e1",
  };

  const item = (val: string, selecionado: boolean, onPick: () => void) => (
    <button
      key={val}
      type="button"
      data-val={val}
      onClick={onPick}
      className="w-full py-2 text-center text-base font-semibold rounded-lg"
      style={{
        background: selecionado ? "#3b82f6" : "transparent",
        color: selecionado ? "#fff" : isDark ? "rgba(255,255,255,0.85)" : "#334155",
      }}
    >
      {val}
    </button>
  );

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.65)", padding: "16px" }}
      onClick={onClose}
    >
      <div
        className="w-full rounded-2xl"
        style={{
          maxWidth: "360px",
          background: isDark ? "linear-gradient(180deg, #002a66 0%, #003580 100%)" : "#ffffff",
          border: isDark ? "1px solid rgba(255,255,255,0.12)" : "1px solid #cbd5e1",
          padding: "20px",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5" style={{ color: "#3b82f6" }} />
          <span className="text-base font-bold" style={{ color: isDark ? "#fff" : "#1e293b" }}>
            {label}
          </span>
          <span className="ml-auto text-xl font-bold tabular-nums" style={{ color: "#3b82f6" }}>
            {hora}:{minuto}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <span className="text-xs font-semibold mb-1 block" style={{ color: isDark ? "rgba(255,255,255,0.7)" : "#64748b" }}>
              Hora
            </span>
            <div ref={horaRef} className="rounded-xl overflow-y-auto p-1" style={{ ...colunaStyle, height: "180px" }}>
              {HORAS.map((h) => item(h, h === hora, () => setHora(h)))}
            </div>
          </div>
          <div>
            <span className="text-xs font-semibold mb-1 block" style={{ color: isDark ? "rgba(255,255,255,0.7)" : "#64748b" }}>
              Minuto
            </span>
            <div ref={minutoRef} className="rounded-xl overflow-y-auto p-1" style={{ ...colunaStyle, height: "180px" }}>
              {MINUTOS.map((m) => item(m, m === minuto, () => setMinuto(m)))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-4">
          <button
            type="button"
            onClick={() => {
              onConfirm("");
              onClose();
            }}
            className="w-full h-11 rounded-xl text-sm font-semibold"
            style={{
              background: isDark ? "rgba(255,255,255,0.08)" : "#f1f5f9",
              border: isDark ? "1px solid rgba(255,255,255,0.14)" : "1px solid #cbd5e1",
              color: isDark ? "rgba(255,255,255,0.85)" : "#475569",
            }}
          >
            Limpar
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full h-11 rounded-xl text-sm font-semibold"
            style={{
              background: isDark ? "rgba(255,255,255,0.08)" : "#f1f5f9",
              border: isDark ? "1px solid rgba(255,255,255,0.14)" : "1px solid #cbd5e1",
              color: isDark ? "rgba(255,255,255,0.85)" : "#475569",
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm(`${hora}:${minuto}`);
              onClose();
            }}
            className="w-full h-11 rounded-xl text-sm font-bold"
            style={{ background: "#10b981", border: "1px solid #10b981", color: "#fff" }}
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}
