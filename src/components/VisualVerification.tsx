import { useState, useRef, useEffect } from "react";
import { apiFetch } from "@/lib/api";
import { ShieldCheck, ShieldX, Loader2, Camera, X, RefreshCw, ZoomIn, AlertTriangle } from "lucide-react";

interface VisualVerificationProps {
  /** Registered visitor photo (base64 data URL or URL string) */
  registeredPhoto: string;
  /** Visitor name */
  visitorName: string;
  /** Camera stream URL (MJPEG or snapshot from entrance camera) */
  cameraStreamUrl?: string;
  /** Called when verification is complete */
  onResult?: (result: { match: boolean; confidence: number; capturedPhoto: string }) => void;
  /** Called when modal is closed */
  onClose: () => void;
}

/**
 * Side-by-side visual verification: compares a registered visitor photo
 * with a live camera frame using server-side face recognition.
 */
export default function VisualVerification({
  registeredPhoto,
  visitorName,
  cameraStreamUrl,
  onResult,
  onClose,
}: VisualVerificationProps) {
  const [modelsReady, setModelsReady] = useState(false);
  const [checkingModels, setCheckingModels] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState<"idle" | "match" | "no_match" | "error">("idle");
  const [confidence, setConfidence] = useState(0);
  const [capturedFrame, setCapturedFrame] = useState<string>("");
  const [useDeviceCamera, setUseDeviceCamera] = useState(!cameraStreamUrl);
  const [expanded, setExpanded] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const imgRef = useRef<HTMLImageElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Check if server-side models are ready
  useEffect(() => {
    const check = async () => {
      try {
        const res = await apiFetch("/api/face/status");
        const data = await res.json();
        setModelsReady(data.ready);
        if (!data.ready) {
          // Retry in 2s
          setTimeout(check, 2000);
        }
      } catch {
        setTimeout(check, 3000);
      } finally {
        setCheckingModels(false);
      }
    };
    check();
  }, []);

  // Start device camera if no security camera URL
  useEffect(() => {
    if (!useDeviceCamera) return;
    let stream: MediaStream | null = null;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch {
        console.error("Cannot access device camera");
      }
    })();
    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [useDeviceCamera]);

  /** Capture a frame from the MJPEG <img> or device <video> */
  const captureFrame = (): HTMLCanvasElement | null => {
    let source: HTMLImageElement | HTMLVideoElement | null = null;
    let w = 0, h = 0;

    if (!useDeviceCamera && imgRef.current) {
      source = imgRef.current;
      w = imgRef.current.naturalWidth || imgRef.current.width;
      h = imgRef.current.naturalHeight || imgRef.current.height;
    } else if (useDeviceCamera && videoRef.current) {
      source = videoRef.current;
      w = videoRef.current.videoWidth;
      h = videoRef.current.videoHeight;
    }

    if (!source || w === 0 || h === 0) return null;

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(source, 0, 0);
    return canvas;
  };

  /** Run face comparison via server */
  const handleVerify = async () => {
    if (!modelsReady) return;
    setVerifying(true);
    setResult("idle");
    setErrorMsg("");

    try {
      // 1. Capture current camera frame
      const frameCanvas = captureFrame();
      if (!frameCanvas) {
        setResult("error");
        setErrorMsg("Não foi possível capturar frame da câmera.");
        setVerifying(false);
        return;
      }
      const frameDataUrl = frameCanvas.toDataURL("image/jpeg", 0.85);
      setCapturedFrame(frameDataUrl);

      // 2. Send both photos to server for comparison
      const res = await apiFetch("/api/face/compare-two", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          photo1: registeredPhoto,
          photo2: frameDataUrl,
        }),
      });

      const data = await res.json();

      if (data.error && !data.matched) {
        setResult("error");
        setErrorMsg(data.error);
        setVerifying(false);
        return;
      }

      const conf = data.similarity || 0;
      setConfidence(conf);
      setResult(data.matched ? "match" : "no_match");
      onResult?.({ match: data.matched, confidence: conf, capturedPhoto: frameDataUrl });
    } catch (err) {
      console.error("Verification error:", err);
      setResult("error");
      setErrorMsg("Erro de conexão com o servidor.");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: "20px",
          width: "100%",
          maxWidth: expanded ? "700px" : "480px",
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 25px 60px rgba(0,0,0,0.3)",
          transition: "max-width 0.3s ease",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "linear-gradient(135deg, #2d3354 0%, #3d4470 100%)",
            borderRadius: "20px 20px 0 0",
            color: "#fff",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <ShieldCheck style={{ width: 22, height: 22 }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: "14px" }}>Verificação Visual</div>
              <div style={{ fontSize: "11px", opacity: 0.85 }}>{visitorName}</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <button
              onClick={() => setExpanded(!expanded)}
              style={{ background: "rgba(255,255,255,0.2)", border: "none", borderRadius: "8px", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff" }}
            >
              <ZoomIn style={{ width: 16, height: 16 }} />
            </button>
            <button
              onClick={onClose}
              style={{ background: "rgba(255,255,255,0.2)", border: "none", borderRadius: "8px", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff" }}
            >
              <X style={{ width: 16, height: 16 }} />
            </button>
          </div>
        </div>

        {/* Loading models */}
        {checkingModels && !modelsReady && (
          <div style={{ padding: "24px", textAlign: "center" }}>
            <Loader2 style={{ width: 32, height: 32, color: "#2d3354", margin: "0 auto 12px", animation: "spin 1s linear infinite" }} />
            <p style={{ fontSize: "13px", color: "#64748b" }}>Verificando serviço de reconhecimento facial...</p>
          </div>
        )}

        {/* Side-by-side comparison */}
        {(!checkingModels || modelsReady) && (
          <div style={{ padding: "16px" }}>
            <div style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
              {/* Registered Photo */}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "11px", fontWeight: 600, color: "#2d3354", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Foto Cadastrada
                </div>
                <div
                  style={{
                    borderRadius: "12px",
                    overflow: "hidden",
                    border: "2px solid #2d3354",
                    background: "#f1f5f9",
                    aspectRatio: "3/4",
                  }}
                >
                  <img
                    src={registeredPhoto}
                    alt="Foto cadastrada"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                </div>
              </div>

              {/* Live Camera Feed */}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "11px", fontWeight: 600, color: "#059669", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px", display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", display: "inline-block", animation: "pulse 2s infinite" }} />
                  Câmera ao Vivo
                </div>
                <div
                  style={{
                    borderRadius: "12px",
                    overflow: "hidden",
                    border: "2px solid #6ee7b7",
                    background: "#0f172a",
                    aspectRatio: "3/4",
                    position: "relative",
                  }}
                >
                  {!useDeviceCamera && cameraStreamUrl ? (
                    <img
                      ref={imgRef}
                      src={cameraStreamUrl}
                      crossOrigin="anonymous"
                      alt="Camera feed"
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    <video
                      ref={videoRef}
                      autoPlay
                      muted
                      playsInline
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  )}
                  {/* Captured frame overlay when verified */}
                  {capturedFrame && result !== "idle" && (
                    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <img src={capturedFrame} alt="Frame capturado" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Camera source toggle */}
            {cameraStreamUrl && (
              <button
                onClick={() => { setUseDeviceCamera(!useDeviceCamera); setResult("idle"); setCapturedFrame(""); }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  background: "#f1f5f9",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  padding: "6px 12px",
                  fontSize: "11px",
                  color: "#475569",
                  cursor: "pointer",
                  marginBottom: "12px",
                }}
              >
                <Camera style={{ width: 12, height: 12 }} />
                {useDeviceCamera ? "Usar câmera de segurança" : "Usar câmera do dispositivo"}
              </button>
            )}

            {/* Result indicator */}
            {result === "match" && (
              <div
                style={{
                  padding: "14px 16px",
                  borderRadius: "12px",
                  background: "linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)",
                  border: "1.5px solid #4ade80",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  marginBottom: "12px",
                }}
              >
                <ShieldCheck style={{ width: 28, height: 28, color: "#16a34a", flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: "14px", color: "#15803d" }}>IDENTIDADE CONFIRMADA</div>
                  <div style={{ fontSize: "12px", color: "#166534" }}>
                    Reconhecimento: {confidence >= 55 ? "Excelente" : "Suficiente"} — O rosto corresponde ao cadastro de {visitorName}.
                  </div>
                </div>
              </div>
            )}
            {result === "no_match" && (
              <div
                style={{
                  padding: "14px 16px",
                  borderRadius: "12px",
                  background: "linear-gradient(135deg, #fef2f2 0%, #fecaca 100%)",
                  border: "1.5px solid #f87171",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  marginBottom: "12px",
                }}
              >
                <ShieldX style={{ width: 28, height: 28, color: "#dc2626", flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: "14px", color: "#991b1b" }}>ROSTO NÃO CORRESPONDE</div>
                  <div style={{ fontSize: "12px", color: "#b91c1c" }}>
                    O rosto não corresponde ao cadastro.
                  </div>
                </div>
              </div>
            )}
            {result === "error" && (
              <div
                style={{
                  padding: "14px 16px",
                  borderRadius: "12px",
                  background: "#fffbeb",
                  border: "1.5px solid #fbbf24",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  marginBottom: "12px",
                }}
              >
                <AlertTriangle style={{ width: 28, height: 28, color: "#d97706", flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: "14px", color: "#92400e" }}>NÃO FOI POSSÍVEL VERIFICAR</div>
                  <div style={{ fontSize: "12px", color: "#a16207" }}>
                    {errorMsg || "Nenhum rosto detectado em uma das imagens. Posicione o visitante de frente para a câmera."}
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={handleVerify}
                disabled={!modelsReady || verifying}
                style={{
                  flex: 1,
                  height: "48px",
                  borderRadius: "12px",
                  border: "none",
                  background: verifying
                    ? "#94a3b8"
                    : "linear-gradient(135deg, #2d3354 0%, #3d4470 100%)",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: "14px",
                  cursor: verifying ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                }}
              >
                {verifying ? (
                  <>
                    <Loader2 style={{ width: 18, height: 18, animation: "spin 1s linear infinite" }} />
                    Verificando...
                  </>
                ) : result !== "idle" ? (
                  <>
                    <RefreshCw style={{ width: 18, height: 18 }} />
                    Verificar Novamente
                  </>
                ) : (
                  <>
                    <ShieldCheck style={{ width: 18, height: 18 }} />
                    Verificar Identidade
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 0.6; } 50% { opacity: 1; } }
      `}</style>
    </div>
  );
}
