import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import TutorialButton, { FlowPortaria, FlowMorador, TSection, TStep, TBullet } from "@/components/TutorialButton";
import {
  ArrowLeft,
  Car,
  Plus,
  X,
  Clock,
  CheckCircle2,
  Trash2,
  Calendar,
  LogOut as LogOutIcon,
  Shield,
  Pencil,
  AlertCircle,
  Ban,
  MessageSquare,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useTheme } from "@/hooks/useTheme";
import ComoFunciona from "@/components/ComoFunciona";

const API = "/api/vehicle-authorizations";

interface VehicleAuth {
  id: number;
  placa: string;
  modelo: string | null;
  cor: string | null;
  motorista_nome: string | null;
  data_inicio: string;
  data_fim: string;
  hora_inicio: string | null;
  hora_fim: string | null;
  requer_autorizacao_saida: number;
  observacao: string | null;
  morador_observacao: string | null;
  status: string;
  entrada_confirmada_at: string | null;
  saida_solicitada_at: string | null;
  saida_autorizada: number;
  saida_autorizada_at: string | null;
  cadastrado_por_porteiro: number;
  created_at: string;
}

const CORES = [
  "Branco", "Preto", "Prata", "Cinza", "Vermelho",
  "Azul", "Verde", "Amarelo", "Marrom", "Bege", "Outro",
];

