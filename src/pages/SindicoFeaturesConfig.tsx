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
  Phone,
  Navigation,
  DoorOpen,
  UserPlus,
  Camera,
  MapPin,
  BookOpen,
  LayoutDashboard,
  Scan,
  Package,
  Layers,
  Users2,
  Wrench,
  Zap,
  Cpu,
  type LucideIcon,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { isFeatureEnabled as getFeatureEnabled } from "@/lib/featureFlags";

// ─── Feature definitions per profile ─────────────────────
interface FeatureDef {
  key: string;
  label: string;
  description: string;
  icon: LucideIcon;
  gradient: string;
}

const MORADOR_FEATURES: FeatureDef[] = [
  { key: "feature_autorizacoes", label: "Autorizar Visitante", description: "Criar autorizações prévias de entrada para visitantes", icon: ShieldCheck, gradient: "#003580" },
  { key: "feature_delivery", label: "Entregas e Delivery", description: "Autorizar recebimento de pedidos na portaria", icon: Truck, gradient: "#003580" },
  { key: "feature_veiculos", label: "Autorizar Veículo", description: "Autorizar acesso de veículos ao condomínio", icon: Car, gradient: "#003580" },
  { key: "feature_qr_visitante", label: "QR Code Visitante", description: "Gerar QR Code de autorização para visitantes", icon: QrCode, gradient: "#003580" },
  { key: "feature_correspondencias", label: "Correspondências", description: "Visualizar avisos de correspondência na portaria", icon: Mail, gradient: "#003580" },
  { key: "feature_estou_chegando", label: "Estou Chegando", description: "Avisar a portaria que está chegando", icon: Navigation, gradient: "#003580" },
  { key: "feature_portaria_virtual", label: "Portaria Virtual", description: "Abrir portões e portas remotamente", icon: DoorOpen, gradient: "#003580" },
];

const PORTEIRO_FEATURES: FeatureDef[] = [
  { key: "feature_porteiro_pedestres", label: "Controle de Pedestres", description: "Visitantes e autorizações prévias", icon: UserPlus, gradient: "#d97706" },
  { key: "feature_porteiro_veiculos", label: "Acesso Veículos", description: "Controlar entrada e saída de veículos", icon: Car, gradient: "#d97706" },
  { key: "feature_porteiro_delivery", label: "Delivery Porteiro", description: "Gerenciar entregas recebidas", icon: Package, gradient: "#d97706" },
  { key: "feature_porteiro_correspondencias", label: "Correspondências", description: "Registrar correspondências recebidas", icon: Mail, gradient: "#d97706" },
  { key: "feature_porteiro_monitoramento", label: "Monitoramento", description: "Visualizar câmeras do condomínio", icon: Camera, gradient: "#d97706" },
  { key: "feature_porteiro_rondas", label: "Rondas de Segurança", description: "Registrar rondas e escanear QR Codes", icon: MapPin, gradient: "#d97706" },
  { key: "feature_porteiro_estou_chegando", label: "Estou Chegando", description: "Ver moradores a caminho", icon: Navigation, gradient: "#d97706" },
  { key: "feature_porteiro_portaria_virtual", label: "Portaria Virtual", description: "Controle remoto de portões", icon: DoorOpen, gradient: "#d97706" },
  { key: "feature_porteiro_centro_comando", label: "Centro de Comando", description: "Painel unificado da portaria", icon: LayoutDashboard, gradient: "#d97706" },
  { key: "feature_porteiro_qr_scanner", label: "Scanner QR", description: "Escanear QR de visitantes", icon: Scan, gradient: "#d97706" },
  { key: "feature_porteiro_livro_protocolo", label: "Livro Protocolo", description: "Livro de ocorrências da portaria", icon: BookOpen, gradient: "#d97706" },
  { key: "feature_porteiro_espelho", label: "Espelho Portaria", description: "Visão geral do espelho da portaria", icon: ShieldCheck, gradient: "#d97706" },
  { key: "feature_porteiro_acesso_auto", label: "Acesso Automático", description: "Liberação automática de veículos", icon: Scan, gradient: "#d97706" },
];

