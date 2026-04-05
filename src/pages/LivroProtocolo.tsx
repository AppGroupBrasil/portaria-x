import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import TutorialButton, { FlowPortaria, TSection, TStep, TBullet } from "@/components/TutorialButton";
import { compressCanvas, compressImage } from "@/lib/imageUtils";
import {
  ArrowLeft,
  Plus,
  Camera,
  X,
  CheckCircle2,
  Clock,
  Search,
  Package,
  Truck,
  Mail,
  BookOpen,
  FileText,
  Download,
  AlertTriangle,
  Mic,
  Square,
  Play,
  Trash2,
  Settings,
} from "lucide-react";
import SignaturePad from "@/components/SignaturePad";
import ReportModal from "@/components/ReportModal";
import { gerarPdfLivroProtocolo, gerarRelatorioLivroProtocolo, gerarRelatorioLivroProtocoloComGraficos } from "@/lib/pdfUtils";
import { useTheme } from "@/hooks/useTheme";
import ComoFunciona from "@/components/ComoFunciona";

const API = "/api/livro-protocolo";

interface Entry {
  id: number;
  protocolo: string;
  tipo: string;
  deixada_por: string | null;
  para: string | null;
  o_que_e: string | null;
  entregue_para: string | null;
  porteiro_entregou: string | null;
  retirada_por: string | null;
  porteiro: string | null;
  foto: string | null;
  assinatura: string | null;
  titulo: string | null;
  descricao: string | null;
  audio: string | null;
  created_at: string;
}

