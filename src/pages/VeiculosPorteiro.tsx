import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import TutorialButton, { FlowPortaria, FlowMorador, TSection, TStep, TBullet } from "@/components/TutorialButton";
import {
  ArrowLeft,
  Car,
  CheckCircle2,
  Clock,
  Phone,
  Search,
  LogIn,
  LogOut as LogOutIcon,
  Shield,
  MessageCircle,
  XCircle,
  Plus,
  X,
  Send,
  Hourglass,
  Ban,
  Copy,
  ExternalLink,
  Loader2,
  FileText,
  Download,
  Settings,
  KeyRound,
} from "lucide-react";
import PlateReader from "@/components/PlateReader";
import CameraPlateReader from "@/components/CameraPlateReader";
import SearchableSelect from "@/components/SearchableSelect";
import ReportModal from "@/components/ReportModal";
import { gerarPdfVeiculo, gerarRelatorioVeiculos, gerarRelatorioVeiculosComGraficos } from "@/lib/pdfUtils";
import { APP_ORIGIN } from "@/lib/config";
import { apiFetch } from "@/lib/api";
import { getConfigBoolean } from "@/lib/featureFlags";
import { useTheme } from "@/hooks/useTheme";
import ComoFunciona from "@/components/ComoFunciona";
import { ShieldCheck } from "lucide-react";

const API = "/api/vehicle-authorizations";
const API_BASE = "/api";

interface Block {
  id: number;
  name: string;
}

interface Morador {
  id: number;
  name: string;
  unit: string;
  phone: string | null;
}

interface VehicleAuth {
  id: number;
  morador_name: string;
  morador_phone: string | null;
  bloco: string | null;
  apartamento: string | null;
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
  entrada_confirmada_por: string | null;
  saida_solicitada_at: string | null;
  saida_autorizada: number;
  saida_autorizada_at: string | null;
  cadastrado_por_porteiro: number;
  token: string | null;
  created_at: string;
}

