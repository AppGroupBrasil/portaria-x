import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, getRoleLabel } from "@/hooks/useAuth";
import TutorialButton, { TSection, TStep, TBullet } from "@/components/TutorialButton";
import {
  Users,
  ArrowLeft,
  Pencil,
  Trash2,
  Search,
  X,
  Shield,
  Building2,
  Filter,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useTheme } from "@/hooks/useTheme";

const API = "/api";

interface User {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  cpf: string | null;
  role: string;
  unit: string | null;
  block: string | null;
  condominio_id: number | null;
  condominio_nome: string | null;
  parent_administradora_id: number | null;
  parent_administradora_nome: string | null;
  created_at: string;
}

const ALL_ROLES = [
  { value: "all", label: "Todos" },
  { value: "master", label: "Master" },
  { value: "administradora", label: "Administradora" },
  { value: "sindico", label: "Síndico" },
  { value: "funcionario", label: "Funcionário" },
  { value: "morador", label: "Morador" },
];

const ALL_ASSIGNABLE_ROLES = [
  { value: "master", label: "Master" },
  { value: "administradora", label: "Administradora" },
  { value: "sindico", label: "Síndico" },
  { value: "funcionario", label: "Funcionário" },
  { value: "morador", label: "Morador" },
];

export default function MasterUsuarios() {
  const { isDark, p } = useTheme();
  const { user: currentUser, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", cpf: "", role: "morador", unit: "", block: "", password: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [condominios, setCondominios] = useState<{ id: number; name: string }[]>([]);
  const [selectedCondominioId, setSelectedCondominioId] = useState<string>("");

  const isMaster = currentUser?.role === "master";
  const isAdmin = currentUser?.role === "administradora";
  // Non-master users cannot see/filter/assign the "master" role
  // Administradoras also cannot see/filter/assign the "administradora" role
  const ROLES = isMaster
    ? ALL_ROLES
    : isAdmin
      ? ALL_ROLES.filter(r => r.value !== "master" && r.value !== "administradora")
      : ALL_ROLES.filter(r => r.value !== "master");
  const ASSIGNABLE_ROLES = isMaster
    ? ALL_ASSIGNABLE_ROLES
    : isAdmin
      ? ALL_ASSIGNABLE_ROLES.filter(r => r.value !== "master" && r.value !== "administradora")
      : ALL_ASSIGNABLE_ROLES.filter(r => r.value !== "master");

  useEffect(() => {
    if (authLoading) return; // Wait for auth to resolve
    if (currentUser?.role !== "master" && currentUser?.role !== "administradora") {
      navigate("/dashboard");
      return;
    }
    fetchUsers();
    fetchCondominios();
  }, [roleFilter, page, currentUser, authLoading]);

  async function fetchUsers() {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ role: roleFilter, page: String(page), limit: "20" });
      if (search) params.set("search", search);
      const res = await apiFetch(`${API}/master/users?${params}`);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setError(errData.error || `Erro ao carregar usuários (${res.status})`);
        setUsers([]);
        setTotal(0);
        return;
      }
      const data = await res.json();
      setUsers(data.users || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error(err);
      setError("Erro de conexão ao carregar usuários.");
    } finally {
      setLoading(false);
    }
  }

  async function fetchCondominios() {
    try {
      const res = await apiFetch(`${API}/condominios`);
      const data = await res.json();
      setCondominios(data);
    } catch (err) {
      console.error(err);
    }
  }

  function handleSearch() {
    setPage(1);
    fetchUsers();
  }

  function handleEdit(u: User) {
    setEditingId(u.id);
    setForm({
      name: u.name,
      email: u.email,
      phone: u.phone || "",
      cpf: u.cpf || "",
      role: u.role,
      unit: u.unit || "",
      block: u.block || "",
      password: "",
    });
    setSelectedCondominioId(String(u.condominio_id || ""));
    setShowForm(true);
    setError("");
  }

  async function handleSave() {
    if (!form.name.trim() || !form.email.trim()) {
      setError("Nome e email são obrigatórios.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const body: any = { ...form };
      if (selectedCondominioId) body.condominio_id = Number.parseInt(selectedCondominioId);
      if (!body.password) delete body.password;

      const res = await apiFetch(`${API}/master/users/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setShowForm(false);
      fetchUsers();
    } catch (err: any) {
      setError(err.message || "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(u: User) {
    if (u.id === currentUser?.id) {
      alert("Você não pode excluir seu próprio usuário.");
      return;
    }
    if (!confirm(`Excluir "${u.name}" (${u.email})?`)) return;
    try {
      const res = await apiFetch(`${API}/master/users/${u.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      fetchUsers();
    } catch (err: any) {
      alert(err.message || "Erro ao excluir.");
    }
  }

  const roleColor: Record<string, string> = {
    master: "text-red-400",
    administradora: "text-purple-400",
    sindico: "text-amber-400",
    funcionario: "text-emerald-400",
    morador: "text-sky-400",
  };

  const roleBorder: Record<string, string> = {
    master: "border-red-400",
    administradora: "border-purple-400",
    sindico: "border-amber-400",
    funcionario: "border-emerald-400",
    morador: "border-sky-400",
  };

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: p.pageBg }}>
      {/* Header */}
      <header className="sticky top-0 z-40" style={{ background: p.headerBg, borderBottom: p.headerBorder, color: p.text }}>
        <div className="h-16 flex items-center gap-3" style={{ paddingLeft: "1rem", paddingRight: "1rem" }}>
          <button onClick={() => navigate("/dashboard")} className="p-2">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <Users className="w-6 h-6" />
          <span className="font-semibold text-lg">Gestão de Usuários</span>
          <TutorialButton title="Gestão de Usuários">
            <TSection icon={<span>📋</span>} title="O QUE É ESTA FUNÇÃO?">
              <p><strong>Painel Master</strong> para visualizar e gerenciar <strong>todos os usuários de todos os condomínios</strong> em um só lugar. Inclui administradoras, síndicos, funcionários e moradores. Permite buscar, filtrar, editar e excluir qualquer usuário do sistema inteiro.</p>
            </TSection>
            <TSection icon={<span>🏗️</span>} title="COMO USAR">
              <TStep n={1}>A lista mostra <strong>todos os usuários</strong> cadastrados no sistema com nome, cargo e condomínio</TStep>
              <TStep n={2}>Use a <strong>barra de busca</strong> para encontrar por nome, e-mail ou condomínio</TStep>
              <TStep n={3}>Use o <strong>filtro por cargo</strong> para ver apenas um tipo: Master, Administradora, Síndico, Funcionário ou Morador</TStep>
              <TStep n={4}>Clique em um usuário para ver <strong>detalhes completos</strong> (dados pessoais, condomínio, cargo)</TStep>
              <TStep n={5}>Use os botões para <strong>editar dados</strong> ou <strong>excluir</strong> o usuário</TStep>
            </TSection>
            <TSection icon={<span>🔧</span>} title="FILTROS E BUSCA">
              <TBullet><strong>Busca global</strong> — Pesquise por nome, e-mail ou nome do condomínio</TBullet>
              <TBullet><strong>Filtro por cargo</strong> — Selecione o tipo de usuário para exibir (Master, Admin, Síndico, Funcionário, Morador)</TBullet>
              <TBullet><strong>Contagem total</strong> — Número total de usuários cadastrados aparece no cabeçalho</TBullet>
              <TBullet><strong>Identificação visual</strong> — Cada tipo de usuário tem uma cor/badge diferente para fácil identificação</TBullet>
            </TSection>
            <TSection icon={<span>📱</span>} title="TIPOS DE USUÁRIO">
              <TBullet><strong>Master</strong> — Nível mais alto, gerencia todo o sistema</TBullet>
              <TBullet><strong>Administradora</strong> — Empresa que gerencia vários condomínios</TBullet>
              <TBullet><strong>Síndico</strong> — Responsável direto por um condomínio</TBullet>
              <TBullet><strong>Funcionário</strong> — Porteiro, zelador, gerente (operação diária)</TBullet>
              <TBullet><strong>Morador</strong> — Residente do condomínio (usa o app para visitantes, delivery, etc.)</TBullet>
            </TSection>
            <TSection icon={<span>⭐</span>} title="DICAS IMPORTANTES">
              <TBullet>Esta tela é <strong>exclusiva do usuário Master</strong> — síndicos e administradoras não têm acesso</TBullet>
              <TBullet>A exclusão de usuário aqui é <strong>permanente</strong> e revoga o acesso imediatamente</TBullet>
              <TBullet>Use os filtros para <strong>auditar</strong> quantos usuários de cada tipo existem no sistema</TBullet>
              <TBullet>Para redefinir senha de qualquer usuário, clique em <strong>editar</strong></TBullet>
            </TSection>
          </TutorialButton>
          <div className="flex-1" />
          <span className="text-sm opacity-80">{total} total</span>
        </div>
      </header>

      {/* Search + Filter */}
      <div style={{ paddingLeft: "1rem", paddingRight: "1rem", paddingTop: "2rem", paddingBottom: "1.5rem" }}>
        <div className="space-y-8">
        <div className="flex items-center gap-2 h-12 px-4 rounded-lg border border-border">
          <Search className="w-5 h-5 shrink-0" style={{ color: p.textSecondary }} />
          <input
            type="text"
            placeholder="Buscar nome, email ou CPF..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="flex-1 bg-transparent text-lg focus:outline-none"
            style={{ color: p.text, "--tw-placeholder-opacity": 1 } as any}
          />
          {search && (
            <button onClick={() => { setSearch(""); setTimeout(fetchUsers, 0); }}>
              <X className="w-4 h-4" style={{ color: p.textSecondary }} />
            </button>
          )}
        </div>
        <div className="flex gap-3 overflow-x-auto pb-1" style={{ paddingLeft: "0.5rem", paddingRight: "0.5rem", marginTop: "19px" }}>
          {ROLES.map((r) => (
            <button
              key={r.value}
              onClick={() => { setRoleFilter(r.value); setPage(1); }}
              className="text-base font-medium whitespace-nowrap transition-colors"
              style={
                roleFilter === r.value
                  ? { background: p.accent, color: p.cardBg, padding: "10px 24px", borderRadius: "8px" }
                  : { color: p.textAccent, padding: "10px 24px", borderRadius: "8px" }
              }
            >
              {r.label}
            </button>
          ))}
        </div>
        </div>
      </div>

      {/* Edit Form */}
      {showForm && (
        <div className="pb-4" style={{ paddingLeft: "1rem", paddingRight: "1rem" }}>
          <div className="rounded-xl border border-sky-500/30 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Editar Usuário</h3>
              <button onClick={() => setShowForm(false)}>
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            {error && <p className="text-xs text-red-400">{error}</p>}
            <input
              placeholder="Nome *"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/40"
            />
            <input
              placeholder="Email *"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/40"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                placeholder="Telefone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/40"
              />
              <input
                placeholder="CPF"
                value={form.cpf}
                onChange={(e) => setForm({ ...form, cpf: e.target.value })}
                className="h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/40"
              />
            </div>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/40"
            >
              {ASSIGNABLE_ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
            <select
              value={selectedCondominioId}
              onChange={(e) => setSelectedCondominioId(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/40"
            >
              <option value="">Sem condomínio</option>
              {condominios.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-3">
              <input
                placeholder="Unidade"
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                className="h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/40"
              />
              <input
                placeholder="Bloco"
                value={form.block}
                onChange={(e) => setForm({ ...form, block: e.target.value })}
                className="h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/40"
              />
            </div>
            <input
              placeholder="Nova senha (deixe vazio para manter)"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/40"
            />
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full h-10 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
              style={{ backgroundColor: p.accent, color: p.cardBg }}
            >
              {saving ? "Salvando..." : "Salvar Alterações"}
            </button>
          </div>
        </div>
      )}

      {/* Users List */}
      <main className="flex-1 space-y-5" style={{ paddingLeft: "1rem", paddingRight: "1rem", paddingTop: "1rem", paddingBottom: "3.5rem" }}>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <p className="text-center text-sm py-8 text-red-400">{error}</p>
        ) : users.length === 0 ? (
          <p className="text-center text-sm py-8" style={{ color: p.textSecondary }}>Nenhum usuário encontrado.</p>
        ) : (
          <>
            {users.filter(u => {
              if (!isMaster && u.role === "master") return false;
              if (isAdmin && u.role === "administradora") return false;
              return true;
            }).map((u) => (
              <div key={u.id} className="flex items-center gap-4 px-5 py-4 rounded-xl">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${roleColor[u.role] || "text-sky-400"}`}>
                  <Shield className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-lg font-medium truncate" style={{ color: p.textHeading }}>{u.name}</p>
                  <p className="text-sm truncate" style={{ color: p.textSecondary }}>{u.email}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className={`text-sm font-medium ${roleColor[u.role] || "text-sky-400"}`}>
                      {getRoleLabel(u.role)}
                    </span>
                    {u.condominio_nome && (
                      <span className="text-sm flex items-center gap-0.5" style={{ color: p.textSecondary }}>
                        <Building2 className="w-3 h-3" />
                        {u.condominio_nome}
                      </span>
                    )}
                    {u.parent_administradora_nome && (
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: p.accentLight, color: p.accent }}>
                        Sub de {u.parent_administradora_nome}
                      </span>
                    )}
                  </div>
                </div>
                {/* Only master can edit/delete master users; no one can edit/delete themselves */}
                {(isMaster || u.role !== "master") && (
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => handleEdit(u)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: p.accent }}
                    >
                      <Pencil className="w-3.5 h-3.5 text-white" />
                    </button>
                    {u.id !== currentUser?.id && (
                      <button
                        onClick={() => handleDelete(u)}
                        className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}

            {/* Pagination */}
            {total > 20 && (
              <div className="flex items-center justify-center gap-3 pt-3">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 rounded-lg bg-card text-sm disabled:opacity-30"
                  style={{ color: p.textAccent }}
                >
                  Anterior
                </button>
                <span className="text-xs" style={{ color: p.textSecondary }}>
                  Página {page} de {Math.ceil(total / 20)}
                </span>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page * 20 >= total}
                  className="px-4 py-2 rounded-lg bg-card text-sm disabled:opacity-30"
                  style={{ color: p.textAccent }}
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