export default function LivroProtocolo() {
  const { isDark, p } = useTheme();
  const { user } = useAuth();
  const navigate = useNavigate();

  // List
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("todas");
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Report modal
  const [showReport, setShowReport] = useState(false);

  // Form
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [tipoForm, setTipoForm] = useState("encomenda");

  // Encomenda fields
  const [deixadaPor, setDeixadaPor] = useState("");
  const [para, setPara] = useState("");

  // Entrega de item fields
  const [oQueE, setOQueE] = useState("");
  const [entreguePara, setEntreguePara] = useState("");

  // Retirada fields
  const [retiradaPor, setRetiradaPor] = useState("");

  // Ocorrencia fields
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [audioData, setAudioData] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Common
  const [foto, setFoto] = useState<string | null>(null);
  const [assinatura, setAssinatura] = useState<string | null>(null);

  // Camera
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);

  // ── Fetch ──
  const fetchEntries = async () => {
    try {
      const url = filter !== "todas" ? `${API}?tipo=${filter}` : API;
      const res = await fetch(url, {  });
      if (res.ok) setEntries(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchEntries();
  }, [filter]);

  // ── Camera ──
  const openCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      setStream(s);
      setShowCamera(true);
      setTimeout(() => { if (videoRef.current) videoRef.current.srcObject = s; }, 100);
    } catch { setFormError("Nao foi possivel acessar a camera."); }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext("2d")?.drawImage(videoRef.current, 0, 0);
    setFoto(compressCanvas(canvas, "general"));
    closeCamera();
  };

  const closeCamera = () => {
    stream?.getTracks().forEach((t) => t.stop());
    setStream(null);
    setShowCamera(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const compressed = await compressImage(reader.result as string, "general");
      setFoto(compressed);
    };
    reader.readAsDataURL(file);
  };

  const resetForm = () => {
    setTipoForm("encomenda");
    setDeixadaPor(""); setPara("");
    setOQueE(""); setEntreguePara("");
    setRetiradaPor("");
    setTitulo(""); setDescricao(""); setAudioData(null);
    setFoto(null); setAssinatura(null); setFormError("");
  };

  // ── Submit ──
  const startRecording = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(s);
      audioChunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.onstop = () => {
        s.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const reader = new FileReader();
        reader.onloadend = () => setAudioData(reader.result as string);
        reader.readAsDataURL(blob);
      };
      mediaRecorderRef.current = mr;
      mr.start();
      setIsRecording(true);
      setTimeout(() => { if (mr.state === "recording") { mr.stop(); setIsRecording(false); } }, 30000);
    } catch { setFormError("Não foi possível acessar o microfone."); }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const playAudio = () => {
    if (!audioData) return;
    const audio = new Audio(audioData);
    audioPlayerRef.current = audio;
    setIsPlayingAudio(true);
    audio.onended = () => setIsPlayingAudio(false);
    audio.play();
  };

  const handleSubmit = async () => {
    // Validate per type
    if (tipoForm === "encomenda" && (!deixadaPor || !para)) {
      setFormError("Preencha 'Deixada por' e 'Para'."); return;
    }
    if (tipoForm === "entrega" && (!oQueE || !entreguePara)) {
      setFormError("Preencha 'O que e' e 'Entregue para'."); return;
    }
    if (tipoForm === "retirada" && !retiradaPor) {
      setFormError("Preencha 'Retirada por'."); return;
    }
    if (tipoForm === "ocorrencia" && (!titulo || !descricao)) {
      setFormError("Preencha o título e a descrição da ocorrência."); return;
    }

    setSaving(true);
    setFormError("");

    try {
      const body: any = {
        tipo: tipoForm,
        foto,
        assinatura,
      };

      if (tipoForm === "encomenda") {
        body.deixada_por = deixadaPor;
        body.para = para;
      } else if (tipoForm === "entrega") {
        body.o_que_e = oQueE;
        body.entregue_para = entreguePara;
      } else if (tipoForm === "ocorrencia") {
        body.titulo = titulo;
        body.descricao = descricao;
        body.audio = audioData;
      } else {
        body.retirada_por = retiradaPor;
      }

      const res = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        setFormError(data.error || "Erro ao registrar.");
        return;
      }

      const data = await res.json();
      setSuccessMsg(`Registro criado! Protocolo: ${data.protocolo}`);
      setTimeout(() => setSuccessMsg(""), 5000);
      resetForm();
      setShowForm(false);
      fetchEntries();
    } catch {
      setFormError("Erro de conexao.");
    } finally {
      setSaving(false);
    }
  };

  // ── Filter entries ──
  const filtered = entries.filter((e) => {
    if (!searchTerm.trim()) return true;
    const s = searchTerm.toLowerCase();
    return (
      e.protocolo.toLowerCase().includes(s) ||
      (e.deixada_por || "").toLowerCase().includes(s) ||
      (e.para || "").toLowerCase().includes(s) ||
      (e.entregue_para || "").toLowerCase().includes(s) ||
      (e.retirada_por || "").toLowerCase().includes(s) ||
      (e.o_que_e || "").toLowerCase().includes(s) ||
      (e.titulo || "").toLowerCase().includes(s) ||
      (e.descricao || "").toLowerCase().includes(s)
    );
  });

  const handleGenerateReport = (dateFrom: string, dateTo: string, withCharts: boolean) => {
    const from = new Date(dateFrom + "T00:00:00");
    const to = new Date(dateTo + "T23:59:59");
    const filteredByDate = entries.filter((e) => {
      const d = new Date(e.created_at);
      return d >= from && d <= to;
    });
    if (withCharts) {
      gerarRelatorioLivroProtocoloComGraficos(filteredByDate, dateFrom, dateTo, user?.condominio_nome);
    } else {
      gerarRelatorioLivroProtocolo(filteredByDate, dateFrom, dateTo, user?.condominio_nome);
    }
  };

  const tipoIcon = (t: string) => {
    if (t === "encomenda") return <Package className="w-5 h-5" style={{ color: "#fff" }} />;
    if (t === "entrega") return <Truck className="w-5 h-5" style={{ color: "#fff" }} />;
    if (t === "ocorrencia") return <AlertTriangle className="w-5 h-5" style={{ color: "#fff" }} />;
    return <Mail className="w-5 h-5" style={{ color: "#fff" }} />;
  };

  const tipoColor = (t: string) => {
    if (t === "encomenda") return "linear-gradient(135deg, #f59e0b, #d97706)";
    if (t === "entrega") return "#003580";
    if (t === "ocorrencia") return "linear-gradient(135deg, #ef4444, #dc2626)";
    return "linear-gradient(135deg, #10b981, #059669)";
  };

  const tipoLabel = (t: string) => {
    if (t === "encomenda") return "Encomenda";
    if (t === "entrega") return "Entrega de Item";
    if (t === "ocorrencia") return "Ocorrência";
    return "Retirada de Correspondencia";
  };

  const formatDate = (d: string) => {
    const dt = new Date(d);
    return dt.toLocaleDateString("pt-BR") + " " + dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  };

  // ── Styles ──
  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "12px 14px", borderRadius: "12px",
    border: "1px solid #cbd5e1", fontSize: "14px", background: "#fff",
    color: "#0f172a", outline: "none", boxSizing: "border-box",
  };
  const labelStyle: React.CSSProperties = {
    fontWeight: 600, fontSize: "13px", color: "#1e293b",
    marginBottom: "6px", display: "block",
  };

  return (
    <div className="min-h-dvh" style={{ background: p.pageBg, paddingBottom: "6rem" }}>
      {/* Header */}
      <header style={{ color: p.text, background: p.headerBg, padding: "1rem 1.5rem", borderBottom: p.headerBorder, boxShadow: p.headerShadow }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button onClick={() => navigate("/dashboard")} style={{ width: 40, height: 40, borderRadius: 12, background: p.btnBg, border: p.btnBorder, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: p.text }}>
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontWeight: 700, fontSize: 18, display: "flex", alignItems: "center", gap: "12px" }}>
              <BookOpen className="w-5 h-5" /> Livro de Protocolo
            </h1>
            <p style={{ color: isDark ? "rgba(255,255,255,0.6)" : "#64748b", fontSize: 12 }}>Registro de encomendas, entregas e retiradas</p>
          </div>
          <TutorialButton title="Livro de Protocolo">
            <TSection icon={<span>📋</span>} title="O QUE E ESTA FUNCAO?">
              <p>E o <strong>livro de registro oficial da portaria</strong>. Substitui o caderno de papel por um registro digital completo com <strong>fotos, assinatura digital, data/hora automatica e nome do porteiro</strong>. Tudo que acontece na portaria e registrado aqui para consulta e auditoria pelo sindico e administradora.</p>
            </TSection>
            <FlowPortaria>
              <TStep n={1}>Toque em <strong>+</strong> para criar um novo registro</TStep>
              <TStep n={2}>Selecione o <strong>tipo do registro</strong>:</TStep>
              <TBullet>→ <strong>Encomenda</strong> — Pacotes e correspondencias recebidas</TBullet>
              <TBullet>→ <strong>Entrega</strong> — Deliveries e entregas recebidas</TBullet>
              <TBullet>→ <strong>Retirada</strong> — Moradores que retiraram itens</TBullet>
              <TBullet>→ <strong>Ocorrencia</strong> — Incidentes, problemas, observacoes</TBullet>
              <TStep n={3}>Preencha a <strong>descricao detalhada</strong> do que aconteceu</TStep>
              <TStep n={4}>Tire uma <strong>foto</strong> como comprovante visual (opcional mas recomendado)</TStep>
              <TStep n={5}><strong>Assine digitalmente</strong> desenhando com o dedo na tela do celular</TStep>
              <TStep n={6}>Toque em <strong>"Registrar"</strong> — sistema salva com data, hora e seu nome automaticamente</TStep>
              <p style={{ marginTop: "8px", fontSize: "13px", color: "#2d3354" }}>👉 <strong>Sindico/Administradora ve:</strong> No Espelho da Portaria, consulta todos os registros feitos pelos porteiros com fotos, assinaturas e detalhes completos.</p>
            </FlowPortaria>
            <TSection icon={<span>🔧</span>} title="FUNCOES DISPONIVEIS">
              <TBullet><strong>Assinatura digital</strong> — Desenhe sua assinatura na tela do celular (substitui assinatura no papel)</TBullet>
              <TBullet><strong>Foto anexada</strong> — Tire foto de encomendas, ocorrencias ou qualquer item registrado</TBullet>
              <TBullet><strong>Porteiro auto-preenchido</strong> — O sistema preenche automaticamente seu nome pelo login</TBullet>
              <TBullet><strong>Data/hora automatica</strong> — Registrado automaticamente no momento do salvamento</TBullet>
              <TBullet><strong>Busca</strong> — Pesquise por tipo, descricao ou data</TBullet>
              <TBullet><strong>Filtro por tipo</strong> — Veja apenas encomendas, entregas, retiradas ou ocorrencias</TBullet>
              <TBullet><strong>Relatorio PDF</strong> — Gere relatorios completos por periodo para entregar ao sindico</TBullet>
            </TSection>
            <TSection icon={<span>⭐</span>} title="DICAS IMPORTANTES">
              <TBullet><strong>Registre TUDO</strong> que acontece na portaria — encomendas, entregas, retiradas e ocorrencias</TBullet>
              <TBullet>Sempre <strong>tire foto</strong> de encomendas e pacotes — protege voce e o morador de reclamacoes</TBullet>
              <TBullet>A <strong>assinatura digital</strong> tem valor de comprovante — assine em todos os registros</TBullet>
              <TBullet>Use o tipo <strong>"Ocorrencia"</strong> para registrar incidentes, barulho, problemas de manutencao, etc.</TBullet>
              <TBullet>O sindico pode <strong>consultar tudo remotamente</strong> pelo Espelho da Portaria — mantenha os registros completos</TBullet>
            </TSection>
          </TutorialButton>
        </div>
      </header>

      <main style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.2rem" }}>

        <ComoFunciona steps={[
          "📝 Portaria registra ocorrência com tipo e descrição",
          "📋 Categorização: reclamação, incidente, manutenção, etc.",
          "👀 Síndico acompanha todas as ocorrências em tempo real",
          "📊 Gere relatórios PDF por período",
        ]} />

        {/* Success */}
        {successMsg && (
          <div style={{
            background: "#dcfce7", border: "1px solid #86efac", borderRadius: "12px",
            padding: "12px 16px", display: "flex", alignItems: "center", gap: "12px",
            color: "#166534", fontSize: "14px", fontWeight: 600,
          }}>
            <CheckCircle2 className="w-5 h-5" /> {successMsg}
          </div>
        )}

        {/* New button + Report button */}
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={() => { setShowForm(!showForm); if (!showForm) resetForm(); }}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: "12px",
              flex: 1, padding: "14px", borderRadius: "14px", border: isDark ? "2px solid rgba(255,255,255,0.5)" : "2px solid #cbd5e1",
              background: showForm ? "#ef4444" : "linear-gradient(135deg, #0062d1 0%, #003580 100%)",
              color: "#fff", fontSize: "15px", fontWeight: 700, cursor: "pointer",
            }}
          >
            {showForm ? <><X className="w-5 h-5" /> Cancelar</> : <><Plus className="w-5 h-5" /> Novo Registro</>}
          </button>
          <button
            onClick={() => setShowReport(true)}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: "12px",
              padding: "10px 20px", borderRadius: "8px", border: "2px solid #d97706",
              background: "#fff",
              color: "#d97706", fontSize: "14px", fontWeight: 700, cursor: "pointer",
            }}
          >
            <FileText className="w-4 h-4" /> Relatório
          </button>
        </div>

        <ReportModal
          show={showReport}
          onClose={() => setShowReport(false)}
          onGenerate={handleGenerateReport}
          title="Gerar relatorio do Livro de Protocolo por periodo"
        />

        {/* ═══════════ FORM ═══════════ */}
        {showForm && (
          <div style={{
            background: "transparent", borderRadius: "16px", padding: "20px",
            border: "none", display: "flex", flexDirection: "column", gap: "1.2rem",
          }}>
            <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#1e293b", margin: 0 }}>
              Novo Registro
            </h3>

            {formError && (
              <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "10px", padding: "10px 14px", color: "#991b1b", fontSize: "13px" }}>
                {formError}
              </div>
            )}

            {/* Tipo selector */}
            <div>
              <span style={labelStyle}>Tipo de Registro *</span>
              <div style={{ display: "flex", gap: "12px" }}>
                {[
                  { v: "encomenda", l: "Encomenda", icon: "📦" },
                  { v: "entrega", l: "Entrega", icon: "🚚" },
                  { v: "retirada", l: "Retirada", icon: "📬" },
                  { v: "ocorrencia", l: "Ocorrência", icon: "⚠️" },
                ].map((t) => (
                  <button
                    key={t.v}
                    type="button"
                    onClick={() => setTipoForm(t.v)}
                    style={{
                      flex: 1, padding: "12px 8px", borderRadius: "12px",
                      border: tipoForm === t.v ? "2px solid #6366f1" : "1px solid #e2e8f0",
                      background: tipoForm === t.v ? "#eef2ff" : "#fff",
                      cursor: "pointer", display: "flex", flexDirection: "column",
                      alignItems: "center", gap: "4px",
                    }}
                  >
                    <span style={{ fontSize: "20px" }}>{t.icon}</span>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: tipoForm === t.v ? "#4f46e5" : "#64748b" }}>
                      {t.l}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* ── Encomenda fields ── */}
            {tipoForm === "encomenda" && (
              <>
                <div>
                  <span style={labelStyle}>Deixada por *</span>
                  <input type="text" value={deixadaPor} onChange={(e) => setDeixadaPor(e.target.value)}
                    placeholder="Ex: Correios, Mercado Livre, iFood..." style={inputStyle} />
                </div>
                <div>
                  <span style={labelStyle}>Para (destinatario) *</span>
                  <input type="text" value={para} onChange={(e) => setPara(e.target.value)}
                    placeholder="Ex: Joao Silva - Apto 101 Bloco A" style={inputStyle} />
                </div>
              </>
            )}

            {/* ── Entrega de item fields ── */}
            {tipoForm === "entrega" && (
              <>
                <div>
                  <span style={labelStyle}>O que e *</span>
                  <input type="text" value={oQueE} onChange={(e) => setOQueE(e.target.value)}
                    placeholder="Descricao do item entregue" style={inputStyle} />
                </div>
                <div>
                  <span style={labelStyle}>Entregue para *</span>
                  <input type="text" value={entreguePara} onChange={(e) => setEntreguePara(e.target.value)}
                    placeholder="Nome de quem recebeu" style={inputStyle} />
                </div>
                <div>
                  <span style={labelStyle}>Porteiro que entregou</span>
                  <input type="text" value={user?.name || ""} readOnly
                    style={{ ...inputStyle, background: "#f1f5f9", color: "#64748b", cursor: "default" }} />
                </div>
              </>
            )}

            {/* ── Retirada fields ── */}
            {tipoForm === "retirada" && (
              <>
                <div>
                  <span style={labelStyle}>Retirada por *</span>
                  <input type="text" value={retiradaPor} onChange={(e) => setRetiradaPor(e.target.value)}
                    placeholder="Nome de quem retirou" style={inputStyle} />
                </div>
                <div>
                  <span style={labelStyle}>Porteiro</span>
                  <input type="text" value={user?.name || ""} readOnly
                    style={{ ...inputStyle, background: "#f1f5f9", color: "#64748b", cursor: "default" }} />
                </div>
              </>
            )}

            {/* ── Ocorrência fields ── */}
            {tipoForm === "ocorrencia" && (
              <>
                <div>
                  <span style={labelStyle}>Título da Ocorrência *</span>
                  <input type="text" value={titulo} onChange={(e) => setTitulo(e.target.value)}
                    placeholder="Ex: Portão danificado, Barulho excessivo..." style={inputStyle} />
                </div>
                <div>
                  <span style={labelStyle}>Descrição *</span>
                  <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)}
                    placeholder="Descreva a ocorrência com detalhes..."
                    rows={4}
                    style={{ ...inputStyle, resize: "vertical", minHeight: "100px" }} />
                </div>
                <div>
                  <span style={labelStyle}>Porteiro</span>
                  <input type="text" value={user?.name || ""} readOnly
                    style={{ ...inputStyle, background: "#f1f5f9", color: "#64748b", cursor: "default" }} />
                </div>
                {/* Audio recorder */}
                <div>
                  <span style={labelStyle}>Áudio (opcional)</span>
                  {audioData ? (
                    <div style={{
                      display: "flex", alignItems: "center", gap: "10px",
                      padding: "14px 16px", borderRadius: "12px", border: "1px solid #e2e8f0",
                      background: "#f8fafc",
                    }}>
                      <button onClick={playAudio} disabled={isPlayingAudio} style={{
                        width: "44px", height: "44px", borderRadius: "50%", border: "none",
                        background: isPlayingAudio ? "#94a3b8" : "#6366f1", color: "#fff",
                        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                        flexShrink: 0,
                      }}>
                        <Play className="w-5 h-5" />
                      </button>
                      <span style={{ flex: 1, fontSize: "13px", color: "#475569", fontWeight: 600 }}>
                        {isPlayingAudio ? "Reproduzindo..." : "Áudio gravado ✓"}
                      </span>
                      <button onClick={() => setAudioData(null)} style={{
                        width: "36px", height: "36px", borderRadius: "50%", border: "none",
                        background: "#fee2e2", color: "#dc2626",
                        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={isRecording ? stopRecording : startRecording}
                      style={{
                        width: "100%", padding: "14px", borderRadius: "12px",
                        border: isRecording ? "2px solid #ef4444" : "2px dashed #cbd5e1",
                        background: isRecording ? "#fef2f2" : "#f8fafc",
                        cursor: "pointer", display: "flex", alignItems: "center",
                        justifyContent: "center", gap: "10px",
                        color: isRecording ? "#dc2626" : "#64748b",
                        fontSize: "14px", fontWeight: 600,
                        animation: isRecording ? "pulse 1.5s infinite" : "none",
                      }}
                    >
                      {isRecording ? (
                        <>
                          <Square className="w-5 h-5" />
                          Parar Gravação
                        </>
                      ) : (
                        <>
                          <Mic className="w-5 h-5" />
                          Gravar Áudio
                        </>
                      )}
                    </button>
                  )}
                </div>
              </>
            )}

            {/* ── Foto ── */}
            <div>
              <span style={labelStyle}>Foto</span>
              {foto ? (
                <div style={{ position: "relative" }}>
                  <img src={foto} alt="Foto" style={{ width: "100%", borderRadius: "12px", maxHeight: "400px", objectFit: "contain", background: "#f1f5f9" }} />
                  <button onClick={() => setFoto(null)} style={{
                    position: "absolute", top: "8px", right: "8px",
                    background: "rgba(0,0,0,0.6)", border: "none", borderRadius: "50%",
                    width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer", color: p.text,
                  }}>
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : showCamera ? (
                <div style={{ borderRadius: "12px", overflow: "hidden" }}>
                  <video ref={videoRef} autoPlay playsInline muted style={{ width: "100%", borderRadius: "12px" }} />
                  <div style={{ display: "flex", gap: "10px", justifyContent: "center", marginTop: "10px" }}>
                    <button onClick={capturePhoto} style={{
                      padding: "10px 24px", borderRadius: "10px", border: "none",
                      background: "#6366f1", color: p.text, fontWeight: 700, cursor: "pointer",
                    }}>Capturar</button>
                    <button onClick={closeCamera} style={{
                      padding: "10px 24px", borderRadius: "10px", border: "none",
                      background: "#ef4444", color: p.text, fontWeight: 700, cursor: "pointer",
                    }}>Cancelar</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", gap: "10px" }}>
                  <button onClick={openCamera} style={{
                    flex: 1, padding: "14px 16px", borderRadius: "12px", border: "2px dashed #cbd5e1",
                    background: "#f8fafc", cursor: "pointer", display: "flex", flexDirection: "column",
                    alignItems: "center", gap: "6px", color: "#64748b", fontSize: "13px", fontWeight: 600,
                  }}>
                    <Camera className="w-6 h-6" /> Camera
                  </button>
                  <button onClick={() => fileInputRef.current?.click()} style={{
                    flex: 1, padding: "14px 16px", borderRadius: "12px", border: "2px dashed #cbd5e1",
                    background: "#f8fafc", cursor: "pointer", display: "flex", flexDirection: "column",
                    alignItems: "center", gap: "6px", color: "#64748b", fontSize: "13px", fontWeight: 600,
                  }}>
                    <Package className="w-6 h-6" /> Galeria
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} style={{ display: "none" }} />
                </div>
              )}
            </div>

            {/* ── Assinatura Digital ── */}
            <SignaturePad
              value={assinatura}
              onChange={setAssinatura}
              label="Assinatura de quem retirou"
            />

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={saving}
              style={{
                width: "100%", padding: "14px", borderRadius: "14px", border: "none",
                background: saving ? "#94a3b8" : "linear-gradient(135deg, #0062d1 0%, #003580 100%)",
                color: "#fff", fontSize: "15px", fontWeight: 700,
                cursor: saving ? "default" : "pointer",
                marginTop: "2.4rem",
              }}
            >
              {saving ? "Registrando..." : "Registrar no Livro"}
            </button>
          </div>
        )}

        {/* ═══════════ FILTERS ═══════════ */}
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
          {[
            { v: "todas", l: "Todos" },
            { v: "encomenda", l: "Encomendas" },
            { v: "entrega", l: "Entregas" },
            { v: "retirada", l: "Retiradas" },
            { v: "ocorrencia", l: "Ocorrências" },
          ].map((f) => (
            <button
              key={f.v}
              onClick={() => setFilter(f.v)}
              style={{
                padding: "8px 16px", borderRadius: "20px", border: "none",
                background: filter === f.v ? "#6366f1" : "#e2e8f0",
                color: filter === f.v ? "#fff" : "#475569",
                fontSize: "13px", fontWeight: 600, cursor: "pointer",
              }}
            >
              {f.l}
            </button>
          ))}
          <button
            onClick={() => setShowReport(true)}
            style={{
              width: 36, height: 36, borderRadius: "50%", border: "none",
              background: isDark ? "rgba(255,255,255,0.1)" : "#f1f5f9",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              marginLeft: "auto",
            }}
          >
            <Settings className="w-4 h-4" style={{ color: isDark ? "#94a3b8" : "#64748b" }} />
          </button>
        </div>

        {/* Search */}
        <div style={{ position: "relative" }}>
          <Search className="w-4 h-4" style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
          <input
            type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por protocolo, nome..."
            style={{ ...inputStyle, paddingLeft: "40px" }}
          />
        </div>

        {/* ═══════════ LIST ═══════════ */}
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "3rem" }}>
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem 1rem", color: "#94a3b8" }}>
            <BookOpen className="w-12 h-12 mx-auto mb-3" style={{ opacity: 0.4 }} />
            <p style={{ fontWeight: 600, fontSize: "15px" }}>Nenhum registro encontrado</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {filtered.map((e) => {
              const isExpanded = expandedId === e.id;
              return (
                <div
                  key={e.id}
                  onClick={() => setExpandedId(isExpanded ? null : e.id)}
                  style={{
                    background: "#fff", borderRadius: "16px", border: "1px solid #e2e8f0",
                    overflow: "hidden", cursor: "pointer", transition: "all 0.2s",
                  }}
                >
                  {/* Card header */}
                  <div style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{
                      width: "44px", height: "44px", borderRadius: "12px",
                      background: tipoColor(e.tipo),
                      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    }}>
                      {tipoIcon(e.tipo)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 700, fontSize: "14px", color: "#1e293b", margin: 0 }}>
                        {tipoLabel(e.tipo)}
                      </p>
                      <p style={{ fontSize: "12px", color: "#64748b", margin: "2px 0 0" }}>
                        {formatDate(e.created_at)}
                      </p>
                      <p style={{ fontSize: "11px", color: "#6366f1", fontWeight: 700, margin: "2px 0 0" }}>
                        {e.protocolo}
                      </p>
                    </div>
                    <div style={{
                      padding: "4px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 700,
                      background: e.assinatura ? "#dcfce7" : "#fef3c7",
                      color: e.assinatura ? "#166534" : "#92400e",
                      flexShrink: 0,
                    }}>
                      {e.assinatura ? "Assinado" : "Sem assinatura"}
                    </div>
                  </div>

                  {/* Expanded */}
                  {isExpanded && (
                    <div style={{
                      padding: "0 16px 16px", borderTop: "1px solid #f1f5f9",
                      display: "flex", flexDirection: "column", gap: "10px", paddingTop: "12px",
                    }}>
                      {/* Protocol + Date */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                        <div>
                          <span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 600 }}>PROTOCOLO</span>
                          <p style={{ fontSize: "13px", fontWeight: 700, color: "#6366f1", margin: "2px 0 0" }}>{e.protocolo}</p>
                        </div>
                        <div>
                          <span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 600 }}>DATA/HORA</span>
                          <p style={{ fontSize: "13px", color: "#1e293b", margin: "2px 0 0" }}>{formatDate(e.created_at)}</p>
                        </div>
                      </div>

                      {/* Type-specific info */}
                      {e.tipo === "encomenda" && (
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                          {e.deixada_por && (
                            <div>
                              <span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 600 }}>DEIXADA POR</span>
                              <p style={{ fontSize: "13px", color: "#1e293b", margin: "2px 0 0" }}>{e.deixada_por}</p>
                            </div>
                          )}
                          {e.para && (
                            <div>
                              <span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 600 }}>PARA</span>
                              <p style={{ fontSize: "13px", color: "#1e293b", margin: "2px 0 0" }}>{e.para}</p>
                            </div>
                          )}
                        </div>
                      )}

                      {e.tipo === "entrega" && (
                        <>
                          {e.o_que_e && (
                            <div>
                              <span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 600 }}>O QUE E</span>
                              <p style={{ fontSize: "13px", color: "#1e293b", margin: "2px 0 0" }}>{e.o_que_e}</p>
                            </div>
                          )}
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                            {e.entregue_para && (
                              <div>
                                <span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 600 }}>ENTREGUE PARA</span>
                                <p style={{ fontSize: "13px", color: "#1e293b", margin: "2px 0 0" }}>{e.entregue_para}</p>
                              </div>
                            )}
                            {e.porteiro_entregou && (
                              <div>
                                <span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 600 }}>PORTEIRO</span>
                                <p style={{ fontSize: "13px", color: "#1e293b", margin: "2px 0 0" }}>{e.porteiro_entregou}</p>
                              </div>
                            )}
                          </div>
                        </>
                      )}

                      {e.tipo === "retirada" && (
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                          {e.retirada_por && (
                            <div>
                              <span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 600 }}>RETIRADA POR</span>
                              <p style={{ fontSize: "13px", color: "#1e293b", margin: "2px 0 0" }}>{e.retirada_por}</p>
                            </div>
                          )}
                          {e.porteiro && (
                            <div>
                              <span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 600 }}>PORTEIRO</span>
                              <p style={{ fontSize: "13px", color: "#1e293b", margin: "2px 0 0" }}>{e.porteiro}</p>
                            </div>
                          )}
                        </div>
                      )}

                      {e.tipo === "ocorrencia" && (
                        <>
                          {e.titulo && (
                            <div>
                              <span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 600 }}>TÍTULO</span>
                              <p style={{ fontSize: "14px", fontWeight: 700, color: "#dc2626", margin: "2px 0 0" }}>{e.titulo}</p>
                            </div>
                          )}
                          {e.descricao && (
                            <div>
                              <span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 600 }}>DESCRIÇÃO</span>
                              <p style={{ fontSize: "13px", color: "#1e293b", margin: "2px 0 0", whiteSpace: "pre-wrap" }}>{e.descricao}</p>
                            </div>
                          )}
                          {e.porteiro && (
                            <div>
                              <span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 600 }}>PORTEIRO</span>
                              <p style={{ fontSize: "13px", color: "#1e293b", margin: "2px 0 0" }}>{e.porteiro}</p>
                            </div>
                          )}
                          {e.audio && (
                            <div>
                              <span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 600 }}>ÁUDIO</span>
                              <audio controls src={e.audio} style={{ width: "100%", marginTop: "4px" }} />
                            </div>
                          )}
                        </>
                      )}

                      {/* Photo */}
                      {e.foto && (
                        <div>
                          <span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 600 }}>FOTO</span>
                          <img src={e.foto} alt="Foto" style={{
                            width: "100%", borderRadius: "10px", maxHeight: "220px",
                            objectFit: "contain", marginTop: "4px", background: "#f1f5f9",
                          }} />
                        </div>
                      )}

                      {/* Signature */}
                      {e.assinatura && (
                        <div>
                          <span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 600 }}>ASSINATURA DIGITAL</span>
                          <div style={{
                            marginTop: "4px", borderRadius: "10px", border: "1px solid #e2e8f0",
                            background: "#f8fafc", padding: "8px", textAlign: "center",
                          }}>
                            <img src={e.assinatura} alt="Assinatura" style={{
                              maxWidth: "100%", maxHeight: "120px",
                            }} />
                          </div>
                        </div>
                      )}

                      {/* PDF button */}
                      <button
                        onClick={(ev) => { ev.stopPropagation(); gerarPdfLivroProtocolo(e, user?.condominio_nome); }}
                        style={{
                          display: "flex", alignItems: "center", justifyContent: "center", gap: "12px",
                          width: "100%", padding: "10px", borderRadius: "10px", border: "none",
                          background: "linear-gradient(135deg, #0062d1 0%, #003d99 50%, #001d4a 100%)",
                          color: "#fff", fontSize: "13px", fontWeight: 700, cursor: "pointer",
                          marginTop: "4px",
                        }}
                      >
                        <Download className="w-4 h-4" /> Baixar PDF deste Registro
                      </button>
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
