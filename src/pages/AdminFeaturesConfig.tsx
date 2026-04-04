import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useState, useEffect } from "react";
import TutorialButton, { TSection, TStep, TBullet } from "@/components/TutorialButton";
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
  Building2,
  ChevronDown,
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
  Star,
  Sparkles,
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
  isDefault: boolean; // true = included by default for all condos
}

// ── Morador ──────────────────────────────────────────────
const MORADOR_FEATURES: FeatureDef[] = [
  // Padrão
  { key: "feature_autorizacoes", label: "Autorizar Visitante", description: "Criar autorizações prévias de entrada para visitantes", icon: ShieldCheck, gradient: "#003580", isDefault: true },
  { key: "feature_delivery", label: "Entregas e Delivery", description: "Autorizar recebimento de pedidos na portaria", icon: Truck, gradient: "#003580", isDefault: true },
  { key: "feature_veiculos", label: "Autorizar Veículo", description: "Autorizar acesso de veículos ao condomínio", icon: Car, gradient: "#003580", isDefault: true },
  { key: "feature_qr_visitante", label: "QR Code Visitante", description: "Gerar QR Code de autorização para visitantes", icon: QrCode, gradient: "#003580", isDefault: true },
  { key: "feature_correspondencias", label: "Correspondências", description: "Visualizar avisos de correspondência na portaria", icon: Mail, gradient: "#003580", isDefault: true },
  { key: "feature_estou_chegando", label: "Estou Chegando", description: "Avisar a portaria que está chegando", icon: Navigation, gradient: "#003580", isDefault: true },
  // Extras
  { key: "feature_portaria_virtual", label: "Portaria Virtual", description: "Abrir portões e portas remotamente", icon: DoorOpen, gradient: "#003580", isDefault: false },
  { key: "feature_auto_cadastro", label: "Auto Cadastro", description: "Visitantes se cadastram sozinhos via link", icon: UserPlus, gradient: "#003580", isDefault: false },
];

// ── Porteiro ─────────────────────────────────────────────
const PORTEIRO_FEATURES: FeatureDef[] = [
  // Padrão
  { key: "feature_porteiro_pedestres", label: "Controle de Pedestres", description: "Visitantes e autorizações prévias", icon: UserPlus, gradient: "#d97706", isDefault: true },
  { key: "feature_porteiro_veiculos", label: "Acesso Veículos", description: "Controlar entrada e saída de veículos", icon: Car, gradient: "#d97706", isDefault: true },
  { key: "feature_porteiro_delivery", label: "Delivery Porteiro", description: "Gerenciar entregas recebidas", icon: Package, gradient: "#d97706", isDefault: true },
  { key: "feature_porteiro_correspondencias", label: "Correspondências", description: "Registrar correspondências recebidas", icon: Mail, gradient: "#d97706", isDefault: true },
  { key: "feature_porteiro_rondas", label: "Rondas de Segurança", description: "Registrar rondas e escanear QR Codes", icon: MapPin, gradient: "#d97706", isDefault: true },
  { key: "feature_porteiro_estou_chegando", label: "Estou Chegando", description: "Ver moradores a caminho", icon: Navigation, gradient: "#d97706", isDefault: true },
  { key: "feature_porteiro_centro_comando", label: "Centro de Comando", description: "Painel unificado da portaria", icon: LayoutDashboard, gradient: "#d97706", isDefault: true },
  { key: "feature_porteiro_qr_scanner", label: "Scanner QR", description: "Escanear QR de visitantes", icon: Scan, gradient: "#d97706", isDefault: true },
  { key: "feature_porteiro_livro_protocolo", label: "Livro Protocolo", description: "Livro de ocorrências da portaria", icon: BookOpen, gradient: "#d97706", isDefault: true },
  { key: "feature_porteiro_espelho", label: "Espelho Portaria", description: "Visão geral do espelho da portaria", icon: ShieldCheck, gradient: "#d97706", isDefault: true },
  // Extras
  { key: "feature_porteiro_monitoramento", label: "Monitoramento", description: "Visualizar câmeras do condomínio", icon: Camera, gradient: "#d97706", isDefault: false },
  { key: "feature_porteiro_portaria_virtual", label: "Portaria Virtual", description: "Controle remoto de portões", icon: DoorOpen, gradient: "#d97706", isDefault: false },
  { key: "feature_porteiro_acesso_auto", label: "Acesso Automático", description: "Liberação automática de veículos", icon: Scan, gradient: "#d97706", isDefault: false },
];

