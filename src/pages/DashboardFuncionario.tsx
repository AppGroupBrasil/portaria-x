import { useAuth, getRoleLabel } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import CameraWidget from "@/components/CameraWidget";
import ThemePicker from "@/components/ThemePicker";
import FuncoesIndex from "@/components/FuncoesIndex";
import { loadLayout, getItemById, getIconComponent } from "@/pages/PersonalizarDashboard";
import { apiFetch } from "@/lib/api";
import { isFeatureEnabled } from "@/lib/featureFlags";
import {
  LogOut,
  Settings,
  Shield,
  Bell,
  ShieldCheck,
  UserCircle,
  EyeOff,
} from "lucide-react";



export default function DashboardFuncionario() {
  const { user, logout } = useAuth();
  const { p } = useTheme();
  const navigate = useNavigate();

  // Load layout from localStorage
  const [layout, setLayout] = useState(() => loadLayout());
  const [featureConfig, setFeatureConfig] = useState<Record<string, string>>({});

  // Fetch condominio feature config
  useEffect(() => {
    apiFetch("/api/condominio-config")
      .then((res) => res.ok ? res.json() : {})
      .then(setFeatureConfig)
      .catch(() => {});
  }, []);

  // Re-read layout when navigating back to this page
  useEffect(() => {
    const onFocus = () => setLayout(loadLayout());
    globalThis.addEventListener("focus", onFocus);
    return () => globalThis.removeEventListener("focus", onFocus);
  }, []);

  // Also re-read on visibility change (for tab/app switching)
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") setLayout(loadLayout());
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  // Map dashboard item IDs to feature config keys
  const PORTEIRO_CONFIG_MAP: Record<string, string> = {
    "visitantes": "feature_porteiro_pedestres",
    "veiculos": "feature_porteiro_veiculos",
    "deliveries": "feature_porteiro_delivery",
    "correspondencias": "feature_porteiro_correspondencias",
    "monitoramento": "feature_porteiro_monitoramento",
    "rondas": "feature_porteiro_rondas",
    "estou-chegando": "feature_porteiro_estou_chegando",
    "portaria-virtual": "feature_porteiro_portaria_virtual",
    "centro-comando": "feature_porteiro_centro_comando",
    "qr-scanner": "feature_porteiro_qr_scanner",
    "livro-protocolo": "feature_porteiro_livro_protocolo",
    "acesso-auto": "feature_porteiro_acesso_auto",
  };

  const isPorteiroFeatureEnabled = (itemId: string) => {
    const configKey = PORTEIRO_CONFIG_MAP[itemId];
    if (!configKey) return true; // no config key = always enabled
    return isFeatureEnabled(featureConfig, configKey, true);
  };

  const dashboardItems = layout.dashboard.map(getItemById).filter(Boolean).filter((item) => isPorteiroFeatureEnabled(item!.id));
  const bottomBarItems = layout.bottomBar.map(getItemById).filter(Boolean).filter((item) => isPorteiroFeatureEnabled(item!.id));
  const hasHidden = (layout.hidden?.length || 0) > 0;
  const secondaryHoverBg = p.isDarkBase ? "rgba(255,255,255,0.15)" : "#e2e8f0";
  const secondaryIdleBg = p.btnBg;
  const surfaceHoverBg = p.isDarkBase ? "rgba(255,255,255,0.12)" : "#eef2f7";
  const surfaceIdleBg = p.surfaceBg;

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
              <ShieldCheck style={{ width: 26, height: 26, color: p.text }} />
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
              <span className="flex items-center" style={{ fontSize: 13, color: p.textDim, gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                <Shield style={{ width: 18, height: 18 }} />
                {getRoleLabel(user?.role || "funcionario")}
                {hasHidden && (
                  <button
                    onClick={() => navigate("/portaria/personalizar-dashboard")}
                    className="flex items-center"
                    style={{
                      marginLeft: 8,
                      gap: 6,
                      padding: "4px 10px",
                      borderRadius: 8,
                      background: "rgba(245,158,11,0.2)",
                      border: "1px solid rgba(245,158,11,0.4)",
                      cursor: "pointer",
                      animation: "pulse 2s ease-in-out infinite",
                    }}
                    title="Existem funções ocultas — clique para gerenciar"
                  >
                    <EyeOff style={{ width: 18, height: 18, color: "#fbbf24" }} />
                    <span style={{ fontSize: 11, fontWeight: 600, color: "#fbbf24" }}>
                      {layout.hidden?.length || 0} oculto{(layout.hidden?.length || 0) === 1 ? "" : "s"}
                    </span>
                  </button>
                )}
              </span>
            </div>
          </div>
          <div className="flex items-center" style={{ gap: 10, flexShrink: 0 }}>
            <button
              className="flex items-center justify-center"
              onClick={() => navigate("/portaria/configuracoes")}
              style={{ width: 40, height: 40, borderRadius: 14, background: p.btnBg, border: p.btnBorder, cursor: "pointer", transition: "all 0.15s", display: "flex", alignItems: "center", justifyContent: "center" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = secondaryHoverBg; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = secondaryIdleBg; }}
            >
              <Settings style={{ width: 24, height: 24, color: p.text }} />
            </button>
            <button
              className="flex items-center justify-center"
              onClick={() => navigate("/minha-conta")}
              style={{ width: 40, height: 40, borderRadius: 14, background: p.btnBg, border: p.btnBorder, cursor: "pointer", transition: "all 0.15s", display: "flex", alignItems: "center", justifyContent: "center" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = secondaryHoverBg; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = secondaryIdleBg; }}
            >
              <UserCircle style={{ width: 24, height: 24, color: p.text }} />
            </button>
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
        <h1 style={{ fontSize: 28, fontWeight: 800, color: p.text, marginTop: 4 }}>Painel da Portaria</h1>
        <p style={{ fontSize: 14, color: p.textDim, marginTop: 6 }}>Selecione uma função abaixo</p>
      </div>

      <main className="flex-1 overflow-x-hidden" style={{ display: "flex", flexDirection: "column", gap: 14, paddingBottom: "10rem", paddingLeft: 16, paddingRight: 16, paddingTop: 20 }}>

        <FuncoesIndex userRole={user?.role || "funcionario"} featureConfig={featureConfig} />

        {/* ═══════════ Funções da Portaria — Grid de Cards ═══════════ */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5" style={{ gap: 12 }}>
          {dashboardItems.map((item, idx) => {
            if (!item) return null;
            const Icon = getIconComponent(item.icon);
            return (
              <div key={item.id} className="animate-fade-in" style={{ animationDelay: `${0.05 + idx * 0.04}s` }}>
                <button
                  onClick={() => navigate(item.route)}
                  className="w-full flex flex-col items-center justify-center cursor-pointer"
                  style={{
                    padding: "20px 10px",
                    aspectRatio: "1",
                    background: p.surfaceBg,
                    border: p.featureBorder,
                    borderRadius: 20,
                    color: p.text,
                    gap: 10,
                    transition: "all 0.2s ease",
                    boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
                  }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = surfaceHoverBg; e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,0,0,0.15)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = surfaceIdleBg; e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.08)"; e.currentTarget.style.transform = "translateY(0)"; }}
                  onMouseDown={(e) => { e.currentTarget.style.transform = "scale(0.96)"; }}
                  onMouseUp={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; }}
                >
                  <div className="flex items-center justify-center" style={{ width: 52, height: 52, borderRadius: 16, background: p.iconBoxBg, border: p.iconBoxBorder }}>
                    <Icon style={{ width: 26, height: 26 }} />
                  </div>
                  <p className="text-center" style={{ fontWeight: 700, fontSize: 13, lineHeight: 1.2 }}>{item.label}</p>
                  <p className="text-center" style={{ color: p.textDim, fontSize: 11 }}>{item.shortLabel}</p>
                </button>
              </div>
            );
          })}
        </div>

      </main>

      {/* ═══════════ Bottom Nav ═══════════ */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 premium-bottom-nav safe-area-bottom">
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${bottomBarItems.length}, 1fr)`, height: "6rem" }}>
          {bottomBarItems.map((item) => {
            if (!item) return null;
            const Icon = getIconComponent(item.icon);
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.route)}
                className="flex flex-col items-center justify-center cursor-pointer"
                style={{ gap: 6, fontSize: 12, fontWeight: 600, background: "none", border: "none", color: p.isDarkBase ? "#ffffff" : "#000000", transition: "all 0.2s" }}
              >
                <div className="flex items-center justify-center" style={{ width: 40, height: 40, borderRadius: 12, transition: "all 0.2s" }}>
                  <Icon style={{ width: 26, height: 26 }} />
                </div>
                <span>{item.shortLabel}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Floating Camera Widget */}
      <CameraWidget />
    </div>
  );
}
