import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  ArrowLeft,
  ShieldCheck,
  Truck,
  Car,
  QrCode,
  Mail,
  Check,
  Loader2,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

// ─── Feature definitions ─────────────────────────────────
interface FeatureDef {
  key: string;
  label: string;
  description: string;
  icon: LucideIcon;
  gradient: string;
}

const FEATURES: FeatureDef[] = [
  {
    key: "feature_autorizacoes",
    label: "Autorizar Visitante",
    description: "Morador pode criar autorizações prévias de entrada para visitantes",
    icon: ShieldCheck,
    gradient: "#003580",
  },
  {
    key: "feature_delivery",
    label: "Entregas e Delivery",
    description: "Morador pode autorizar recebimento de pedidos na portaria",
    icon: Truck,
    gradient: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
  },
  {
    key: "feature_veiculos",
    label: "Autorizar Veículo",
    description: "Morador pode autorizar acesso de veículos ao condomínio",
    icon: Car,
    gradient: "#003580",
  },
  {
    key: "feature_qr_visitante",
    label: "QR Code de Visitante",
    description: "Morador pode gerar QR Code de autorização para visitantes",
    icon: QrCode,
    gradient: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
  },
  {
    key: "feature_correspondencias",
    label: "Correspondências",
    description: "Morador pode visualizar avisos de correspondência na portaria",
    icon: Mail,
    gradient: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
  },
];

export default function SindicoFeaturesConfig() {
  const { user } = useAuth();
  const { isDark, p } = useTheme();
  const navigate = useNavigate();

  const [config, setConfig] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Fetch current config
  useEffect(() => {
    apiFetch("/api/condominio-config")
      .then((res) => res.ok ? res.json() : {})
      .then((data) => {
        setConfig(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const isFeatureEnabled = (key: string): boolean => {
    // Default: all features are enabled if not configured
    return config[key] !== "false";
  };

  const toggleFeature = async (key: string) => {
    const newValue = isFeatureEnabled(key) ? "false" : "true";
    const newConfig = { ...config, [key]: newValue };
    setConfig(newConfig);

    setSaving(true);
    setSaved(false);
    try {
      const res = await apiFetch("/api/condominio-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: newValue }),
      });
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch {}
    setSaving(false);
  };

  const enabledCount = FEATURES.filter((f) => isFeatureEnabled(f.key)).length;

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center" style={{ backgroundColor: "#ffffff" }}>
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: p.pageBg }}>
      {/* ═════════ Header ═════════ */}
      <header className="sticky top-0 z-40" style={{ background: p.headerBg, borderBottom: p.headerBorder, boxShadow: p.headerShadow, color: p.text }}>
        <div className="flex items-center justify-between" style={{ padding: "1rem 1.5rem", height: "4.5rem" }}>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              style={{ width: 40, height: 40, borderRadius: 12, background: p.btnBg, border: p.btnBorder, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: p.text }}
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <span style={{ fontWeight: 700, fontSize: 18 }} className="block">Funções do Morador</span>
              <span style={{ fontSize: 12, color: isDark ? "rgba(255,255,255,0.6)" : "#64748b" }}>Configure os recursos disponíveis</span>
            </div>
          </div>
          {saving ? (
            <Loader2 className="w-5 h-5 animate-spin text-white/60" />
          ) : saved ? (
            <div className="flex items-center gap-1 text-emerald-300 text-sm font-medium">
              <Check className="w-4 h-4" /> Salvo
            </div>
          ) : null}
        </div>
      </header>

      <main style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.2rem", paddingBottom: "8rem" }}>
        {/* Info card */}
        <div
          style={{
            background: "transparent",
            borderRadius: "16px",
            padding: "16px 18px",
            display: "flex",
            alignItems: "flex-start",
            gap: "12px",
            border: "none",
          }}
        >
          <Settings className="w-5 h-5 shrink-0" style={{ color: "#6366f1", marginTop: "2px" }} />
          <div>
            <p style={{ fontSize: "13px", fontWeight: 600, color: isDark ? "#a5b4fc" : "#4f46e5", marginBottom: "4px" }}>
              Configuração de Funções
            </p>
            <p style={{ fontSize: "12px", color: "#dc2626", lineHeight: 1.5 }}>
              Habilite ou desabilite as funções que aparecem para os moradores do seu condomínio.
              Funções desabilitadas ficam invisíveis no painel do morador.
            </p>
          </div>
        </div>

        {/* Summary */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 4px" }}>
          <span style={{ fontSize: "13px", fontWeight: 600, color: p.textHeading }}>
            Funções Disponíveis
          </span>
          <span style={{ fontSize: "12px", color: p.textSecondary }}>
            {enabledCount} de {FEATURES.length} ativas
          </span>
        </div>

        {/* Feature toggles */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
          {FEATURES.map((feature) => {
            const enabled = isFeatureEnabled(feature.key);
            const Icon = feature.icon;
            return (
              <div
                key={feature.key}
                onClick={() => toggleFeature(feature.key)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                  padding: "16px 18px",
                  borderRadius: "16px",
                  cursor: "pointer",
                  background: "transparent",
                  border: "none",
                  opacity: enabled ? 1 : 0.6,
                  transition: "all 0.2s ease",
                  boxShadow: "none",
                }}
              >
                {/* Icon */}
                <div
                  style={{
                    width: "44px",
                    height: "44px",
                    borderRadius: "12px",
                    background: enabled ? feature.gradient : isDark ? "rgba(255,255,255,0.06)" : "#e2e8f0",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    transition: "all 0.2s ease",
                  }}
                >
                  <Icon className="w-5 h-5" style={{ color: enabled ? "#fff" : p.textMuted }} />
                </div>

                {/* Text */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      fontSize: "14px",
                      fontWeight: 600,
                      color: p.textHeading,
                      marginBottom: "2px",
                    }}
                  >
                    {feature.label}
                  </p>
                  <p
                    style={{
                      fontSize: "11px",
                      color: p.textSecondary,
                      lineHeight: 1.4,
                    }}
                  >
                    {feature.description}
                  </p>
                </div>

                {/* Toggle */}
                <div
                  style={{
                    width: "48px",
                    height: "28px",
                    borderRadius: "14px",
                    background: enabled
                      ? "#003580"
                      : isDark ? "rgba(255,255,255,0.1)" : "#cbd5e1",
                    padding: "3px",
                    transition: "all 0.2s ease",
                    flexShrink: 0,
                  }}
                >
                  <div
                    style={{
                      width: "22px",
                      height: "22px",
                      borderRadius: "50%",
                      background: "#fff",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                      transition: "all 0.2s ease",
                      transform: enabled ? "translateX(20px)" : "translateX(0)",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
