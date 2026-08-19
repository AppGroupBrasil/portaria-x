/* ═══════════════════════════════════════════════════════
   Geracao de PDF A4 a partir de um elemento da tela.
   window.print() nao funciona dentro da WebView do Capacitor
   (Android nao expoe o dialogo de impressao ao JS), entao a
   folha e rasterizada e salva como PDF.
   ═══════════════════════════════════════════════════════ */
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { salvarPdf } from "./pdfSave";

/* html2canvas 1.4.1 aborta ao encontrar oklch() nos estilos computados
   (o tema usa oklch em ~95 pontos). O clone recebe os equivalentes em hex
   e, de quebra, a folha sai sempre clara — nao se imprime tema escuro. */
const PRINT_SAFE_VARS = `
  :root, :root.dark, :root.steel, :root.emerald, :root.midnight {
    --background: #ffffff; --foreground: #0f172a;
    --card: #ffffff; --card-foreground: #0f172a;
    --primary: #003580; --primary-foreground: #ffffff;
    --secondary: #f1f5f9; --secondary-foreground: #334155;
    --muted: #f1f5f9; --muted-foreground: #64748b;
    --accent: #f1f5f9; --accent-foreground: #1e293b;
    --destructive: #dc2626; --border: #e2e8f0; --input: #e2e8f0;
    --ring: #003580; --warning-foreground: #b45309;
  }
`;

const A4_W = 210;
const A4_H = 297;

export async function elementoParaPdfA4(el: HTMLElement, fileName: string): Promise<void> {
  // A folha tem 210mm de largura e transborda a viewport do celular; sem as
  // medidas explicitas o html2canvas corta o que esta fora da tela.
  const canvas = await html2canvas(el, {
    scale: 2,
    backgroundColor: "#ffffff",
    useCORS: true,
    logging: false,
    width: el.scrollWidth,
    height: el.scrollHeight,
    windowWidth: Math.max(el.scrollWidth, document.documentElement.scrollWidth),
    scrollX: 0,
    scrollY: 0,
    onclone: (doc) => {
      const style = doc.createElement("style");
      style.textContent = PRINT_SAFE_VARS;
      doc.head.appendChild(style);
    },
  });

  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const img = canvas.toDataURL("image/jpeg", 0.92);
  const imgH = (canvas.height * A4_W) / canvas.width;

  if (imgH <= A4_H + 1) {
    doc.addImage(img, "JPEG", 0, 0, A4_W, imgH);
  } else {
    let offset = 0;
    while (offset < imgH) {
      if (offset > 0) doc.addPage();
      doc.addImage(img, "JPEG", 0, -offset, A4_W, imgH);
      offset += A4_H;
    }
  }

  salvarPdf(doc, fileName);
}
