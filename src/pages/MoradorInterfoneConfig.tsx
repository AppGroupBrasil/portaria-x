import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import TutorialButton, { TSection, TStep, TBullet } from "@/components/TutorialButton";
import {
  ArrowLeft,
  Phone,
  Shield,
  ShieldCheck,
  ShieldAlert,
  User,
  Clock,
  Ban,
  Save,
  CheckCircle2,
  Volume2,
  VolumeX,
  History,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useTheme } from "@/hooks/useTheme";

const API = "/api";

interface InterfoneConfig {
  nivel_seguranca: number;
  nome_validacao: string;
  horario_silencioso_inicio: string | null;
  horario_silencioso_fim: string | null;
  bloqueados: string;
}

const securityLevels = [
  {
    level: 1,
    icon: Shield,
    title: "Ligação Direta",
    desc: "Visitante liga sem nenhuma verificação. Mais rápido e prático.",
    color: "#10b981",
  },
  {
    level: 2,
    icon: ShieldCheck,
    title: "Confirmar Nome",
    desc: "Visitante precisa digitar seu nome para poder ligar. Evita ligações aleatórias.",
    color: "#f59e0b",
  },
  {
    level: 3,
    icon: ShieldAlert,
    title: "Autorização Completa",
    desc: "Visitante envia nome, empresa e foto. Você analisa e decide se aceita ou recusa.",
    color: "#ef4444",
  },
];

function selectedCardStyles(isDark: boolean) {
  return {
    bgColor: isDark ? 'rgba(59,130,246,0.2)' : '#dbeafe',
    borderColor: isDark ? 'rgba(59,130,246,0.5)' : '#60a5fa',
    iconBoxBg: isDark ? 'rgba(255,255,255,0.15)' : '#ffffff',
    iconColor: isDark ? '#fff' : '#2563eb',
    badgeBg: isDark ? 'rgba(255,255,255,0.2)' : '#ffffff',
    badgeColor: isDark ? '#fff' : '#2563eb',
    descColor: isDark ? 'rgba(255,255,255,0.7)' : '#334155',
  };
}

function unselectedCardStyles(isDark: boolean, color: string) {
  return {
    bgColor: isDark ? 'rgba(255,255,255,0.06)' : '#f8fafc',
    borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#cbd5e1',
    iconBoxBg: `${color}25`,
    iconColor: color,
    badgeBg: `${color}25`,
    badgeColor: color,
    descColor: isDark ? '#93c5fd' : '#475569',
  };
}

function SecurityLevelCard({ sl, selected, isDark, onSelect }: Readonly<{
  sl: (typeof securityLevels)[number];
  selected: boolean;
  isDark: boolean;
  onSelect: () => void;
}>) {
  const Icon = sl.icon;
  const s = selected ? selectedCardStyles(isDark) : unselectedCardStyles(isDark, sl.color);
  const textColor = isDark ? '#fff' : '#1e293b';
  return (
    <button
      onClick={onSelect}
      className="w-full flex items-start rounded-xl text-left transition-all"
      style={{
        background: s.bgColor,
        border: `2px solid ${s.borderColor}`,
        color: textColor,
        padding: '24px',
        gap: '18px',
        position: 'relative',
      }}
    >
      {selected && (
        <div style={{ position: 'absolute', top: 12, right: 12 }}>
          <CheckCircle2 style={{ width: 22, height: 22, color: '#22c55e' }} />
        </div>
      )}
      <div
        className="rounded-lg flex items-center justify-center shrink-0"
        style={{ width: '44px', height: '44px', background: s.iconBoxBg, borderRadius: 14 }}
      >
        <Icon style={{ width: '22px', height: '22px', color: s.iconColor }} />
      </div>
      <div>
        <div className="flex items-center" style={{ gap: '12px' }}>
          <h3 className="font-bold" style={{ fontSize: '17px', color: textColor }}>{sl.title}</h3>
          <span
            className="rounded-full font-bold"
            style={{
              fontSize: '12px',
              padding: '4px 12px',
              background: s.badgeBg,
              color: s.badgeColor,
            }}
          >
            NÍVEL {sl.level}
          </span>
        </div>
        <p style={{ fontSize: '15px', marginTop: '6px', color: s.descColor }}>
          {sl.desc}
        </p>
      </div>
    </button>
  );
}

