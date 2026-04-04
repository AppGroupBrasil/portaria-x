import { useRef, useEffect, useState, useCallback } from "react";
import { Eraser } from "lucide-react";

interface SignaturePadProps {
  value: string | null;
  onChange: (dataUrl: string | null) => void;
  width?: number;
  height?: number;
  label?: string;
}

export default function SignaturePad({
  value,
  onChange,
  width = 340,
  height = 160,
  label = "Assinatura Digital",
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas internal resolution
    canvas.width = width * 2;
    canvas.height = height * 2;
    ctx.scale(2, 2);

    // Style
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // White background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);

    // Restore existing value if provided
    if (value) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, width, height);
      };
      img.src = value;
    }
  }, [width, height]);

  const getPos = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = width / rect.width;
    const scaleY = height / rect.height;

    if ("touches" in e) {
      const touch = e.touches[0];
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }, [width, height]);

  const startDrawing = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setIsDrawing(true);
    setHasDrawn(true);
  }, [getPos]);

  const draw = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    if (!isDrawing) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  }, [isDrawing, getPos]);

  const stopDrawing = useCallback(() => {
    if (!isDrawing) return;
    setIsDrawing(false);
    // Save to parent
    const canvas = canvasRef.current;
    if (canvas) {
      onChange(canvas.toDataURL("image/png"));
    }
  }, [isDrawing, onChange]);

  const clearSignature = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    setHasDrawn(false);
    onChange(null);
  }, [width, height, onChange]);

  return (
    <div>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: "8px",
      }}>
        <span style={{ fontWeight: 600, fontSize: "13px", color: "#1e293b" }}>
          {label}
        </span>
        {hasDrawn && (
          <button
            type="button"
            onClick={clearSignature}
            style={{
              display: "flex", alignItems: "center", gap: "4px",
              background: "none", border: "none", color: "#ef4444",
              fontSize: "12px", fontWeight: 600, cursor: "pointer",
            }}
          >
            <Eraser className="w-3.5 h-3.5" /> Limpar
          </button>
        )}
      </div>

      <div style={{
        border: "2px dashed #cbd5e1", borderRadius: "12px",
        overflow: "hidden", background: "#fff", touchAction: "none",
      }}>
        <canvas
          ref={canvasRef}
          style={{
            width: "100%",
            height: `${height}px`,
            cursor: "crosshair",
            display: "block",
          }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
        {!hasDrawn && !value && (
          <div style={{
            position: "relative", top: `-${height / 2 + 10}px`,
            textAlign: "center", pointerEvents: "none",
            color: "#94a3b8", fontSize: "13px", fontWeight: 500,
          }}>
            Assine aqui com o dedo ou mouse
          </div>
        )}
      </div>
    </div>
  );
}
