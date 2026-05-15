import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import TutorialButton, { FlowPortaria, FlowMorador, TSection, TStep, TBullet } from "@/components/TutorialButton";
import {
  ArrowLeft,
  Mail,
  CheckCircle2,
  Clock,
  Package,
} from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import ComoFunciona from "@/components/ComoFunciona";
import { apiFetch } from "@/lib/api";

const API = "/api/correspondencias";

interface Correspondencia {
  id: number;
  protocolo: string;
  morador_name: string;
  bloco: string;
  apartamento: string;
  tipo: string;
  remetente: string | null;
  descricao: string | null;
  foto: string | null;
  status: string;
  created_at: string;
  retirado_at: string | null;
}

export default function MoradorCorrespondencias() {
  const { isDark } = useTheme();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [correspondencias, setCorrespondencias] = useState<Correspondencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pendente");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const fetchCorrespondencias = async () => {
    try {
      const url = filter !== "todas" ? `${API}?status=${filter}` : API;
      const res = await apiFetch(url, {  });
      if (res.ok) setCorrespondencias(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchCorrespondencias();
  }, [filter]);

  const tipoLabel: Record<string, string> = {
    encomenda: "📦 Encomenda",
    carta: "✉️ Carta",
    sedex: "📮 Sedex",
    pac: "📬 PAC",
    notificacao: "📄 Notificação",
    outro: "📋 Outro",
  };

  const formatDate = (d: string) => {
    const dt = new Date(d);
    return dt.toLocaleDateString("pt-BR") + " " + dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  };

  const pendingCount = correspondencias.filter((c) => c.status === "pendente").length;

  return (
    <div style={{ minHeight: '100dvh', background: isDark ? "linear-gradient(180deg, #001533 0%, #002254 25%, #003580 55%, #004aad 100%)" : "#f0f4f8", paddingBottom: '6rem' }}>
      {/* Header */}
      <header style={{ background: isDark ? "linear-gradient(135deg, #001533 0%, #002a66 50%, #004aad 100%)" : "#ffffff", borderBottom: isDark ? '1px solid rgba(255,255,255,0.08)' : "1px solid #e2e8f0", boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.3)' : "0 2px 8px rgba(0,0,0,0.06)", padding: '1rem 1.5rem', color: isDark ? '#fff' : "#1e293b" }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => navigate('/dashboard')} style={{ padding: 10, borderRadius: 14, background: isDark ? 'rgba(255,255,255,0.08)' : '#f8fafc', border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid #cbd5e1', color: isDark ? '#fff' : "#1e293b", display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div style={{ flex: 1 }}>
            <h1 className="text-lg font-bold" style={{ color: isDark ? '#fff' : "#1e293b" }}>Minhas Correspondências</h1>
            <p style={{ color: isDark ? '#93c5fd' : "#475569", fontSize: "13px" }}>
              {user?.block && user?.unit ? `Bloco ${user.block} · Apto ${user.unit}` : "Avisos de correspondência"}
            </p>
          </div>
          <TutorialButton title="Minhas Correspondências">
            <TSection icon={<span>📋</span>} title="O QUE É ESTA FUNÇÃO?">
              <p>Aqui você vê <strong>todas as correspondências e encomendas</strong> que chegaram para você na portaria — cartas, pacotes do Correios, Mercado Livre, Amazon, Shopee, documentos, etc. Você recebe um <strong>aviso automático no WhatsApp</strong> sempre que algo chegar.</p>
            </TSection>
            <FlowPortaria>
              <TStep n={1}>Chega uma encomenda ou carta na portaria com seu nome</TStep>
              <TStep n={2}>O porteiro registra no sistema: <strong>tipo</strong> (encomenda, carta, documento), <strong>origem</strong> (Correios, Sedex, ML) e <strong>tira foto</strong></TStep>
              <TStep n={3}>Você recebe um <strong>aviso automático no WhatsApp</strong>: "Você tem uma correspondência na portaria"</TStep>
              <TStep n={4}>A correspondência aparece aqui no app com status <strong>"Aguardando retirada"</strong></TStep>
              <p style={{ marginTop: "8px", fontSize: "14px", color: "#2d3354" }}>👉 <strong>Você vê:</strong> Detalhes completos (tipo, origem, foto do pacote, data/hora de chegada) e pode ir buscar quando quiser.</p>
            </FlowPortaria>
            <FlowMorador>
              <TStep n={1}>Você vai até a portaria para <strong>retirar a correspondência</strong></TStep>
              <TStep n={2}>O porteiro localiza seu pacote e <strong>confirma a retirada</strong> no sistema</TStep>
              <TStep n={3}>O status muda para <strong>"Retirada"</strong> com data e hora da retirada</TStep>
              <p style={{ marginTop: "8px", fontSize: "14px", color: "#166534" }}>👉 <strong>Registro completo:</strong> Você tem o histórico de quando chegou e quando retirou — útil para reclamações de extravio.</p>
            </FlowMorador>
            <TSection icon={<span>🔍</span>} title="STATUS DAS CORRESPONDÊNCIAS">
              <TBullet><strong style={{ color: "#d97706" }}>Aguardando retirada</strong> — Chegou na portaria e está esperando você buscar (destaque amarelo)</TBullet>
              <TBullet><strong style={{ color: "#16a34a" }}>Retirada</strong> — Você já buscou na portaria (com data e hora)</TBullet>
            </TSection>
            <TSection icon={<span>⭐</span>} title="DICAS IMPORTANTES">
              <TBullet>Correspondências pendentes ficam em <strong>destaque amarelo</strong> para não esquecer de buscar</TBullet>
              <TBullet>O porteiro tira <strong>foto do pacote</strong> — você pode ver no app antes de descer</TBullet>
              <TBullet>Você recebe <strong>notificação no WhatsApp</strong> automaticamente — não precisa ficar verificando o app</TBullet>
              <TBullet><strong>Histórico completo</strong> de todas as correspondências recebidas — útil para comprovar recebimentos</TBullet>
              <TBullet>Se não recebeu a notificação, verifique se seu <strong>WhatsApp está correto</strong> no cadastro</TBullet>
            </TSection>
          </TutorialButton>
          {pendingCount > 0 && (
            <div style={{
              background: "#fbbf24", color: "#78350f", borderRadius: "20px",
              padding: "4px 12px", fontSize: "13px", fontWeight: 800,
            }}>
              {pendingCount} pendente{pendingCount > 1 ? "s" : ""}
            </div>
          )}
        </div>
      </header>

      <main style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
        <ComoFunciona steps={[
          "✉️ Portaria registra sua correspondência com foto",
          "📱 Você recebe aviso no WhatsApp e app",
          "📋 Apresente QR Code ou protocolo para retirar",
          "✅ Confirme retirada direto no app",
        ]} />
        {/* Filters */}
        <div style={{ display: "flex", gap: "12px" }}>
          {[
            { v: "pendente", l: "Pendentes" },
            { v: "retirada", l: "Retiradas" },
            { v: "todas", l: "Todas" },
          ].map((f) => (
            <button
              key={f.v}
              onClick={() => setFilter(f.v)}
              style={{
                padding: '8px 16px', borderRadius: '20px', border: 'none',
                background: filter === f.v ? 'rgba(59,130,246,0.3)' : 'rgba(255,255,255,0.06)',
                color: filter === f.v ? '#fff' : '#93c5fd',
                fontSize: "14px", fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '6px',
              }}
            >
              {filter === f.v && <CheckCircle2 style={{ width: 18, height: 18, color: '#4ade80' }} />}
              {f.l}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'transparent' }} />
          </div>
        ) : correspondencias.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
            <div style={{ width: 72, height: 72, borderRadius: 22, background: isDark ? 'linear-gradient(135deg, rgba(255,255,255,0.15), rgba(255,255,255,0.05))' : 'linear-gradient(135deg, #e2e8f0, #f1f5f9)', border: isDark ? '1.5px solid rgba(255,255,255,0.2)' : '1.5px solid #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <Mail className="w-8 h-8" style={{ color: isDark ? '#7dd3fc' : '#475569' }} />
            </div>
            <p style={{ fontWeight: 600, fontSize: '16px', color: isDark ? '#fff' : "#1e293b" }}>Nenhuma correspondência</p>
            <p style={{ fontSize: "14px", marginTop: '4px', color: isDark ? '#93c5fd' : "#475569" }}>
              {filter === 'pendente'
                ? 'Você não tem correspondências pendentes.'
                : filter === 'retirada'
                ? 'Nenhuma correspondência retirada.'
                : 'Nenhuma correspondência registrada para você.'}
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {correspondencias.map((c) => {
              const isExpanded = expandedId === c.id;
              const isPending = c.status === "pendente";
              return (
                <div
                  key={c.id}
                  onClick={() => setExpandedId(isExpanded ? null : c.id)}
                  style={{
                    background: isDark ? 'rgba(255,255,255,0.06)' : '#f8fafc', borderRadius: '16px',
                    border: isPending ? '2px solid rgba(251,191,36,0.4)' : '1.5px solid rgba(255,255,255,0.1)',
                    overflow: 'hidden', cursor: 'pointer', transition: 'all 0.2s',
                  }}
                >
                  {/* Card header */}
                  <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '48px', height: '48px', borderRadius: '14px',
                      background: isPending
                        ? 'linear-gradient(135deg, #fbbf24, #f59e0b)'
                        : 'linear-gradient(135deg, #34d399, #10b981)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      {isPending
                        ? <Package className="w-7 h-7" style={{ color: isDark ? '#fff' : "#1e293b" }} />
                        : <CheckCircle2 className="w-7 h-7" style={{ color: isDark ? '#fff' : "#1e293b" }} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 700, fontSize: "15px", color: isDark ? '#fff' : "#1e293b", margin: 0 }}>
                        {tipoLabel[c.tipo] || c.tipo}
                      </p>
                      <p style={{ fontSize: "13px", color: isDark ? '#93c5fd' : "#475569", margin: '2px 0 0' }}>
                        {formatDate(c.created_at)}
                      </p>
                      <p style={{
                        fontSize: "12px", fontWeight: 700, margin: '2px 0 0',
                        color: isDark ? '#7dd3fc' : '#475569',
                      }}>
                        Protocolo: {c.protocolo}
                      </p>
                    </div>
                    <div style={{
                      padding: '4px 10px', borderRadius: '20px', fontSize: "12px", fontWeight: 700,
                      background: isPending ? 'rgba(245,158,11,0.15)' : 'rgba(34,197,94,0.15)',
                      color: isPending ? '#fbbf24' : '#4ade80',
                      flexShrink: 0,
                    }}>
                      {isPending ? 'Pendente' : 'Retirada'}
                    </div>
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div style={{
                      padding: '0 16px 16px', borderTop: '1px solid rgba(255,255,255,0.06)',
                      display: 'flex', flexDirection: 'column', gap: '12px', paddingTop: '14px',
                    }}>
                      {/* Info grid */}
                      <div style={{
                        background: isDark ? 'rgba(255,255,255,0.04)' : '#f8fafc', borderRadius: '12px', padding: '14px',
                        display: 'flex', flexDirection: 'column', gap: '10px',
                      }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                          <div>
                            <span style={{ fontSize: "12px", color: isDark ? '#7dd3fc' : '#475569', fontWeight: 600 }}>PROTOCOLO</span>
                            <p style={{ fontSize: "15px", fontWeight: 700, color: isDark ? '#93c5fd' : "#475569", margin: '2px 0 0' }}>{c.protocolo}</p>
                          </div>
                          <div>
                            <span style={{ fontSize: "12px", color: isDark ? '#7dd3fc' : '#475569', fontWeight: 600 }}>TIPO</span>
                            <p style={{ fontSize: "15px", color: isDark ? '#fff' : "#1e293b", margin: '2px 0 0' }}>{tipoLabel[c.tipo] || c.tipo}</p>
                          </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                          <div>
                            <span style={{ fontSize: "12px", color: isDark ? '#7dd3fc' : '#475569', fontWeight: 600 }}>DATA</span>
                            <p style={{ fontSize: "14px", color: isDark ? '#fff' : "#1e293b", margin: '2px 0 0' }}>
                              {new Date(c.created_at).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                          <div>
                            <span style={{ fontSize: "12px", color: isDark ? '#7dd3fc' : '#475569', fontWeight: 600 }}>HORA</span>
                            <p style={{ fontSize: "14px", color: isDark ? '#fff' : "#1e293b", margin: '2px 0 0' }}>
                              {new Date(c.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>

                        {c.remetente && (
                          <div>
                            <span style={{ fontSize: "12px", color: isDark ? '#7dd3fc' : '#475569', fontWeight: 600 }}>REMETENTE</span>
                            <p style={{ fontSize: "15px", color: isDark ? '#fff' : "#1e293b", fontWeight: 600, margin: '2px 0 0' }}>{c.remetente}</p>
                          </div>
                        )}

                        {c.descricao && (
                          <div>
                            <span style={{ fontSize: "12px", color: isDark ? '#7dd3fc' : '#475569', fontWeight: 600 }}>DESCRIÇÃO</span>
                            <p style={{ fontSize: "14px", color: isDark ? '#fff' : "#1e293b", margin: '2px 0 0' }}>{c.descricao}</p>
                          </div>
                        )}

                        <div>
                          <span style={{ fontSize: "12px", color: isDark ? '#7dd3fc' : '#475569', fontWeight: 600 }}>STATUS</span>
                          <p style={{
                            fontSize: "15px", fontWeight: 700, margin: '2px 0 0',
                            color: isPending ? '#fbbf24' : '#4ade80',
                          }}>
                            {isPending ? '⏳ Aguardando retirada' : '✅ Retirada'}
                          </p>
                        </div>

                        {c.retirado_at && (
                          <div>
                            <span style={{ fontSize: "12px", color: isDark ? '#7dd3fc' : '#475569', fontWeight: 600 }}>RETIRADA EM</span>
                            <p style={{ fontSize: "14px", color: '#4ade80', fontWeight: 600, margin: '2px 0 0' }}>
                              {formatDate(c.retirado_at)}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Photo */}
                      {c.foto && (
                        <div>
                          <span style={{ fontSize: "12px", color: isDark ? '#7dd3fc' : '#475569', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                            FOTO DA CORRESPONDÊNCIA
                          </span>
                          <img src={c.foto} alt="Correspondência" style={{
                            width: '100%', borderRadius: '12px', maxHeight: '400px',
                            objectFit: 'contain', background: isDark ? 'rgba(255,255,255,0.04)' : '#f8fafc',
                          }} />
                        </div>
                      )}

                      {/* Pending notice */}
                      {isPending && (
                        <div style={{
                          background: 'rgba(245,158,11,0.1)', borderRadius: '12px', padding: '12px 14px',
                          display: 'flex', alignItems: 'center', gap: '10px',
                          border: '1px solid rgba(245,158,11,0.3)',
                        }}>
                          <Clock className="w-6 h-6" style={{ color: '#fbbf24', flexShrink: 0 }} />
                          <p style={{ fontSize: "14px", color: '#fcd34d', fontWeight: 600, margin: 0 }}>
                            Correspondência aguardando retirada na portaria.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