function NameValidationSection({ isDark, value, onChange }: Readonly<{
  isDark: boolean;
  value: string;
  onChange: (v: string) => void;
}>) {
  return (
    <section className="rounded-xl" style={{ background: isDark ? 'rgba(245,158,11,0.1)' : '#fef3c7', border: isDark ? '1px solid rgba(245,158,11,0.3)' : '1px solid #fde68a', padding: '24px', marginBottom: '54px' }}>
      <h2 className="font-bold flex items-center" style={{ color: isDark ? '#fbbf24' : '#d97706', fontSize: '18px', marginBottom: '12px', gap: '12px' }}>
        <User className="w-5 h-5" /> Nome para Validação
      </h2>
      <p style={{ fontSize: '15px', marginBottom: '18px', color: isDark ? '#fcd34d' : '#92400e' }}>
        O visitante precisará digitar este nome para poder ligar:
      </p>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Seu nome ou apelido"
        className="w-full rounded-lg"
        style={{ background: isDark ? 'rgba(255,255,255,0.06)' : '#ffffff', border: isDark ? '1px solid rgba(245,158,11,0.3)' : '1px solid #fcd34d', fontSize: '17px', padding: '16px 24px', color: isDark ? '#fff' : "#1e293b" }}
      />
      <p style={{ fontSize: '13px', marginTop: '12px', color: isDark ? '#fbbf24' : '#b45309' }}>
        Dica: Use seu primeiro nome para facilitar. A comparação ignora letras maiúsculas e acentos.
      </p>
    </section>
  );
}

