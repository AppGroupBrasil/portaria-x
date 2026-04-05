import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import TutorialButton, { FlowPortaria, FlowMorador, TSection, TStep, TBullet } from "@/components/TutorialButton";
import { compressCanvas } from "@/lib/imageUtils";
import {
  ArrowLeft,
  Truck,
  Camera,
  X,
  CheckCircle2,
  Clock,
  Phone,
  Package,
  Image,
  Search,
  FileText,
  Download,
  Plus,
} from "lucide-react";
import SearchableSelect from "@/components/SearchableSelect";
import ReportModal from "@/components/ReportModal";
import { gerarPdfDelivery, gerarRelatorioDelivery, gerarRelatorioDeliveryComGraficos } from "@/lib/pdfUtils";
import { apiFetch } from "@/lib/api";
import { useTheme } from "@/hooks/useTheme";
import ComoFunciona from "@/components/ComoFunciona";

const API = "/api/delivery-authorizations";

const SERVICOS: Record<string, { label: string; color: string; emoji: string }> = {
  ifood: { label: "iFood", color: "#EA1D2C", emoji: "🍔" },
  rappi: { label: "Rappi", color: "#FF6B00", emoji: "🛵" },
  uber_eats: { label: "Uber Eats", color: "#06C167", emoji: "🥡" },
  "99food": { label: "99 Food", color: "#FFDD00", emoji: "🍕" },
  loggi: { label: "Loggi", color: "#00BAFF", emoji: "📦" },
  outro: { label: "Outro", color: "#6366f1", emoji: "🏪" },
};

