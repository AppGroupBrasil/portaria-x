import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import TutorialButton, { FlowPortaria, FlowMorador, TSection, TStep, TBullet } from "@/components/TutorialButton";
import {
  ArrowLeft,
  ShieldCheck,
  Plus,
  Send,
  Link2,
  X,
  Calendar,
  Clock,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronDown,
  Trash2,
  Pencil,
  AlertCircle,
  Ban,
  User,
} from "lucide-react";
import { APP_ORIGIN } from "@/lib/config";
import { apiFetch } from "@/lib/api";
import { useTheme } from "@/hooks/useTheme";
import ComoFunciona from "@/components/ComoFunciona";

interface PreAuth {
  id: number;
  morador_name: string;
  bloco: string | null;
  apartamento: string | null;
  visitante_nome: string;
  visitante_documento: string | null;
  visitante_telefone: string | null;
  visitante_foto: string | null;
  tipo: string;
  data_inicio: string;
  data_fim: string;
  hora_inicio: string | null;
  hora_fim: string | null;
  observacao: string | null;
  status: string;
  entrada_confirmada_at: string | null;
  token: string;
  created_at: string;
}

interface PendingVisitor {
  id: number;
  nome: string;
  documento: string | null;
  telefone: string | null;
  foto: string | null;
  documento_foto: string | null;
  bloco: string | null;
  apartamento: string | null;
  quem_autorizou: string | null;
  status: string;
  created_at: string;
}

const API = "/api";

