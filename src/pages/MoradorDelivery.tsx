import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import TutorialButton, { FlowPortaria, FlowMorador, TSection, TStep, TBullet } from "@/components/TutorialButton";
import { compressImage } from "@/lib/imageUtils";
import {
  ArrowLeft,
  Truck,
  Plus,
  Camera,
  X,
  Clock,
  CheckCircle2,
  Trash2,
  Image,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useTheme } from "@/hooks/useTheme";
import ComoFunciona from "@/components/ComoFunciona";

const API = "/api/delivery-authorizations";

const SERVICOS = [
  { id: "ifood", label: "iFood", color: "#EA1D2C" },
  { id: "rappi", label: "Rappi", color: "#FF6B00" },
  { id: "uber_eats", label: "Uber Eats", color: "#06C167" },
  { id: "99food", label: "99 Food", color: "#FFDD00" },
  { id: "loggi", label: "Loggi", color: "#00BAFF" },
  { id: "outro", label: "Outro", color: "#6366f1" },
];

interface DeliveryAuth {
  id: number;
  servico: string;
  servico_custom: string | null;
  numero_pedido: string | null;
  print_pedido: string | null;
  observacao: string | null;
  status: string;
  foto_entrega: string | null;
  created_at: string;
  recebido_at: string | null;
}

