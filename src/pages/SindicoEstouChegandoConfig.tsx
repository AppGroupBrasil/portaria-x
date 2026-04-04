/**
 * ═══════════════════════════════════════════════════════════
 * SÍNDICO — Configuração Estou Chegando
 * Define: localização do condomínio (mapa), horário ativo,
 * raio padrão, habilitar/desabilitar feature
 * ═══════════════════════════════════════════════════════════
 */

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "@/lib/api";
import { DEFAULT_MAP_CENTER, GOOGLE_MAPS_API_KEY, GOOGLE_MAPS_MAP_ID } from "@/lib/googleMaps";
import TutorialButton, { TSection, TStep, TBullet } from "@/components/TutorialButton";
import {
  ArrowLeft,
  MapPin,
  Clock,
  Save,
  Loader2,
  CheckCircle,
  Navigation,
  ToggleLeft,
  ToggleRight,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { CircleF, GoogleMap, LoadScriptNext, MarkerF } from "@react-google-maps/api";
import { useTheme } from "@/hooks/useTheme";

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

export default function SindicoEstouChegandoConfig() {
  const { p } = useTheme();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [enabled, setEnabled] = useState(true);
  const [infoOpen, setInfoOpen] = useState(false);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [horarioInicio, setHorarioInicio] = useState("22:00");
  const [horarioFim, setHorarioFim] = useState("06:00");
  const [radiusDefault, setRadiusDefault] = useState(200);

  // Load current config
  useEffect(() => {
    apiFetch("/api/estou-chegando/config")
      .then(r => r.ok ? r.json() : null)
      .then(cfg => {
        if (cfg) {
          setEnabled(cfg.enabled !== false);
          setLatitude(cfg.latitude);
          setLongitude(cfg.longitude);
          setHorarioInicio(cfg.horario_inicio || "22:00");
          setHorarioFim(cfg.horario_fim || "06:00");
          setRadiusDefault(cfg.radius_default || 200);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Use browser geolocation to set initial position
  const useCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude);
        setLongitude(pos.coords.longitude);
      },
      () => {},
      { enableHighAccuracy: true }
    );
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await apiFetch("/api/estou-chegando/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled,
          latitude,
          longitude,
          horario_inicio: horarioInicio,
          horario_fim: horarioFim,
          radius_default: radiusDefault,
        }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch {}
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center" style={{ background: p.pageBg }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: p.accent }} />
      </div>
    );
  }

  const mapCenter = latitude && longitude ? { lat: latitude, lng: longitude } : DEFAULT_MAP_CENTER;
  const markerIcon = buildMarkerIcon("#ef4444");

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: p.pageBg }}>
      {/* Header */}
      <header className="sticky top-0 z-40" style={{ background: p.headerBg, borderBottom: p.headerBorder, boxShadow: p.headerShadow, color: p.text }}>
        <div className="flex items-center gap-3" style={{ padding: "1rem 1.5rem", height: "4.5rem" }}>
          <button onClick={() => navigate(-1)} style={{ width: 40, height: 40, borderRadius: 12, background: p.btnBg, border: p.btnBorder, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: p.text }}>
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span style={{ fontWeight: 700, fontSize: 18, flex: 1 }}>Config. Estou Chegando</span>
          <TutorialButton title="Config. Estou Chegando — Sindico">
            <TSection icon={<span>⚙️</span>} title="O QUE E ESTA FUNCAO?">
              <p>Esta pagina permite ao <strong>sindico configurar</strong> a funcionalidade "Estou Chegando" do condominio. Aqui voce define a <strong>localizacao exata</strong> do condominio no mapa, o <strong>horario de funcionamento</strong>, o <strong>raio de deteccao</strong> e pode <strong>ativar ou desativar</strong> a funcao para todos os moradores.</p>
              <p style={{ marginTop: "8px" }}>A funcao avisa o porteiro automaticamente quando um morador se aproxima do condominio via GPS. E ideal para <strong>horarios noturnos e madrugada</strong>, quando o porteiro precisa se preparar com antecedencia.</p>
            </TSection>
            <TSection icon={<span>📋</span>} title="PASSO A PASSO DA CONFIGURACAO">
              <TStep n={1}><strong>Ativar a funcao</strong> — Use o toggle "Habilitado" para ligar ou desligar o sistema. Quando desligado, nenhum morador consegue usar.</TStep>
              <TStep n={2}><strong>Definir localizacao no mapa</strong> — Clique no mapa para marcar a posicao exata do condominio (entrada principal). O marcador vermelho indica o ponto escolhido. Voce tambem pode clicar em <strong>"Usar minha localizacao"</strong> para usar o GPS do seu celular.</TStep>
              <TStep n={3}><strong>Configurar horario ativo</strong> — Defina o horario de <strong>inicio</strong> e <strong>fim</strong> em que a funcao estara disponivel. Exemplo: <strong>22:00 ate 06:00</strong> (funciona durante a noite toda, inclusive cruzando meia-noite).</TStep>
              <TStep n={4}><strong>Definir raio padrao</strong> — Ajuste o controle deslizante para definir a distancia (em metros) a partir da qual o porteiro sera notificado. Valores entre <strong>50m e 500m</strong>.</TStep>
              <TStep n={5}><strong>Salvar</strong> — Toque em <strong>"Salvar Configuracao"</strong> para aplicar todas as alteracoes.</TStep>
            </TSection>
            <TSection icon={<span>🗺️</span>} title="LOCALIZACAO NO MAPA">
              <TBullet><strong>Clique no mapa</strong> para posicionar o marcador do condominio. O marcador pode ser reposicionado clicando em outro ponto</TBullet>
              <TBullet><strong>"Usar minha localizacao"</strong> — Se voce estiver no condominio, use esta opcao para capturar automaticamente as coordenadas via GPS</TBullet>
              <TBullet><strong>Precisao importa</strong> — Posicione o marcador na <strong>entrada principal</strong> ou portaria, pois a distancia e calculada a partir deste ponto</TBullet>
              <TBullet>O circulo azul ao redor do marcador mostra visualmente o <strong>raio de deteccao</strong> configurado</TBullet>
            </TSection>
            <TSection icon={<span>🕐</span>} title="HORARIO DE FUNCIONAMENTO">
              <TBullet><strong>Horario noturno recomendado</strong> — Configure para funcionar durante a noite (ex: 22:00 - 06:00) quando ha menos movimento e o porteiro precisa de mais antecedencia</TBullet>
              <TBullet><strong>Cruzamento de meia-noite</strong> — O sistema entende horarios que cruzam meia-noite. Ex: inicio 22:00, fim 06:00 funciona corretamente</TBullet>
              <TBullet><strong>Fora do horario</strong> — Os moradores verao uma mensagem informando que a funcao nao esta disponivel naquele horario</TBullet>
            </TSection>
            <TSection icon={<span>📏</span>} title="RAIO DE DETECCAO">
              <TBullet><strong>50m (minimo)</strong> — Alerta so quando o morador estiver bem perto. Ideal para condominios pequenos ou com portaria na rua</TBullet>
              <TBullet><strong>100-200m</strong> — Bom equilibrio entre antecedencia e precisao. Recomendado para a maioria dos condominios</TBullet>
              <TBullet><strong>300-500m (maximo)</strong> — Da mais tempo para o porteiro se preparar. Ideal para condominios grandes ou em ruas movimentadas</TBullet>
              <TBullet>O morador pode ajustar seu proprio raio, mas nao pode ultrapassar o valor maximo definido aqui</TBullet>
            </TSection>
            <TSection icon={<span>⭐</span>} title="DICAS IMPORTANTES">
              <TBullet><strong>Posicione no mapa com cuidado</strong> — A precisao da localizacao afeta diretamente a qualidade das notificacoes. Use o zoom maximo para posicionar na entrada exata</TBullet>
              <TBullet><strong>Horario noturno e o mais util</strong> — Durante o dia com muito movimento, as notificacoes podem ser excessivas. Noite e madrugada sao os horarios ideais</TBullet>
              <TBullet><strong>Raio de 150-200m</strong> e o mais equilibrado para a maioria dos condominios</TBullet>
              <TBullet>Se desativar a funcao, <strong>todos os moradores</strong> perdem acesso imediatamente. Use com cuidado</TBullet>
              <TBullet>Apos salvar, as configuracoes entram em vigor <strong>imediatamente</strong> para todos os usuarios</TBullet>
            </TSection>
          </TutorialButton>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto" style={{ padding: "1.5rem", paddingBottom: "8rem" }}>

        {/* ── Como funciona barra (dropdown) ── */}
        <div style={{
          background: p.isDarkBase ? "rgba(59,130,246,0.10)" : "#eff6ff",
          border: p.isDarkBase ? "1px solid rgba(59,130,246,0.25)" : "1px solid #bfdbfe",
          borderRadius: 16,
          marginBottom: "1.25rem",
          overflow: "hidden",
        }}>
          {/* Header clicável */}
          <button
            onClick={() => setInfoOpen(!infoOpen)}
            style={{
              width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "0.875rem 1.25rem", background: "transparent", border: "none", cursor: "pointer",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 18 }}>&#128225;</span>
              <span style={{ fontWeight: 700, fontSize: 14, color: p.isDarkBase ? "#93c5fd" : "#1d4ed8" }}>
                Como funciona o Estou Chegando
              </span>
            </div>
            {infoOpen
              ? <ChevronUp style={{ width: 18, height: 18, color: p.isDarkBase ? "#93c5fd" : "#1d4ed8", flexShrink: 0 }} />
              : <ChevronDown style={{ width: 18, height: 18, color: p.isDarkBase ? "#93c5fd" : "#1d4ed8", flexShrink: 0 }} />}
          </button>
          {/* Conteúdo colapsável */}
          {infoOpen && (
            <div style={{ padding: "0 1.25rem 1rem", display: "flex", flexDirection: "column", gap: 8 }}>
              {([
                ["&#128205;", "O morador toca em 'Estou Chegando' no app quando esta a caminho do condominio."],
                ["&#128752;", "O GPS do celular monitora a localizacao em tempo real enquanto ele se aproxima."],
                ["&#128276;", "Quando entra no raio configurado (ex: 150 m), o porteiro recebe notificacao automatica com o nome do morador."],
                ["&#128682;", "O porteiro ja sabe quem esta chegando e pode abrir a cancela com antecedencia, sem o morador precisar esperar."],
                ["&#127769;", "Ideal para madrugadas e horarios de baixo movimento — configure o horario ativo para o periodo noturno."],
                ["&#9881;", "Voce define: localizacao no mapa, horario de funcionamento, raio de deteccao e pode desativar a qualquer momento."],
                ["&#128663;", "Integrado com a Portaria Virtual: ao se aproximar do condominio, o sistema pode acionar automaticamente a abertura do portao ou cancela via SONOFF/eWeLink, sem o morador precisar tocar em nada."],
              ] as [string, string][]).map(([icon, text], i) => (
                <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <span style={{ fontSize: 15, flexShrink: 0, marginTop: 1 }} dangerouslySetInnerHTML={{ __html: icon }} />
                  <p style={{ fontSize: 13, color: p.isDarkBase ? "#cbd5e1" : "#334155", lineHeight: 1.5, margin: 0 }}>{text}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Toggle */}
        <div className="flex items-center justify-between rounded-2xl p-5" style={{ marginBottom: "1.2rem" }}>
          <div className="flex items-center gap-3">
            <Navigation className="w-5 h-5" style={{ color: p.accentBright }} />
            <div>
              <p className="font-medium" style={{ color: p.text }}>Funcionalidade ativa</p>
              <p className="text-xs" style={{ color: p.textSecondary }}>Habilitar notificação de chegada</p>
            </div>
          </div>
          <button onClick={() => setEnabled(!enabled)}>
            {enabled ? (
              <ToggleRight className="w-10 h-10 text-emerald-500" />
            ) : (
              <ToggleLeft className="w-10 h-10" style={{ color: p.textMuted }} />
            )}
          </button>
        </div>

        {/* Schedule */}
        <div className="rounded-2xl p-5" style={{ marginBottom: "1.2rem" }}>
          <div className="flex items-center gap-2 mb-5">
            <Clock className="w-5 h-5" style={{ color: p.accentBright }} />
            <p className="font-medium" style={{ color: p.text }}>Horário Ativo</p>
          </div>
          <p className="text-xs mb-5" style={{ color: p.textSecondary }}>
            O sistema só notifica a portaria dentro deste horário. Ideal para noite e madrugada quando o fluxo é menor.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-xs block" style={{ color: p.textSecondary, marginBottom: "12px" }}>Início</span>
              <div className="relative">
                <input
                  type="time"
                  value={horarioInicio}
                  onChange={(e) => setHorarioInicio(e.target.value)}
                  className="w-full pr-12 rounded-xl"
                  style={{ color: p.text, background: p.cardBg, border: "1.5px solid rgba(255,255,255,0.3)", minHeight: "48px", paddingLeft: "20px" }}
                />
                <Clock className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "#ffffff" }} />
              </div>
            </div>
            <div>
              <span className="text-xs block" style={{ color: p.textSecondary, marginBottom: "12px" }}>Fim</span>
              <div className="relative">
                <input
                  type="time"
                  value={horarioFim}
                  onChange={(e) => setHorarioFim(e.target.value)}
                  className="w-full pr-12 rounded-xl [&::-webkit-calendar-picker-indicator]{display:none}"
                  style={{ color: p.text, background: p.cardBg, border: "1.5px solid rgba(255,255,255,0.3)", minHeight: "48px", paddingLeft: "20px" }}
                />
                <Clock className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "#ffffff" }} />
              </div>
            </div>
          </div>
          <p className="text-[10px] mt-2" style={{ color: p.textMuted }}>
            Ex: 22:00 — 06:00 = ativo durante a noite e madrugada
          </p>
        </div>

        {/* Default radius */}
        <div className="rounded-2xl p-5" style={{ marginBottom: "1.2rem" }}>
          <p className="font-medium mb-4" style={{ color: p.text }}>
            Raio padrão: <span className="font-bold" style={{ color: p.accentBright }}>{radiusDefault}m</span>
          </p>
          <p className="text-xs mb-3" style={{ color: p.textSecondary }}>Distância padrão para disparo da notificação.</p>
          <input
            type="range"
            min={50}
            max={500}
            step={25}
            value={radiusDefault}
            onChange={(e) => setRadiusDefault(Number(e.target.value))}
            className="w-full accent-primary"
          />
          <div className="flex justify-between text-xs mt-1" style={{ color: p.textSecondary }}>
            <span>50m</span>
            <span>500m</span>
          </div>
        </div>

        {/* Map location */}
        <div className="rounded-2xl p-5" style={{ marginBottom: "1.2rem" }}>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5" style={{ color: p.accentBright }} />
              <p className="font-medium" style={{ color: p.text }}>Localização do Condomínio</p>
            </div>
            <button
              onClick={useCurrentLocation}
              className="text-xs hover:underline flex items-center gap-1"
              style={{ color: p.accentBright }}
            >
              <Navigation className="w-3 h-3" />
              Usar minha localização
            </button>
          </div>
          <p className="text-xs mb-3" style={{ color: p.textSecondary }}>
            Clique no mapa para definir a localização exata do condomínio.
          </p>

          <div className="rounded-xl overflow-hidden border border-border" style={{ height: "300px" }}>
            {GOOGLE_MAPS_API_KEY ? (
              <LoadScriptNext googleMapsApiKey={GOOGLE_MAPS_API_KEY}>
                <GoogleMap
                  center={mapCenter}
                  zoom={15}
                  mapContainerStyle={{ height: "100%", width: "100%" }}
                  options={{
                    clickableIcons: false,
                    streetViewControl: false,
                    mapTypeControl: false,
                    fullscreenControl: false,
                    mapId: GOOGLE_MAPS_MAP_ID || undefined,
                  }}
                  onClick={(event) => {
                    const latLng = event.latLng;
                    if (!latLng) return;
                    setLatitude(latLng.lat());
                    setLongitude(latLng.lng());
                  }}
                >
                  {latitude && longitude && (
                    <>
                      <MarkerF
                        position={{ lat: latitude, lng: longitude }}
                        icon={markerIcon}
                        label={{ text: "C", color: "#ffffff", fontWeight: "700" }}
                      />
                      <CircleF
                        center={{ lat: latitude, lng: longitude }}
                        radius={radiusDefault}
                        options={{
                          strokeColor: "#2563eb",
                          strokeOpacity: 0.9,
                          strokeWeight: 2,
                          fillColor: "#2563eb",
                          fillOpacity: 0.08,
                        }}
                      />
                    </>
                  )}
                </GoogleMap>
              </LoadScriptNext>
            ) : (
              <div className="h-full flex items-center justify-center bg-muted text-center px-4 text-sm text-muted-foreground">
                Configure a variável VITE_GOOGLE_MAPS_API_KEY para selecionar a localização do condomínio.
              </div>
            )}
          </div>

          {latitude && longitude && (
            <p className="text-xs mt-2" style={{ color: p.textSecondary }}>
              📍 {latitude.toFixed(6)}, {longitude.toFixed(6)}
            </p>
          )}
        </div>
      </main>

      {/* Save button */}
      <div className="fixed bottom-0 left-0 right-0 z-40 safe-area-bottom" style={{ padding: "1rem 2.4rem 2rem", background: p.isDarkBase ? "linear-gradient(to top, rgba(0,0,0,0.85) 80%, transparent)" : "linear-gradient(to top, #ffffff 80%, transparent)" }}>
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50"
          style={{ background: saved ? "linear-gradient(135deg, #10b981, #059669)" : "#ffffff", color: saved ? "#ffffff" : "#003580", minHeight: "60px" }}
        >
          {saving ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : saved ? (
            <>
              <CheckCircle className="w-6 h-6" />
              Salvo!
            </>
          ) : (
            <>
              <Save className="w-6 h-6" />
              Salvar Configuração
            </>
          )}
        </button>
      </div>
    </div>
  );
}