function SilentHoursSection({ isDark, enabled, onToggle, inicio, fim, onChangeInicio, onChangeFim }: Readonly<{
  isDark: boolean;
  enabled: boolean;
  onToggle: () => void;
  inicio: string | null;
  fim: string | null;
  onChangeInicio: (v: string) => void;
  onChangeFim: (v: string) => void;
}>) {
  const labelColor = isDark ? '#93c5fd' : '#64748b';
  const panelBg = isDark ? 'rgba(255,255,255,0.06)' : '#f8fafc';
  const panelBorder = isDark ? '1.5px solid rgba(255,255,255,0.1)' : '1.5px solid #cbd5e1';
  const inputBg = isDark ? 'rgba(255,255,255,0.06)' : '#f8fafc';
  const inputBorder = isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid #cbd5e1';
  const inputColor = isDark ? '#fff' : '#1e293b';
  const separatorColor = isDark ? '#7dd3fc' : '#475569';
  const inputStyle = { background: inputBg, border: inputBorder, fontSize: '17px', padding: '12px 18px', marginTop: '6px', color: inputColor, colorScheme: 'dark' as const };
  return (
    <section style={{ marginBottom: '54px' }}>
      <div className="flex items-center justify-between" style={{ marginBottom: '18px' }}>
        <h2 className="font-bold flex items-center" style={{ color: labelColor, fontSize: '18px', gap: '12px' }}>
          <Clock className="w-5 h-5" /> Horário Silencioso
        </h2>
        <button
          onClick={onToggle}
          className="flex items-center font-bold"
          style={{ color: enabled ? '#4ade80' : '#64748b', fontSize: '15px', gap: '9px', background: 'none', border: 'none' }}
        >
          {enabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          {enabled ? 'Ativo' : 'Desativado'}
        </button>
      </div>
      {enabled && (
        <div className="rounded-xl" style={{ background: panelBg, border: panelBorder, padding: '24px' }}>
          <p style={{ fontSize: '15px', marginBottom: '18px', color: labelColor }}>
            Chamadas não serão recebidas durante este horário.
          </p>
          <div className="flex items-center" style={{ gap: '18px' }}>
            <div className="flex-1">
              <span className="font-bold" style={{ fontSize: '13px', color: labelColor }}>De</span>
              <input
                type="time"
                value={inicio || '22:00'}
                onChange={(e) => onChangeInicio(e.target.value)}
                className="w-full rounded-lg"
                style={inputStyle}
              />
            </div>
            <span style={{ fontSize: '17px', marginTop: '24px', color: separatorColor }}>até</span>
            <div className="flex-1">
              <span className="font-bold" style={{ fontSize: '13px', color: labelColor }}>Até</span>
              <input
                type="time"
                value={fim || '07:00'}
                onChange={(e) => onChangeFim(e.target.value)}
                className="w-full rounded-lg"
                style={inputStyle}
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function BlockedListSection({ isDark, bloqueados, newBloqueado, onChangeNew, onAdd, onRemove }: Readonly<{
  isDark: boolean;
  bloqueados: string[];
  newBloqueado: string;
  onChangeNew: (v: string) => void;
  onAdd: () => void;
  onRemove: (idx: number) => void;
}>) {
  return (
    <section style={{ marginBottom: '54px' }}>
      <h2 className="font-bold flex items-center" style={{ color: isDark ? '#93c5fd' : "#64748b", fontSize: '18px', marginBottom: '18px', gap: '12px' }}>
        <Ban className="w-5 h-5" /> Lista de Bloqueio
      </h2>
      <div className="rounded-xl" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : '#f8fafc', border: isDark ? '1.5px solid rgba(255,255,255,0.1)' : '1.5px solid #cbd5e1', padding: '24px' }}>
        <p style={{ fontSize: '15px', marginBottom: '18px', color: isDark ? '#93c5fd' : "#64748b" }}>
          Nomes bloqueados não conseguirão iniciar chamada (Nível 3).
        </p>
        <div className="flex" style={{ gap: '12px', marginBottom: '18px', flexDirection: 'column' }}>
          <input
            type="text"
            value={newBloqueado}
            onChange={(e) => onChangeNew(e.target.value)}
            placeholder="Nome para bloquear"
            className="w-full rounded-lg"
            style={{ background: isDark ? 'rgba(255,255,255,0.06)' : '#f8fafc', border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid #cbd5e1', fontSize: '17px', padding: '12px 18px', color: isDark ? '#fff' : "#1e293b" }}
            onKeyDown={(e) => e.key === 'Enter' && onAdd()}
          />
          <button
            onClick={onAdd}
            className="w-full rounded-lg font-bold"
            style={{ background: isDark ? 'linear-gradient(135deg, rgba(59,130,246,0.3), rgba(59,130,246,0.15))' : '#2563eb', border: isDark ? '1.5px solid rgba(59,130,246,0.4)' : '1px solid #1d4ed8', color: '#fff', fontSize: '15px', padding: '12px 18px' }}
          >
            Adicionar
          </button>
        </div>
        {bloqueados.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
            {bloqueados.map((nome, i) => (
              <div key={nome} className="flex items-center justify-between rounded-lg" style={{ background: isDark ? 'rgba(255,255,255,0.04)' : '#ffffff', border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #cbd5e1', padding: '12px 18px' }}>
                <span style={{ fontSize: '17px', color: isDark ? '#fff' : "#1e293b" }}>{nome}</span>
                <button onClick={() => onRemove(i)} style={{ color: '#ef4444', fontWeight: 700, fontSize: '15px', background: 'none', border: 'none' }}>✕</button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center" style={{ fontSize: '15px', color: isDark ? '#7dd3fc' : '#64748b' }}>Nenhum nome bloqueado</p>
        )}
      </div>
    </section>
  );
}

function interfoneHeaderColors(isDark: boolean) {
  return {
    headerBg: isDark ? "linear-gradient(135deg, #001533 0%, #002a66 50%, #004aad 100%)" : "#ffffff",
    headerBorder: isDark ? '1px solid rgba(255,255,255,0.08)' : "1px solid #e2e8f0",
    headerShadow: isDark ? '0 4px 20px rgba(0,0,0,0.3)' : "0 2px 8px rgba(0,0,0,0.06)",
    btnBg: isDark ? 'rgba(255,255,255,0.08)' : '#f8fafc',
    btnBorder: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid #cbd5e1',
    text: isDark ? '#fff' : "#1e293b",
    iconBoxBg: isDark ? 'linear-gradient(135deg, rgba(255,255,255,0.15), rgba(255,255,255,0.05))' : 'linear-gradient(135deg, #e2e8f0, #f1f5f9)',
    iconBoxBorder: isDark ? '1.5px solid rgba(255,255,255,0.2)' : '1.5px solid #cbd5e1',
    subText: isDark ? '#93c5fd' : "#64748b",
  };
}

function interfoneContentColors(isDark: boolean) {
  return {
    gradientBg: isDark ? "linear-gradient(180deg, #001533 0%, #002254 25%, #003580 55%, #004aad 100%)" : "#f0f4f8",
    text: isDark ? '#fff' : "#1e293b",
    subText: isDark ? '#93c5fd' : "#64748b",
    successBg: isDark ? 'rgba(34,197,94,0.1)' : '#f0fdf4',
    successBorder: isDark ? '1px solid rgba(34,197,94,0.3)' : '1px solid #bbf7d0',
    successColor: isDark ? '#4ade80' : '#16a34a',
    errorBg: isDark ? 'rgba(239,68,68,0.1)' : '#fef2f2',
    errorBorder: isDark ? '1px solid rgba(239,68,68,0.3)' : '1px solid #fecaca',
    errorColor: isDark ? '#fca5a5' : '#dc2626',
    panelBg: isDark ? 'rgba(255,255,255,0.06)' : '#f8fafc',
    panelBorder: isDark ? '1.5px solid rgba(255,255,255,0.1)' : '1.5px solid #cbd5e1',
    accentLight: isDark ? '#7dd3fc' : '#2563eb',
    saveBtnBg: isDark ? 'linear-gradient(135deg, rgba(59,130,246,0.3), rgba(59,130,246,0.15))' : '#2563eb',
    saveBtnBorder: isDark ? '1.5px solid rgba(59,130,246,0.4)' : '1px solid #1d4ed8',
  };
}

function buildSaveBody(config: InterfoneConfig, silenciosoEnabled: boolean) {
  return {
    ...config,
    horario_silencioso_inicio: silenciosoEnabled ? config.horario_silencioso_inicio : null,
    horario_silencioso_fim: silenciosoEnabled ? config.horario_silencioso_fim : null,
  };
}

function parseBloqueados(raw: string): string[] {
  try { return JSON.parse(raw || "[]"); } catch { return []; }
}

function InterfoneHeader({ isDark, onBack }: Readonly<{ isDark: boolean; onBack: () => void }>) {
  const c = interfoneHeaderColors(isDark);
  return (
    <header style={{ background: c.headerBg, borderBottom: c.headerBorder, boxShadow: c.headerShadow, padding: '36px 48px' }}>
      <div className="flex items-center gap-6">
        <button onClick={onBack} style={{ background: c.btnBg, border: c.btnBorder, borderRadius: 14, padding: 10, color: c.text, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ArrowLeft className="w-7 h-7" />
        </button>
        <div style={{ flex: 1 }}>
          <h1 className="font-bold flex items-center gap-4" style={{ fontSize: '22px', color: c.text }}>
            <div style={{ width: 40, height: 40, borderRadius: 14, background: c.iconBoxBg, border: c.iconBoxBorder, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Phone className="w-5 h-5" style={{ color: c.text }} />
            </div>
            Meu Interfone
          </h1>
          <p style={{ fontSize: '15px', marginTop: '6px', color: c.subText }}>Configure como deseja receber chamadas</p>
        </div>
          <TutorialButton title="Meu Interfone">
            <TSection icon={<span>📋</span>} title="O QUE É ESTA FUNÇÃO?">
              <p>Configure como você deseja <strong>receber chamadas de visitantes</strong> pelo Interfone Digital. Escolha o nível de segurança, defina horários silenciosos e bloqueie pessoas indesejadas.</p>
            </TSection>
            <TSection icon={<span>🛡️</span>} title="NÍVEIS DE SEGURANÇA">
              <TStep n={1}><strong>Nível 1 — Ligação Direta:</strong> O visitante seleciona seu apartamento e liga imediatamente. Sem nenhuma verificação. Ideal para quem prefere praticidade.</TStep>
              <TStep n={2}><strong>Nível 2 — Verificação por Nome:</strong> O visitante precisa digitar o <strong>seu nome corretamente</strong> antes de conseguir ligar. O sistema aceita variações (maiúscula, minúscula, com ou sem acento). Bom equilíbrio entre segurança e praticidade.</TStep>
              <TStep n={3}><strong>Nível 3 — Autorização Completa:</strong> O visitante precisa informar <strong>nome, empresa e tirar uma foto</strong>. Você recebe tudo isso no app e decide se <strong>autoriza ou recusa</strong> antes da chamada iniciar. Máxima segurança.</TStep>
              <p style={{ marginTop: "8px", fontSize: "13px", color: "#1e40af" }}>👉 <strong>Recomendação:</strong> Nível 2 é o mais usado — simples pro visitante e seguro pra você.</p>
            </TSection>
            <TSection icon={<span>🌙</span>} title="HORÁRIO SILENCIOSO">
              <TBullet>Ative o <strong>horário silencioso</strong> para não receber chamadas em determinados horários</TBullet>
              <TBullet>Defina o <strong>horário de início</strong> e <strong>horário de fim</strong> (ex: 22:00 às 07:00)</TBullet>
              <TBullet>Durante o período silencioso, visitantes veem a mensagem <strong>"Morador indisponível no momento"</strong></TBullet>
              <TBullet>Ideal para <strong>noites, madrugadas e horários de descanso</strong></TBullet>
              <p style={{ marginTop: "8px", fontSize: "13px", color: "#1e40af" }}>👉 <strong>Dica:</strong> O horário silencioso funciona automaticamente — você não precisa ativar e desativar todo dia.</p>
            </TSection>
            <TSection icon={<span>🚫</span>} title="LISTA DE BLOQUEADOS">
              <TBullet>Adicione nomes de pessoas que você <strong>não quer receber chamadas</strong></TBullet>
              <TBullet>Se o visitante informar um nome bloqueado, a chamada é <strong>automaticamente recusada</strong></TBullet>
              <TBullet>Você pode <strong>adicionar e remover</strong> nomes da lista a qualquer momento</TBullet>
              <TBullet>Funciona nos <strong>3 níveis de segurança</strong></TBullet>
            </TSection>
            <TSection icon={<span>📱</span>} title="COMO FUNCIONA NA PRÁTICA">
              <TStep n={1}>Visitante chega no bloco e <strong>escaneia o QR Code</strong></TStep>
              <TStep n={2}>Seleciona seu <strong>apartamento</strong> na lista</TStep>
              <TStep n={3}>Passa pelo <strong>nível de segurança</strong> que você configurou</TStep>
              <TStep n={4}>Você recebe a <strong>chamada no app</strong> com toque sonoro</TStep>
              <TStep n={5}>Você vê o <strong>vídeo do visitante</strong> (ele só ouve sua voz)</TStep>
              <TStep n={6}>Pode <strong>atender</strong>, <strong>recusar</strong> ou <strong>abrir o portão</strong></TStep>
            </TSection>
            <TSection icon={<span>⭐</span>} title="DICAS IMPORTANTES">
              <TBullet>Mantenha o <strong>app aberto</strong> ou em segundo plano para receber chamadas</TBullet>
              <TBullet>No nível 2, seu nome pode ser configurado — coloque como os visitantes te conhecem</TBullet>
              <TBullet>Acesse o <strong>histórico de chamadas</strong> para ver quem ligou e quando</TBullet>
              <TBullet>Todas as chamadas ficam <strong>registradas</strong> mesmo que você não atenda</TBullet>
              <TBullet>O interfone funciona no <strong>navegador do celular</strong> — sem precisar instalar nada pro visitante</TBullet>
              <TBullet>Visitantes têm acesso ao botão <strong>PORTARIA</strong> para ligar direto para o porteiro — essas chamadas <strong>vão para o funcionário</strong>, não para você</TBullet>
            </TSection>
          </TutorialButton>
        </div>
      </header>
  );
}

/* ═══════════════════════════════════════════════
   MORADOR — Configuração do Interfone Digital
   Níveis de segurança, horários silenciosos, etc.
   ═══════════════════════════════════════════════ */
export default function MoradorInterfoneConfig() {
  const { isDark, p } = useTheme();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [config, setConfig] = useState<InterfoneConfig>({
    nivel_seguranca: 1,
    nome_validacao: user?.name || "",
    horario_silencioso_inicio: null,
    horario_silencioso_fim: null,
    bloqueados: "[]",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [silenciosoEnabled, setSilenciosoEnabled] = useState(false);
  const [newBloqueado, setNewBloqueado] = useState("");
  const c = interfoneContentColors(isDark);

  useEffect(() => {
    apiFetch(`${API}/interfone/config`)
      .then((res) => res.json())
      .then((data) => {
        if (data?.nivel_seguranca) {
          setConfig(data);
          setSilenciosoEnabled(!!(data.horario_silencioso_inicio && data.horario_silencioso_fim));
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await apiFetch(`${API}/interfone/config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildSaveBody(config, silenciosoEnabled)),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Erro ao salvar.");
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch { setError("Erro de conexão."); }
    finally { setSaving(false); }
  };

  const bloqueados = parseBloqueados(config.bloqueados);

  const addBloqueado = () => {
    if (!newBloqueado.trim()) return;
    const updated = [...bloqueados, newBloqueado.trim()];
    setConfig({ ...config, bloqueados: JSON.stringify(updated) });
    setNewBloqueado("");
  };

  const removeBloqueado = (idx: number) => {
    const updated = bloqueados.filter((_, i) => i !== idx);
    setConfig({ ...config, bloqueados: JSON.stringify(updated) });
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100dvh', background: c.gradientBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100dvh', background: c.gradientBg, display: 'flex', flexDirection: 'column' }}>
      <InterfoneHeader isDark={isDark} onBack={() => navigate(-1)} />

      <main className="flex-1 pb-16" style={{ maxWidth: 800, margin: "0 auto", width: "100%", padding: "24px 24px 48px" }}>
        {/* Success */}
        {saved && (
          <div className="flex items-center gap-4 rounded-xl" style={{ background: c.successBg, border: c.successBorder, padding: '18px', marginBottom: '24px' }}>
            <CheckCircle2 className="w-5 h-5" style={{ color: c.successColor }} />
            <span className="font-medium" style={{ fontSize: '17px', color: c.successColor }}>Configurações salvas!</span>
          </div>
        )}

        {/* Security Level */}
        <section style={{ marginBottom: '54px' }}>
          <h2 className="font-bold flex items-center" style={{ color: c.subText, fontSize: '18px', marginBottom: '18px', gap: '12px' }}>
            <Shield className="w-5 h-5" /> Nível de Segurança
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {securityLevels.map((sl) => (
              <SecurityLevelCard
                key={sl.level}
                sl={sl}
                selected={config.nivel_seguranca === sl.level}
                isDark={isDark}
                onSelect={() => setConfig({ ...config, nivel_seguranca: sl.level })}
              />
            ))}
          </div>
        </section>

        {/* Level 2 - Name validation */}
        {config.nivel_seguranca === 2 && (
          <NameValidationSection
            isDark={isDark}
            value={config.nome_validacao}
            onChange={(v) => setConfig({ ...config, nome_validacao: v })}
          />
        )}

        {/* Silent hours */}
        <SilentHoursSection
          isDark={isDark}
          enabled={silenciosoEnabled}
          onToggle={() => setSilenciosoEnabled(!silenciosoEnabled)}
          inicio={config.horario_silencioso_inicio}
          fim={config.horario_silencioso_fim}
          onChangeInicio={(v) => setConfig({ ...config, horario_silencioso_inicio: v })}
          onChangeFim={(v) => setConfig({ ...config, horario_silencioso_fim: v })}
        />

        {/* Blocked list */}
        <BlockedListSection
          isDark={isDark}
          bloqueados={bloqueados}
          newBloqueado={newBloqueado}
          onChangeNew={setNewBloqueado}
          onAdd={addBloqueado}
          onRemove={removeBloqueado}
        />

        {/* Call history link */}
        <section style={{ marginBottom: '54px' }}>
          <button
            onClick={() => navigate('/morador/interfone-historico')}
            className="w-full flex items-center rounded-xl"
            style={{ background: c.panelBg, border: c.panelBorder, padding: '24px', gap: '18px' }}
          >
            <div style={{ width: 44, height: 44, borderRadius: 14, background: interfoneHeaderColors(isDark).iconBoxBg, border: interfoneHeaderColors(isDark).iconBoxBorder, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <History style={{ width: '22px', height: '22px', color: c.subText }} />
            </div>
            <div className="flex-1 text-left">
              <p className="font-bold" style={{ color: c.text, fontSize: '17px' }}>Histórico de Chamadas</p>
              <p style={{ fontSize: '15px', color: c.subText }}>Ver chamadas recebidas pelo interfone</p>
            </div>
            <ArrowLeft className="rotate-180" style={{ width: '18px', height: '18px', color: c.accentLight }} />
          </button>
        </section>

        {/* Error */}
        {error && (
          <div className="rounded-xl" style={{ background: c.errorBg, border: c.errorBorder, padding: '18px', marginBottom: '24px' }}>
            <p style={{ fontSize: '17px', color: c.errorColor }}>{error}</p>
          </div>
        )}

        {/* Success */}
        {saved && (
          <div className="rounded-xl flex items-center gap-3" style={{ background: c.successBg, border: c.successBorder, padding: '18px', marginBottom: '24px' }}>
            <CheckCircle2 style={{ width: '20px', height: '20px', color: c.successColor, flexShrink: 0 }} />
            <p style={{ fontSize: '17px', color: c.successColor, fontWeight: 600, margin: 0 }}>Configuração salva com sucesso!</p>
          </div>
        )}

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full rounded-xl font-bold flex items-center justify-center transition-all"
          style={{ background: c.saveBtnBg, border: c.saveBtnBorder, color: '#fff', fontSize: '17px', padding: '21px 0', gap: '12px' }}
        >
          <Save className="w-5 h-5" />
          {saving ? 'Salvando...' : 'Salvar Configurações'}
        </button>
      </main>
    </div>
  );
}