export default function VeiculosPorteiro() {
  const { isDark, p } = useTheme();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [vehicles, setVehicles] = useState<VehicleAuth[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"ativa" | "pendente_aprovacao" | "utilizada" | "todas">("ativa");
  const [searchTerm, setSearchTerm] = useState("");
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  // Registration form state
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [moradores, setMoradores] = useState<Morador[]>([]);
  const [selectedMoradorId, setSelectedMoradorId] = useState("");
  const [placa, setPlaca] = useState("");
  const [modelo, setModelo] = useState("");
  const [cor, setCor] = useState("");
  const [motorista, setMotorista] = useState("");
  const [bloco, setBloco] = useState("");
  const [apartamento, setApartamento] = useState("");
  const [observacao, setObservacao] = useState("");
  const [fotoPlaca, setFotoPlaca] = useState<string | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [uniquePlateEnabled, setUniquePlateEnabled] = useState(false);
  const [autoCancelTime, setAutoCancelTime] = useState("");
  const [limitPerAptEnabled, setLimitPerAptEnabled] = useState(false);
  const [limitPerAptCount, setLimitPerAptCount] = useState(3);
  const [cancellingDay, setCancellingDay] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [reqModelo, setReqModelo] = useState(false);
  const [reqCor, setReqCor] = useState(false);
  const [reqMotorista, setReqMotorista] = useState(false);
  const [reqObservacao, setReqObservacao] = useState(false);

  // Plate auto-search state
  const [searchingPlate, setSearchingPlate] = useState(false);
  const [plateFound, setPlateFound] = useState<{
    placa: string; modelo: string | null; cor: string | null;
    motorista_nome: string | null; bloco: string | null;
    apartamento: string | null; morador_id: number | null;
    morador_name: string | null;
  } | null>(null);
  const [plateNotFound, setPlateNotFound] = useState(false);

  // WhatsApp modal state
  const [whatsappModal, setWhatsappModal] = useState<{
    show: boolean;
    waUrl: string;
    approvalUrl: string;
    moradorName: string;
    moradorPhone: string;
    placaRegistrada: string;
  } | null>(null);

  const fetchVehicles = async () => {
    try {
      const url = filter !== "todas" ? `${API}?status=${filter}` : API;
      const res = await fetch(url, {  });
      if (res.ok) setVehicles(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchVehicles();
  }, [filter]);

  // Fetch vehicle config
  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch("/api/condominio-config");
        if (res.ok) {
          const cfg = await res.json();
          setUniquePlateEnabled(getConfigBoolean(cfg, "vehicle_unique_access", false));
          setAutoCancelTime(cfg.vehicle_auto_cancel_time || "");
          setLimitPerAptEnabled(getConfigBoolean(cfg, "vehicle_limit_per_apt", false));
          if (cfg.vehicle_limit_per_apt_count) setLimitPerAptCount(Number.parseInt(cfg.vehicle_limit_per_apt_count) || 3);
          setReqModelo(getConfigBoolean(cfg, "vehicle_require_modelo", false));
          setReqCor(getConfigBoolean(cfg, "vehicle_require_cor", false));
          setReqMotorista(getConfigBoolean(cfg, "vehicle_require_motorista", false));
          setReqObservacao(getConfigBoolean(cfg, "vehicle_require_observacao", false));
        }
      } catch {}
    })();
  }, []);

  const toggleUniquePlate = async () => {
    const newVal = !uniquePlateEnabled;
    setSavingConfig(true);
    try {
      const res = await apiFetch("/api/condominio-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vehicle_unique_access: newVal ? "true" : "false" }),
      });
      if (res.ok) setUniquePlateEnabled(newVal);
    } catch {}
    setSavingConfig(false);
  };

  const saveAutoCancelTime = async (time: string) => {
    setAutoCancelTime(time);
    setSavingConfig(true);
    try {
      await apiFetch("/api/condominio-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vehicle_auto_cancel_time: time }),
      });
    } catch {}
    setSavingConfig(false);
  };

  const toggleLimitPerApt = async () => {
    const newVal = !limitPerAptEnabled;
    setSavingConfig(true);
    try {
      const res = await apiFetch("/api/condominio-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vehicle_limit_per_apt: newVal ? "true" : "false" }),
      });
      if (res.ok) setLimitPerAptEnabled(newVal);
    } catch {}
    setSavingConfig(false);
  };

  const saveLimitPerAptCount = async (count: number) => {
    const val = Math.max(1, Math.min(99, count));
    setLimitPerAptCount(val);
    setSavingConfig(true);
    try {
      await apiFetch("/api/condominio-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vehicle_limit_per_apt_count: String(val) }),
      });
    } catch {}
    setSavingConfig(false);
  };

  const handleCancelarDia = async () => {
    if (!confirm("Tem certeza que deseja encerrar TODAS as libera\u00e7\u00f5es ativas do dia?")) return;
    setCancellingDay(true);
    try {
      const res = await apiFetch(`${API}/cancelar-dia`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        alert(data.message);
        fetchVehicles();
      }
    } catch {}
    setCancellingDay(false);
  };

  // Fetch blocks for the form
  const fetchBlocks = async () => {
    try {
      const res = await apiFetch(`${API_BASE}/blocos`);
      if (res.ok) setBlocks(await res.json());
    } catch {
      setBlocks([{ id: 1, name: "Bloco A" }, { id: 2, name: "Bloco B" }, { id: 3, name: "Bloco C" }]);
    }
  };

  // Fetch moradores for the selected block
  const fetchMoradoresBloco = async (b: string) => {
    if (!b) { setMoradores([]); return; }
    try {
      const res = await apiFetch(`${API_BASE}/visitors/moradores-bloco?bloco=${encodeURIComponent(b)}`, {  });
      if (res.ok) setMoradores(await res.json());
    } catch { setMoradores([]); }
  };

  const handleSelectMorador = (moradorId: string) => {
    setSelectedMoradorId(moradorId);
    if (!moradorId) { setApartamento(""); return; }
    const m = moradores.find((x) => String(x.id) === moradorId);
    if (m) setApartamento(m.unit || "");
  };

  useEffect(() => { fetchBlocks(); }, []);

  // ── Auto-search plate in DB ──
  const searchPlateInDb = useCallback(async (plateValue: string) => {
    const clean = plateValue.toUpperCase().replaceAll(/[^A-Z0-9]/g, "");
    if (clean.length < 3) { setPlateFound(null); setPlateNotFound(false); return; }
    setSearchingPlate(true);
    setPlateNotFound(false);
    try {
      const res = await apiFetch(`${API}/buscar-placa/${encodeURIComponent(clean)}`, {  });
      if (res.ok) {
        const data = await res.json();
        if (data.found) {
          setPlateFound(data);
          // Auto-fill fields
          if (data.modelo) setModelo(data.modelo);
          if (data.cor) setCor(data.cor);
          if (data.motorista_nome) setMotorista(data.motorista_nome);
          if (data.bloco) {
            setBloco(data.bloco);
            await fetchMoradoresBloco(data.bloco);
            if (data.morador_id) {
              setSelectedMoradorId(String(data.morador_id));
            }
            if (data.apartamento) setApartamento(data.apartamento);
          }
        } else {
          setPlateFound(null);
          setPlateNotFound(true);
        }
      }
    } catch { setPlateFound(null); }
    setSearchingPlate(false);
  }, []);

  // Manual plate input (no auto-search)
  const handlePlacaChange = useCallback((value: string) => {
    setPlaca(value.toUpperCase());
    setPlateFound(null);
    setPlateNotFound(false);
  }, []);

  // Explicit search button handler
  const handleBuscarPlaca = useCallback(() => {
    const clean = placa.toUpperCase().replaceAll(/[^A-Z0-9]/g, "");
    if (clean.length >= 3) searchPlateInDb(clean);
  }, [placa, searchPlateInDb]);

  // On plate detected from OCR
  const handlePlateFromReader = useCallback((plate: string, img?: string) => {
    setPlaca(plate);
    if (img) setFotoPlaca(img);
    searchPlateInDb(plate);
  }, [searchPlateInDb]);

  const resetForm = () => {
    setPlaca(""); setModelo(""); setCor(""); setMotorista("");
    setBloco(""); setApartamento(""); setObservacao(""); setFotoPlaca(null);
    setSelectedMoradorId(""); setMoradores([]); setFormError("");
    setPlateFound(null); setSearchingPlate(false); setPlateNotFound(false);
  };

  const toggleRequiredField = async (key: string, current: boolean, setter: (v: boolean) => void) => {
    const newVal = !current;
    setSavingConfig(true);
    try {
      const res = await apiFetch("/api/condominio-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: newVal ? "true" : "false" }),
      });
      if (res.ok) setter(newVal);
    } catch {}
    setSavingConfig(false);
  };

  const handleSubmitCadastro = async () => {
    if (!placa) { setFormError("Placa é obrigatória."); return; }
    if (!bloco || !apartamento) { setFormError("Bloco e apartamento são obrigatórios."); return; }
    if (reqModelo && !modelo.trim()) { setFormError("Modelo é obrigatório."); return; }
    if (reqCor && !cor.trim()) { setFormError("Cor é obrigatória."); return; }
    if (reqMotorista && !motorista.trim()) { setFormError("Nome do Motorista é obrigatório."); return; }
    if (reqObservacao && !observacao.trim()) { setFormError("Observação é obrigatória."); return; }
    setFormError("");
    setSaving(true);

    // Build WhatsApp URL before async call
    const moradorPhone = moradores.find((x) => String(x.id) === selectedMoradorId)?.phone;

    try {
      const res = await apiFetch(`${API}/portaria-cadastro`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ placa, modelo, cor, motorista_nome: motorista, bloco, apartamento, observacao, foto_placa: fotoPlaca }),
      });
      const data = await res.json();
      if (!res.ok) { setFormError(data.error || "Erro ao cadastrar."); setSaving(false); return; }

      // Build WhatsApp URL
      const phone = data.morador_phone || (moradorPhone ? moradorPhone.replaceAll(/\D/g, "") : null);
      const approvalUrl = `${APP_ORIGIN}/veiculo/aprovar/${data.token}`;
      const cleanPhone = phone ? phone.replaceAll(/\D/g, "") : "";
      const fullPhone = cleanPhone && !cleanPhone.startsWith("55") ? `55${cleanPhone}` : cleanPhone;
      const msg =
        `*Solicitacao de Acesso de Veiculo*\n\n` +
        `A portaria esta solicitando autorizacao para o acesso do seguinte veiculo:\n\n` +
        `Placa: *${placa.toUpperCase()}*\n` +
        `${modelo ? `Modelo: ${modelo}\n` : ""}` +
        `${cor ? `Cor: ${cor}\n` : ""}` +
        `${motorista ? `Motorista: ${motorista}\n` : ""}` +
        `\nPor favor, clique no link abaixo para *aprovar* ou *negar* o acesso:\n` +
        `${approvalUrl}`;
      const waUrl = fullPhone
        ? `https://wa.me/${fullPhone}?text=${encodeURIComponent(msg)}`
        : `https://wa.me/?text=${encodeURIComponent(msg)}`;

      // Auto-open WhatsApp
      globalThis.open(waUrl, "_blank");

      resetForm();
      setShowForm(false);
      fetchVehicles();
    } catch (err: any) {
      setFormError("Erro de conexão.");
    } finally {
      setSaving(false);
    }
  };

  const filtered = vehicles.filter((v) => {
    if (!searchTerm) return true;
    const t = searchTerm.toLowerCase();
    return (
      v.placa?.toLowerCase().includes(t) ||
      v.modelo?.toLowerCase().includes(t) ||
      v.motorista_nome?.toLowerCase().includes(t) ||
      v.morador_name?.toLowerCase().includes(t) ||
      v.bloco?.toLowerCase().includes(t) ||
      v.apartamento?.toLowerCase().includes(t)
    );
  });

  const formatDate = (d: string) => {
    if (!d) return "";
    const [y, m, day] = d.split("-");
    return `${day}/${m}/${y}`;
  };

  const formatDateTime = (iso: string) => {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  };

  // ── Confirmar Entrada ──
  const handleConfirmEntry = async (v: VehicleAuth) => {
    setActionLoading(v.id);
    try {
      const res = await apiFetch(`${API}/${v.id}/confirmar-entrada`, {
        method: "POST",
      });
      if (res.ok) fetchVehicles();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  // ── Solicitar Liberação de Saída → WhatsApp ──
  const buildExitWhatsAppUrl = (v: VehicleAuth) => {
    if (!v.morador_phone) return null;
    const phone = v.morador_phone.replaceAll(/\D/g, "");
    const fullPhone = phone.startsWith("55") ? phone : `55${phone}`;
    const msg =
      `*Solicitacao de Saida de Veiculo*\n\n` +
      `Placa: *${v.placa}*\n` +
      `${v.modelo ? `Modelo: ${v.modelo}\n` : ""}` +
      `${v.cor ? `Cor: ${v.cor}\n` : ""}` +
      `${v.motorista_nome ? `Motorista: ${v.motorista_nome}\n` : ""}` +
      `\nO veiculo acima esta solicitando autorizacao para *sair* do condominio.\n` +
      `O veiculo placa *${v.placa}* esta autorizado a sair?`;
    return `https://wa.me/${fullPhone}?text=${encodeURIComponent(msg)}`;
  };

  const handleRequestExit = async (v: VehicleAuth) => {
    setActionLoading(v.id);

    // Build WhatsApp URL BEFORE async call
    const waUrl = buildExitWhatsAppUrl(v);

    try {
      const res = await apiFetch(`${API}/${v.id}/solicitar-saida`, {
        method: "POST",
      });
      if (res.ok) {
        fetchVehicles();
        if (waUrl) {
          setTimeout(() => {
            globalThis.window.location.href = waUrl;
          }, 300);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  // ── Autorizar Saída (morador pode clicar aqui também) ──
  const handleAuthorizeExit = async (v: VehicleAuth) => {
    setActionLoading(v.id);
    try {
      const res = await apiFetch(`${API}/${v.id}/autorizar-saida`, {
        method: "POST",
      });
      if (res.ok) fetchVehicles();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  // ── Registrar Saída (direto) ──
  const handleRegistrarSaida = async (v: VehicleAuth) => {
    setActionLoading(v.id);
    try {
      const res = await apiFetch(`${API}/${v.id}/registrar-saida`, { method: "POST" });
      if (res.ok) fetchVehicles();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const callMorador = (phone: string) => {
    const clean = phone.replaceAll(/\D/g, "");
    globalThis.window.location.href = `tel:${clean}`;
  };

  const isExpired = (v: VehicleAuth) => new Date() > new Date(v.data_fim + "T23:59:59");

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: p.pageBg }}>
      {/* Header */}
      <header
        className="sticky top-0 z-40"
        style={{ background: p.headerBg, padding: "1rem 1.5rem", borderBottom: p.headerBorder, boxShadow: p.headerShadow, color: p.text, paddingTop: "max(0, env(safe-area-inset-top))" }}
      >
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/dashboard")} style={{ width: 40, height: 40, borderRadius: 12, background: p.btnBg, border: p.btnBorder, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: p.text }}>
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3 flex-1">
            <Car className="w-6 h-6" />
            <div>
              <h1 style={{ fontWeight: 700, fontSize: 18 }}>Acesso Veículos</h1>
              <p style={{ color: isDark ? "rgba(255,255,255,0.6)" : "#64748b", fontSize: 12 }}>Gerenciar autorizações de veículos</p>
            </div>
          </div>
          <TutorialButton title="Controle de Veiculos">
            <TSection icon={<span>📋</span>} title="O QUE E ESTA FUNCAO?">
              <p>Gerencia a <strong>entrada e saida de veiculos</strong> no condominio. O porteiro controla quais veiculos estao autorizados, registra movimentacoes e pode usar a <strong>camera LPR</strong> para leitura automatica de placas. Moradores cadastram seus veiculos pelo app e voce aprova ou recusa.</p>
            </TSection>
            <FlowMorador>
              <TStep n={1}>Morador abre o app e vai em <strong>"Meus Veiculos"</strong></TStep>
              <TStep n={2}>Cadastra o veiculo com <strong>placa, modelo, cor e tipo</strong></TStep>
              <TStep n={3}>O veiculo chega na sua tela com status <strong>"Pendente"</strong></TStep>
              <p style={{ marginTop: "8px", fontSize: "13px", color: "#166534" }}>👉 <strong>Sua acao:</strong> Revise os dados (placa, modelo, cor). Se estiver correto, toque em <strong>"Aprovar"</strong>. Se os dados estiverem errados, toque em <strong>"Recusar"</strong> e o morador pode corrigir.</p>
            </FlowMorador>
            <FlowPortaria>
              <TStep n={1}>Veiculo chega no portao do condominio</TStep>
              <TStep n={2}>Voce busca pela <strong>placa</strong> no sistema ou usa a <strong>camera LPR</strong> (aponte e ela le a placa automaticamente)</TStep>
              <TStep n={3}>O sistema mostra se o veiculo e <strong>autorizado</strong> (verde) ou <strong>desconhecido</strong> (vermelho)</TStep>
              <TStep n={4}>Se autorizado, toque em <strong>"Registrar Entrada"</strong> e abra o portao</TStep>
              <TStep n={5}>Na saida do veiculo, toque em <strong>"Registrar Saida"</strong></TStep>
              <p style={{ marginTop: "8px", fontSize: "13px", color: "#2d3354" }}>👉 <strong>O morador ve:</strong> No app, o historico de entradas e saidas do veiculo com data e hora.</p>
            </FlowPortaria>
            <TSection icon={<span>🔍</span>} title="STATUS DOS VEICULOS">
              <TBullet><strong style={{ color: "#d97706" }}>Pendente</strong> — Morador cadastrou, aguardando sua aprovacao</TBullet>
              <TBullet><strong style={{ color: "#16a34a" }}>Aprovado</strong> — Autorizado a entrar no condominio</TBullet>
              <TBullet><strong style={{ color: "#dc2626" }}>Rejeitado</strong> — Voce recusou o cadastro (dados incorretos)</TBullet>
              <TBullet><strong style={{ color: "#2d3354" }}>Dentro</strong> — Veiculo esta atualmente dentro do condominio</TBullet>
            </TSection>
            <TSection icon={<span>🔧</span>} title="FUNCOES DISPONIVEIS">
              <TBullet><strong>Camera LPR (OCR)</strong> — Aponte a camera para a placa e o sistema le automaticamente</TBullet>
              <TBullet><strong>Busca rapida</strong> — Pesquise por placa, morador, bloco ou modelo</TBullet>
              <TBullet><strong>Painel em tempo real</strong> — Veja quais veiculos estao dentro do condominio agora</TBullet>
              <TBullet><strong>Aprovar/Recusar</strong> — Gerencie cadastros pendentes de moradores</TBullet>
              <TBullet><strong>Relatorio PDF</strong> — Gere relatorios de movimentacao por periodo</TBullet>
            </TSection>
            <TSection icon={<span>⭐</span>} title="DICAS IMPORTANTES">
              <TBullet>Veiculos pendentes aparecem com <strong>destaque amarelo</strong> — aprove o mais rapido possivel</TBullet>
              <TBullet>A <strong>camera LPR</strong> agiliza muito o trabalho — nao precisa digitar a placa</TBullet>
              <TBullet>Se um veiculo <strong>desconhecido</strong> tentar entrar, verifique com o morador antes de liberar</TBullet>
              <TBullet>Sempre <strong>registre entrada E saida</strong> — assim o sistema sabe quais veiculos estao dentro</TBullet>
            </TSection>
          </TutorialButton>
        </div>

        {/* Search */}
        <div style={{ marginTop: "12px", position: "relative" }}>
          <Search className="w-4 h-4" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: p.textDim }} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar placa, morador, bloco..."
            style={{
              width: "100%", padding: "10px 12px 10px 36px", borderRadius: "12px",
              border: isDark ? "1px solid rgba(255,255,255,0.2)" : "1px solid #cbd5e1", background: isDark ? "rgba(255,255,255,0.15)" : "#f0f4f8",
              color: p.text, fontSize: "13px", outline: "none", boxSizing: "border-box",
            }}
          />
        </div>

        {/* Filter tabs */}
        <div style={{ display: "flex", gap: "12px", marginTop: "12px", flexWrap: "wrap" }}>
          {([
            { key: "ativa", label: "Ativas" },
            { key: "pendente_aprovacao", label: "Pendentes" },
            { key: "utilizada", label: "Utilizadas" },
            { key: "todas", label: "Todas" },
          ] as const).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              style={{
                padding: "6px 16px", borderRadius: "20px", border: "none",
                background: filter === tab.key
                  ? (isDark ? "#fff" : "#003580")
                  : (isDark ? "rgba(255,255,255,0.15)" : "#e2e8f0"),
                color: filter === tab.key
                  ? (isDark ? "#0284c7" : "#fff")
                  : (isDark ? "rgba(255,255,255,0.8)" : "#475569"),
                fontWeight: 600, fontSize: "12px", cursor: "pointer",
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
          <button
            onClick={() => setShowSettings(true)}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: "10px", borderRadius: "8px", border: "2px solid #64748b",
              background: "#fff", color: "#64748b", cursor: "pointer",
            }}
            title="Configurações - Campos obrigatórios"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* ═══════ SETTINGS MODAL ═══════ */}
      {showSettings && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.5)", zIndex: 9999,
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "20px", overflowY: "auto",
        }}
          onClick={() => setShowSettings(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: isDark ? "#1e293b" : "#fff",
              borderRadius: "16px", padding: "24px", width: "100%", maxWidth: "400px",
              maxHeight: "90vh", overflowY: "auto",
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
              display: "flex", flexDirection: "column", gap: "16px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{
                fontWeight: 700, fontSize: "16px",
                color: isDark ? "#f1f5f9" : "#0c4a6e",
                display: "flex", alignItems: "center", gap: "12px",
              }}>
                <Settings className="w-5 h-5" style={{ color: "#64748b" }} />
                Campos do Cadastro
              </h3>
              <button onClick={() => setShowSettings(false)} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px" }}>
                <X className="w-5 h-5" style={{ color: "#64748b" }} />
              </button>
            </div>

            {/* ── Toggle: Placa única ── */}
            <div style={{
              display: "flex", alignItems: "center", gap: "12px",
              padding: "14px 16px", borderRadius: "12px",
              background: uniquePlateEnabled
                ? (isDark ? "rgba(34,197,94,0.12)" : "#f0fdf4")
                : (isDark ? "rgba(255,255,255,0.05)" : "#f8fafc"),
              border: uniquePlateEnabled
                ? "1px solid " + (isDark ? "rgba(34,197,94,0.3)" : "#bbf7d0")
                : "1px solid " + (isDark ? "rgba(255,255,255,0.1)" : "#e2e8f0"),
            }}>
              <ShieldCheck className="w-5 h-5" style={{ color: uniquePlateEnabled ? "#16a34a" : "#94a3b8", flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "13px", fontWeight: 700, color: isDark ? "#f1f5f9" : "#1e293b" }}>
                  Placa única por vez
                </div>
                <div style={{ fontSize: "11px", color: isDark ? "#94a3b8" : "#64748b", marginTop: "2px" }}>
                  Só permitir cadastrar a mesma placa após dar baixa na atual
                </div>
              </div>
              <button
                onClick={toggleUniquePlate}
                disabled={savingConfig}
                style={{
                  width: "48px", height: "26px", borderRadius: "13px", border: "none",
                  background: uniquePlateEnabled ? "#16a34a" : (isDark ? "#475569" : "#cbd5e1"),
                  cursor: savingConfig ? "wait" : "pointer", position: "relative",
                  transition: "background 0.2s", flexShrink: 0,
                }}
              >
                <div style={{
                  width: "22px", height: "22px", borderRadius: "50%",
                  background: "#fff", position: "absolute", top: "2px",
                  left: uniquePlateEnabled ? "24px" : "2px",
                  transition: "left 0.2s",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                }} />
              </button>
            </div>

            {/* ── Auto-cancel time ── */}
            <div style={{
              display: "flex", alignItems: "center", gap: "12px",
              padding: "14px 16px", borderRadius: "12px",
              background: autoCancelTime
                ? (isDark ? "rgba(234,88,12,0.12)" : "#fff7ed")
                : (isDark ? "rgba(255,255,255,0.05)" : "#f8fafc"),
              border: autoCancelTime
                ? "1px solid " + (isDark ? "rgba(234,88,12,0.3)" : "#fed7aa")
                : "1px solid " + (isDark ? "rgba(255,255,255,0.1)" : "#e2e8f0"),
            }}>
              <Clock className="w-5 h-5" style={{ color: autoCancelTime ? "#ea580c" : "#94a3b8", flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "13px", fontWeight: 700, color: isDark ? "#f1f5f9" : "#1e293b" }}>
                  Encerrar liberações do dia
                </div>
                <div style={{ fontSize: "11px", color: isDark ? "#94a3b8" : "#64748b", marginTop: "2px" }}>
                  Cancelar automaticamente após o horário
                </div>
              </div>
              <input
                type="time"
                value={autoCancelTime}
                onChange={(e) => saveAutoCancelTime(e.target.value)}
                style={{
                  padding: "6px 10px", borderRadius: "8px",
                  border: "1px solid " + (isDark ? "#475569" : "#cbd5e1"),
                  background: isDark ? "#0f172a" : "#fff",
                  color: isDark ? "#f1f5f9" : "#1e293b",
                  fontSize: "14px", fontWeight: 600, width: "100px",
                  outline: "none",
                }}
              />
              {autoCancelTime && (
                <button
                  onClick={() => saveAutoCancelTime("")}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: "2px" }}
                  title="Remover horário"
                >
                  <X className="w-4 h-4" style={{ color: "#ef4444" }} />
                </button>
              )}
            </div>

            {/* ── Manual cancel all button ── */}
            <button
              onClick={handleCancelarDia}
              disabled={cancellingDay}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: "12px",
                padding: "12px 16px", borderRadius: "12px",
                background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                border: "none", color: "#fff", fontWeight: 700, fontSize: "13px",
                cursor: cancellingDay ? "wait" : "pointer",
                opacity: cancellingDay ? 0.7 : 1,
              }}
            >
              <Ban className="w-4 h-4" />
              {cancellingDay ? "Encerrando..." : "Encerrar todas liberações do dia agora"}
            </button>

            {/* ── Limit per apartment ── */}
            <div style={{
              display: "flex", alignItems: "center", gap: "12px",
              padding: "14px 16px", borderRadius: "12px",
              background: limitPerAptEnabled
                ? (isDark ? "rgba(59,130,246,0.12)" : "#eff6ff")
                : (isDark ? "rgba(255,255,255,0.05)" : "#f8fafc"),
              border: limitPerAptEnabled
                ? "1px solid " + (isDark ? "rgba(59,130,246,0.3)" : "#bfdbfe")
                : "1px solid " + (isDark ? "rgba(255,255,255,0.1)" : "#e2e8f0"),
            }}>
              <Car className="w-5 h-5" style={{ color: limitPerAptEnabled ? "#2563eb" : "#94a3b8", flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "13px", fontWeight: 700, color: isDark ? "#f1f5f9" : "#1e293b" }}>
                  Limitar veículos por unidade
                </div>
                <div style={{ fontSize: "11px", color: isDark ? "#94a3b8" : "#64748b", marginTop: "2px" }}>
                  Máximo de veículos ativos por apartamento
                </div>
              </div>
              <button
                onClick={toggleLimitPerApt}
                disabled={savingConfig}
                style={{
                  width: "48px", height: "26px", borderRadius: "13px", border: "none",
                  background: limitPerAptEnabled ? "#2563eb" : (isDark ? "#475569" : "#cbd5e1"),
                  cursor: savingConfig ? "wait" : "pointer", position: "relative",
                  transition: "background 0.2s", flexShrink: 0,
                }}
              >
                <div style={{
                  width: "22px", height: "22px", borderRadius: "50%",
                  background: "#fff", position: "absolute", top: "2px",
                  left: limitPerAptEnabled ? "24px" : "2px",
                  transition: "left 0.2s",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                }} />
              </button>
            </div>
            {limitPerAptEnabled && (
              <div style={{
                display: "flex", alignItems: "center", gap: "10px",
                padding: "10px 16px", borderRadius: "10px",
                background: isDark ? "rgba(59,130,246,0.08)" : "#f0f7ff",
                border: "1px solid " + (isDark ? "rgba(59,130,246,0.2)" : "#dbeafe"),
              }}>
                <span style={{ fontSize: "13px", fontWeight: 600, color: isDark ? "#93c5fd" : "#1e40af", flex: 1 }}>
                  Quantidade máxima
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <button
                    onClick={() => saveLimitPerAptCount(limitPerAptCount - 1)}
                    disabled={savingConfig || limitPerAptCount <= 1}
                    style={{
                      width: "30px", height: "30px", borderRadius: "8px",
                      border: "1px solid " + (isDark ? "#475569" : "#cbd5e1"),
                      background: isDark ? "#1e293b" : "#fff",
                      color: isDark ? "#f1f5f9" : "#1e293b",
                      fontSize: "16px", fontWeight: 700, cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      opacity: limitPerAptCount <= 1 ? 0.4 : 1,
                    }}
                  >
                    −
                  </button>
                  <span style={{
                    minWidth: "36px", textAlign: "center",
                    fontSize: "18px", fontWeight: 800,
                    color: isDark ? "#60a5fa" : "#2563eb",
                  }}>
                    {limitPerAptCount}
                  </span>
                  <button
                    onClick={() => saveLimitPerAptCount(limitPerAptCount + 1)}
                    disabled={savingConfig || limitPerAptCount >= 99}
                    style={{
                      width: "30px", height: "30px", borderRadius: "8px",
                      border: "1px solid " + (isDark ? "#475569" : "#cbd5e1"),
                      background: isDark ? "#1e293b" : "#fff",
                      color: isDark ? "#f1f5f9" : "#1e293b",
                      fontSize: "16px", fontWeight: 700, cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      opacity: limitPerAptCount >= 99 ? 0.4 : 1,
                    }}
                  >
                    +
                  </button>
                </div>
              </div>
            )}

            <div style={{ width: "100%", height: "1px", background: isDark ? "rgba(255,255,255,0.1)" : "#e2e8f0" }} />

            <p style={{ fontSize: "13px", color: isDark ? "#94a3b8" : "#64748b", margin: 0 }}>
              Campos marcados com <KeyRound className="w-3.5 h-3.5" style={{ display: "inline", verticalAlign: "middle", color: "#d97706" }} /> são <strong>obrigatórios</strong>. Toque nos campos opcionais para torná-los obrigatórios.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {[
                { name: "Placa", required: true, fixed: true },
                { name: "Modelo", required: reqModelo, fixed: false, key: "vehicle_require_modelo", setter: setReqModelo, state: reqModelo },
                { name: "Cor", required: reqCor, fixed: false, key: "vehicle_require_cor", setter: setReqCor, state: reqCor },
                { name: "Nome do Motorista", required: reqMotorista, fixed: false, key: "vehicle_require_motorista", setter: setReqMotorista, state: reqMotorista },
                { name: "Bloco", required: true, fixed: true },
                { name: "Apartamento", required: true, fixed: true },
                { name: "Observação", required: reqObservacao, fixed: false, key: "vehicle_require_observacao", setter: setReqObservacao, state: reqObservacao },
              ].map((field) => (
                <div
                  key={field.name}
                  onClick={() => !field.fixed && field.key && toggleRequiredField(field.key, field.state!, field.setter!)}
                  style={{
                    display: "flex", alignItems: "center", gap: "10px",
                    padding: "10px 14px", borderRadius: "10px",
                    cursor: field.fixed ? "default" : "pointer",
                    background: field.required
                      ? (isDark ? "rgba(217,119,6,0.15)" : "#fffbeb")
                      : (isDark ? "rgba(255,255,255,0.05)" : "#f8fafc"),
                    border: field.required
                      ? "1px solid " + (isDark ? "rgba(217,119,6,0.3)" : "#fde68a")
                      : "1px solid " + (isDark ? "rgba(255,255,255,0.1)" : "#e2e8f0"),
                    transition: "all 0.2s",
                  }}
                >
                  {field.required ? (
                    <KeyRound className="w-4 h-4" style={{ color: "#d97706", flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: "16px", height: "16px", borderRadius: "4px", flexShrink: 0, border: "2px solid " + (isDark ? "#475569" : "#cbd5e1") }} />
                  )}
                  <span style={{
                    fontSize: "14px", fontWeight: field.required ? 700 : 500,
                    color: field.required
                      ? (isDark ? "#fbbf24" : "#92400e")
                      : (isDark ? "#cbd5e1" : "#475569"),
                  }}>
                    {field.name}
                  </span>
                  {field.fixed && field.required ? (
                    <span style={{
                      marginLeft: "auto", fontSize: "11px", fontWeight: 700,
                      color: "#d97706", background: isDark ? "rgba(217,119,6,0.2)" : "#fef3c7",
                      padding: "2px 8px", borderRadius: "6px",
                    }}>
                      Sempre obrigatório
                    </span>
                  ) : field.required ? (
                    <span style={{
                      marginLeft: "auto", fontSize: "11px", fontWeight: 700,
                      color: "#d97706", background: isDark ? "rgba(217,119,6,0.2)" : "#fef3c7",
                      padding: "2px 8px", borderRadius: "6px",
                    }}>
                      Obrigatório ✓
                    </span>
                  ) : (
                    <span style={{
                      marginLeft: "auto", fontSize: "11px", fontWeight: 500,
                      color: isDark ? "#64748b" : "#94a3b8",
                    }}>
                      Opcional
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <ReportModal
        show={showReport}
        onClose={() => setShowReport(false)}
        onGenerate={(dateFrom, dateTo, withCharts) => {
          const from = new Date(dateFrom + "T00:00:00");
          const to = new Date(dateTo + "T23:59:59");
          const filteredByDate = vehicles.filter((v) => {
            const d = new Date(v.created_at);
            return d >= from && d <= to;
          });
          if (withCharts) {
            gerarRelatorioVeiculosComGraficos(filteredByDate, dateFrom, dateTo, user?.condominio_nome);
          } else {
            gerarRelatorioVeiculos(filteredByDate, dateFrom, dateTo, user?.condominio_nome);
          }
        }}
        title="Gerar relatorio de Veiculos por periodo"
      />

      <main style={{ flex: 1, display: "flex", flexDirection: "column", gap: "16px", padding: "20px", paddingBottom: "120px" }}>

        <ComoFunciona steps={[
          "🚗 Portaria registra veículo com placa, modelo e foto",
          "📱 Morador recebe notificação para autorizar",
          "✅ Portaria libera acesso ao estacionamento",
          "📋 Histórico completo de veículos no sistema",
        ]} />

        {/* Cadastrar Veículo Button */}
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
            padding: "14px", borderRadius: "14px",
            background: "linear-gradient(135deg, #0062d1 0%, #003d99 50%, #001d4a 100%)",
            border: isDark ? "2px solid rgba(255,255,255,0.5)" : "2px solid #cbd5e1", color: "#fff", fontWeight: 700, fontSize: "15px", cursor: "pointer",
            width: "100%", boxShadow: "0 4px 12px rgba(14,165,233,0.3)",
          }}
        >
          <Plus className="w-5 h-5" />
          Cadastrar Veículo
        </button>

        {/* ═══════ REGISTRATION FORM ═══════ */}
        {showForm && (
          <div style={{
            background: "var(--color-card, #fff)", borderRadius: "16px", padding: "20px",
            border: "2px solid #0ea5e920", display: "flex", flexDirection: "column", gap: "14px",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontWeight: 700, fontSize: "16px", color: "#0c4a6e", display: "flex", alignItems: "center", gap: "12px" }}>
                <Car className="w-5 h-5" style={{ color: "#0ea5e9" }} />
                Cadastrar Veículo
              </h3>
              <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px" }}>
                <X className="w-5 h-5" style={{ color: "#64748b" }} />
              </button>
            </div>

            {formError && (
              <div style={{
                padding: "10px 14px", borderRadius: "10px", background: "#fef2f2",
                border: "1px solid #fecaca", color: "#b91c1c", fontSize: "13px", fontWeight: 500,
              }}>
                {formError}
              </div>
            )}

            {/* Placa + Buscar */}
            <div>
              <span style={{ fontWeight: 600, fontSize: "13px", color: "#1e293b", marginBottom: "6px", display: "block" }}>Placa *</span>
              <div style={{ display: "flex", gap: "12px", alignItems: "stretch" }}>
                <input type="text" value={placa} onChange={(e) => handlePlacaChange(e.target.value)} placeholder="ABC1D23"
                  maxLength={7}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleBuscarPlaca(); } }}
                  style={{
                    flex: 1, padding: "14px", borderRadius: "12px", border: "2px solid #0ea5e9",
                    fontSize: "22px", background: "#f0f9ff", color: "#0c4a6e", outline: "none",
                    boxSizing: "border-box", fontWeight: 800, letterSpacing: "4px", textAlign: "center",
                    fontFamily: "monospace", textTransform: "uppercase",
                  }} />
                <button
                  type="button"
                  onClick={handleBuscarPlaca}
                  disabled={searchingPlate || placa.replaceAll(/[^A-Za-z0-9]/g, "").length < 3}
                  style={{
                    padding: "0 20px", borderRadius: "12px", border: "none",
                    background: searchingPlate ? "#94a3b8" : "#003580",
                    color: "#fff", fontWeight: 700, fontSize: "14px", cursor: searchingPlate ? "wait" : "pointer",
                    display: "flex", alignItems: "center", gap: "6px", whiteSpace: "nowrap",
                    boxShadow: "0 2px 8px rgba(14,165,233,0.3)",
                    opacity: placa.replaceAll(/[^A-Za-z0-9]/g, "").length < 3 ? 0.5 : 1,
                    transition: "opacity 0.2s",
                  }}
                >
                  {searchingPlate ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                  Buscar
                </button>
              </div>
              <div style={{ marginTop: "8px" }}>
                <PlateReader onPlateDetected={handlePlateFromReader} />
              </div>
              <div style={{ marginTop: "8px" }}>
                <CameraPlateReader onPlateDetected={handlePlateFromReader} />
              </div>
              {fotoPlaca && (
                <div style={{ marginTop: "8px", position: "relative" }}>
                  <img src={fotoPlaca} alt="Foto da placa" style={{
                    width: "100%", borderRadius: "10px", border: "2px solid #22c55e",
                  }} />
                  <div style={{
                    position: "absolute", top: "6px", right: "6px", display: "flex", alignItems: "center", gap: "4px",
                    padding: "4px 10px", borderRadius: "8px", background: "rgba(34,197,94,0.9)",
                    color: "#fff", fontSize: "11px", fontWeight: 600,
                  }}>
                    ✅ Foto anexada
                  </div>
                </div>
              )}
            </div>

            {/* Searching indicator */}
            {searchingPlate && (
              <div style={{
                padding: "10px 14px", borderRadius: "10px", background: "#f0f9ff",
                border: "1px solid #bae6fd", color: "#0369a1", fontSize: "13px", fontWeight: 500,
                display: "flex", alignItems: "center", gap: "12px",
              }}>
                <Loader2 className="w-4 h-4 animate-spin" style={{ color: "#0ea5e9" }} />
                Buscando veículo no sistema...
              </div>
            )}

            {/* Vehicle NOT found */}
            {plateNotFound && !searchingPlate && !plateFound && (
              <div style={{
                padding: "10px 14px", borderRadius: "10px", background: "#fffbeb",
                border: "1px solid #fde68a", color: "#92400e", fontSize: "13px", fontWeight: 500,
                display: "flex", alignItems: "center", gap: "12px",
              }}>
                <Car className="w-4 h-4" style={{ color: "#d97706" }} />
                Veículo não encontrado. Preencha os dados manualmente.
              </div>
            )}

            {/* Vehicle found banner */}
            {plateFound && !searchingPlate && (
              <div style={{
                padding: "12px 16px", borderRadius: "12px",
                background: "linear-gradient(135deg, #ecfdf5, #f0fdf4)",
                border: "1px solid #86efac", display: "flex", flexDirection: "column", gap: "6px",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <CheckCircle2 className="w-4 h-4" style={{ color: "#16a34a" }} />
                  <span style={{ fontWeight: 700, fontSize: "13px", color: "#15803d" }}>
                    Veículo encontrado no sistema!
                  </span>
                </div>
                <p style={{ fontSize: "12px", color: "#166534", margin: 0, lineHeight: "1.5" }}>
                  Dados preenchidos automaticamente. Confira e clique em <strong>Enviar</strong>.
                  {plateFound.morador_name && (
                    <span> — Último morador: <strong>{plateFound.morador_name}</strong>
                      {plateFound.bloco && plateFound.apartamento && ` (${plateFound.bloco} - ${plateFound.apartamento})`}
                    </span>
                  )}
                </p>
              </div>
            )}

            {/* Modelo + Cor */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <span style={{ fontWeight: 600, fontSize: "13px", color: "#1e293b", marginBottom: "6px", display: "block" }}>Modelo{reqModelo ? " *" : ""}</span>
                <input type="text" value={modelo} onChange={(e) => setModelo(e.target.value)} placeholder="Ex: Civic, Onix..."
                  style={{ width: "100%", padding: "12px 14px", borderRadius: "12px", border: "1px solid #cbd5e1", fontSize: "14px", background: "#fff", color: "#0f172a", outline: "none", boxSizing: "border-box" }} />
              </div>
              <div>
                <span style={{ fontWeight: 600, fontSize: "13px", color: "#1e293b", marginBottom: "6px", display: "block" }}>Cor{reqCor ? " *" : ""}</span>
                <input type="text" value={cor} onChange={(e) => setCor(e.target.value)} placeholder="Ex: Preto, Branco..."
                  style={{ width: "100%", padding: "12px 14px", borderRadius: "12px", border: "1px solid #cbd5e1", fontSize: "14px", background: "#fff", color: "#0f172a", outline: "none", boxSizing: "border-box" }} />
              </div>
            </div>

            {/* Motorista */}
            <div>
              <span style={{ fontWeight: 600, fontSize: "13px", color: "#1e293b", marginBottom: "6px", display: "block" }}>Nome do Motorista{reqMotorista ? " *" : ""}</span>
              <input type="text" value={motorista} onChange={(e) => setMotorista(e.target.value)} placeholder="Nome completo do motorista"
                style={{ width: "100%", padding: "12px 14px", borderRadius: "12px", border: "1px solid #cbd5e1", fontSize: "14px", background: "#fff", color: "#0f172a", outline: "none", boxSizing: "border-box" }} />
            </div>

            {/* Bloco */}
            <div>
              <span style={{ fontWeight: 600, fontSize: "13px", color: "#1e293b", marginBottom: "6px", display: "block" }}>Bloco *</span>
              <select
                value={bloco}
                onChange={(e) => {
                  setBloco(e.target.value);
                  setApartamento("");
                  setSelectedMoradorId("");
                  fetchMoradoresBloco(e.target.value);
                }}
                style={{ width: "100%", padding: "12px 14px", borderRadius: "12px", border: "1px solid #cbd5e1", fontSize: "14px", background: "#fff", color: "#0f172a", outline: "none", boxSizing: "border-box", cursor: "pointer" }}
              >
                <option value="">Selecione o bloco</option>
                {blocks.map((b) => (
                  <option key={b.id} value={b.name}>{b.name}</option>
                ))}
              </select>
            </div>

            {/* Morador (dropdown com busca) */}
            {bloco && moradores.length > 0 && (
              <div>
                <span style={{ fontWeight: 600, fontSize: "13px", color: "#1e293b", marginBottom: "6px", display: "block" }}>Morador</span>
                <SearchableSelect
                  value={selectedMoradorId}
                  onChange={(val) => handleSelectMorador(val)}
                  placeholder="Selecione o morador"
                  searchPlaceholder="Buscar por nome ou apartamento..."
                  options={moradores.map((m) => ({
                    value: String(m.id),
                    label: `${m.name} — Apto ${m.unit}`,
                    searchText: `${m.name} ${m.unit}`.toLowerCase(),
                  }))}
                />
              </div>
            )}

            {/* Apartamento — só aparece se NÃO selecionou morador (fallback manual) */}
            {!selectedMoradorId && (
              <div>
                <span style={{ fontWeight: 600, fontSize: "13px", color: "#1e293b", marginBottom: "6px", display: "block" }}>Apartamento *</span>
                <input type="text" value={apartamento} onChange={(e) => setApartamento(e.target.value)} placeholder="Ex: 101"
                  style={{ width: "100%", padding: "12px 14px", borderRadius: "12px", border: "1px solid #cbd5e1", fontSize: "14px", background: "#fff", color: "#0f172a", outline: "none", boxSizing: "border-box" }} />
              </div>
            )}

            {/* Observação */}
            <div>
              <span style={{ fontWeight: 600, fontSize: "13px", color: "#1e293b", marginBottom: "6px", display: "block" }}>Observação{reqObservacao ? " *" : " (portaria)"}</span>
              <textarea value={observacao} onChange={(e) => setObservacao(e.target.value)} placeholder="Informações adicionais..."
                rows={3}
                style={{ width: "100%", padding: "12px 14px", borderRadius: "12px", border: "1px solid #cbd5e1", fontSize: "14px", background: "#fff", color: "#0f172a", outline: "none", boxSizing: "border-box", resize: "vertical" }} />
            </div>

            {/* Submit */}
            <button
              onClick={handleSubmitCadastro}
              disabled={saving}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
                padding: "14px", borderRadius: "14px",
                background: "linear-gradient(135deg, #0062d1 0%, #003d99 50%, #001d4a 100%)",
                border: "none", color: "#fff", fontWeight: 700, fontSize: "15px",
                cursor: saving ? "not-allowed" : "pointer", width: "100%",
                opacity: saving ? 0.7 : 1,
              }}
            >
              <Send className="w-5 h-5" />
              {saving ? "Cadastrando..." : "Cadastrar e Notificar Morador"}
            </button>
          </div>
        )}

        {loading && (
          <div style={{ display: "flex", justifyContent: "center", padding: "48px" }}>
            <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "48px 24px", gap: "16px", textAlign: "center" }}>
            <Car className="w-16 h-16" style={{ color: "#cbd5e1" }} />
            <p style={{ fontSize: "15px", color: "#64748b", fontWeight: 500 }}>
              Nenhuma autorização {filter === "ativa" ? "ativa" : filter === "utilizada" ? "utilizada" : ""}.
            </p>
          </div>
        )}

        {/* Vehicle cards */}
        {filtered.map((v) => {
          const active = v.status === "ativa" && !isExpired(v);
          const pendente = v.status === "pendente_aprovacao";
          const negada = v.status === "negada";
          const entrou = !!v.entrada_confirmada_at;
          const saidaSolicitada = !!v.saida_solicitada_at;
          const saidaAutorizada = v.saida_autorizada === 1;
          const needsExitAuth = v.requer_autorizacao_saida === 1;
          const isLoading = actionLoading === v.id;

          return (
            <div
              key={v.id}
              style={{
                background: "var(--color-card, #fff)", borderRadius: "16px", padding: "16px",
                border: pendente ? "2px solid #f59e0b40" : negada ? "2px solid #ef444440" : active ? "2px solid #0ea5e920" : "1px solid #e2e8f0",
                display: "flex", flexDirection: "column", gap: "14px",
                opacity: active || pendente ? 1 : negada ? 0.6 : 0.7,
              }}
            >

              {/* ── Top: Placa em destaque + info ── */}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                  <div style={{
                    padding: "10px 16px", borderRadius: "12px",
                    background: "#f0f9ff", border: "2px solid #0ea5e9",
                    fontWeight: 800, fontSize: "20px", color: "#0c4a6e",
                    letterSpacing: "3px", fontFamily: "monospace",
                  }}>
                    {v.placa}
                  </div>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: "14px", color: "#0f172a" }}>
                      {v.modelo || "Veículo"} {v.cor ? `· ${v.cor}` : ""}
                    </p>
                    {v.motorista_nome && (
                      <p style={{ fontSize: "12px", color: "#64748b" }}>🧑 {v.motorista_nome}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Morador info ── */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <p style={{ fontWeight: 600, fontSize: "13px", color: "#1e293b" }}>{v.morador_name}</p>
                  <p style={{ fontSize: "12px", color: "#64748b" }}>
                    {v.bloco && `Bloco ${v.bloco}`} {v.apartamento && `· Apto ${v.apartamento}`}
                  </p>
                </div>
                {v.morador_phone && (
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      onClick={() => callMorador(v.morador_phone!)}
                      style={{
                        display: "flex", alignItems: "center", gap: "6px",
                        padding: "8px 14px", borderRadius: "10px",
                        background: "#dcfce7", border: "none",
                        color: "#15803d", fontWeight: 600, fontSize: "12px", cursor: "pointer",
                      }}
                    >
                      <Phone className="w-3.5 h-3.5" /> Ligar
                    </button>
                    <button
                      onClick={() => {
                        const fullPhone = (v.morador_phone || "").replace(/\D/g, "");
                        const waUrl = fullPhone.startsWith("55")
                          ? `https://wa.me/${fullPhone}`
                          : `https://wa.me/55${fullPhone}`;
                        globalThis.open(waUrl, "_blank");
                      }}
                      style={{
                        display: "flex", alignItems: "center", gap: "6px",
                        padding: "8px 14px", borderRadius: "10px",
                        background: "#25d366", border: "none",
                        color: "#ffffff", fontWeight: 600, fontSize: "12px", cursor: "pointer",
                      }}
                    >
                      <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                    </button>
                  </div>
                )}
              </div>

              {/* ── Dates ── */}
              {!pendente && (
                <div style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "12px", color: "#475569" }}>
                  <Clock className="w-3.5 h-3.5" />
                  {formatDate(v.data_inicio)} até {formatDate(v.data_fim)}
                  {v.hora_inicio && v.hora_fim && ` · ${v.hora_inicio} - ${v.hora_fim}`}
                </div>
              )}

              {/* ── Status badges ── */}
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {pendente && (
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: "4px",
                    padding: "3px 10px", borderRadius: "20px",
                    background: "#fef3c7", color: "#b45309", fontSize: "11px", fontWeight: 600,
                  }}>
                    <Hourglass className="w-3 h-3" /> Aguardando aprovação do morador
                  </span>
                )}
                {negada && (
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: "4px",
                    padding: "3px 10px", borderRadius: "20px",
                    background: "#fecaca", color: "#b91c1c", fontSize: "11px", fontWeight: 600,
                  }}>
                    <Ban className="w-3 h-3" /> Acesso negado pelo morador
                  </span>
                )}
                {active && (
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: "4px",
                    padding: "3px 10px", borderRadius: "20px",
                    background: "#dcfce7", color: "#15803d", fontSize: "11px", fontWeight: 600,
                  }}>
                    <Shield className="w-3 h-3" /> Ativa
                  </span>
                )}
                {entrou && (
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: "4px",
                    padding: "3px 10px", borderRadius: "20px",
                    background: "#e0f2fe", color: "#0369a1", fontSize: "11px", fontWeight: 600,
                  }}>
                    <LogIn className="w-3 h-3" /> Entrada {formatDateTime(v.entrada_confirmada_at!)}
                  </span>
                )}
                {needsExitAuth && !saidaAutorizada && (
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: "4px",
                    padding: "3px 10px", borderRadius: "20px",
                    background: "#fef3c7", color: "#b45309", fontSize: "11px", fontWeight: 600,
                  }}>
                    <LogOutIcon className="w-3 h-3" /> Saída requer autorização
                  </span>
                )}
                {saidaSolicitada && !saidaAutorizada && (
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: "4px",
                    padding: "3px 10px", borderRadius: "20px",
                    background: "#fecaca", color: "#b91c1c", fontSize: "11px", fontWeight: 600,
                  }}>
                    <Clock className="w-3 h-3" /> Saída solicitada — aguardando
                  </span>
                )}
                {saidaAutorizada && (
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: "4px",
                    padding: "3px 10px", borderRadius: "20px",
                    background: "#dcfce7", color: "#15803d", fontSize: "11px", fontWeight: 600,
                  }}>
                    <CheckCircle2 className="w-3 h-3" /> Saída autorizada
                  </span>
                )}
                {isExpired(v) && (
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: "4px",
                    padding: "3px 10px", borderRadius: "20px",
                    background: "#f1f5f9", color: "#64748b", fontSize: "11px", fontWeight: 600,
                  }}>
                    <XCircle className="w-3 h-3" /> Expirada
                  </span>
                )}
              </div>

              {v.observacao && (
                <p style={{ fontSize: "12px", color: "#64748b", fontStyle: "italic" }}>💬 Portaria: {v.observacao}</p>
              )}

              {v.morador_observacao && (
                <p style={{ fontSize: "12px", color: "#0369a1", fontStyle: "italic", background: "#e0f2fe", padding: "8px 12px", borderRadius: "10px" }}>
                  🏠 Morador: {v.morador_observacao}
                </p>
              )}

              {/* ══ Action buttons ══ */}
              {active && (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>

                  {/* CONFIRMAR ENTRADA */}
                  {!entrou && (
                    <button
                      onClick={() => handleConfirmEntry(v)}
                      disabled={isLoading}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "center", gap: "12px",
                        padding: "14px 16px", borderRadius: "12px",
                        background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
                        border: "none", color: "#fff", fontWeight: 700, fontSize: "14px",
                        cursor: "pointer", width: "100%", opacity: isLoading ? 0.7 : 1,
                      }}
                    >
                      <LogIn className="w-4 h-4" />
                      {isLoading ? "Confirmando..." : "Confirmar Entrada"}
                    </button>
                  )}

                  {/* SOLICITAR LIBERAÇÃO DE SAÍDA */}
                  {entrou && needsExitAuth && !saidaAutorizada && !saidaSolicitada && (
                    <button
                      onClick={() => handleRequestExit(v)}
                      disabled={isLoading}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "center", gap: "12px",
                        padding: "14px 16px", borderRadius: "12px",
                        background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                        border: "none", color: "#fff", fontWeight: 700, fontSize: "14px",
                        cursor: "pointer", width: "100%", opacity: isLoading ? 0.7 : 1,
                      }}
                    >
                      <MessageCircle className="w-4 h-4" />
                      {isLoading ? "Enviando..." : "Solicitar Liberação de Saída"}
                    </button>
                  )}

                  {/* SAÍDA JÁ SOLICITADA - REENVIAR */}
                  {entrou && needsExitAuth && saidaSolicitada && !saidaAutorizada && (
                    <div style={{ display: "flex", gap: "12px" }}>
                      <button
                        onClick={() => handleRequestExit(v)}
                        disabled={isLoading}
                        style={{
                          flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "12px",
                          padding: "14px 16px", borderRadius: "12px",
                          background: "#fef3c7", border: "1px solid #fbbf24",
                          color: "#b45309", fontWeight: 600, fontSize: "13px", cursor: "pointer",
                        }}
                      >
                        <MessageCircle className="w-4 h-4" />
                        Reenviar Solicitação
                      </button>
                      <button
                        onClick={() => handleAuthorizeExit(v)}
                        disabled={isLoading}
                        style={{
                          flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "12px",
                          padding: "14px 16px", borderRadius: "12px",
                          background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
                          border: "none", color: "#fff", fontWeight: 600, fontSize: "13px", cursor: "pointer",
                        }}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Liberar Saída
                      </button>
                    </div>
                  )}

                  {/* SAÍDA AUTORIZADA — pode liberar */}
                  {entrou && needsExitAuth && saidaAutorizada && (
                    <div style={{
                      display: "flex", alignItems: "center", justifyContent: "center", gap: "12px",
                      padding: "14px 16px", borderRadius: "12px",
                      background: "#dcfce7", border: "1px solid #86efac",
                      color: "#15803d", fontWeight: 700, fontSize: "14px",
                    }}>
                      <CheckCircle2 className="w-4 h-4" />
                      Saida Liberada — Pode sair
                    </div>
                  )}
                </div>
              )}

              {/* Registrar Saída — red button */}
              {active && entrou && (
                <button
                  onClick={() => handleRegistrarSaida(v)}
                  disabled={isLoading}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center", gap: "12px",
                    width: "100%", padding: "14px 16px", borderRadius: "12px",
                    background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                    border: "none", color: "#fff", fontWeight: 700, fontSize: "14px",
                    cursor: "pointer", opacity: isLoading ? 0.7 : 1,
                  }}
                >
                  <LogOutIcon className="w-4 h-4" />
                  {isLoading ? "Registrando..." : "Registrar Saída"}
                </button>
              )}

              {/* PDF button */}
              <button
                onClick={() => gerarPdfVeiculo(v, user?.condominio_nome)}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                  width: "100%", padding: "8px", borderRadius: "10px", border: "2px solid #002a66",
                  background: "linear-gradient(135deg, #0062d1 0%, #003d99 50%, #001d4a 100%)",
                  color: "#fff", fontSize: "12px", fontWeight: 700, cursor: "pointer",
                  marginTop: "8px",
                }}
              >
                <Download className="w-3 h-3" /> Baixar PDF
              </button>
            </div>
          );
        })}
      </main>

      {/* ═══ WhatsApp Modal ═══ */}
      {whatsappModal?.show && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 60, background: "rgba(0,0,0,0.5)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: "16px",
        }}>
          <div style={{
            background: "#fff", borderRadius: "20px", padding: "24px",
            width: "100%", maxWidth: "400px", boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{
                  width: "40px", height: "40px", borderRadius: "50%", background: "#25d366",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.611.611l4.458-1.495A11.96 11.96 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.316 0-4.469-.756-6.209-2.034l-.356-.28-3.278 1.099 1.099-3.278-.28-.356A9.96 9.96 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
                  </svg>
                </div>
                <div>
                  <h3 style={{ fontWeight: 700, fontSize: "16px", color: "#0f172a" }}>Cadastro Realizado!</h3>
                  <p style={{ fontSize: "12px", color: "#64748b" }}>Envie a notificação via WhatsApp</p>
                </div>
              </div>
              <button onClick={() => setWhatsappModal(null)} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px" }}>
                <X className="w-5 h-5" style={{ color: "#94a3b8" }} />
              </button>
            </div>

            {/* Info card */}
            <div style={{
              background: "#f0fdf4", borderRadius: "12px", padding: "14px",
              border: "1px solid #86efac", marginBottom: "16px",
            }}>
              <p style={{ fontSize: "13px", color: "#15803d", fontWeight: 600 }}>
                <CheckCircle2 className="w-4 h-4" style={{ display: "inline", verticalAlign: "middle", marginRight: "6px" }} />
                Veículo <strong>{whatsappModal.placaRegistrada}</strong> cadastrado com sucesso!
              </p>
              <p style={{ fontSize: "12px", color: "#16a34a", marginTop: "4px" }}>
                Aguardando aprovação de <strong>{whatsappModal.moradorName}</strong>
              </p>
            </div>

            {/* Approval link */}
            <div style={{ marginBottom: "16px" }}>
              <span style={{ fontWeight: 600, fontSize: "12px", color: "#475569", marginBottom: "6px", display: "block" }}>
                Link de aprovação:
              </span>
              <div style={{
                display: "flex", alignItems: "center", gap: "12px",
                padding: "10px 12px", borderRadius: "10px", background: "#f1f5f9",
                border: "1px solid #e2e8f0",
              }}>
                <input
                  readOnly
                  value={whatsappModal.approvalUrl}
                  style={{
                    flex: 1, background: "transparent", border: "none", outline: "none",
                    fontSize: "11px", color: "#475569", fontFamily: "monospace",
                  }}
                />
                <button
                  onClick={() => { navigator.clipboard.writeText(whatsappModal.approvalUrl); }}
                  title="Copiar link"
                  style={{ background: "none", border: "none", cursor: "pointer", padding: "4px" }}
                >
                  <Copy className="w-4 h-4" style={{ color: "#6366f1" }} />
                </button>
              </div>
            </div>

            {/* Buttons */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <button
                onClick={() => { globalThis.open(whatsappModal.waUrl, "_blank"); }}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
                  padding: "14px", borderRadius: "14px", background: "#25d366",
                  border: "none", color: "#fff", fontWeight: 700, fontSize: "15px",
                  cursor: "pointer", width: "100%",
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                  <path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.611.611l4.458-1.495A11.96 11.96 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.316 0-4.469-.756-6.209-2.034l-.356-.28-3.278 1.099 1.099-3.278-.28-.356A9.96 9.96 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
                </svg>
                Enviar via WhatsApp
              </button>
              <button
                onClick={() => setWhatsappModal(null)}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "12px",
                  padding: "14px 16px", borderRadius: "12px",
                  background: "transparent", border: "1px solid #e2e8f0",
                  color: "#64748b", fontWeight: 600, fontSize: "14px",
                  cursor: "pointer", width: "100%",
                }}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
