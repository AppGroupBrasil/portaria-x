import { useAuth, getRoleLabel } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";
import FuncoesIndex from "@/components/FuncoesIndex";
import ThemePicker from "@/components/ThemePicker";
import { isFeatureEnabled } from "@/lib/featureFlags";
import {
  Home,
  LogOut,
  Settings,
  Shield,
  Building2,
  Layers,
  Users2,
  Wrench,
  Bell,
  UserPlus,
  ClipboardList,
  UserCircle,
  QrCode,
  MapPin,
  Navigation,
  ShieldCheck,
} from "lucide-react";

interface Bloco {
  id: number;
  name: string;
}

interface Funcionario {
  id: number;
}

interface Morador {
  id: number;
  block?: string | null;
}

export default function DashboardSindico() {
  const { user, logout } = useAuth();
  const { p } = useTheme();
  const navigate = useNavigate();
  const [activeModule, setActiveModule] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [featureConfig, setFeatureConfig] = useState<Record<string, string>>({});
  const [stats, setStats] = useState({ blocos: 0, funcionarios: 0, moradores: 0 });
  const [blocosResumo, setBlocosResumo] = useState<Array<{ id: number; nome: string; moradores: number }>>([]);

  useEffect(() => {
    Promise.all([
      apiFetch("/api/moradores/pendentes/count").then((r) => r.ok ? r.json() : { count: 0 }),
      apiFetch("/api/condominio-config").then((r) => r.ok ? r.json() : {}),
      apiFetch("/api/blocos").then((r) => r.ok ? r.json() : []),
      apiFetch("/api/funcionarios").then((r) => r.ok ? r.json() : []),
      apiFetch("/api/moradores").then((r) => r.ok ? r.json() : []),
    ])
      .then(([pendingData, configData, blocosData, funcionariosData, moradoresData]) => {
        const blocos = Array.isArray(blocosData) ? (blocosData as Bloco[]) : [];
        const funcionarios = Array.isArray(funcionariosData) ? (funcionariosData as Funcionario[]) : [];
        const moradores = Array.isArray(moradoresData) ? (moradoresData as Morador[]) : [];
        const moradoresPorBloco = moradores.reduce<Record<string, number>>((acc, morador) => {
          const bloco = morador.block?.trim();
          if (!bloco) return acc;
          acc[bloco] = (acc[bloco] || 0) + 1;
          return acc;
        }, {});

        setPendingCount(Number(pendingData?.count || 0));
        setFeatureConfig(configData || {});
        setStats({
          blocos: blocos.length,
          funcionarios: funcionarios.length,
          moradores: moradores.length,
        });
        setBlocosResumo(
          blocos.map((bloco) => ({
            id: bloco.id,
            nome: bloco.name,
            moradores: moradoresPorBloco[bloco.name] || 0,
          })),
        );
      })
      .catch(() => {});
  }, []);

  const isSindicoFeatureEnabled = (key: string) => isFeatureEnabled(featureConfig, key, true);
  const surfaceHoverBg = p.isDarkBase ? "rgba(255,255,255,0.12)" : "#eef2f7";
  const surfaceIdleBg = p.surfaceBg;
  const secondaryHoverBg = p.isDarkBase ? "rgba(255,255,255,0.15)" : "#e2e8f0";
  const secondaryIdleBg = p.btnBg;
  const inactiveAlertColor = p.isDarkBase ? p.textSemi : p.textHeading;
  const inactiveAlertSubtle = p.isDarkBase ? p.textDim : p.textMuted;
  const getBlocoSummary = (moradores: number) => {
    if (moradores === 0) {
      return "Sem moradores cadastrados";
    }
    return `${moradores} morador${moradores === 1 ? "" : "es"} cadastrado${moradores === 1 ? "" : "s"}`;
  };
  const sindicoHomeFeatures = [
    { icon: UserPlus, label: "Cadastro", description: "Gerenciar moradores e funcionários", route: "/cadastros", configKey: "feature_sindico_cadastros" },
    { icon: MapPin, label: "Rondas", description: "Controlar rondas de segurança", route: "/sindico/rondas", configKey: "feature_sindico_rondas" },
    { icon: Navigation, label: "Estou Chegando", description: "Configurar notificações de chegada", route: "/sindico/estou-chegando", configKey: "feature_sindico_estou_chegando" },
    { icon: QrCode, label: "Config QR", description: "Configurar QR Code para visitantes", route: "/sindico/qr-config", configKey: "feature_sindico_qr_config" },
    { icon: ShieldCheck, label: "Liberações", description: "Aprovar cadastros pendentes", route: "/liberacao-cadastros", configKey: "feature_sindico_liberacao" },
    { icon: Settings, label: "Config Funções", description: "Ativar ou desativar funções", route: "/sindico/features-config", configKey: "" },
  ].filter((item) => !item.configKey || isSindicoFeatureEnabled(item.configKey));

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };



  return (
    <div className="min-h-dvh flex flex-col" style={{ background: p.pageBg }}>
      {/* ═══════════ Header ═══════════ */}
      <header className="sticky top-0 z-40" style={{ background: p.headerBg, borderBottom: p.headerBorder, boxShadow: p.headerShadow, marginBottom: 0, paddingTop: "max(0, env(safe-area-inset-top))" }}>
        <div className="flex items-start justify-between" style={{ padding: "18px 20px", minHeight: "4rem", gap: 16 }}>
          <div className="flex items-center" style={{ gap: 14 }}>
            <div className="flex items-center justify-center" style={{ width: 40, height: 40, borderRadius: 16, background: p.iconBoxBg, border: p.iconBoxBorder }}>
              <Building2 style={{ width: 26, height: 26, color: p.text }} />
            </div>
            <div style={{ minWidth: 0 }}>
              <span
                className="block"
                style={{
                  fontWeight: 800,
                  fontSize: 18,
                  letterSpacing: "-0.01em",
                  color: p.textHeading,
                  lineHeight: 1.15,
                  maxWidth: "min(46vw, 280px)",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                  wordBreak: "break-word",
                }}
              >
                {user?.condominio_nome || "Meu Condomínio"}
              </span>
              <span className="flex items-center" style={{ fontSize: 13, color: p.textDim, gap: 6, marginTop: 6 }}>
                <Shield style={{ width: 18, height: 18 }} />
                {getRoleLabel(user?.role || "sindico")}
              </span>
            </div>
          </div>
          <div className="flex items-center" style={{ gap: 10, flexShrink: 0 }}>
            <ThemePicker />
            <button
              className="flex items-center justify-center relative"
              style={{ width: 40, height: 40, borderRadius: 14, background: p.btnBg, border: p.btnBorder, cursor: "pointer", transition: "all 0.15s", display: "flex", alignItems: "center", justifyContent: "center" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = secondaryHoverBg; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = secondaryIdleBg; }}
            >
              <Bell style={{ width: 24, height: 24, color: p.text }} />
              <span className="absolute" style={{ top: 8, right: 8, width: 8, height: 8, background: "#34d399", borderRadius: "50%", boxShadow: "0 0 6px rgba(52,211,153,0.6)" }} />
            </button>
            <button
              className="flex items-center justify-center"
              onClick={handleLogout}
              style={{ width: 40, height: 40, borderRadius: 14, background: p.btnBg, border: p.btnBorder, cursor: "pointer", transition: "all 0.15s", display: "flex", alignItems: "center", justifyContent: "center" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.2)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = secondaryIdleBg; }}
            >
              <LogOut style={{ width: 24, height: 24, color: p.text }} />
            </button>
          </div>
        </div>
      </header>

  {/* ═══════════ Welcome Banner ═══════════ */}
  <div style={{ padding: "16px 20px 8px" }}>
        <p style={{ fontSize: 14, color: p.accentBright, fontWeight: 500 }}>Bem-vindo(a) ao</p>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: p.text, marginTop: 4 }}>Painel do Síndico</h1>
        <p style={{ fontSize: 14, color: p.textDim, marginTop: 6 }}>Gerencie seu condomínio</p>
      </div>

      <main className="flex-1 overflow-x-hidden" style={{ display: "flex", flexDirection: "column", gap: 20, paddingBottom: "10rem", paddingLeft: 16, paddingRight: 16, paddingTop: 20 }}>

        <FuncoesIndex userRole={user?.role || "sindico"} featureConfig={featureConfig} onlyDefaultFeatures />

        {/* ═══════════ ROW 1: Stat Cards ═══════════ */}
        <div className="animate-fade-in grid grid-cols-2 sm:grid-cols-4" style={{ animationDelay: "0.1s", gap: 12 }}>
          {[
            { label: "Blocos", value: stats.blocos, icon: Layers, route: "/cadastros/blocos" },
            { label: "Funcionários", value: stats.funcionarios, icon: Wrench, route: "/cadastros/funcionarios" },
            { label: "Moradores", value: stats.moradores, icon: Users2, route: "/cadastros/moradores" },
          ].map((s) => (
            <button
              key={s.label}
              onClick={() => navigate(s.route)}
              className="flex flex-col items-center justify-center cursor-pointer"
              style={{
                padding: "18px 8px",
                borderRadius: 20,
                background: p.surfaceBg,
                border: p.featureBorder,
                transition: "all 0.2s ease",
                boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = surfaceHoverBg; e.currentTarget.style.transform = "translateY(-2px)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = surfaceIdleBg; e.currentTarget.style.transform = "translateY(0)"; }}
            >
              <div className="flex items-center justify-center" style={{ width: 52, height: 52, borderRadius: 12, background: p.iconBoxBg, border: p.btnBorder, marginBottom: 10 }}>
                <s.icon style={{ width: 30, height: 30, color: p.text }} />
              </div>
              <span style={{ fontSize: 34, fontWeight: 800, color: p.text }}>{s.value}</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: p.textDim, marginTop: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.label}</span>
            </button>
          ))}
          {/* Liberações card */}
          <button
            onClick={() => navigate("/liberacao-cadastros")}
            className={`flex flex-col items-center justify-center cursor-pointer ${pendingCount > 0 ? "animate-pulse" : ""}`}
            style={{
              padding: "18px 8px",
              borderRadius: 20,
              background: pendingCount > 0 ? "linear-gradient(135deg, rgba(239,68,68,0.25), rgba(220,38,38,0.15))" : "rgba(255,255,255,0.06)",
              border: pendingCount > 0 ? "2px solid rgba(239,68,68,0.4)" : p.featureBorder,
              transition: "all 0.2s ease",
              boxShadow: pendingCount > 0 ? "0 4px 16px rgba(239,68,68,0.2)" : "0 2px 12px rgba(0,0,0,0.08)",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; }}
          >
            <div className="flex items-center justify-center" style={{ width: 40, height: 40, borderRadius: 12, background: pendingCount > 0 ? "rgba(239,68,68,0.2)" : p.iconBoxBg, border: pendingCount > 0 ? "1px solid rgba(239,68,68,0.3)" : p.iconBoxBorder, marginBottom: 8 }}>
              <ShieldCheck style={{ width: 22, height: 22, color: pendingCount > 0 ? "#f87171" : inactiveAlertColor }} />
            </div>
            <span style={{ fontSize: 28, fontWeight: 800, color: pendingCount > 0 ? "#f87171" : inactiveAlertColor }}>{pendingCount}</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: pendingCount > 0 ? "rgba(248,113,113,0.7)" : inactiveAlertSubtle, marginTop: 2, textTransform: "uppercase", letterSpacing: "0.05em" }}>Liberações</span>
          </button>
        </div>

        {/* ═══════════ ROW 2: Distribuição + Blocos ═══════════ */}
        <div className="animate-fade-in grid grid-cols-1 sm:grid-cols-2" style={{ animationDelay: "0.2s", gap: 16 }}>
          {/* Distribuição */}
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: p.accentBright, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.08em" }}>Distribuição</p>
            <div style={{ borderRadius: 20, background: p.surfaceBg, border: p.featureBorder, overflow: "hidden" }}>
              {(() => {
                const barData = [
                  { label: "Blocos", value: stats.blocos, icon: Layers, color: "#60a5fa" },
                  { label: "Funcionários", value: stats.funcionarios, icon: Wrench, color: "#34d399" },
                  { label: "Moradores", value: stats.moradores, icon: Users2, color: "#a78bfa" },
                  { label: "Liberações", value: pendingCount, icon: ShieldCheck, color: pendingCount > 0 ? "#f87171" : "#fbbf24" },
                ];
                const maxVal = Math.max(...barData.map(b => b.value), 1);
                return barData.map((bar, index) => {
                  const BarIcon = bar.icon;
                  const pct = Math.max((bar.value / maxVal) * 100, 6);
                  const isLiberacoes = bar.label === "Liberações";
                  return (
                    <button
                      type="button"
                      key={bar.label}
                      className="flex items-center"
                      style={{
                        width: "100%",
                        background: "transparent",
                        border: "none",
                        padding: "14px 18px",
                        gap: 12,
                        cursor: isLiberacoes ? "pointer" : "default",
                        borderBottom: index < barData.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none",
                        transition: "background 0.15s",
                      }}
                      onClick={isLiberacoes ? () => navigate("/liberacao-cadastros") : undefined}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                    >
                      <div className="flex items-center justify-center shrink-0" style={{ width: 34, height: 34, borderRadius: 10, background: p.iconBoxBg, border: p.iconBoxBorder }}>
                        <BarIcon style={{ width: 20, height: 20, color: bar.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p style={{ fontSize: 14, fontWeight: 600, color: p.text, marginBottom: 4 }}>{bar.label}</p>
                        <div style={{ height: 5, background: p.divider, borderRadius: 99, overflow: "hidden" }}>
                          <div style={{ width: `${pct}%`, height: "100%", background: bar.color, borderRadius: 99, transition: "width 1s ease" }} />
                        </div>
                      </div>
                      <span style={{ fontSize: 20, fontWeight: 800, color: bar.color, minWidth: 32, textAlign: "right" }}>{bar.value}</span>
                    </button>
                  );
                });
              })()}
            </div>
          </div>

          {/* Blocos */}
          <div>
            <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: p.accentBright, textTransform: "uppercase", letterSpacing: "0.08em" }}>Blocos</p>
              <span style={{ fontSize: 13, color: p.textDim }}>{blocosResumo.length} total</span>
            </div>
            <div style={{ borderRadius: 20, background: p.surfaceBg, border: p.featureBorder, overflow: "hidden" }}>
              {blocosResumo.length === 0 && (
                <div style={{ padding: "18px 20px", color: p.textDim, fontSize: 14 }}>
                  Nenhum bloco cadastrado neste condomínio.
                </div>
              )}
              {blocosResumo.map((bloco, index) => (
                <button
                  type="button"
                  key={bloco.id}
                  className="flex items-center"
                  style={{
                    width: "100%",
                    background: index === activeModule ? surfaceHoverBg : "transparent",
                    border: "none",
                    padding: "14px 18px",
                    gap: 12,
                    cursor: "pointer",
                    borderBottom: index < blocosResumo.length - 1 ? `1px solid ${p.divider}` : "none",
                    transition: "background 0.15s",
                  }}
                  onClick={() => setActiveModule(index)}
                  onMouseEnter={(e) => { e.currentTarget.style.background = surfaceHoverBg; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = index === activeModule ? surfaceHoverBg : "transparent"; }}
                >
                  <div className="flex items-center justify-center shrink-0" style={{ width: 44, height: 44, borderRadius: 10, background: p.iconBoxBg, border: p.iconBoxBorder }}>
                    <Layers style={{ width: 26, height: 26, color: "#60a5fa" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p style={{ fontSize: 17, fontWeight: 600, color: p.text }}>{bloco.nome}</p>
                    <p style={{ fontSize: 13, color: p.textDim }}>{getBlocoSummary(bloco.moradores)}</p>
                  </div>
                  <span style={{ fontSize: 22, fontWeight: 800, color: "#34d399" }}>{bloco.moradores}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ═══════════ ROW 3: Liberação Cadastros (if pending) ═══════════ */}
        {pendingCount > 0 && (
          <div
            className="animate-fade-in"
            style={{ animationDelay: "0.3s" }}
          >
            <button
              className="w-full flex items-center"
              style={{
                padding: "18px 22px",
                borderRadius: 20,
                background: "linear-gradient(135deg, rgba(239,68,68,0.15), rgba(220,38,38,0.08))",
                border: "2px solid rgba(239,68,68,0.3)",
                color: p.text,
                gap: 16,
                cursor: "pointer",
                transition: "all 0.2s ease",
                boxShadow: "0 4px 16px rgba(239,68,68,0.15)",
              }}
              onClick={() => navigate("/liberacao-cadastros")}
              onMouseEnter={(e) => { e.currentTarget.style.background = "linear-gradient(135deg, rgba(239,68,68,0.25), rgba(220,38,38,0.15))"; e.currentTarget.style.transform = "translateY(-2px)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "linear-gradient(135deg, rgba(239,68,68,0.15), rgba(220,38,38,0.08))"; e.currentTarget.style.transform = "translateY(0)"; }}
            >
              <div className="flex items-center justify-center shrink-0" style={{ width: 48, height: 48, borderRadius: 14, background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.25)" }}>
                <ShieldCheck style={{ width: 26, height: 26, color: "#f87171" }} />
              </div>
              <div className="flex-1 text-left min-w-0">
                <p style={{ fontWeight: 700, fontSize: 15 }}>Cadastros Pendentes</p>
                <p style={{ color: p.textDim, fontSize: 13 }}>{pendingCount} morador{pendingCount === 1 ? "" : "es"} aguardando liberação</p>
              </div>
              <span style={{ fontSize: 24, fontWeight: 800, color: "#f87171", flexShrink: 0 }}>{pendingCount}</span>
            </button>
          </div>
        )}

        {/* ═══════════ ROW 4: Feature Cards  ═══════════ */}
        <div className="animate-fade-in" style={{ animationDelay: "0.4s" }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: p.accentBright, marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.08em" }}>Funções</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }} className="sindico-features-grid">
            {sindicoHomeFeatures.map((item, idx) => (
              <div key={item.label} className="animate-fade-in" style={{ animationDelay: `${0.15 + idx * 0.08}s` }}>
                <button
                  onClick={() => navigate(item.route)}
                  className="w-full flex flex-col items-center justify-center cursor-pointer"
                  style={{
                    padding: "20px 12px",
                    height: "auto",
                    minHeight: "120px",
                    background: p.surfaceBg,
                    border: p.featureBorder,
                    borderRadius: 20,
                    color: p.text,
                    gap: 10,
                    transition: "all 0.2s ease",
                    boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
                    textAlign: "center",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = surfaceHoverBg; e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,0,0,0.15)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = surfaceIdleBg; e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.08)"; e.currentTarget.style.transform = "translateY(0)"; }}
                  onMouseDown={(e) => { e.currentTarget.style.transform = "scale(0.98)"; }}
                  onMouseUp={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; }}
                >
                  <div className="flex items-center justify-center shrink-0" style={{ width: 64, height: 64, borderRadius: 16, background: p.iconBoxBg, border: p.iconBoxBorder }}>
                    <item.icon style={{ width: 36, height: 36 }} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontWeight: 700, fontSize: 17, marginBottom: 4 }}>{item.label}</p>
                    <p style={{ color: p.textDim, fontSize: 13, lineHeight: 1.3 }}>{item.description}</p>
                  </div>
                </button>
              </div>
            ))}
          </div>
        </div>

      </main>

      {/* ═══════════ Bottom Nav ═══════════ */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 premium-bottom-nav safe-area-bottom">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", height: "6rem" }}>
          {[
            { icon: Home, label: "Home", route: "/dashboard" },
            { icon: ClipboardList, label: "Espelho Portaria", route: "/espelho-portaria" },
            { icon: UserCircle, label: "Minha Conta", route: "/minha-conta" },
            { icon: Settings, label: "Config", route: "/sindico/features-config" },
          ].map((item) => (
            <button
              key={item.label}
              onClick={() => navigate(item.route)}
              className="flex flex-col items-center justify-center cursor-pointer"
              style={{ gap: 6, fontSize: 12, fontWeight: 600, background: "none", border: "none", color: p.isDarkBase ? "#ffffff" : "#000000", transition: "all 0.2s" }}
            >
              <div className="flex items-center justify-center" style={{ width: 40, height: 40, borderRadius: 12, transition: "all 0.2s" }}>
                <item.icon style={{ width: 26, height: 26 }} />
              </div>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
