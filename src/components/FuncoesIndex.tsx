import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@/hooks/useTheme";
import {
  ChevronDown,
  ChevronUp,
  List,
  ShieldCheck,
  Truck,
  Car,
  Mail,
  QrCode,
  Navigation,
  DoorOpen,
  Camera,
  MapPin,
  Users2,
  Wrench,
  Layers,
  Cpu,
  BookOpen,
  Zap,
  Building2,
  FileText,
  Shield,
  BarChart3,
  UserPlus,
  ClipboardList,
  Scan,
  Package,
  Settings,
  LayoutDashboard,
  type LucideIcon,
} from "lucide-react";
import { getFeatureDefault, isFeatureEnabled } from "@/lib/featureFlags";

/* ── Role badge colors ── */
const ROLE_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  morador:        { bg: "rgba(59,130,246,0.15)", text: "#60a5fa", label: "Morador" },
  funcionario:    { bg: "rgba(234,179,8,0.15)",  text: "#facc15", label: "Funcionário" },
  sindico:        { bg: "rgba(16,185,129,0.15)", text: "#34d399", label: "Síndico" },
  administradora: { bg: "rgba(168,85,247,0.15)", text: "#c084fc", label: "Administradora" },
  master:         { bg: "rgba(239,68,68,0.15)",  text: "#f87171", label: "Master" },
};

interface FuncaoItem {
  icon: LucideIcon;
  label: string;
  description: string;
  route: string;
  minRole: string;
}

/* ── Grouped by category ── */
interface FuncaoGroup {
  title: string;
  items: FuncaoItem[];
}

