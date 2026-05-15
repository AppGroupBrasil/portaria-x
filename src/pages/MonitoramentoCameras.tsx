import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef, useCallback } from "react";
import TutorialButton, { TSection, TStep, TBullet } from "@/components/TutorialButton";
import {
  ArrowLeft,
  Camera,
  Maximize2,
  Minimize2,

  Play,
  Pause,
  SkipForward,
  Settings,
  Loader2,
  Video,

  MapPin,
  Clock,

  Monitor,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import ComoFunciona from "@/components/ComoFunciona";

// ─── Types ───────────────────────────────────────────────
interface CameraData {
  id: number;
  nome: string;
  setor: string;
  localizacao: string | null;
  url_stream: string | null;
  tipo_stream: string;
  protocolo: string;
  ip: string | null;
  porta: number | null;
  ativa: number;
  ordem: number;
}

type LayoutMode = "1x1" | "2x2" | "3x3" | "4x4";

const LAYOUT_OPTIONS: { value: LayoutMode; label: string; cols: number }[] = [
  { value: "1x1", label: "1 Câmera", cols: 1 },
  { value: "2x2", label: "2×2", cols: 2 },
  { value: "3x3", label: "3×3", cols: 3 },
  { value: "4x4", label: "4×4", cols: 4 },
];

const RONDA_INTERVALS = [5, 10, 15, 30, 60];

const SETOR_LABELS: Record<string, string> = {
  portaria: "Portaria", garagem: "Garagem", hall: "Hall", piscina: "Piscina",
  academia: "Academia", playground: "Playground", salao_festas: "Salão de Festas",
  perimetro: "Perímetro", elevador: "Elevador", estacionamento: "Estacionamento",
  area_comum: "Área Comum", outros: "Outros",
};

export default function MonitoramentoCameras() {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const navigate = useNavigate();

  const [cameras, setCameras] = useState<CameraData[]>([]);
  const [loading, setLoading] = useState(true);
  const [layout, setLayout] = useState<LayoutMode>("2x2");
  const [selectedCamera, setSelectedCamera] = useState<CameraData | null>(null);
  const [fullscreen, setFullscreen] = useState(false);

  // Ronda virtual state
  const [rondaActive, setRondaActive] = useState(false);
  const [rondaInterval, setRondaInterval] = useState(10);
  const [rondaIndex, setRondaIndex] = useState(0);
  const rondaTimer = useRef<NodeJS.Timeout | null>(null);

  // Filter
  const [filterSetor, setFilterSetor] = useState<string>("all");
  const [showSettings, setShowSettings] = useState(false);

  // Clock
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Fetch cameras
  const fetchCameras = async () => {
    try {
      const res = await apiFetch("/api/cameras");
      if (res.ok) {
        const data = await res.json();
        setCameras(data.filter((c: CameraData) => c.ativa));
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    fetchCameras();
    // Refresh every 30s to detect status changes
    const interval = setInterval(fetchCameras, 30000);
    return () => clearInterval(interval);
  }, []);

  // Filtered cameras
  const filteredCameras = filterSetor === "all"
    ? cameras
    : cameras.filter((c) => c.setor === filterSetor);

  // Unique setores
  const availableSetores = [...new Set(cameras.map((c) => c.setor))];

  // ─── Ronda Virtual ────────────────────────────────────
  const activeCams = filteredCameras;

  const startRonda = useCallback(() => {
    setRondaActive(true);
    setRondaIndex(0);
    setLayout("1x1");
  }, []);

  const stopRonda = useCallback(() => {
    setRondaActive(false);
    if (rondaTimer.current) clearInterval(rondaTimer.current);
  }, []);

  const nextRonda = useCallback(() => {
    setRondaIndex((prev) => (prev + 1) % activeCams.length);
  }, [activeCams.length]);

  useEffect(() => {
    if (rondaActive && activeCams.length > 1) {
      rondaTimer.current = setInterval(() => {
        setRondaIndex((prev) => (prev + 1) % activeCams.length);
      }, rondaInterval * 1000);
      return () => {
        if (rondaTimer.current) clearInterval(rondaTimer.current);
      };
    }
  }, [rondaActive, rondaInterval, activeCams.length]);

  // Cameras to show in grid
  const layoutCols = LAYOUT_OPTIONS.find((l) => l.value === layout)?.cols || 2;
  const maxCams = layoutCols * layoutCols;

  const displayCameras = rondaActive
    ? [activeCams[rondaIndex % activeCams.length]].filter(Boolean)
    : activeCams.slice(0, maxCams);

  // ─── Camera Feed Component ────────────────────────────
  const CameraFeed = ({ camera, isLarge }: { camera: CameraData; isLarge?: boolean }) => {
    const [error, setError] = useState(false);
    const [loadingFeed, setLoadingFeed] = useState(true);
    const imgRef = useRef<HTMLImageElement>(null);

    const height = isLarge ? "100%" : layout === "1x1" ? "60vh" : layout === "2x2" ? "35vh" : layout === "3x3" ? "25vh" : "18vh";

    return (
      <div
        style={{
          position: "relative", borderRadius: isLarge ? "0" : "12px", overflow: "hidden",
          background: "#0a0a0a", height,
          border: isLarge ? "none" : `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "#e2e8f0"}`,
          cursor: "pointer",
        }}
        onClick={() => !isLarge && setSelectedCamera(camera)}
      >
        {/* Camera feed */}
        {camera.url_stream ? (
          camera.tipo_stream === "mjpeg" || camera.tipo_stream === "snapshot" ? (
            <>
              {loadingFeed && (
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--muted-foreground)" }} />
                </div>
              )}
              <img
                ref={imgRef}
                src={camera.url_stream}
                alt={camera.nome}
                onLoad={() => setLoadingFeed(false)}
                onError={() => { setError(true); setLoadingFeed(false); }}
                style={{
                  width: "100%", height: "100%", objectFit: "cover",
                  display: error ? "none" : "block",
                }}
              />
            </>
          ) : camera.tipo_stream === "hls" ? (
            <video
              src={camera.url_stream}
              autoPlay
              muted
              playsInline
              onError={() => setError(true)}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : null
        ) : null}

        {/* Placeholder / Error overlay */}
        {(error || !camera.url_stream) && (
          <div style={{
            position: "absolute", inset: 0, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: "12px",
            background: "linear-gradient(135deg, #0062d1 0%, #003d99 50%, #001d4a 100%)",
          }}>
            <div style={{
              width: "60px", height: "60px", borderRadius: "50%",
              background: "rgba(99,102,241,0.15)", display: "flex",
              alignItems: "center", justifyContent: "center",
            }}>
              <Video className="w-7 h-7" style={{ color: "#6366f1" }} />
            </div>
            <p style={{ fontSize: "14px", fontWeight: 600, color: "#94a3b8" }}>
              {camera.nome}
            </p>
            {!camera.url_stream && (
              <p style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>URL não configurada</p>
            )}
            {error && (
              <p style={{ fontSize: "12px", color: "#ef4444" }}>Sem conexão</p>
            )}
          </div>
        )}

        {/* Overlay info */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          background: "linear-gradient(transparent, rgba(0,0,0,0.7))",
          padding: isLarge ? "16px 20px" : "8px 12px",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <p style={{ fontSize: isLarge ? "14px" : "11px", fontWeight: 700, color: "#fff" }}>
                {camera.nome}
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "2px" }}>
                <span style={{
                  fontSize: "11px", fontWeight: 600, padding: "1px 6px", borderRadius: "4px",
                  background: "rgba(99,102,241,0.3)", color: "#a5b4fc",
                }}>
                  {SETOR_LABELS[camera.setor] || camera.setor}
                </span>
                {camera.localizacao && (
                  <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)" }}>
                    {camera.localizacao}
                  </span>
                )}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <div style={{
                width: "8px", height: "8px", borderRadius: "50%",
                background: error ? "#ef4444" : "#10b981",
                boxShadow: error ? "0 0 6px #ef4444" : "0 0 6px #10b981",
              }} />
              <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)", fontVariantNumeric: "tabular-nums" }}>
                REC
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: "#0a0a0a" }}>
      {/* ═══ Header ═══ */}
      <header style={{
        position: "sticky", top: 0, zIndex: 40,
        background: "linear-gradient(135deg, rgba(15,23,42,0.95), rgba(30,41,59,0.95))",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button
              onClick={() => navigate(-1)}
              style={{
                padding: "8px", borderRadius: "10px", border: "none",
                background: "rgba(255,255,255,0.08)", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <ArrowLeft className="w-6 h-6" style={{ color: "#fff" }} />
            </button>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <Monitor className="w-6 h-6" style={{ color: "#6366f1" }} />
                <span style={{ fontWeight: 700, fontSize: "16px", color: "#fff" }}>Monitoramento</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "2px" }}>
                <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", fontVariantNumeric: "tabular-nums" }}>
                  <Clock className="w-4 h-4 inline" style={{ verticalAlign: "-1px", marginRight: "4px" }} />
                  {currentTime.toLocaleTimeString("pt-BR")}
                </span>
                <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.25)" }}>·</span>
                <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)" }}>
                  {cameras.length} câmera{cameras.length !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
          </div>

          <TutorialButton title="Monitoramento de Câmeras">
            <TSection icon={<span>📋</span>} title="O QUE É ESTA FUNÇÃO?">
              <p><strong>Monitoramento ao vivo</strong> de todas as câmeras de segurança do condomínio em uma única tela. Você vê as imagens em tempo real, pode alternar entre layouts (1, 4 ou 9 câmeras), ampliar qualquer câmera em tela cheia e ativar a <strong>ronda automática</strong> que alterna entre câmeras automaticamente.</p>
            </TSection>
            <TSection icon={<span>🏗️</span>} title="COMO USAR">
              <TStep n={1}>As câmeras cadastradas aparecem <strong>automaticamente</strong> no grid de monitoramento</TStep>
              <TStep n={2}>Escolha o <strong>layout do grid</strong> no topo da tela:</TStep>
              <TBullet>→ <strong>1x1</strong> — Uma câmera em tela cheia (ideal para foco ou ronda)</TBullet>
              <TBullet>→ <strong>2x2</strong> — 4 câmeras simultâneas (bom equilíbrio)</TBullet>
              <TBullet>→ <strong>3x3</strong> — 9 câmeras simultâneas (visão geral mais completa)</TBullet>
              <TStep n={3}>Clique em qualquer câmera para <strong>ampliar em tela cheia</strong></TStep>
              <TStep n={4}>Ative a <strong>ronda automática</strong> para alternar entre câmeras em intervalos regulares</TStep>
              <TStep n={5}>O <strong>horário</strong> e <strong>data</strong> aparecem atualizados ao vivo no cabeçalho</TStep>
            </TSection>
            <TSection icon={<span>🔧</span>} title="FUNÇÕES DISPONÍVEIS">
              <TBullet><strong>Ronda automática</strong> — No modo 1x1, alterna automaticamente entre câmeras a cada X segundos</TBullet>
              <TBullet><strong>Status em tempo real</strong> — Indicador verde (online) ou vermelho (offline) em cada câmera</TBullet>
              <TBullet><strong>Tela cheia</strong> — Clique em qualquer câmera para ampliar</TBullet>
              <TBullet><strong>Relógio ao vivo</strong> — Horário e data atualizados em tempo real no header</TBullet>
              <TBullet><strong>Multi-formato</strong> — Suporte a MJPEG, HLS e RTSP</TBullet>
            </TSection>
            <TSection icon={<span>📱</span>} title="LAYOUTS DE MONITORAMENTO">
              <TBullet><strong>1x1</strong> — Uma câmera grande. Ideal para vigilância focada ou ronda automática</TBullet>
              <TBullet><strong>2x2</strong> — 4 câmeras em grade. Bom para monitorar entradas e garagem simultaneamente</TBullet>
              <TBullet><strong>3x3</strong> — 9 câmeras em grade. Visão completa de todo o condomínio</TBullet>
            </TSection>
            <TSection icon={<span>⭐</span>} title="DICAS IMPORTANTES">
              <TBullet>Se uma câmera aparece <strong>offline (vermelha)</strong>, pode estar desligada ou sem conexão — avise o técnico</TBullet>
              <TBullet>A <strong>ronda automática</strong> é ideal para quando o porteiro precisa fazer outras tarefas</TBullet>
              <TBullet>Para adicionar ou remover câmeras, acesse o <strong>Cadastro de Câmeras</strong> (menu do síndico)</TBullet>
              <TBullet>Em condomínios com muitas câmeras, use o <strong>layout 3x3</strong> durante o dia e <strong>1x1 com ronda</strong> à noite</TBullet>
            </TSection>
          </TutorialButton>

          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            {/* Layout picker */}
            {LAYOUT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => { setLayout(opt.value); if (rondaActive && opt.value !== "1x1") stopRonda(); }}
                style={{
                  padding: "6px 10px", borderRadius: "8px", border: "none",
                  background: layout === opt.value ? "rgba(99,102,241,0.3)" : "rgba(255,255,255,0.06)",
                  color: layout === opt.value ? "#a5b4fc" : "rgba(255,255,255,0.4)",
                  fontSize: "12px", fontWeight: 600, cursor: "pointer",
                }}
              >
                {opt.label}
              </button>
            ))}

            {/* Settings */}
            <button
              onClick={() => setShowSettings(!showSettings)}
              style={{
                padding: "8px", borderRadius: "10px", border: "none",
                background: showSettings ? "rgba(99,102,241,0.3)" : "rgba(255,255,255,0.06)",
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <Settings className="w-5 h-5" style={{ color: showSettings ? "#a5b4fc" : "rgba(255,255,255,0.5)" }} />
            </button>
          </div>
        </div>

        {/* ═══ Settings Panel ═══ */}
        {showSettings && (
          <div style={{
            padding: "12px 16px", borderTop: "1px solid rgba(255,255,255,0.06)",
            display: "flex", flexWrap: "wrap", alignItems: "center", gap: "12px",
          }}>
            {/* Filter by sector */}
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <MapPin className="w-3.5 h-3.5" style={{ color: "#94a3b8" }} />
              <select
                value={filterSetor}
                onChange={(e) => setFilterSetor(e.target.value)}
                style={{
                  padding: "5px 28px 5px 8px", borderRadius: "8px", fontSize: "13px",
                  background: "rgba(255,255,255,0.06)", color: "#e2e8f0",
                  border: "1px solid rgba(255,255,255,0.1)", cursor: "pointer",
                  appearance: "none" as const,
                }}
              >
                <option value="all">Todos os Setores</option>
                {availableSetores.map((s) => (
                  <option key={s} value={s}>{SETOR_LABELS[s] || s}</option>
                ))}
              </select>
            </div>

            {/* Ronda Virtual */}
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginLeft: "auto" }}>
              <span style={{ fontSize: "13px", color: "#94a3b8", fontWeight: 600 }}>Ronda Virtual:</span>
              {!rondaActive ? (
                <button
                  onClick={startRonda}
                  disabled={activeCams.length < 2}
                  style={{
                    padding: "5px 12px", borderRadius: "8px", border: "none",
                    background: activeCams.length >= 2 ? "rgba(16,185,129,0.2)" : "rgba(255,255,255,0.04)",
                    color: activeCams.length >= 2 ? "#10b981" : "#475569",
                    fontSize: "13px", fontWeight: 600, cursor: activeCams.length >= 2 ? "pointer" : "not-allowed",
                    display: "flex", alignItems: "center", gap: "4px",
                  }}
                >
                  <Play className="w-3.5 h-3.5" /> Iniciar
                </button>
              ) : (
                <>
                  <button
                    onClick={stopRonda}
                    style={{
                      padding: "5px 12px", borderRadius: "8px", border: "none",
                      background: "rgba(239,68,68,0.2)", color: "#ef4444",
                      fontSize: "13px", fontWeight: 600, cursor: "pointer",
                      display: "flex", alignItems: "center", gap: "4px",
                    }}
                  >
                    <Pause className="w-3.5 h-3.5" /> Parar
                  </button>
                  <button
                    onClick={nextRonda}
                    style={{
                      padding: "5px 10px", borderRadius: "8px", border: "none",
                      background: "rgba(255,255,255,0.08)", color: "#e2e8f0",
                      fontSize: "13px", cursor: "pointer",
                      display: "flex", alignItems: "center",
                    }}
                  >
                    <SkipForward className="w-3.5 h-3.5" />
                  </button>
                </>
              )}

              {/* Interval picker */}
              <select
                value={rondaInterval}
                onChange={(e) => setRondaInterval(Number.parseInt(e.target.value))}
                style={{
                  padding: "5px 8px", borderRadius: "8px", fontSize: "13px",
                  background: "rgba(255,255,255,0.06)", color: "#e2e8f0",
                  border: "1px solid rgba(255,255,255,0.1)", cursor: "pointer",
                }}
              >
                {RONDA_INTERVALS.map((s) => (
                  <option key={s} value={s}>{s}s</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Ronda progress bar */}
        {rondaActive && (
          <div style={{ height: "3px", background: "rgba(255,255,255,0.06)" }}>
            <div
              style={{
                height: "100%",
                background: "linear-gradient(90deg, #6366f1, #10b981)",
                animation: `rondaProgress ${rondaInterval}s linear infinite`,
                width: "0%",
              }}
            />
            <style>{`
              @keyframes rondaProgress {
                from { width: 0%; }
                to { width: 100%; }
              }
            `}</style>
          </div>
        )}
      </header>

      {/* ═══ Camera Grid ═══ */}
      <main style={{ flex: 1, padding: "8px", overflow: "auto" }}>
        <div style={{ padding: "4px 8px 8px" }}>
          <ComoFunciona steps={[
            "📹 Visualize câmeras do condomínio em tempo real",
            "🖥️ Modo grid ou tela cheia para cada câmera",
            "📸 Capture snapshots a qualquer momento",
            "⚙️ Câmeras configuradas pelo síndico",
          ]} />
        </div>
        {cameras.length === 0 ? (
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", height: "60vh", gap: "16px",
          }}>
            <div style={{
              width: "80px", height: "80px", borderRadius: "50%",
              background: "rgba(99,102,241,0.1)", display: "flex",
              alignItems: "center", justifyContent: "center",
            }}>
              <Camera className="w-10 h-10" style={{ color: "#6366f1" }} />
            </div>
            <p style={{ fontSize: "16px", fontWeight: 600, color: "#94a3b8" }}>
              Nenhuma câmera ativa
            </p>
            <p style={{ fontSize: "14px", color: "var(--muted-foreground)", textAlign: "center", maxWidth: "300px" }}>
              Peça ao síndico para cadastrar as câmeras do condomínio
            </p>
            {(user?.role === "sindico" || user?.role === "master" || user?.role === "administradora") && (
              <button
                onClick={() => navigate("/sindico/cameras")}
                style={{
                  padding: "10px 24px", borderRadius: "10px", border: "none",
                  background: "linear-gradient(135deg, #0062d1 0%, #003d99 50%, #001d4a 100%)", color: "#fff",
                  fontWeight: 600, fontSize: "14px", cursor: "pointer", marginTop: "8px",
                }}
              >
                Cadastrar Câmeras
              </button>
            )}
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${rondaActive ? 1 : layoutCols}, 1fr)`,
              gap: "6px",
              height: "100%",
            }}
          >
            {displayCameras.map((camera) => (
              <CameraFeed key={camera.id} camera={camera} />
            ))}
          </div>
        )}
      </main>

      {/* ═══ Fullscreen Camera Modal ═══ */}
      {selectedCamera && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 100,
            background: "#000", display: "flex", flexDirection: "column",
          }}
        >
          {/* Top bar */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "12px 16px",
            background: "linear-gradient(rgba(0,0,0,0.8), transparent)",
            position: "absolute", top: 0, left: 0, right: 0, zIndex: 10,
          }}>
            <div>
              <p style={{ fontSize: "16px", fontWeight: 700, color: "#fff" }}>
                {selectedCamera.nome}
              </p>
              <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)" }}>
                {SETOR_LABELS[selectedCamera.setor]}
                {selectedCamera.localizacao ? ` · ${selectedCamera.localizacao}` : ""}
              </p>
            </div>
            <div style={{ display: "flex", gap: "12px" }}>
              <button
                onClick={() => {
                  const el = document.documentElement;
                  if (!fullscreen) {
                    el.requestFullscreen?.();
                    setFullscreen(true);
                  } else {
                    document.exitFullscreen?.();
                    setFullscreen(false);
                  }
                }}
                style={{
                  padding: "8px", borderRadius: "10px", border: "none",
                  background: "rgba(255,255,255,0.1)", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                {fullscreen
                  ? <Minimize2 className="w-6 h-6" style={{ color: "#fff" }} />
                  : <Maximize2 className="w-6 h-6" style={{ color: "#fff" }} />}
              </button>
              <button
                onClick={() => {
                  setSelectedCamera(null);
                  if (fullscreen) { document.exitFullscreen?.(); setFullscreen(false); }
                }}
                style={{
                  padding: "8px 16px", borderRadius: "10px", border: "none",
                  background: "rgba(255,255,255,0.1)", cursor: "pointer",
                  color: "#fff", fontSize: "14px", fontWeight: 600,
                }}
              >
                Fechar
              </button>
            </div>
          </div>

          {/* Feed */}
          <div style={{ flex: 1 }}>
            <CameraFeed camera={selectedCamera} isLarge />
          </div>

          {/* Bottom bar - timestamp */}
          <div style={{
            position: "absolute", bottom: 0, left: 0, right: 0,
            background: "linear-gradient(transparent, rgba(0,0,0,0.8))",
            padding: "16px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{
                width: "10px", height: "10px", borderRadius: "50%",
                background: "#ef4444", boxShadow: "0 0 8px #ef4444",
                animation: "blink 1s ease-in-out infinite",
              }} />
              <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.6)", fontWeight: 600 }}>
                AO VIVO
              </span>
              <style>{`
                @keyframes blink {
                  0%, 100% { opacity: 1; }
                  50% { opacity: 0.3; }
                }
              `}</style>
            </div>
            <span style={{
              fontSize: "14px", color: "rgba(255,255,255,0.4)",
              fontVariantNumeric: "tabular-nums", fontFamily: "monospace",
            }}>
              {currentTime.toLocaleDateString("pt-BR")} {currentTime.toLocaleTimeString("pt-BR")}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
