import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import ReportModal from "@/components/ReportModal";
import { gerarRelatorioRondas } from "@/lib/pdfUtils";
import TutorialButton, { TSection, TStep, TBullet } from "@/components/TutorialButton";
import {
  ArrowLeft,
  Shield,
  QrCode,
  MapPin,
  Clock,
  CheckCircle2,
  XCircle,

  X,
  Bell,
  BellOff,

  FileText,

  MessageSquare,
  Mic,

  Plus,
  Trash2,
  Play,
  Square,
  Pause,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useTheme } from "@/hooks/useTheme";
import ComoFunciona from "@/components/ComoFunciona";
import { dialogAlert } from "@/lib/dialog";

const API = "/api";

interface Checkpoint {
  id: number;
  nome: string;
  descricao: string | null;
  localizacao: string | null;
  qr_code_data: string;
  ativo: number;
}

interface Schedule {
  id: number;
  nome: string;
  horario: string;
  dias_semana: string;
  som_alerta: number;
  ativo: number;
}

interface Registro {
  id: number;
  checkpoint_nome: string;
  funcionario_nome: string;
  localizacao: string | null;
  observacao: string | null;
  created_at: string;
}

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

interface ObservacaoItem {
  id: number;
  texto: string;
  audioBlob: Blob | null;
  audioUrl: string | null;
  audioBase64: string | null;
  audioDuration: number;
}

