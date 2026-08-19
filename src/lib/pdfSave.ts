/* ═══════════════════════════════════════════════════════
   Entrega do PDF gerado pelo jsPDF.

   doc.save() cria um blob: e dispara um <a download>. A WebView do
   Android nao tem gerenciador de download, entao no aplicativo o
   clique nao produzia nada — nenhum relatorio saia. No nativo o
   arquivo e gravado em disco e aberto pelo seletor do sistema.
   ═══════════════════════════════════════════════════════ */
import type { jsPDF } from "jspdf";
import { isNative } from "./config";

async function salvarNativo(doc: jsPDF, fileName: string): Promise<void> {
  const { Filesystem, Directory } = await import("@capacitor/filesystem");
  const { Share } = await import("@capacitor/share");

  const dataUri = doc.output("datauristring");
  const base64 = dataUri.slice(dataUri.indexOf(",") + 1);

  const { uri } = await Filesystem.writeFile({
    path: fileName,
    data: base64,
    directory: Directory.Cache,
    recursive: true,
  });

  await Share.share({ title: fileName, url: uri });
}

/** Salva o PDF. Assincrono por dentro, chamavel de funcoes sincronas. */
export function salvarPdf(doc: jsPDF, fileName: string): void {
  if (!isNative) {
    doc.save(fileName);
    return;
  }
  salvarNativo(doc, fileName).catch((err) => {
    console.error("Falha ao salvar PDF no dispositivo:", err);
    // Ultimo recurso: o download do navegador, caso a WebView aceite.
    try { doc.save(fileName); } catch { /* nada mais a tentar */ }
  });
}