const SINDICO_FEATURES: FeatureDef[] = [
  { key: "feature_sindico_cadastros", label: "Cadastros", description: "Gerenciar moradores e funcionários", icon: UserPlus, gradient: "#16a34a" },
  { key: "feature_sindico_blocos", label: "Blocos", description: "Cadastrar e gerenciar blocos", icon: Layers, gradient: "#16a34a" },
  { key: "feature_sindico_moradores", label: "Moradores", description: "Cadastrar e gerenciar moradores", icon: Users2, gradient: "#16a34a" },
  { key: "feature_sindico_funcionarios", label: "Funcionários", description: "Cadastrar e gerenciar funcionários", icon: Wrench, gradient: "#16a34a" },
  { key: "feature_sindico_cameras", label: "Câmeras", description: "Configurar câmeras do condomínio", icon: Camera, gradient: "#16a34a" },
  { key: "feature_sindico_rondas", label: "Rondas", description: "Controlar rondas de segurança", icon: MapPin, gradient: "#16a34a" },
  { key: "feature_sindico_estou_chegando", label: "Estou Chegando Config", description: "Configurar notificações de chegada", icon: Navigation, gradient: "#16a34a" },
  { key: "feature_sindico_acessos", label: "Acessos", description: "Gerenciar pontos de acesso", icon: DoorOpen, gradient: "#16a34a" },
  { key: "feature_sindico_portao", label: "Portão IoT", description: "Configurar portões e dispositivos IoT", icon: Zap, gradient: "#16a34a" },
  { key: "feature_sindico_qr_config", label: "Config QR", description: "Configurar QR Code para visitantes", icon: QrCode, gradient: "#16a34a" },
  { key: "feature_sindico_dispositivos", label: "Dispositivos", description: "Biblioteca de dispositivos IoT", icon: Cpu, gradient: "#16a34a" },
  { key: "feature_sindico_liberacao", label: "Liberação Cadastros", description: "Aprovar cadastros pendentes", icon: ShieldCheck, gradient: "#16a34a" },
  { key: "feature_sindico_whatsapp", label: "WhatsApp Config", description: "Configurar integração WhatsApp", icon: Phone, gradient: "#16a34a" },
];

type TabId = "morador" | "porteiro" | "sindico";

const TABS: { id: TabId; label: string; color: string; features: FeatureDef[] }[] = [
  { id: "morador", label: "Morador", color: "#003580", features: MORADOR_FEATURES },
  { id: "porteiro", label: "Portaria", color: "#d97706", features: PORTEIRO_FEATURES },
  { id: "sindico", label: "Síndico", color: "#16a34a", features: SINDICO_FEATURES },
];

