import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Volume2, Check, Play, Square } from "lucide-react";
import {
  RINGTONES,
  getSelectedRingtone,
  setSelectedRingtone,
  previewRingtone,
  stopRingtone,
} from "@/lib/ringtones";
import { useTheme } from "@/hooks/useTheme";

export default function ConfiguracaoToque() {
  const { isDark, p } = useTheme();
  const navigate = useNavigate();
  const [selected, setSelected] = useState(getSelectedRingtone());
  const [playing, setPlaying] = useState<string | null>(null);

  const handleSelect = (id: string) => {
    setSelected(id);
    setSelectedRingtone(id);
  };

  const handlePreview = (id: string) => {
    if (playing === id) {
      stopRingtone();
      setPlaying(null);
      return;
    }
    setPlaying(id);
    previewRingtone(id);
    setTimeout(() => setPlaying((p) => (p === id ? null : p)), 3000);
  };

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "linear-gradient(135deg, #f8fafc 0%, #e0e7ef 100%)",
      }}
    >
      {/* Header */}
      <div
        style={{
          background: isDark ? "linear-gradient(135deg, #0062d1 0%, #003d99 50%, #001d4a 100%)" : "#ffffff",
          padding: "20px 16px 24px",
          color: p.text,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              background: isDark ? "rgba(255,255,255,0.15)" : "#f0f4f8",
              border: "none",
              borderRadius: "10px",
              padding: "8px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ArrowLeft className="w-5 h-5" style={{ color: p.text }} />
          </button>
          <div>
            <h1 style={{ margin: 0, fontSize: "20px", fontWeight: 700 }}>
              Toque de Chamada
            </h1>
            <p
              style={{
                margin: "4px 0 0",
                fontSize: "13px",
                opacity: 0.8,
              }}
            >
              Escolha o som para chamadas do interfone
            </p>
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: "16px", maxWidth: "480px", margin: "0 auto" }}>
        {/* Info card */}
        <div
          style={{
            background: "#e0ecff",
            borderRadius: "12px",
            padding: "14px 16px",
            marginBottom: "16px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            border: "1px solid #b3d1ff",
          }}
        >
          <Volume2
            className="w-5 h-5"
            style={{ color: "#003580", flexShrink: 0 }}
          />
          <p style={{ margin: 0, fontSize: "13px", color: "#003580", lineHeight: 1.5 }}>
            Toque em <strong>▶</strong> para ouvir uma prévia de 3 segundos.
            O toque selecionado será usado nas chamadas do interfone.
          </p>
        </div>

        {/* Ringtone list */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          {RINGTONES.map((tone) => {
            const isSelected = selected === tone.id;
            const isPlaying = playing === tone.id;

            return (
              <div
                key={tone.id}
                onClick={() => handleSelect(tone.id)}
                style={{
                  background: "#fff",
                  borderRadius: "14px",
                  padding: "16px",
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                  cursor: "pointer",
                  border: isSelected
                    ? "2px solid #003580"
                    : "1px solid #e2e8f0",
                  boxShadow: isSelected
                    ? "0 0 0 3px rgba(0,53,128,0.12)"
                    : "0 1px 3px rgba(0,0,0,0.04)",
                  transition: "all 0.2s",
                }}
              >
                {/* Checkmark */}
                <div
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: isSelected ? "#003580" : "#f1f5f9",
                    border: isSelected ? "none" : "2px solid #cbd5e1",
                    flexShrink: 0,
                    transition: "all 0.2s",
                  }}
                >
                  {isSelected && (
                    <Check
                      className="w-4 h-4"
                      style={{ color: "#ffffff" }}
                    />
                  )}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: "15px",
                      fontWeight: 600,
                      color: isSelected ? "#003580" : "#1e293b",
                    }}
                  >
                    {tone.name}
                  </div>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#64748b",
                      marginTop: "2px",
                    }}
                  >
                    {tone.description}
                  </div>
                </div>

                {/* Play/Stop button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePreview(tone.id);
                  }}
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "50%",
                    border: "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    flexShrink: 0,
                    background: isPlaying
                      ? "linear-gradient(135deg, #dc2626, #b91c1c)"
                      : "linear-gradient(135deg, #0062d1 0%, #003d99 50%, #001d4a 100%)",
                    boxShadow: isPlaying
                      ? "0 2px 8px rgba(220,38,38,0.35)"
                      : "0 2px 8px rgba(0,53,128,0.35)",
                    transition: "all 0.2s",
                  }}
                >
                  {isPlaying ? (
                    <Square
                      className="w-4 h-4"
                      style={{ color: "#ffffff" }}
                    />
                  ) : (
                    <Play
                      className="w-4 h-4"
                      style={{ color: "#ffffff", marginLeft: "2px" }}
                    />
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Saved confirmation */}
        <div
          style={{
            marginTop: "20px",
            textAlign: "center",
            fontSize: "13px",
            color: "#64748b",
          }}
        >
          ✓ Suas alterações são salvas automaticamente
        </div>
      </div>
    </div>
  );
}