export default function MoradorAutorizacoes() {
  const { isDark, p } = useTheme();
  const navigate = useNavigate();
  const [auths, setAuths] = useState<PreAuth[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [formType, setFormType] = useState<"simples" | "auto_cadastro">("simples");
  const [editingId, setEditingId] = useState<number | null>(null);

  // ── Pending visitors from portaria ──
  const [pendingVisitors, setPendingVisitors] = useState<PendingVisitor[]>([]);
  const [respondingVisitorId, setRespondingVisitorId] = useState<number | null>(null);

  const [form, setForm] = useState({
    visitante_nome: "",
    visitante_documento: "",
    visitante_telefone: "",
    data_inicio: new Date().toISOString().split("T")[0],
    data_fim: new Date().toISOString().split("T")[0],
    hora_inicio: "",
    hora_fim: "",
    observacao: "",
  });

  const fetchAuths = async () => {
    try {
      const res = await apiFetch(`${API}/pre-authorizations`);
      if (res.ok) {
        const data = await res.json();
        setAuths(data);
      }
    } catch (err) {
      console.error("Erro ao buscar autorizações:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingVisitors = async () => {
    try {
      const res = await apiFetch(`${API}/visitors/pendentes-morador`);
      if (res.ok) {
        const data = await res.json();
        setPendingVisitors(data);
      }
    } catch (err) {
      console.error("Erro ao buscar visitantes pendentes:", err);
    }
  };

  const handleRespondVisitor = async (id: number, status: "liberado" | "recusado") => {
    try {
      setRespondingVisitorId(id);
      const res = await apiFetch(`${API}/visitors/${id}/responder-morador`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        fetchPendingVisitors();
      } else {
        const data = await res.json();
        alert(data.error || "Erro ao responder.");
      }
    } catch {
      alert("Erro de conexão.");
    } finally {
      setRespondingVisitorId(null);
    }
  };

  useEffect(() => {
    fetchAuths();
    fetchPendingVisitors();
  }, []);

  const formatPhone = (value: string) => {
    const digits = value.replaceAll(/\D/g, "").slice(0, 11);
    if (digits.length <= 2) return digits.length ? `(${digits}` : "";
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  const handleEdit = (a: PreAuth) => {
    setEditingId(a.id);
    setForm({
      visitante_nome: a.visitante_nome,
      visitante_documento: a.visitante_documento || "",
      visitante_telefone: a.visitante_telefone || "",
      data_inicio: a.data_inicio,
      data_fim: a.data_fim,
      hora_inicio: a.hora_inicio || "",
      hora_fim: a.hora_fim || "",
      observacao: a.observacao || "",
    });
    setFormType(a.tipo as any || "simples");
    setShowForm(true);
    setError("");
  };

  const handleSubmit = async () => {
    if (!form.visitante_nome.trim()) {
      setError("Nome do visitante é obrigatório.");
      return;
    }
    if (!form.data_inicio || !form.data_fim) {
      setError("Datas são obrigatórias.");
      return;
    }
    setError("");
    setSaving(true);

    try {
      // ── Edit mode ──
      if (editingId) {
        const res = await apiFetch(`${API}/pre-authorizations/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (!res.ok) {
          const data = await res.json();
          setError(data.error || "Erro ao editar autorização.");
          setSaving(false);
          return;
        }
        setForm({
          visitante_nome: "", visitante_documento: "", visitante_telefone: "",
          data_inicio: new Date().toISOString().split("T")[0],
          data_fim: new Date().toISOString().split("T")[0],
          hora_inicio: "", hora_fim: "", observacao: "",
        });
        setEditingId(null);
        setShowForm(false);
        fetchAuths();
        setSaving(false);
        return;
      }

      // ── Create mode ──
      const res = await apiFetch(`${API}/pre-authorizations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          tipo: formType,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Erro ao criar autorização.");
        setSaving(false);
        return;
      }

      const auth: PreAuth = await res.json();

      // Se tipo auto_cadastro, abrir compartilhamento com o link
      if (formType === "auto_cadastro") {
        const selfRegisterUrl = `${APP_ORIGIN}/autorizacao/auto-cadastro/${auth.token}`;
        const msgLines = [
          `*Autorizacao de Entrada*`,
          ``,
          `Ola ${form.visitante_nome}!`,
          `Voce foi autorizado(a) a entrar no condominio.`,
          ``,
          `Por favor, preencha seus dados clicando no link abaixo:`,
          `${selfRegisterUrl}`,
          ``,
          `*Validade:* ${formatDate(form.data_inicio)} a ${formatDate(form.data_fim)}`,
          form.hora_inicio ? `*Horario:* ${form.hora_inicio} às ${form.hora_fim || "--"}` : "",
          form.observacao ? `*Obs:* ${form.observacao}` : "",
        ].filter(Boolean);

        const text = msgLines.join("\n");

        // Tentar Web Share API (nativo do celular)
        if (navigator.share) {
          try {
            await navigator.share({ title: "Autorização de Entrada", text });
          } catch {
            // Usuário cancelou o share, fallback pro WhatsApp
            globalThis.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
          }
        } else {
          // Desktop fallback: abre WhatsApp Web sem número (usuário escolhe o contato)
          globalThis.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
        }
      }

      // Reset
      setForm({
        visitante_nome: "", visitante_documento: "", visitante_telefone: "",
        data_inicio: new Date().toISOString().split("T")[0],
        data_fim: new Date().toISOString().split("T")[0],
        hora_inicio: "", hora_fim: "", observacao: "",
      });
      setEditingId(null);
      setShowForm(false);
      fetchAuths();
    } catch (err) {
      setError("Erro de conexão.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async (id: number) => {
    if (!confirm("Deseja cancelar esta autorização?")) return;
    try {
      await apiFetch(`${API}/pre-authorizations/${id}`, {
        method: "DELETE",
      });
      fetchAuths();
    } catch (err) {
      console.error("Erro ao cancelar:", err);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const [y, m, d] = dateStr.split("-");
    return `${d}/${m}/${y}`;
  };

  const statusStyle = (status: string) => {
    switch (status) {
      case "ativa": return { bg: "rgba(34,197,94,0.1)", color: "#4ade80", label: "Ativa" };
      case "utilizada": return { bg: "rgba(148,163,184,0.1)", color: "#94a3b8", label: "Utilizada" };
      case "expirada": return { bg: "rgba(107,114,128,0.1)", color: "#9ca3af", label: "Expirada" };
      case "cancelada": return { bg: "rgba(239,68,68,0.1)", color: "#f87171", label: "Cancelada" };
      default: return { bg: "rgba(107,114,128,0.1)", color: "#9ca3af", label: status };
    }
  };

  const tipoLabel = (tipo: string) => {
    if (tipo === "auto_cadastro") return "Auto Cadastro";
    return "Autorização Simples";
  };

  return (
    <div style={{ minHeight: '100dvh', background: isDark ? "linear-gradient(180deg, #001533 0%, #002254 25%, #003580 55%, #004aad 100%)" : "#f0f4f8", display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header className="sticky top-0 z-40" style={{ background: isDark ? "linear-gradient(135deg, #001533 0%, #002a66 50%, #004aad 100%)" : "#ffffff", borderBottom: isDark ? '1px solid rgba(255,255,255,0.08)' : "1px solid #e2e8f0", boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.3)' : "0 2px 8px rgba(0,0,0,0.06)", color: isDark ? '#fff' : "#1e293b", paddingTop: "max(0, env(safe-area-inset-top))" }}>
        <div className="px-4 h-16 flex items-center gap-3">
          <button onClick={() => navigate(-1)} style={{ width: 40, height: 40, borderRadius: 14, background: isDark ? 'rgba(255,255,255,0.08)' : '#f8fafc', border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid #cbd5e1', color: isDark ? '#fff' : "#1e293b", display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1">
            <h1 className="font-bold text-base" style={{ color: isDark ? '#fff' : "#1e293b" }}>Autorizar Visitante</h1>
            <p style={{ color: isDark ? '#93c5fd' : "#475569", fontSize: '10px' }}>Pré-autorize a entrada de visitantes</p>
          </div>
          <TutorialButton title="Autorizar Visitante">
            <TSection icon={<span>📋</span>} title="O QUE É ESTA FUNÇÃO?">
              <p>Você pode <strong>pré-autorizar visitantes com antecedência</strong> para que a portaria saiba que eles podem entrar quando chegarem. Basta informar o nome, data e horário da visita — a portaria recebe a autorização automaticamente e libera a entrada sem precisar te ligar.</p>
            </TSection>
            <FlowMorador>
              <TStep n={1}>Toque em <strong>"+"</strong> para criar nova autorização</TStep>
              <TStep n={2}>Preencha o <strong>nome completo</strong> do visitante</TStep>
              <TStep n={3}>Defina a <strong>data e horário</strong> previsto da visita</TStep>
              <TStep n={4}>Adicione <strong>CPF e veículo</strong> (opcional — ajuda na identificação)</TStep>
              <TStep n={5}>Toque em <strong>"Enviar"</strong> — a autorização vai automaticamente para a portaria</TStep>
              <p style={{ marginTop: "8px", fontSize: "13px", color: "#166534" }}>👉 <strong>Portaria vê:</strong> A autorização aparece na tela do porteiro com status "Ativa" e todos os dados. Quando o visitante chegar, o porteiro libera com um toque.</p>
            </FlowMorador>
            <FlowPortaria>
              <TStep n={1}>Visitante chega na portaria e se identifica</TStep>
              <TStep n={2}>Porteiro busca na lista de autorizações e confirma identidade</TStep>
              <TStep n={3}>Libera a entrada com um toque</TStep>
              <p style={{ marginTop: "8px", fontSize: "13px", color: "#2d3354" }}>👉 <strong>Você vê:</strong> No seu app, o status muda para "Utilizada" com a data e hora exata da entrada.</p>
            </FlowPortaria>
            <TSection icon={<span>🔍</span>} title="STATUS DAS SUAS AUTORIZAÇÕES">
              <TBullet><strong style={{ color: "#16a34a" }}>Ativa</strong> — Visitante autorizado, aguardando chegada</TBullet>
              <TBullet><strong style={{ color: "#2d3354" }}>Utilizada</strong> — Visitante já entrou no condomínio</TBullet>
              <TBullet><strong style={{ color: "#dc2626" }}>Expirada</strong> — O prazo venceu sem o visitante aparecer</TBullet>
              <TBullet><strong style={{ color: "#6b7280" }}>Cancelada</strong> — Você cancelou a autorização</TBullet>
            </TSection>
            <TSection icon={<span>⭐</span>} title="DICAS IMPORTANTES">
              <TBullet>Você pode <strong>cancelar</strong> uma autorização a qualquer momento antes do visitante chegar</TBullet>
              <TBullet>Autorizações <strong>expiram automaticamente</strong> após o horário definido</TBullet>
              <TBullet>Pode criar <strong>várias autorizações</strong> para visitantes diferentes ao mesmo tempo</TBullet>
              <TBullet>Para visitantes frequentes, use o <strong>QR Code</strong> — é mais prático</TBullet>
              <TBullet>A portaria <strong>não precisa te ligar</strong> para confirmar — a autorização já é a confirmação</TBullet>
            </TSection>
          </TutorialButton>
          <button
            onClick={() => { setShowForm(true); setError(""); setFormType("simples"); }}
            style={{ width: 40, height: 40, borderRadius: 14, background: isDark ? 'rgba(255,255,255,0.08)' : '#f8fafc', border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid #cbd5e1', color: isDark ? '#fff' : "#1e293b", display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div style={{ padding: "12px 24px 0" }}>
        <ComoFunciona steps={[
          "📋 Cadastre visitante com antecedência",
          "📱 Portaria recebe a pré-autorização automaticamente",
          "🚪 Visitante chega e portaria já tem autorização",
          "✅ Entrada liberada sem ligar para você",
        ]} />
      </div>

      {/* Type selector buttons */}
      {!showForm && (
        <div style={{ padding: "12px 24px", display: "flex", gap: "12px" }}>
          <button
            onClick={() => { setShowForm(true); setFormType("simples"); setError(""); }}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl text-xs font-semibold"
            style={{ minHeight: "52px", background: 'linear-gradient(135deg, rgba(59,130,246,0.3), rgba(59,130,246,0.15))', border: '1.5px solid rgba(59,130,246,0.4)', color: isDark ? '#fff' : "#1e293b" }}
          >
            <ShieldCheck className="w-4 h-4" />
            Autorização Simples
          </button>
          <button
            onClick={() => { setShowForm(true); setFormType("auto_cadastro"); setError(""); }}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl text-xs font-semibold"
            style={{ minHeight: "52px", background: 'linear-gradient(135deg, #25d366, #128C7E)', border: '1.5px solid #25d366', color: isDark ? '#fff' : "#1e293b" }}
          >
            <Link2 className="w-4 h-4" />
            Enviar Link WhatsApp
          </button>
        </div>
      )}

      {/* ═══ Pending Visitors from Portaria ═══ */}
      {pendingVisitors.length > 0 && (
        <div style={{ padding: "0 24px 12px" }}>
          <h3 style={{ fontWeight: 700, fontSize: "14px", color: "#fbbf24", marginBottom: "10px", display: "flex", alignItems: "center", gap: "12px" }}>
            <AlertCircle className="w-4 h-4" style={{ color: "#f59e0b" }} />
            Solicitações da Portaria ({pendingVisitors.length})
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {pendingVisitors.map((v) => (
              <div key={v.id} style={{
                background: p.surfaceBg, borderRadius: "14px", padding: "14px 16px",
                border: "2px solid rgba(245,158,11,0.3)", display: "flex", flexDirection: "column", gap: "10px",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  {v.foto ? (
                    <img
                      src={v.foto}
                      alt={v.nome}
                      style={{ width: "48px", height: "48px", borderRadius: "50%", objectFit: "cover", border: "2px solid #f59e0b" }}
                    />
                  ) : (
                    <div style={{
                      width: "48px", height: "48px", borderRadius: "50%", background: "rgba(245,158,11,0.15)",
                      display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid rgba(245,158,11,0.4)",
                    }}>
                      <User className="w-5 h-5" style={{ color: "#fbbf24" }} />
                    </div>
                  )}
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 700, fontSize: "14px", color: p.text }}>{v.nome}</p>
                    {v.documento && (
                      <p style={{ fontSize: "11px", color: isDark ? "#93c5fd" : "#475569" }}>Doc: {v.documento}</p>
                    )}
                    {v.telefone && (
                      <p style={{ fontSize: "11px", color: isDark ? "#93c5fd" : "#475569" }}>Tel: {v.telefone}</p>
                    )}
                    <p style={{ fontSize: "10px", color: isDark ? '#7dd3fc' : '#475569', marginTop: "2px" }}>
                      {new Date(v.created_at).toLocaleString("pt-BR")}
                    </p>
                  </div>
                </div>

                <div style={{
                  padding: "8px 12px", borderRadius: "10px",
                  background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)", fontSize: "12px", color: "#fcd34d", fontWeight: 500,
                }}>
                  ⚠️ A portaria está solicitando autorização para a entrada deste visitante.
                </div>

                {v.quem_autorizou && (
                  <p style={{ fontSize: "11px", color: isDark ? "#93c5fd" : "#475569", fontStyle: "italic" }}>
                    💬 Porteiro: {v.quem_autorizou}
                  </p>
                )}

                <div style={{ display: "flex", gap: "12px" }}>
                  <button
                    onClick={() => handleRespondVisitor(v.id, "liberado")}
                    disabled={respondingVisitorId === v.id}
                    style={{
                      flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "12px",
                      padding: "14px 16px", borderRadius: "12px",
                      background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
                      border: "none", color: "#fff", fontWeight: 700, fontSize: "14px",
                      cursor: "pointer", boxShadow: "0 2px 8px rgba(34,197,94,0.3)",
                      opacity: respondingVisitorId === v.id ? 0.6 : 1,
                      minHeight: "48px",
                    }}
                  >
                    {respondingVisitorId === v.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    Liberar
                  </button>
                  <button
                    onClick={() => handleRespondVisitor(v.id, "recusado")}
                    disabled={respondingVisitorId === v.id}
                    style={{
                      flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "12px",
                      padding: "14px 16px", borderRadius: "12px",
                      background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                      border: "none", color: "#fff", fontWeight: 700, fontSize: "14px",
                      cursor: "pointer", boxShadow: "0 2px 8px rgba(239,68,68,0.3)",
                      opacity: respondingVisitorId === v.id ? 0.6 : 1,
                      minHeight: "48px",
                    }}
                  >
                    {respondingVisitorId === v.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Ban className="w-4 h-4" />
                    )}
                    Recusar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* List */}
      <main className="flex-1 overflow-y-auto" style={{ padding: "0 24px 100px" }}>
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'transparent' }} />
          </div>
        ) : auths.length === 0 && !showForm ? (
          <div className="text-center py-16">
            <div style={{ width: 72, height: 72, borderRadius: 22, background: isDark ? 'linear-gradient(135deg, rgba(255,255,255,0.15), rgba(255,255,255,0.05))' : 'linear-gradient(135deg, #e2e8f0, #f1f5f9)', border: isDark ? '1.5px solid rgba(255,255,255,0.2)' : '1.5px solid #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <ShieldCheck className="w-8 h-8" style={{ color: isDark ? '#7dd3fc' : '#475569' }} />
            </div>
            <p style={{ color: isDark ? '#fff' : "#1e293b", fontSize: '14px', marginBottom: 4 }}>Nenhuma autorização prévia</p>
            <p style={{ color: isDark ? '#93c5fd' : "#475569", fontSize: '12px', marginBottom: 16 }}>
              Pré-autorize a entrada do seu visitante para agilizar na portaria.
            </p>
            <button
              onClick={() => { setShowForm(true); setFormType("simples"); }}
              className="mx-auto flex items-center justify-center gap-2 rounded-xl text-sm font-semibold"
              style={{ height: "44px", width: "240px", background: 'linear-gradient(135deg, rgba(59,130,246,0.3), rgba(59,130,246,0.15))', border: '1.5px solid rgba(59,130,246,0.4)', color: isDark ? '#fff' : "#1e293b" }}
            >
              <Plus className="w-4 h-4" />
              Criar Autorização
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4 pt-2">
            {auths.map((a) => {
              const st = statusStyle(a.status);
              return (
                <div
                  key={a.id}
                  className="rounded-xl"
                  style={{ backgroundColor: st.bg, border: isDark ? '1.5px solid rgba(255,255,255,0.1)' : '1.5px solid #cbd5e1', padding: "14px 16px" }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="font-bold text-sm" style={{ color: isDark ? '#fff' : "#1e293b" }}>{a.visitante_nome}</h3>
                      <p className="text-xs mt-0.5" style={{ color: isDark ? '#93c5fd' : "#475569" }}>
                        {a.bloco} — Apt {a.apartamento}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ color: st.color, backgroundColor: `${st.color}15` }}
                      >
                        {st.label}
                      </span>
                      {a.status === "ativa" && (
                        <>
                          <button onClick={() => handleEdit(a)} className="p-1" title="Editar">
                            <Pencil className="w-3.5 h-3.5 text-indigo-400" />
                          </button>
                          <button onClick={() => handleCancel(a.id)} className="p-1" title="Cancelar">
                            <Trash2 className="w-3.5 h-3.5 text-red-400" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px]" style={{ color: isDark ? '#93c5fd' : "#475569" }}>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(a.data_inicio)} a {formatDate(a.data_fim)}
                    </span>
                    {a.hora_inicio && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {a.hora_inicio} às {a.hora_fim || "--"}
                      </span>
                    )}
                    <span
                      className="px-1.5 py-0.5 rounded text-[9px] font-semibold"
                      style={{
                        backgroundColor: a.tipo === "auto_cadastro" ? "#25d36620" : "#6366f120",
                        color: a.tipo === "auto_cadastro" ? "#25d366" : "#6366f1",
                      }}
                    >
                      {tipoLabel(a.tipo)}
                    </span>
                  </div>

                  {a.observacao && (
                    <p className="text-[10px] mt-2 italic" style={{ color: isDark ? '#7dd3fc' : '#475569' }}>
                      <MessageSquare className="w-3 h-3 inline mr-1" />
                      {a.observacao}
                    </p>
                  )}

                  {a.status === "utilizada" && a.entrada_confirmada_at && (
                    <p className="text-[10px] mt-2 flex items-center gap-1" style={{ color: "#94a3b8" }}>
                      <CheckCircle2 className="w-3 h-3" />
                      Entrada confirmada em {new Date(a.entrada_confirmada_at).toLocaleString("pt-BR")}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ═══ Form Modal ═══ */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)' }}>
          <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-y-auto" style={{ background: isDark ? 'linear-gradient(180deg, #002a66 0%, #003580 100%)' : '#ffffff', border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #cbd5e1', padding: "24px 24px 120px", display: "flex", flexDirection: "column", gap: "0.5cm" }}>
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {editingId ? (
                  <Pencil className="w-5 h-5" style={{ color: "#f59e0b" }} />
                ) : formType === "auto_cadastro" ? (
                  <Link2 className="w-5 h-5" style={{ color: "#25d366" }} />
                ) : (
                  <ShieldCheck className="w-5 h-5" style={{ color: "#6366f1" }} />
                )}
                <h2 className="font-bold text-base" style={{ color: isDark ? '#fff' : "#1e293b" }}>
                  {editingId ? "Editar Autorização" : formType === "auto_cadastro" ? "Enviar Link de Cadastro" : "Autorização Simples"}
                </h2>
              </div>
              <button onClick={() => { setShowForm(false); setEditingId(null); }} style={{ background: 'none', border: 'none' }}>
                <X className="w-5 h-5" style={{ color: isDark ? '#7dd3fc' : '#475569' }} />
              </button>
            </div>

            {/* Explanation */}
            <div
              className="rounded-xl text-xs"
              style={{
                padding: "12px 14px",
                backgroundColor: formType === "auto_cadastro" ? "#25d36610" : "#6366f110",
                color: isDark ? "#ffffff" : "#1e293b", border: `1px solid ${formType === "auto_cadastro" ? "#25d36630" : "#6366f130"}`,
              }}
            >
              {formType === "auto_cadastro" ? (
                <>
                  Encaminhe o link para seu visitante para ele preencher as informações (foto, documento, biometria). Quando ele chegar, os dados já estarão na portaria.
                </>
              ) : (
                <>
                  <strong>Como funciona:</strong> Preencha os dados do visitante e o período da visita. Quando o visitante chegar, a portaria já terá a autorização para liberar a entrada.
                </>
              )}
            </div>

            {error && (
              <p className="text-xs" style={{ color: '#f87171' }}>{error}</p>
            )}

            {/* Fields */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5cm" }}>
              {/* Nome */}
              <div>
                <span className="text-sm font-medium mb-1 block" style={{ color: isDark ? '#fff' : "#475569" }}>Nome do Visitante</span>
                <input
                  value={form.visitante_nome}
                  onChange={(e) => setForm({ ...form, visitante_nome: e.target.value })}
                  placeholder="Nome completo"
                  className="w-full h-10 px-3 rounded-lg text-sm focus:outline-none"
                  style={{ background: isDark ? 'rgba(255,255,255,0.06)' : '#f8fafc', border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid #cbd5e1', color: isDark ? '#fff' : "#1e293b" }}
                />
              </div>

              {/* Datas */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-sm font-medium mb-1 block" style={{ color: isDark ? '#fff' : "#475569" }}>De</span>
                  <input
                    type="date"
                    value={form.data_inicio}
                    onChange={(e) => setForm({ ...form, data_inicio: e.target.value })}
                    onClick={(e) => (e.currentTarget as HTMLInputElement).showPicker?.()}
                    className="w-full h-10 px-3 rounded-lg text-sm focus:outline-none cursor-pointer"
                    style={{ background: isDark ? 'rgba(255,255,255,0.06)' : '#f8fafc', border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid #cbd5e1', color: isDark ? '#fff' : "#1e293b", colorScheme: 'dark' }}
                  />
                </div>
                <div>
                  <span className="text-sm font-medium mb-1 block" style={{ color: isDark ? '#fff' : "#475569" }}>Até</span>
                  <input
                    type="date"
                    value={form.data_fim}
                    onChange={(e) => setForm({ ...form, data_fim: e.target.value })}
                    onClick={(e) => (e.currentTarget as HTMLInputElement).showPicker?.()}
                    className="w-full h-10 px-3 rounded-lg text-sm focus:outline-none cursor-pointer"
                    style={{ background: isDark ? 'rgba(255,255,255,0.06)' : '#f8fafc', border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid #cbd5e1', color: isDark ? '#fff' : "#1e293b", colorScheme: 'dark' }}
                  />
                </div>
              </div>

              {/* Horários */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-sm font-medium mb-1 block" style={{ color: isDark ? '#fff' : "#475569" }}>Hora início</span>
                  <input
                    type="time"
                    value={form.hora_inicio}
                    onChange={(e) => setForm({ ...form, hora_inicio: e.target.value })}
                    onClick={(e) => (e.currentTarget as HTMLInputElement).showPicker?.()}
                    className="w-full h-10 px-3 rounded-lg text-sm focus:outline-none cursor-pointer"
                    style={{ background: isDark ? 'rgba(255,255,255,0.06)' : '#f8fafc', border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid #cbd5e1', color: isDark ? '#fff' : "#1e293b", colorScheme: 'dark' }}
                  />
                </div>
                <div>
                  <span className="text-sm font-medium mb-1 block" style={{ color: isDark ? '#fff' : "#475569" }}>Hora fim</span>
                  <input
                    type="time"
                    value={form.hora_fim}
                    onChange={(e) => setForm({ ...form, hora_fim: e.target.value })}
                    onClick={(e) => (e.currentTarget as HTMLInputElement).showPicker?.()}
                    className="w-full h-10 px-3 rounded-lg text-sm focus:outline-none cursor-pointer"
                    style={{ background: isDark ? 'rgba(255,255,255,0.06)' : '#f8fafc', border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid #cbd5e1', color: isDark ? '#fff' : "#1e293b", colorScheme: 'dark' }}
                  />
                </div>
              </div>

              {/* Observação */}
              <div>
                <span className="text-sm font-medium mb-1 block" style={{ color: isDark ? '#fff' : "#475569" }}>Observação</span>
                <textarea
                  value={form.observacao}
                  onChange={(e) => setForm({ ...form, observacao: e.target.value })}
                  placeholder="Ex: Encaminhar para a churrasqueira da piscina"
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none resize-none"
                  style={{ background: isDark ? 'rgba(255,255,255,0.06)' : '#f8fafc', border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid #cbd5e1', color: isDark ? '#fff' : "#1e293b" }}
                />
              </div>
            </div>

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 rounded-xl text-white font-semibold text-sm"
              style={{
                height: "56px",
                background: editingId
                  ? "linear-gradient(135deg, rgba(245,158,11,0.3), rgba(245,158,11,0.15))"
                  : formType === "auto_cadastro"
                    ? "linear-gradient(135deg, #25d366, #128C7E)"
                    : "linear-gradient(135deg, rgba(59,130,246,0.3), rgba(59,130,246,0.15))",
                border: editingId
                  ? "1.5px solid rgba(245,158,11,0.4)"
                  : formType === "auto_cadastro"
                    ? "1.5px solid #25d366"
                    : "1.5px solid rgba(59,130,246,0.4)",
                opacity: saving ? 0.6 : 1,
                color: isDark ? '#fff' : "#1e293b",
              }}
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : editingId ? (
                <>
                  <Pencil className="w-4 h-4" />
                  Salvar Alterações
                </>
              ) : formType === "auto_cadastro" ? (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.611.611l4.458-1.495A11.96 11.96 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.316 0-4.469-.756-6.209-2.034l-.356-.28-3.278 1.099 1.099-3.278-.28-.356A9.96 9.96 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
                  Enviar Link via WhatsApp
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  Criar Autorização
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