export default function RegistroRonda() {
  const { isDark, p } = useTheme();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tab, setTab] = useState<"scan" | "historico">("scan");
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReport, setShowReport] = useState(false);

  // Scanner
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<"success" | "error" | null>(null);
  const [scanMessage, setScanMessage] = useState("");
  const [scanCheckpoint, setScanCheckpoint] = useState<string>("");
  const [observacao, setObservacao] = useState("");
  const [observacoes, setObservacoes] = useState<ObservacaoItem[]>([]);
  const [obsNextId, setObsNextId] = useState(1);
  const [recordingId, setRecordingId] = useState<number | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [playingAudioId, setPlayingAudioId] = useState<number | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Alert system
  const [alertEnabled, setAlertEnabled] = useState(true);
  const [nextAlert, setNextAlert] = useState<string>("");
  const alertAudioRef = useRef<HTMLAudioElement | null>(null);
  const alertTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Today's progress
  const [todayCount, setTodayCount] = useState(0);
  const [todayCheckpoints, setTodayCheckpoints] = useState<Set<number>>(new Set());

  const fetchAll = async () => {
    try {
      const [cpRes, schedRes, regRes] = await Promise.all([
        apiFetch(`${API}/rondas/checkpoints`),
        apiFetch(`${API}/rondas/schedules`),
        apiFetch(`${API}/rondas/registros?funcionario_id=${user?.id}`),
      ]);
      if (cpRes.ok) setCheckpoints(await cpRes.json());
      if (schedRes.ok) setSchedules(await schedRes.json());
      if (regRes.ok) {
        const regs = await regRes.json();
        setRegistros(regs);
        // Count today
        const today = new Date().toISOString().slice(0, 10);
        const todayRegs = regs.filter((r: Registro) => r.created_at.startsWith(today));
        setTodayCount(todayRegs.length);
        const cpIds = new Set<number>();
        todayRegs.forEach((r: any) => cpIds.add(r.checkpoint_id));
        setTodayCheckpoints(cpIds);
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  // ─── Alert Timer ─────────────
  useEffect(() => {
    if (!alertEnabled || schedules.length === 0) return;

    const check = () => {
      const now = new Date();
      const day = now.getDay();
      const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

      // Find matching schedule
      for (const s of schedules) {
        if (!s.ativo || !s.som_alerta) continue;
        const days = s.dias_semana.split(",").map(Number);
        if (!days.includes(day)) continue;
        if (s.horario === hhmm) {
          // Trigger alert
          playAlertSound();
          setScanMessage(`🔔 Hora da Ronda: ${s.nome} (${s.horario})`);
          break;
        }
      }

      // Find next alert
      const upcoming = schedules
        .filter((s) => s.ativo && s.som_alerta && s.dias_semana.split(",").map(Number).includes(day))
        .map((s) => s.horario)
        .filter((h) => h > hhmm)
        .sort();
      setNextAlert(upcoming[0] || "—");
    };

    check();
    alertTimerRef.current = setInterval(check, 30000); // check every 30s

    return () => {
      if (alertTimerRef.current) clearInterval(alertTimerRef.current);
    };
  }, [alertEnabled, schedules]);

  const playAlertSound = () => {
    try {
      // Use Web Audio API for a beep
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      osc.type = "sine";
      gain.gain.value = 0.3;
      osc.start();
      setTimeout(() => {
        osc.stop();
        ctx.close();
      }, 1000);
      // Double beep
      setTimeout(() => {
        const ctx2 = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc2 = ctx2.createOscillator();
        const gain2 = ctx2.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx2.destination);
        osc2.frequency.value = 1100;
        osc2.type = "sine";
        gain2.gain.value = 0.3;
        osc2.start();
        setTimeout(() => { osc2.stop(); ctx2.close(); }, 600);
      }, 1200);
    } catch {}
  };

  // ─── QR Scanner ─────────────
  const startScanner = async () => {
    setScanResult(null);
    setScanMessage("");
    setScanCheckpoint("");
    setObservacao("");
    setScanning(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      // Start frame scanning
      scanIntervalRef.current = setInterval(scanFrame, 500);
    } catch {
      setScanResult("error");
      setScanMessage("Não foi possível acessar a câmera.");
      setScanning(false);
    }
  };

  const stopScanner = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setScanning(false);
  };

  const scanFrame = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video.readyState !== video.HAVE_ENOUGH_DATA) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);

    // Try to detect QR using BarcodeDetector (Chrome) or manual approach
    if ("BarcodeDetector" in window) {
      const detector = new (window as any).BarcodeDetector({ formats: ["qr_code"] });
      detector.detect(canvas).then((barcodes: any[]) => {
        if (barcodes.length > 0) {
          const data = barcodes[0].rawValue;
          if (data.startsWith("RONDA-CP-")) {
            stopScanner();
            handleQRDetected(data);
          }
        }
      }).catch(() => {});
    }
  };

  const handleQRDetected = async (qrData: string) => {
    // Immediately register
    try {
      const res = await apiFetch(`${API}/rondas/registros`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qr_code_data: qrData }),
      });

      if (res.ok) {
        const reg = await res.json();
        setScanResult("success");
        setScanCheckpoint(reg.checkpoint_nome);
        setScanMessage(`✅ Ponto registrado: ${reg.checkpoint_nome}`);
        playSuccessSound();
        fetchAll();
      } else {
        const data = await res.json();
        setScanResult("error");
        setScanMessage(data.error || "QR Code inválido.");
      }
    } catch {
      setScanResult("error");
      setScanMessage("Erro de conexão.");
    }
  };

  // Manual QR input (for testing or when camera doesn't work)
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualQR, setManualQR] = useState("");

  const handleManualScan = async () => {
    if (!manualQR.trim()) return;
    setSubmitting(true);
    try {
      const obsPayload = buildObservacaoPayload();
      const res = await apiFetch(`${API}/rondas/registros`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qr_code_data: manualQR.trim(), observacao: obsPayload }),
      });
      if (res.ok) {
        const reg = await res.json();
        setScanResult("success");
        setScanCheckpoint(reg.checkpoint_nome);
        setScanMessage(`✅ Registrado: ${reg.checkpoint_nome}`);
        setShowManualInput(false);
        setManualQR("");
        resetObservacoes();
        playSuccessSound();
        fetchAll();
      } else {
        const data = await res.json();
        setScanResult("error");
        setScanMessage(data.error || "QR Code inválido.");
      }
    } catch {
      setScanResult("error");
      setScanMessage("Erro de conexão.");
    }
    setSubmitting(false);
  };

  // Checklist mode — tap checkpoint from list
  const handleCheckpointTap = async (cp: Checkpoint) => {
    setSubmitting(true);
    try {
      const obsPayload = buildObservacaoPayload();
      const res = await apiFetch(`${API}/rondas/registros`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qr_code_data: cp.qr_code_data, observacao: obsPayload }),
      });
      if (res.ok) {
        const reg = await res.json();
        setScanResult("success");
        setScanCheckpoint(reg.checkpoint_nome);
        setScanMessage(`✅ Registrado: ${reg.checkpoint_nome}`);
        resetObservacoes();
        playSuccessSound();
        fetchAll();
      } else {
        const data = await res.json();
        setScanResult("error");
        setScanMessage(data.error || "Erro ao registrar.");
      }
    } catch {
      setScanResult("error");
      setScanMessage("Erro de conexão.");
    }
    setSubmitting(false);
  };

  // ─── Multi-observation helpers ─────────────
  const addObservacao = () => {
    setObservacoes((prev) => [...prev, { id: obsNextId, texto: "", audioBlob: null, audioUrl: null, audioBase64: null, audioDuration: 0 }]);
    setObsNextId((n) => n + 1);
  };

  const removeObservacao = (id: number) => {
    setObservacoes((prev) => {
      const item = prev.find((o) => o.id === id);
      if (item?.audioUrl) URL.revokeObjectURL(item.audioUrl);
      return prev.filter((o) => o.id !== id);
    });
    if (recordingId === id) stopRecording();
    if (playingAudioId === id) stopAudio();
  };

  const updateObservacaoTexto = (id: number, texto: string) => {
    setObservacoes((prev) => prev.map((o) => (o.id === id ? { ...o, texto } : o)));
  };

  const startRecording = async (id: number) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
      recordingChunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) recordingChunksRef.current.push(e.data); };
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(recordingChunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        // Convert to base64
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          setObservacoes((prev) =>
            prev.map((o) =>
              o.id === id
                ? { ...o, audioBlob: blob, audioUrl: url, audioBase64: base64, audioDuration: recordingSeconds }
                : o
            )
          );
        };
        reader.readAsDataURL(blob);
        if (recordingTimerRef.current) { clearInterval(recordingTimerRef.current); recordingTimerRef.current = null; }
        setRecordingId(null);
        setRecordingSeconds(0);
      };
      mediaRecorderRef.current = mr;
      mr.start();
      setRecordingId(id);
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((s) => {
          if (s >= 29) { stopRecording(); return 30; }
          return s + 1;
        });
      }, 1000);
    } catch {
      void dialogAlert("Não foi possível acessar o microfone.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (recordingTimerRef.current) { clearInterval(recordingTimerRef.current); recordingTimerRef.current = null; }
  };

  const playAudio = (id: number, url: string) => {
    stopAudio();
    const audio = new Audio(url);
    audio.onended = () => setPlayingAudioId(null);
    audioPlayerRef.current = audio;
    setPlayingAudioId(id);
    audio.play();
  };

  const stopAudio = () => {
    if (audioPlayerRef.current) { audioPlayerRef.current.pause(); audioPlayerRef.current = null; }
    setPlayingAudioId(null);
  };

  const buildObservacaoPayload = (): string => {
    const items = observacoes.filter((o) => o.texto.trim() || o.audioBase64);
    if (items.length === 0 && !observacao.trim()) return observacao;
    if (items.length === 0) return observacao;
    const payload = items.map((o) => ({
      texto: o.texto,
      audio: o.audioBase64 || null,
      audioDuration: o.audioDuration,
    }));
    return JSON.stringify(payload);
  };

  const resetObservacoes = () => {
    observacoes.forEach((o) => { if (o.audioUrl) URL.revokeObjectURL(o.audioUrl); });
    setObservacoes([]);
    setObsNextId(1);
    setObservacao("");
  };

  const playSuccessSound = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = 660; osc.type = "sine"; gain.gain.value = 0.2;
      osc.start();
      setTimeout(() => { osc.frequency.value = 880; }, 150);
      setTimeout(() => { osc.stop(); ctx.close(); }, 300);
    } catch {}
  };

  // ─── PDF report ─────────────
  const handleGenerateReport = async (dateFrom: string, dateTo: string, _withCharts: boolean) => {
    // Rondas always includes charts
    try {
      const [regRes, statsRes] = await Promise.all([
        apiFetch(`${API}/rondas/registros?data_inicio=${dateFrom}&data_fim=${dateTo}`),
        apiFetch(`${API}/rondas/stats?data_inicio=${dateFrom}&data_fim=${dateTo}`),
      ]);
      const regs = regRes.ok ? await regRes.json() : [];
      const stats = statsRes.ok ? await statsRes.json() : {
        total: 0, byCheckpoint: [], byFuncionario: [], byHour: [], byDay: [],
        totalCheckpoints: 0, checkpointsCobertos: 0,
      };
      gerarRelatorioRondas(regs, stats, dateFrom, dateTo, user?.condominio_nome);
    } catch {
      void dialogAlert("Erro ao gerar relatório.");
    }
  };

  const activeCheckpoints = checkpoints.filter((c) => c.ativo);

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: p.pageBg }}>
      {/* Header */}
      <header className="sticky top-0 z-40" style={{ background: p.headerBg, borderBottom: p.headerBorder, boxShadow: p.headerShadow, color: p.text, paddingTop: "max(0, env(safe-area-inset-top))" }}>
        <div style={{ padding: "0 24px", height: "4.5rem", display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => navigate("/dashboard")} style={{ width: 40, height: 40, borderRadius: 12, background: p.btnBg, border: p.btnBorder, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ArrowLeft className="w-6 h-6" />
          </button>
          <Shield className="w-6 h-6" />
          <span style={{ fontWeight: 700, fontSize: 16 }}>Registro de Ronda</span>
          <TutorialButton title="Registro de Ronda">
            <TSection icon={<span>📋</span>} title="O QUE É ESTA FUNÇÃO?">
              <p>O porteiro/funcionário executa as <strong>rondas de segurança</strong> escaneando QR Codes nos pontos de verificação (checkpoints) distribuídos pelo condomínio. Cada ronda registra o horário exato, fotos e observações de cada ponto visitado. O síndico acompanha tudo remotamente.</p>
            </TSection>
            <TSection icon={<span>🏗️</span>} title="COMO FAZER UMA RONDA">
              <TStep n={1}>Clique em <strong>"Iniciar Ronda"</strong> — o cronômetro começa a contar</TStep>
              <TStep n={2}>Vá até o <strong>primeiro ponto de verificação</strong> (checkpoint) do condomínio</TStep>
              <TStep n={3}>Encontre o <strong>QR Code colado no local</strong> e escaneie com a câmera do celular</TStep>
              <TStep n={4}>O sistema registra automaticamente: <strong>ponto visitado + horário exato</strong></TStep>
              <TStep n={5}>Se houver algo a reportar, adicione <strong>observações</strong> (texto) e tire <strong>fotos</strong></TStep>
              <TStep n={6}>Vá até o <strong>próximo checkpoint</strong> e repita o escaneamento</TStep>
              <TStep n={7}>Após visitar todos os pontos, clique em <strong>"Finalizar Ronda"</strong></TStep>
              <p style={{ marginTop: "8px", fontSize: "14px", color: "#2d3354" }}>👉 O síndico recebe o registro completo da ronda com todos os checkpoints, horários, fotos e observações.</p>
            </TSection>
            <TSection icon={<span>🔧</span>} title="FUNÇÕES DISPONÍVEIS">
              <TBullet><strong>Escanear QR Code</strong> — Aponte a câmera para o QR Code do checkpoint</TBullet>
              <TBullet><strong>Foto por checkpoint</strong> — Tire fotos de cada ponto como comprovação visual</TBullet>
              <TBullet><strong>Observações</strong> — Registre problemas, incidentes ou situações observadas em cada ponto</TBullet>
              <TBullet><strong>Cronômetro</strong> — Tempo total da ronda contado automaticamente</TBullet>
              <TBullet><strong>Progresso visual</strong> — Barra mostra quantos checkpoints faltam visitar</TBullet>
              <TBullet><strong>Alerta sonoro</strong> — Som de aviso quando a ronda está atrasada ou passou do horário</TBullet>
            </TSection>
            <TSection icon={<span>📱</span>} title="HISTÓRICO DE RONDAS">
              <TBullet>Todas as rondas realizadas ficam salvas com <strong>data, hora, checkpoints visitados e fotos</strong></TBullet>
              <TBullet>O síndico pode consultar o <strong>histórico completo</strong> na tela de Controle de Rondas</TBullet>
              <TBullet>Gere <strong>relatórios PDF</strong> com histórico de rondas por período</TBullet>
              <TBullet>Rondas <strong>incompletas</strong> ficam destacadas para o síndico investigar</TBullet>
            </TSection>
            <TSection icon={<span>⭐</span>} title="DICAS IMPORTANTES">
              <TBullet><strong>Não pule checkpoints</strong> — o síndico sabe quais pontos foram visitados e quais não</TBullet>
              <TBullet>Se encontrar algo <strong>suspeito ou quebrado</strong>, tire foto e descreva nas observações</TBullet>
              <TBullet>A ronda conta como <strong>completa</strong> apenas quando todos os checkpoints ativos forem escaneados</TBullet>
              <TBullet>Se o <strong>alerta sonoro</strong> tocar, significa que a ronda está atrasada — inicie imediatamente</TBullet>
              <TBullet>Suas rondas ficam registradas no <strong>histórico permanente</strong> — comprovação do seu trabalho</TBullet>
            </TSection>
          </TutorialButton>
          <div className="flex-1" />
          <button
            onClick={() => setAlertEnabled(!alertEnabled)}
            className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center"
            title={alertEnabled ? "Desativar alertas" : "Ativar alertas"}
          >
            {alertEnabled ? <Bell className="w-6 h-6" /> : <BellOff className="w-6 h-6" />}
          </button>
          <button
            onClick={() => setShowReport(true)}
            className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center"
            title="Relatório"
          >
            <FileText className="w-6 h-6" />
          </button>
        </div>
      </header>

      {/* Como Funciona bar */}
      <div style={{ padding: "12px 20px 0" }}>
        <ComoFunciona steps={[
          "🛡️ Porteiro escaneia QR Code nos pontos de ronda",
          "📍 Sistema registra horário e localização automaticamente",
          "📝 Adicione observações em texto ou áudio por ponto",
          "👀 Síndico acompanha rondas e recebe alertas",
        ]} />
      </div>

      {/* Stats bar */}
      <div style={{ display: "flex", gap: "12px", padding: "12px 20px", background: "#f8fafc" }}>
        <div
          style={{
            flex: 1,
            padding: "10px 14px",
            borderRadius: "12px",
            background: "linear-gradient(135deg, #dcfce7, #bbf7d0)",
            border: "1px solid #86efac",
          }}
        >
          <div style={{ fontSize: "20px", fontWeight: 800, color: "#16a34a" }}>{todayCount}</div>
          <div style={{ fontSize: "12px", fontWeight: 600, color: "#166534" }}>Registros Hoje</div>
        </div>
        <div
          style={{
            flex: 1,
            padding: "10px 14px",
            borderRadius: "12px",
            background: "linear-gradient(135deg, rgba(45,51,84,0.1), rgba(45,51,84,0.15))",
            border: "1px solid rgba(45,51,84,0.3)",
          }}
        >
          <div style={{ fontSize: "20px", fontWeight: 800, color: "#2d3354" }}>{todayCheckpoints.size}/{activeCheckpoints.length}</div>
          <div style={{ fontSize: "12px", fontWeight: 600, color: "#2d3354" }}>Pontos Visitados</div>
        </div>
        <div
          style={{
            flex: 1,
            padding: "10px 14px",
            borderRadius: "12px",
            background: "linear-gradient(135deg, #fef3c7, #fde68a)",
            border: "1px solid #fbbf24",
          }}
        >
          <div style={{ fontSize: "15px", fontWeight: 800, color: "#b45309" }}>{nextAlert || "—"}</div>
          <div style={{ fontSize: "12px", fontWeight: 600, color: "#92400e" }}>Próxima Ronda</div>
        </div>
      </div>

      {/* Alert message */}
      {scanMessage && (
        <div
          style={{
            margin: "0 20px 8px",
            padding: "12px 16px",
            borderRadius: "12px",
            background: scanResult === "success"
              ? "linear-gradient(135deg, #dcfce7, #bbf7d0)"
              : scanResult === "error"
              ? "linear-gradient(135deg, #fef2f2, #fecaca)"
              : "rgba(45,51,84,0.1)",
            border: scanResult === "success" ? "1px solid #4ade80"
              : scanResult === "error" ? "1px solid #f87171"
              : "1px solid rgba(45,51,84,0.3)",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          {scanResult === "success" ? (
            <CheckCircle2 style={{ width: 24, height: 24, color: "#16a34a", flexShrink: 0 }} />
          ) : scanResult === "error" ? (
            <XCircle style={{ width: 24, height: 24, color: "#dc2626", flexShrink: 0 }} />
          ) : (
            <Bell style={{ width: 24, height: 24, color: "#2d3354", flexShrink: 0 }} />
          )}
          <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--card-foreground)", flex: 1 }}>
            {scanMessage}
          </span>
          <button onClick={() => setScanMessage("")} style={{ background: "none", border: "none", cursor: "pointer" }}>
            <X style={{ width: 18, height: 18, color: "#6b7280" }} />
          </button>
        </div>
      )}

      {/* Tab switcher */}
      <div style={{ display: "flex", borderBottom: "1px solid #e5e7eb" }}>
        <button
          onClick={() => setTab("scan")}
          style={{
            flex: 1,
            padding: "14px 16px",
            fontSize: "14px",
            fontWeight: 700,
            border: "none",
            background: tab === "scan" ? "#f0fdf4" : "#fff",
            color: tab === "scan" ? "#16a34a" : "#6b7280",
            borderBottom: tab === "scan" ? "3px solid #22c55e" : "3px solid transparent",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
          }}
        >
          <QrCode style={{ width: 18, height: 18 }} /> Registrar Ronda
        </button>
        <button
          onClick={() => setTab("historico")}
          style={{
            flex: 1,
            padding: "14px 16px",
            fontSize: "14px",
            fontWeight: 700,
            border: "none",
            background: tab === "historico" ? "#f0fdf4" : "#fff",
            color: tab === "historico" ? "#16a34a" : "#6b7280",
            borderBottom: tab === "historico" ? "3px solid #22c55e" : "3px solid transparent",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
          }}
        >
          <Clock style={{ width: 18, height: 18 }} /> Histórico
        </button>
      </div>

      {/* Content */}
      <main style={{ flex: 1, padding: "16px 20px", paddingBottom: "100px", overflowY: "auto" }}>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : tab === "scan" ? (
          /* ═══ SCAN TAB ═══ */
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5cm" }}>
            {/* Scan QR button */}
            <button
              onClick={scanning ? stopScanner : startScanner}
              style={{
                width: "100%",
                padding: "20px",
                borderRadius: "20px",
                border: "none",
                background: scanning
                  ? "linear-gradient(135deg, #dc2626, #b91c1c)"
                  : "linear-gradient(135deg, #22c55e, #16a34a)",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                gap: "16px",
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "16px",
                  background: "rgba(255,255,255,0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {scanning ? (
                  <X style={{ width: 28, height: 28 }} />
                ) : (
                  <QrCode style={{ width: 28, height: 28 }} />
                )}
              </div>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontSize: "16px", fontWeight: 800 }}>
                  {scanning ? "PARAR SCANNER" : "ESCANEAR QR CODE"}
                </div>
                <div style={{ fontSize: "12px", opacity: 0.85, fontWeight: 400 }}>
                  {scanning
                    ? "Aponte a câmera para o QR Code do ponto de ronda"
                    : "Abra a câmera para registrar passagem no ponto de ronda"}
                </div>
              </div>
            </button>

            {/* Scanner video */}
            {scanning && (
              <div style={{ borderRadius: "16px", overflow: "hidden", background: "#000", position: "relative" }}>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{ width: "100%", height: "auto", maxHeight: "300px", objectFit: "cover" }}
                />
                <canvas ref={canvasRef} style={{ display: "none" }} />
                {/* Scanner overlay */}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <div
                    style={{
                      width: "180px",
                      height: "180px",
                      border: "3px solid rgba(34,197,94,0.8)",
                      borderRadius: "24px",
                      animation: "pulse 2s infinite",
                    }}
                  />
                </div>
                <div style={{ position: "absolute", bottom: 8, left: 0, right: 0, textAlign: "center" }}>
                  <span style={{ fontSize: "12px", color: p.text, background: "rgba(0,0,0,0.6)", padding: "4px 12px", borderRadius: "8px" }}>
                    Aponte para o QR Code do ponto de ronda
                  </span>
                </div>
              </div>
            )}

            {/* Checkpoint Checklist */}
            <div>
              <h3 style={{ fontSize: "14px", fontWeight: 700, color: p.text, marginBottom: "10px", display: "flex", alignItems: "center", gap: "6px" }}>
                <MapPin style={{ width: 18, height: 18, color: p.text }} />
                Pontos de Ronda — Checklist
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {activeCheckpoints.length === 0 ? (
                  <p style={{ fontSize: "13px", color: isDark ? "rgba(255,255,255,0.7)" : "#475569", textAlign: "center", padding: "24px" }}>
                    Nenhum ponto de ronda configurado pelo síndico.
                  </p>
                ) : (
                  activeCheckpoints.map((cp) => {
                    const checked = todayCheckpoints.has(cp.id);
                    return (
                      <button
                        key={cp.id}
                        onClick={() => !submitting && handleCheckpointTap(cp)}
                        disabled={submitting}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                          padding: "14px 16px",
                          borderRadius: "14px",
                          border: checked ? "1.5px solid #4ade80" : "1.5px solid #e5e7eb",
                          background: checked ? "#f0fdf4" : "#fff",
                          cursor: "pointer",
                          textAlign: "left",
                          width: "100%",
                          transition: "all 0.2s",
                        }}
                      >
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: "10px",
                            background: checked
                              ? "linear-gradient(135deg, #22c55e, #16a34a)"
                              : "#f1f5f9",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          {checked ? (
                            <CheckCircle2 style={{ width: 22, height: 22, color: p.text }} />
                          ) : (
                            <MapPin style={{ width: 20, height: 20, color: "#94a3b8" }} />
                          )}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontWeight: 600, fontSize: "14px", color: checked ? "#16a34a" : "#0f172a" }}>
                            {cp.nome}
                          </p>
                          {cp.localizacao && (
                            <p style={{ fontSize: "12px", color: "#94a3b8", marginTop: "1px" }}>📍 {cp.localizacao}</p>
                          )}
                        </div>
                        {checked && (
                          <span style={{ fontSize: "12px", fontWeight: 700, color: "#16a34a", padding: "2px 8px", borderRadius: "6px", background: "#dcfce7" }}>
                            ✓ FEITO
                          </span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Observações input - multiple fields with audio */}
            <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: "12px" }}>
              <span style={{ fontSize: "13px", fontWeight: 600, color: p.text, marginBottom: "8px", display: "flex", alignItems: "center", gap: "4px" }}>
                <MessageSquare style={{ width: 16, height: 16, color: p.text }} /> Observações (opcional)
              </span>

              {observacoes.length === 0 && (
                <p style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "8px" }}>
                  Adicione observações com texto ou áudio (30s máx.)
                </p>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {observacoes.map((obs, idx) => (
                  <div
                    key={obs.id}
                    style={{
                      padding: "14px 16px",
                      borderRadius: "14px",
                      border: "1.5px solid #e5e7eb",
                      background: "#fafbfc",
                    }}
                  >
                    {/* Header with number and delete */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                      <span style={{ fontSize: "12px", fontWeight: 700, color: "#16a34a" }}>
                        Observação {idx + 1}
                      </span>
                      <button
                        onClick={() => removeObservacao(obs.id)}
                        style={{ background: "none", border: "none", cursor: "pointer", padding: "2px" }}
                      >
                        <Trash2 style={{ width: 18, height: 18, color: "#ef4444" }} />
                      </button>
                    </div>

                    {/* Text input */}
                    <textarea
                      value={obs.texto}
                      onChange={(e) => updateObservacaoTexto(obs.id, e.target.value)}
                      placeholder="Descreva o que observou..."
                      rows={2}
                      className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
                      style={{ resize: "none", color: p.text, background: "var(--color-card, #fff)", marginBottom: "8px" }}
                    />

                    {/* Audio controls */}
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      {recordingId === obs.id ? (
                        /* Recording in progress */
                        <>
                          <button
                            onClick={stopRecording}
                            style={{
                              display: "flex", alignItems: "center", gap: "6px",
                              padding: "6px 14px", borderRadius: "10px", border: "none",
                              background: "linear-gradient(135deg, #dc2626, #b91c1c)",
                              color: "#fff", fontSize: "12px", fontWeight: 700, cursor: "pointer",
                            }}
                          >
                            <Square style={{ width: 16, height: 16 }} /> Parar
                          </button>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#dc2626", animation: "pulse 1s infinite" }} />
                            <span style={{ fontSize: "13px", fontWeight: 700, color: "#dc2626" }}>
                              {recordingSeconds}s / 30s
                            </span>
                          </div>
                        </>
                      ) : obs.audioUrl ? (
                        /* Has recorded audio */
                        <>
                          <button
                            onClick={() => playingAudioId === obs.id ? stopAudio() : playAudio(obs.id, obs.audioUrl!)}
                            style={{
                              display: "flex", alignItems: "center", gap: "6px",
                              padding: "6px 14px", borderRadius: "10px", border: "none",
                              background: playingAudioId === obs.id
                                ? "linear-gradient(135deg, #f59e0b, #d97706)"
                                : "linear-gradient(135deg, #2563eb, #1d4ed8)",
                              color: "#fff", fontSize: "12px", fontWeight: 700, cursor: "pointer",
                            }}
                          >
                            {playingAudioId === obs.id ? (
                              <><Pause style={{ width: 16, height: 16 }} /> Pausar</>
                            ) : (
                              <><Play style={{ width: 16, height: 16 }} /> Ouvir</>
                            )}
                          </button>
                          <span style={{ fontSize: "12px", color: "#6b7280" }}>
                            🎤 {obs.audioDuration}s
                          </span>
                          <button
                            onClick={() => startRecording(obs.id)}
                            style={{
                              display: "flex", alignItems: "center", gap: "4px",
                              padding: "4px 10px", borderRadius: "8px", border: "1px solid #e5e7eb",
                              background: "var(--color-card, #fff)", color: "#6b7280", fontSize: "12px", cursor: "pointer",
                            }}
                          >
                            <Mic style={{ width: 10, height: 10 }} /> Regravar
                          </button>
                        </>
                      ) : (
                        /* No audio yet */
                        <button
                          onClick={() => startRecording(obs.id)}
                          style={{
                            display: "flex", alignItems: "center", gap: "6px",
                            padding: "6px 14px", borderRadius: "10px", border: "none",
                            background: "linear-gradient(135deg, #22c55e, #16a34a)",
                            color: "#fff", fontSize: "12px", fontWeight: 700, cursor: "pointer",
                          }}
                        >
                          <Mic style={{ width: 16, height: 16 }} /> Gravar Áudio (30s)
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Add observation button */}
              <button
                onClick={addObservacao}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                  width: "100%", padding: "10px", marginTop: "8px", borderRadius: "12px",
                  border: "2px dashed #c7d2fe", background: "#eef2ff",
                  color: "#4f46e5", fontSize: "13px", fontWeight: 700, cursor: "pointer",
                }}
              >
                <Plus style={{ width: 18, height: 18 }} /> Adicionar Observação
              </button>
            </div>
          </div>
        ) : (
          /* ═══ HISTORY TAB ═══ */
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {registros.length === 0 ? (
              <div style={{ textAlign: "center", padding: "48px 24px" }}>
                <Clock style={{ width: 48, height: 48, color: "#d1d5db", margin: "0 auto 12px" }} />
                <p style={{ fontWeight: 700, color: "#6b7280", fontSize: "15px" }}>Nenhum registro de ronda</p>
                <p style={{ fontSize: "13px", color: "#9ca3af", marginTop: "4px" }}>
                  Seus registros aparecerão aqui depois de escanear os QR Codes
                </p>
              </div>
            ) : (
              registros.slice(0, 50).map((r) => {
                const isToday = r.created_at.startsWith(new Date().toISOString().slice(0, 10));
                return (
                  <div
                    key={r.id}
                    style={{
                      padding: "12px 16px",
                      borderRadius: "14px",
                      border: isToday ? "1px solid #86efac" : "1px solid #e5e7eb",
                      background: isToday ? "#f0fdf4" : "#fff",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <CheckCircle2 style={{ width: 22, height: 22, color: "#16a34a", flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontWeight: 600, fontSize: "14px", color: "var(--card-foreground)" }}>{r.checkpoint_nome}</p>
                        {r.localizacao && (
                          <p style={{ fontSize: "12px", color: "#94a3b8" }}>📍 {r.localizacao}</p>
                        )}
                        {r.observacao && (() => {
                          // Try to parse as JSON array of observations
                          try {
                            const items = JSON.parse(r.observacao);
                            if (Array.isArray(items)) {
                              return (
                                <div style={{ marginTop: "4px" }}>
                                  {items.map((item: any, i: number) => (
                                    <div key={i} style={{ fontSize: "12px", color: "#6b7280", marginTop: "2px" }}>
                                      {item.texto && <p style={{ fontStyle: "italic" }}>💬 {item.texto}</p>}
                                      {item.audio && (
                                        <div style={{ marginTop: "2px" }}>
                                          <audio controls src={item.audio} style={{ height: "28px", maxWidth: "200px" }} />
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              );
                            }
                          } catch {}
                          // Fallback: plain text
                          return (
                            <p style={{ fontSize: "12px", color: "#6b7280", marginTop: "2px", fontStyle: "italic" }}>
                              💬 {r.observacao}
                            </p>
                          );
                        })()}
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <p style={{ fontSize: "13px", fontWeight: 700, color: "#374151" }}>
                          {new Date(r.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                        <p style={{ fontSize: "12px", color: "#94a3b8" }}>
                          {new Date(r.created_at).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </main>

      {/* Report Modal */}
      <ReportModal
        show={showReport}
        onClose={() => setShowReport(false)}
        onGenerate={handleGenerateReport}
        title="Gerar Relatório de Rondas"
      />

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.6; transform: scale(0.97); }
          50% { opacity: 1; transform: scale(1.03); }
        }
      `}</style>
    </div>
  );
}