export default function MoradorVeiculos() {
  const { isDark, p } = useTheme();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [vehicles, setVehicles] = useState<VehicleAuth[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Form
  const [placa, setPlaca] = useState("");
  const [modelo, setModelo] = useState("");
  const [cor, setCor] = useState("");
  const [motorista, setMotorista] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [horaInicio, setHoraInicio] = useState("");
  const [horaFim, setHoraFim] = useState("");
  const [requerSaida, setRequerSaida] = useState(false);
  const [observacao, setObservacao] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);

  // Pending approval state
  const [respondingId, setRespondingId] = useState<number | null>(null);
  const [responseObs, setResponseObs] = useState("");

  const fetchVehicles = async () => {
    try {
      const res = await fetch(API, {  });
      if (res.ok) setVehicles(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchVehicles(); }, []);

  // Placa mask: ABC-1234 or ABC1D23 (Mercosul)
  const handlePlacaChange = (val: string) => {
    let v = val.toUpperCase().replaceAll(/[^A-Z0-9]/g, "");
    if (v.length > 7) v = v.slice(0, 7);
    if (v.length > 3) {
      v = v.slice(0, 3) + "-" + v.slice(3);
    }
    setPlaca(v);
  };

  const handleEdit = (v: VehicleAuth) => {
    setEditingId(v.id);
    // Format placa with dash for display
    let p = v.placa.toUpperCase().replaceAll(/[^A-Z0-9]/g, "");
    if (p.length > 3) p = p.slice(0, 3) + "-" + p.slice(3);
    setPlaca(p);
    setModelo(v.modelo || "");
    setCor(v.cor || "");
    setMotorista(v.motorista_nome || "");
    setDataInicio(v.data_inicio);
    setDataFim(v.data_fim);
    setHoraInicio(v.hora_inicio || "");
    setHoraFim(v.hora_fim || "");
    setRequerSaida(v.requer_autorizacao_saida === 1);
    setObservacao(v.observacao || "");
    setFormError("");
    setShowForm(true);
  };

  const resetForm = () => {
    setPlaca(""); setModelo(""); setCor(""); setMotorista("");
    setDataInicio(""); setDataFim(""); setHoraInicio(""); setHoraFim("");
    setRequerSaida(false); setObservacao(""); setFormError("");
    setEditingId(null);
  };

  const handleSubmit = async () => {
    if (!placa || !dataInicio || !dataFim) return;
    setSubmitting(true);
    setFormError("");

    const payload = {
      placa: placa.replace("-", ""),
      modelo: modelo || null,
      cor: cor || null,
      motorista_nome: motorista || null,
      data_inicio: dataInicio,
      data_fim: dataFim,
      hora_inicio: horaInicio || null,
      hora_fim: horaFim || null,
      requer_autorizacao_saida: requerSaida,
      observacao: observacao || null,
    };

    try {
      const url = editingId ? `${API}/${editingId}` : API;
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        resetForm();
        setShowForm(false);
        fetchVehicles();
      } else {
        const data = await res.json();
        setFormError(data.error || "Erro ao salvar autorização.");
      }
    } catch (err) { console.error(err); }
    finally { setSubmitting(false); }
  };

  const handleCancel = async (id: number) => {
    if (!confirm("Cancelar esta autorização?")) return;
    await apiFetch(`${API}/${id}`, { method: "DELETE" });
    fetchVehicles();
  };

  const isExpired = (v: VehicleAuth) => new Date() > new Date(v.data_fim + "T23:59:59");

  const handleRespondVehicle = async (id: number, acao: "aprovar" | "negar") => {
    setRespondingId(id);
    try {
      const res = await apiFetch(`${API}/${id}/responder-morador`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acao, morador_observacao: responseObs }),
      });
      if (res.ok) {
        setResponseObs("");
        fetchVehicles();
      }
    } catch (err) { console.error(err); }
    finally { setRespondingId(null); }
  };

  const pendentes = vehicles.filter((v) => v.status === "pendente_aprovacao");
  const ativas = vehicles.filter((v) => v.status === "ativa" && !isExpired(v));
  const outras = vehicles.filter((v) => v.status !== "ativa" && v.status !== "pendente_aprovacao" || (v.status === "ativa" && isExpired(v)));

  return (
    <div style={{ minHeight: '100dvh', background: isDark ? "linear-gradient(180deg, #001533 0%, #002254 25%, #003580 55%, #004aad 100%)" : "#f0f4f8", display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header
        style={{ position: 'sticky', top: 0, zIndex: 40, background: isDark ? "linear-gradient(135deg, #001533 0%, #002a66 50%, #004aad 100%)" : "#ffffff", borderBottom: isDark ? '1px solid rgba(255,255,255,0.08)' : "1px solid #e2e8f0", boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.3)' : "0 2px 8px rgba(0,0,0,0.06)", padding: '1rem 1.5rem', color: isDark ? '#fff' : "#1e293b" }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={() => navigate("/dashboard")} style={{ padding: '0.5rem', borderRadius: 14, background: isDark ? 'rgba(255,255,255,0.08)' : '#f8fafc', border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid #cbd5e1', color: isDark ? '#fff' : "#1e293b", cursor: 'pointer', transition: 'all 0.2s' }}>
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: 40, height: 40, borderRadius: 14, background: isDark ? 'linear-gradient(135deg, rgba(255,255,255,0.15), rgba(255,255,255,0.05))' : 'linear-gradient(135deg, #e2e8f0, #f1f5f9)', border: isDark ? '1.5px solid rgba(255,255,255,0.2)' : '1.5px solid #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Car className="w-5 h-5" />
            </div>
            <div>
              <h1 style={{ fontWeight: 800, fontSize: '1.125rem', color: isDark ? '#fff' : "#1e293b", margin: 0 }}>Veículos</h1>
              <p style={{ color: isDark ? '#93c5fd' : "#475569", fontSize: '0.75rem', margin: 0 }}>Autorizar acesso de veículos</p>
            </div>
          </div>
          <div style={{ marginLeft: 'auto' }}>
            <TutorialButton title="Meus Veículos">
              <TSection icon={<span>📋</span>} title="O QUE É ESTA FUNÇÃO?">
                <p>Cadastre seus <strong>veículos (carros, motos, bicicletas)</strong> para que a portaria saiba quais veículos pertencem a você e podem entrar no condomínio. Com o cadastro, o porteiro identifica seu veículo pela placa e libera a entrada/saída rapidamente.</p>
              </TSection>
              <FlowMorador>
                <TStep n={1}>Toque em <strong>"+"</strong> para cadastrar um novo veículo</TStep>
                <TStep n={2}>Informe a <strong>placa</strong> (ex: ABC-1234 ou ABC1D23)</TStep>
                <TStep n={3}>Informe <strong>modelo</strong> (ex: HB20, Onix, Civic) e <strong>cor</strong></TStep>
                <TStep n={4}>Selecione o <strong>tipo</strong>: Carro, Moto, Van, Bicicleta</TStep>
                <TStep n={5}>Toque em <strong>"Cadastrar"</strong> para enviar</TStep>
                <TStep n={6}>O veículo fica com status <strong>"Pendente"</strong> até o porteiro aprovar</TStep>
                <p style={{ marginTop: "8px", fontSize: "13px", color: "#166534" }}>👉 <strong>Portaria vê:</strong> Seu veículo aparece na lista de veículos pendentes. O porteiro revisa e aprova. Após aprovado, fica autorizado permanentemente.</p>
              </FlowMorador>
              <FlowPortaria>
                <TStep n={1}>Seu veículo chega no portão do condomínio</TStep>
                <TStep n={2}>Porteiro <strong>busca pela placa</strong> no sistema ou usa a <strong>câmera LPR</strong> (leitor automático de placas)</TStep>
                <TStep n={3}>Sistema mostra que o <strong>veículo é autorizado</strong> com nome do morador, bloco e unidade</TStep>
                <TStep n={4}>Porteiro <strong>registra entrada</strong> com um toque e abre o portão</TStep>
                <TStep n={5}>Na saída, porteiro <strong>registra a saída</strong> da mesma forma</TStep>
                <p style={{ marginTop: "8px", fontSize: "13px", color: "#2d3354" }}>👉 <strong>Você vê:</strong> No app, pode consultar o histórico completo de entradas e saídas do seu veículo com data e hora.</p>
              </FlowPortaria>
              <TSection icon={<span>🔍</span>} title="STATUS DOS VEÍCULOS">
                <TBullet><strong style={{ color: "#d97706" }}>Pendente</strong> — Aguardando aprovação do porteiro (destaque amarelo)</TBullet>
                <TBullet><strong style={{ color: "#16a34a" }}>Aprovado</strong> — Autorizado a entrar no condomínio</TBullet>
                <TBullet><strong style={{ color: "#dc2626" }}>Rejeitado</strong> — Porteiro rejeitou o cadastro (dados incorretos)</TBullet>
              </TSection>
              <TSection icon={<span>⭐</span>} title="DICAS IMPORTANTES">
                <TBullet>Cadastre <strong>todos os veículos da família</strong> — inclusive os de visitantes frequentes</TBullet>
                <TBullet>Você pode <strong>editar ou remover</strong> veículos a qualquer momento</TBullet>
                <TBullet>Se trocar de carro, <strong>remova o antigo e cadastre o novo</strong> para manter atualizado</TBullet>
                <TBullet>A placa deve estar <strong>correta</strong> — é por ela que o porteiro identifica seu veículo</TBullet>
                <TBullet>Condomínios com <strong>câmera LPR</strong> identificam seu veículo automaticamente pela placa</TBullet>
              </TSection>
            </TutorialButton>
          </div>
        </div>
      </header>

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '24px', padding: '24px', paddingBottom: '120px' }}>

        <ComoFunciona steps={[
          "🚗 Cadastre seus veículos com placa e modelo",
          "📱 Portaria recebe os dados automaticamente",
          "🅿️ Veículos cadastrados têm entrada facilitada",
          "✅ Controle de acesso veicular automático",
        ]} />

        {/* New button */}
        {!showForm && (
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
              padding: '16px', borderRadius: '16px',
              background: isDark ? 'linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.06))' : '#ffffff',
              border: isDark ? '2px solid rgba(255,255,255,0.7)' : '2px solid #1e293b', color: isDark ? '#fff' : "#1e293b", fontWeight: 700, fontSize: '15px', cursor: 'pointer', width: '100%',
              transition: 'all 0.2s',
            }}
          >
            <Plus className="w-5 h-5" />
            Autorizar Acesso de Veículo
          </button>
        )}

        {/* ════════ Form ════════ */}
        {showForm && (
          <div style={{
            background: isDark ? 'rgba(255,255,255,0.06)' : '#f8fafc', borderRadius: '16px', padding: '24px',
            display: 'flex', flexDirection: 'column', gap: '20px', border: isDark ? '1.5px solid rgba(255,255,255,0.1)' : '1.5px solid #cbd5e1',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {editingId && <Pencil className="w-4 h-4" style={{ color: '#f59e0b' }} />}
                <h2 style={{ fontWeight: 700, fontSize: '16px', color: isDark ? '#fff' : "#1e293b" }}>
                  {editingId ? 'Editar Autorização' : 'Nova Autorização'}
                </h2>
              </div>
              <button onClick={() => { setShowForm(false); setEditingId(null); }} style={{ padding: '6px', borderRadius: '8px', border: 'none', background: 'transparent', cursor: 'pointer' }}>
                <X className="w-5 h-5" style={{ color: isDark ? '#93c5fd' : "#475569" }} />
              </button>
            </div>

            {/* PLACA — em destaque */}
            <div>
              <span style={{ fontWeight: 700, fontSize: '14px', color: isDark ? '#fff' : "#1e293b", marginBottom: '8px', display: 'block' }}>
                Placa do Veículo *
              </span>
              <input
                type="text"
                value={placa}
                onChange={(e) => handlePlacaChange(e.target.value)}
                placeholder="ABC-1D23"
                maxLength={8}
                style={{
                  width: '100%', padding: '16px 20px', borderRadius: '14px',
                  border: isDark ? '2px solid rgba(59,130,246,0.5)' : '2px solid #cbd5e1', fontSize: '22px', fontWeight: 800,
                  background: isDark ? 'rgba(255,255,255,0.08)' : '#fff', color: isDark ? '#fff' : "#1e293b", textAlign: 'center',
                  letterSpacing: '4px', textTransform: 'uppercase',
                  outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Modelo + Cor */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <span style={{ fontWeight: 600, fontSize: '13px', color: isDark ? '#93c5fd' : "#475569", marginBottom: '6px', display: 'block' }}>Modelo</span>
                <input type="text" value={modelo} onChange={(e) => setModelo(e.target.value)} placeholder="Ex: Civic, Onix..."
                  style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid #cbd5e1', fontSize: '14px', background: isDark ? 'rgba(255,255,255,0.06)' : '#fff', color: isDark ? '#fff' : "#1e293b", outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <span style={{ fontWeight: 600, fontSize: '13px', color: isDark ? '#93c5fd' : "#475569", marginBottom: '6px', display: 'block' }}>Cor</span>
                <select value={cor} onChange={(e) => setCor(e.target.value)}
                  style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid #cbd5e1', fontSize: '14px', background: isDark ? 'rgba(255,255,255,0.06)' : '#fff', color: isDark ? '#fff' : "#1e293b", outline: 'none', boxSizing: 'border-box' }}>
                  <option value="">Selecione</option>
                  {CORES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            {/* Motorista */}
            <div>
              <span style={{ fontWeight: 600, fontSize: '13px', color: isDark ? '#93c5fd' : "#475569", marginBottom: '6px', display: 'block' }}>Nome do Motorista</span>
              <input type="text" value={motorista} onChange={(e) => setMotorista(e.target.value)} placeholder="Nome completo do motorista"
                style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid #cbd5e1', fontSize: '14px', background: isDark ? 'rgba(255,255,255,0.06)' : '#fff', color: isDark ? '#fff' : "#1e293b", outline: 'none', boxSizing: 'border-box' }} />
            </div>

            {/* data início + fim */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <span style={{ fontWeight: 600, fontSize: '13px', color: isDark ? '#93c5fd' : "#475569", marginBottom: '6px', display: 'block' }}>Liberado de *</span>
                <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)}
                  onClick={(e) => (e.currentTarget as HTMLInputElement).showPicker?.()}
                  style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid #cbd5e1', fontSize: '14px', background: isDark ? 'rgba(255,255,255,0.06)' : '#fff', color: isDark ? '#fff' : "#1e293b", outline: 'none', boxSizing: 'border-box', cursor: 'pointer', colorScheme: isDark ? 'dark' : 'light' }} />
              </div>
              <div>
                <span style={{ fontWeight: 600, fontSize: '13px', color: isDark ? '#93c5fd' : "#475569", marginBottom: '6px', display: 'block' }}>Até *</span>
                <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)}
                  onClick={(e) => (e.currentTarget as HTMLInputElement).showPicker?.()}
                  style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid #cbd5e1', fontSize: '14px', background: isDark ? 'rgba(255,255,255,0.06)' : '#fff', color: isDark ? '#fff' : "#1e293b", outline: 'none', boxSizing: 'border-box', cursor: 'pointer', colorScheme: isDark ? 'dark' : 'light' }} />
              </div>
            </div>

            {/* hora início + fim */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <span style={{ fontWeight: 600, fontSize: '13px', color: isDark ? '#93c5fd' : "#475569", marginBottom: '6px', display: 'block' }}>Horário de</span>
                <input type="time" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)}
                  onClick={(e) => (e.currentTarget as HTMLInputElement).showPicker?.()}
                  style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid #cbd5e1', fontSize: '14px', background: isDark ? 'rgba(255,255,255,0.06)' : '#fff', color: isDark ? '#fff' : "#1e293b", outline: 'none', boxSizing: 'border-box', cursor: 'pointer', colorScheme: isDark ? 'dark' : 'light' }} />
              </div>
              <div>
                <span style={{ fontWeight: 600, fontSize: '13px', color: isDark ? '#93c5fd' : "#475569", marginBottom: '6px', display: 'block' }}>Até</span>
                <input type="time" value={horaFim} onChange={(e) => setHoraFim(e.target.value)}
                  onClick={(e) => (e.currentTarget as HTMLInputElement).showPicker?.()}
                  style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid #cbd5e1', fontSize: '14px', background: isDark ? 'rgba(255,255,255,0.06)' : '#fff', color: isDark ? '#fff' : "#1e293b", outline: 'none', boxSizing: 'border-box', cursor: 'pointer', colorScheme: isDark ? 'dark' : 'light' }} />
              </div>
            </div>

            {/* Requer saída? */}
            <div
              onClick={() => setRequerSaida(!requerSaida)}
              style={{
                display: 'flex', alignItems: 'center', gap: '14px',
                padding: '14px 16px', borderRadius: '14px', cursor: 'pointer',
                border: requerSaida ? '2px solid rgba(59,130,246,0.5)' : isDark ? '2px solid rgba(255,255,255,0.1)' : '2px solid #cbd5e1',
                background: requerSaida ? 'rgba(59,130,246,0.1)' : isDark ? 'rgba(255,255,255,0.04)' : '#fff',
                transition: 'all 0.2s',
              }}
            >
              <div style={{
                width: '24px', height: '24px', borderRadius: '6px',
                border: requerSaida
                  ? '2px solid #3b82f6'
                  : (isDark ? '2px solid rgba(255,255,255,0.22)' : '2px solid #94a3b8'),
                background: requerSaida ? '#3b82f6' : (isDark ? 'transparent' : '#ffffff'),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.2s', flexShrink: 0,
              }}>
                {requerSaida && <CheckCircle2 className="w-4 h-4" style={{ color: '#ffffff' }} />}
              </div>
              <div>
                <p style={{ fontWeight: 600, fontSize: '14px', color: isDark ? '#fff' : "#1e293b" }}>
                  Precisa autorização para saída?
                </p>
                <p style={{ fontSize: '12px', color: isDark ? '#93c5fd' : "#475569" }}>
                  A portaria vai solicitar sua liberação antes do veículo sair
                </p>
              </div>
            </div>

            {/* Observação */}
            <div>
              <span style={{ fontWeight: 600, fontSize: '13px', color: isDark ? '#93c5fd' : "#475569", marginBottom: '6px', display: 'block' }}>Observação</span>
              <textarea value={observacao} onChange={(e) => setObservacao(e.target.value)} placeholder="Ex: Prestador de serviço, entrega de mudança..."
                rows={2} style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid #cbd5e1', fontSize: '14px', background: isDark ? 'rgba(255,255,255,0.06)' : '#f8fafc', color: isDark ? '#fff' : "#1e293b", outline: 'none', resize: 'none', boxSizing: 'border-box' }} />
            </div>

            {/* Error */}
            {formError && (
              <div style={{
                padding: '12px 14px', borderRadius: '12px',
                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                color: '#fca5a5', fontSize: '13px', fontWeight: 500,
              }}>
                {formError}
              </div>
            )}

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={!placa || !dataInicio || !dataFim || submitting}
              style={{
                width: "100%", padding: "14px", borderRadius: "14px",
                background: placa && dataInicio && dataFim
                  ? editingId
                    ? "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
                    : "#003580"
                  : "#e2e8f0",
                border: "none", color: placa && dataInicio && dataFim ? "#fff" : "#94a3b8",
                fontWeight: 700, fontSize: "15px",
                cursor: placa && dataInicio && dataFim ? "pointer" : "not-allowed",
                opacity: submitting ? 0.7 : 1,
              }}
            >
              {submitting ? "Salvando..." : editingId ? "Salvar Alterações" : "Autorizar Veículo"}
            </button>
          </div>
        )}

        {/* ═══ Pending Approvals from Portaria ═══ */}
        {pendentes.length > 0 && (
          <div>
            <h3 style={{ fontWeight: 700, fontSize: '15px', color: '#fbbf24', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle className="w-4 h-4" style={{ color: '#f59e0b' }} />
              Aguardando sua aprovação ({pendentes.length})
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {pendentes.map((v) => (
                <div key={v.id} style={{
                  background: isDark ? 'rgba(255,255,255,0.06)' : '#f8fafc', borderRadius: '14px', padding: '16px',
                  border: '2px solid rgba(245,158,11,0.25)', display: 'flex', flexDirection: 'column', gap: '12px',
                }}>
                  {/* Placa */}
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{
                      padding: '8px 14px', borderRadius: '10px',
                      background: 'rgba(245,158,11,0.15)', border: '2px solid rgba(245,158,11,0.4)',
                      fontWeight: 800, fontSize: '18px', color: '#fbbf24',
                      letterSpacing: '2px', fontFamily: 'monospace',
                    }}>
                      {v.placa}
                    </div>
                    <div>
                      <p style={{ fontWeight: 600, fontSize: '13px', color: isDark ? '#fff' : "#1e293b" }}>
                        {v.modelo || "Veículo"} {v.cor ? `· ${v.cor}` : ""}
                      </p>
                      {v.motorista_nome && (
                        <p style={{ fontSize: '12px', color: isDark ? '#93c5fd' : "#475569" }}>🧑 {v.motorista_nome}</p>
                      )}
                    </div>
                  </div>

                  <div style={{
                    padding: '8px 12px', borderRadius: '10px',
                    background: 'rgba(245,158,11,0.1)', fontSize: '12px', color: '#fbbf24', fontWeight: 500,
                  }}>
                    ⚠️ A portaria está solicitando autorização para este veículo acessar o condomínio.
                  </div>

                  {v.observacao && (
                    <p style={{ fontSize: '12px', color: isDark ? '#93c5fd' : "#475569", fontStyle: 'italic' }}>💬 Portaria: {v.observacao}</p>
                  )}

                  {/* Observation input */}
                  <div>
                    <span style={{ fontWeight: 600, fontSize: '12px', color: isDark ? '#93c5fd' : "#475569", marginBottom: '4px', display: 'block' }}>
                      <MessageSquare className="w-3 h-3" style={{ display: "inline", verticalAlign: "middle", marginRight: "4px" }} />
                      Observação para portaria (opcional)
                    </span>
                    <input
                      type="text"
                      placeholder="Ex: Encaminhar para vaga de visitantes, Minha vaga G-12..."
                      value={respondingId === v.id ? responseObs : ""}
                      onFocus={() => { if (respondingId !== v.id) { setRespondingId(null); setResponseObs(""); } }}
                      onChange={(e) => { setRespondingId(v.id); setResponseObs(e.target.value); }}
                      style={{
                        width: '100%', padding: '10px 12px', borderRadius: '10px',
                        border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid #cbd5e1', fontSize: '13px', background: isDark ? 'rgba(255,255,255,0.06)' : '#f8fafc',
                        color: isDark ? '#fff' : "#1e293b", outline: 'none', boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  {/* Approve / Deny buttons */}
                  <div style={{ display: "flex", gap: "12px" }}>
                    <button
                      onClick={() => handleRespondVehicle(v.id, "aprovar")}
                      disabled={respondingId === v.id && respondingId !== v.id}
                      style={{
                        flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "12px",
                        padding: "14px 16px", borderRadius: "12px",
                        background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
                        border: "none", color: "#fff", fontWeight: 700, fontSize: "14px",
                        cursor: "pointer", boxShadow: "0 2px 8px rgba(34,197,94,0.3)",
                      }}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Permitir
                    </button>
                    <button
                      onClick={() => handleRespondVehicle(v.id, "negar")}
                      style={{
                        flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "12px",
                        padding: "14px 16px", borderRadius: "12px",
                        background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                        border: "none", color: "#fff", fontWeight: 700, fontSize: "14px",
                        cursor: "pointer", boxShadow: "0 2px 8px rgba(239,68,68,0.3)",
                      }}
                    >
                      <Ban className="w-4 h-4" />
                      Negar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ Active vehicles ═══ */}
        {ativas.length > 0 && (
          <div>
            <h3 style={{ fontWeight: 700, fontSize: '15px', color: isDark ? '#fff' : "#1e293b", marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Shield className="w-4 h-4" style={{ color: '#60a5fa' }} />
              Ativas ({ativas.length})
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {ativas.map((v) => <VehicleCard key={v.id} v={v} onCancel={handleCancel} onEdit={handleEdit} />)}
            </div>
          </div>
        )}

        {/* ═══ Other vehicles ═══ */}
        {outras.length > 0 && (
          <div>
            <h3 style={{ fontWeight: 700, fontSize: '15px', color: isDark ? '#93c5fd' : "#475569", marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock className="w-4 h-4" style={{ color: isDark ? '#7dd3fc' : '#475569' }} />
              Anteriores ({outras.length})
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {outras.map((v) => <VehicleCard key={v.id} v={v} onCancel={handleCancel} onEdit={handleEdit} />)}
            </div>
          </div>
        )}

        {!loading && vehicles.length === 0 && !showForm && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 24px', gap: '16px', textAlign: 'center' }}>
            <div style={{ width: 72, height: 72, borderRadius: 22, background: isDark ? 'linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.04))' : 'linear-gradient(135deg, #e2e8f0, #f1f5f9)', border: isDark ? '1.5px solid rgba(255,255,255,0.1)' : '1.5px solid #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Car className="w-9 h-9" style={{ color: isDark ? '#93c5fd' : "#475569" }} />
            </div>
            <p style={{ fontSize: '15px', color: isDark ? '#fff' : "#1e293b", fontWeight: 600 }}>Nenhuma autorização de veículo.</p>
            <p style={{ fontSize: '13px', color: isDark ? '#93c5fd' : "#475569" }}>Autorize veículos para facilitar o acesso na portaria.</p>
          </div>
        )}

        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}>
            <div style={{ width: 40, height: 40, border: '2px solid #60a5fa', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          </div>
        )}
      </main>
    </div>
  );
}

function VehicleCard({ v, onCancel, onEdit }: { v: VehicleAuth; onCancel: (id: number) => void; onEdit: (v: VehicleAuth) => void }) {
  const { isDark, p } = useTheme();
  const isActive = v.status === "ativa" && new Date() <= new Date(v.data_fim + "T23:59:59");
  const entrou = !!v.entrada_confirmada_at;

  const formatDate = (d: string) => {
    if (!d) return "";
    const [y, m, day] = d.split("-");
    return `${day}/${m}/${y}`;
  };

  return (
    <div style={{
      background: isDark ? 'rgba(255,255,255,0.06)' : '#f8fafc', borderRadius: '14px', padding: '16px',
      border: isActive ? '1.5px solid rgba(59,130,246,0.2)' : '1px solid rgba(255,255,255,0.08)',
      display: 'flex', flexDirection: 'column', gap: '12px',
      opacity: isActive ? 1 : 0.7,
    }}>
      {/* Placa em destaque */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{
            padding: '8px 14px', borderRadius: '10px',
            background: 'rgba(59,130,246,0.15)', border: '2px solid rgba(59,130,246,0.4)',
            fontWeight: 800, fontSize: '18px', color: isDark ? '#93c5fd' : "#475569",
            letterSpacing: '2px', fontFamily: 'monospace',
          }}>
            {v.placa}
          </div>
          <div>
            <p style={{ fontWeight: 600, fontSize: '13px', color: isDark ? '#fff' : "#1e293b" }}>
              {v.modelo || "Veículo"} {v.cor ? `· ${v.cor}` : ""}
            </p>
            {v.motorista_nome && (
              <p style={{ fontSize: '12px', color: isDark ? '#93c5fd' : "#475569" }}>🧑 {v.motorista_nome}</p>
            )}
          </div>
        </div>
        {isActive && (
          <div style={{ display: "flex", gap: "6px" }}>
            <button onClick={() => onEdit(v)} style={{ padding: '6px', borderRadius: '8px', border: 'none', background: 'rgba(245,158,11,0.15)', cursor: 'pointer' }} title="Editar">
              <Pencil className="w-4 h-4" style={{ color: '#fbbf24' }} />
            </button>
            <button onClick={() => onCancel(v.id)} style={{ padding: '6px', borderRadius: '8px', border: 'none', background: 'rgba(239,68,68,0.15)', cursor: 'pointer' }} title="Cancelar">
              <Trash2 className="w-4 h-4" style={{ color: '#fca5a5' }} />
            </button>
          </div>
        )}
      </div>

      {/* Dates */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: isDark ? '#93c5fd' : "#475569" }}>
        <Calendar className="w-3.5 h-3.5" />
        {formatDate(v.data_inicio)} até {formatDate(v.data_fim)}
        {v.hora_inicio && v.hora_fim && ` · ${v.hora_inicio} - ${v.hora_fim}`}
      </div>

      {/* Status badges */}
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
        {isActive && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "3px 10px", borderRadius: "20px", background: "#dcfce7", color: "#15803d", fontSize: "11px", fontWeight: 600 }}>
            <CheckCircle2 className="w-3 h-3" /> Ativa
          </span>
        )}
        {entrou && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "3px 10px", borderRadius: "20px", background: "#e0f2fe", color: "#0369a1", fontSize: "11px", fontWeight: 600 }}>
            Entrada confirmada
          </span>
        )}
        {v.requer_autorizacao_saida === 1 && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "3px 10px", borderRadius: "20px", background: "#fef3c7", color: "#b45309", fontSize: "11px", fontWeight: 600 }}>
            <LogOutIcon className="w-3 h-3" /> Saída requer autorização
          </span>
        )}
        {v.saida_autorizada === 1 && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "3px 10px", borderRadius: "20px", background: "#dcfce7", color: "#15803d", fontSize: "11px", fontWeight: 600 }}>
            Saída autorizada
          </span>
        )}
      </div>

      {v.observacao && (
        <p style={{ fontSize: '12px', color: isDark ? '#7dd3fc' : '#475569', fontStyle: 'italic' }}>💬 {v.observacao}</p>
      )}
    </div>
  );
}