// ── Síndico ──────────────────────────────────────────────
const SINDICO_FEATURES: FeatureDef[] = [
  // Padrão
  { key: "feature_sindico_cadastros", label: "Cadastros", description: "Gerenciar moradores e funcionários", icon: UserPlus, gradient: "#16a34a", isDefault: true },
  { key: "feature_sindico_blocos", label: "Blocos", description: "Cadastrar e gerenciar blocos", icon: Layers, gradient: "#16a34a", isDefault: true },
  { key: "feature_sindico_moradores", label: "Moradores", description: "Cadastrar e gerenciar moradores", icon: Users2, gradient: "#16a34a", isDefault: true },
  { key: "feature_sindico_funcionarios", label: "Funcionários", description: "Cadastrar e gerenciar funcionários", icon: Wrench, gradient: "#16a34a", isDefault: true },
  { key: "feature_sindico_rondas", label: "Rondas", description: "Controlar rondas de segurança", icon: MapPin, gradient: "#16a34a", isDefault: true },
  { key: "feature_sindico_estou_chegando", label: "Estou Chegando Config", description: "Configurar notificações de chegada", icon: Navigation, gradient: "#16a34a", isDefault: true },
  { key: "feature_sindico_qr_config", label: "Config QR", description: "Configurar QR Code para visitantes", icon: QrCode, gradient: "#16a34a", isDefault: true },
  { key: "feature_sindico_liberacao", label: "Liberação Cadastros", description: "Aprovar cadastros pendentes", icon: ShieldCheck, gradient: "#16a34a", isDefault: true },
  // Extras
  { key: "feature_sindico_cameras", label: "Câmeras", description: "Configurar câmeras do condomínio", icon: Camera, gradient: "#16a34a", isDefault: false },
  { key: "feature_sindico_acessos", label: "Acessos", description: "Gerenciar pontos de acesso", icon: DoorOpen, gradient: "#16a34a", isDefault: false },
  { key: "feature_sindico_portao", label: "Portão IoT", description: "Configurar portões e dispositivos IoT", icon: Zap, gradient: "#16a34a", isDefault: false },
  { key: "feature_sindico_dispositivos", label: "Dispositivos", description: "Biblioteca de dispositivos IoT", icon: Cpu, gradient: "#16a34a", isDefault: false },
  { key: "feature_sindico_whatsapp", label: "WhatsApp Config", description: "Configurar integração WhatsApp", icon: Phone, gradient: "#16a34a", isDefault: false },
];

type TabId = "morador" | "porteiro" | "sindico";

const TABS: { id: TabId; label: string; color: string; features: FeatureDef[] }[] = [
  { id: "morador", label: "Morador", color: "#003580", features: MORADOR_FEATURES },
  { id: "porteiro", label: "Portaria", color: "#d97706", features: PORTEIRO_FEATURES },
  { id: "sindico", label: "Síndico", color: "#16a34a", features: SINDICO_FEATURES },
];

interface Condominio {
  id: number;
  name: string;
}

function renderFeatureToggle(
  feature: FeatureDef,
  tabColor: string,
  isDark: boolean,
  p: any,
  isFeatureEnabled: (key: string) => boolean,
  toggleFeature: (key: string) => void
) {
  const enabled = isFeatureEnabled(feature.key);
  const Icon = feature.icon;
  let iconBg: string;
  let iconColor: string;
  let toggleBg: string;
  if (enabled) { iconBg = tabColor; iconColor = "#fff"; toggleBg = tabColor; }
  else if (isDark) { iconBg = "rgba(255,255,255,0.06)"; iconColor = "#64748b"; toggleBg = "rgba(255,255,255,0.1)"; }
  else { iconBg = "#e2e8f0"; iconColor = "#94a3b8"; toggleBg = "#cbd5e1"; }
  return (
    <button
      type="button"
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
        textAlign: "left",
        width: "100%",
        fontFamily: "inherit",
        opacity: enabled ? 1 : 0.5,
        transition: "all 0.2s ease",
      }}
    >
      <div
        style={{
          width: 44, height: 44, borderRadius: 12,
          background: iconBg,
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          transition: "all 0.2s ease",
        }}
      >
        <Icon className="w-5 h-5" style={{ color: iconColor }} />
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
          width: 22, height: 22, borderRadius: "50%", background: "#fff",
          boxShadow: "0 1px 3px rgba(0,0,0,0.2)", transition: "all 0.2s ease",
          transform: enabled ? "translateX(20px)" : "translateX(0)",
        }} />
      </div>
    </button>
  );
}

