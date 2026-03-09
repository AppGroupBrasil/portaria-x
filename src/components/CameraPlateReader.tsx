import { useState, useEffect, useCallback, useRef } from "react";
import { compressCanvas } from "@/lib/imageUtils";
import {
  Camera,
  X,
  ScanLine,
  Loader2,
  CheckCircle2,
  Pencil,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Zap,
  AlertTriangle,
  Car,
  User,
  MapPin,
} from "lucide-react";
import Tesseract from "tesseract.js";
import { apiFetch } from "@/lib/api";

/**
 * Brazilian license plate patterns:
 *  - Old:     ABC-1234  (3 letters + 4 digits)
 *  - Mercosul: ABC1D23  (3 letters + 1 digit + 1 letter + 2 digits)
 */
const PLATE_REGEX = /[A-Z]{3}[\s\-]?\d[A-Z0-9]\d{2}/gi;

function extractPlate(text: string): string | null {
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
  return matches[0].replace(/[\s\-]/g, "").slice(0, 7);
}

interface CameraData {
  id: number;
  nome: string;
  setor: string;
  url_stream: string;
  tipo_stream: string;
  ativa: number;
}

interface VehicleData {
  found: boolean;
  placa?: string;
  modelo?: string;
  cor?: string;
  motorista_nome?: string;
  morador_name?: string;
  morador_id?: number;
  bloco?: string;
  apartamento?: string;
  status?: string;
  data_inicio?: string;
  data_fim?: string;
}

interface CameraPlateReaderProps {
  /** Called when plate is detected and confirmed */
  onPlateDetected: (plate: string, image?: string) => void;
  /** Optional: called when vehicle data is found in DB */
  onVehicleFound?: (data: VehicleData) => void;
}

const API_VEHICLE = "/api/vehicle-authorizations";

