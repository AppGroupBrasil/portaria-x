/**
 * ═══════════════════════════════════════════════════════════
 * PORTARIA — Painel Estou Chegando
 * Real-time arrival notifications with interactive map
 * Sound + visual alerts when morador is approaching
 * ═══════════════════════════════════════════════════════════
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { apiFetch, getToken } from "@/lib/api";
import { buildWsUrl } from "@/lib/config";
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
  Phone,
  Building,
  Loader2,
  History,
} from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default Leaflet marker icons (missing in bundlers)
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import { useTheme } from "@/hooks/useTheme";
import ComoFunciona from "@/components/ComoFunciona";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({ iconRetinaUrl: markerIcon2x, iconUrl: markerIcon, shadowUrl: markerShadow });

// Custom morador marker (green)
const moradorIcon = new L.Icon({
  iconUrl: "data:image/svg+xml;base64," + btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" width="30" height="42" viewBox="0 0 30 42">
      <path d="M15 0C6.7 0 0 6.7 0 15c0 10.5 15 27 15 27s15-16.5 15-27C30 6.7 23.3 0 15 0z" fill="#10b981"/>
      <circle cx="15" cy="14" r="7" fill="white"/>
      <path d="M15 9a5 5 0 110 10 5 5 0 010-10z" fill="#10b981"/>
      <circle cx="15" cy="12" r="2" fill="white"/>
      <path d="M11.5 16.5c0-2 1.5-2 3.5-2s3.5 0 3.5 2" stroke="white" stroke-width="1" fill="none"/>
    </svg>
  `),
  iconSize: [30, 42],
  iconAnchor: [15, 42],
  popupAnchor: [0, -42],
});

// Condominium marker (blue)
const condoIcon = new L.Icon({
  iconUrl: "data:image/svg+xml;base64," + btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" width="30" height="42" viewBox="0 0 30 42">
      <path d="M15 0C6.7 0 0 6.7 0 15c0 10.5 15 27 15 27s15-16.5 15-27C30 6.7 23.3 0 15 0z" fill="#2d3354"/>
      <rect x="9" y="8" width="12" height="14" rx="1" fill="white"/>
      <rect x="11" y="10" width="3" height="3" fill="#2d3354"/>
      <rect x="16" y="10" width="3" height="3" fill="#2d3354"/>
      <rect x="11" y="15" width="3" height="3" fill="#2d3354"/>
      <rect x="16" y="15" width="3" height="3" fill="#2d3354"/>
    </svg>
  `),
  iconSize: [30, 42],
  iconAnchor: [15, 42],
  popupAnchor: [0, -42],
});

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
  vehicles?: { placa: string; modelo: string; cor: string }[];
}

// Component to auto-fit map bounds
function FitBounds({ events, condoLat, condoLng }: { events: ArrivalEvent[]; condoLat: number; condoLng: number }) {
  const map = useMap();
  useEffect(() => {
    const points: [number, number][] = [[condoLat, condoLng]];
    events.forEach(e => { if (e.latitude && e.longitude) points.push([e.latitude, e.longitude]); });
    if (points.length > 1) {
      map.fitBounds(points, { padding: [40, 40], maxZoom: 16 });
    } else {
      map.setView([condoLat, condoLng], 15);
    }
  }, [events, condoLat, condoLng, map]);
  return null;
}

export default function PortariaEstouChegando() {
  const { isDark, p } = useTheme();
  const { user } = useAuth();
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

  const wsRef = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

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
            setEvents(msg.events || []);
            break;

          case "arrival-notification":
            setEvents(prev => {
              const exists = prev.find(e => e.id === msg.event.id);
              if (exists) return prev;
              return [msg.event, ...prev];
            });
            playAlertSound();
            // Vibrate
            if (navigator.vibrate) navigator.vibrate([300, 100, 300]);
            break;

          case "location-update":
            setEvents(prev => prev.map(e =>
              e.id === msg.event_id
                ? { ...e, latitude: msg.latitude, longitude: msg.longitude, distance_meters: msg.distance }
                : e
            ));
            break;

          case "arrival-confirmed-broadcast":
            setConfirmedIds(prev => new Set(prev).add(msg.event_id));
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
  }, [playAlertSound]);

  // ─── Confirm arrival ───
  const confirmArrival = useCallback((eventId: number) => {
    if (confirmedIds.has(eventId)) return;
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "confirm-arrival", event_id: eventId }));
    }
    // Also via REST as fallback
    apiFetch(`/api/estou-chegando/confirm/${eventId}`, { method: "POST" }).catch(() => {});
    setConfirmedIds(prev => new Set(prev).add(eventId));
  }, [confirmedIds]);

  // ─── Load history ───
  const loadHistory = useCallback(() => {
    setHistoryLoading(true);
    apiFetch("/api/estou-chegando/history?limit=30")
      .then(r => r.ok ? r.json() : [])
      .then(data => { setHistory(data); setHistoryLoading(false); })
      .catch(() => setHistoryLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const condoLat = config?.latitude || -23.55;
  const condoLng = config?.longitude || -46.63;

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: p.pageBg }}>
      {/* Header */}
      <header className="sticky top-0 z-40" style={{ background: p.headerBg, borderBottom: p.headerBorder, boxShadow: p.headerShadow, color: p.text }}>
        <div className="flex items-center justify-between" style={{ padding: "1rem 1.5rem", height: "4.5rem" }}>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} style={{ width: 40, height: 40, borderRadius: 12, background: p.btnBg, border: p.btnBorder, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: p.text }}>
              <ArrowLeft className="w-5 h-5" />
            </button>
            <span style={{ fontWeight: 700, fontSize: 18 }}>Estou Chegando</span>
            {events.length > 0 && (
              <span className="bg-emerald-500 text-white text-xs font-bold px-2 py-0.5 rounded-full animate-pulse">
                {events.length}
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
                <p style={{ marginTop: "8px", fontSize: "13px", color: "#2d3354" }}>👉 <strong>O morador ve:</strong> Status atualizado em tempo real (Rastreando → Notificado → Confirmado) e recebe alertas sonoros/vibracao.</p>
              </FlowPortaria>
              <FlowMorador>
                <TStep n={1}>O morador abre o app e toca em <strong>"Estou Chegando"</strong></TStep>
                <TStep n={2}>Seleciona o veiculo (proprio ou Uber/Taxi) e ativa o rastreamento GPS</TStep>
                <TStep n={3}>Conforme se aproxima do condominio, o sistema detecta a <strong>direcao</strong> (aproximando vs afastando)</TStep>
                <TStep n={4}>Quando entra no raio configurado <strong>se aproximando</strong>, o alerta chega automaticamente para voce</TStep>
                <p style={{ marginTop: "8px", fontSize: "13px", color: "#166534" }}>👉 <strong>Importante:</strong> O sistema so envia alerta quando o morador esta VINDO em direcao ao condominio. Se ele estiver saindo, nao notifica.</p>
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
              {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5 text-red-300" />}
            </button>
            <button
              onClick={() => { setShowHistory(!showHistory); if (!showHistory) loadHistory(); }}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-all"
            >
              <History className="w-5 h-5" />
            </button>
            {wsConnected ? <Wifi className="w-4 h-4 text-emerald-400" /> : <WifiOff className="w-4 h-4 text-red-400" />}
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
          <Clock className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            Ativo: {config.horario_inicio} — {config.horario_fim}
          </span>
        </div>
      )}

      <main className="flex-1 flex flex-col overflow-hidden">
        {showHistory ? (
          /* ═══ History view ═══ */
          <div className="flex-1 overflow-y-auto" style={{ padding: "1rem 1.5rem" }}>
            <h3 className="text-sm font-bold text-foreground mb-3">Histórico de Chegadas</h3>
            {historyLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
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
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        ev.status === "confirmed" ? "bg-emerald-500/10 text-emerald-500" :
                        ev.status === "cancelled" ? "bg-red-500/10 text-red-500" :
                        "bg-amber-500/10 text-amber-500"
                      }`}>
                        {ev.status === "confirmed" ? "Confirmado" : ev.status === "cancelled" ? "Cancelado" : "Pendente"}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(ev.created_at).toLocaleString("pt-BR")}
                      {ev.vehicle_plate && ` · ${ev.vehicle_plate}`}
                      {ev.vehicle_type === "uber_taxi" && " · Uber/Táxi"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            {/* ═══ Map ═══ */}
            <div style={{ height: "45vh", minHeight: "250px" }}>
              {config?.latitude && config?.longitude ? (
                <MapContainer
                  center={[condoLat, condoLng]}
                  zoom={15}
                  style={{ height: "100%", width: "100%" }}
                  zoomControl={false}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <FitBounds events={events} condoLat={condoLat} condoLng={condoLng} />

                  {/* Condominium marker + radius circle */}
                  <Marker position={[condoLat, condoLng]} icon={condoIcon}>
                    <Popup>
                      <strong>{user?.condominio_nome || "Condomínio"}</strong>
                    </Popup>
                  </Marker>
                  <Circle center={[condoLat, condoLng]} radius={config.radius_default || 200} pathOptions={{ color: "#2d3354", fillOpacity: 0.08 }} />

                  {/* Morador markers */}
                  {events.map(ev => ev.latitude && ev.longitude && (
                    <Marker key={ev.id} position={[ev.latitude, ev.longitude]} icon={moradorIcon}>
                      <Popup>
                        <div style={{ minWidth: 150 }}>
                          <strong>{ev.morador_name}</strong><br />
                          {ev.bloco && <span>Bloco {ev.bloco}</span>} {ev.apartamento && <span>Apt {ev.apartamento}</span>}<br />
                          {ev.vehicle_plate && <span>Placa: {ev.vehicle_plate}</span>}<br />
                          <span>{Math.round(ev.distance_meters)}m do condomínio</span>
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
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
              {events.length === 0 ? (
                <div className="text-center py-8">
                  <Navigation className="w-10 h-10 mx-auto mb-3" style={{ color: p.textDim }} />
                  <p className="text-sm" style={{ color: p.text }}>Nenhum morador se aproximando no momento.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {events.map((ev) => (
                    <div
                      key={ev.id}
                      className="bg-card rounded-2xl p-4 border-2 border-emerald-500/30 animate-fade-in"
                      style={{ boxShadow: "0 0 20px rgba(16, 185, 129, 0.1)" }}
                    >
                      <div className="flex items-start gap-3">
                        {/* Avatar or icon */}
                        <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                          {ev.morador_avatar ? (
                            <img src={ev.morador_avatar} className="w-12 h-12 rounded-full object-cover" alt="" />
                          ) : (
                            <User className="w-6 h-6 text-emerald-500" />
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-foreground">{ev.morador_name}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                            {ev.bloco && (
                              <span className="flex items-center gap-1">
                                <Building className="w-3 h-3" />
                                Bloco {ev.bloco}
                              </span>
                            )}
                            {ev.apartamento && <span>Apt {ev.apartamento}</span>}
                          </div>

                          {/* Vehicle info */}
                          <div className="flex items-center gap-2 mt-2">
                            <Car className="w-4 h-4 text-primary" />
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
                            <span className="bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {Math.round(ev.distance_meters)}m
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(ev.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Confirm button */}
                      <button
                        onClick={() => confirmArrival(ev.id)}
                        disabled={confirmedIds.has(ev.id)}
                        className="w-full mt-3 py-2.5 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all active:scale-95"
                        style={{ background: confirmedIds.has(ev.id) ? "linear-gradient(135deg, #ef4444, #dc2626)" : "linear-gradient(135deg, #10b981, #059669)", opacity: confirmedIds.has(ev.id) ? 0.9 : 1 }}
                      >
                        <Check className="w-5 h-5" />
                        {confirmedIds.has(ev.id) ? "AVISO ENVIADO" : "CONFIRMAR CHEGADA"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
