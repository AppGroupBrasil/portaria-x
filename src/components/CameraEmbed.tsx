import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { Camera, ChevronLeft, ChevronRight, Maximize2, Minimize2, Disc } from "lucide-react";
import { apiFetch } from "@/lib/api";

interface CameraData {
  id: number;
  nome: string;
  setor: string;
  url_stream: string;
  tipo_stream: string;
  ativa: number;
}

export interface CameraEmbedRef {
  /** Capture current frame as base64 data URL */
  captureFrame: () => string | null;
}

interface CameraEmbedProps {
  /** Filter cameras by these sectors (default: entrance/portaria) */
  sectors?: string[];
  /** Height of the embed (default: 240px) */
  height?: number;
  /** Whether to show camera name overlay */
  showLabel?: boolean;
  /** Called when a snapshot is captured */
  onSnapshotCaptured?: (dataUrl: string, cameraName: string) => void;
  /** CSS class for container */
  className?: string;
}

/**
 * Embedded camera feed for portaria pages.
 * Shows a live feed from entrance/portaria cameras with controls.
 * Exposes a ref to capture the current frame programmatically.
 */
const CameraEmbed = forwardRef<CameraEmbedRef, CameraEmbedProps>(
  ({ sectors = ["entrada_principal", "portaria", "entrada_servico"], height = 240, showLabel = true, onSnapshotCaptured, className }, ref) => {
    const [cameras, setCameras] = useState<CameraData[]>([]);
    const [currentIdx, setCurrentIdx] = useState(0);
    const [expanded, setExpanded] = useState(false);
    const [recording, setRecording] = useState(false);
    const imgRef = useRef<HTMLImageElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
      apiFetch("/api/cameras")
        .then((r) => r.json())
        .then((data: CameraData[]) => {
          const filtered = data.filter(
            (c) => c.ativa && c.url_stream && sectors.includes(c.setor)
          );
          // Fallback to all active cameras
          setCameras(filtered.length > 0 ? filtered : data.filter((c) => c.ativa && c.url_stream));
        })
        .catch(() => {});
    }, []);

    const cam = cameras.length > 0 ? cameras[currentIdx % cameras.length] : null;

    // Expose captureFrame via ref
    useImperativeHandle(ref, () => ({
      captureFrame: () => {
        if (!cam) return null;
        try {
          let source: HTMLImageElement | HTMLVideoElement | null = null;
          let w = 0, h = 0;

          if ((cam.tipo_stream === "mjpeg" || cam.tipo_stream === "snapshot") && imgRef.current) {
            source = imgRef.current;
            w = imgRef.current.naturalWidth || imgRef.current.width;
            h = imgRef.current.naturalHeight || imgRef.current.height;
          } else if (cam.tipo_stream === "hls" && videoRef.current) {
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
          return canvas.toDataURL("image/jpeg", 0.85);
        } catch {
          return null;
        }
      },
    }));

    const handleCapture = () => {
      if (!cam) return;
      setRecording(true);
      try {
        let source: HTMLImageElement | HTMLVideoElement | null = null;
        let w = 0, h = 0;

        if ((cam.tipo_stream === "mjpeg" || cam.tipo_stream === "snapshot") && imgRef.current) {
          source = imgRef.current;
          w = imgRef.current.naturalWidth || imgRef.current.width;
          h = imgRef.current.naturalHeight || imgRef.current.height;
        } else if (cam.tipo_stream === "hls" && videoRef.current) {
          source = videoRef.current;
          w = videoRef.current.videoWidth;
          h = videoRef.current.videoHeight;
        }

        if (source && w > 0 && h > 0) {
          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(source, 0, 0);
            const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
            onSnapshotCaptured?.(dataUrl, cam.nome);
          }
        }
      } catch { /* silent */ }
      setTimeout(() => setRecording(false), 500);
    };

    if (cameras.length === 0) {
      return (
        <div
          className={className}
          style={{
            height,
            borderRadius: "16px",
            background: "#0f172a",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <Camera style={{ width: 28, height: 28, color: "var(--card-foreground)" }} />
          <span style={{ fontSize: "13px", color: "var(--muted-foreground)" }}>Sem câmeras configuradas</span>
        </div>
      );
    }

    const actualHeight = expanded ? height * 1.8 : height;

    return (
      <div
        className={className}
        style={{
          borderRadius: "16px",
          overflow: "hidden",
          background: "#0f172a",
          border: "1.5px solid rgba(14,165,233,0.3)",
          transition: "all 0.3s ease",
        }}
      >
        {/* Feed */}
        <div style={{ position: "relative", height: actualHeight, background: "#000" }}>
          {cam && (cam.tipo_stream === "mjpeg" || cam.tipo_stream === "snapshot") && (
            <img
              ref={imgRef}
              src={cam.url_stream}
              alt={cam.nome}
              crossOrigin="anonymous"
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
              onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.3"; }}
            />
          )}
          {cam && cam.tipo_stream === "hls" && (
            <video
              ref={videoRef}
              src={cam.url_stream}
              autoPlay
              muted
              playsInline
              crossOrigin="anonymous"
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
            />
          )}
          {cam && cam.tipo_stream !== "mjpeg" && cam.tipo_stream !== "snapshot" && cam.tipo_stream !== "hls" && (
            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Camera style={{ width: 32, height: 32, color: "var(--card-foreground)" }} />
            </div>
          )}

          {/* Live indicator */}
          <div style={{ position: "absolute", top: 8, left: 10, display: "flex", alignItems: "center", gap: 6 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#22c55e",
                boxShadow: "0 0 6px #22c55e",
                animation: "pulse 2s infinite",
              }}
            />
            <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, textShadow: "0 1px 3px rgba(0,0,0,0.8)" }}>
              AO VIVO
            </span>
          </div>

          {/* Controls overlay */}
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              padding: "8px 10px",
              background: "linear-gradient(transparent, rgba(0,0,0,0.8))",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            {/* Camera name */}
            {showLabel && cam && (
              <span style={{ fontSize: 11, color: "#e2e8f0", fontWeight: 600 }}>
                {cam.nome}
              </span>
            )}

            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              {/* Nav arrows */}
              {cameras.length > 1 && (
                <>
                  <button
                    onClick={() => setCurrentIdx((i) => (i - 1 + cameras.length) % cameras.length)}
                    style={btnStyle}
                  >
                    <ChevronLeft style={{ width: 18, height: 18 }} />
                  </button>
                  <span style={{ fontSize: 10, color: "#94a3b8", margin: "0 2px" }}>
                    {(currentIdx % cameras.length) + 1}/{cameras.length}
                  </span>
                  <button
                    onClick={() => setCurrentIdx((i) => (i + 1) % cameras.length)}
                    style={btnStyle}
                  >
                    <ChevronRight style={{ width: 18, height: 18 }} />
                  </button>
                </>
              )}

              {/* Snapshot button */}
              {onSnapshotCaptured && (
                <button
                  onClick={handleCapture}
                  style={{
                    ...btnStyle,
                    background: recording ? "rgba(239,68,68,0.8)" : "rgba(255,255,255,0.15)",
                    transition: "background 0.3s",
                  }}
                  title="Capturar snapshot"
                >
                  <Disc style={{ width: 18, height: 18, color: recording ? "#fff" : "#94a3b8" }} />
                </button>
              )}

              {/* Expand/collapse */}
              <button onClick={() => setExpanded(!expanded)} style={btnStyle} title={expanded ? "Reduzir" : "Expandir"}>
                {expanded ? (
                  <Minimize2 style={{ width: 18, height: 18 }} />
                ) : (
                  <Maximize2 style={{ width: 18, height: 18 }} />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

const btnStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.15)",
  border: "none",
  borderRadius: "8px",
  width: 28,
  height: 28,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  color: "#fff",
};

CameraEmbed.displayName = "CameraEmbed";
export default CameraEmbed;