export default function AdminFeaturesConfig() {
  useAuth();
  const { isDark, p } = useTheme();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [condominios, setCondominios] = useState<Condominio[]>([]);
  const [selectedCondoId, setSelectedCondoId] = useState<number | null>(null);
  const [config, setConfig] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [tab, setTab] = useState<TabId>("morador");

  // Fetch condominios
  useEffect(() => {
    apiFetch("/api/condominios")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: Condominio[]) => {
        setCondominios(data);
        const urlCondo = searchParams.get("condo");
        if (urlCondo) {
          const id = Number(urlCondo);
          if (data.some((c) => c.id === id)) {
            setSelectedCondoId(id);
          } else if (data.length > 0) {
            setSelectedCondoId(data[0].id);
          }
        } else if (data.length > 0) {
          setSelectedCondoId(data[0].id);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Fetch config whenever selected condo changes
  useEffect(() => {
    if (!selectedCondoId) return;
    setLoadingConfig(true);
    apiFetch(`/api/condominio-config?condominio_id=${selectedCondoId}`)
      .then((res) => (res.ok ? res.json() : {}))
      .then((data) => {
        setConfig(data);
        setLoadingConfig(false);
      })
      .catch(() => setLoadingConfig(false));
  }, [selectedCondoId]);

  const isFeatureEnabled = (key: string): boolean => {
    return getFeatureEnabled(config, key, true);
  };

  const toggleFeature = async (key: string) => {
    if (!selectedCondoId) return;
    const newValue = isFeatureEnabled(key) ? "false" : "true";
    const newConfig = { ...config, [key]: newValue };
    setConfig(newConfig);

    setSaving(true);
    setSaved(false);
    try {
      const res = await apiFetch(`/api/condominio-config?condominio_id=${selectedCondoId}`, {
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

  const toggleAll = async (features: FeatureDef[], enable: boolean) => {
    if (!selectedCondoId) return;
    const updates: Record<string, string> = {};
    features.forEach((f) => { updates[f.key] = enable ? "true" : "false"; });
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    setSaving(true);
    setSaved(false);
    try {
      const res = await apiFetch(`/api/condominio-config?condominio_id=${selectedCondoId}`, {
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
    } catch {}
    setSaving(false);
  };

  const currentTab = TABS.find((t) => t.id === tab)!;
  const defaultFeatures = currentTab.features.filter((f) => f.isDefault);
  const extraFeatures = currentTab.features.filter((f) => !f.isDefault);
  const enabledCount = currentTab.features.filter((f) => isFeatureEnabled(f.key)).length;
  const selectedCondo = condominios.find((c) => c.id === selectedCondoId);

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center" style={{ background: p.pageBg }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: p.textAccent }} />
      </div>
    );
  }

  let statusIndicator: React.ReactNode = null;
  if (saving) { statusIndicator = <Loader2 className="w-5 h-5 animate-spin text-white/60" />; }
  else if (saved) { statusIndicator = <div className="flex items-center gap-1 text-emerald-300 text-sm font-medium"><Check className="w-4 h-4" /> Salvo</div>; }

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: p.pageBg }}>
      {/* ═════════ Header ═════════ */}
      <header
        className="sticky top-0 z-40"
        style={{ background: p.headerBg, borderBottom: p.headerBorder, boxShadow: p.headerShadow, color: p.text }}
      >
        <div className="flex items-center justify-between" style={{ padding: "1rem 1.5rem", height: "4.5rem" }}>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: p.btnBg,
                border: p.btnBorder,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: p.text,
              }}
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <span style={{ fontWeight: 700, fontSize: 18 }} className="block">
                Configurações
              </span>
              <span style={{ fontSize: 12, color: p.textSecondary }}>
                Funções dos condomínios
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {statusIndicator}
            <TutorialButton title="Configurações do Condomínio">
              <TSection icon={<span>📋</span>} title="O QUE É ESTA FUNÇÃO?">
                <p>
                  Painel de <strong>configuração de funções</strong> dos condomínios gerenciados pela
                  administradora. Aqui você habilita ou desabilita os recursos disponíveis para os moradores de
                  cada condomínio individualmente.
                </p>
              </TSection>
              <TSection icon={<span>🔧</span>} title="COMO USAR">
                <TStep n={1}>
                  Selecione o <strong>condomínio</strong> na barra de seleção
                </TStep>
                <TStep n={2}>
                  Toque no <strong>toggle</strong> de cada função para ativar ou desativar
                </TStep>
                <TStep n={3}>
                  As alterações são <strong>salvas automaticamente</strong>
                </TStep>
              </TSection>
              <TSection icon={<span>⚠️</span>} title="IMPORTANTE">
                <TBullet>
                  Cada condomínio tem sua <strong>configuração independente</strong>
                </TBullet>
                <TBullet>
                  Funções desabilitadas ficam <strong>invisíveis</strong> para os moradores
                </TBullet>
                <TBullet>
                  As alterações entram em vigor <strong>imediatamente</strong>
                </TBullet>
              </TSection>
            </TutorialButton>
          </div>
        </div>
      </header>

      <main style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.2rem", paddingBottom: "8rem" }}>
        {/* ═══ Condominium Selector ═══ */}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setSelectorOpen(!selectorOpen)}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "14px 18px",
              borderRadius: "16px",
              background: p.cardBg,
              border: p.featureBorder,
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "12px",
                background: p.accent,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Building2 className="w-5 h-5" style={{ color: "#ffffff" }} />
            </div>
            <div style={{ flex: 1, textAlign: "left" }}>
              <p style={{ fontSize: "11px", color: p.textMuted, marginBottom: "2px" }}>
                Condomínio selecionado
              </p>
              <p style={{ fontSize: "15px", fontWeight: 600, color: p.textAccent }}>
                {selectedCondo?.name || "Selecione..."}
              </p>
            </div>
            <ChevronDown
              className="w-5 h-5"
              style={{
                color: p.textMuted,
                transition: "transform 0.2s",
                transform: selectorOpen ? "rotate(180deg)" : "rotate(0deg)",
              }}
            />
          </button>

          {/* Dropdown */}
          {selectorOpen && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 8px)",
                left: 0,
                right: 0,
                zIndex: 50,
                borderRadius: "16px",
                background: p.cardBg,
                border: p.cardBorder,
                boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
                maxHeight: "300px",
                overflow: "auto",
              }}
            >
              {condominios.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setSelectedCondoId(c.id);
                    setSelectorOpen(false);
                  }}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "14px 18px",
                    cursor: "pointer",
                    background: c.id === selectedCondoId ? p.accentLight : "transparent",
                    borderBottom: "1px solid " + p.divider,
                    transition: "background 0.15s",
                    border: "none",
                  }}
                >
                  <Building2 className="w-4 h-4" style={{ color: c.id === selectedCondoId ? p.accent : p.textMuted }} />
                  <span
                    style={{
                      fontSize: "14px",
                      fontWeight: c.id === selectedCondoId ? 600 : 400,
                      color: c.id === selectedCondoId ? p.textAccent : p.textSecondary,
                    }}
                  >
                    {c.name}
                  </span>
                  {c.id === selectedCondoId && (
                    <Check className="w-4 h-4 ml-auto" style={{ color: p.accent }} />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

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
            <p style={{ fontSize: "13px", fontWeight: 600, color: p.textAccent, marginBottom: "4px" }}>
              Configuração de Funções
            </p>
            <p style={{ fontSize: "12px", color: "#dc2626", lineHeight: 1.5 }}>
              Habilite ou desabilite as funções para cada perfil do condomínio selecionado.
              Funções desabilitadas ficam invisíveis no painel do respectivo perfil.
            </p>
          </div>
        </div>

        {/* Tab switcher */}
        <div style={{ display: "flex", borderRadius: "12px", overflow: "hidden", border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "#e5e7eb"}` }}>
          {TABS.map((t) => {
            const count = t.features.filter((f) => isFeatureEnabled(f.key)).length;
            let tabBg: string;
            let tabColor2: string;
            let badgeBg: string;
            if (tab === t.id) {
              tabBg = isDark ? "rgba(255,255,255,0.05)" : "#f0f9ff";
              tabColor2 = t.color;
              badgeBg = `${t.color}20`;
            } else if (isDark) {
              tabBg = "transparent"; tabColor2 = "#94a3b8"; badgeBg = "rgba(255,255,255,0.06)";
            } else {
              tabBg = "#fff"; tabColor2 = "#6b7280"; badgeBg = "#f1f5f9";
            }
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  flex: 1,
                  padding: "12px 8px",
                  fontSize: "13px",
                  fontWeight: 700,
                  border: "none",
                  background: tabBg,
                  color: tabColor2,
                  borderBottom: tab === t.id ? `3px solid ${t.color}` : "3px solid transparent",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                }}
              >
                {t.label}
                <span style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  padding: "1px 6px",
                  borderRadius: "6px",
                  background: badgeBg,
                  color: tab === t.id ? t.color : "#94a3b8",
                }}>
                  {count}/{t.features.length}
                </span>
              </button>
            );
          })}
        </div>

        {/* Summary + bulk actions */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Settings className="w-4 h-4" style={{ color: currentTab.color }} />
            <span style={{ fontSize: "13px", fontWeight: 600, color: p.textHeading }}>
              {enabledCount} de {currentTab.features.length} ativas
            </span>
          </div>
          <div style={{ display: "flex", gap: "6px" }}>
            <button
              onClick={() => toggleAll(currentTab.features, true)}
              style={{
                fontSize: "11px", fontWeight: 700, padding: "6px 12px", borderRadius: "8px",
                border: "none", background: `${currentTab.color}15`, color: currentTab.color, cursor: "pointer",
              }}
            >
              Ativar Todas
            </button>
            <button
              onClick={() => toggleAll(currentTab.features, false)}
              style={{
                fontSize: "11px", fontWeight: 700, padding: "6px 12px", borderRadius: "8px",
                border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "#e5e7eb"}`, background: isDark ? "rgba(255,255,255,0.04)" : "#fff", color: "#dc2626", cursor: "pointer",
              }}
            >
              Desativar Todas
            </button>
          </div>
        </div>

        {/* Feature toggles */}
        {loadingConfig ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "2rem" }}>
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: p.textAccent }} />
          </div>
        ) : (
          <>
            {/* ══ SECTION: Funções Padrão ══ */}
            <div style={{ marginBottom: "0.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px", padding: "0 4px" }}>
                <Star className="w-4 h-4" style={{ color: currentTab.color }} />
                <span style={{ fontSize: "13px", fontWeight: 700, color: currentTab.color, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Funções Padrão
                </span>
                <span style={{ fontSize: "10px", fontWeight: 600, padding: "2px 8px", borderRadius: "6px", background: `${currentTab.color}15`, color: currentTab.color }}>
                  Incluídas para todos
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {defaultFeatures.map((feature) => renderFeatureToggle(feature, currentTab.color, isDark, p, isFeatureEnabled, toggleFeature))}
              </div>
            </div>

            {/* ══ SECTION: Funções Extras ══ */}
            {extraFeatures.length > 0 && (
              <div style={{ marginTop: "1rem" }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px", padding: "10px 14px",
                  borderRadius: "12px",
                  background: isDark ? "rgba(139,92,246,0.08)" : "rgba(139,92,246,0.05)",
                  border: `1px dashed ${isDark ? "rgba(139,92,246,0.3)" : "rgba(139,92,246,0.25)"}`,
                }}>
                  <Sparkles className="w-4 h-4" style={{ color: "#8b5cf6" }} />
                  <span style={{ fontSize: "13px", fontWeight: 700, color: "#8b5cf6", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Funções Extras
                  </span>
                  <span style={{ fontSize: "10px", fontWeight: 600, padding: "2px 8px", borderRadius: "6px", background: "rgba(139,92,246,0.12)", color: "#8b5cf6" }}>
                    Desabilitadas por padrão
                  </span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {extraFeatures.map((feature) => renderFeatureToggle(feature, currentTab.color, isDark, p, isFeatureEnabled, toggleFeature))}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
