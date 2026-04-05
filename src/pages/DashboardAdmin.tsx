import { useAuth, getRoleLabel } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";
import FuncoesIndex from "@/components/FuncoesIndex";
import ThemePicker from "@/components/ThemePicker";
import {
  Home,
  LogOut,
  Settings,
  Shield,
  Building2,
  Users,
  Layers,
  Briefcase,
  Users2,
  Wrench,
  Bell,
  UserPlus,
  BarChart3,
  DoorOpen,
  ShieldCheck,
  FileText as FileTextIcon,
} from "lucide-react";

interface Condominio {
  id: number;
  name: string;
}

interface CondominioDetalhe extends Condominio {
  stats?: {
    moradores: number;
    blocos: number;
    funcionarios: number;
  };
}

interface Sindico {
  id: number;
}

interface Bloco {
  id: number;
}

interface Funcionario {
  id: number;
}

interface Morador {
  id: number;
}

const gradientBorder = {
  border: "1.5px solid transparent",
  backgroundImage: "linear-gradient(#003580, #003580), linear-gradient(135deg, #2d3354, #10b981, #8b5cf6)",
  backgroundOrigin: "border-box",
  backgroundClip: "padding-box, border-box",
};

export default function DashboardAdmin() {
  const { user, logout } = useAuth();
  const { isDark, p } = useTheme();
  const navigate = useNavigate();
  const [activeModule, setActiveModule] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [stats, setStats] = useState({ condominios: 0, sindicos: 0, blocos: 0, funcionarios: 0, moradores: 0 });
  const [condominiosResumo, setCondominiosResumo] = useState<Array<{ id: number; nome: string; moradores: number; blocos: number }>>([]);
  const pendingMoradoresLabel = pendingCount === 1 ? "morador" : "moradores";
  const secondaryHoverBg = p.isDarkBase ? "rgba(255,255,255,0.15)" : "#e2e8f0";
  const secondaryIdleBg = p.btnBg;

  useEffect(() => {
    Promise.all([
      apiFetch("/api/moradores/pendentes/count").then((r) => r.ok ? r.json() : { count: 0 }),
      apiFetch("/api/condominios").then((r) => r.ok ? r.json() : []),
      apiFetch("/api/users/sindicos").then((r) => r.ok ? r.json() : []),
      apiFetch("/api/blocos").then((r) => r.ok ? r.json() : []),
      apiFetch("/api/funcionarios").then((r) => r.ok ? r.json() : []),
      apiFetch("/api/moradores").then((r) => r.ok ? r.json() : []),
    ])
      .then(async ([pendingData, condominiosData, sindicosData, blocosData, funcionariosData, moradoresData]) => {
        const condominios = Array.isArray(condominiosData) ? (condominiosData as Condominio[]) : [];
        const sindicos = Array.isArray(sindicosData) ? (sindicosData as Sindico[]) : [];
        const blocos = Array.isArray(blocosData) ? (blocosData as Bloco[]) : [];
        const funcionarios = Array.isArray(funcionariosData) ? (funcionariosData as Funcionario[]) : [];
        const moradores = Array.isArray(moradoresData) ? (moradoresData as Morador[]) : [];

        setPendingCount(Number(pendingData?.count || 0));
        setStats({
          condominios: condominios.length,
          sindicos: sindicos.length,
          blocos: blocos.length,
          funcionarios: funcionarios.length,
          moradores: moradores.length,
        });

        const detalhes = await Promise.all(
          condominios.map(async (condominio) => {
            try {
              const response = await apiFetch(`/api/condominios/${condominio.id}`);
              if (!response.ok) {
                return null;
              }
              return response.json() as Promise<CondominioDetalhe>;
            } catch {
              return null;
            }
          }),
        );

        setCondominiosResumo(
          detalhes
            .filter((condominio): condominio is CondominioDetalhe => Boolean(condominio))
            .map((condominio) => ({
              id: condominio.id,
              nome: condominio.name,
              moradores: condominio.stats?.moradores || 0,
              blocos: condominio.stats?.blocos || 0,
            })),
        );
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (activeModule >= condominiosResumo.length && condominiosResumo.length > 0) {
      setActiveModule(0);
    }
  }, [activeModule, condominiosResumo.length]);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="min-h-dvh bg-background flex flex-col">
      {/* ═══════════ Header ═══════════ */}
      <header className="sticky top-0 z-40" style={{ background: p.headerBg, borderBottom: p.headerBorder, boxShadow: p.headerShadow, marginBottom: 0, paddingTop: "max(0, env(safe-area-inset-top))" }}>
        <div className="flex items-start justify-between" style={{ padding: "18px 20px", minHeight: "5.5rem", gap: 16 }}>
          <div className="flex items-center gap-4" style={{ minWidth: 0 }}>
            <div className="flex items-center justify-center" style={{ width: 48, height: 48, borderRadius: 16, background: p.iconBoxBg, border: p.iconBoxBorder, flexShrink: 0 }}>
              <Building2 style={{ width: 22, height: 22, color: p.text }} />
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
                {user?.name || "Administradora"}
              </span>
              <span className="flex items-center gap-1.5" style={{ fontSize: 13, color: p.textDim, marginTop: 6, flexWrap: "wrap" }}>
                <Shield className="w-4 h-4" />
                {getRoleLabel(user?.role || "administradora")}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3" style={{ flexShrink: 0 }}>
            <ThemePicker />
            <button className="p-3 rounded-xl transition-all relative" style={{ background: p.btnBg, border: p.btnBorder }} onMouseEnter={(e) => { e.currentTarget.style.background = secondaryHoverBg; }} onMouseLeave={(e) => { e.currentTarget.style.background = secondaryIdleBg; }}>
              <Bell className="w-6 h-6" style={{ color: p.text }} />
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-emerald-400 rounded-full" />
            </button>
            <button className="p-3 rounded-xl transition-all" style={{ background: p.btnBg, border: p.btnBorder }} onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.2)"; }} onMouseLeave={(e) => { e.currentTarget.style.background = secondaryIdleBg; }} onClick={handleLogout}>
              <LogOut className="w-6 h-6" style={{ color: p.text }} />
            </button>
          </div>
        </div>
      </header>

      <div style={{ padding: "16px 20px 8px" }}>
        <p style={{ fontSize: 14, color: p.accentBright, fontWeight: 500 }}>Bem-vindo(a) ao</p>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: p.text, marginTop: 4 }}>Painel da Administradora</h1>
        <p style={{ fontSize: 14, color: p.textDim, marginTop: 6 }}>Acompanhe os condomínios sob sua gestão</p>
      </div>

      <main className="flex-1 overflow-x-hidden" style={{ display: "flex", flexDirection: "column", gap: "2rem", paddingBottom: "10rem", paddingLeft: "1rem", paddingRight: "1rem", paddingTop: "1rem" }}>

        <FuncoesIndex userRole={user?.role || "administradora"} />

        {/* ═══════════ ROW 1: Stat Cards ═══════════ */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 animate-fade-in" style={{ animationDelay: "0.14s" }}>
          {[
            { label: "Condomínios", value: stats.condominios, color: "stat-num-blue", route: "/master/condominios" },
            { label: "Síndicos", value: stats.sindicos, color: "stat-num-emerald", route: "/cadastros/sindicos" },
            { label: "Blocos", value: stats.blocos, color: "stat-num-cyan", route: "/cadastros/blocos" },
            { label: "Funcionários", value: stats.funcionarios, color: "stat-num-teal", route: "/cadastros/funcionarios" },
            { label: "Moradores", value: stats.moradores, color: "stat-num-green", route: "/cadastros/moradores" },
          ].map((s) => (
            <button type="button" key={s.label} onClick={() => navigate(s.route)} className="ui-card-mini rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:scale-105 active:scale-95 transition-transform" style={{ padding: "0.75rem 0.5rem", minWidth: 0, ...gradientBorder }}>
              <span className="text-2xl sm:text-3xl font-extrabold text-white">{s.value}</span>
              <span className="font-medium uppercase tracking-wider text-center text-white" style={{ fontSize: "11px", marginTop: "0.35rem", lineHeight: 1.2, wordBreak: "break-word" }}>{s.label}</span>
            </button>
          ))}
          {/* Liberações card */}
          <button
            type="button"
            onClick={() => navigate("/liberacao-cadastros")}
            className={`rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:scale-105 active:scale-95 transition-transform relative ${pendingCount > 0 ? "animate-pulse" : ""}`}
            style={{
              padding: "0.75rem 0.5rem",
              minWidth: 0,
              border: pendingCount > 0 ? "none" : "1.5px solid transparent",
              backgroundImage: pendingCount > 0
                ? "linear-gradient(135deg, #ef4444, #dc2626)"
                : "linear-gradient(#003580, #003580), linear-gradient(135deg, #2d3354, #10b981, #8b5cf6)",
              backgroundOrigin: "border-box",
              backgroundClip: pendingCount > 0 ? "border-box" : "padding-box, border-box",
              boxShadow: pendingCount > 0 ? "0 4px 16px rgba(239, 68, 68, 0.3)" : undefined,
            }}
          >
            <span className={`text-3xl font-extrabold ${pendingCount > 0 ? "text-white" : "stat-num-blue"}`}>
              {pendingCount}
            </span>
            <span
              className="font-medium uppercase tracking-wider text-white"
              style={{ fontSize: "14px", marginTop: "0.35rem" }}
            >
              Liberações
            </span>
          </button>
        </div>

        {/* ═══════════ ROW 2: Distribuição + Condomínios ═══════════ */}
        <div className="animate-fade-in grid grid-cols-1 sm:grid-cols-2 gap-4" style={{ animationDelay: "0.22s" }}>
          {/* Distribuição */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <p className="text-[20px] font-semibold uppercase tracking-wider mb-3" style={{ color: p.textAccent }}>Distribuição</p>
            <div className="ui-card rounded-3xl overflow-hidden" style={{ ...gradientBorder, flex: 1, padding: "1.5rem 0.75rem" }}>
              {(() => {
                const liberacoesBarColor = pendingCount > 0 ? "from-red-500 to-red-600" : "from-violet-400 to-purple-500";
                const liberacoesIconGradient = pendingCount > 0 ? "from-red-500 to-red-600" : "from-[#003580] to-[#003580]";
                let liberacoesTextColor = "text-violet-600";
                if (pendingCount > 0) {
                  liberacoesTextColor = "text-red-500";
                } else if (isDark) {
                  liberacoesTextColor = "text-white";
                }
                const barData = [
                  { label: "Condomínios", value: stats.condominios, icon: Building2, barColor: "from-sky-400 to-blue-500", iconGradient: "from-[#003580] to-[#003580]", color: isDark ? "text-white" : "text-sky-600" },
                  { label: "Síndicos", value: stats.sindicos, icon: Briefcase, barColor: "from-amber-400 to-orange-500", iconGradient: "from-[#003580] to-[#003580]", color: isDark ? "text-white" : "text-amber-600" },
                  { label: "Blocos", value: stats.blocos, icon: Layers, barColor: "from-emerald-400 to-green-500", iconGradient: "from-[#003580] to-[#003580]", color: isDark ? "text-white" : "text-emerald-600" },
                  { label: "Funcionários", value: stats.funcionarios, icon: Wrench, barColor: "from-teal-400 to-cyan-500", iconGradient: "from-[#003580] to-[#003580]", color: isDark ? "text-white" : "text-teal-600" },
                  { label: "Moradores", value: stats.moradores, icon: Users2, barColor: "from-green-400 to-lime-500", iconGradient: "from-[#003580] to-[#003580]", color: isDark ? "text-white" : "text-green-600" },
                  { label: "Liberações", value: pendingCount, icon: ShieldCheck, barColor: liberacoesBarColor, iconGradient: liberacoesIconGradient, color: liberacoesTextColor },
                ];
                const maxVal = Math.max(...barData.map(b => b.value), 1);
                return barData.map((bar) => {
                  const BarIcon = bar.icon;
                  const pct = Math.max((bar.value / maxVal) * 100, 6);
                  const isLiberacoes = bar.label === "Liberações";
                  const content = (
                    <>
                      <div className={`w-8 h-8 rounded-xl bg-linear-to-br ${bar.iconGradient} flex items-center justify-center shadow-md shrink-0`}>
                        <BarIcon className="w-3.5 h-3.5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-[20px] font-medium ${isLiberacoes && pendingCount > 0 ? "text-red-500 font-bold" : "text-white"}`}>{bar.label}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 h-1.5 bg-white/20 rounded-full overflow-hidden">
                            <div className={`h-full bg-linear-to-r ${bar.barColor} rounded-full transition-all duration-1000`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      </div>
                      <span className={`text-2xl font-bold ${bar.color}`}>{bar.value}</span>
                    </>
                  );

                  if (isLiberacoes) {
                    return (
                      <button
                        type="button"
                        key={bar.label}
                        className="flex w-full items-center gap-3 px-4 py-5 transition-colors hover:bg-white/5 cursor-pointer"
                        onClick={() => navigate("/liberacao-cadastros")}
                      >
                        {content}
                      </button>
                    );
                  }

                  return (
                    <div key={bar.label} className="flex items-center gap-3 px-4 py-5 transition-colors hover:bg-white/5">
                      {content}
                    </div>
                  );
                });
              })()}
            </div>
          </div>

          {/* Condomínios Gerenciados */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div className="flex items-center justify-between mb-3">
            <p className="text-[20px] font-semibold tracking-tight" style={{ color: p.textAccent }}>Condomínios</p>
              <span className="text-[16px] text-muted-foreground/40">{condominiosResumo.length} total</span>
            </div>
            <div className="ui-card rounded-3xl overflow-hidden" style={{ ...gradientBorder, flex: 1, padding: "0.75rem" }}>
              {condominiosResumo.length === 0 && (
                <div className="px-4 py-5" style={{ color: p.isDarkBase ? "rgba(255,255,255,0.65)" : "#475569" }}>
                  Nenhum condomínio vinculado a esta administradora.
                </div>
              )}
              {condominiosResumo.map((condo, index) => (
                <button
                  type="button"
                  key={condo.id}
                  className={`flex w-full items-center gap-3 px-4 py-5 text-left transition-colors hover:bg-white/5 cursor-pointer ${index < condominiosResumo.length - 1 ? "border-b border-white/10" : ""} ${index === activeModule ? "sidebar-item-active-light" : ""}`}
                  onClick={() => setActiveModule(index)}
                >
                  <div className="w-8 h-8 rounded-xl bg-linear-to-br from-[#003580] to-[#003580] flex items-center justify-center shadow-md shrink-0">
                    <Building2 className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] sm:text-[18px] font-medium truncate" style={{ color: "#fff" }}>{condo.nome}</p>
                    <p className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>{condo.blocos} blocos · {condo.moradores} moradores</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ═══════════ ROW 3: Liberação Cadastros (if pending) ═══════════ */}
        {pendingCount > 0 && (
          <button
            type="button"
            className="animate-fade-in cursor-pointer"
            style={{ animationDelay: "0.30s" }}
            onClick={() => navigate("/liberacao-cadastros")}
          >
            <div
              className="rounded-2xl flex items-center gap-4 transition-all hover:scale-[1.01] active:scale-[0.99]"
              style={{
                background: p.cardBg,
                border: "1.5px solid " + p.accent,
                padding: "20px 16px",
              }}
            >
              <ShieldCheck className="w-7 h-7 shrink-0" style={{ color: p.text }} />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-lg" style={{ color: p.text }}>Cadastros Pendentes</p>
                <p className="text-sm" style={{ color: p.textSecondary }}>
                  {pendingCount} {pendingMoradoresLabel} aguardando liberação
                </p>
              </div>
              <div className="shrink-0" style={{ marginRight: "16px" }}>
                <span className="font-extrabold text-xl" style={{ color: p.text }}>{pendingCount}</span>
              </div>
            </div>
          </button>
        )}

        {/* ═══════════ ROW 4: Feature Cards ═══════════ */}
        <div className="animate-fade-in" style={{ animationDelay: "0.38s" }}>
          <p className="text-[20px] font-semibold uppercase tracking-wider mb-3" style={{ color: p.textAccent }}>Funções</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }} className="sindico-features-grid">
            {[
              { icon: FileTextIcon, label: "Logs", description: "Histórico de atividades", route: "/master/logs" },
              ...(user?.role === "master" ? [{ icon: DoorOpen, label: "Portão", description: "Configurar portões IoT", route: "/master/portao" }] : []),
            ].map((item) => (
              <button type="button" key={item.label} onClick={() => navigate(item.route)} className="ui-card-mini rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:scale-105 active:scale-95 transition-transform" style={{ padding: "1.25rem 0.75rem", minHeight: "120px", ...gradientBorder, textAlign: "center" }}>
                <item.icon className="w-7 h-7 mb-2" style={{ color: "#fff" }} />
                <p className="font-bold text-sm text-white">{item.label}</p>
                <p className="text-[11px] mt-1" style={{ color: "rgba(255,255,255,0.5)" }}>{item.description}</p>
              </button>
            ))}
          </div>
        </div>
      </main>

      {/* ═══════════ Bottom Nav ═══════════ */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 premium-bottom-nav safe-area-bottom">
        <div className={`flex justify-around h-24 overflow-x-auto`}>
          {[
            { icon: Home, label: "Home", route: "/dashboard", active: true },
            { icon: Building2, label: "Condos", route: "/master/condominios", active: false },
            { icon: BarChart3, label: "Painel", route: "/master/painel", active: false },
            { icon: UserPlus, label: "Cadastro", route: "/cadastros", active: false },
            { icon: Users, label: "Usuários", route: "/master/usuarios", active: false },
            ...(user?.role === "master" ? [{ icon: DoorOpen, label: "Portão", route: "/master/portao", active: false }] : []),
            { icon: Settings, label: "Config", route: "/admin/features-config", active: false },
          ].map((item) => (
            <button
              key={item.label}
              onClick={() => navigate(item.route)}
              className="flex flex-col items-center justify-center gap-2 text-[11px] font-medium transition-all duration-200 active:scale-90 cursor-pointer shrink-0"
              style={{ minWidth: 52, padding: "0 4px" }}
            >
              <div className="p-2 rounded-xl transition-all duration-200">
                <item.icon className="w-5 h-5" style={{ color: p.isDarkBase ? "#ffffff" : "#000000" }} />
              </div>
              <span style={{ color: p.isDarkBase ? "#ffffff" : "#000000" }}>{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