interface DeliveryAuth {
  id: number;
  morador_name: string;
  morador_phone: string | null;
  bloco: string | null;
  apartamento: string | null;
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

export default function DeliveryPorteiro() {
  const { isDark, p } = useTheme();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [deliveries, setDeliveries] = useState<DeliveryAuth[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pendente" | "recebido" | "todas">("pendente");
  const [searchTerm, setSearchTerm] = useState("");

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState<DeliveryAuth | null>(null);
  const [fotoEntrega, setFotoEntrega] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Print preview modal
  const [printPreview, setPrintPreview] = useState<string | null>(null);
  const [showReport, setShowReport] = useState(false);

  // ─── Form state (portaria registration) ──────────────
  const [showForm, setShowForm] = useState(false);
  const [formBlocks, setFormBlocks] = useState<{ id: number; name: string }[]>([]);
  const [formMoradores, setFormMoradores] = useState<{ id: number; name: string; unit: string | null; phone: string | null }[]>([]);
  const [formBloco, setFormBloco] = useState("");
  const [formMoradorId, setFormMoradorId] = useState("");
  const [formApartamento, setFormApartamento] = useState("");
  const [formServico, setFormServico] = useState("");
  const [formServicoCustom, setFormServicoCustom] = useState("");
  const [formNumeroPedido, setFormNumeroPedido] = useState("");
  const [formObs, setFormObs] = useState("");
  const [formFoto, setFormFoto] = useState<string | null>(null);
  const [formCapturing, setFormCapturing] = useState(false);
  const formVideoRef = useRef<HTMLVideoElement>(null);
  const formStreamRef = useRef<MediaStream | null>(null);
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const fetchBlocks = async () => {
    try {
      const res = await apiFetch("/api/blocos");
      if (res.ok) setFormBlocks(await res.json());
    } catch { /* ignore */ }
  };

  const fetchMoradoresBloco = async (b: string) => {
    if (!b) { setFormMoradores([]); return; }
    try {
      const res = await apiFetch(`/api/visitors/moradores-bloco?bloco=${encodeURIComponent(b)}`);
      if (res.ok) setFormMoradores(await res.json());
    } catch { setFormMoradores([]); }
  };

  const handleOpenForm = () => {
    setShowForm(true);
    setFormBloco(""); setFormMoradorId(""); setFormApartamento("");
    setFormServico(""); setFormServicoCustom(""); setFormNumeroPedido("");
    setFormObs(""); setFormFoto(null); setFormError("");
    fetchBlocks();
  };

  const handleSelectFormMorador = (moradorId: string) => {
    setFormMoradorId(moradorId);
    if (!moradorId) { setFormApartamento(""); return; }
    const m = formMoradores.find((x) => String(x.id) === moradorId);
    if (m) setFormApartamento(m.unit || "");
  };

  const startFormCamera = async () => {
    try {
      setFormCapturing(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      formStreamRef.current = stream;
      if (formVideoRef.current) {
        formVideoRef.current.srcObject = stream;
        formVideoRef.current.play();
      }
    } catch {
      setFormCapturing(false);
    }
  };

  const captureFormPhoto = () => {
    if (!formVideoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = formVideoRef.current.videoWidth;
    canvas.height = formVideoRef.current.videoHeight;
    canvas.getContext("2d")?.drawImage(formVideoRef.current, 0, 0);
    setFormFoto(compressCanvas(canvas, "general"));
    stopFormCamera();
  };

  const stopFormCamera = () => {
    if (formStreamRef.current) {
      formStreamRef.current.getTracks().forEach((t) => t.stop());
      formStreamRef.current = null;
    }
    setFormCapturing(false);
  };

  const handleSubmitForm = async () => {
    if (!formBloco || !formMoradorId || !formServico) {
      setFormError("Selecione bloco, morador e servico.");
      return;
    }
    setFormSaving(true);
    setFormError("");

    const morador = formMoradores.find((x) => String(x.id) === formMoradorId);
    const morador_name = morador ? morador.name : `Morador Bloco ${formBloco} Apto ${formApartamento}`;
    const morador_phone = morador?.phone || "";

    try {
      const res = await apiFetch(`${API}/portaria`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          morador_id: Number(formMoradorId),
          morador_name,
          morador_phone,
          bloco: formBloco,
          apartamento: formApartamento,
          servico: formServico,
          servico_custom: formServicoCustom || null,
          numero_pedido: formNumeroPedido || null,
          observacao: formObs || null,
          foto_entrega: formFoto,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setFormError(data.error || "Erro ao registrar.");
        return;
      }

      // Build WhatsApp URL
      const cleanPhone = morador_phone.replaceAll(/\D/g, "");
      const fullPhone = cleanPhone && !cleanPhone.startsWith("55") ? `55${cleanPhone}` : cleanPhone;
      const sv = SERVICOS[formServico] || SERVICOS["outro"];
      const serviceName = formServico === "outro" && formServicoCustom ? formServicoCustom : sv.label;
      const msg = [
        `*AVISO DE DELIVERY*`,
        ``,
        `Ola ${morador_name}! Chegou uma entrega para voce na portaria.`,
        ``,
        `*Servico:* ${serviceName}`,
        formNumeroPedido ? `*Pedido:* ${formNumeroPedido}` : "",
        `*Bloco:* ${formBloco} | *Apto:* ${formApartamento}`,
        ``,
        `Por favor, venha retirar na portaria.`,
      ].filter(Boolean).join("\n");

      const waUrl = fullPhone
        ? `https://wa.me/${fullPhone}?text=${encodeURIComponent(msg)}`
        : "";

      stopFormCamera();
      setShowForm(false);
      fetchDeliveries();

      if (waUrl) {
        setTimeout(() => { globalThis.open(waUrl, "_blank"); }, 300);
      }
    } catch {
      setFormError("Erro de conexao.");
    } finally {
      setFormSaving(false);
    }
  };

  const fetchDeliveries = async () => {
    try {
      const url = filter !== "todas" ? `${API}?status=${filter}` : API;
      const res = await fetch(url, {  });
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
    setLoading(true);
    fetchDeliveries();
  }, [filter]);

  const getServicoInfo = (s: string) => SERVICOS[s] || SERVICOS["outro"];

  const filtered = deliveries.filter((d) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      d.morador_name?.toLowerCase().includes(term) ||
      d.bloco?.toLowerCase().includes(term) ||
      d.apartamento?.toLowerCase().includes(term) ||
      d.numero_pedido?.toLowerCase().includes(term) ||
      d.servico_custom?.toLowerCase().includes(term)
    );
  });

  // ─── Camera controls ────────────────────────────────
  const startCamera = async () => {
    try {
      setCapturing(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      console.error("Erro ao acessar câmera:", err);
      alert("Não foi possível acessar a câmera.");
      setCapturing(false);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    setFotoEntrega(compressCanvas(canvas, "general"));
    stopCamera();
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCapturing(false);
  };

  const openRecebidoModal = (delivery: DeliveryAuth) => {
    setSelectedDelivery(delivery);
    setFotoEntrega(null);
    setCapturing(false);
    setModalOpen(true);
  };

  const closeModal = () => {
    stopCamera();
    setModalOpen(false);
    setSelectedDelivery(null);
    setFotoEntrega(null);
  };

  const buildWhatsAppUrl = (delivery: DeliveryAuth) => {
    if (!delivery.morador_phone) return null;
    const phone = delivery.morador_phone.replaceAll(/\D/g, "");
    const fullPhone = phone.startsWith("55") ? phone : `55${phone}`;
    const sv = getServicoInfo(delivery.servico);
    const serviceName = delivery.servico === "outro" && delivery.servico_custom
      ? delivery.servico_custom
      : sv.label;
    const msg = `*Delivery Recebido na Portaria*\n\nServico: ${serviceName}${delivery.numero_pedido ? `\nPedido: ${delivery.numero_pedido}` : ""}\n\nSeu pedido foi recebido e esta na portaria. Por favor, venha retirar.`;
    return `https://wa.me/${fullPhone}?text=${encodeURIComponent(msg)}`;
  };

  const handleConfirmRecebido = async () => {
    if (!selectedDelivery) return;
    setSubmitting(true);

    // Build WhatsApp URL BEFORE the async call so we have it ready
    const waUrl = buildWhatsAppUrl(selectedDelivery);

    try {
      const res = await apiFetch(`${API}/${selectedDelivery.id}/recebido`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ foto_entrega: fotoEntrega }),
      });

      if (res.ok) {
        closeModal();
        fetchDeliveries();

        // Navigate to WhatsApp after modal closes
        // Use location.href which isn't blocked by popup blockers
        if (waUrl) {
          setTimeout(() => {
            globalThis.window.location.href = waUrl;
          }, 300);
        }
      }
    } catch (err) {
      console.error("Erro ao confirmar recebido:", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: p.pageBg }}>
      {/* Header */}
      <header
        className="sticky top-0 z-40"
        style={{
          background: p.headerBg,
          padding: "1rem 1.5rem",
          borderBottom: p.headerBorder,
          boxShadow: p.headerShadow,
          color: p.text,
          paddingTop: "max(0, env(safe-area-inset-top))",
        }}
      >
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/dashboard")}
            style={{ width: 40, height: 40, borderRadius: 12, background: p.btnBg, border: p.btnBorder, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: p.text }}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3 flex-1">
            <Truck className="w-6 h-6" />
            <div>
              <h1 style={{ fontWeight: 700, fontSize: 18 }}>Entregas e Delivery</h1>
              <p style={{ color: isDark ? "rgba(255,255,255,0.6)" : "#64748b", fontSize: 12 }}>Gerenciar entregas pendentes</p>
            </div>
          </div>
          <TutorialButton title="Deliveries (Entregas)">
            <TSection icon={<span>📋</span>} title="O QUE E ESTA FUNCAO?">
              <p>Gerencia <strong>todas as entregas de delivery</strong> (iFood, Rappi, Uber Eats, Mercado Livre, Correios, etc.) que chegam na portaria. O porteiro registra cada entrega, o sistema notifica o morador automaticamente, e tudo fica registrado com data, hora, foto e comprovante.</p>
            </TSection>
            <FlowPortaria>
              <TStep n={1}>Entregador chega na portaria com o pedido</TStep>
              <TStep n={2}>Porteiro toca em <strong>+</strong> para registrar nova entrega</TStep>
              <TStep n={3}>Seleciona o <strong>morador destinatario</strong> (busca por nome, bloco ou unidade)</TStep>
              <TStep n={4}>Informa a <strong>origem</strong>: iFood, Rappi, Uber Eats, Mercado Livre, Correios, Amazon, Shopee, etc.</TStep>
              <TStep n={5}>Informa o <strong>tipo</strong> da entrega: Comida, Pacote, Documento, Envelope</TStep>
              <TStep n={6}>Tira <strong>foto da entrega</strong> (opcional mas recomendado como comprovante)</TStep>
              <TStep n={7}>Toca em <strong>"Registrar"</strong> — sistema salva e notifica o morador automaticamente</TStep>
              <p style={{ marginTop: "8px", fontSize: "13px", color: "#2d3354" }}>👉 <strong>O morador ve:</strong> Recebe notificacao no WhatsApp + aparece no app dele com status "Aguardando retirada". Quando descer para buscar, voce confirma a entrega.</p>
            </FlowPortaria>
            <FlowMorador>
              <TStep n={1}>Morador pode avisar antecipado pelo app: <strong>"Estou esperando um iFood"</strong> com codigo do pedido</TStep>
              <TStep n={2}>O aviso aparece na sua tela com <strong>destaque</strong> — voce ja sabe quem recebe</TStep>
              <TStep n={3}>Quando o entregador chegar, voce <strong>ja tem todas as informacoes</strong> (codigo, nome, tipo)</TStep>
              <TStep n={4}>Morador desce e retira. Voce toca em <strong>"Confirmar Retirada"</strong></TStep>
              <p style={{ marginTop: "8px", fontSize: "13px", color: "#166534" }}>👉 <strong>Registro completo:</strong> Status muda para "Entregue" com data, hora e porteiro responsavel.</p>
            </FlowMorador>
            <TSection icon={<span>🔍</span>} title="STATUS DAS ENTREGAS">
              <TBullet><strong style={{ color: "#d97706" }}>Aguardando retirada</strong> — Chegou na portaria, esperando morador buscar</TBullet>
              <TBullet><strong style={{ color: "#16a34a" }}>Entregue/Retirado</strong> — Morador ja buscou (com data e hora)</TBullet>
              <TBullet><strong style={{ color: "#2d3354" }}>Avisado</strong> — Morador avisou que esta esperando (aviso previo)</TBullet>
            </TSection>
            <TSection icon={<span>🔧</span>} title="FUNCOES DISPONIVEIS">
              <TBullet><strong>Foto da entrega</strong> — Tire foto do pacote/comida como comprovante</TBullet>
              <TBullet><strong>Notificacao automatica</strong> — O morador recebe WhatsApp + push no app</TBullet>
              <TBullet><strong>Busca rapida</strong> — Pesquise por morador, bloco, tipo ou origem</TBullet>
              <TBullet><strong>Historico completo</strong> — Todas as entregas registradas com detalhes</TBullet>
              <TBullet><strong>Relatorio PDF</strong> — Gere relatorios por periodo para controle</TBullet>
            </TSection>
            <TSection icon={<span>⭐</span>} title="DICAS IMPORTANTES">
              <TBullet><strong>Sempre tire foto</strong> da entrega — evita problemas de extravio ou reclamacoes</TBullet>
              <TBullet>Entregas de <strong>comida</strong> devem ser entregues rapido — use o botao de notificacao urgente</TBullet>
              <TBullet>Se o morador avisou previamente, a entrega aparece com <strong>destaque azul</strong></TBullet>
              <TBullet>Use a <strong>busca</strong> para encontrar morador rapidamente em condominios grandes</TBullet>
            </TSection>
          </TutorialButton>
        </div>

        {/* Search */}
        <div style={{ marginTop: "12px", position: "relative" }}>
          <Search
            className="w-4 h-4"
            style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: p.textDim }}
          />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por morador, bloco, pedido..."
            style={{
              width: "100%",
              padding: "10px 12px 10px 36px",
              borderRadius: "12px",
              border: isDark ? "1px solid rgba(255,255,255,0.2)" : "1px solid #cbd5e1",
              background: isDark ? "rgba(255,255,255,0.15)" : "#f0f4f8",
              color: p.text,
              fontSize: "13px",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Filter tabs */}
        <div style={{ display: "flex", gap: "12px", marginTop: "12px" }}>
          {([
            { key: "pendente", label: "Pendentes" },
            { key: "recebido", label: "Recebidos" },
            { key: "todas", label: "Todas" },
          ] as const).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              style={{
                padding: "6px 16px",
                borderRadius: "20px",
                border: "none",
                background: filter === tab.key
                  ? (isDark ? "#fff" : "#003580")
                  : (isDark ? "rgba(255,255,255,0.15)" : "#e2e8f0"),
                color: filter === tab.key
                  ? (isDark ? "#ea580c" : "#fff")
                  : (isDark ? "rgba(255,255,255,0.8)" : "#475569"),
                fontWeight: 600,
                fontSize: "12px",
                cursor: "pointer",
              }}
            >
              {tab.label}
            </button>
          ))}
          <button
            onClick={() => setShowReport(true)}
            style={{
              marginLeft: "auto", display: "flex", alignItems: "center", gap: "12px",
              padding: "10px 20px", borderRadius: "8px", border: "2px solid #d97706",
              background: "#fff",
              color: "#d97706", fontSize: "14px", fontWeight: 700, cursor: "pointer",
            }}
          >
            <FileText className="w-4 h-4" /> Relatório
          </button>
        </div>
      </header>

      <ReportModal
        show={showReport}
        onClose={() => setShowReport(false)}
        onGenerate={(dateFrom, dateTo, withCharts) => {
          const from = new Date(dateFrom + "T00:00:00");
          const to = new Date(dateTo + "T23:59:59");
          const filteredByDate = deliveries.filter((d) => {
            const dt = new Date(d.created_at);
            return dt >= from && dt <= to;
          });
          if (withCharts) {
            gerarRelatorioDeliveryComGraficos(filteredByDate, dateFrom, dateTo, user?.condominio_nome);
          } else {
            gerarRelatorioDelivery(filteredByDate, dateFrom, dateTo, user?.condominio_nome);
          }
        }}
        title="Gerar relatorio de Deliveries por periodo"
      />

      <main
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          padding: "20px",
          paddingBottom: "120px",
        }}
      >
        <ComoFunciona steps={[
          "📦 Portaria registra entrega com foto e dados do entregador",
          "📱 Morador recebe aviso no WhatsApp e no app",
          "🏢 Morador apresenta QR Code ou protocolo para retirar",
          "✅ Portaria confirma retirada no sistema",
        ]} />

        {loading && (
          <div style={{ display: "flex", justifyContent: "center", padding: "48px" }}>
            <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "48px 24px",
              gap: "16px",
              textAlign: "center",
            }}
          >
            <Package className="w-16 h-16" style={{ color: "#cbd5e1" }} />
            <p style={{ fontSize: "15px", color: "#64748b", fontWeight: 500 }}>
              Nenhum delivery {filter === "pendente" ? "pendente" : filter === "recebido" ? "recebido" : ""}.
            </p>
          </div>
        )}

        {/* Delivery Cards */}
        {filtered.map((d) => {
          const sv = getServicoInfo(d.servico);
          const isPendente = d.status === "pendente";
          return (
            <div
              key={d.id}
              style={{
                background: "var(--color-card, #fff)",
                borderRadius: "16px",
                padding: "16px",
                border: isPendente ? `2px solid ${sv.color}40` : "1px solid #e2e8f0",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              {/* Top row: service + status */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div
                    style={{
                      width: "44px",
                      height: "44px",
                      borderRadius: "12px",
                      background: `${sv.color}15`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "20px",
                    }}
                  >
                    {sv.emoji}
                  </div>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: "14px", color: "#0f172a" }}>
                      {d.servico === "outro" && d.servico_custom ? d.servico_custom : sv.label}
                    </p>
                    {d.numero_pedido && (
                      <p style={{ fontSize: "12px", color: "#64748b" }}>
                        Pedido: {d.numero_pedido}
                      </p>
                    )}
                  </div>
                </div>
                <span
                  style={{
                    padding: "4px 10px",
                    borderRadius: "20px",
                    fontSize: "11px",
                    fontWeight: 600,
                    background: isPendente ? "#fef3c7" : "#dcfce7",
                    color: isPendente ? "#b45309" : "#15803d",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  {isPendente ? <Clock className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                  {isPendente ? "Pendente" : "Recebido"}
                </span>
              </div>

              {/* Morador info */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "10px 12px",
                  borderRadius: "10px",
                  background: "#f8fafc",
                }}
              >
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600, fontSize: "13px", color: "#0f172a" }}>
                    {d.morador_name}
                  </p>
                  <p style={{ fontSize: "12px", color: "#64748b" }}>
                    {d.bloco && `Bloco ${d.bloco}`} {d.apartamento && `- Apt ${d.apartamento}`}
                  </p>
                </div>
                {d.morador_phone && (
                  <a
                    href={`tel:${d.morador_phone}`}
                    style={{
                      padding: "6px",
                      borderRadius: "8px",
                      background: "#e0f2fe",
                      display: "flex",
                    }}
                  >
                    <Phone className="w-4 h-4" style={{ color: "#0284c7" }} />
                  </a>
                )}
              </div>

              {/* Observação */}
              {d.observacao && (
                <p style={{ fontSize: "12px", color: "#64748b", fontStyle: "italic" }}>
                  💬 {d.observacao}
                </p>
              )}

              {/* Print do pedido */}
              {d.print_pedido && (
                <button
                  onClick={() => setPrintPreview(d.print_pedido)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "8px 12px",
                    borderRadius: "10px",
                    border: "1px solid #e2e8f0",
                    background: "#f8fafc",
                    cursor: "pointer",
                    fontSize: "12px",
                    color: "#475569",
                    fontWeight: 500,
                  }}
                >
                  <Image className="w-4 h-4" style={{ color: "#6366f1" }} />
                  Ver print do pedido
                </button>
              )}

              {/* Timestamps */}
              <div style={{ fontSize: "11px", color: "#94a3b8" }}>
                Criado: {new Date(d.created_at).toLocaleString("pt-BR")}
                {d.recebido_at && ` | Recebido: ${new Date(d.recebido_at).toLocaleString("pt-BR")}`}
              </div>

              {/* Action: Recebido */}
              {isPendente && (
                <button
                  onClick={() => openRecebidoModal(d)}
                  style={{
                    width: "100%",
                    padding: "14px 16px",
                    borderRadius: "12px",
                    background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
                    border: "none",
                    color: p.text,
                    fontWeight: 700,
                    fontSize: "14px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "12px",
                  }}
                >
                  <CheckCircle2 className="w-5 h-5" />
                  Recebido
                </button>
              )}

              {/* PDF button */}
              <button
                onClick={() => gerarPdfDelivery(d, user?.condominio_nome)}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                  width: "100%", padding: "8px", borderRadius: "10px", border: "none",
                  background: "linear-gradient(135deg, #0062d1 0%, #003d99 50%, #001d4a 100%)",
                  color: "#fff", fontSize: "12px", fontWeight: 700, cursor: "pointer",
                  marginTop: "4px",
                }}
              >
                <Download className="w-3 h-3" /> Baixar PDF
              </button>
            </div>
          );
        })}

        {/* Cadastrar Delivery button at the end of the list */}
        <button
          onClick={handleOpenForm}
          style={{
            width: "100%",
            padding: "16px",
            borderRadius: "16px",
            background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
            border: "none",
            color: "#fff",
            fontWeight: 700,
            fontSize: "15px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
            boxShadow: "0 4px 12px rgba(37,99,235,0.3)",
          }}
        >
          <Plus className="w-5 h-5" />
          Cadastrar Delivery
        </button>
      </main>

      {/* ════════ Print Preview Modal ════════ */}
      {printPreview && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            background: "rgba(0,0,0,0.85)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
          }}
          onClick={() => setPrintPreview(null)}
        >
          <button
            onClick={() => setPrintPreview(null)}
            style={{
              position: "absolute",
              top: "20px",
              right: "20px",
              padding: "8px",
              borderRadius: "50%",
              background: "rgba(255,255,255,0.2)",
              border: "none",
              cursor: "pointer",
              color: p.text,
            }}
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={printPreview}
            alt="Print do pedido"
            style={{ maxWidth: "100%", maxHeight: "80vh", borderRadius: "12px", objectFit: "contain" }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* ════════ Recebido Modal ════════ */}
      {modalOpen && selectedDelivery && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
          }}
          onClick={closeModal}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "480px",
              background: "var(--color-card, #fff)",
              borderRadius: "24px 24px 0 0",
              padding: "24px",
              display: "flex",
              flexDirection: "column",
              gap: "20px",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h2 style={{ fontWeight: 700, fontSize: "18px", color: "#0f172a" }}>
                Confirmar Recebimento
              </h2>
              <button
                onClick={closeModal}
                style={{ padding: "6px", borderRadius: "8px", border: "none", background: "transparent", cursor: "pointer" }}
              >
                <X className="w-5 h-5" style={{ color: "#64748b" }} />
              </button>
            </div>

            {/* Delivery info summary */}
            <div
              style={{
                padding: "14px",
                borderRadius: "12px",
                background: "#f8fafc",
                display: "flex",
                flexDirection: "column",
                gap: "6px",
              }}
            >
              <p style={{ fontWeight: 600, fontSize: "14px", color: "#0f172a" }}>
                {(() => {
                  const sv = getServicoInfo(selectedDelivery.servico);
                  return selectedDelivery.servico === "outro" && selectedDelivery.servico_custom
                    ? selectedDelivery.servico_custom
                    : sv.label;
                })()}{" "}
                {selectedDelivery.numero_pedido && `· ${selectedDelivery.numero_pedido}`}
              </p>
              <p style={{ fontSize: "13px", color: "#475569" }}>
                {selectedDelivery.morador_name} · Bloco {selectedDelivery.bloco} - Apt {selectedDelivery.apartamento}
              </p>
            </div>

            {/* Camera / Photo section */}
            <div>
              <span style={{ fontWeight: 600, fontSize: "14px", color: "#1e293b", marginBottom: "10px", display: "block" }}>
                📸 Foto da Entrega (opcional)
              </span>

              <canvas ref={canvasRef} style={{ display: "none" }} />

              {capturing ? (
                <div style={{ position: "relative", borderRadius: "12px", overflow: "hidden" }}>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{ width: "100%", borderRadius: "12px" }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      bottom: "12px",
                      left: 0,
                      right: 0,
                      display: "flex",
                      justifyContent: "center",
                      gap: "12px",
                    }}
                  >
                    <button
                      onClick={capturePhoto}
                      style={{
                        width: "60px",
                        height: "60px",
                        borderRadius: "50%",
                        background: "#fff",
                        border: "4px solid #22c55e",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Camera className="w-7 h-7" style={{ color: "#22c55e" }} />
                    </button>
                    <button
                      onClick={stopCamera}
                      style={{
                        width: "44px",
                        height: "44px",
                        borderRadius: "50%",
                        background: "rgba(0,0,0,0.5)",
                        border: "none",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        alignSelf: "center",
                      }}
                    >
                      <X className="w-5 h-5" style={{ color: p.text }} />
                    </button>
                  </div>
                </div>
              ) : fotoEntrega ? (
                <div style={{ position: "relative" }}>
                  <img
                    src={fotoEntrega}
                    alt="Foto da entrega"
                    style={{ width: "100%", borderRadius: "12px", maxHeight: "400px", objectFit: "contain", background: "#f1f5f9" }}
                  />
                  <button
                    onClick={() => { setFotoEntrega(null); startCamera(); }}
                    style={{
                      position: "absolute",
                      top: "8px",
                      right: "8px",
                      padding: "6px 12px",
                      borderRadius: "20px",
                      background: "rgba(0,0,0,0.6)",
                      border: "none",
                      cursor: "pointer",
                      color: p.text,
                      fontSize: "12px",
                      fontWeight: 600,
                    }}
                  >
                    Tirar outra
                  </button>
                </div>
              ) : (
                <button
                  onClick={startCamera}
                  style={{
                    width: "100%",
                    padding: "24px",
                    borderRadius: "12px",
                    border: "2px dashed #cbd5e1",
                    background: "#f8fafc",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "12px",
                  }}
                >
                  <Camera className="w-8 h-8" style={{ color: "#94a3b8" }} />
                  <span style={{ fontSize: "13px", color: "#64748b" }}>
                    Tirar foto da entrega
                  </span>
                </button>
              )}
            </div>

            {/* Confirm button */}
            <button
              onClick={handleConfirmRecebido}
              disabled={submitting}
              style={{
                width: "100%",
                padding: "14px",
                borderRadius: "14px",
                background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
                border: "none",
                color: p.text,
                fontWeight: 700,
                fontSize: "15px",
                cursor: "pointer",
                opacity: submitting ? 0.7 : 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "12px",
              }}
            >
              <CheckCircle2 className="w-5 h-5" />
              {submitting ? "Confirmando..." : "Confirmar Recebido e Avisar Morador"}
            </button>

            <p style={{ textAlign: "center", fontSize: "11px", color: "#94a3b8" }}>
              O morador será notificado via WhatsApp automaticamente.
            </p>
          </div>
        </div>
      )}

      {/* ════════ New Delivery Form Modal ════════ */}
      {showForm && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}
          onClick={() => { stopFormCamera(); setShowForm(false); }}
        >
          <div
            style={{
              width: "100%", maxWidth: "480px", background: isDark ? "#1e293b" : "#fff",
              borderRadius: "24px 24px 0 0", padding: "24px",
              display: "flex", flexDirection: "column", gap: "16px",
              maxHeight: "90vh", overflowY: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h2 style={{ fontWeight: 700, fontSize: "18px", color: isDark ? "#fff" : "#0f172a" }}>Registrar Delivery</h2>
              <button onClick={() => { stopFormCamera(); setShowForm(false); }} style={{ padding: "6px", borderRadius: "8px", border: "none", background: "transparent", cursor: "pointer" }}>
                <X className="w-5 h-5" style={{ color: "#64748b" }} />
              </button>
            </div>

            {formError && (
              <p style={{ color: "#ef4444", fontSize: "13px", fontWeight: 600 }}>{formError}</p>
            )}

            {/* Bloco */}
            <div>
              <span style={{ fontWeight: 600, fontSize: "13px", color: isDark ? "#93c5fd" : "#475569", marginBottom: "6px", display: "block" }}>Bloco *</span>
              <select
                value={formBloco}
                onChange={(e) => { setFormBloco(e.target.value); setFormMoradorId(""); setFormApartamento(""); fetchMoradoresBloco(e.target.value); }}
                style={{
                  width: "100%", padding: "10px 12px", borderRadius: "12px",
                  border: isDark ? "1px solid rgba(255,255,255,0.2)" : "1px solid #cbd5e1",
                  background: isDark ? "rgba(255,255,255,0.06)" : "#fff",
                  color: isDark ? "#fff" : "#1e293b", fontSize: "14px", boxSizing: "border-box",
                }}
              >
                <option value="">Selecione o bloco</option>
                {formBlocks.map((b) => <option key={b.id} value={b.name}>{b.name}</option>)}
              </select>
            </div>

            {/* Morador */}
            {formBloco && (
              <div>
                <span style={{ fontWeight: 600, fontSize: "13px", color: isDark ? "#93c5fd" : "#475569", marginBottom: "6px", display: "block" }}>Morador *</span>
                <SearchableSelect
                  options={formMoradores.map((m) => {
                    const label = `${m.name}${m.unit ? ` - Apto ${m.unit}` : ""}`;
                    return { value: String(m.id), label, searchText: label.toLowerCase() };
                  })}
                  value={formMoradorId}
                  onChange={handleSelectFormMorador}
                  placeholder="Buscar morador..."
                />
              </div>
            )}

            {/* Apartamento */}
            {formBloco && (
              <div>
                <span style={{ fontWeight: 600, fontSize: "13px", color: isDark ? "#93c5fd" : "#475569", marginBottom: "6px", display: "block" }}>Apartamento</span>
                <input
                  type="text" value={formApartamento} onChange={(e) => setFormApartamento(e.target.value)}
                  placeholder="Apto" style={{
                    width: "100%", padding: "10px 12px", borderRadius: "12px",
                    border: isDark ? "1px solid rgba(255,255,255,0.2)" : "1px solid #cbd5e1",
                    background: isDark ? "rgba(255,255,255,0.06)" : "#fff",
                    color: isDark ? "#fff" : "#1e293b", fontSize: "14px", boxSizing: "border-box",
                  }}
                />
              </div>
            )}

            {/* Servico */}
            <div>
              <span style={{ fontWeight: 600, fontSize: "13px", color: isDark ? "#93c5fd" : "#475569", marginBottom: "6px", display: "block" }}>Servico *</span>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
                {Object.entries(SERVICOS).map(([key, sv]) => (
                  <button
                    key={key} type="button" onClick={() => setFormServico(key)}
                    style={{
                      padding: "10px 6px", borderRadius: "12px", cursor: "pointer",
                      border: formServico === key ? `2px solid ${sv.color}` : isDark ? "2px solid rgba(255,255,255,0.1)" : "2px solid #cbd5e1",
                      background: formServico === key ? `${sv.color}20` : isDark ? "rgba(255,255,255,0.04)" : "#f8fafc",
                      display: "flex", flexDirection: "column", alignItems: "center", gap: "4px",
                    }}
                  >
                    <span style={{ fontSize: "18px" }}>{sv.emoji}</span>
                    <span style={{ fontSize: "11px", fontWeight: 600, color: formServico === key ? sv.color : isDark ? "#93c5fd" : "#1e293b" }}>{sv.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {formServico === "outro" && (
              <div>
                <span style={{ fontWeight: 600, fontSize: "13px", color: isDark ? "#93c5fd" : "#475569", marginBottom: "6px", display: "block" }}>Nome do Servico</span>
                <input
                  type="text" value={formServicoCustom} onChange={(e) => setFormServicoCustom(e.target.value)}
                  placeholder="Ex: Farmacia, Mercado..." style={{
                    width: "100%", padding: "10px 12px", borderRadius: "12px",
                    border: isDark ? "1px solid rgba(255,255,255,0.2)" : "1px solid #cbd5e1",
                    background: isDark ? "rgba(255,255,255,0.06)" : "#fff",
                    color: isDark ? "#fff" : "#1e293b", fontSize: "14px", boxSizing: "border-box",
                  }}
                />
              </div>
            )}

            {/* Numero pedido */}
            <div>
              <span style={{ fontWeight: 600, fontSize: "13px", color: isDark ? "#93c5fd" : "#475569", marginBottom: "6px", display: "block" }}>Numero do Pedido</span>
              <input
                type="text" value={formNumeroPedido} onChange={(e) => setFormNumeroPedido(e.target.value)}
                placeholder="Ex: #12345" style={{
                  width: "100%", padding: "10px 12px", borderRadius: "12px",
                  border: isDark ? "1px solid rgba(255,255,255,0.2)" : "1px solid #cbd5e1",
                  background: isDark ? "rgba(255,255,255,0.06)" : "#fff",
                  color: isDark ? "#fff" : "#1e293b", fontSize: "14px", boxSizing: "border-box",
                }}
              />
            </div>

            {/* Observacao */}
            <div>
              <span style={{ fontWeight: 600, fontSize: "13px", color: isDark ? "#93c5fd" : "#475569", marginBottom: "6px", display: "block" }}>Observacao</span>
              <textarea
                value={formObs} onChange={(e) => setFormObs(e.target.value)}
                placeholder="Notas sobre a entrega..." rows={2} style={{
                  width: "100%", padding: "10px 12px", borderRadius: "12px",
                  border: isDark ? "1px solid rgba(255,255,255,0.2)" : "1px solid #cbd5e1",
                  background: isDark ? "rgba(255,255,255,0.06)" : "#fff",
                  color: isDark ? "#fff" : "#1e293b", fontSize: "14px", resize: "none", boxSizing: "border-box",
                }}
              />
            </div>

            {/* Foto */}
            <div>
              <span style={{ fontWeight: 600, fontSize: "13px", color: isDark ? "#93c5fd" : "#475569", marginBottom: "6px", display: "block" }}>Foto da Entrega</span>
              {formCapturing ? (
                <div style={{ position: "relative", borderRadius: "12px", overflow: "hidden" }}>
                  <video ref={formVideoRef} autoPlay playsInline muted style={{ width: "100%", borderRadius: "12px" }} />
                  <div style={{ position: "absolute", bottom: "12px", left: 0, right: 0, display: "flex", justifyContent: "center", gap: "12px" }}>
                    <button onClick={captureFormPhoto} style={{ width: 56, height: 56, borderRadius: "50%", background: "#fff", border: "4px solid #22c55e", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Camera className="w-6 h-6" style={{ color: "#22c55e" }} />
                    </button>
                    <button onClick={stopFormCamera} style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(0,0,0,0.5)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", alignSelf: "center" }}>
                      <X className="w-5 h-5" style={{ color: "#fff" }} />
                    </button>
                  </div>
                </div>
              ) : formFoto ? (
                <div style={{ position: "relative" }}>
                  <img src={formFoto} alt="Foto" style={{ width: "100%", borderRadius: "12px", maxHeight: "200px", objectFit: "contain", background: "#f1f5f9" }} />
                  <button onClick={() => { setFormFoto(null); startFormCamera(); }} style={{ position: "absolute", top: 8, right: 8, padding: "6px 12px", borderRadius: "20px", background: "rgba(0,0,0,0.6)", border: "none", cursor: "pointer", color: "#fff", fontSize: "12px", fontWeight: 600 }}>
                    Tirar outra
                  </button>
                </div>
              ) : (
                <button onClick={startFormCamera} style={{ width: "100%", padding: "20px", borderRadius: "12px", border: "2px dashed #cbd5e1", background: isDark ? "rgba(255,255,255,0.04)" : "#f8fafc", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
                  <Camera className="w-6 h-6" style={{ color: "#94a3b8" }} />
                  <span style={{ fontSize: "12px", color: "#64748b" }}>Tirar foto da entrega</span>
                </button>
              )}
            </div>

            {/* Submit */}
            <button
              onClick={handleSubmitForm}
              disabled={formSaving}
              style={{
                width: "100%", padding: "14px", borderRadius: "14px",
                background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
                border: "none", color: "#fff", fontWeight: 700, fontSize: "15px",
                cursor: "pointer", opacity: formSaving ? 0.7 : 1,
                display: "flex", alignItems: "center", justifyContent: "center", gap: "12px",
              }}
            >
              <Truck className="w-5 h-5" />
              {formSaving ? "Registrando..." : "Registrar e Avisar Morador"}
            </button>
            <p style={{ textAlign: "center", fontSize: "11px", color: "#94a3b8" }}>
              O morador sera notificado via WhatsApp automaticamente.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