const ALL_FUNCOES: FuncaoGroup[] = [
  {
    title: "Morador",
    items: [
      { icon: ShieldCheck, label: "Autorizar Visitante", description: "Criar autorização prévia de entrada", route: "/morador/autorizacoes", minRole: "morador" },
      { icon: Truck, label: "Delivery", description: "Autorizar recebimento de pedidos", route: "/morador/delivery", minRole: "morador" },
      { icon: Car, label: "Autorizar Veículo", description: "Autorizar acesso de veículos", route: "/morador/veiculos", minRole: "morador" },
      { icon: QrCode, label: "QR Code Visitante", description: "Gerar QR de autorização para visitantes", route: "/morador/qr-visitante", minRole: "morador" },
      { icon: Mail, label: "Correspondências", description: "Avisos de correspondência na portaria", route: "/morador/correspondencias", minRole: "morador" },
      { icon: Navigation, label: "Estou Chegando", description: "Avisar a portaria que está chegando", route: "/morador/estou-chegando", minRole: "morador" },
      { icon: DoorOpen, label: "Portaria Virtual", description: "Abrir portões e portas remotamente", route: "/morador/portaria-virtual", minRole: "morador" },
    ],
  },
  {
    title: "Portaria / Funcionário",
    items: [
      { icon: UserPlus, label: "Controle de Pedestres", description: "Visitantes e autorizacoes previas", route: "/portaria/acesso-pedestres", minRole: "funcionario" },
      { icon: Car, label: "Acesso Veículos", description: "Controlar entrada de veículos", route: "/portaria/acesso-veiculos", minRole: "funcionario" },
      { icon: Package, label: "Delivery Porteiro", description: "Gerenciar entregas recebidas", route: "/portaria/delivery", minRole: "funcionario" },
      { icon: Mail, label: "Correspondências", description: "Registrar correspondências recebidas", route: "/portaria/correspondencias", minRole: "funcionario" },
      { icon: Camera, label: "Monitoramento", description: "Visualizar câmeras do condomínio", route: "/portaria/monitoramento", minRole: "funcionario" },
      { icon: MapPin, label: "Rondas", description: "Registrar rondas de segurança", route: "/portaria/rondas", minRole: "funcionario" },
      { icon: Navigation, label: "Estou Chegando", description: "Ver moradores a caminho", route: "/portaria/estou-chegando", minRole: "funcionario" },
      { icon: DoorOpen, label: "Portaria Virtual", description: "Controle remoto de portões", route: "/portaria/portaria-virtual", minRole: "funcionario" },
      { icon: LayoutDashboard, label: "Centro de Comando", description: "Painel unificado da portaria", route: "/portaria/centro-comando", minRole: "funcionario" },
      { icon: Scan, label: "Scanner QR", description: "Escanear QR de visitantes", route: "/portaria/qr-scanner", minRole: "funcionario" },
      { icon: BookOpen, label: "Livro Protocolo", description: "Livro de ocorrências da portaria", route: "/portaria/livro-protocolo", minRole: "funcionario" },
      { icon: ClipboardList, label: "Espelho Portaria", description: "Visão geral do espelho da portaria", route: "/espelho-portaria", minRole: "funcionario" },

      { icon: Car, label: "Acesso Automático", description: "Liberação automática de veículos", route: "/portaria/acesso-auto", minRole: "funcionario" },
    ],
  },
  {
    title: "Síndico",
    items: [
      { icon: UserPlus, label: "Cadastros", description: "Gerenciar moradores e funcionários", route: "/cadastros", minRole: "sindico" },
      { icon: Layers, label: "Blocos", description: "Cadastrar e gerenciar blocos", route: "/cadastros/blocos", minRole: "sindico" },
      { icon: Users2, label: "Moradores", description: "Cadastrar e gerenciar moradores", route: "/cadastros/moradores", minRole: "sindico" },
      { icon: Wrench, label: "Funcionários", description: "Cadastrar e gerenciar funcionários", route: "/cadastros/funcionarios", minRole: "sindico" },
      { icon: Camera, label: "Câmeras", description: "Configurar câmeras do condomínio", route: "/sindico/cameras", minRole: "sindico" },
      { icon: MapPin, label: "Rondas", description: "Controlar rondas de segurança", route: "/sindico/rondas", minRole: "sindico" },
      { icon: Navigation, label: "Estou Chegando Config", description: "Configurar notificações de chegada", route: "/sindico/estou-chegando", minRole: "sindico" },
      { icon: DoorOpen, label: "Acessos", description: "Gerenciar pontos de acesso", route: "/sindico/acessos", minRole: "sindico" },
      { icon: Zap, label: "Portão", description: "Configurar portões e dispositivos IoT", route: "/sindico/portao", minRole: "sindico" },
      { icon: QrCode, label: "Config QR", description: "Configurar QR Code para visitantes", route: "/sindico/qr-config", minRole: "sindico" },
      { icon: Cpu, label: "Dispositivos", description: "Biblioteca de dispositivos IoT", route: "/biblioteca-dispositivos", minRole: "sindico" },
      { icon: ShieldCheck, label: "Liberação Cadastros", description: "Aprovar cadastros pendentes", route: "/liberacao-cadastros", minRole: "sindico" },
      { icon: Settings, label: "Config Funcionalidades", description: "Ativar/desativar funções do condomínio", route: "/sindico/features-config", minRole: "sindico" },
    ],
  },
  {
    title: "Administradora",
    items: [
      { icon: Shield, label: "Síndicos", description: "Cadastrar e gerenciar síndicos", route: "/cadastros/sindicos", minRole: "administradora" },
      { icon: Building2, label: "Condomínios", description: "Gerenciar condomínios", route: "/master/condominios", minRole: "administradora" },
      { icon: BarChart3, label: "Painel", description: "Painel de condomínios gerenciados", route: "/master/painel", minRole: "administradora" },
      { icon: Users2, label: "Usuários", description: "Gerenciar todos os usuários", route: "/master/usuarios", minRole: "administradora" },
      { icon: FileText, label: "Logs", description: "Histórico de atividades do sistema", route: "/master/logs", minRole: "administradora" },
      { icon: DoorOpen, label: "Portão Master", description: "Configurar portões (nível admin)", route: "/master/portao", minRole: "administradora" },
      { icon: Settings, label: "Config Admin", description: "Configurações da administradora", route: "/admin/features-config", minRole: "administradora" },
    ],
  },
  {
    title: "Master",
    items: [
      { icon: Building2, label: "Administradoras", description: "Gerenciar empresas administradoras", route: "/cadastros/administradoras", minRole: "master" },
      { icon: Settings, label: "Config Master", description: "Configurações gerais do sistema", route: "/master/config", minRole: "master" },
      { icon: BookOpen, label: "Guia Instalação", description: "Tutorial de instalação completo", route: "/master/guia-instalacao", minRole: "master" },
    ],
  },
];

