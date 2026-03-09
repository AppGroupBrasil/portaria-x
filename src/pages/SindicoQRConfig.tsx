import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Settings,
  QrCode,
  Camera,
  FileText,
  Users,
  MessageSquare,
  CheckCircle2,
  ToggleLeft,
  ToggleRight,
  Save,
  Info,
} from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

/* ═══════════════════════════════════════════════
   SÍNDICO — Configuração QR Code Visitante
   ═══════════════════════════════════════════════ */

const CONFIG_KEY = "sindico_qr_config";

interface QRConfig {
  fotoObrigatoria: boolean;
  documentoObrigatorio: boolean;
  parentescoObrigatorio: boolean;
  observacoesObrigatorio: boolean;
}

const defaultConfig: QRConfig = {
  fotoObrigatoria: false,
  documentoObrigatorio: true,
  parentescoObrigatorio: false,
  observacoesObrigatorio: false,
};

function loadConfig(): QRConfig {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (raw) return { ...defaultConfig, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return defaultConfig;
}

export default function SindicoQRConfig() {
  const { isDark, p } = useTheme();
  const navigate = useNavigate();
  const [config, setConfig] = useState<QRConfig>(loadConfig());
  const [saved, setSaved] = useState(false);

  const toggle = (key: keyof QRConfig) => {
    setConfig((prev) => ({ ...prev, [key]: !prev[key] }));
    setSaved(false);
  };

  const handleSave = () => {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const fields: { key: keyof QRConfig; label: string; description: string; icon: typeof Camera; color: string }[] = [
    {
      key: "fotoObrigatoria",
      label: "Foto do Visitante",
      description: "Exigir que o morador tire uma foto do visitante ao gerar o QR Code",
      icon: Camera,
      color: "#f97316",
    },
    {
      key: "documentoObrigatorio",
      label: "Documento (RG/CPF)",
      description: "Exigir preenchimento do número de documento do visitante",
      icon: FileText,
      color: "#8b5cf6",
    },
    {
      key: "parentescoObrigatorio",
      label: "Parentesco / Relação",
      description: "Exigir que o morador informe o tipo de relação com o visitante",
      icon: Users,
      color: "#0ea5e9",
    },
    {
      key: "observacoesObrigatorio",
      label: "Observações",
      description: "Exigir que o morador preencha o campo de observações",
      icon: MessageSquare,
      color: "#ec4899",
    },
  ];

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: p.pageBg }}>
      {/* Header */}
      <header className="safe-area-top" style={{ background: p.headerBg, padding: "18px 24px", borderBottom: p.headerBorder, boxShadow: p.headerShadow }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} style={{ width: 40, height: 40, borderRadius: 12, background: p.btnBg, border: p.btnBorder, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: p.text }}>
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div style={{ flex: 1 }}>
            <h1 className="text-white flex items-center gap-2" style={{ fontWeight: 700, fontSize: 18 }}>
              <Settings className="w-5 h-5" /> Config. QR Visitante
            </h1>
            <p style={{ fontSize: 12, color: p.textSecondary }}>Defina os campos obrigatórios</p>
          </div>
          <div
            style={{
              background: isDark ? "rgba(255,255,255,0.15)" : "#f0f4f8",
              border: isDark ? "2px solid rgba(255,255,255,0.3)" : "2px solid #cbd5e1",
              borderRadius: "12px",
              padding: "8px 12px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <QrCode className="w-4 h-4 text-white" />
            <span style={{ color: p.text, fontWeight: 700, fontSize: "12px" }}>QR Code</span>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto" style={{ padding: "1.5rem", paddingBottom: "120px", display: "flex", flexDirection: "column", gap: "1.2rem" }}>
        {/* Info Banner */}
        <div
          style={{
            background: "transparent",
            borderRadius: "16px",
            padding: "16px",
            border: "none",
            marginBottom: "0",
            display: "flex",
            gap: "12px",
            alignItems: "flex-start",
          }}
        >
          <Info className="w-5 h-5" style={{ color: p.textSecondary, flexShrink: 0, marginTop: "2px" }} />
          <div>
            <p style={{ fontWeight: 700, fontSize: "14px", color: p.text }}>
              Campos Obrigatórios do QR Code
            </p>
            <p style={{ fontSize: "13px", color: p.textSecondary, marginTop: "4px", lineHeight: 1.5 }}>
              Configure quais informações o morador deverá preencher obrigatoriamente ao gerar um QR Code de autorização para visitantes.
              O campo <strong>Nome do Visitante</strong> é sempre obrigatório e não pode ser desabilitado.
            </p>
          </div>
        </div>

        {/* Always-required field */}
        <div
          style={{
            background: "transparent",
            borderRadius: "16px",
            padding: "16px 20px",
            border: "none",
            marginBottom: "0",
            display: "flex",
            alignItems: "center",
            gap: "14px",
          }}
        >
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "12px",
              background: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Users className="w-5 h-5" style={{ color: "#16a34a" }} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 700, fontSize: "15px", color: "#4ade80" }}>Nome do Visitante</p>
            <p style={{ fontSize: "12px", color: p.textSecondary }}>Campo obrigatório (não pode ser desativado)</p>
          </div>
          <CheckCircle2 className="w-6 h-6" style={{ color: "#22c55e", flexShrink: 0 }} />
        </div>

        {/* Configurable fields */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
          {fields.map((field) => {
            const Icon = field.icon;
            const enabled = config[field.key];
            return (
              <button
                key={field.key}
                onClick={() => toggle(field.key)}
                style={{
                  background: "transparent",
                  borderRadius: "16px",
                  padding: "16px 20px",
                  border: "none",
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.2s",
                  width: "100%",
                }}
              >
                <div
                  style={{
                    width: "44px",
                    height: "44px",
                    borderRadius: "12px",
                    background: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    transition: "all 0.2s",
                  }}
                >
                  <Icon className="w-5 h-5" style={{ color: enabled ? field.color : "#9ca3af" }} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 700, fontSize: "15px", color: enabled ? p.text : p.textMuted }}>
                    {field.label}
                    {enabled && (
                      <span
                        style={{
                          marginLeft: "8px",
                          fontSize: "11px",
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: "999px",
                          background: p.isDarkBase ? "rgba(129,140,248,0.2)" : "#eef2ff",
                          color: "#a5b4fc",
                        }}
                      >
                        OBRIGATÓRIO
                      </span>
                    )}
                  </p>
                  <p style={{ fontSize: "12px", color: p.textSecondary, marginTop: "2px", lineHeight: 1.4 }}>
                    {field.description}
                  </p>
                </div>
                {enabled ? (
                  <ToggleRight className="w-8 h-8" style={{ color: "#818cf8", flexShrink: 0 }} />
                ) : (
                  <ToggleLeft className="w-8 h-8" style={{ color: p.textMuted, flexShrink: 0 }} />
                )}
              </button>
            );
          })}
        </div>

        {/* Summary */}
        <div
          style={{
            background: "transparent",
            borderRadius: "16px",
            padding: "16px 20px",
            border: "none",
            marginTop: "0",
          }}
        >
          <p style={{ fontWeight: 700, fontSize: "13px", color: p.textSecondary, textTransform: "uppercase", marginBottom: "8px" }}>
            Resumo da Configuração
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            <span style={{ fontSize: "12px", fontWeight: 700, padding: "4px 10px", borderRadius: "999px", background: p.isDarkBase ? "rgba(34,197,94,0.2)" : "#dcfce7", color: "#4ade80" }}>
              ✓ Nome
            </span>
            {config.fotoObrigatoria && (
              <span style={{ fontSize: "12px", fontWeight: 700, padding: "4px 10px", borderRadius: "999px", background: p.isDarkBase ? "rgba(129,140,248,0.2)" : "#eef2ff", color: "#a5b4fc" }}>
                ✓ Foto
              </span>
            )}
            {config.documentoObrigatorio && (
              <span style={{ fontSize: "12px", fontWeight: 700, padding: "4px 10px", borderRadius: "999px", background: p.isDarkBase ? "rgba(129,140,248,0.2)" : "#eef2ff", color: "#a5b4fc" }}>
                ✓ Documento
              </span>
            )}
            {config.parentescoObrigatorio && (
              <span style={{ fontSize: "12px", fontWeight: 700, padding: "4px 10px", borderRadius: "999px", background: p.isDarkBase ? "rgba(129,140,248,0.2)" : "#eef2ff", color: "#a5b4fc" }}>
                ✓ Parentesco
              </span>
            )}
            {config.observacoesObrigatorio && (
              <span style={{ fontSize: "12px", fontWeight: 700, padding: "4px 10px", borderRadius: "999px", background: p.isDarkBase ? "rgba(129,140,248,0.2)" : "#eef2ff", color: "#a5b4fc" }}>
                ✓ Observações
              </span>
            )}
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          style={{
            width: "100%",
            padding: "16px",
            borderRadius: "14px",
            border: "2px solid #ffffff",
            background: saved
              ? "linear-gradient(135deg, #16a34a, #15803d)"
              : p.btnGrad,
            color: p.text,
            fontWeight: 700,
            fontSize: "16px",
            cursor: "pointer",
            marginTop: "2.4rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            transition: "all 0.3s",
          }}
        >
          {saved ? (
            <><CheckCircle2 className="w-5 h-5" /> Configuração Salva!</>
          ) : (
            <><Save className="w-5 h-5" /> Salvar Configuração</>
          )}
        </button>
      </main>
    </div>
  );
}