export default function CameraPlateReader({ onPlateDetected, onVehicleFound }: CameraPlateReaderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [cameras, setCameras] = useState<CameraData[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [detectedPlate, setDetectedPlate] = useState<string | null>(null);
  const [editedPlate, setEditedPlate] = useState("");
  const [error, setError] = useState("");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [vehicleData, setVehicleData] = useState<VehicleData | null>(null);
  const [searchingVehicle, setSearchingVehicle] = useState(false);

  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const plateInputRef = useRef<HTMLInputElement>(null);

  // Load cameras (filter to garagem/entrada sectors)
  useEffect(() => {
    if (!isOpen) return;
    apiFetch("/api/cameras")
      .then((r) => r.json())
      .then((data: CameraData[]) => {
        const relevant = data.filter(
          (c) =>
            c.ativa &&
            c.url_stream &&
            (c.setor === "garagem" ||
              c.setor === "entrada_principal" ||
              c.setor === "entrada_servico" ||
              c.setor === "portaria" ||
              c.setor === "estacionamento")
        );
        // Fallback to all active cameras if no garage cameras
        setCameras(relevant.length > 0 ? relevant : data.filter((c) => c.ativa && c.url_stream));
      })
      .catch(() => setError("Erro ao carregar câmeras."));
  }, [isOpen]);

  const cam = cameras.length > 0 ? cameras[currentIdx % cameras.length] : null;

  const handleOpen = () => {
    setIsOpen(true);
    setDetectedPlate(null);
    setEditedPlate("");
    setCapturedImage(null);
    setError("");
    setProgress(0);
    setVehicleData(null);
  };

  const handleClose = () => {
    setIsOpen(false);
    setDetectedPlate(null);
    setEditedPlate("");
    setCapturedImage(null);
    setError("");
    setVehicleData(null);
  };

  const prev = () => setCurrentIdx((i) => (i - 1 + cameras.length) % cameras.length);
  const next = () => setCurrentIdx((i) => (i + 1) % cameras.length);

  // Search vehicle in DB by plate
  const searchVehicle = useCallback(
    async (plate: string) => {
      setSearchingVehicle(true);
      try {
        const res = await apiFetch(`${API_VEHICLE}/buscar-placa/${encodeURIComponent(plate)}`, {
        });
        if (res.ok) {
          const data = await res.json();
          setVehicleData(data);
          if (data.found && onVehicleFound) {
            onVehicleFound(data);
          }
        }
      } catch {
        // silent fail on search
      }
      setSearchingVehicle(false);
    },
    [onVehicleFound]
  );

  // Capture frame from camera feed
  const captureFrame = useCallback(() => {
    if (!cam) return;
    setError("");
    setDetectedPlate(null);
    setVehicleData(null);

    // For MJPEG/snapshot cameras, we can capture the current img element
    if (cam.tipo_stream === "mjpeg" || cam.tipo_stream === "snapshot") {
      if (!imgRef.current) {
        setError("Feed da câmera não disponível.");
        return;
      }

      const img = imgRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      try {
        ctx.drawImage(img, 0, 0);
        const fullImage = compressCanvas(canvas, "plate");
        setCapturedImage(fullImage);

        // Crop bottom half for plate area
        const cropH = Math.round(canvas.height * 0.5);
        const cropY = Math.round(canvas.height * 0.5);
        const cropCanvas = document.createElement("canvas");
        cropCanvas.width = canvas.width;
        cropCanvas.height = cropH;
        const cropCtx = cropCanvas.getContext("2d");
        if (!cropCtx) return;
        cropCtx.drawImage(canvas, 0, cropY, canvas.width, cropH, 0, 0, canvas.width, cropH);

        // Binarize for better OCR
        const imageData = cropCtx.getImageData(0, 0, cropCanvas.width, cropCanvas.height);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
          const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
          const val = avg > 128 ? 255 : 0;
          data[i] = val;
          data[i + 1] = val;
          data[i + 2] = val;
        }
        cropCtx.putImageData(imageData, 0, 0);

        processOCR(cropCanvas.toDataURL("image/png"));
      } catch {
        setError(
          "Não foi possível capturar frame da câmera. Verifique se a câmera permite acesso CORS ou use o leitor de placa manual."
        );
      }
    } else {
      setError("Tipo de stream não suportado para captura. Use câmeras MJPEG ou Snapshot.");
    }
  }, [cam]);

  // Run Tesseract OCR
  const processOCR = useCallback(
    async (imageData: string) => {
      setProcessing(true);
      setProgress(0);

      try {
        const result = await Tesseract.recognize(imageData, "eng", {
          logger: (m) => {
            if (m.status === "recognizing text") {
              setProgress(Math.round(m.progress * 100));
            }
          },
        });

        const plate = extractPlate(result.data.text);
        if (plate) {
          setDetectedPlate(plate);
          setEditedPlate(plate);
          searchVehicle(plate);
        } else {
          setError(
            "Placa não identificada no frame. Tente capturar novamente quando o veículo estiver mais visível."
          );
        }
      } catch {
        setError("Erro ao processar OCR. Tente novamente.");
      } finally {
        setProcessing(false);
      }
    },
    [searchVehicle]
  );

  const handleConfirm = () => {
    const plate = editedPlate.trim().toUpperCase();
    if (plate) {
      onPlateDetected(plate, capturedImage || undefined);
      handleClose();
    }
  };

  const handleRetry = () => {
    setDetectedPlate(null);
    setEditedPlate("");
    setCapturedImage(null);
    setError("");
    setVehicleData(null);
    setProgress(0);
  };

  const handleManualSearch = () => {
    const plate = editedPlate.trim().toUpperCase();
    if (plate.length >= 3) {
      searchVehicle(plate);
    }
  };

  const statusLabel = (s?: string) => {
    const map: Record<string, { label: string; color: string }> = {
      ativa: { label: "AUTORIZADO", color: "#22c55e" },
      pendente_aprovacao: { label: "PENDENTE", color: "#f59e0b" },
      expirada: { label: "EXPIRADO", color: "#ef4444" },
      cancelada: { label: "CANCELADO", color: "#ef4444" },
    };
    return map[s || ""] || { label: s || "N/A", color: "#94a3b8" };
  };

  return (
    <>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={handleOpen}
        title="Leitura de placa pela câmera de segurança"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
          padding: "14px",
          borderRadius: "12px",
          width: "100%",
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
          border: "2px solid rgba(14,165,233,0.4)",
          color: "#fff",
          fontWeight: 700,
          fontSize: "14px",
          cursor: "pointer",
        }}
      >
        <Camera className="w-5 h-5" style={{ color: "#0ea5e9" }} />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <span>LER PLACA DA CÂMERA IP</span>
          <span style={{ fontSize: "10px", fontWeight: 400, opacity: 0.7 }}>(necessário integração de câmeras locais)</span>
        </div>
        <Zap className="w-4 h-4" style={{ color: "#f59e0b" }} />
      </button>

      {/* Modal */}
      {isOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 70,
            background: "rgba(0,0,0,0.92)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            overflowY: "auto",
            padding: "60px 16px 24px",
          }}
        >
          {/* Header */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              padding: "16px 20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              zIndex: 2,
              background: "linear-gradient(180deg, rgba(0,0,0,0.8) 0%, transparent 100%)",
            }}
          >
            <h3
              style={{
                color: "#fff",
                fontWeight: 700,
                fontSize: "16px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <ScanLine className="w-5 h-5" style={{ color: "#0ea5e9" }} />
              Leitura de Placa — Câmera
            </h3>
            <button
              onClick={handleClose}
              style={{
                background: "rgba(255,255,255,0.15)",
                border: "none",
                borderRadius: "50%",
                width: "36px",
                height: "36px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <X className="w-5 h-5" style={{ color: "#fff" }} />
            </button>
          </div>

          {/* Camera Feed */}
          <div style={{ width: "100%", maxWidth: "600px" }}>
            {cameras.length === 0 && !error && (
              <div
                style={{
                  padding: "40px",
                  textAlign: "center",
                  color: "#64748b",
                }}
              >
                <Camera className="w-12 h-12 mx-auto mb-3" style={{ color: "#334155" }} />
                <p style={{ fontSize: "14px" }}>Nenhuma câmera configurada.</p>
                <p style={{ fontSize: "12px", marginTop: "4px" }}>
                  Configure câmeras em Síndico &gt; Câmeras
                </p>
              </div>
            )}

            {cam && !capturedImage && (
              <div style={{ position: "relative", borderRadius: "16px", overflow: "hidden" }}>
                {/* Camera selector */}
                {cameras.length > 1 && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "12px",
                      padding: "8px",
                      background: "rgba(15,23,42,0.9)",
                    }}
                  >
                    <button
                      onClick={prev}
                      style={{
                        background: "rgba(255,255,255,0.1)",
                        border: "none",
                        borderRadius: "50%",
                        width: "28px",
                        height: "28px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        color: "#fff",
                      }}
                    >
                      <ChevronLeft style={{ width: 16, height: 16 }} />
                    </button>
                    <span
                      style={{
                        color: "#94a3b8",
                        fontSize: "13px",
                        fontWeight: 600,
                      }}
                    >
                      {cam.nome} ({cam.setor})
                    </span>
                    <button
                      onClick={next}
                      style={{
                        background: "rgba(255,255,255,0.1)",
                        border: "none",
                        borderRadius: "50%",
                        width: "28px",
                        height: "28px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        color: "#fff",
                      }}
                    >
                      <ChevronRight style={{ width: 16, height: 16 }} />
                    </button>
                  </div>
                )}

                {/* Feed */}
                {cam.tipo_stream === "mjpeg" || cam.tipo_stream === "snapshot" ? (
                  <img
                    ref={imgRef}
                    src={cam.url_stream}
                    alt={cam.nome}
                    crossOrigin="anonymous"
                    style={{ width: "100%", background: "#000" }}
                  />
                ) : cam.tipo_stream === "hls" ? (
                  <video
                    src={cam.url_stream}
                    autoPlay
                    muted
                    playsInline
                    crossOrigin="anonymous"
                    style={{ width: "100%", background: "#000" }}
                  />
                ) : (
                  <div
                    style={{
                      width: "100%",
                      aspectRatio: "16/9",
                      background: "#0f172a",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Camera style={{ width: 40, height: 40, color: "#334155" }} />
                  </div>
                )}

                {/* Plate guide overlay */}
                <div
                  style={{
                    position: "absolute",
                    bottom: "15%",
                    left: "15%",
                    right: "15%",
                    height: "20%",
                    border: "3px dashed #0ea5e9",
                    borderRadius: "12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    pointerEvents: "none",
                  }}
                >
                  <span
                    style={{
                      color: "#0ea5e9",
                      fontSize: "11px",
                      fontWeight: 600,
                      background: "rgba(0,0,0,0.6)",
                      padding: "3px 10px",
                      borderRadius: "8px",
                    }}
                  >
                    Área da placa
                  </span>
                </div>
              </div>
            )}

            {/* Captured image */}
            {capturedImage && (
              <img
                src={capturedImage}
                alt="Captura"
                style={{
                  width: "100%",
                  borderRadius: "16px",
                  opacity: processing ? 0.5 : 1,
                  transition: "opacity 0.3s",
                }}
              />
            )}
          </div>

          {/* Capture button */}
          {cam && !capturedImage && !processing && (
            <button
              onClick={captureFrame}
              style={{
                marginTop: "16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                padding: "16px 32px",
                borderRadius: "14px",
                background: "linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)",
                border: "none",
                color: "#fff",
                fontWeight: 700,
                fontSize: "16px",
                cursor: "pointer",
                boxShadow: "0 4px 15px rgba(14,165,233,0.4)",
              }}
            >
              <ScanLine className="w-5 h-5" />
              Capturar e Ler Placa
            </button>
          )}

          {/* Processing */}
          {processing && (
            <div
              style={{
                marginTop: "20px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <Loader2
                className="w-6 h-6 animate-spin"
                style={{ color: "#0ea5e9" }}
              />
              <p
                style={{
                  color: "#0ea5e9",
                  fontSize: "14px",
                  fontWeight: 600,
                }}
              >
                Processando OCR... {progress}%
              </p>
              <div
                style={{
                  width: "200px",
                  height: "6px",
                  borderRadius: "3px",
                  background: "rgba(255,255,255,0.1)",
                }}
              >
                <div
                  style={{
                    width: `${progress}%`,
                    height: "100%",
                    borderRadius: "3px",
                    background: "linear-gradient(90deg, #0ea5e9, #38bdf8)",
                    transition: "width 0.3s",
                  }}
                />
              </div>
            </div>
          )}

          {/* Detected Plate */}
          {detectedPlate && !processing && (
            <div
              style={{
                marginTop: "20px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "10px",
                width: "100%",
                maxWidth: "500px",
              }}
            >
              {/* Plate display */}
              <div
                style={{
                  padding: "8px 16px",
                  borderRadius: "14px",
                  background: "#fffbeb",
                  border: "3px solid #f59e0b",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
                onClick={() => plateInputRef.current?.focus()}
              >
                <input
                  ref={plateInputRef}
                  type="text"
                  value={editedPlate}
                  onChange={(e) =>
                    setEditedPlate(
                      e.target.value
                        .toUpperCase()
                        .replace(/[^A-Z0-9]/g, "")
                        .slice(0, 7)
                    )
                  }
                  maxLength={7}
                  style={{
                    fontWeight: 900,
                    fontSize: "32px",
                    color: "#92400e",
                    letterSpacing: "6px",
                    fontFamily: "monospace",
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    textAlign: "center",
                    width: `${Math.max(editedPlate.length, 1) * 28 + 20}px`,
                    caretColor: "#f59e0b",
                  }}
                />
                <Pencil
                  className="w-4 h-4"
                  style={{ color: "#92400e", opacity: 0.6, flexShrink: 0 }}
                />
              </div>

              <p style={{ color: "#86efac", fontSize: "13px", display: "flex", alignItems: "center", gap: "6px" }}>
                <CheckCircle2 className="w-4 h-4" />
                Placa identificada!
              </p>

              {/* Vehicle data card */}
              {searchingVehicle && (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#94a3b8", fontSize: "13px" }}>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Buscando veículo no sistema...
                </div>
              )}

              {vehicleData && !searchingVehicle && (
                <div
                  style={{
                    width: "100%",
                    borderRadius: "16px",
                    overflow: "hidden",
                    background: vehicleData.found ? "rgba(15,23,42,0.95)" : "rgba(239,68,68,0.1)",
                    border: vehicleData.found
                      ? `2px solid ${statusLabel(vehicleData.status).color}40`
                      : "2px solid rgba(239,68,68,0.3)",
                  }}
                >
                  {vehicleData.found ? (
                    <>
                      {/* Status banner */}
                      <div
                        style={{
                          padding: "10px 16px",
                          background: `${statusLabel(vehicleData.status).color}20`,
                          borderBottom: `1px solid ${statusLabel(vehicleData.status).color}30`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <span
                          style={{
                            fontWeight: 800,
                            fontSize: "14px",
                            color: statusLabel(vehicleData.status).color,
                            letterSpacing: "1px",
                          }}
                        >
                          {statusLabel(vehicleData.status).label}
                        </span>
                        {vehicleData.data_fim && (
                          <span style={{ fontSize: "11px", color: "#94a3b8" }}>
                            Válido até: {vehicleData.data_fim}
                          </span>
                        )}
                      </div>

                      {/* Vehicle info */}
                      <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: "10px" }}>
                        {vehicleData.modelo && (
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <Car className="w-4 h-4" style={{ color: "#0ea5e9", flexShrink: 0 }} />
                            <div>
                              <span style={{ color: "#64748b", fontSize: "11px" }}>Veículo</span>
                              <p style={{ color: "#fff", fontSize: "15px", fontWeight: 600 }}>
                                {vehicleData.modelo}
                                {vehicleData.cor ? ` — ${vehicleData.cor}` : ""}
                              </p>
                            </div>
                          </div>
                        )}

                        {vehicleData.motorista_nome && (
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <User className="w-4 h-4" style={{ color: "#0ea5e9", flexShrink: 0 }} />
                            <div>
                              <span style={{ color: "#64748b", fontSize: "11px" }}>Motorista</span>
                              <p style={{ color: "#fff", fontSize: "15px", fontWeight: 600 }}>
                                {vehicleData.motorista_nome}
                              </p>
                            </div>
                          </div>
                        )}

                        {vehicleData.morador_name && (
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <User className="w-4 h-4" style={{ color: "#22c55e", flexShrink: 0 }} />
                            <div>
                              <span style={{ color: "#64748b", fontSize: "11px" }}>Morador</span>
                              <p style={{ color: "#fff", fontSize: "15px", fontWeight: 600 }}>
                                {vehicleData.morador_name}
                              </p>
                            </div>
                          </div>
                        )}

                        {(vehicleData.bloco || vehicleData.apartamento) && (
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <MapPin className="w-4 h-4" style={{ color: "#f59e0b", flexShrink: 0 }} />
                            <div>
                              <span style={{ color: "#64748b", fontSize: "11px" }}>Endereço</span>
                              <p style={{ color: "#fff", fontSize: "15px", fontWeight: 600 }}>
                                {vehicleData.bloco && `Bloco ${vehicleData.bloco}`}
                                {vehicleData.apartamento && ` — Apto ${vehicleData.apartamento}`}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div
                      style={{
                        padding: "16px",
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                      }}
                    >
                      <AlertTriangle className="w-5 h-5" style={{ color: "#f59e0b", flexShrink: 0 }} />
                      <div>
                        <p style={{ color: "#fca5a5", fontWeight: 700, fontSize: "14px" }}>
                          Veículo NÃO cadastrado
                        </p>
                        <p style={{ color: "#94a3b8", fontSize: "12px", marginTop: "2px" }}>
                          Esta placa não possui autorização ativa no sistema.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Re-search button if plate was edited */}
              {editedPlate !== detectedPlate && editedPlate.length >= 3 && (
                <button
                  onClick={handleManualSearch}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "10px",
                    background: "rgba(14,165,233,0.15)",
                    border: "1px solid rgba(14,165,233,0.3)",
                    color: "#38bdf8",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Buscar placa corrigida
                </button>
              )}
            </div>
          )}

          {/* Error */}
          {error && !processing && (
            <div
              style={{
                marginTop: "20px",
                padding: "12px 20px",
                borderRadius: "12px",
                background: "rgba(239,68,68,0.15)",
                maxWidth: "400px",
              }}
            >
              <p style={{ color: "#fca5a5", fontSize: "13px", textAlign: "center" }}>
                {error}
              </p>
            </div>
          )}

          {/* Action buttons */}
          <div
            style={{
              marginTop: "20px",
              display: "flex",
              gap: "10px",
              width: "100%",
              maxWidth: "500px",
            }}
          >
            {detectedPlate && !processing && (
              <>
                <button
                  onClick={handleRetry}
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    padding: "14px",
                    borderRadius: "14px",
                    background: "rgba(255,255,255,0.1)",
                    border: "1px solid rgba(255,255,255,0.2)",
                    color: "#fff",
                    fontWeight: 600,
                    fontSize: "14px",
                    cursor: "pointer",
                  }}
                >
                  <RotateCcw className="w-4 h-4" />
                  Nova Captura
                </button>
                <button
                  onClick={handleConfirm}
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    padding: "14px",
                    borderRadius: "14px",
                    background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
                    border: "none",
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: "14px",
                    cursor: "pointer",
                    boxShadow: "0 4px 15px rgba(34,197,94,0.3)",
                  }}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Usar Placa
                </button>
              </>
            )}

            {error && !processing && (
              <button
                onClick={handleRetry}
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  padding: "14px",
                  borderRadius: "14px",
                  background: "linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)",
                  border: "none",
                  color: "#fff",
                  fontWeight: 600,
                  fontSize: "14px",
                  cursor: "pointer",
                }}
              >
                <RotateCcw className="w-4 h-4" />
                Tentar Novamente
              </button>
            )}
          </div>

          <canvas ref={canvasRef} style={{ display: "none" }} />
        </div>
      )}
    </>
  );
}
