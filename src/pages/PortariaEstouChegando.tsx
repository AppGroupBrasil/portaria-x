/**
 * ═══════════════════════════════════════════════════════════
 * PORTARIA — Painel Estou Chegando
 * Real-time arrival notifications with interactive map
 * Sound + visual alerts when morador is approaching
 * ═══════════════════════════════════════════════════════════
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";

import { apiFetch, getToken } from "@/lib/api";
import { buildWsUrl } from "@/lib/config";
import { DEFAULT_MAP_CENTER, GOOGLE_MAPS_API_KEY, GOOGLE_MAPS_MAP_ID } from "@/lib/googleMaps";
import TutorialButton, { FlowPortaria, FlowMorador, TSection, TStep, TBullet } from "@/components/TutorialButton";
import {
  ArrowLeft,
  MapPin,
  Navigation,
  Car,
  Check,
  Clock,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
  User,
  Building,
  Loader2,
  History,
  Download,
  FileText,
  BarChart3,
} from "lucide-react";
import { CircleF, GoogleMap, InfoWindowF, LoadScriptNext, MarkerF, PolylineF } from "@react-google-maps/api";
import { useTheme } from "@/hooks/useTheme";
import ComoFunciona from "@/components/ComoFunciona";

interface ArrivalEvent {
  id: number;
  morador_id: number;
  morador_name: string;
  bloco: string | null;
  apartamento: string | null;
  morador_phone: string | null;
  morador_avatar: string | null;
  vehicle_type: string;
  vehicle_plate: string | null;
  vehicle_model: string | null;
  vehicle_color: string | null;
  driver_name: string | null;
  latitude: number;
  longitude: number;
  distance_meters: number;
  radius_meters: number;
  status: string;
  created_at: string;
  confirmed_at?: string | null;
  cancelled_at?: string | null;
  arrived_at?: string | null;
  vehicles?: { placa: string; modelo: string; cor: string }[];
}

function sortArrivalEvents(items: ArrivalEvent[]): ArrivalEvent[] {
  const statusOrder: Record<string, number> = {
    approaching: 0,
    tracking: 1,
    confirmed: 2,
    arrived: 3,
    cancelled: 4,
  };

  return [...items].sort((left, right) => {
    const orderDiff = (statusOrder[left.status] ?? 99) - (statusOrder[right.status] ?? 99);
    if (orderDiff !== 0) return orderDiff;
    return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
  });
}

function getEventStatusMeta(status: string) {
  switch (status) {
    case "approaching":
      return { label: "No raio", tone: "#059669", background: "rgba(16,185,129,0.12)" };
    case "tracking":
      return { label: "Acompanhando", tone: "#2563eb", background: "rgba(37,99,235,0.12)" };
    case "confirmed":
      return { label: "Confirmado", tone: "#7c3aed", background: "rgba(124,58,237,0.12)" };
    case "arrived":
      return { label: "Entrou", tone: "#0f766e", background: "rgba(15,118,110,0.12)" };
    case "cancelled":
      return { label: "Cancelado", tone: "#dc2626", background: "rgba(220,38,38,0.12)" };
    default:
      return { label: status, tone: "#a16207", background: "rgba(161,98,7,0.12)" };
  }
}

function downloadHistoryCsv(rows: ArrivalEvent[]) {
  const header = [
    "ID",
    "Morador",
    "Bloco",
    "Apartamento",
    "Status",
    "DistanciaMetros",
    "Placa",
    "TipoVeiculo",
    "CriadoEm",
    "ConfirmadoEm",
    "EntrouEm",
    "CanceladoEm",
  ];

  const lines = rows.map((row) => [
    row.id,
    row.morador_name,
    row.bloco || "",
    row.apartamento || "",
    row.status,
    row.distance_meters ?? "",
    row.vehicle_plate || "",
    row.vehicle_type || "",
    row.created_at || "",
    row.confirmed_at || "",
    row.arrived_at || "",
    row.cancelled_at || "",
  ]);

  const csv = [header, ...lines]
    .map((line) => line.map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `estou-chegando-relatorio-${new Date().toISOString().slice(0, 10)}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function hasValidCoordinates(lat: number | null | undefined, lng: number | null | undefined): lat is number {
  return typeof lat === "number" && Number.isFinite(lat) && typeof lng === "number" && Number.isFinite(lng);
}

function buildMarkerIcon(fillColor: string): google.maps.Symbol | undefined {
  if (!globalThis.google?.maps?.SymbolPath) return undefined;
  return {
    path: globalThis.google.maps.SymbolPath.CIRCLE,
    fillColor,
    fillOpacity: 1,
    strokeColor: "#ffffff",
    strokeWeight: 2,
    scale: 11,
  };
}

export default function PortariaEstouChegando() {
  const { p } = useTheme();

  const navigate = useNavigate();

  const [events, setEvents] = useState<ArrivalEvent[]>([]);
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<ArrivalEvent[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [confirmedIds, setConfirmedIds] = useState<Set<number>>(new Set());
  const [selectedMarker, setSelectedMarker] = useState<string | number | null>(null);
  const [trackingMessage, setTrackingMessage] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);

  const loadActiveEvents = useCallback(() => {
    apiFetch("/api/estou-chegando/active")
      .then((r) => r.ok ? r.json() : [])
      .then((data) => {
        if (Array.isArray(data)) {
          setEvents(sortArrivalEvents(data));
        }
      })
      .catch(() => {});
  }, []);

  // ─── Alert sound ───
  const playAlertSound = useCallback(() => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
      const ctx = audioCtxRef.current;
      // Attention-grabbing alert: two quick beeps
      [0, 0.25].forEach((delay) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = 880;
        osc.type = "square";
        gain.gain.setValueAtTime(0.25, ctx.currentTime + delay);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + delay + 0.2);
        osc.connect(gain).connect(ctx.destination);
        osc.start(ctx.currentTime + delay);
        osc.stop(ctx.currentTime + delay + 0.2);
      });
    } catch {}
  }, [soundEnabled]);

  // ─── Load config ───
  useEffect(() => {
    apiFetch("/api/estou-chegando/config")
      .then(r => r.ok ? r.json() : null)
      .then(cfg => { setConfig(cfg); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadActiveEvents();
    const intervalId = setInterval(loadActiveEvents, 5000);
    return () => clearInterval(intervalId);
  }, [loadActiveEvents]);

  // ─── WebSocket connection ───
  useEffect(() => {
    const token = getToken();
    const wsUrl = buildWsUrl("/ws/estou-chegando") + (token ? `?token=${token}` : "");
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setWsConnected(true);
      ws.send(JSON.stringify({ type: "register-portaria" }));
    };

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        switch (msg.type) {
          case "active-events":
            setEvents(sortArrivalEvents(msg.events || []));
            break;

          case "tracking-started":
            setEvents((prev) => {
              const next = prev.filter((event) => event.id !== msg.event.id);
              return sortArrivalEvents([msg.event, ...next]);
            });
            break;

          case "arrival-notification":
            setEvents(prev => {
              const next = prev.filter((event) => event.id !== msg.event.id);
              return sortArrivalEvents([msg.event, ...next]);
            });
            playAlertSound();
            // Vibrate
            if (navigator.vibrate) navigator.vibrate([300, 100, 300]);
            break;

          case "location-update":
            setEvents(prev => sortArrivalEvents(prev.map(e =>
              e.id === msg.event_id
                ? { ...e, latitude: msg.latitude, longitude: msg.longitude, distance_meters: msg.distance, status: msg.status || e.status }
                : e
            )));
            break;

          case "arrival-tracking-broadcast":
            setConfirmedIds(prev => new Set(prev).add(msg.event_id));
            setEvents((prev) => sortArrivalEvents(prev.map((event) =>
              event.id === msg.event_id
                ? { ...event, status: "tracking", confirmed_at: new Date().toISOString() }
                : event
            )));
            break;

          case "arrival-completed":
            setEvents((prev) => prev.filter((event) => event.id !== msg.event_id));
            break;

          case "arrival-cancelled":
            setEvents(prev => prev.filter(e => e.id !== msg.event_id));
            break;
        }
      } catch {}
    };

    ws.onclose = () => {
      setWsConnected(false);
      // Reconnect after 3 seconds
      setTimeout(() => {
        if (wsRef.current === ws) {
          // Reconnect logic handled by effect cleanup + re-run
        }
      }, 3000);
    };

    ws.onerror = () => setWsConnected(false);

    return () => { ws.close(); };
  }, [loadActiveEvents, playAlertSound]);

  // ─── Confirm arrival ───
  const confirmArrival = useCallback((eventId: number) => {
    if (confirmedIds.has(eventId)) return;
    const event = events.find((item) => item.id === eventId);
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "confirm-arrival", event_id: eventId }));
    }
    // Also via REST as fallback
    apiFetch(`/api/estou-chegando/confirm/${eventId}`, { method: "POST" }).catch(() => {});
    setConfirmedIds(prev => new Set(prev).add(eventId));
    setEvents((prev) => sortArrivalEvents(prev.map((item) =>
      item.id === eventId
        ? { ...item, status: "tracking", confirmed_at: new Date().toISOString() }
        : item
    )));
    setSelectedMarker(eventId);
    setTrackingMessage(event
      ? `Acompanhar chegada de ${event.morador_name} no mapa até a portaria.`
      : "Acompanhar chegada do morador no mapa até a portaria.");
  }, [confirmedIds, events]);

  useEffect(() => {
    if (!trackingMessage) return;
    const timeoutId = setTimeout(() => setTrackingMessage(null), 5000);
    return () => clearTimeout(timeoutId);
  }, [trackingMessage]);

  // ─── Load history ───
  const loadHistory = useCallback(() => {
    setHistoryLoading(true);
    apiFetch("/api/estou-chegando/history?limit=200")
      .then(r => r.ok ? r.json() : [])
      .then(data => { setHistory(sortArrivalEvents(data)); setHistoryLoading(false); })
      .catch(() => setHistoryLoading(false));
  }, []);

  const sortedEvents = sortArrivalEvents(events);
  const totalHistory = history.length;
  const confirmedHistory = history.filter((event) => event.status === "confirmed").length;
  const arrivedHistory = history.filter((event) => event.status === "arrived").length;
  const cancelledHistory = history.filter((event) => event.status === "cancelled").length;

  const condoLat = config?.latitude || DEFAULT_MAP_CENTER.lat;
  const condoLng = config?.longitude || DEFAULT_MAP_CENTER.lng;
  const condoPosition = { lat: condoLat, lng: condoLng };
  const hasConfiguredCondoLocation = hasValidCoordinates(config?.latitude, config?.longitude);
  const condoMarkerIcon = buildMarkerIcon("#2d3354");
  const moradorMarkerIcon = buildMarkerIcon("#10b981");

  useEffect(() => {
    if (!mapRef.current || !globalThis.google?.maps) return;

    const bounds = new globalThis.google.maps.LatLngBounds();
    bounds.extend(condoPosition);

    let markerCount = 1;
    for (const event of events) {
      if (!hasValidCoordinates(event.latitude, event.longitude)) continue;
      bounds.extend({ lat: event.latitude, lng: event.longitude });
      markerCount += 1;
    }

    if (markerCount > 1) {
      mapRef.current.fitBounds(bounds, 40);
    } else {
      mapRef.current.setCenter(condoPosition);
      mapRef.current.setZoom(15);
    }
  }, [condoPosition, events]);

  if (loading) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: p.pageBg }}>
      {/* Header */}
      <header className="sticky top-0 z-40" style={{ background: p.headerBg, borderBottom: p.headerBorder, boxShadow: p.headerShadow, color: p.text, paddingTop: "max(0, env(safe-area-inset-top))" }}>
        <div className="flex items-center justify-between" style={{ padding: "1rem 1.5rem", height: "4rem" }}>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} style={{ width: 40, height: 40, borderRadius: 12, background: p.btnBg, border: p.btnBorder, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: p.text }}>
              <ArrowLeft className="w-6 h-6" />
            </button>
            <span style={{ fontWeight: 700, fontSize: 18 }}>Estou Chegando</span>
            {sortedEvents.length > 0 && (
              <span className="bg-emerald-500 text-white text-xs font-bold px-2 py-0.5 rounded-full animate-pulse">
                {sortedEvents.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <TutorialButton title="Estou Chegando — Portaria">
              <TSection icon={<span>📍</span>} title="O QUE E ESTA FUNCAO?">
                <p>O painel <strong>"Estou Chegando"</strong> mostra em tempo real quando um <strong>morador esta se aproximando</strong> do condominio. O sistema usa GPS e envia alertas automaticos com <strong>som, vibracao e notificacao visual</strong> para que voce se prepare para abrir o portao antes mesmo do morador chegar.</p>
                <p style={{ marginTop: "8px" }}>Voce ve no mapa a <strong>posicao exata</strong> do morador, seu veiculo, placa, distancia e direcao. Quando confirmar a chegada, o morador recebe notificacao no celular.</p>
              </TSection>
              <FlowPortaria>
                <TStep n={1}>Mantenha esta tela aberta — ela funciona em <strong>tempo real via WebSocket</strong></TStep>
                <TStep n={2}>Quando um morador ativar o "Estou Chegando" e se aproximar, voce recebe um <strong>alerta sonoro</strong> (2 bips rapidos) e a tela mostra o evento</TStep>
                <TStep n={3}>Veja no <strong>mapa interativo</strong> a posicao do morador (marcador azul) e o condominio (marcador vermelho). O circulo mostra o raio de deteccao</TStep>
                <TStep n={4}>Confira as informacoes: <strong>nome, bloco, apartamento, veiculo, placa, modelo, cor</strong> e distancia em metros</TStep>
                <TStep n={5}>Se o morador veio de <strong>Uber/Taxi</strong>, voce vera o nome do motorista e a placa do veiculo de transporte</TStep>
                <TStep n={6}>Quando o morador chegar, toque em <strong>"Confirmar Chegada"</strong> — ele recebe vibracao + som de confirmacao no celular</TStep>
                <TStep n={7}>O evento e registrado no <strong>historico</strong> com horario de notificacao e confirmacao</TStep>
                <p style={{ marginTop: "8px", fontSize: "14px", color: "#2d3354" }}>👉 <strong>O morador ve:</strong> Status atualizado em tempo real (Rastreando → Notificado → Confirmado) e recebe alertas sonoros/vibracao.</p>
              </FlowPortaria>
              <FlowMorador>
                <TStep n={1}>O morador abre o app e toca em <strong>"Estou Chegando"</strong></TStep>
                <TStep n={2}>Seleciona o veiculo (proprio ou Uber/Taxi) e ativa o rastreamento GPS</TStep>
                <TStep n={3}>Conforme se aproxima do condominio, o sistema detecta a <strong>direcao</strong> (aproximando vs afastando)</TStep>
                <TStep n={4}>Quando entra no raio configurado <strong>se aproximando</strong>, o alerta chega automaticamente para voce</TStep>
                <p style={{ marginTop: "8px", fontSize: "14px", color: "#166534" }}>👉 <strong>Importante:</strong> O sistema so envia alerta quando o morador esta VINDO em direcao ao condominio. Se ele estiver saindo, nao notifica.</p>
              </FlowMorador>
              <TSection icon={<span>🗺️</span>} title="MAPA INTERATIVO">
                <TBullet><strong>Marcador vermelho</strong> — Posicao do condominio (centro do mapa)</TBullet>
                <TBullet><strong>Marcadores azuis</strong> — Posicao de cada morador se aproximando. Mostra nome e distancia</TBullet>
                <TBullet><strong>Circulo azul claro</strong> — Raio de deteccao configurado pelo sindico</TBullet>
                <TBullet><strong>Atualizacao em tempo real</strong> — Os marcadores se movem conforme o morador se desloca</TBullet>
              </TSection>
              <TSection icon={<span>🔊</span>} title="ALERTAS SONOROS">
                <TBullet><strong>2 bips rapidos</strong> — Tocam automaticamente quando um novo morador entra no raio de deteccao</TBullet>
                <TBullet><strong>Botao de som</strong> — Use o icone de alto-falante no header para ativar/desativar os alertas sonoros</TBullet>
                <TBullet><strong>Alerta visual</strong> — Mesmo com som desligado, o card do evento aparece com animacao de destaque</TBullet>
              </TSection>
              <TSection icon={<span>🔧</span>} title="FUNCOES DISPONIVEIS">
                <TBullet><strong>Confirmar Chegada</strong> — Toque para registrar que o morador chegou e foi recebido. Ele recebe confirmacao no celular</TBullet>
                <TBullet><strong>Historico</strong> — Toque no icone de relogio para ver todos os eventos anteriores com datas e horarios</TBullet>
                <TBullet><strong>Badge de contagem</strong> — O numero verde no header mostra quantos moradores estao se aproximando agora</TBullet>
                <TBullet><strong>Indicador Wi-Fi</strong> — Icone verde = conectado ao servidor. Vermelho = desconectado (reconecta automaticamente)</TBullet>
              </TSection>
              <TSection icon={<span>⭐</span>} title="DICAS IMPORTANTES">
                <TBullet><strong>Mantenha o som ativado</strong> para nao perder alertas de moradores chegando</TBullet>
                <TBullet><strong>Confirme rapidamente</strong> a chegada do morador para ele saber que foi recebido</TBullet>
                <TBullet>Se o icone Wi-Fi ficar <strong>vermelho</strong>, a conexao caiu — o sistema reconecta em segundos automaticamente</TBullet>
                <TBullet>O sistema funciona apenas no <strong>horario configurado pelo sindico</strong> (normalmente noite/madrugada)</TBullet>
                <TBullet>Use o <strong>historico</strong> para consultar chegadas anteriores se necessario para relatorios</TBullet>
              </TSection>
            </TutorialButton>
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-all"
            >
              {soundEnabled ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6 text-red-300" />}
            </button>
            <button
              onClick={() => { setShowHistory(!showHistory); if (!showHistory) loadHistory(); }}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-all"
            >
              <History className="w-6 h-6" />
            </button>
            {wsConnected ? <Wifi className="w-5 h-5 text-emerald-400" /> : <WifiOff className="w-5 h-5 text-red-400" />}
          </div>
        </div>
      </header>

      <div style={{ padding: "12px 16px 0" }}>
        <ComoFunciona steps={[
          "📱 Morador avisa pelo app que está chegando",
          "🔔 Portaria recebe alerta com nome e previsão",
          "🚗 Portaria prepara abertura do portão",
          "✅ Entrada agilizada sem espera",
        ]} />
      </div>

      {/* Schedule info */}
      {config && (
        <div className="flex items-center gap-2 bg-card border-b border-border" style={{ padding: "0.5rem 1.5rem" }}>
          <Clock className="w-5 h-5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            Ativo: {config.horario_inicio} — {config.horario_fim}
          </span>
        </div>
      )}

      <main className="flex-1 flex flex-col overflow-hidden">
        {showHistory ? (
          /* ═══ History view ═══ */
          <div className="flex-1 overflow-y-auto" style={{ padding: "1rem 1.5rem" }}>
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <h3 className="text-sm font-bold text-foreground">Histórico de Chegadas</h3>
                <p className="text-xs text-muted-foreground mt-1">Resumo e relatório dos acompanhamentos realizados.</p>
              </div>
              <button
                onClick={() => downloadHistoryCsv(history)}
                disabled={history.length === 0}
                className="rounded-xl px-3 py-2 text-xs font-bold flex items-center gap-2"
                style={{
                  background: history.length === 0 ? "#cbd5e1" : "linear-gradient(135deg, #1d4ed8, #2563eb)",
                  color: "#ffffff",
                  opacity: history.length === 0 ? 0.7 : 1,
                }}
              >
                <Download className="w-5 h-5" />
                Exportar CSV
              </button>
            </div>

            <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
              {[
                { label: "Total", value: totalHistory, icon: FileText, color: "#1d4ed8", bg: "rgba(29,78,216,0.12)" },
                { label: "Confirmados", value: confirmedHistory, icon: Check, color: "#059669", bg: "rgba(5,150,105,0.12)" },
                { label: "Entraram", value: arrivedHistory, icon: BarChart3, color: "#0f766e", bg: "rgba(15,118,110,0.12)" },
                { label: "Cancelados", value: cancelledHistory, icon: History, color: "#dc2626", bg: "rgba(220,38,38,0.12)" },
              ].map((card) => {
                const Icon = card.icon;
                return (
                  <div key={card.label} className="rounded-2xl border border-border" style={{ padding: "14px 16px", background: p.cardBg }}>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: p.textDim }}>{card.label}</p>
                        <p className="text-2xl font-black" style={{ color: p.text }}>{card.value}</p>
                      </div>
                      <div className="rounded-xl" style={{ width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", background: card.bg, color: card.color }}>
                        <Icon className="w-6 h-6" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {historyLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-7 h-7 animate-spin text-primary" />
              </div>
            ) : history.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhum registro encontrado.</p>
            ) : (
              <div className="space-y-2">
                {history.map(ev => (
                  <div key={ev.id} className="bg-card rounded-xl p-3 border border-border">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-foreground text-sm">{ev.morador_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {ev.bloco && `Bloco ${ev.bloco}`} {ev.apartamento && `Apt ${ev.apartamento}`}
                        </p>
                      </div>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{
                          background: getEventStatusMeta(ev.status).background,
                          color: getEventStatusMeta(ev.status).tone,
                        }}
                      >
                        {getEventStatusMeta(ev.status).label}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(ev.created_at).toLocaleString("pt-BR")}
                      {ev.vehicle_plate && ` · ${ev.vehicle_plate}`}
                      {ev.vehicle_type === "uber_taxi" && " · Uber/Táxi"}
                    </p>
                    {(ev.confirmed_at || ev.arrived_at || ev.cancelled_at) && (
                      <p className="text-[11px] mt-1" style={{ color: p.textDim }}>
                        {ev.confirmed_at && `Confirmado: ${new Date(ev.confirmed_at).toLocaleString("pt-BR")}`}
                        {ev.arrived_at && `${ev.confirmed_at ? " · " : ""}Entrou: ${new Date(ev.arrived_at).toLocaleString("pt-BR")}`}
                        {ev.cancelled_at && `${(ev.confirmed_at || ev.arrived_at) ? " · " : ""}Cancelado: ${new Date(ev.cancelled_at).toLocaleString("pt-BR")}`}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            {/* ═══ Map ═══ */}
            <div style={{ height: "45vh", minHeight: "250px" }}>
              {hasConfiguredCondoLocation ? (
                GOOGLE_MAPS_API_KEY ? (
                  <LoadScriptNext googleMapsApiKey={GOOGLE_MAPS_API_KEY}>
                    <GoogleMap
                      center={condoPosition}
                      zoom={15}
                      mapContainerStyle={{ height: "100%", width: "100%" }}
                      options={{
                        disableDefaultUI: true,
                        zoomControl: true,
                        clickableIcons: false,
                        mapId: GOOGLE_MAPS_MAP_ID || undefined,
                      }}
                      onLoad={(map) => {
                        mapRef.current = map;
                      }}
                      onUnmount={() => {
                        mapRef.current = null;
                      }}
                    >
                      {sortedEvents.some((event) => event.status === "tracking") && sortedEvents.map((event) => {
                        if (event.status !== "tracking" || !hasValidCoordinates(event.latitude, event.longitude)) {
                          return null;
                        }

                        return (
                          <PolylineF
                            key={`route-${event.id}`}
                            path={[{ lat: event.latitude, lng: event.longitude }, condoPosition]}
                            options={{
                              strokeColor: "#2563eb",
                              strokeOpacity: 0.9,
                              strokeWeight: 4,
                              geodesic: true,
                            }}
                          />
                        );
                      })}

                      <MarkerF
                        position={condoPosition}
                        icon={condoMarkerIcon}
                        label={{ text: "C", color: "#ffffff", fontWeight: "700" }}
                        onClick={() => setSelectedMarker("condo")}
                      />
                      {selectedMarker === "condo" && (
                        <InfoWindowF position={condoPosition} onCloseClick={() => setSelectedMarker(null)}>
                          <strong>Portaria do condomínio</strong>
                        </InfoWindowF>
                      )}

                      <CircleF
                        center={condoPosition}
                        radius={config.radius_default || 200}
                        options={{
                          strokeColor: "#2d3354",
                          strokeOpacity: 0.8,
                          strokeWeight: 2,
                          fillColor: "#2d3354",
                          fillOpacity: 0.08,
                        }}
                      />

                      {sortedEvents.map((ev) => {
                        if (!hasValidCoordinates(ev.latitude, ev.longitude)) return null;

                        const eventPosition = { lat: ev.latitude, lng: ev.longitude };
                        return (
                          <MarkerF
                            key={ev.id}
                            position={eventPosition}
                            icon={moradorMarkerIcon}
                            label={{ text: "M", color: "#ffffff", fontWeight: "700" }}
                            onClick={() => setSelectedMarker(ev.id)}
                          >
                            {selectedMarker === ev.id && (
                              <InfoWindowF position={eventPosition} onCloseClick={() => setSelectedMarker(null)}>
                                <div style={{ minWidth: 150 }}>
                                  <strong>{ev.morador_name}</strong><br />
                                  {ev.bloco && <span>Bloco {ev.bloco}</span>} {ev.apartamento && <span>Apt {ev.apartamento}</span>}<br />
                                  {ev.vehicle_plate && <span>Placa: {ev.vehicle_plate}</span>}<br />
                                  <span>{Math.round(ev.distance_meters)}m do condomínio</span>
                                </div>
                              </InfoWindowF>
                            )}
                          </MarkerF>
                        );
                      })}
                    </GoogleMap>
                  </LoadScriptNext>
                ) : (
                  <div className="h-full flex items-center justify-center bg-muted text-center px-4 text-sm text-muted-foreground">
                    Configure a variável VITE_GOOGLE_MAPS_API_KEY para exibir o mapa.
                  </div>
                )
              ) : (
                <div className="h-full flex items-center justify-center bg-muted">
                  <div className="text-center">
                    <MapPin className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Localização do condomínio não configurada</p>
                  </div>
                </div>
              )}
            </div>

            {/* ═══ Events list ═══ */}
            <div className="flex-1 overflow-y-auto" style={{ padding: "1rem 1.5rem" }}>
              {trackingMessage && (
                <div
                  className="mb-4 rounded-2xl border"
                  style={{
                    padding: "14px 16px",
                    background: "rgba(37,99,235,0.12)",
                    borderColor: "rgba(37,99,235,0.25)",
                    color: "#1d4ed8",
                  }}
                >
                  <p className="text-sm font-bold">Acompanhar chegada do morador</p>
                  <p className="text-xs mt-1">{trackingMessage}</p>
                </div>
              )}

              {sortedEvents.length === 0 ? (
                <div className="text-center py-8">
                  <Navigation className="w-10 h-10 mx-auto mb-3" style={{ color: p.textDim }} />
                  <p className="text-sm" style={{ color: p.text }}>Nenhum morador se aproximando no momento.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {sortedEvents.map((ev) => {
                    const statusMeta = getEventStatusMeta(ev.status);
                    const canConfirm = ev.status === "approaching" && !confirmedIds.has(ev.id);
                    const isTracking = ev.status === "tracking" || confirmedIds.has(ev.id);

                    return (
                    <div
                      key={ev.id}
                      className="bg-card rounded-2xl p-4 border-2 border-emerald-500/30 animate-fade-in"
                      style={{
                        borderColor: ev.status === "approaching" ? "rgba(16,185,129,0.3)" : "rgba(59,130,246,0.25)",
                        boxShadow: ev.status === "approaching"
                          ? "0 0 20px rgba(16, 185, 129, 0.1)"
                          : "0 0 18px rgba(37, 99, 235, 0.08)",
                      }}
                    >
                      <div className="flex items-start gap-3">
                        {/* Avatar or icon */}
                        <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                          {ev.morador_avatar ? (
                            <img src={ev.morador_avatar} className="w-12 h-12 rounded-full object-cover" alt="" />
                          ) : (
                            <User className="w-7 h-7 text-emerald-500" />
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-foreground">{ev.morador_name}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                            {ev.bloco && (
                              <span className="flex items-center gap-1">
                                <Building className="w-4 h-4" />
                                Bloco {ev.bloco}
                              </span>
                            )}
                            {ev.apartamento && <span>Apt {ev.apartamento}</span>}
                          </div>

                          {/* Vehicle info */}
                          <div className="flex items-center gap-2 mt-2">
                            <Car className="w-5 h-5 text-primary" />
                            {ev.vehicle_type === "uber_taxi" ? (
                              <span className="text-xs text-foreground">
                                <span className="bg-amber-500/20 text-amber-600 px-1.5 py-0.5 rounded font-bold text-[10px]">UBER/TÁXI</span>
                                {ev.vehicle_plate && <span className="ml-1">{ev.vehicle_plate}</span>}
                                {ev.vehicle_model && <span className="ml-1">· {ev.vehicle_model}</span>}
                                {ev.vehicle_color && <span className="ml-1">· {ev.vehicle_color}</span>}
                              </span>
                            ) : (
                              <span className="text-xs text-foreground">
                                {ev.vehicle_plate ? (
                                  <span className="font-mono font-bold">{ev.vehicle_plate}</span>
                                ) : "Sem placa"}
                                {ev.vehicle_model && <span className="ml-1">· {ev.vehicle_model}</span>}
                                {ev.vehicle_color && <span className="ml-1">· {ev.vehicle_color}</span>}
                              </span>
                            )}
                          </div>

                          {ev.driver_name && (
                            <p className="text-xs text-muted-foreground mt-1">Motorista: {ev.driver_name}</p>
                          )}

                          {/* Distance badge */}
                          <div className="flex items-center gap-2 mt-2">
                            <span className="px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1" style={{ background: statusMeta.background, color: statusMeta.tone }}>
                              <MapPin className="w-4 h-4" />
                              {Math.round(ev.distance_meters)}m
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold" style={{ background: statusMeta.background, color: statusMeta.tone }}>
                              {statusMeta.label}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(ev.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>

                          <p className="text-[11px] mt-2" style={{ color: p.textDim }}>
                            {isTracking
                              ? "Portaria acompanhando a chegada no mapa até a portaria."
                              : "Morador dentro do raio configurado e aguardando acompanhamento da portaria."}
                          </p>
                        </div>
                      </div>

                      {/* Confirm button */}
                      <button
                        onClick={() => confirmArrival(ev.id)}
                        disabled={!canConfirm}
                        className="w-full mt-3 py-2.5 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all active:scale-95"
                        style={{
                          background: isTracking
                            ? "linear-gradient(135deg, #2563eb, #1d4ed8)"
                            : canConfirm
                            ? "linear-gradient(135deg, #10b981, #059669)"
                            : "linear-gradient(135deg, #94a3b8, #64748b)",
                          opacity: canConfirm || isTracking ? 1 : 0.88,
                        }}
                      >
                        <Check className="w-6 h-6" />
                        {isTracking
                          ? "ACOMPANHANDO CHEGADA DO MORADOR"
                          : "ACOMPANHAR CHEGADA"}
                      </button>
                    </div>
                  );})}
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