/* ── Role level for filtering ── */
const ROLE_LEVEL: Record<string, number> = {
  morador: 20,
  funcionario: 40,
  sindico: 60,
  administradora: 80,
  master: 100,
};

interface Props {
  userRole: string;
  featureConfig?: Record<string, string>;
  onlyDefaultFeatures?: boolean;
}

const ROUTE_FEATURE_MAP: Record<string, string> = {
  "/morador/autorizacoes": "feature_autorizacoes",
  "/morador/delivery": "feature_delivery",
  "/morador/veiculos": "feature_veiculos",
  "/morador/qr-visitante": "feature_qr_visitante",
  "/morador/correspondencias": "feature_correspondencias",
  "/morador/estou-chegando": "feature_estou_chegando",
  "/morador/portaria-virtual": "feature_portaria_virtual",
  "/portaria/acesso-pedestres": "feature_porteiro_pedestres",
  "/portaria/acesso-veiculos": "feature_porteiro_veiculos",
  "/portaria/delivery": "feature_porteiro_delivery",
  "/portaria/correspondencias": "feature_porteiro_correspondencias",
  "/portaria/monitoramento": "feature_porteiro_monitoramento",
  "/portaria/rondas": "feature_porteiro_rondas",
  "/portaria/estou-chegando": "feature_porteiro_estou_chegando",
  "/portaria/portaria-virtual": "feature_porteiro_portaria_virtual",
  "/portaria/centro-comando": "feature_porteiro_centro_comando",
  "/portaria/qr-scanner": "feature_porteiro_qr_scanner",
  "/portaria/livro-protocolo": "feature_porteiro_livro_protocolo",
  "/espelho-portaria": "feature_porteiro_espelho",
  "/portaria/acesso-auto": "feature_porteiro_acesso_auto",
  "/cadastros": "feature_sindico_cadastros",
  "/cadastros/blocos": "feature_sindico_blocos",
  "/cadastros/moradores": "feature_sindico_moradores",
  "/cadastros/funcionarios": "feature_sindico_funcionarios",
  "/sindico/cameras": "feature_sindico_cameras",
  "/sindico/rondas": "feature_sindico_rondas",
  "/sindico/estou-chegando": "feature_sindico_estou_chegando",
  "/sindico/acessos": "feature_sindico_acessos",
  "/sindico/portao": "feature_sindico_portao",
  "/sindico/qr-config": "feature_sindico_qr_config",
  "/biblioteca-dispositivos": "feature_sindico_dispositivos",
  "/liberacao-cadastros": "feature_sindico_liberacao",
  "/sindico/features-config": "",
};

