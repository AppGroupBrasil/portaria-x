import { useState, useEffect, useRef } from "react";
import { Camera, X, Maximize2, Minimize2, ChevronLeft, ChevronRight } from "lucide-react";
import { apiFetch } from "@/lib/api";

interface CameraData {
  id: number;
  nome: string;
  setor: string;
  url_stream: string;
  tipo_stream: string;
  ativa: number;
}

/**
 * Floating camera preview widget for portaria pages.
 * Shows a small PiP-style camera feed that can be expanded/collapsed.
 * Cycles through active cameras from the entrance/portaria sector.
 */
export default function CameraWidget() {
  const [cameras, setCameras] = useState<CameraData[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [visible, setVisible] = useState(false);
  const [minimized, setMinimized] = useState(true);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    apiFetch("/api/cameras")
      .then((r) => r.json())
      .then((data: CameraData[]) => {
        const active = data.filter((c) => c.ativa && c.url_stream);
        setCameras(active);
        if (active.length > 0) setVisible(true);
      })
      .catch(() => {});
  }, []);

  if (!visible || cameras.length === 0) return null;

  const cam = cameras[currentIdx % cameras.length];

  const prev = () => setCurrentIdx((i) => (i - 1 + cameras.length) % cameras.length);
  const next = () => setCurrentIdx((i) => (i + 1) % cameras.length);

  // Minimized: just a camera fab button
  if (minimized) {
    return (
      <button
        onClick={() => setMinimized(false)}
        style={{
          position: "fixed",
          bottom: "7rem",
          right: "1rem",
          zIndex: 50,
          width: "48px",
          height: "48px",
          borderRadius: "50%",
          background: "linear-gradient(135deg, #1e293b, #0f172a)",
          border: "2px solid rgba(14,165,233,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
          cursor: "pointer",
        }}
        title="Câmera ao vivo"
      >
        <Camera style={{ width: 26, height: 26, color: "#0ea5e9" }} />
        {/* Live indicator */}
        <span
          style={{
            position: "absolute",
            top: 2,
            right: 2,
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: "#22c55e",
            border: "2px solid #0f172a",
          }}
        />
      </button>
    );
  }

  const containerWidth = expanded ? 400 : 220;
  const containerHeight = expanded ? 280 : 160;

  return (
    <div
      style={{
        position: "fixed",
        bottom: "7rem",
        right: "1rem",
        zIndex: 50,
        width: containerWidth,
        borderRadius: "16px",
        overflow: "hidden",
        background: "#0f172a",
        border: "1.5px solid rgba(14,165,233,0.4)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        transition: "all 0.3s ease",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "6px 10px",
          background: "rgba(15,23,42,0.95)",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "#22c55e",
              animation: "pulse 2s infinite",
            }}
          />
          <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, maxWidth: expanded ? 200 : 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {cam.nome}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
          <button
            onClick={() => setExpanded(!expanded)}
            style={{ padding: 4, background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)" }}
            title={expanded ? "Reduzir" : "Expandir"}
          >
            {expanded ? <Minimize2 style={{ width: 18, height: 18 }} /> : <Maximize2 style={{ width: 18, height: 18 }} />}
          </button>
          <button
            onClick={() => setMinimized(true)}
            style={{ padding: 4, background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)" }}
            title="Minimizar"
          >
            <X style={{ width: 18, height: 18 }} />
          </button>
        </div>
      </div>

      {/* Camera Feed */}
      <div style={{ position: "relative", height: containerHeight, background: "#000" }}>
        {cam.tipo_stream === "mjpeg" || cam.tipo_stream === "snapshot" ? (
          <img
            ref={imgRef}
            src={cam.url_stream}
            alt={cam.nome}
            style={{ width: "100%", height: "100%", objectFit: "contain" }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : cam.tipo_stream === "hls" ? (
          <video
            src={cam.url_stream}
            autoPlay
            muted
            playsInline
            style={{ width: "100%", height: "100%", objectFit: "contain" }}
          />
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Camera style={{ width: 32, height: 32, color: "var(--card-foreground)" }} />
          </div>
        )}

        {/* Navigation arrows */}
        {cameras.length > 1 && (
          <>
            <button
              onClick={prev}
              style={{
                position: "absolute",
                left: 4,
                top: "50%",
                transform: "translateY(-50%)",
                background: "rgba(0,0,0,0.6)",
                border: "none",
                borderRadius: "50%",
                width: 28,
                height: 28,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: "#fff",
              }}
            >
              <ChevronLeft style={{ width: 20, height: 20 }} />
            </button>
            <button
              onClick={next}
              style={{
                position: "absolute",
                right: 4,
                top: "50%",
                transform: "translateY(-50%)",
                background: "rgba(0,0,0,0.6)",
                border: "none",
                borderRadius: "50%",
                width: 28,
                height: 28,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: "#fff",
              }}
            >
              <ChevronRight style={{ width: 20, height: 20 }} />
            </button>
          </>
        )}

        {/* Camera counter */}
        {cameras.length > 1 && (
          <span
            style={{
              position: "absolute",
              bottom: 6,
              right: 8,
              fontSize: 10,
              color: "#94a3b8",
              background: "rgba(0,0,0,0.6)",
              padding: "2px 8px",
              borderRadius: 8,
            }}
          >
            {(currentIdx % cameras.length) + 1}/{cameras.length}
          </span>
        )}

        {/* Setor badge */}
        <span
          style={{
            position: "absolute",
            bottom: 6,
            left: 8,
            fontSize: 9,
            color: "#fff",
            background: "rgba(14,165,233,0.7)",
            padding: "2px 6px",
            borderRadius: 6,
            fontWeight: 600,
            textTransform: "uppercase",
          }}
        >
          {cam.setor}
        </span>
      </div>
    </div>
  );
}
