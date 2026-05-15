import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import TutorialButton, { TSection, TStep, TBullet } from "@/components/TutorialButton";
import {
  FileText,
  ArrowLeft,

  User,
  Building2,
  Trash2,
  Pencil,
  Settings,

  Clock,

} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useTheme } from "@/hooks/useTheme";

const API = "/api";

interface AuditLog {
  id: number;
  user_id: number;
  action: string;
  entity_type: string;
  entity_id: number | null;
  details: string;
  created_at: string;
  user_name: string | null;
  user_email: string | null;
}

const ACTION_LABELS: Record<string, { label: string; color: string; icon: any }> = {
  EDIT_USER: { label: "Editar Usuário", color: "text-sky-400 bg-sky-500/10", icon: Pencil },
  DELETE_USER: { label: "Excluir Usuário", color: "text-red-400 bg-red-500/10", icon: Trash2 },
  UPDATE_CONFIG: { label: "Configuração", color: "text-amber-400 bg-amber-500/10", icon: Settings },
  DELETE_CONDOMINIO: { label: "Excluir Condomínio", color: "text-red-400 bg-red-500/10", icon: Building2 },
  CREATE_USER: { label: "Criar Usuário", color: "text-emerald-400 bg-emerald-500/10", icon: User },
};

const ACTION_FILTERS = [
  { value: "", label: "Todas" },
  { value: "EDIT_USER", label: "Edição" },
  { value: "DELETE_USER", label: "Exclusão" },
  { value: "UPDATE_CONFIG", label: "Config" },
];

export default function MasterLogs() {
  const { p } = useTheme();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState("");

  useEffect(() => {
    if (user?.role !== "master" && user?.role !== "administradora") {
      navigate("/dashboard");
      return;
    }
    fetchLogs();
  }, [page, actionFilter]);

  async function fetchLogs() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "30" });
      if (actionFilter) params.set("action", actionFilter);
      const res = await apiFetch(`${API}/master/logs?${params}`);
      const data = await res.json();
      setLogs(data.logs || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleDateString("pt-BR") + " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  }

  return (
    <div className="min-h-dvh bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40" style={{ background: p.headerBg, borderBottom: p.headerBorder, boxShadow: p.headerShadow, color: p.text, paddingTop: "max(0, env(safe-area-inset-top))" }}>
        <div className="px-4 h-16 flex items-center gap-3">
          <button onClick={() => navigate("/dashboard")} className="p-1">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <FileText className="w-5 h-5" />
          <span className="font-semibold text-sm">Logs de Auditoria</span>
          <TutorialButton title="Logs de Auditoria">
            <TSection icon={<span>📋</span>} title="O QUE É ESTA FUNÇÃO?">
              <p><strong>Registro completo de todas as ações</strong> realizadas no sistema. Cada vez que alguém cria, edita, exclui ou faz login, a ação é registrada automaticamente aqui. Essencial para <strong>auditoria, segurança e investigação</strong> de problemas.</p>
            </TSection>
            <TSection icon={<span>🏗️</span>} title="COMO USAR">
              <TStep n={1}>A lista mostra as ações mais recentes no topo, em <strong>ordem cronológica reversa</strong></TStep>
              <TStep n={2}>Use a <strong>barra de busca</strong> para encontrar ações específicas por texto</TStep>
              <TStep n={3}>Use os <strong>filtros</strong> para refinar: tipo de ação, usuário responsável ou período (data)</TStep>
              <TStep n={4}>Clique em um registro para ver os <strong>detalhes completos</strong> da ação</TStep>
            </TSection>
            <TSection icon={<span>🔧</span>} title="INFORMAÇÕES REGISTRADAS">
              <TBullet><strong>Quem</strong> — Nome, cargo e condomínio do usuário que realizou a ação</TBullet>
              <TBullet><strong>O que</strong> — Tipo de ação (criação, edição, exclusão, login, configuração)</TBullet>
              <TBullet><strong>Quando</strong> — Data e hora exata da ação</TBullet>
              <TBullet><strong>Onde</strong> — Condomínio e seção do sistema onde ocorreu</TBullet>
              <TBullet><strong>Detalhes</strong> — O que exatamente foi alterado (valores antes/depois)</TBullet>
            </TSection>
            <TSection icon={<span>📱</span>} title="TIPOS DE AÇÃO REGISTRADOS">
              <TBullet><strong>Login/Logout</strong> — Entradas e saídas de usuários no sistema</TBullet>
              <TBullet><strong>Cadastros</strong> — Criação de moradores, funcionários, visitantes, etc.</TBullet>
              <TBullet><strong>Edições</strong> — Alterações de dados em qualquer cadastro</TBullet>
              <TBullet><strong>Exclusões</strong> — Remoção de registros do sistema</TBullet>
              <TBullet><strong>Configurações</strong> — Alterações de configuração (câmeras, rondas, portões e integrações)</TBullet>
            </TSection>
            <TSection icon={<span>⭐</span>} title="DICAS IMPORTANTES">
              <TBullet>Esta tela é <strong>exclusiva do usuário Master</strong> — apenas o Master tem visão global de todos os logs</TBullet>
              <TBullet>Os logs <strong>não podem ser editados ou excluídos</strong> — são imutáveis por segurança</TBullet>
              <TBullet>Use para <strong>investigar problemas</strong>: se algo sumiu, o log mostra quem excluiu e quando</TBullet>
              <TBullet>Acompanhe <strong>logins suspeitos</strong> para garantir a segurança do sistema</TBullet>
            </TSection>
          </TutorialButton>
          <div className="flex-1" />
          <span className="text-xs opacity-80">{total} registros</span>
        </div>
      </header>

      {/* Filter */}
      <div className="px-4 py-3">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {ACTION_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => { setActionFilter(f.value); setPage(1); }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                actionFilter === f.value
                  ? "bg-[#003580] text-white"
                  : "bg-card text-muted-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Logs List */}
      <main className="flex-1 px-4 pb-6 space-y-2">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center">
            <FileText className="w-12 h-12 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">Nenhum log registrado ainda.</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Ações do master são registradas automaticamente.
            </p>
          </div>
        ) : (
          <>
            {logs.map((log) => {
              const meta = ACTION_LABELS[log.action] || {
                label: log.action,
                color: "text-sky-400 bg-sky-500/10",
                icon: FileText,
              };
              const IconComp = meta.icon;

              return (
                <div
                  key={log.id}
                  className="rounded-xl bg-card p-3"
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${meta.color}`}>
                      <IconComp className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${meta.color}`}>
                          {meta.label}
                        </span>
                        <span className="text-[9px] text-muted-foreground ml-auto flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(log.created_at)}
                        </span>
                      </div>
                      <p className="text-xs text-foreground/80 mt-1">{log.details}</p>
                      {log.user_name && (
                        <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {log.user_name} ({log.user_email})
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Pagination */}
            {total > 30 && (
              <div className="flex items-center justify-center gap-3 pt-3">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 rounded-lg bg-card text-sm text-foreground disabled:opacity-30"
                >
                  Anterior
                </button>
                <span className="text-xs text-muted-foreground">
                  Página {page} de {Math.ceil(total / 30)}
                </span>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page * 30 >= total}
                  className="px-4 py-2 rounded-lg bg-card text-sm text-foreground disabled:opacity-30"
                >
                  Próxima
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
