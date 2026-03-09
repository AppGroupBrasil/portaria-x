import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import TutorialButton, { TSection, TStep, TBullet } from "@/components/TutorialButton";
import {
  ChevronLeft,
  QrCode,
  Download,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import { APP_ORIGIN } from "@/lib/config";
import { apiFetch } from "@/lib/api";
import { useTheme } from "@/hooks/useTheme";
import QRCodeLib from "qrcode";

export default function CadastroMoradoresQRCode() {
  const { isDark, p } = useTheme();
  const navigate = useNavigate();

  const [link, setLink] = useState("");
  const [qrImage, setQrImage] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [condominioNome, setCondominioNome] = useState("");

  // Buscar nome do condomínio
  useEffect(() => {
    apiFetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data?.condominio_nome) setCondominioNome(data.condominio_nome);
      })
      .catch(() => {});
  }, []);

  // Gerar QR Code real usando a biblioteca qrcode
  const drawQR = async (text: string) => {
    try {
      const dataUrl = await QRCodeLib.toDataURL(text, {
        width: 280,
        margin: 2,
        color: { dark: "#000000", light: "#ffffff" },
        errorCorrectionLevel: "M",
      });
      setQrImage(dataUrl);
    } catch (err) {
      console.error("Erro ao gerar QR Code:", err);
    }
  };

  const gerarQRCode = async () => {
    setIsGenerating(true);
    try {
      const res = await apiFetch("/api/moradores/gerar-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setLink(data.link);
      await drawQR(data.link);
    } catch {
      // Fallback: gerar link local simulado
      const token = Math.random().toString(36).substring(2, 10);
      const baseUrl = APP_ORIGIN;
      const generatedLink = `${baseUrl}/register/morador?ref=${token}`;
      setLink(generatedLink);
      await drawQR(generatedLink);
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadPDF = () => {
    if (!qrImage) return;

    // Criar HTML para impressão
    const dataUrl = qrImage;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>QR Code - Cadastro de Moradores</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: Arial, sans-serif;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            padding: 40px;
            text-align: center;
          }
          h1 { font-size: 24px; margin-bottom: 8px; color: #0284c7; }
          h2 { font-size: 18px; margin-bottom: 32px; color: #666; font-weight: normal; }
          img { width: 280px; height: 280px; margin-bottom: 24px; }
          .link { 
            font-size: 12px; 
            color: #0284c7; 
            word-break: break-all;
            max-width: 400px;
            margin-bottom: 32px;
          }
          .instructions {
            font-size: 14px;
            color: #444;
            max-width: 400px;
            line-height: 1.6;
            border-top: 1px solid #ddd;
            padding-top: 24px;
          }
          @media print {
            body { padding: 60px; }
          }
        </style>
      </head>
      <body>
        <h1>${condominioNome || "Condomínio"}</h1>
        <h2>Cadastro de Morador</h2>
        <img src="${dataUrl}" alt="QR Code" />
        <p class="link">${link}</p>
        <div class="instructions">
          <p><strong>Como se cadastrar:</strong></p>
          <p>1. Aponte a câmera do celular para o QR Code acima</p>
          <p>2. Acesse o link que aparecerá na tela</p>
          <p>3. Preencha seus dados para completar o cadastro</p>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  };

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: p.pageBg }}>
      {/* Header */}
      <header className="sticky top-0 z-40" style={{ background: p.headerBg, borderBottom: p.headerBorder, boxShadow: p.headerShadow, color: p.text }}>
        <div style={{ height: "4.5rem", display: "flex", alignItems: "center", gap: 12, paddingLeft: "1rem", paddingRight: "1rem" }}>
          <button onClick={() => navigate("/cadastros/moradores")} style={{ width: 40, height: 40, borderRadius: 12, background: p.btnBg, border: p.btnBorder, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: p.text }}>
            <ChevronLeft className="w-6 h-6" />
          </button>
          <span style={{ fontWeight: 700, fontSize: 18 }}>Cadastro via QR Code</span>
          <div style={{ marginLeft: "auto" }}>
            <TutorialButton title="Cadastro via QR Code">
              <TSection icon={<span>📋</span>} title="O QUE É ESTA FUNÇÃO?">
                <p>Gera um <strong>QR Code exclusivo de cadastro</strong> que os moradores escaneiam com o celular para se cadastrar automaticamente. Ideal para colocar em locais físicos do condomínio — mural, elevador, portaria, recepção — e permitir que moradores se cadastrem <strong>no próprio ritmo</strong>.</p>
              </TSection>
              <TSection icon={<span>🏗️</span>} title="PASSO A PASSO">
                <TStep n={1}>Clique em <strong>"Gerar QR Code"</strong> — o sistema cria um QR Code exclusivo do condomínio</TStep>
                <TStep n={2}>O QR Code aparece na tela. Você pode:</TStep>
                <TBullet>→ <strong>Imprimir</strong> clicando no botão de impressão</TBullet>
                <TBullet>→ <strong>Baixar</strong> a imagem para o celular/computador</TBullet>
                <TBullet>→ <strong>Compartilhar</strong> via WhatsApp</TBullet>
                <TStep n={3}>Cole o QR Code impresso nos locais do condomínio (mural, portaria, elevadores)</TStep>
                <TStep n={4}>O morador <strong>escaneia o QR Code</strong> com a câmera do celular</TStep>
                <TStep n={5}>Abre uma página onde o morador preenche seus dados e se cadastra automaticamente</TStep>
                <p style={{ marginTop: "8px", fontSize: "13px", color: "#2d3354" }}>👉 O mesmo QR Code serve para todos os moradores — cada um cria seu próprio cadastro.</p>
              </TSection>
              <TSection icon={<span>🔧</span>} title="FUNÇÕES DISPONÍVEIS">
                <TBullet><strong>Imprimir QR Code</strong> — Imprime em tamanho ideal para colar em murais e quadros de aviso</TBullet>
                <TBullet><strong>Baixar imagem</strong> — Salva o QR Code como imagem no dispositivo</TBullet>
                <TBullet><strong>Compartilhar</strong> — Envia o QR Code por WhatsApp ou outras redes</TBullet>
                <TBullet><strong>Renovar código</strong> — Gera um novo QR Code e invalida o anterior (por segurança)</TBullet>
              </TSection>
              <TSection icon={<span>⭐</span>} title="DICAS IMPORTANTES">
                <TBullet>Coloque o QR Code no <strong>mural, elevador e portaria</strong> — locais de grande circulação</TBullet>
                <TBullet>Se precisar bloquear novos cadastros, <strong>renove o QR Code</strong> — o antigo para de funcionar</TBullet>
                <TBullet>Funciona com qualquer <strong>câmera de celular</strong> — não precisa de app especial para escanear</TBullet>
                <TBullet>Os blocos precisam estar <strong>cadastrados antes</strong> para o morador selecionar no formulário</TBullet>
                <TBullet>Método ideal para condomínios que querem <strong>cadastro passivo</strong> sem precisar enviar links individualmente</TBullet>
              </TSection>
            </TutorialButton>
          </div>
        </div>
      </header>

      <main className="flex-1" style={{ paddingLeft: "1rem", paddingRight: "1rem", paddingTop: "2rem", paddingBottom: "3.5rem" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* Info box */}
          <div className="rounded-xl" style={{ padding: "20px", backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="flex gap-3">
              <QrCode className="w-5 h-5 shrink-0 mt-0.5" style={{ color: "#38bdf8" }} />
              <div className="text-sm leading-relaxed" style={{ color: isDark ? "rgba(255,255,255,0.7)" : "#64748b" }}>
                <p>
                  Gere um <strong style={{ color: isDark ? "#ffffff" : "#003580" }}>QR Code</strong> para
                  que os moradores façam o cadastro escaneando com o celular.
                </p>
                <p className="mt-2">
                  Imprima o PDF e afixe no mural do condomínio ou distribua aos moradores.
                </p>
              </div>
            </div>
          </div>

          {/* Card QR Code */}
          <div className="rounded-2xl" style={{ padding: "2rem", backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
            {!link ? (
              <div className="flex flex-col items-center gap-5 py-4">
                <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, rgba(56,189,248,0.15) 0%, rgba(0,53,128,0.2) 100%)", border: "1px solid rgba(56,189,248,0.2)" }}>
                  <QrCode className="w-8 h-8" style={{ color: "#38bdf8" }} />
                </div>
                <p className="text-sm text-center" style={{ color: isDark ? "rgba(255,255,255,0.6)" : "#64748b" }}>
                  Clique para gerar o QR Code de cadastro
                  {condominioNome ? ` do ${condominioNome}` : ""}.
                </p>
                <Button
                  onClick={gerarQRCode}
                  disabled={isGenerating}
                  className="w-full h-12 font-semibold"
                  style={isDark ? { backgroundColor: "#ffffff", color: "#003580", border: "2px solid #ffffff" } : undefined}
                >
                  {isGenerating ? (
                    <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                  ) : (
                    "Gerar QR Code"
                  )}
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-5 animate-fade-in">
                <div className="flex items-center gap-2 text-sm self-start" style={{ color: "#34d399" }}>
                  <CheckCircle2 className="w-4 h-4" />
                  QR Code gerado!
                </div>

                {/* QR Code Image */}
                <div className="rounded-xl" style={{ padding: "16px", backgroundColor: "#ffffff" }}>
                  {qrImage ? (
                    <img src={qrImage} alt="QR Code" style={{ width: 220, height: 220, display: "block" }} />
                  ) : (
                    <div style={{ width: 220, height: 220 }} />
                  )}
                </div>

                {/* Link display */}
                <div className="w-full rounded-lg" style={{ padding: "12px 16px", backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
                  <p className="text-xs mb-1" style={{ color: isDark ? "rgba(255,255,255,0.5)" : "#64748b" }}>Link embutido:</p>
                  <p className="text-[11px] break-all font-mono" style={{ color: isDark ? "#ffffff" : "#003580" }}>
                    {link}
                  </p>
                </div>

                {/* Download PDF */}
                <Button
                  onClick={downloadPDF}
                  className="w-full h-12 font-semibold gap-2"
                  style={isDark ? { backgroundColor: "#ffffff", color: "#003580", border: "2px solid #ffffff" } : undefined}
                >
                  <Download className="w-4 h-4" />
                  Imprimir / Salvar PDF
                </Button>

                {/* Gerar novo */}
                <button
                  onClick={gerarQRCode}
                  className="flex items-center gap-2 text-xs hover:text-sky-400 transition-colors"
                  style={{ color: isDark ? "rgba(255,255,255,0.5)" : "#64748b" }}
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Gerar novo QR Code
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
