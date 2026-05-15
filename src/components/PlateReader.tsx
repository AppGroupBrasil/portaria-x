import { useState, useRef, useCallback } from "react";
import { Camera, X, RotateCcw, Loader2, ScanLine, CheckCircle2, Pencil } from "lucide-react";
import Tesseract from "tesseract.js";
import { compressCanvas } from "@/lib/imageUtils";

/**
 * Brazilian license plate patterns:
 *  - Old:     ABC-1234  (3 letters + 4 digits)
 *  - Mercosul: ABC1D23  (3 letters + 1 digit + 1 letter + 2 digits)
 */
const PLATE_REGEX = /[A-Z]{3}[\s\-]?\d[A-Z0-9]\d{2}/gi;

function extractPlate(text: string): string | null {
  // Normalize common OCR misreads
  const cleaned = text
    .toUpperCase()
    .replace(/[ÀÁÂ]/g, "A")
    .replace(/[ÉÊ]/g, "E")
    .replace(/[ÍÎ]/g, "I")
    .replace(/[ÓÔÕ]/g, "O")
    .replace(/[ÚÛ]/g, "U")
    .replace(/[\n\r]/g, " ")
    .replace(/[^A-Z0-9\s\-]/g, "");

  const matches = cleaned.match(PLATE_REGEX);
  if (!matches || matches.length === 0) return null;

  // Return the first match, stripped of spaces/dashes
  return matches[0].replace(/[\s\-]/g, "").slice(0, 7);
}

interface PlateReaderProps {
  onPlateDetected: (plate: string, image?: string) => void;
}

