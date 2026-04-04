import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import TutorialButton, { TSection, TStep, TBullet } from "@/components/TutorialButton";
import {
  ArrowLeft,
  Plus,
  MapPin,
  QrCode,
  Trash2,
  Edit3,
  X,
  Clock,
  Bell,
  BellOff,
  CheckCircle2,
  AlertTriangle,
  Download,
  Printer,
  GripVertical,
  ToggleLeft,
  ToggleRight,
  Shield,
  Volume2,
  FileText,
  User,
  Calendar,
  Search,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useTheme } from "@/hooks/useTheme";
import ComoFunciona from "@/components/ComoFunciona";
import ReportModal from "@/components/ReportModal";
import { gerarRelatorioRondas } from "@/lib/pdfUtils";

const API = "/api";

interface Checkpoint {
  id: number;
  nome: string;
  descricao: string | null;
  localizacao: string | null;
  qr_code_data: string;
  ativo: number;
  ordem: number;
  created_at: string;
}

interface Schedule {
  id: number;
  nome: string;
  horario: string;
  dias_semana: string;
  som_alerta: number;
  ativo: number;
}

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export default function ControleRondasSindico() {
  const { isDark, p } = useTheme();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tab, setTab] = useState<"checkpoints" | "schedules" | "historico">("checkpoints");
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);

  // Histórico
  interface Registro {
    id: number;
    checkpoint_nome: string;
    funcionario_nome: string;
    localizacao: string | null;
    observacao: string | null;
    foto: string | null;
    created_at: string;
  }
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [loadingRegistros, setLoadingRegistros] = useState(false);
  const [filtroFuncionario, setFiltroFuncionario] = useState("");
  const [filtroCheckpoint, setFiltroCheckpoint] = useState("");
  const today = new Date().toISOString().slice(0, 10);
  const [filtroDataInicio, setFiltroDataInicio] = useState(today);
  const [filtroDataFim, setFiltroDataFim] = useState(today);
  const [showForm, setShowForm] = useState(false);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [editingCheckpoint, setEditingCheckpoint] = useState<Checkpoint | null>(null);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [showQR, setShowQR] = useState<Checkpoint | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [error, setError] = useState("");

  // Checkpoint form
  const [cpForm, setCpForm] = useState({ nome: "", descricao: "", localizacao: "" });

  // Schedule form
  const [schedForm, setSchedForm] = useState({ nome: "", horario: "", dias_semana: "0,1,2,3,4,5,6", som_alerta: true });

  const fetchAll = async () => {
    try {
      const [cpRes, schedRes] = await Promise.all([
        apiFetch(`${API}/rondas/checkpoints`),
        apiFetch(`${API}/rondas/schedules`),
      ]);
      if (cpRes.ok) setCheckpoints(await cpRes.json());
      if (schedRes.ok) setSchedules(await schedRes.json());
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  // Fetch registros for Histórico tab
  const fetchRegistros = async () => {
    setLoadingRegistros(true);
    try {
      const params = new URLSearchParams();
      if (filtroDataInicio) params.set("data_inicio", filtroDataInicio);
      if (filtroDataFim) params.set("data_fim", filtroDataFim);
      const res = await apiFetch(`${API}/rondas/registros?${params.toString()}`);
      if (res.ok) setRegistros(await res.json());
    } catch {}
    setLoadingRegistros(false);
  };

  useEffect(() => {
    if (tab === "historico") fetchRegistros();
  }, [tab, filtroDataInicio, filtroDataFim]);

  // ─── PDF REPORT ─────────────
  const handleGenerateReport = async (dateFrom: string, dateTo: string, _withCharts: boolean) => {
    try {
      const params = new URLSearchParams({ data_inicio: dateFrom, data_fim: dateTo });
      if (filtroFuncionario) params.set("funcionario_nome", filtroFuncionario);
      const [regRes, statsRes] = await Promise.all([
        apiFetch(`${API}/rondas/registros?${params.toString()}`),
        apiFetch(`${API}/rondas/stats?data_inicio=${dateFrom}&data_fim=${dateTo}`),
      ]);
      let regs = regRes.ok ? await regRes.json() : [];
      const stats = statsRes.ok ? await statsRes.json() : {
        total: 0, byCheckpoint: [], byFuncionario: [], byHour: [], byDay: [],
        totalCheckpoints: 0, checkpointsCobertos: 0,
      };
      // Apply client-side filters that match the Histórico tab
      if (filtroFuncionario) {
        regs = regs.filter((r: any) => r.funcionario_nome?.toLowerCase().includes(filtroFuncionario.toLowerCase()));
      }
      if (filtroCheckpoint) {
        regs = regs.filter((r: any) => r.checkpoint_nome?.toLowerCase().includes(filtroCheckpoint.toLowerCase()));
      }
      gerarRelatorioRondas(regs, stats, dateFrom, dateTo, user?.condominio_nome);
    } catch {
      alert("Erro ao gerar relatório.");
    }
  };

  // ─── CHECKPOINT CRUD ─────────────
  const handleSaveCheckpoint = async () => {
    if (!cpForm.nome.trim()) { setError("Nome é obrigatório."); return; }
    setError("");
    try {
      const url = editingCheckpoint
        ? `${API}/rondas/checkpoints/${editingCheckpoint.id}`
        : `${API}/rondas/checkpoints`;
      const method = editingCheckpoint ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cpForm),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Erro ao salvar.");
        return;
      }
      setShowForm(false);
      setEditingCheckpoint(null);
      setCpForm({ nome: "", descricao: "", localizacao: "" });
      fetchAll();
    } catch { setError("Erro de conexão."); }
  };

  const handleDeleteCheckpoint = async (id: number) => {
    if (!globalThis.confirm("Excluir este ponto de ronda?")) return;
    await apiFetch(`${API}/rondas/checkpoints/${id}`, { method: "DELETE" });
    fetchAll();
  };

  const handleToggleCheckpoint = async (cp: Checkpoint) => {
    await apiFetch(`${API}/rondas/checkpoints/${cp.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ativo: cp.ativo ? 0 : 1 }),
    });
    fetchAll();
  };

  // ─── SCHEDULE CRUD ─────────────
  const handleSaveSchedule = async () => {
    if (!schedForm.nome.trim() || !schedForm.horario) { setError("Nome e horário são obrigatórios."); return; }
    setError("");
    try {
      const url = editingSchedule
        ? `${API}/rondas/schedules/${editingSchedule.id}`
        : `${API}/rondas/schedules`;
      const method = editingSchedule ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...schedForm,
          som_alerta: schedForm.som_alerta ? 1 : 0,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Erro ao salvar.");
        return;
      }
      setShowScheduleForm(false);
      setEditingSchedule(null);
      setSchedForm({ nome: "", horario: "", dias_semana: "0,1,2,3,4,5,6", som_alerta: true });
      fetchAll();
    } catch { setError("Erro de conexão."); }
  };

  const handleDeleteSchedule = async (id: number) => {
    if (!globalThis.confirm("Excluir este horário?")) return;
    await apiFetch(`${API}/rondas/schedules/${id}`, { method: "DELETE" });
    fetchAll();
  };

  const toggleSchedDay = (dayIdx: number) => {
    const days = schedForm.dias_semana.split(",").map(Number);
    const idx = days.indexOf(dayIdx);
    if (idx === -1) days.push(dayIdx);
    else days.splice(idx, 1);
    setSchedForm({ ...schedForm, dias_semana: days.sort().join(",") });
  };

  // QR code image URL via external API
  const getQRUrl = (data: string) =>
    `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(data)}`;

  // Print QR code
  const handlePrintQR = (cp: Checkpoint) => {
    const win = globalThis.open("", "_blank", "width=500,height=600");
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head><title>QR Code - ${cp.nome}</title>
      <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 40px; }
        h1 { font-size: 24px; color: #2d3354; margin-bottom: 8px; }
        p { font-size: 14px; color: #64748b; margin-bottom: 24px; }
        img { border: 3px solid #e2e8f0; border-radius: 12px; }
        .label { margin-top: 16px; font-size: 18px; font-weight: bold; color: #0f172a; }
        .loc { font-size: 13px; color: #64748b; margin-top: 4px; }
        .footer { margin-top: 30px; font-size: 11px; color: #94a3b8; }
      </style>
      </head>
      <body>
        <h1>🛡️ Ponto de Ronda</h1>
        <p>Condomínio - Controle de Rondas</p>
        <img src="${getQRUrl(cp.qr_code_data)}" width="300" height="300" />
        <div class="label">${cp.nome}</div>
        ${cp.localizacao ? `<div class="loc">📍 ${cp.localizacao}</div>` : ""}
        ${cp.descricao ? `<div class="loc">${cp.descricao}</div>` : ""}
        <div class="footer">Escaneie este QR Code durante a ronda para registrar a passagem</div>
        <script>setTimeout(() => { globalThis.print(); }, 500);</script>
      </body>
      </html>
    `);
    win.document.close();
  };

  // Download QR as image
  const handleDownloadQR = async (cp: Checkpoint) => {
    try {
      const resp = await fetch(getQRUrl(cp.qr_code_data));
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `qrcode-ronda-${cp.nome.replaceAll(/\s+/g, "-").toLowerCase()}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {}
  };

  // Print all QR codes
  const handlePrintAll = () => {
    const active = checkpoints.filter((c) => c.ativo);
    if (active.length === 0) return;
    const win = globalThis.open("", "_blank", "width=800,height=600");
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head><title>QR Codes - Todos os Pontos de Ronda</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; }
        .item { text-align: center; page-break-inside: avoid; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; }
        .item img { border-radius: 8px; }
        .label { font-size: 16px; font-weight: bold; margin-top: 8px; color: #0f172a; }
        .loc { font-size: 12px; color: #64748b; margin-top: 4px; }
        h1 { text-align: center; color: #2d3354; margin-bottom: 4px; }
        .sub { text-align: center; color: #64748b; font-size: 13px; margin-bottom: 20px; }
      </style>
      </head>
      <body>
        <h1>🛡️ Pontos de Ronda</h1>
        <p class="sub">${active.length} pontos ativos</p>
        <div class="grid">
          ${active.map((cp) => `
            <div class="item">
              <img src="${getQRUrl(cp.qr_code_data)}" width="200" height="200" />
              <div class="label">${cp.nome}</div>
              ${cp.localizacao ? `<div class="loc">📍 ${cp.localizacao}</div>` : ""}
            </div>
          `).join("")}
        </div>
        <script>setTimeout(() => { globalThis.print(); }, 800);</script>
      </body>
      </html>
    `);
    win.document.close();
  };

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: p.pageBg }}>
      {/* Header */}
      <header className="sticky top-0 z-40" style={{ background: p.headerBg, borderBottom: p.headerBorder, boxShadow: p.headerShadow, color: p.text }}>
        <div style={{ padding: "0 24px", height: "4.5rem", display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => navigate("/dashboard")} style={{ width: 40, height: 40, borderRadius: 12, background: p.btnBg, border: p.btnBorder, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: p.text }}>
            <ArrowLeft className="w-5 h-5" />
          </button>
          <Shield className="w-5 h-5" />
          <span style={{ fontWeight: 700, fontSize: 16 }}>Controle de Rondas</span>
          <TutorialButton title="Controle de Rondas (Síndico)">
            <TSection icon={<span>📋</span>} title="O QUE É ESTA FUNÇÃO?">
              <p>Configuração completa do <strong>sistema de rondas de segurança</strong> do condomínio. Você (síndico) define os <strong>pontos de verificação (checkpoints)</strong>, gera QR Codes físicos, define <strong>horários obrigatórios</strong> e ativa <strong>alertas automáticos</strong> quando rondas não são realizadas. O porteiro/funcionário executa as rondas escaneando os QR Codes.</p>
            </TSection>
            <TSection icon={<span>🏗️</span>} title="CONFIGURAÇÃO PASSO A PASSO">
              <TStep n={1}><strong>Aba Checkpoints:</strong> Toque em "+" para adicionar um ponto de ronda</TStep>
              <TStep n={2}>Informe o <strong>nome do ponto</strong> (ex: "Entrada Principal", "Garagem B", "Playground", "Salão de Festas")</TStep>
              <TStep n={3}>Informe a <strong>localização</strong> descritiva (ex: "Portão 1, lado esquerdo")</TStep>
              <TStep n={4}>O sistema gera um <strong>QR Code único</strong> para esse ponto</TStep>
              <TStep n={5}><strong>Imprima o QR Code</strong> e cole no local físico do condomínio</TStep>
              <TStep n={6}>Repita para todos os pontos de verificação do condomínio</TStep>
              <TStep n={7}><strong>Aba Horários:</strong> Defina em quais horários as rondas são obrigatórias (ex: 22h, 02h, 06h)</TStep>
              <TStep n={8}>Ative <strong>alertas</strong> para ser notificado quando uma ronda não for realizada no horário</TStep>
              <p style={{ marginTop: "8px", fontSize: "13px", color: "#2d3354" }}>👉 O porteiro/funcionário vê os checkpoints na tela de "Registro de Ronda" e executa escaneando cada QR Code.</p>
            </TSection>
            <TSection icon={<span>🔧</span>} title="FUNÇÕES DISPONÍVEIS">
              <TBullet><strong>Adicionar/Editar/Excluir</strong> checkpoints com nome e localização</TBullet>
              <TBullet><strong>Gerar QR Codes</strong> individuais para cada ponto</TBullet>
              <TBullet><strong>Imprimir todos</strong> os QR Codes de uma vez (botão de impressão em lote)</TBullet>
              <TBullet><strong>Arrastar para reordenar</strong> a sequência dos checkpoints</TBullet>
              <TBullet><strong>Ativar/desativar</strong> pontos individualmente (sem excluir)</TBullet>
              <TBullet><strong>Definir horários</strong> obrigatórios para rondas</TBullet>
              <TBullet><strong>Alertas automáticos</strong> com som quando ronda está atrasada</TBullet>
            </TSection>
            <TSection icon={<span>📱</span>} title="COMO FUNCIONA NA PRÁTICA">
              <TBullet><strong>Síndico configura</strong> → Cria checkpoints + imprime QR Codes + define horários</TBullet>
              <TBullet><strong>Porteiro executa</strong> → Abre "Registro de Ronda" + escaneia QR Codes nos pontos + tira fotos</TBullet>
              <TBullet><strong>Síndico acompanha</strong> → Consulta histórico de rondas + recebe alertas de rondas não realizadas</TBullet>
            </TSection>
            <TSection icon={<span>⭐</span>} title="DICAS IMPORTANTES">
              <TBullet>Cole os QR Codes em locais <strong>protegidos da chuva</strong> (sob telhado, dentro de caixa acrílica)</TBullet>
              <TBullet>Defina pelo menos <strong>3-5 checkpoints</strong> em pontos estratégicos do condomínio</TBullet>
              <TBullet>Os horários obrigatórios devem cobrir <strong>períodos críticos</strong> (noite e madrugada)</TBullet>
              <TBullet>Os alertas ajudam a <strong>garantir que as rondas estão sendo feitas</strong> conforme combinado</TBullet>
              <TBullet>Points desativados ficam <strong>cinza</strong> e não aparecem para o porteiro</TBullet>
            </TSection>
          </TutorialButton>
          <div className="flex-1" />
          {tab === "checkpoints" && checkpoints.filter((c) => c.ativo).length > 0 && (
            <button
              onClick={handlePrintAll}
              className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center"
              title="Imprimir todos QR Codes"
            >
              <Printer className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => {
              if (tab === "checkpoints") {
                setEditingCheckpoint(null);
                setCpForm({ nome: "", descricao: "", localizacao: "" });
                setShowForm(true);
              } else {
                setEditingSchedule(null);
                setSchedForm({ nome: "", horario: "", dias_semana: "0,1,2,3,4,5,6", som_alerta: true });
                setShowScheduleForm(true);
              }
              setError("");
            }}
            className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div style={{ padding: "12px 16px 0" }}>
        <ComoFunciona steps={[
          "🗺️ Cadastre pontos de ronda e gere QR Codes",
          "🖨️ Imprima e fixe os QR Codes nos locais",
          "⏰ Defina horários obrigatórios e alertas",
          "📊 Acompanhe histórico de rondas dos funcionários",
        ]} />
      </div>

      {/* Tab switcher */}
      <div style={{ display: "flex", gap: "0", borderBottom: "1px solid #e5e7eb" }}>
        <button
          onClick={() => setTab("checkpoints")}
          style={{
            flex: 1,
            padding: "12px",
            fontSize: "13px",
            fontWeight: 700,
            border: "none",
            background: tab === "checkpoints" ? "#f0f9ff" : "#fff",
            color: tab === "checkpoints" ? "#0369a1" : "#6b7280",
            borderBottom: tab === "checkpoints" ? "3px solid #003580" : "3px solid transparent",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
          }}
        >
          <MapPin style={{ width: 14, height: 14 }} /> Pontos de Ronda ({checkpoints.length})
        </button>
        <button
          onClick={() => setTab("schedules")}
          style={{
            flex: 1,
            padding: "12px",
            fontSize: "13px",
            fontWeight: 700,
            border: "none",
            background: tab === "schedules" ? "#f0f9ff" : "#fff",
            color: tab === "schedules" ? "#0369a1" : "#6b7280",
            borderBottom: tab === "schedules" ? "3px solid #003580" : "3px solid transparent",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
          }}
        >
          <Clock style={{ width: 14, height: 14 }} /> Horários ({schedules.length})
        </button>
        <button
          onClick={() => setTab("historico")}
          style={{
            flex: 1,
            padding: "12px",
            fontSize: "13px",
            fontWeight: 700,
            border: "none",
            background: tab === "historico" ? "#f0f9ff" : "#fff",
            color: tab === "historico" ? "#0369a1" : "#6b7280",
            borderBottom: tab === "historico" ? "3px solid #003580" : "3px solid transparent",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
          }}
        >
          <FileText style={{ width: 14, height: 14 }} /> Histórico
        </button>
      </div>

      {/* Content */}
      <main style={{ flex: 1, padding: "1.5rem", paddingBottom: "120px", overflowY: "auto" }}>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : tab === "historico" ? (
          /* ═══ HISTÓRICO TAB ═══ */
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {/* Report button */}
            <button
              onClick={() => setShowReport(true)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                padding: "12px",
                borderRadius: "14px",
                border: "none",
                background: "linear-gradient(135deg, #6366f1, #4f46e5)",
                color: "#fff",
                fontSize: "14px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              <FileText style={{ width: 18, height: 18 }} /> Gerar Relatório PDF
            </button>

            {/* Filters */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", background: "#f8fafc", borderRadius: "14px", padding: "14px" }}>
              <div style={{ display: "flex", gap: "8px" }}>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", display: "block", marginBottom: "4px" }}>De</span>
                  <input type="date" value={filtroDataInicio} onChange={(e) => setFiltroDataInicio(e.target.value)}
                    className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300" />
                </div>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", display: "block", marginBottom: "4px" }}>Até</span>
                  <input type="date" value={filtroDataFim} onChange={(e) => setFiltroDataFim(e.target.value)}
                    className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300" />
                </div>
              </div>
            </div>

            {/* Stats summary */}
            {(() => {
              const filtered = registros.filter((r) => {
                if (filtroFuncionario && !r.funcionario_nome.toLowerCase().includes(filtroFuncionario.toLowerCase())) return false;
                if (filtroCheckpoint && !r.checkpoint_nome.toLowerCase().includes(filtroCheckpoint.toLowerCase())) return false;
                return true;
              });
              const uniqueFuncionarios = new Set(filtered.map((r) => r.funcionario_nome));
              const uniqueCheckpoints = new Set(filtered.map((r) => r.checkpoint_nome));
              return (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
                    <div style={{ textAlign: "center", padding: "14px 8px", borderRadius: "14px", background: "linear-gradient(135deg, #dbeafe, #eff6ff)" }}>
                      <p style={{ fontSize: "24px", fontWeight: 800, color: "#003580" }}>{filtered.length}</p>
                      <p style={{ fontSize: "11px", fontWeight: 600, color: "#64748b" }}>Registros</p>
                    </div>
                    <div style={{ textAlign: "center", padding: "14px 8px", borderRadius: "14px", background: "linear-gradient(135deg, #dcfce7, #f0fdf4)" }}>
                      <p style={{ fontSize: "24px", fontWeight: 800, color: "#16a34a" }}>{uniqueFuncionarios.size}</p>
                      <p style={{ fontSize: "11px", fontWeight: 600, color: "#64748b" }}>Funcionários</p>
                    </div>
                    <div style={{ textAlign: "center", padding: "14px 8px", borderRadius: "14px", background: "linear-gradient(135deg, #fef3c7, #fffbeb)" }}>
                      <p style={{ fontSize: "24px", fontWeight: 800, color: "#d97706" }}>{uniqueCheckpoints.size}</p>
                      <p style={{ fontSize: "11px", fontWeight: 600, color: "#64748b" }}>Pontos</p>
                    </div>
                  </div>

                  {/* Search filters */}
                  <div style={{ display: "flex", gap: "8px" }}>
                    <div style={{ flex: 1, position: "relative" }}>
                      <Search style={{ width: 14, height: 14, color: "#94a3b8", position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} />
                      <input
                        type="text" placeholder="Funcionário..."
                        value={filtroFuncionario} onChange={(e) => setFiltroFuncionario(e.target.value)}
                        className="w-full h-9 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
                        style={{ paddingLeft: "30px", paddingRight: "10px" }}
                      />
                    </div>
                    <div style={{ flex: 1, position: "relative" }}>
                      <MapPin style={{ width: 14, height: 14, color: "#94a3b8", position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} />
                      <input
                        type="text" placeholder="Ponto..."
                        value={filtroCheckpoint} onChange={(e) => setFiltroCheckpoint(e.target.value)}
                        className="w-full h-9 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
                        style={{ paddingLeft: "30px", paddingRight: "10px" }}
                      />
                    </div>
                  </div>

                  {/* Records list */}
                  {loadingRegistros ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : filtered.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "48px 24px" }}>
                      <FileText style={{ width: 48, height: 48, color: "#d1d5db", margin: "0 auto 12px" }} />
                      <p style={{ fontWeight: 700, color: "#6b7280", fontSize: "14px" }}>Nenhum registro encontrado</p>
                      <p style={{ fontSize: "12px", color: "#9ca3af", marginTop: "4px" }}>
                        {registros.length === 0 ? "Nenhuma ronda foi registrada ainda" : "Ajuste os filtros para ver os registros"}
                      </p>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      {filtered.slice(0, 100).map((r) => {
                        const dt = new Date(r.created_at + "Z");
                        const hora = dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
                        const dataCompleta = dt.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" });
                        return (
                          <div key={r.id} style={{ background: "#fff", borderRadius: "14px", padding: "14px", border: "1px solid #e5e7eb" }}>
                            {/* Checkpoint name + badge */}
                            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                              <div style={{ width: 36, height: 36, borderRadius: "10px", background: "linear-gradient(135deg, #10b981, #059669)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                <CheckCircle2 style={{ width: 18, height: 18, color: "#fff" }} />
                              </div>
                              <p style={{ fontWeight: 700, fontSize: "15px", color: "#0f172a", flex: 1 }}>{r.checkpoint_nome}</p>
                            </div>

                            {/* Info grid: funcionário, localização, data/hora */}
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", background: "#f8fafc", borderRadius: "10px", padding: "10px 12px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <User style={{ width: 13, height: 13, color: "#003580", flexShrink: 0 }} />
                                <span style={{ fontSize: "13px", fontWeight: 600, color: "#1e293b" }}>{r.funcionario_nome}</span>
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <Calendar style={{ width: 13, height: 13, color: "#003580", flexShrink: 0 }} />
                                <span style={{ fontSize: "13px", fontWeight: 600, color: "#1e293b" }}>{dataCompleta}</span>
                              </div>
                              {r.localizacao && (
                                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                  <MapPin style={{ width: 13, height: 13, color: "#003580", flexShrink: 0 }} />
                                  <span style={{ fontSize: "13px", fontWeight: 600, color: "#1e293b" }}>{r.localizacao}</span>
                                </div>
                              )}
                              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <Clock style={{ width: 13, height: 13, color: "#003580", flexShrink: 0 }} />
                                <span style={{ fontSize: "13px", fontWeight: 700, color: "#003580" }}>{hora}</span>
                              </div>
                            </div>

                            {r.observacao && (
                              <p style={{ fontSize: "12px", color: "#475569", marginTop: "8px", background: "#f0f9ff", padding: "8px 10px", borderRadius: "8px", borderLeft: "3px solid #003580" }}>
                                💬 {r.observacao}
                              </p>
                            )}
                          </div>
                        );
                      })}
                      {filtered.length > 100 && (
                        <p style={{ textAlign: "center", fontSize: "12px", color: "#94a3b8", padding: "8px" }}>
                          Mostrando 100 de {filtered.length} registros
                        </p>
                      )}
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        ) : tab === "checkpoints" ? (
          /* ═══ CHECKPOINTS TAB ═══ */
          <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
            {checkpoints.length === 0 ? (
              <div style={{ textAlign: "center", padding: "48px 24px" }}>
                <MapPin style={{ width: 48, height: 48, color: "#d1d5db", margin: "0 auto 12px" }} />
                <p style={{ fontWeight: 700, color: "#6b7280", fontSize: "14px" }}>Nenhum ponto de ronda cadastrado</p>
                <p style={{ fontSize: "12px", color: "#9ca3af", marginTop: "4px" }}>
                  Cadastre os pontos que o segurança precisa checar durante a ronda
                </p>
                <button
                  onClick={() => { setShowForm(true); setError(""); }}
                  className="mt-4 flex items-center gap-2 mx-auto rounded-xl text-white text-sm font-bold"
                  style={{ padding: "12px 24px", background: "linear-gradient(135deg, #0062d1 0%, #003d99 50%, #001d4a 100%)" }}
                >
                  <Plus className="w-4 h-4" /> Cadastrar Ponto
                </button>
              </div>
            ) : (
              checkpoints.map((cp) => (
                <div
                  key={cp.id}
                  style={{
                    background: "transparent",
                    border: "none",
                    borderRadius: "16px",
                    padding: "16px",
                    opacity: cp.ativo ? 1 : 0.6,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: "12px",
                        background: cp.ativo ? "#003580" : "#d1d5db",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <MapPin style={{ width: 22, height: 22, color: "#fff" }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <p style={{ fontWeight: 700, fontSize: "14px", color: "#0f172a" }}>{cp.nome}</p>
                        {!cp.ativo && (
                          <span style={{ fontSize: "10px", fontWeight: 700, padding: "2px 8px", borderRadius: "6px", background: "#fef2f2", color: "#dc2626" }}>
                            INATIVO
                          </span>
                        )}
                      </div>
                      {cp.localizacao && (
                        <p style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>📍 {cp.localizacao}</p>
                      )}
                      {cp.descricao && (
                        <p style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>{cp.descricao}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleToggleCheckpoint(cp)}
                      title={cp.ativo ? "Desativar" : "Ativar"}
                    >
                      {cp.ativo ? (
                        <ToggleRight style={{ width: 24, height: 24, color: "#003580" }} />
                      ) : (
                        <ToggleLeft style={{ width: 24, height: 24, color: "#d1d5db" }} />
                      )}
                    </button>
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", gap: "6px", marginTop: "12px" }}>
                    <button
                      onClick={() => setShowQR(cp)}
                      style={{
                        flex: 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                        padding: "8px",
                        borderRadius: "10px",
                        border: "none",
                        background: "linear-gradient(135deg, #0062d1 0%, #003d99 50%, #001d4a 100%)",
                        color: "#fff",
                        fontSize: "12px",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      <QrCode style={{ width: 14, height: 14 }} /> Ver QR Code
                    </button>
                    <button
                      onClick={() => {
                        setEditingCheckpoint(cp);
                        setCpForm({ nome: cp.nome, descricao: cp.descricao || "", localizacao: cp.localizacao || "" });
                        setShowForm(true);
                        setError("");
                      }}
                      style={{
                        width: "38px",
                        height: "38px",
                        borderRadius: "10px",
                        border: "1px solid #e5e7eb",
                        background: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                      }}
                    >
                      <Edit3 style={{ width: 14, height: 14, color: "#6b7280" }} />
                    </button>
                    <button
                      onClick={() => handleDeleteCheckpoint(cp.id)}
                      style={{
                        width: "38px",
                        height: "38px",
                        borderRadius: "10px",
                        border: "1px solid #fecaca",
                        background: "#fef2f2",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                      }}
                    >
                      <Trash2 style={{ width: 14, height: 14, color: "#dc2626" }} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          /* ═══ SCHEDULES TAB ═══ */
          <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
            {schedules.length === 0 ? (
              <div style={{ textAlign: "center", padding: "48px 24px" }}>
                <Clock style={{ width: 48, height: 48, color: "#d1d5db", margin: "0 auto 12px" }} />
                <p style={{ fontWeight: 700, color: "#6b7280", fontSize: "14px" }}>Nenhum horário de ronda cadastrado</p>
                <p style={{ fontSize: "12px", color: "#9ca3af", marginTop: "4px" }}>
                  Configure os horários em que os seguranças devem fazer a ronda
                </p>
                <button
                  onClick={() => { setShowScheduleForm(true); setError(""); }}
                  className="mt-4 flex items-center gap-2 mx-auto rounded-xl text-white text-sm font-bold"
                  style={{ padding: "12px 24px", background: "linear-gradient(135deg, #0062d1 0%, #003d99 50%, #001d4a 100%)" }}
                >
                  <Plus className="w-4 h-4" /> Novo Horário
                </button>
              </div>
            ) : (
              schedules.map((s) => (
                <div
                  key={s.id}
                  style={{
                    background: "transparent",
                    border: "none",
                    borderRadius: "16px",
                    padding: "16px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: "12px",
                        background: "linear-gradient(135deg, #f59e0b, #d97706)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Clock style={{ width: 22, height: 22, color: p.text }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 700, fontSize: "14px", color: "#0f172a" }}>{s.nome}</p>
                      <p style={{ fontSize: "20px", fontWeight: 800, color: "#0369a1", marginTop: "2px" }}>{s.horario}</p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      {s.som_alerta ? (
                        <Volume2 style={{ width: 16, height: 16, color: "#f59e0b" }} />
                      ) : (
                        <BellOff style={{ width: 16, height: 16, color: "#d1d5db" }} />
                      )}
                    </div>
                  </div>

                  {/* Days of week */}
                  <div style={{ display: "flex", gap: "4px", marginTop: "10px" }}>
                    {DIAS_SEMANA.map((dia, i) => {
                      const active = s.dias_semana.split(",").map(Number).includes(i);
                      return (
                        <span
                          key={i}
                          style={{
                            flex: 1,
                            textAlign: "center",
                            fontSize: "10px",
                            fontWeight: 700,
                            padding: "4px 0",
                            borderRadius: "6px",
                            background: active ? "rgba(45,51,84,0.1)" : "#f9fafb",
                            color: active ? "#2d3354" : "#d1d5db",
                            border: active ? "1px solid rgba(45,51,84,0.3)" : "1px solid #e5e7eb",
                          }}
                        >
                          {dia}
                        </span>
                      );
                    })}
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", gap: "6px", marginTop: "10px" }}>
                    <button
                      onClick={() => {
                        setEditingSchedule(s);
                        setSchedForm({
                          nome: s.nome,
                          horario: s.horario,
                          dias_semana: s.dias_semana,
                          som_alerta: !!s.som_alerta,
                        });
                        setShowScheduleForm(true);
                        setError("");
                      }}
                      style={{
                        flex: 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                        padding: "8px",
                        borderRadius: "10px",
                        border: "1px solid #e5e7eb",
                        background: "#fff",
                        fontSize: "12px",
                        fontWeight: 600,
                        cursor: "pointer",
                        color: "#374151",
                      }}
                    >
                      <Edit3 style={{ width: 12, height: 12 }} /> Editar
                    </button>
                    <button
                      onClick={() => handleDeleteSchedule(s.id)}
                      style={{
                        width: "38px",
                        height: "38px",
                        borderRadius: "10px",
                        border: "1px solid #fecaca",
                        background: "#fef2f2",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                      }}
                    >
                      <Trash2 style={{ width: 14, height: 14, color: "#dc2626" }} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>

      {/* ═══ QR Code Modal ═══ */}
      {showQR && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center" style={{ padding: "16px" }}>
          <div className="bg-white rounded-3xl w-full max-w-sm" style={{ padding: "24px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
              <h3 style={{ fontWeight: 700, fontSize: "16px", color: "#0f172a" }}>QR Code</h3>
              <button onClick={() => setShowQR(null)} style={{ background: "none", border: "none", cursor: "pointer" }}>
                <X style={{ width: 20, height: 20, color: "#6b7280" }} />
              </button>
            </div>

            <div style={{ textAlign: "center" }}>
              <img
                src={getQRUrl(showQR.qr_code_data)}
                alt={`QR Code - ${showQR.nome}`}
                style={{ width: "280px", height: "280px", margin: "0 auto", borderRadius: "12px", border: "2px solid #e2e8f0" }}
              />
              <p style={{ fontWeight: 700, fontSize: "16px", color: "#0f172a", marginTop: "12px" }}>{showQR.nome}</p>
              {showQR.localizacao && (
                <p style={{ fontSize: "13px", color: "#64748b", marginTop: "4px" }}>📍 {showQR.localizacao}</p>
              )}
            </div>

            <div style={{ display: "flex", gap: "8px", marginTop: "20px" }}>
              <button
                onClick={() => handleDownloadQR(showQR)}
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  padding: "12px",
                  borderRadius: "12px",
                  border: "none",
                  background: "linear-gradient(135deg, #0062d1 0%, #003d99 50%, #001d4a 100%)",
                  color: "#fff",
                  fontSize: "13px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                <Download style={{ width: 16, height: 16 }} /> Baixar
              </button>
              <button
                onClick={() => handlePrintQR(showQR)}
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  padding: "12px",
                  borderRadius: "12px",
                  border: "none",
                  background: "linear-gradient(135deg, #0062d1 0%, #003d99 50%, #001d4a 100%)",
                  color: "#fff",
                  fontSize: "13px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                <Printer style={{ width: 16, height: 16 }} /> Imprimir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Checkpoint Form Modal ═══ */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center">
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl" style={{ padding: "24px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
              <h3 style={{ fontWeight: 700, fontSize: "16px", color: "#0f172a" }}>
                {editingCheckpoint ? "Editar Ponto" : "Novo Ponto de Ronda"}
              </h3>
              <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", cursor: "pointer" }}>
                <X style={{ width: 20, height: 20, color: "#6b7280" }} />
              </button>
            </div>

            {error && (
              <div style={{ padding: "10px 14px", borderRadius: "10px", background: "#fef2f2", color: "#dc2626", fontSize: "13px", marginBottom: "12px" }}>
                {error}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <span style={{ fontSize: "12px", fontWeight: 600, color: "#374151", marginBottom: "4px", display: "block" }}>
                  Nome do Ponto *
                </span>
                <input
                  type="text"
                  value={cpForm.nome}
                  onChange={(e) => setCpForm({ ...cpForm, nome: e.target.value })}
                  placeholder="Ex: Guarita Principal"
                  className="w-full h-11 rounded-xl border border-gray-200 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
                />
              </div>
              <div>
                <span style={{ fontSize: "12px", fontWeight: 600, color: "#374151", marginBottom: "4px", display: "block" }}>
                  Localização
                </span>
                <input
                  type="text"
                  value={cpForm.localizacao}
                  onChange={(e) => setCpForm({ ...cpForm, localizacao: e.target.value })}
                  placeholder="Ex: Entrada lateral Bloco A"
                  className="w-full h-11 rounded-xl border border-gray-200 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
                />
              </div>
              <div>
                <span style={{ fontSize: "12px", fontWeight: 600, color: "#374151", marginBottom: "4px", display: "block" }}>
                  Descrição (opcional)
                </span>
                <textarea
                  value={cpForm.descricao}
                  onChange={(e) => setCpForm({ ...cpForm, descricao: e.target.value })}
                  placeholder="Observações sobre este ponto..."
                  rows={3}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
                  style={{ resize: "none" }}
                />
              </div>
            </div>

            <button
              onClick={handleSaveCheckpoint}
              className="w-full mt-5 h-12 rounded-xl text-white font-bold text-sm"
              style={{ background: "linear-gradient(135deg, #0062d1 0%, #003d99 50%, #001d4a 100%)", border: "none", cursor: "pointer" }}
            >
              {editingCheckpoint ? "Salvar Alterações" : "Cadastrar Ponto"}
            </button>
          </div>
        </div>
      )}

      {/* ═══ Schedule Form Modal ═══ */}
      {/* ═══ Report Modal ═══ */}
      <ReportModal
        show={showReport}
        onClose={() => setShowReport(false)}
        onGenerate={handleGenerateReport}
        title="Relatório de rondas com estatísticas, gráficos e detalhamento por funcionário e ponto."
      />

      {showScheduleForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center">
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl" style={{ padding: "24px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
              <h3 style={{ fontWeight: 700, fontSize: "16px", color: "#0f172a" }}>
                {editingSchedule ? "Editar Horário" : "Novo Horário de Ronda"}
              </h3>
              <button onClick={() => setShowScheduleForm(false)} style={{ background: "none", border: "none", cursor: "pointer" }}>
                <X style={{ width: 20, height: 20, color: "#6b7280" }} />
              </button>
            </div>

            {error && (
              <div style={{ padding: "10px 14px", borderRadius: "10px", background: "#fef2f2", color: "#dc2626", fontSize: "13px", marginBottom: "12px" }}>
                {error}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <span style={{ fontSize: "12px", fontWeight: 600, color: "#374151", marginBottom: "4px", display: "block" }}>
                  Nome *
                </span>
                <input
                  type="text"
                  value={schedForm.nome}
                  onChange={(e) => setSchedForm({ ...schedForm, nome: e.target.value })}
                  placeholder="Ex: Ronda Noturna"
                  className="w-full h-11 rounded-xl border border-gray-200 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
                />
              </div>
              <div>
                <span style={{ fontSize: "12px", fontWeight: 600, color: "#374151", marginBottom: "4px", display: "block" }}>
                  Horário *
                </span>
                <input
                  type="time"
                  value={schedForm.horario}
                  onChange={(e) => setSchedForm({ ...schedForm, horario: e.target.value })}
                  className="w-full h-11 rounded-xl border border-gray-200 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
                />
              </div>
              <div>
                <span style={{ fontSize: "12px", fontWeight: 600, color: "#374151", marginBottom: "8px", display: "block" }}>
                  Dias da Semana
                </span>
                <div style={{ display: "flex", gap: "4px" }}>
                  {DIAS_SEMANA.map((dia, i) => {
                    const active = schedForm.dias_semana.split(",").map(Number).includes(i);
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => toggleSchedDay(i)}
                        style={{
                          flex: 1,
                          padding: "8px 0",
                          borderRadius: "8px",
                          border: active ? "2px solid #2d3354" : "1px solid #e5e7eb",
                          background: active ? "rgba(45,51,84,0.1)" : "#fff",
                          color: active ? "#2d3354" : "#9ca3af",
                          fontSize: "11px",
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        {dia}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "8px 0" }}>
                <button
                  type="button"
                  onClick={() => setSchedForm({ ...schedForm, som_alerta: !schedForm.som_alerta })}
                  style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}
                >
                  {schedForm.som_alerta ? (
                    <ToggleRight style={{ width: 28, height: 28, color: "#003580" }} />
                  ) : (
                    <ToggleLeft style={{ width: 28, height: 28, color: "#d1d5db" }} />
                  )}
                  <span style={{ fontSize: "13px", fontWeight: 600, color: schedForm.som_alerta ? "#0f172a" : "#9ca3af" }}>
                    Alerta sonoro na hora da ronda
                  </span>
                </button>
              </div>
            </div>

            <button
              onClick={handleSaveSchedule}
              className="w-full mt-3 h-12 rounded-xl text-white font-bold text-sm"
              style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", border: "none", cursor: "pointer" }}
            >
              {editingSchedule ? "Salvar Alterações" : "Cadastrar Horário"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