export default function SindicoFeaturesConfig() {
  useAuth();
  const { isDark, p } = useTheme();
  const navigate = useNavigate();

  const [tab, setTab] = useState<TabId>("morador");
  const [config, setConfig] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    apiFetch("/api/condominio-config")
      .then((res) => res.ok ? res.json() : {})
      .then((data) => { setConfig(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const isFeatureEnabled = (key: string): boolean => getFeatureEnabled(config, key, true);

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
    } catch (err) { console.warn("Toggle feature failed:", err); }
    setSaving(false);
  };

  const toggleAll = async (features: FeatureDef[], enable: boolean) => {
    const updates: Record<string, string> = {};
    features.forEach((f) => { updates[f.key] = enable ? "true" : "false"; });
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    setSaving(true);
    setSaved(false);
    try {
      const res = await apiFetch("/api/condominio-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch (err) { console.warn("Toggle all failed:", err); }
    setSaving(false);
  };

  const currentTab = TABS.find((t) => t.id === tab)!;
  const enabledCount = currentTab.features.filter((f) => isFeatureEnabled(f.key)).length;

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center" style={{ backgroundColor: "#ffffff" }}>
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: p.pageBg }}>
      {/* Header */}
      <header className="sticky top-0 z-40" style={{ background: p.headerBg, borderBottom: p.headerBorder, boxShadow: p.headerShadow, color: p.text, paddingTop: "max(0, env(safe-area-inset-top))" }}>
        <div className="flex items-center justify-between" style={{ padding: "1rem 1.5rem", height: "4.5rem" }}>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} style={{ width: 40, height: 40, borderRadius: 12, background: p.btnBg, border: p.btnBorder, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: p.text }}>
              <ArrowLeft className="w-7 h-7" />
            </button>
            <div>
              <span style={{ fontWeight: 700, fontSize: 18 }} className="block">Config. Funcionalidades</span>
              <span style={{ fontSize: 12, color: isDark ? "rgba(255,255,255,0.6)" : "#64748b" }}>Ativar/desativar por perfil</span>
            </div>
          </div>
          {saving && <Loader2 className="w-6 h-6 animate-spin text-white/60" />}
          {!saving && saved && (
            <div className="flex items-center gap-1 text-emerald-300 text-sm font-medium">
              <Check className="w-5 h-5" /> Salvo
            </div>
          )}
        </div>
      </header>

      {/* Tab switcher */}
      <div style={{ display: "flex", borderBottom: "1px solid #e5e7eb" }}>
        {TABS.map((t) => {
          const count = t.features.filter((f) => isFeatureEnabled(f.key)).length;
          const isActive = tab === t.id;
          let tabBg: string;
          let tabColor: string;
          let badgeBg: string;
          if (isActive) {
            tabBg = isDark ? "rgba(255,255,255,0.05)" : "#f0f9ff";
            tabColor = t.color;
            badgeBg = `${t.color}20`;
          } else {
            tabBg = isDark ? "transparent" : "#fff";
            tabColor = isDark ? "#94a3b8" : "#6b7280";
            badgeBg = isDark ? "rgba(255,255,255,0.06)" : "#f1f5f9";
          }
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                flex: 1,
                padding: "12px 8px",
                fontSize: "14px",
                fontWeight: 700,
                border: "none",
                background: tabBg,
                color: tabColor,
                borderBottom: isActive ? `3px solid ${t.color}` : "3px solid transparent",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
              }}
            >
              {t.label}
              <span style={{
                fontSize: "12px",
                fontWeight: 700,
                padding: "1px 6px",
                borderRadius: "6px",
                background: badgeBg,
                color: isActive ? t.color : "#94a3b8",
              }}>
                {count}/{t.features.length}
              </span>
            </button>
          );
        })}
      </div>

      <main style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem", paddingBottom: "8rem" }}>
        {/* Info + bulk actions */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <Settings className="w-5 h-5" style={{ color: currentTab.color }} />
            <span style={{ fontSize: "14px", fontWeight: 600, color: p.textHeading }}>
              {enabledCount} de {currentTab.features.length} ativas
            </span>
          </div>
          <div style={{ display: "flex", gap: "6px" }}>
            <button
              onClick={() => toggleAll(currentTab.features, true)}
              style={{
                fontSize: "12px", fontWeight: 700, padding: "6px 12px", borderRadius: "8px",
                border: "none", background: `${currentTab.color}15`, color: currentTab.color, cursor: "pointer",
              }}
            >
              Ativar Todas
            </button>
            <button
              onClick={() => toggleAll(currentTab.features, false)}
              style={{
                fontSize: "12px", fontWeight: 700, padding: "6px 12px", borderRadius: "8px",
                border: "1px solid #e5e7eb", background: isDark ? "rgba(255,255,255,0.04)" : "#fff", color: "#dc2626", cursor: "pointer",
              }}
            >
              Desativar Todas
            </button>
          </div>
        </div>

        {/* Feature toggles */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {currentTab.features.map((feature) => {
            const enabled = isFeatureEnabled(feature.key);
            const Icon = feature.icon;
            let iconBoxBg: string;
            let iconColor: string;
            let toggleBg: string;
            if (enabled) {
              iconBoxBg = currentTab.color;
              iconColor = "#fff";
              toggleBg = currentTab.color;
            } else {
              iconBoxBg = isDark ? "rgba(255,255,255,0.06)" : "#e2e8f0";
              iconColor = isDark ? "#64748b" : "#94a3b8";
              toggleBg = isDark ? "rgba(255,255,255,0.1)" : "#cbd5e1";
            }
            return (
              <button
                key={feature.key}
                type="button"
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
                  opacity: enabled ? 1 : 0.5,
                  transition: "all 0.2s ease",
                  width: "100%",
                  textAlign: "left" as const,
                }}
              >
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: iconBoxBg,
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  transition: "all 0.2s ease",
                }}>
                  <Icon className="w-6 h-6" style={{ color: iconColor }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: p.textHeading, marginBottom: 2 }}>{feature.label}</p>
                  <p style={{ fontSize: 11, color: p.textSecondary, lineHeight: 1.4 }}>{feature.description}</p>
                </div>
                <div style={{
                  width: 48, height: 28, borderRadius: 14, padding: 3, flexShrink: 0,
                  background: toggleBg,
                  transition: "all 0.2s ease",
                }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: "50%", background: "var(--color-card, #fff)",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.2)", transition: "all 0.2s ease",
                    transform: enabled ? "translateX(20px)" : "translateX(0)",
                  }} />
                </div>
              </button>
            );
          })}
        </div>
      </main>
    </div>
  );
}
