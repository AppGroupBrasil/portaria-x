import { useState, useRef, useCallback, useEffect } from "react";
import { X, RotateCcw, Loader2, ScanFace } from "lucide-react";

interface SelfieCaptureModalProps {
  open: boolean;
  title: string;
  subtitle?: string;
  onCapture: (base64: string) => void;
  onClose: () => void;
  loading?: boolean;
  isDark?: boolean;
}

export default function SelfieCaptureModal({
  open,
  title,
  subtitle,
  onCapture,
  onClose,
  loading = false,
  isDark = true,
}: SelfieCaptureModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const hasCapturedRef = useRef(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [status, setStatus] = useState<"waiting" | "counting" | "captured" | "verifying">("waiting");

  const startCamera = useCallback(async () => {
    setCameraReady(false);
    setError(null);
    setStatus("waiting");
    setCountdown(null);
    hasCapturedRef.current = false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => setCameraReady(true);
      }
    } catch {
      setError("Não foi possível acessar a câmera. Verifique as permissões.");
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraReady(false);
  }, []);

  // Auto-capture: start countdown when camera is ready (StrictMode-safe)
  useEffect(() => {
    if (!cameraReady || hasCapturedRef.current) return;

    setStatus("counting");
    setCountdown(3);

    const t1 = setTimeout(() => setCountdown(2), 1000);
    const t2 = setTimeout(() => setCountdown(1), 2000);
    const t3 = setTimeout(() => {
      setCountdown(0);
      // doCapture inline to avoid stale closure
      if (!videoRef.current || !canvasRef.current || hasCapturedRef.current) return;
      hasCapturedRef.current = true;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0);
      const base64 = canvas.toDataURL("image/jpeg", 0.85);
      const raw = base64.replace(/^data:image\/\w+;base64,/, "");
      setStatus("verifying");
      onCapture(raw);
    }, 3000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [cameraReady, onCapture]);

  useEffect(() => {
    if (open) {
      startCamera();
    } else {
      stopCamera();
      setError(null);
      setStatus("waiting");
      setCountdown(null);
      hasCapturedRef.current = false;
    }
    return () => stopCamera();
  }, [open, startCamera, stopCamera]);

  if (!open) return null;

  const progressPct = countdown !== null ? ((3 - countdown) / 3) * 100 : 0;

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(0,0,0,0.85)", backdropFilter: "blur(6px)",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        padding: "1rem",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: isDark ? "#0f172a" : "#ffffff",
          borderRadius: 24, width: "100%", maxWidth: 400,
          overflow: "hidden",
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
          border: isDark ? "1px solid rgba(255,255,255,0.12)" : "1px solid #e2e8f0",
        }}
      >
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "1rem 1.25rem",
          borderBottom: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid #e2e8f0",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <ScanFace style={{ width: 26, height: 26, color: isDark ? "#60a5fa" : "#2563eb" }} />
            <div>
              <p style={{ fontWeight: 700, fontSize: "0.95rem", color: isDark ? "#fff" : "#1e293b" }}>{title}</p>
              {subtitle && <p style={{ fontSize: "0.75rem", color: isDark ? "#93c5fd" : "#64748b", marginTop: 2 }}>{subtitle}</p>}
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            style={{
              padding: 8, borderRadius: 12, border: "none",
              background: isDark ? "rgba(255,255,255,0.08)" : "#f1f5f9",
              color: isDark ? "#fff" : "#1e293b", cursor: "pointer",
            }}
          >
            <X style={{ width: 22, height: 22 }} />
          </button>
        </div>

        {/* Camera */}
        <div style={{
          position: "relative", background: "#000",
          aspectRatio: "4/3", width: "100%",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {error ? (
            <p style={{ color: "#f87171", fontSize: 14, textAlign: "center", padding: "2rem" }}>{error}</p>
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{
                  width: "100%", height: "100%", objectFit: "cover",
                  transform: "scaleX(-1)",
                }}
              />
              {!cameraReady && (
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Loader2 style={{ width: 36, height: 36, color: "#fff", animation: "spin 1s linear infinite" }} />
                </div>
              )}
              {/* Face overlay guide + countdown */}
              {cameraReady && (
                <div style={{
                  position: "absolute", inset: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  pointerEvents: "none",
                }}>
                  <div style={{
                    width: "55%", aspectRatio: "3/4", borderRadius: "50%",
                    border: status === "verifying" ? "3px solid #10b981" : "2px dashed rgba(255,255,255,0.4)",
                    transition: "border 0.3s",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {/* Countdown number */}
                    {status === "counting" && countdown !== null && countdown > 0 && (
                      <span style={{
                        fontSize: 72, fontWeight: 900, color: "rgba(255,255,255,0.7)",
                        textShadow: "0 2px 20px rgba(0,0,0,0.5)",
                        animation: "pulse 1s ease-in-out",
                      }}>
                        {countdown}
                      </span>
                    )}
                    {status === "verifying" && (
                      <Loader2 style={{ width: 48, height: 48, color: "#10b981", animation: "spin 1s linear infinite" }} />
                    )}
                  </div>
                </div>
              )}
              {/* Progress bar */}
              {status === "counting" && (
                <div style={{
                  position: "absolute", bottom: 0, left: 0, right: 0, height: 4,
                  background: "rgba(255,255,255,0.1)",
                }}>
                  <div style={{
                    height: "100%", background: "linear-gradient(90deg, #3b82f6, #60a5fa)",
                    width: `${progressPct}%`,
                    transition: "width 1s linear",
                  }} />
                </div>
              )}
            </>
          )}
        </div>

        {/* Status bar */}
        <div style={{
          padding: "1rem 1.25rem", display: "flex",
          alignItems: "center", justifyContent: "center", gap: 10,
          minHeight: 56,
        }}>
          {error ? (
            <button
              onClick={startCamera}
              style={{
                flex: 1, padding: "0.75rem", borderRadius: 14, fontWeight: 700, fontSize: 14,
                background: "linear-gradient(135deg, #2563eb, #3b82f6)",
                border: "none", color: "#fff", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}
            >
              <RotateCcw style={{ width: 20, height: 20 }} /> Tentar Novamente
            </button>
          ) : status === "waiting" || (status === "counting" && countdown !== null && countdown > 0) ? (
            <p style={{ fontSize: 14, fontWeight: 600, color: isDark ? "#93c5fd" : "#475569", textAlign: "center" }}>
              {!cameraReady ? "Iniciando câmera..." : `Capturando em ${countdown}s — posicione o rosto`}
            </p>
          ) : status === "verifying" || loading ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Loader2 style={{ width: 22, height: 22, color: "#10b981", animation: "spin 1s linear infinite" }} />
              <p style={{ fontSize: 14, fontWeight: 600, color: "#10b981" }}>Verificando identidade...</p>
            </div>
          ) : null}
        </div>

        <canvas ref={canvasRef} style={{ display: "none" }} />
      </div>
    </div>
  );
}
