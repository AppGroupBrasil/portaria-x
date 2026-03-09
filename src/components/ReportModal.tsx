import { useState } from "react";
import { FileText, X, Calendar, Download, BarChart3 } from "lucide-react";

interface ReportModalProps {
  show: boolean;
  onClose: () => void;
  onGenerate: (dateFrom: string, dateTo: string, withCharts: boolean) => void;
  title: string;
}

export default function ReportModal({ show, onClose, onGenerate, title }: ReportModalProps) {
  const today = new Date().toISOString().slice(0, 10);
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [withCharts, setWithCharts] = useState(false);

  if (!show) return null;

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "12px 14px", borderRadius: "12px",
    border: "1px solid #cbd5e1", fontSize: "14px", background: "#fff",
    color: "#0f172a", outline: "none", boxSizing: "border-box",
  };
  const labelStyle: React.CSSProperties = {
    fontWeight: 600, fontSize: "13px", color: "#1e293b",
    marginBottom: "6px", display: "block",
  };

  return (
    <div
      style={{
        position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
        background: "rgba(0,0,0,0.5)", zIndex: 9999,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "20px",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff", borderRadius: "20px", padding: "24px",
          width: "100%", maxWidth: "400px",
          display: "flex", flexDirection: "column", gap: "16px",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ fontSize: "17px", fontWeight: 700, color: "#1e293b", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
            <FileText className="w-5 h-5" style={{ color: "#6366f1" }} />
            Gerar Relatorio
          </h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px" }}>
            <X className="w-5 h-5" style={{ color: "#94a3b8" }} />
          </button>
        </div>

        <p style={{ fontSize: "13px", color: "#64748b", margin: 0 }}>
          {title}
        </p>

        {/* Date from */}
        <div>
          <label style={labelStyle}>
            <Calendar className="w-4 h-4 inline mr-1" style={{ verticalAlign: "text-bottom" }} />
            Data Inicial
          </label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            onFocus={(e) => { try { (e.target as any).showPicker?.(); } catch {} }}
            style={inputStyle}
          />
        </div>

        {/* Date to */}
        <div>
          <label style={labelStyle}>
            <Calendar className="w-4 h-4 inline mr-1" style={{ verticalAlign: "text-bottom" }} />
            Data Final
          </label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            onFocus={(e) => { try { (e.target as any).showPicker?.(); } catch {} }}
            style={inputStyle}
          />
        </div>

        {/* Charts toggle */}
        <button
          onClick={() => setWithCharts(!withCharts)}
          type="button"
          style={{
            display: "flex", alignItems: "center", gap: "12px",
            padding: "12px 14px", borderRadius: "12px",
            border: withCharts ? "2px solid #6366f1" : "1.5px solid #e2e8f0",
            background: withCharts ? "linear-gradient(135deg, #eef2ff, #e0e7ff)" : "#f8fafc",
            cursor: "pointer", transition: "all 0.2s",
          }}
        >
          <div
            style={{
              width: 36, height: 36, borderRadius: "10px",
              background: withCharts ? "linear-gradient(135deg, #6366f1, #4f46e5)" : "#e2e8f0",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.2s", flexShrink: 0,
            }}
          >
            <BarChart3 style={{ width: 18, height: 18, color: withCharts ? "#fff" : "#94a3b8" }} />
          </div>
          <div style={{ textAlign: "left", flex: 1 }}>
            <p style={{ fontSize: "13px", fontWeight: 700, color: withCharts ? "#4338ca" : "#1e293b", margin: 0 }}>
              Incluir Graficos
            </p>
            <p style={{ fontSize: "11px", color: withCharts ? "#6366f1" : "#94a3b8", margin: 0 }}>
              Adiciona graficos de barras e estatisticas ao PDF
            </p>
          </div>
          {/* Toggle switch */}
          <div
            style={{
              width: 40, height: 22, borderRadius: "11px",
              background: withCharts ? "#6366f1" : "#cbd5e1",
              position: "relative", transition: "all 0.2s", flexShrink: 0,
            }}
          >
            <div
              style={{
                width: 18, height: 18, borderRadius: "50%", background: "#fff",
                position: "absolute", top: 2, left: withCharts ? 20 : 2,
                transition: "all 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
              }}
            />
          </div>
        </button>

        {/* Generate button */}
        <button
          onClick={() => {
            onGenerate(dateFrom, dateTo, withCharts);
            onClose();
          }}
          style={{
            width: "100%", padding: "14px", borderRadius: "14px", border: "none",
            background: "linear-gradient(135deg, #6366f1, #4f46e5)",
            color: "#fff", fontSize: "15px", fontWeight: 700, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
          }}
        >
          <Download className="w-5 h-5" /> Gerar PDF {withCharts ? "com Graficos" : ""}
        </button>
      </div>
    </div>
  );
}