export default function FuncoesIndex({ userRole, featureConfig = {}, onlyDefaultFeatures = false }: Readonly<Props>) {
  const navigate = useNavigate();
  const { p } = useTheme();
  const [open, setOpen] = useState(false);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  const userLevel = ROLE_LEVEL[userRole] || 0;
  const isItemEnabled = (item: FuncaoItem) => {
    const configKey = ROUTE_FEATURE_MAP[item.route];
    if (!configKey) return true;
    if (onlyDefaultFeatures && !getFeatureDefault(configKey, true)) {
      return false;
    }
    return isFeatureEnabled(featureConfig, configKey, true);
  };

  // Filter groups to only show functions the user can access
  const visibleGroups = ALL_FUNCOES
    .map((g) => ({
      ...g,
      items: g.items.filter((item) => userLevel >= (ROLE_LEVEL[item.minRole] || 0) && isItemEnabled(item)),
    }))
    .filter((g) => g.items.length > 0);

  const totalCount = visibleGroups.reduce((acc, g) => acc + g.items.length, 0);

  return (
    <div className="animate-fade-in" style={{ animationDelay: "0.08s", marginBottom: "10px" }}>
      {/* Toggle button */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between cursor-pointer"
        style={{
          padding: "14px 18px",
          borderRadius: open ? "16px 16px 0 0" : 16,
          background: p.surfaceBg,
          border: p.featureBorder,
          color: p.text,
          transition: "all 0.2s ease",
        }}
      >
        <div className="flex items-center" style={{ gap: 10 }}>
          <List style={{ width: 22, height: 22, color: p.accentBright }} />
          <span style={{ fontWeight: 700, fontSize: 14, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Funções Portaria X
          </span>
          <span style={{
            fontSize: 11,
            fontWeight: 600,
            padding: "2px 8px",
            borderRadius: 8,
            background: "rgba(59,130,246,0.15)",
            color: p.accentBright,
          }}>
            {totalCount}
          </span>
        </div>
        {open
          ? <ChevronUp style={{ width: 22, height: 22, color: p.textDim }} />
          : <ChevronDown style={{ width: 22, height: 22, color: p.textDim }} />
        }
      </button>

      {/* Expanded index */}
      {open && (
        <div
          style={{
            borderRadius: "0 0 16px 16px",
            background: p.surfaceBg,
            borderLeft: p.featureBorder.replace("2px", "").includes("solid") ? p.featureBorder : `2px solid ${p.textDim}`,
            borderRight: p.featureBorder.replace("2px", "").includes("solid") ? p.featureBorder : `2px solid ${p.textDim}`,
            borderBottom: p.featureBorder.replace("2px", "").includes("solid") ? p.featureBorder : `2px solid ${p.textDim}`,
            borderTop: "none",
            overflow: "hidden",
            maxHeight: "60vh",
            overflowY: "auto",
          }}
        >
          {visibleGroups.map((group) => {
            const isExpanded = expandedGroup === group.title;
            const roleInfo = ROLE_COLORS[group.title.toLowerCase()] ||
              ROLE_COLORS[group.items[0]?.minRole] ||
              { bg: "rgba(255,255,255,0.1)", text: "#fff", label: group.title };

            return (
              <div key={group.title}>
                {/* Group header */}
                <button
                  onClick={() => setExpandedGroup(isExpanded ? null : group.title)}
                  className="w-full flex items-center justify-between cursor-pointer"
                  style={{
                    padding: "10px 18px",
                    background: isExpanded ? "rgba(255,255,255,0.04)" : "transparent",
                    border: "none",
                    borderBottom: "1px solid rgba(255,255,255,0.06)",
                    color: p.text,
                    transition: "background 0.15s",
                  }}
                >
                  <div className="flex items-center" style={{ gap: 8 }}>
                    <span style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: 6,
                      background: roleInfo.bg,
                      color: roleInfo.text,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}>
                      {group.title}
                    </span>
                    <span style={{ fontSize: 11, color: p.textDim }}>
                      {group.items.length} {group.items.length === 1 ? "função" : "funções"}
                    </span>
                  </div>
                  {isExpanded
                    ? <ChevronUp style={{ width: 18, height: 18, color: p.textDim }} />
                    : <ChevronDown style={{ width: 18, height: 18, color: p.textDim }} />
                  }
                </button>

                {/* Items */}
                {isExpanded && group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.route}
                      onClick={() => { navigate(item.route); setOpen(false); }}
                      className="w-full flex items-center cursor-pointer"
                      style={{
                        padding: "8px 18px 8px 28px",
                        gap: 10,
                        background: "transparent",
                        border: "none",
                        borderBottom: "1px solid rgba(255,255,255,0.03)",
                        color: p.text,
                        transition: "background 0.12s",
                        textAlign: "left",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                    >
                      <div className="flex items-center justify-center shrink-0" style={{ width: 28, height: 28, borderRadius: 8, background: roleInfo.bg }}>
                        <Icon style={{ width: 18, height: 18, color: roleInfo.text }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p style={{ fontWeight: 600, fontSize: 13, lineHeight: 1.3 }}>{item.label}</p>
                        <p style={{ fontSize: 11, color: p.textDim, lineHeight: 1.2 }}>{item.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