export default function PlateReader({ onPlateDetected }: PlateReaderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [detectedPlate, setDetectedPlate] = useState<string | null>(null);
  const [editedPlate, setEditedPlate] = useState<string>("");
  const [error, setError] = useState("");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const plateInputRef = useRef<HTMLInputElement>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  const startCamera = useCallback(async () => {
    setError("");
    setDetectedPlate(null);
    setCapturedImage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
    } catch {
      setError("Não foi possível acessar a câmera. Use o botão de galeria para selecionar uma foto.");
    }
  }, []);

  const handleOpen = useCallback(() => {
    setIsOpen(true);
    setDetectedPlate(null);
    setCapturedImage(null);
    setError("");
    setProgress(0);
    setTimeout(() => startCamera(), 100);
  }, [startCamera]);

  const handleClose = useCallback(() => {
    stopCamera();
    setIsOpen(false);
    setDetectedPlate(null);
    setCapturedImage(null);
    setError("");
    setProgress(0);
    setProcessing(false);
  }, [stopCamera]);

  const processImage = useCallback(async (imageData: string) => {
    setProcessing(true);
    setProgress(0);
    setError("");

    try {
      const result = await Tesseract.recognize(imageData, "eng", {
        logger: (m) => {
          if (m.status === "recognizing text") {
            setProgress(Math.round(m.progress * 100));
          }
        },
      });

      const rawText = result.data.text;
      const plate = extractPlate(rawText);

      if (plate) {
        setDetectedPlate(plate);
        setEditedPlate(plate);
      } else {
        setError("Placa não identificada. Tente novamente com a câmera mais próxima da placa.");
      }
    } catch {
      setError("Erro ao processar a imagem. Tente novamente.");
    } finally {
      setProcessing(false);
    }
  }, []);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);

    // Crop center region (plates are usually in center-bottom)
    const cropH = Math.round(canvas.height * 0.4);
    const cropY = Math.round(canvas.height * 0.4);
    const cropCanvas = document.createElement("canvas");
    cropCanvas.width = canvas.width;
    cropCanvas.height = cropH;
    const cropCtx = cropCanvas.getContext("2d");
    if (!cropCtx) return;
    cropCtx.drawImage(canvas, 0, cropY, canvas.width, cropH, 0, 0, canvas.width, cropH);

    // Apply contrast enhancement for better OCR
    const imageData = cropCtx.getImageData(0, 0, cropCanvas.width, cropCanvas.height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
      const val = avg > 128 ? 255 : 0; // binarize
      data[i] = val;
      data[i + 1] = val;
      data[i + 2] = val;
    }
    cropCtx.putImageData(imageData, 0, 0);

    const dataUrl = cropCanvas.toDataURL("image/png");
    setCapturedImage(compressCanvas(canvas, "plate"));
    stopCamera();
    processImage(dataUrl);
  }, [stopCamera, processImage]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    stopCamera();

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);

        setCapturedImage(compressCanvas(canvas, "plate"));

        // Enhance for OCR
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
          const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
          const val = avg > 128 ? 255 : 0;
          data[i] = val;
          data[i + 1] = val;
          data[i + 2] = val;
        }
        ctx.putImageData(imageData, 0, 0);

        processImage(canvas.toDataURL("image/png"));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }, [stopCamera, processImage]);

  const handleConfirm = useCallback(() => {
    const plateToUse = editedPlate.trim().toUpperCase();
    if (plateToUse) {
      onPlateDetected(plateToUse, capturedImage || undefined);
      handleClose();
    }
  }, [editedPlate, capturedImage, onPlateDetected, handleClose]);

  const handleRetry = useCallback(() => {
    setDetectedPlate(null);
    setEditedPlate("");
    setCapturedImage(null);
    setError("");
    setProgress(0);
    startCamera();
  }, [startCamera]);

  return (
    <>
      {/* Trigger button */}
      <button
        type="button"
        onClick={handleOpen}
        title="Ler placa pelo celular"
        style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
          padding: "14px", borderRadius: "12px", width: "100%",
          background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
          border: "none", color: "#fff", fontWeight: 700, fontSize: "16px",
          cursor: "pointer",
        }}
      >
        <Camera className="w-6 h-6" />
        LER PLACA PELO CELULAR
      </button>

      {/* Modal */}
      {isOpen && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 70, background: "rgba(0,0,0,0.85)",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        }}>
          {/* Header */}
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, padding: "16px 20px",
            display: "flex", alignItems: "center", justifyContent: "space-between", zIndex: 2,
          }}>
            <h3 style={{ color: "#fff", fontWeight: 700, fontSize: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
              <ScanLine className="w-6 h-6" style={{ color: "#a5b4fc" }} />
              Leitura de Placa
            </h3>
            <button onClick={handleClose} style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "50%", width: "36px", height: "36px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <X className="w-6 h-6" style={{ color: "#fff" }} />
            </button>
          </div>

          {/* Camera / Image */}
          <div style={{ width: "100%", maxWidth: "500px", padding: "0 16px", position: "relative" }}>
            {cameraActive && (
              <div style={{ position: "relative", borderRadius: "16px", overflow: "hidden" }}>
                <video ref={videoRef} autoPlay playsInline muted style={{ width: "100%", borderRadius: "16px" }} />
                {/* Guide overlay */}
                <div style={{
                  position: "absolute", top: "40%", left: "10%", right: "10%", height: "25%",
                  border: "3px dashed #a5b4fc", borderRadius: "12px",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <span style={{ color: "#a5b4fc", fontSize: "13px", fontWeight: 600, background: "rgba(0,0,0,0.5)", padding: "4px 10px", borderRadius: "8px" }}>
                    Posicione a placa aqui
                  </span>
                </div>
              </div>
            )}

            {capturedImage && !cameraActive && (
              <img src={capturedImage} alt="Captura" style={{ width: "100%", borderRadius: "16px", opacity: processing ? 0.6 : 1 }} />
            )}

            {!cameraActive && !capturedImage && !processing && (
              <div style={{
                width: "100%", aspectRatio: "16/9", borderRadius: "16px",
                background: "rgba(255,255,255,0.05)", border: "2px dashed rgba(255,255,255,0.2)",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "12px",
              }}>
                <Camera className="w-10 h-10" style={{ color: "var(--muted-foreground)" }} />
                <p style={{ color: "#94a3b8", fontSize: "14px" }}>Câmera não disponível</p>
              </div>
            )}
          </div>

          {/* Processing indicator */}
          {processing && (
            <div style={{ marginTop: "20px", display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
              <Loader2 className="w-7 h-7 animate-spin" style={{ color: "#a5b4fc" }} />
              <p style={{ color: "#a5b4fc", fontSize: "15px", fontWeight: 600 }}>Lendo placa... {progress}%</p>
              <div style={{ width: "200px", height: "6px", borderRadius: "3px", background: "rgba(255,255,255,0.1)" }}>
                <div style={{ width: `${progress}%`, height: "100%", borderRadius: "3px", background: "linear-gradient(90deg, #6366f1, #a5b4fc)", transition: "width 0.3s" }} />
              </div>
            </div>
          )}

          {/* Result — editable */}
          {detectedPlate && !processing && (
            <div style={{ marginTop: "20px", display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
              <div
                style={{
                  padding: "8px 16px", borderRadius: "14px",
                  background: "#fffbeb", border: "3px solid #f59e0b",
                  display: "flex", alignItems: "center", gap: "10px",
                }}
                onClick={() => plateInputRef.current?.focus()}
              >
                <input
                  ref={plateInputRef}
                  type="text"
                  value={editedPlate}
                  onChange={(e) => setEditedPlate(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 7))}
                  maxLength={7}
                  style={{
                    fontWeight: 900, fontSize: "32px", color: "#92400e",
                    letterSpacing: "6px", fontFamily: "monospace",
                    background: "transparent", border: "none", outline: "none",
                    textAlign: "center", width: `${Math.max(editedPlate.length, 1) * 28 + 20}px`,
                    caretColor: "#f59e0b",
                  }}
                />
                <Pencil className="w-5 h-5" style={{ color: "#92400e", opacity: 0.6, flexShrink: 0 }} />
              </div>
              <p style={{ color: "#86efac", fontSize: "14px", display: "flex", alignItems: "center", gap: "6px" }}>
                <CheckCircle2 className="w-5 h-5" />
                Placa identificada!
              </p>
              <p style={{ color: "#94a3b8", fontSize: "12px", marginTop: "-4px" }}>
                Toque na placa para corrigir se necessário
              </p>
            </div>
          )}

          {/* Error */}
          {error && !processing && (
            <div style={{ marginTop: "20px", padding: "12px 20px", borderRadius: "12px", background: "rgba(239,68,68,0.15)", maxWidth: "400px" }}>
              <p style={{ color: "#fca5a5", fontSize: "14px", textAlign: "center" }}>{error}</p>
            </div>
          )}

          {/* Buttons */}
          <div style={{ marginTop: "24px", display: "flex", gap: "10px", padding: "0 16px", width: "100%", maxWidth: "500px" }}>
            {cameraActive && (
              <button
                onClick={capturePhoto}
                style={{
                  flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                  padding: "16px", borderRadius: "14px",
                  background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                  border: "none", color: "#fff", fontWeight: 700, fontSize: "16px", cursor: "pointer",
                  boxShadow: "0 4px 15px rgba(99,102,241,0.4)",
                }}
              >
                <Camera className="w-6 h-6" />
                Capturar
              </button>
            )}

            {detectedPlate && !processing && (
              <>
                <button
                  onClick={handleRetry}
                  style={{
                    flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                    padding: "14px", borderRadius: "14px",
                    background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)",
                    color: "#fff", fontWeight: 600, fontSize: "15px", cursor: "pointer",
                  }}
                >
                  <RotateCcw className="w-5 h-5" />
                  Tentar Novamente
                </button>
                <button
                  onClick={handleConfirm}
                  style={{
                    flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                    padding: "14px", borderRadius: "14px",
                    background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
                    border: "none", color: "#fff", fontWeight: 700, fontSize: "15px", cursor: "pointer",
                    boxShadow: "0 4px 15px rgba(34,197,94,0.3)",
                  }}
                >
                  <CheckCircle2 className="w-5 h-5" />
                  Usar Placa
                </button>
              </>
            )}

            {error && !processing && !cameraActive && (
              <button
                onClick={handleRetry}
                style={{
                  flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                  padding: "14px", borderRadius: "14px",
                  background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                  border: "none", color: "#fff", fontWeight: 600, fontSize: "15px", cursor: "pointer",
                }}
              >
                <RotateCcw className="w-5 h-5" />
                Tentar Novamente
              </button>
            )}
          </div>

          {/* File input fallback */}
          <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileSelect} style={{ display: "none" }} />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={processing}
            style={{
              marginTop: "12px", background: "none", border: "none",
              color: "#94a3b8", fontSize: "14px", cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            📷 Selecionar foto da galeria
          </button>

          <canvas ref={canvasRef} style={{ display: "none" }} />
        </div>
      )}
    </>
  );
}