export default function MoradorDelivery() {
  const { isDark, p } = useTheme();
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [deliveries, setDeliveries] = useState<DeliveryAuth[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [servico, setServico] = useState("");
  const [servicoCustom, setServicoCustom] = useState("");
  const [numeroPedido, setNumeroPedido] = useState("");
  const [printPedido, setPrintPedido] = useState<string | null>(null);
  const [observacao, setObservacao] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchDeliveries = async () => {
    try {
      const res = await fetch(API, {  });
      if (res.ok) {
        const data = await res.json();
        setDeliveries(data);
      }
    } catch (err) {
      console.error("Erro ao buscar deliveries:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeliveries();
  }, []);

  const handleCapturePrint = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      const compressed = await compressImage(reader.result as string, "general");
      setPrintPedido(compressed);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleSubmit = async () => {
    if (!servico) return;
    setSubmitting(true);
    try {
      const res = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          servico,
          servico_custom: servico === "outro" ? servicoCustom : null,
          numero_pedido: numeroPedido || null,
          print_pedido: printPedido,
          observacao: observacao || null,
        }),
      });
      if (res.ok) {
        // Reset form
        setServico("");
        setServicoCustom("");
        setNumeroPedido("");
        setPrintPedido(null);
        setObservacao("");
        setShowForm(false);
        fetchDeliveries();
      }
    } catch (err) {
      console.error("Erro ao criar delivery:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (id: number) => {
    if (!confirm("Cancelar esta autorização de delivery?")) return;
    try {
      await apiFetch(`${API}/${id}`, {
        method: "DELETE",
      });
      fetchDeliveries();
    } catch (err) {
      console.error("Erro ao cancelar:", err);
    }
  };

  const getServicoInfo = (s: string) => SERVICOS.find((sv) => sv.id === s) || SERVICOS[5];

  const pendentes = deliveries.filter((d) => d.status === "pendente");
  const recebidos = deliveries.filter((d) => d.status === "recebido");

  return (
    <div style={{ minHeight: '100dvh', background: isDark ? "linear-gradient(180deg, #001533 0%, #002254 25%, #003580 55%, #004aad 100%)" : "#f0f4f8", display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header
        className="sticky top-0 z-40"
        style={{
          background: isDark ? "linear-gradient(135deg, #001533 0%, #002a66 50%, #004aad 100%)" : "#ffffff",
          borderBottom: isDark ? '1px solid rgba(255,255,255,0.08)' : "1px solid #e2e8f0",
          boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.3)' : "0 2px 8px rgba(0,0,0,0.06)",
          padding: '1rem 1.5rem',
          color: isDark ? '#fff' : "#1e293b",
        }}
      >
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            style={{ padding: 10, borderRadius: 14, background: isDark ? 'rgba(255,255,255,0.08)' : '#f8fafc', border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid #cbd5e1', color: isDark ? '#fff' : "#1e293b", display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div style={{ width: 40, height: 40, borderRadius: 14, background: isDark ? 'linear-gradient(135deg, rgba(255,255,255,0.15), rgba(255,255,255,0.05))' : 'linear-gradient(135deg, #e2e8f0, #f1f5f9)', border: isDark ? '1.5px solid rgba(255,255,255,0.2)' : '1.5px solid #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Truck className="w-5 h-5" style={{ color: isDark ? '#fff' : "#1e293b" }} />
            </div>
            <div>
              <h1 className="font-bold text-lg" style={{ color: isDark ? '#fff' : "#1e293b" }}>Entregas e Delivery</h1>
              <p style={{ color: isDark ? '#93c5fd' : "#475569", fontSize: '12px' }}>Autorizar recebimento de pedidos</p>
            </div>
          </div>
          <div style={{ marginLeft: "auto" }}>
            <TutorialButton title="Delivery">
              <TSection icon={<span>📋</span>} title="O QUE É ESTA FUNÇÃO?">
                <p>Gerencie todas as suas <strong>entregas de delivery</strong> (iFood, Rappi, Uber Eats, Mercado Livre, Correios, etc.). Quando um entregador chega na portaria, o porteiro registra e você recebe um aviso. Você também pode <strong>avisar com antecedência</strong> que está esperando uma entrega para agilizar o processo.</p>
              </TSection>
              <FlowPortaria>
                <TStep n={1}>Entregador chega na portaria com seu pedido (iFood, Rappi, Correios, etc.)</TStep>
                <TStep n={2}>Porteiro registra a entrega no sistema com <strong>tipo, origem e foto</strong> do pacote</TStep>
                <TStep n={3}>Você recebe um <strong>aviso automático no WhatsApp</strong>: "Delivery chegou na portaria"</TStep>
                <TStep n={4}>O pedido aparece aqui no app com status <strong>"Aguardando retirada"</strong></TStep>
                <p style={{ marginTop: "8px", fontSize: "13px", color: "#2d3354" }}>👉 <strong>Você vê:</strong> Detalhes da entrega (origem, tipo, foto, horário de chegada) e pode descer para retirar quando quiser.</p>
              </FlowPortaria>
              <FlowMorador>
                <TStep n={1}>Você fez um pedido e quer <strong>avisar a portaria com antecedência</strong></TStep>
                <TStep n={2}>Toque em <strong>"+"</strong> e informe: "Estou esperando um iFood" ou "Mercado Livre vai entregar hoje"</TStep>
                <TStep n={3}>A portaria recebe o aviso e <strong>já fica preparada</strong> para quando o entregador chegar</TStep>
                <TStep n={4}>Quando chegar, o porteiro <strong>confirma e você recebe a notificação</strong></TStep>
                <TStep n={5}>Você desce, retira o pedido e o porteiro <strong>confirma a retirada</strong> no sistema</TStep>
                <p style={{ marginTop: "8px", fontSize: "13px", color: "#166534" }}>👉 <strong>Portaria vê:</strong> Que você estava esperando um delivery. Quando chegar, vinculam automaticamente e confirmam com data e hora.</p>
              </FlowMorador>
              <TSection icon={<span>🔍</span>} title="STATUS DOS DELIVERIES">
                <TBullet><strong style={{ color: "#d97706" }}>Aguardando retirada</strong> — Chegou na portaria, esperando você buscar</TBullet>
                <TBullet><strong style={{ color: "#16a34a" }}>Retirado</strong> — Você já buscou na portaria</TBullet>
                <TBullet><strong style={{ color: "#2d3354" }}>Avisado</strong> — Você avisou que está esperando (portaria informada)</TBullet>
              </TSection>
              <TSection icon={<span>⭐</span>} title="DICAS IMPORTANTES">
                <TBullet><strong>Avise a portaria antes</strong> do delivery chegar — agiliza o atendimento do entregador</TBullet>
                <TBullet>Você recebe <strong>notificação no WhatsApp</strong> quando o delivery chega — não precisa ficar verificando</TBullet>
                <TBullet>O porteiro tira <strong>foto do pacote</strong> como comprovação — você vê no app</TBullet>
                <TBullet>Entregas pendentes ficam com <strong>destaque amarelo</strong> para não esquecer de buscar</TBullet>
                <TBullet><strong>Histórico completo</strong> de todos os seus deliveries disponível para consulta</TBullet>
              </TSection>
            </TutorialButton>
          </div>
        </div>
      </header>

      <main
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: "24px",
          padding: "24px",
          paddingBottom: "120px",
        }}
      >
        <ComoFunciona steps={[
          "📦 Portaria registra suas entregas com foto",
          "📱 Você recebe notificação via WhatsApp e app",
          "📋 Apresente QR Code ou protocolo para retirar",
          "✅ Confirme retirada direto no app",
        ]} />
        {/* Info text */}
        {!showForm && (
          <p style={{
            fontSize: '13px',
            color: isDark ? '#94a3b8' : '#64748b',
            textAlign: 'center',
            lineHeight: '1.6',
            padding: '10px 4px 0',
          }}>
            O entregador poderá entrar em contato diretamente com você ao chegar — basta escanear o QR Code na entrada do condomínio.
          </p>
        )}

        {/* New Delivery Button */}
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              padding: '14px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, rgba(59,130,246,0.3), rgba(59,130,246,0.15))',
              border: '2px solid rgba(59,130,246,0.8)',
              boxShadow: '0 0 0 1px rgba(59,130,246,0.3), 0 2px 8px rgba(59,130,246,0.2)',
              color: isDark ? '#fff' : "#1e293b",
              fontWeight: 700,
              fontSize: '15px',
              cursor: 'pointer',
              width: '100%',
            }}
          >
            <Plus className="w-5 h-5" />
            Novo Pedido de Delivery
          </button>
        )}

        {/* Form */}
        {showForm && (
          <div
            style={{
              background: isDark ? 'rgba(255,255,255,0.06)' : '#f8fafc',
              borderRadius: '16px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              border: isDark ? '1.5px solid rgba(255,255,255,0.1)' : '1.5px solid #cbd5e1',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ fontWeight: 700, fontSize: '16px', color: isDark ? '#fff' : "#1e293b" }}>
                Novo Pedido
              </h2>
              <button
                onClick={() => setShowForm(false)}
                style={{ padding: '6px', borderRadius: '8px', border: 'none', background: 'transparent', cursor: 'pointer' }}
              >
                <X className="w-5 h-5" style={{ color: isDark ? '#7dd3fc' : '#475569' }} />
              </button>
            </div>

            {/* Serviço Selection */}
            <div>
              <span style={{ fontWeight: 600, fontSize: '14px', color: isDark ? '#93c5fd' : "#475569", marginBottom: '10px', display: 'block' }}>
                Serviço de Delivery *
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '10px' }}>
                {SERVICOS.map((sv) => (
                  <button
                    key={sv.id}
                    type="button"
                    onClick={() => setServico(sv.id)}
                    aria-pressed={servico === sv.id}
                    style={{
                      padding: '12px 8px',
                      borderRadius: '12px',
                      border: servico === sv.id ? `2px solid ${sv.color}` : isDark ? '2px solid rgba(255,255,255,0.1)' : '2px solid #cbd5e1',
                      background: servico === sv.id
                        ? (isDark ? `${sv.color}30` : `${sv.color}1A`)
                        : isDark
                          ? 'rgba(255,255,255,0.04)'
                          : 'rgba(0,0,0,0.02)',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.2s',
                      position: 'relative',
                      opacity: 1,
                    }}
                  >
                    {servico === sv.id && (
                      <div style={{ position: 'absolute', top: 4, right: 4 }}>
                        <CheckCircle2 style={{ width: 16, height: 16, color: '#4ade80' }} />
                      </div>
                    )}
                    <span
                      style={{
                        fontWeight: 700,
                        fontSize: '20px',
                        lineHeight: 1,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 34,
                        height: 34,
                        borderRadius: 10,
                        background: servico === sv.id
                          ? (isDark ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.85)')
                          : 'transparent',
                        filter: 'none',
                      }}
                    >
                      {sv.id === 'ifood' ? '🍔' :
                       sv.id === 'rappi' ? '🛵' :
                       sv.id === 'uber_eats' ? '🥡' :
                       sv.id === '99food' ? '🍕' :
                       sv.id === 'loggi' ? '📦' : '🏪'}
                    </span>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: servico === sv.id ? sv.color : isDark ? '#93c5fd' : '#1e293b' }}>
                      {sv.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom service name */}
            {servico === 'outro' && (
              <div>
                <span style={{ fontWeight: 600, fontSize: '14px', color: isDark ? '#93c5fd' : "#475569", marginBottom: '8px', display: 'block' }}>
                  Nome do Serviço
                </span>
                <input
                  type="text"
                  value={servicoCustom}
                  onChange={(e) => setServicoCustom(e.target.value)}
                  placeholder="Ex: Farmácia, Mercado, Loja..."
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid #cbd5e1',
                    fontSize: '14px',
                    background: isDark ? 'rgba(255,255,255,0.06)' : '#fff',
                    color: isDark ? '#fff' : "#1e293b",
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            )}

            {/* Order Number */}
            <div>
              <span style={{ fontWeight: 600, fontSize: '14px', color: isDark ? '#93c5fd' : "#475569", marginBottom: '8px', display: 'block' }}>
                Número / Código do Pedido
              </span>
              <input
                type="text"
                value={numeroPedido}
                onChange={(e) => setNumeroPedido(e.target.value)}
                placeholder="Ex: #12345, ABC-678..."
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid #cbd5e1',
                  fontSize: '14px',
                  background: isDark ? 'rgba(255,255,255,0.06)' : '#fff',
                  color: isDark ? '#fff' : "#1e293b",
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Print do Pedido (screenshot) */}
            <div>
              <span style={{ fontWeight: 600, fontSize: '14px', color: isDark ? '#93c5fd' : "#475569", marginBottom: '8px', display: 'block' }}>
                Print / Foto do Pedido
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                style={{ display: "none" }}
              />
              {printPedido ? (
                <div style={{ position: "relative" }}>
                  <img
                    src={printPedido}
                    alt="Print do pedido"
                    style={{ width: '100%', borderRadius: '12px', maxHeight: '400px', objectFit: 'contain', background: isDark ? 'rgba(255,255,255,0.04)' : '#f8fafc' }}
                  />
                  <button
                    onClick={() => setPrintPedido(null)}
                    style={{
                      position: "absolute",
                      top: "8px",
                      right: "8px",
                      padding: "6px",
                      borderRadius: "50%",
                      background: "rgba(0,0,0,0.6)",
                      border: "none",
                      cursor: "pointer",
                      color: p.text,
                    }}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleCapturePrint}
                  style={{
                    width: '100%',
                    padding: '20px',
                    borderRadius: '12px',
                    border: isDark ? '2px dashed rgba(255,255,255,0.15)' : '2px dashed #cbd5e1',
                    background: isDark ? 'rgba(255,255,255,0.04)' : '#fff',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <Camera className="w-6 h-6" style={{ color: isDark ? '#7dd3fc' : '#475569' }} />
                  <span style={{ fontSize: '13px', color: isDark ? '#93c5fd' : "#475569" }}>
                    Tirar foto ou selecionar imagem
                  </span>
                </button>
              )}
            </div>

            {/* Observação */}
            <div>
              <span style={{ fontWeight: 600, fontSize: '14px', color: isDark ? '#93c5fd' : "#475569", marginBottom: '8px', display: 'block' }}>
                Observação
              </span>
              <textarea
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                placeholder="Ex: Pedido para João, deixar na portaria..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid #cbd5e1',
                  fontSize: '14px',
                  background: isDark ? 'rgba(255,255,255,0.06)' : '#fff',
                  color: isDark ? '#fff' : "#1e293b",
                  outline: 'none',
                  resize: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={!servico || submitting}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '14px',
                background: servico
                  ? 'linear-gradient(135deg, rgba(59,130,246,0.3), rgba(59,130,246,0.15))'
                  : 'rgba(255,255,255,0.04)',
                border: servico ? '1.5px solid rgba(59,130,246,0.4)' : (isDark ? '1.5px solid rgba(255,255,255,0.08)' : '2px solid #003580'),
                color: servico ? '#fff' : (isDark ? '#64748b' : '#003580'),
                fontWeight: 700,
                fontSize: '15px',
                cursor: servico ? 'pointer' : 'not-allowed',
                opacity: submitting ? 0.7 : 1,
              }}
            >
              {submitting ? "Enviando..." : "Autorizar Delivery"}
            </button>
          </div>
        )}

        {/* ─── Pending deliveries ─── */}
        {pendentes.length > 0 && (
          <div>
            <h3 style={{ fontWeight: 700, fontSize: '15px', color: isDark ? '#fff' : "#1e293b", marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock className="w-4 h-4" style={{ color: '#f97316' }} />
              Aguardando ({pendentes.length})
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {pendentes.map((d) => {
                const sv = getServicoInfo(d.servico);
                return (
                  <div
                    key={d.id}
                    style={{
                      background: isDark ? 'rgba(255,255,255,0.06)' : '#f8fafc',
                      borderRadius: '14px',
                      padding: '16px',
                      border: isDark ? '1.5px solid rgba(255,255,255,0.1)' : '1.5px solid #cbd5e1',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '10px',
                            background: `${sv.color}25`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '18px',
                          }}
                        >
                          {d.servico === 'ifood' ? '🍔' :
                           d.servico === 'rappi' ? '🛵' :
                           d.servico === 'uber_eats' ? '🥡' :
                           d.servico === '99food' ? '🍕' :
                           d.servico === 'loggi' ? '📦' : '🏪'}
                        </div>
                        <div>
                          <p style={{ fontWeight: 600, fontSize: '14px', color: isDark ? '#fff' : "#1e293b" }}>
                            {d.servico === 'outro' && d.servico_custom ? d.servico_custom : sv.label}
                          </p>
                          {d.numero_pedido && (
                            <p style={{ fontSize: '12px', color: isDark ? '#93c5fd' : "#475569" }}>Pedido: {d.numero_pedido}</p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleCancel(d.id)}
                        style={{
                          padding: '6px',
                          borderRadius: '8px',
                          border: 'none',
                          background: 'rgba(239,68,68,0.15)',
                          cursor: 'pointer',
                        }}
                      >
                        <Trash2 className="w-4 h-4" style={{ color: '#f87171' }} />
                      </button>
                    </div>
                    {d.observacao && (
                      <p style={{ fontSize: '12px', color: isDark ? '#93c5fd' : "#475569", paddingLeft: '32px' }}>
                        {d.observacao}
                      </p>
                    )}
                    {d.print_pedido && (
                      <div style={{ paddingLeft: '32px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: isDark ? '#7dd3fc' : '#475569', fontSize: '11px' }}>
                          <Image className="w-3 h-3" />
                          Print anexado
                        </div>
                      </div>
                    )}
                    <div style={{ paddingLeft: '32px' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '4px 10px',
                          borderRadius: '20px',
                          background: 'rgba(245,158,11,0.15)',
                          color: '#fbbf24',
                          fontSize: '11px',
                          fontWeight: 600,
                        }}
                      >
                        <Clock className="w-3 h-3" />
                        Aguardando entrega
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── Received deliveries ─── */}
        {recebidos.length > 0 && (
          <div>
            <h3 style={{ fontWeight: 700, fontSize: '15px', color: isDark ? '#fff' : "#1e293b", marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 className="w-4 h-4" style={{ color: '#22c55e' }} />
              Recebidos ({recebidos.length})
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {recebidos.map((d) => {
                const sv = getServicoInfo(d.servico);
                return (
                  <div
                    key={d.id}
                    style={{
                      background: isDark ? 'rgba(255,255,255,0.04)' : '#f8fafc',
                      borderRadius: '14px',
                      padding: '16px',
                      border: '1px solid rgba(34,197,94,0.2)',
                      opacity: 0.8,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '10px',
                          background: 'rgba(34,197,94,0.15)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '18px',
                        }}
                      >
                        ✅
                      </div>
                      <div>
                        <p style={{ fontWeight: 600, fontSize: '14px', color: isDark ? '#fff' : "#1e293b" }}>
                          {d.servico === 'outro' && d.servico_custom ? d.servico_custom : sv.label}
                        </p>
                        {d.numero_pedido && (
                          <p style={{ fontSize: '12px', color: isDark ? '#93c5fd' : "#475569" }}>Pedido: {d.numero_pedido}</p>
                        )}
                      </div>
                    </div>
                    <div style={{ paddingLeft: '32px' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '4px 10px',
                          borderRadius: '20px',
                          background: 'rgba(34,197,94,0.15)',
                          color: '#4ade80',
                          fontSize: '11px',
                          fontWeight: 600,
                        }}
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        Recebido{d.recebido_at ? ` em ${new Date(d.recebido_at).toLocaleString('pt-BR')}` : ''}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loading && deliveries.length === 0 && !showForm && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '48px 24px',
              gap: '16px',
              textAlign: 'center',
            }}
          >
            <div style={{ width: 72, height: 72, borderRadius: 22, background: isDark ? 'linear-gradient(135deg, rgba(255,255,255,0.15), rgba(255,255,255,0.05))' : 'linear-gradient(135deg, #e2e8f0, #f1f5f9)', border: isDark ? '1.5px solid rgba(255,255,255,0.2)' : '1.5px solid #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Truck className="w-8 h-8" style={{ color: isDark ? '#7dd3fc' : '#475569' }} />
            </div>
            <p style={{ fontSize: '15px', color: isDark ? '#fff' : "#1e293b", fontWeight: 500 }}>
              Nenhuma autorização de delivery ainda.
            </p>
            <p style={{ fontSize: '13px', color: isDark ? '#93c5fd' : "#475569" }}>
              Informe quando estiver esperando um pedido para facilitar a entrega na portaria.
            </p>
          </div>
        )}

        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}>
            <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'transparent' }} />
          </div>
        )}
      </main>
    </div>
  );
}
