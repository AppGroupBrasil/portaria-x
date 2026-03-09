/**
 * ═══════════════════════════════════════════════════════════
 * IMAGE COMPRESSION UTILITY
 * Redimensiona + comprime imagens antes de salvar no banco.
 * Mantém qualidade apenas onde necessário (LPR, QR, face-api).
 * ═══════════════════════════════════════════════════════════
 */

/** Perfis de compressão por uso */
export type ImageProfile = "general" | "face" | "plate" | "document";

interface ProfileConfig {
  maxWidth: number;
  maxHeight: number;
  quality: number;   // 0-1 JPEG quality
  format: "image/jpeg";
}

const PROFILES: Record<ImageProfile, ProfileConfig> = {
  /** Fotos gerais: correspondência, delivery, protocolo — menor possível */
  general: { maxWidth: 640, maxHeight: 640, quality: 0.45, format: "image/jpeg" },
  /** Fotos de rosto: precisa ser legível mas face_descriptor já foi extraído */
  face: { maxWidth: 480, maxHeight: 480, quality: 0.5, format: "image/jpeg" },
  /** Fotos de placa: OCR já foi feito, foto é só comprovante visual */
  plate: { maxWidth: 800, maxHeight: 600, quality: 0.55, format: "image/jpeg" },
  /** Documentos: pode ser impresso em A4 — precisa de mais resolução */
  document: { maxWidth: 1024, maxHeight: 1024, quality: 0.55, format: "image/jpeg" },
};

/**
 * Comprime uma imagem base64 (ou data URL) para o perfil desejado.
 * Retorna um data URL JPEG comprimido.
 *
 * @param dataUrl - A imagem em formato data URL (base64)
 * @param profile - Perfil de uso: "general" | "face" | "plate" | "document"
 * @returns Promise<string> - data URL comprimido
 */
export function compressImage(dataUrl: string, profile: ImageProfile = "general"): Promise<string> {
  return new Promise((resolve, reject) => {
    // Se não é data URL válido, retornar como está
    if (!dataUrl || !dataUrl.startsWith("data:")) {
      resolve(dataUrl);
      return;
    }

    const config = PROFILES[profile];
    const img = new Image();

    img.onload = () => {
      try {
        let { width, height } = img;

        // Calcular novo tamanho mantendo proporção
        if (width > config.maxWidth || height > config.maxHeight) {
          const ratio = Math.min(config.maxWidth / width, config.maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(dataUrl); // fallback
          return;
        }

        // Suavização para redimensionamento
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "medium";
        ctx.drawImage(img, 0, 0, width, height);

        const compressed = canvas.toDataURL(config.format, config.quality);

        // Só usar comprimido se for realmente menor
        resolve(compressed.length < dataUrl.length ? compressed : dataUrl);
      } catch {
        resolve(dataUrl); // fallback em caso de erro
      }
    };

    img.onerror = () => {
      resolve(dataUrl); // fallback
    };

    img.src = dataUrl;
  });
}

/**
 * Comprime uma imagem capturada por canvas.toDataURL()
 * Versão síncrona para uso em capturePhoto onde já temos o canvas.
 * Redimensiona o canvas e retorna data URL comprimido.
 */
export function compressCanvas(
  sourceCanvas: HTMLCanvasElement,
  profile: ImageProfile = "general"
): string {
  const config = PROFILES[profile];
  let { width, height } = sourceCanvas;

  if (width > config.maxWidth || height > config.maxHeight) {
    const ratio = Math.min(config.maxWidth / width, config.maxHeight / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }

  const outCanvas = document.createElement("canvas");
  outCanvas.width = width;
  outCanvas.height = height;

  const ctx = outCanvas.getContext("2d");
  if (!ctx) return sourceCanvas.toDataURL(config.format, config.quality);

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "medium";
  ctx.drawImage(sourceCanvas, 0, 0, width, height);

  return outCanvas.toDataURL(config.format, config.quality);
}
