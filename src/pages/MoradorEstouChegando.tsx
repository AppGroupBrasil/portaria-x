/**
 * ═══════════════════════════════════════════════════════════
 * MORADOR — Estou Chegando (Automático)
 *
 * O morador configura veículo e raio UMA VEZ.
 * Ao ativar, o rastreamento GPS funciona automaticamente:
 * - Monitora posição continuamente
 * - Detecta aproximação ao condomínio
 * - Notifica portaria via WebSocket + Push
 * - Não precisa apertar botão a cada viagem
 * ═══════════════════════════════════════════════════════════
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@/hooks/useTheme";
import { apiFetch, getToken } from "@/lib/api";
import { buildWsUrl } from "@/lib/config";
import TutorialButton, { FlowMorador, TSection, TStep, TBullet } from "@/components/TutorialButton";
import {
  ArrowLeft,
  MapPin,
  Navigation,
  Car,
  Loader2,
  Check,
  Clock,
  Wifi,
  WifiOff,
  AlertTriangle,
  Settings,
  Power,
  Shield,
  CheckCircle2,
  HelpCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface VehicleOption {
  placa: string;
  modelo: string;
  cor: string;
}

type TrackingStatus = "idle" | "connecting" | "active" | "notified" | "confirmed" | "error";

const STORAGE_KEY_ENABLED = "estou_chegando_enabled";
const STORAGE_KEY_VEHICLE = "estou_chegando_vehicle";
const STORAGE_KEY_RADIUS = "estou_chegando_radius";
const STORAGE_KEY_VEHICLE_TYPE = "estou_chegando_vehicle_type";
const STORAGE_KEY_AUTO_GATE = "estou_chegando_auto_gate";

export default function MoradorEstouChegando() {
  const { isDark, p } = useTheme();
  const navigate = useNavigate();

  // Config from server
  const [config, setConfig] = useState<any>(null);
  const [configLoading, setConfigLoading] = useState(true);

  // Vehicle settings (persisted)
  const [vehicleType, setVehicleType] = useState<"proprio" | "uber_taxi">(
    () => (localStorage.getItem(STORAGE_KEY_VEHICLE_TYPE) as "proprio" | "uber_taxi") || "proprio"
  );
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleOption | null>(null);
  const [myVehicles, setMyVehicles] = useState<VehicleOption[]>([]);
  const [uberPlate, setUberPlate] = useState("");
  const [uberModel, setUberModel] = useState("");
  const [uberColor, setUberColor] = useState("");
  const [driverName, setDriverName] = useState("");

  // Radius (persisted)
  const [radius, setRadius] = useState(
    () => Number.parseInt(localStorage.getItem(STORAGE_KEY_RADIUS) || "200")
  );

  // Auto-tracking toggle (persisted)
  const [autoEnabled, setAutoEnabled] = useState(
    () => localStorage.getItem(STORAGE_KEY_ENABLED) === "true"
  );

  // Auto gate open toggle (persisted)
  const [autoGateOpen, setAutoGateOpen] = useState(
    () => localStorage.getItem(STORAGE_KEY_AUTO_GATE) === "true"
  );

  // Tracking state
  const [status, setStatus] = useState<TrackingStatus>("idle");
  const [distance, setDistance] = useState<number | null>(null);
  const [direction, setDirection] = useState<"approaching" | "leaving" | null>(null);
  const [eventId, setEventId] = useState<number | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [gateAutoOpened, setGateAutoOpened] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const autoEnabledRef = useRef(autoEnabled);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep ref in sync for closures
  useEffect(() => { autoEnabledRef.current = autoEnabled; }, [autoEnabled]);

  // ─── Load config + vehicles ───
  useEffect(() => {
    Promise.all([
      apiFetch("/api/estou-chegando/config").then(r => r.ok ? r.json() : null),
      apiFetch("/api/vehicle-authorizations?meus=true").then(r => r.ok ? r.json() : []),
    ]).then(([cfg, vehs]) => {
      setConfig(cfg);
      if (cfg?.radius_default && !localStorage.getItem(STORAGE_KEY_RADIUS)) {
        setRadius(cfg.radius_default);
      }
      const vehicles = (Array.isArray(vehs) ? vehs : [])
        .filter((v: any) => v.placa)
        .map((v: any) => ({ placa: v.placa, modelo: v.modelo || "", cor: v.cor || "" }));
      setMyVehicles(vehicles);

      // Restore saved vehicle or default to first
      const savedPlaca = localStorage.getItem(STORAGE_KEY_VEHICLE);
      const found = vehicles.find((v: VehicleOption) => v.placa === savedPlaca);
      setSelectedVehicle(found || vehicles[0] || null);
      setConfigLoading(false);
    }).catch(() => setConfigLoading(false));
  }, []);

  // ─── Check for active event on load ───
  useEffect(() => {
    apiFetch("/api/estou-chegando/my-active")
      .then(r => r.ok ? r.json() : null)
      .then(ev => {
        if (ev) {
          setEventId(ev.id);
          setStatus("notified");
          setDistance(ev.distance_meters);
        }
      })
      .catch(() => {});
  }, []);

  // ─── Confirmation sound ───
  const playConfirmationSound = useCallback(() => {
    try {
      const ctx = new AudioContext();
      [523.25, 659.25, 783.99].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = freq;
        osc.type = "sine";
        gain.gain.setValueAtTime(0.3, ctx.currentTime + i * 0.15);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.15 + 0.4);
        osc.connect(gain).connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.15);
        osc.stop(ctx.currentTime + i * 0.15 + 0.4);
      });
    } catch {}
  }, []);

  // ─── WebSocket connection ───
  const connectWs = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const token = getToken();
    const wsUrl = buildWsUrl("/ws/estou-chegando") + (token ? `?token=${token}` : "");
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setWsConnected(true);
      ws.send(JSON.stringify({ type: "register-morador" }));
    };

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        switch (msg.type) {
          case "registered":
            setStatus("active");
            break;
          case "status":
            setDistance(msg.distance);
            setDirection(msg.status === "approaching" ? "approaching" : "leaving");
            break;
          case "notified":
            setStatus("notified");
            setEventId(msg.event_id);
            setDistance(msg.distance);
            break;
          case "arrival-confirmed":
            setStatus("confirmed");
            playConfirmationSound();
            if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
            // Auto-reset after 10s to resume tracking
            setTimeout(() => {
              setStatus("active");
              setEventId(null);
              setDistance(null);
            }, 10000);
            break;
          case "feature-disabled":
            setErrorMsg("Funcionalidade desativada pelo síndico.");
            setStatus("error");
            break;
          case "outside-schedule":
            // Silently continue — will notify when schedule is active
            break;
          case "error":
            setErrorMsg(msg.message);
            break;
          case "gate-auto-opened":
            if (msg.success) {
              setGateAutoOpened(msg.access_point || "Portão");
              playConfirmationSound();
              if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 200]);
              setTimeout(() => setGateAutoOpened(null), 10000);
            }
            break;
        }
      } catch {}
    };

    ws.onclose = () => {
      setWsConnected(false);
      // Auto-reconnect if still enabled
      if (autoEnabledRef.current) {
        reconnectTimerRef.current = setTimeout(connectWs, 5000);
      }
    };

    ws.onerror = () => setWsConnected(false);
  }, [playConfirmationSound]);

  // ─── Start GPS tracking ───
  const startTracking = useCallback(() => {
    setErrorMsg(null);
    setStatus("connecting");
    connectWs();

    if (!navigator.geolocation) {
      setErrorMsg("Geolocalização não disponível neste dispositivo.");
      setStatus("error");
      return;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const ws = wsRef.current;
        if (ws?.readyState !== WebSocket.OPEN) return;

        const vt = localStorage.getItem(STORAGE_KEY_VEHICLE_TYPE) || "proprio";
        const savedPlaca = localStorage.getItem(STORAGE_KEY_VEHICLE) || "";
        const vehicleData = vt === "proprio"
          ? {
              vehicle_plate: savedPlaca,
              vehicle_model: "",
              vehicle_color: "",
            }
          : {
              vehicle_plate: uberPlate,
              vehicle_model: uberModel,
              vehicle_color: uberColor,
              driver_name: driverName,
            };

        ws.send(JSON.stringify({
          type: "location-update",
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          vehicle_type: vt,
          radius_meters: Number.parseInt(localStorage.getItem(STORAGE_KEY_RADIUS) || "200"),
          auto_open_gate: localStorage.getItem(STORAGE_KEY_AUTO_GATE) === "true",
          ...vehicleData,
        }));
      },
      (err) => {
        setErrorMsg("Erro ao obter localização. Verifique as permissões de GPS.");
        setStatus("error");
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 30000 }
    );
  }, [connectWs, uberPlate, uberModel, uberColor, driverName]);

  // ─── Stop tracking ───
  const stopTracking = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    const ws = wsRef.current;
    if (ws?.readyState === WebSocket.OPEN) {
      if (eventId) ws.send(JSON.stringify({ type: "cancel-arrival" }));
      ws.close();
    }
    wsRef.current = null;
    setWsConnected(false);
    setStatus("idle");
    setDistance(null);
    setDirection(null);
    setEventId(null);
  }, [eventId]);

  // ─── Auto-start when enabled + config loaded ───
  useEffect(() => {
    if (autoEnabled && config?.enabled && status === "idle" && !configLoading) {
      startTracking();
    }
  }, [autoEnabled, config, configLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Toggle auto-tracking ───
  const toggleAutoTracking = () => {
    const next = !autoEnabled;
    setAutoEnabled(next);
    localStorage.setItem(STORAGE_KEY_ENABLED, String(next));
    if (next) {
      startTracking();
    } else {
      stopTracking();
    }
  };

  // ─── Persist helpers ───
  const saveVehicleConfig = (vehicle: VehicleOption | null) => {
    setSelectedVehicle(vehicle);
    if (vehicle) localStorage.setItem(STORAGE_KEY_VEHICLE, vehicle.placa);
  };
  const saveRadius = (r: number) => {
    setRadius(r);
    localStorage.setItem(STORAGE_KEY_RADIUS, String(r));
  };
  const saveVehicleType = (t: "proprio" | "uber_taxi") => {
    setVehicleType(t);
    localStorage.setItem(STORAGE_KEY_VEHICLE_TYPE, t);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      wsRef.current?.close();
    };
  }, []);

  // ─── Render ───
  if (configLoading) {
    return (
      <div style={{ minHeight: '100dvh', background: isDark ? "linear-gradient(180deg, #001533 0%, #002254 25%, #003580 55%, #004aad 100%)" : "#f0f4f8", display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: isDark ? '#fff' : "#1e293b" }} />
      </div>
    );
  }

  if (config && !config.enabled) {
    return (
      <div style={{ minHeight: '100dvh', background: isDark ? "linear-gradient(180deg, #001533 0%, #002254 25%, #003580 55%, #004aad 100%)" : "#f0f4f8", display: 'flex', flexDirection: 'column' }}>
        <header style={{ position: 'sticky', top: 0, zIndex: 40, background: isDark ? "linear-gradient(135deg, #001533 0%, #002a66 50%, #004aad 100%)" : "#ffffff", borderBottom: isDark ? '1px solid rgba(255,255,255,0.08)' : "1px solid #e2e8f0", boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.3)' : "0 2px 8px rgba(0,0,0,0.06)" }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem 1.5rem', height: '4rem' }}>
            <button onClick={() => navigate(-1)} style={{ padding: '0.5rem', borderRadius: 14, background: isDark ? 'rgba(255,255,255,0.08)' : '#f8fafc', border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid #cbd5e1', color: isDark ? '#fff' : "#1e293b", cursor: 'pointer', transition: 'all 0.2s' }}>
              <ArrowLeft className="w-5 h-5" />
            </button>
            <span style={{ fontWeight: 800, fontSize: '1.125rem', color: isDark ? '#fff' : "#1e293b" }}>Estou Chegando</span>
          </div>
        </header>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: 20, background: 'linear-gradient(135deg, rgba(245,158,11,0.2), rgba(245,158,11,0.05))', border: '1.5px solid rgba(245,158,11,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
              <AlertTriangle style={{ width: 32, height: 32, color: '#f59e0b' }} />
            </div>
            <p style={{ color: isDark ? '#93c5fd' : "#1e293b", fontSize: '0.95rem' }}>Funcionalidade desativada pelo síndico.</p>
          </div>
        </div>
      </div>
    );
  }

  if (config && (!config.latitude || !config.longitude)) {
    return (
      <div style={{ minHeight: '100dvh', background: isDark ? "linear-gradient(180deg, #001533 0%, #002254 25%, #003580 55%, #004aad 100%)" : "#f0f4f8", display: 'flex', flexDirection: 'column' }}>
        <header style={{ position: 'sticky', top: 0, zIndex: 40, background: isDark ? "linear-gradient(135deg, #001533 0%, #002a66 50%, #004aad 100%)" : "#ffffff", borderBottom: isDark ? '1px solid rgba(255,255,255,0.08)' : "1px solid #e2e8f0", boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.3)' : "0 2px 8px rgba(0,0,0,0.06)" }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem 1.5rem', height: '4rem' }}>
            <button onClick={() => navigate(-1)} style={{ padding: '0.5rem', borderRadius: 14, background: isDark ? 'rgba(255,255,255,0.08)' : '#f8fafc', border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid #cbd5e1', color: isDark ? '#fff' : "#1e293b", cursor: 'pointer', transition: 'all 0.2s' }}>
              <ArrowLeft className="w-5 h-5" />
            </button>
            <span style={{ fontWeight: 800, fontSize: '1.125rem', color: isDark ? '#fff' : "#1e293b" }}>Estou Chegando</span>
          </div>
        </header>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: 20, background: 'linear-gradient(135deg, rgba(245,158,11,0.2), rgba(245,158,11,0.05))', border: '1.5px solid rgba(245,158,11,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
              <MapPin style={{ width: 32, height: 32, color: '#f59e0b' }} />
            </div>
            <p style={{ color: isDark ? '#93c5fd' : "#1e293b", fontSize: '0.95rem' }}>
              O síndico ainda não configurou a localização do condomínio.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100dvh', background: isDark ? "linear-gradient(180deg, #001533 0%, #002254 25%, #003580 55%, #004aad 100%)" : "#f0f4f8", display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header style={{ position: 'sticky', top: 0, zIndex: 40, background: isDark ? "linear-gradient(135deg, #001533 0%, #002a66 50%, #004aad 100%)" : "#ffffff", borderBottom: isDark ? '1px solid rgba(255,255,255,0.08)' : "1px solid #e2e8f0", boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.3)' : "0 2px 8px rgba(0,0,0,0.06)" }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.5rem', height: '4rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button onClick={() => navigate(-1)} style={{ padding: '0.5rem', borderRadius: 14, background: isDark ? 'rgba(255,255,255,0.08)' : '#f8fafc', border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid #cbd5e1', color: isDark ? '#fff' : "#1e293b", cursor: 'pointer', transition: 'all 0.2s' }}>
              <ArrowLeft className="w-5 h-5" />
            </button>
            <span style={{ fontWeight: 800, fontSize: '1.125rem', color: isDark ? '#fff' : "#1e293b" }}>Estou Chegando</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <TutorialButton title="Estou Chegando — Morador">
              <TSection icon={<span>📍</span>} title="COMO FUNCIONA">
                <p>O <strong>"Estou Chegando"</strong> avisa automaticamente a portaria quando você está se aproximando do condomínio. Basta <strong>ativar uma vez</strong> e o sistema monitora seu GPS continuamente.</p>
                <p style={{ marginTop: "8px" }}>Quando você entrar no raio configurado, a portaria recebe um <strong>alerta sonoro e visual em tempo real</strong> com seu nome, apartamento e veículo.</p>
              </TSection>
              <FlowMorador>
                <TStep n={1}>Configure seu <strong>veículo</strong> e <strong>raio de detecção</strong></TStep>
                <TStep n={2}>Ative o <strong>rastreamento automático</strong> com o botão</TStep>
                <TStep n={3}>Pronto! O sistema monitora automaticamente a cada viagem</TStep>
                <TStep n={4}>Ao se aproximar do condomínio, a portaria é <strong>notificada automaticamente</strong></TStep>
                <TStep n={5}>O porteiro confirma sua chegada e você recebe uma <strong>vibração + som</strong></TStep>
              </FlowMorador>
              <TSection icon={<span>⚡</span>} title="DICAS">
                <TBullet>Mantenha o rastreamento <strong>sempre ativado</strong> — ele só consome GPS quando você se move</TBullet>
                <TBullet>Use raio <strong>menor (50-100m)</strong> se mora perto da entrada, <strong>maior (300-500m)</strong> para condomínios grandes</TBullet>
                <TBullet>O sistema <strong>só notifica quando você está chegando</strong>, não quando sai</TBullet>
                <TBullet>Se for de <strong>Uber/Táxi</strong>, informe a placa para o porteiro identificar o veículo</TBullet>
              </TSection>
            </TutorialButton>
            {wsConnected && <Wifi className="w-4 h-4 text-emerald-400" />}
            {!wsConnected && autoEnabled && <WifiOff className="w-4 h-4 text-red-400" />}
          </div>
        </div>
      </header>

      <main style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', paddingBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

        {/* ═══ Como funciona? ═══ */}
        <div>
          <button
            onClick={() => setShowHelp(v => !v)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '0.875rem 1.25rem', borderRadius: 16, cursor: 'pointer', border: 'none',
              background: 'linear-gradient(135deg, #0ea5e9, #3b82f6)',
              boxShadow: '0 4px 16px rgba(14,165,233,0.3)',
              transition: 'all 0.2s',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <HelpCircle style={{ width: 22, height: 22, color: '#fff' }} />
              <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#fff' }}>Como funciona?</span>
            </div>
            {showHelp
              ? <ChevronUp style={{ width: 20, height: 20, color: '#fff' }} />
              : <ChevronDown style={{ width: 20, height: 20, color: '#fff' }} />}
          </button>
          {showHelp && (
            <div style={{
              marginTop: 8, padding: '1.25rem', borderRadius: 16,
              background: isDark ? 'rgba(255,255,255,0.06)' : '#f0f9ff',
              border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #bae6fd',
            }}>
              <ol style={{ margin: 0, paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', color: isDark ? '#e0f2fe' : '#0c4a6e', fontSize: '0.9rem', lineHeight: 1.5 }}>
                <li>O morador ativa o <strong>"Estou Chegando"</strong>.</li>
                <li>O síndico configura a <strong>distância de detecção</strong> (ex: 200m, 100m, 50m).</li>
                <li>Conforme o morador se aproxima e entra no <strong>raio configurado</strong>, o portão veicular abre automaticamente, <strong>sem confirmação</strong>.</li>
                <li>O sistema monitora o GPS continuamente — basta ativar <strong>uma vez</strong>.</li>
              </ol>
            </div>
          )}
        </div>

        {/* ═══ Main Toggle — Rastreamento Automático ═══ */}
        <div style={{
          borderRadius: 20,
          padding: '1.5rem',
          transition: 'all 0.3s',
          ...(autoEnabled
            ? { background: 'linear-gradient(135deg, #10b981, #059669)', color: isDark ? '#fff' : "#1e293b", boxShadow: '0 8px 32px rgba(16,185,129,0.25)' }
            : { background: isDark ? 'rgba(255,255,255,0.06)' : '#f8fafc', border: isDark ? '1.5px solid rgba(255,255,255,0.1)' : '1.5px solid #cbd5e1' }
          )
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                width: 48, height: 48, borderRadius: 16,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: autoEnabled ? 'rgba(255,255,255,0.2)' : (isDark ? 'linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.04))' : '#e2e8f0'),
                border: autoEnabled ? '1.5px solid rgba(255,255,255,0.3)' : (isDark ? '1.5px solid rgba(255,255,255,0.1)' : '1.5px solid #cbd5e1')
              }}>
                {autoEnabled ? (
                  <Navigation className="w-6 h-6 animate-pulse" style={{ color: isDark ? '#fff' : "#1e293b" }} />
                ) : (
                  <Power className="w-6 h-6" style={{ color: isDark ? '#93c5fd' : "#1e293b" }} />
                )}
              </div>
              <div>
                <p style={{ fontWeight: 800, fontSize: '1.1rem', color: isDark ? '#fff' : "#1e293b" }}>
                  Rastreamento {autoEnabled ? "Ativo" : "Desativado"}
                </p>
                <p style={{ fontSize: '0.85rem', color: autoEnabled ? 'rgba(255,255,255,0.7)' : (isDark ? '#93c5fd' : '#475569') }}>
                  {autoEnabled
                    ? (autoGateOpen ? "Portão abrirá automaticamente ao chegar" : "A portaria será notificada automaticamente")
                    : "Ative para notificar a portaria ao chegar"}
                </p>
              </div>
            </div>
            <button
              onClick={toggleAutoTracking}
              style={{
                width: 56, height: 32, borderRadius: 999, transition: 'all 0.3s', position: 'relative',
                background: autoEnabled ? 'rgba(255,255,255,0.3)' : (isDark ? 'rgba(255,255,255,0.12)' : '#94a3b8'),
                border: 'none', cursor: 'pointer'
              }}
            >
              <div style={{
                width: 24, height: 24, borderRadius: 999, position: 'absolute', top: 4, transition: 'all 0.3s',
                ...(autoEnabled ? { right: 4, left: 'auto', background: '#fff' } : { left: 4, right: 'auto', background: isDark ? 'rgba(255,255,255,0.4)' : '#ffffff' })
              }} />
            </button>
          </div>

        </div>

        {/* ═══ Toggle — Abertura Automática do Portão ═══ */}
        <div style={{
          borderRadius: 20,
          padding: '1.25rem 1.5rem',
          transition: 'all 0.3s',
          ...(autoGateOpen
            ? { background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', boxShadow: '0 8px 32px rgba(59,130,246,0.25)' }
            : { background: isDark ? 'rgba(255,255,255,0.06)' : '#f8fafc', border: isDark ? '1.5px solid rgba(255,255,255,0.1)' : '1.5px solid #cbd5e1' }
          )
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                width: 44, height: 44, borderRadius: 14,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: autoGateOpen ? 'rgba(255,255,255,0.2)' : (isDark ? 'linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.04))' : '#e2e8f0'),
                border: autoGateOpen ? '1.5px solid rgba(255,255,255,0.3)' : (isDark ? '1.5px solid rgba(255,255,255,0.1)' : '1.5px solid #cbd5e1')
              }}>
                <Car className="w-5 h-5" style={{ color: autoGateOpen ? '#fff' : (isDark ? '#93c5fd' : '#1e293b') }} />
              </div>
              <div>
                <p style={{ fontWeight: 700, fontSize: '1rem', color: autoGateOpen ? '#fff' : (isDark ? '#fff' : '#1e293b') }}>
                  Portão Automático
                </p>
                <p style={{ fontSize: '0.8rem', color: autoGateOpen ? 'rgba(255,255,255,0.7)' : (isDark ? '#93c5fd' : '#475569') }}>
                  {autoGateOpen ? "O portão veicular abrirá ao chegar" : "Ative para abrir o portão automaticamente"}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                const next = !autoGateOpen;
                setAutoGateOpen(next);
                localStorage.setItem(STORAGE_KEY_AUTO_GATE, String(next));
              }}
              style={{
                width: 52, height: 28, borderRadius: 999, transition: 'all 0.3s', position: 'relative',
                background: autoGateOpen ? 'rgba(255,255,255,0.3)' : (isDark ? 'rgba(255,255,255,0.12)' : '#94a3b8'),
                border: 'none', cursor: 'pointer'
              }}
            >
              <div style={{
                width: 22, height: 22, borderRadius: 999, position: 'absolute', top: 3, transition: 'all 0.3s',
                ...(autoGateOpen ? { right: 3, left: 'auto', background: '#fff' } : { left: 3, right: 'auto', background: isDark ? 'rgba(255,255,255,0.4)' : '#ffffff' })
              }} />
            </button>
          </div>
        </div>

        {/* Re-open the tracking card for status indicators */}
        <div style={{ display: autoEnabled ? 'flex' : 'none', flexDirection: 'column', gap: '0.5rem', borderRadius: 16, padding: autoEnabled && (status !== 'idle' || distance !== null) ? '1rem' : '0', background: autoEnabled && (status !== 'idle' || distance !== null) ? (isDark ? 'rgba(255,255,255,0.06)' : '#f8fafc') : 'transparent', border: autoEnabled && (status !== 'idle' || distance !== null) ? (isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e2e8f0') : 'none' }}>
          {autoEnabled && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {status === "connecting" && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'rgba(255,255,255,0.8)', fontSize: '0.875rem' }}>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Conectando ao GPS...</span>
                </div>
              )}
              {status === "active" && distance !== null && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'rgba(255,255,255,0.8)', fontSize: '0.875rem' }}>
                  <MapPin className="w-4 h-4" />
                  <span>
                    {distance}m do condomínio
                    {direction === "approaching" ? " — Aproximando ↓" : " — Afastando ↑"}
                  </span>
                </div>
              )}
              {status === "active" && distance === null && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'rgba(255,255,255,0.8)', fontSize: '0.875rem' }}>
                  <Shield className="w-4 h-4" />
                  <span>Monitorando sua localização...</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ═══ Notification Status Cards ═══ */}
        {gateAutoOpened && (
          <div style={{ borderRadius: 20, padding: '1.5rem', textAlign: 'center', background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', color: '#fff', boxShadow: '0 8px 32px rgba(59,130,246,0.25)' }}>
            <div style={{ width: 56, height: 56, borderRadius: 18, background: 'rgba(255,255,255,0.2)', border: '1.5px solid rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem' }}>
              <Car className="w-7 h-7" />
            </div>
            <p style={{ fontSize: '1.1rem', fontWeight: 800 }}>{gateAutoOpened} Aberto!</p>
            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.875rem', marginTop: '0.25rem' }}>O portão foi aberto automaticamente.</p>
          </div>
        )}

        {status === "confirmed" && (
          <div style={{ borderRadius: 20, padding: '1.5rem', textAlign: 'center', background: 'linear-gradient(135deg, #10b981, #059669)', color: isDark ? '#fff' : "#1e293b", boxShadow: '0 8px 32px rgba(16,185,129,0.25)' }}>
            <div style={{ width: 56, height: 56, borderRadius: 18, background: 'rgba(255,255,255,0.2)', border: isDark ? '1.5px solid rgba(255,255,255,0.3)' : '1.5px solid #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem' }}>
              <Check className="w-7 h-7" />
            </div>
            <p style={{ fontSize: '1.1rem', fontWeight: 800 }}>Chegada Confirmada!</p>
            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.875rem', marginTop: '0.25rem' }}>A portaria confirmou sua chegada.</p>
          </div>
        )}

        {status === "notified" && (
          <div style={{ borderRadius: 20, padding: '1.25rem', background: isDark ? 'rgba(255,255,255,0.08)' : '#f8fafc', border: isDark ? '1.5px solid rgba(255,255,255,0.12)' : '1.5px solid #cbd5e1', color: isDark ? '#fff' : "#1e293b" }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div className="animate-pulse" style={{ width: 44, height: 44, borderRadius: 14, background: 'linear-gradient(135deg, rgba(147,197,253,0.2), rgba(147,197,253,0.05))', border: '1.5px solid rgba(147,197,253,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Navigation className="w-5 h-5" style={{ color: isDark ? '#93c5fd' : "#1e293b" }} />
              </div>
              <div>
                <p style={{ fontWeight: 700, color: isDark ? '#fff' : "#1e293b" }}>Portaria Notificada!</p>
                <p style={{ color: isDark ? '#93c5fd' : "#1e293b", fontSize: '0.875rem' }}>Aguardando confirmação...</p>
              </div>
            </div>
            {distance !== null && (
              <p style={{ color: isDark ? 'rgba(255,255,255,0.7)' : "#475569", fontSize: '0.875rem', marginTop: '0.75rem' }}>Distância: {distance}m</p>
            )}
          </div>
        )}

        {errorMsg && (
          <div style={{ borderRadius: 16, padding: '1rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <AlertTriangle style={{ width: 20, height: 20, color: '#ef4444', flexShrink: 0 }} />
            <p style={{ color: '#fca5a5', fontSize: '0.875rem' }}>{errorMsg}</p>
          </div>
        )}

        {/* ═══ Config Toggle ═══ */}
        <button
          onClick={() => setShowConfig(!showConfig)}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '1rem', borderRadius: 16,
            background: isDark ? 'rgba(255,255,255,0.06)' : '#f8fafc', border: isDark ? '1.5px solid rgba(255,255,255,0.1)' : '1.5px solid #cbd5e1',
            color: isDark ? '#fff' : "#1e293b", cursor: 'pointer', transition: 'all 0.2s'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Settings className="w-5 h-5" style={{ color: isDark ? '#93c5fd' : "#1e293b" }} />
            <span style={{ fontWeight: 600, color: isDark ? '#fff' : "#1e293b" }}>Configurações</span>
          </div>
          <span style={{ fontSize: '0.75rem', color: isDark ? '#7dd3fc' : '#475569' }}>
            {vehicleType === "proprio" ? selectedVehicle?.placa || "Sem veículo" : "Uber/Táxi"} · {radius}m
          </span>
        </button>

        <p
          style={{
            marginTop: '-0.25rem',
            fontSize: '0.75rem',
            lineHeight: 1.5,
            color: isDark ? '#93c5fd' : '#64748b',
            padding: '0 0.25rem',
          }}
        >
          Observação: o Portão Automático só será acionado quando o Rastreamento estiver ativo e você entrar no raio configurado.
        </p>

        {showConfig && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }} className="animate-in fade-in duration-200">
            {/* Schedule info */}
            {config && (
              <div style={{ borderRadius: 16, padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', background: isDark ? 'rgba(255,255,255,0.06)' : '#f8fafc', border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #cbd5e1' }}>
                <Clock className="w-5 h-5" style={{ color: isDark ? '#93c5fd' : "#1e293b", flexShrink: 0 }} />
                <div>
                  <p style={{ fontSize: '0.75rem', color: isDark ? '#7dd3fc' : '#475569' }}>Horário ativo</p>
                  <p style={{ fontSize: '0.875rem', fontWeight: 600, color: isDark ? '#fff' : "#1e293b" }}>{config.horario_inicio} — {config.horario_fim}</p>
                </div>
              </div>
            )}

            {/* Radius slider */}
            <div>
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: isDark ? '#fff' : "#1e293b", display: 'block', marginBottom: '0.5rem' }}>
                Raio de detecção: <span style={{ color: isDark ? '#7dd3fc' : '#475569', fontWeight: 700 }}>{radius}m</span>
              </span>
              <input
                type="range"
                min={50}
                max={500}
                step={25}
                value={radius}
                onChange={(e) => saveRadius(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#3b82f6' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: isDark ? '#7dd3fc' : '#475569', marginTop: '0.25rem' }}>
                <span>50m</span>
                <span>500m</span>
              </div>
            </div>

            {/* Vehicle type */}
            <div>
              <p style={{ fontSize: '0.875rem', fontWeight: 600, color: isDark ? '#fff' : "#1e293b", marginBottom: '0.75rem' }}>Tipo de veículo</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <button
                  onClick={() => saveVehicleType("proprio")}
                  style={{
                    padding: '1rem', borderRadius: 16, textAlign: 'center', transition: 'all 0.2s', cursor: 'pointer',
                    background: vehicleType === "proprio" ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.06)',
                    border: vehicleType === "proprio" ? '2px solid rgba(59,130,246,0.5)' : '2px solid rgba(255,255,255,0.1)',
                    color: isDark ? '#fff' : "#1e293b",
                    position: 'relative',
                  }}
                >
                  {vehicleType === "proprio" && (
                    <div style={{ position: 'absolute', top: 8, right: 8 }}>
                      <CheckCircle2 style={{ width: 18, height: 18, color: '#4ade80' }} />
                    </div>
                  )}
                  <Car style={{ width: 24, height: 24, margin: '0 auto 0.25rem', color: vehicleType === "proprio" ? '#60a5fa' : '#93c5fd' }} />
                  <p style={{ fontSize: '0.875rem', fontWeight: 600, color: isDark ? '#fff' : "#1e293b" }}>Veículo Próprio</p>
                </button>
                <button
                  onClick={() => saveVehicleType("uber_taxi")}
                  style={{
                    padding: '1rem', borderRadius: 16, textAlign: 'center', transition: 'all 0.2s', cursor: 'pointer',
                    background: vehicleType === "uber_taxi" ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.06)',
                    border: vehicleType === "uber_taxi" ? '2px solid rgba(59,130,246,0.5)' : '2px solid rgba(255,255,255,0.1)',
                    color: isDark ? '#fff' : "#1e293b",
                    position: 'relative',
                  }}
                >
                  {vehicleType === "uber_taxi" && (
                    <div style={{ position: 'absolute', top: 8, right: 8 }}>
                      <CheckCircle2 style={{ width: 18, height: 18, color: '#4ade80' }} />
                    </div>
                  )}
                  <Navigation style={{ width: 24, height: 24, margin: '0 auto 0.25rem', color: vehicleType === "uber_taxi" ? '#60a5fa' : '#93c5fd' }} />
                  <p style={{ fontSize: '0.875rem', fontWeight: 600, color: isDark ? '#fff' : "#1e293b" }}>Uber / Táxi</p>
                </button>
              </div>
            </div>

            {/* Vehicle details - Proprio */}
            {vehicleType === "proprio" && myVehicles.length > 0 && (
              <div>
                <p style={{ fontSize: '0.875rem', fontWeight: 600, color: isDark ? '#fff' : "#1e293b", marginBottom: '0.5rem' }}>Selecione o veículo</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {myVehicles.map((v) => (
                    <button
                      key={v.placa}
                      onClick={() => saveVehicleConfig(v)}
                      style={{
                        width: '100%', padding: '0.75rem', borderRadius: 16, textAlign: 'left' as const, transition: 'all 0.2s',
                        display: 'flex', alignItems: 'center', cursor: 'pointer', color: isDark ? '#fff' : "#1e293b",
                        background: selectedVehicle?.placa === v.placa ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.06)',
                        border: selectedVehicle?.placa === v.placa ? '2px solid rgba(59,130,246,0.5)' : '2px solid rgba(255,255,255,0.1)'
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <p style={{ fontWeight: 700, color: isDark ? '#fff' : "#1e293b" }}>{v.placa}</p>
                        <p style={{ fontSize: '0.75rem', color: isDark ? '#93c5fd' : "#1e293b" }}>{v.modelo} {v.cor && `· ${v.cor}`}</p>
                      </div>
                      <div style={{
                        width: 24, height: 24, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0, marginLeft: '0.75rem',
                        ...(selectedVehicle?.placa === v.placa
                          ? { background: '#3b82f6', color: isDark ? '#fff' : "#1e293b" }
                          : { border: isDark ? '2px solid rgba(255,255,255,0.2)' : '2px solid #cbd5e1' })
                      }}>
                        {selectedVehicle?.placa === v.placa && <CheckCircle2 className="w-6 h-6" />}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {vehicleType === "proprio" && myVehicles.length === 0 && (
              <div style={{ padding: '0.75rem', borderRadius: 16, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)' }}>
                <p style={{ fontSize: '0.875rem', color: '#fbbf24' }}>Nenhum veículo cadastrado. A portaria será notificada sem dados do veículo.</p>
              </div>
            )}

            {/* Vehicle details - Uber/Taxi */}
            {vehicleType === "uber_taxi" && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div>
                  <span style={{ fontSize: '0.875rem', color: isDark ? '#93c5fd' : "#1e293b", display: 'block', marginBottom: '0.25rem' }}>Placa do veículo</span>
                  <input
                    type="text"
                    value={uberPlate}
                    onChange={(e) => setUberPlate(e.target.value.toUpperCase())}
                    placeholder="ABC1D23"
                    maxLength={7}
                    style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: 14, background: isDark ? 'rgba(255,255,255,0.06)' : '#f8fafc', border: isDark ? '1.5px solid rgba(255,255,255,0.1)' : '1.5px solid #cbd5e1', color: isDark ? '#fff' : "#1e293b", fontSize: '0.875rem', outline: 'none', transition: 'border-color 0.2s' }}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <span style={{ fontSize: '0.875rem', color: isDark ? '#93c5fd' : "#1e293b", display: 'block', marginBottom: '0.25rem' }}>Modelo</span>
                    <input
                      type="text"
                      value={uberModel}
                      onChange={(e) => setUberModel(e.target.value)}
                      placeholder="Ex: HB20"
                      style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: 14, background: isDark ? 'rgba(255,255,255,0.06)' : '#f8fafc', border: isDark ? '1.5px solid rgba(255,255,255,0.1)' : '1.5px solid #cbd5e1', color: isDark ? '#fff' : "#1e293b", fontSize: '0.875rem', outline: 'none', transition: 'border-color 0.2s' }}
                    />
                  </div>
                  <div>
                    <span style={{ fontSize: '0.875rem', color: isDark ? '#93c5fd' : "#1e293b", display: 'block', marginBottom: '0.25rem' }}>Cor</span>
                    <input
                      type="text"
                      value={uberColor}
                      onChange={(e) => setUberColor(e.target.value)}
                      placeholder="Ex: Prata"
                      style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: 14, background: isDark ? 'rgba(255,255,255,0.06)' : '#f8fafc', border: isDark ? '1.5px solid rgba(255,255,255,0.1)' : '1.5px solid #cbd5e1', color: isDark ? '#fff' : "#1e293b", fontSize: '0.875rem', outline: 'none', transition: 'border-color 0.2s' }}
                    />
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '0.875rem', color: isDark ? '#93c5fd' : "#1e293b", display: 'block', marginBottom: '0.25rem' }}>Nome do motorista</span>
                  <input
                    type="text"
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    placeholder="Ex: João Silva"
                    style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: 14, background: isDark ? 'rgba(255,255,255,0.06)' : '#f8fafc', border: isDark ? '1.5px solid rgba(255,255,255,0.1)' : '1.5px solid #cbd5e1', color: isDark ? '#fff' : "#1e293b", fontSize: '0.875rem', outline: 'none', transition: 'border-color 0.2s' }}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
