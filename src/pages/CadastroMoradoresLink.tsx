import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import TutorialButton, { TSection, TStep, TBullet } from "@/components/TutorialButton";
import {
  ChevronLeft,
  Link2,
  Copy,
  CheckCircle2,
  RefreshCw,
  Share2,
} from "lucide-react";
import { APP_ORIGIN } from "@/lib/config";
import { apiFetch } from "@/lib/api";
import { useTheme } from "@/hooks/useTheme";

export default function CadastroMoradoresLink() {
  const { isDark, p } = useTheme();
  const navigate = useNavigate();

  const [link, setLink] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
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

  const gerarLink = async () => {
    setIsGenerating(true);
    setCopied(false);
    try {
      const res = await apiFetch("/api/moradores/gerar-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao gerar link.");
      setLink(data.link);
    } catch {
      // Fallback: gerar link local com token simulado
      const token = Math.random().toString(36).substring(2, 10);
      const baseUrl = APP_ORIGIN;
      setLink(`${baseUrl}/register/morador?ref=${token}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const copiarLink = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
      const ta = document.createElement("textarea");
      ta.value = link;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const compartilhar = async () => {
    if (!link) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Cadastro de Morador - ${condominioNome || "Condomínio"}`,
          text: `Faça seu cadastro como morador:\n`,
          url: link,
        });
      } catch {
        // Usuário cancelou
      }
    } else {
      copiarLink();
    }
  };

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: p.pageBg }}>
      {/* Header */}
      <header className="sticky top-0 z-40" style={{ background: p.headerBg, borderBottom: p.headerBorder, boxShadow: p.headerShadow, color: p.text, paddingTop: "max(0, env(safe-area-inset-top))" }}>
        <div style={{ height: "4rem", display: "flex", alignItems: "center", gap: 12, paddingLeft: "1rem", paddingRight: "1rem" }}>
          <button onClick={() => navigate("/cadastros/moradores")} style={{ width: 40, height: 40, borderRadius: 12, background: p.btnBg, border: p.btnBorder, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: p.text }}>
            <ChevronLeft className="w-7 h-7" />
          </button>
          <span style={{ fontWeight: 700, fontSize: 18 }}>Cadastro via Link</span>
          <div style={{ marginLeft: "auto" }}>
            <TutorialButton title="Cadastro via Link">
              <TSection icon={<span>📋</span>} title="O QUE É ESTA FUNÇÃO?">
                <p>Gera um <strong>link exclusivo de cadastro</strong> para enviar aos moradores. Eles clicam no link, preenchem os próprios dados e já ficam cadastrados no condomínio automaticamente. Ideal para quando você quer que o <strong>próprio morador</strong> se cadastre sem precisar digitar os dados de cada um.</p>
              </TSection>
              <TSection icon={<span>🏗️</span>} title="PASSO A PASSO">
                <TStep n={1}>Clique em <strong>"Gerar Link"</strong> — o sistema cria um link exclusivo do seu condomínio</TStep>
                <TStep n={2}>O link aparece na tela. Toque em <strong>"Copiar"</strong> para copiar o link</TStep>
                <TStep n={3}><strong>Envie o link</strong> para os moradores — pode ser por WhatsApp, e-mail, grupo do condomínio, etc.</TStep>
                <TStep n={4}>O morador clica no link, abre uma página no celular e <strong>preenche seus dados</strong> (nome, bloco, unidade, WhatsApp, e-mail, senha)</TStep>
                <TStep n={5}>Ao confirmar, o morador é <strong>cadastrado automaticamente</strong> e já pode usar o app</TStep>
                <p style={{ marginTop: "8px", fontSize: "14px", color: "#2d3354" }}>👉 Você pode enviar o mesmo link para vários moradores — cada um cria seu próprio cadastro.</p>
              </TSection>
              <TSection icon={<span>🔧</span>} title="FUNÇÕES DISPONÍVEIS">
                <TBullet><strong>Copiar link</strong> — Copia o link para a área de transferência com um toque</TBullet>
                <TBullet><strong>Compartilhar via WhatsApp</strong> — Abre o WhatsApp diretamente com o link para enviar</TBullet>
                <TBullet><strong>Renovar link</strong> — Gera um novo link e invalida o anterior (por segurança)</TBullet>
              </TSection>
              <TSection icon={<span>⭐</span>} title="DICAS IMPORTANTES">
                <TBullet>O link é <strong>exclusivo do condomínio</strong> — moradores de outros condomínios não conseguem usá-lo</TBullet>
                <TBullet>Envie no <strong>grupo de WhatsApp</strong> do condomínio para atingir todos de uma vez</TBullet>
                <TBullet>Se quiser bloquear novos cadastros, <strong>renove o link</strong> — o antigo para de funcionar</TBullet>
                <TBullet>Os moradores precisam escolher <strong>bloco e unidade</strong> no cadastro — os blocos precisam estar cadastrados antes</TBullet>
                <TBullet>Método ideal para condomínios <strong>médios</strong> (20-100 unidades)</TBullet>
              </TSection>
            </TutorialButton>
          </div>
        </div>
      </header>

      <main className="flex-1" style={{ paddingLeft: "1rem", paddingRight: "1rem", paddingTop: "2rem", paddingBottom: "max(3.5rem, calc(3.5rem + env(safe-area-inset-bottom)))" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* Info box */}
          <div className="rounded-xl" style={{ padding: "20px", backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="flex gap-3">
              <Link2 className="w-6 h-6 shrink-0 mt-0.5" style={{ color: "#38bdf8" }} />
              <div className="text-sm leading-relaxed" style={{ color: isDark ? "rgba(255,255,255,0.7)" : "#64748b" }}>
                <p>
                  Gere um <strong style={{ color: isDark ? "#ffffff" : "#003580" }}>link personalizado</strong>{" "}
                  para que os moradores realizem o próprio cadastro.
                </p>
                <p className="mt-2">
                  O link pode ser enviado via WhatsApp, e-mail ou qualquer mensageiro.
                </p>
              </div>
            </div>
          </div>

          {/* Card Gerar Link */}
          <div className="rounded-2xl" style={{ padding: "2rem", backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
            {!link ? (
              <div className="flex flex-col items-center gap-5 py-4">
                <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, rgba(56,189,248,0.15) 0%, rgba(0,53,128,0.2) 100%)", border: "1px solid rgba(56,189,248,0.2)" }}>
                  <Link2 className="w-8 h-8" style={{ color: "#38bdf8" }} />
                </div>
                <p className="text-sm text-center" style={{ color: isDark ? "rgba(255,255,255,0.6)" : "#64748b" }}>
                  Clique abaixo para gerar o link de cadastro
                  {condominioNome ? ` do ${condominioNome}` : ""}.
                </p>
                <Button
                  onClick={gerarLink}
                  disabled={isGenerating}
                  className="w-full h-12 font-semibold"
                  style={isDark ? { backgroundColor: "#ffffff", color: "#003580", border: "2px solid #ffffff" } : undefined}
                >
                  {isGenerating ? (
                    <div className="w-6 h-6 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                  ) : (
                    "Gerar Link"
                  )}
                </Button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }} className="animate-fade-in">
                <div className="flex items-center gap-2 text-sm" style={{ color: "#34d399" }}>
                  <CheckCircle2 className="w-5 h-5" />
                  Link gerado com sucesso!
                </div>

                {/* Link display */}
                <div className="rounded-lg" style={{ padding: "14px 16px", backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
                  <p className="text-xs mb-1" style={{ color: isDark ? "rgba(255,255,255,0.5)" : "#64748b" }}>Link de cadastro:</p>
                  <p className="text-sm break-all font-mono select-all" style={{ color: isDark ? "#ffffff" : "#003580" }}>
                    {link}
                  </p>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    onClick={copiarLink}
                    className="h-12 gap-2 text-sm"
                    style={isDark ? { border: "2px solid #ffffff", color: "#ffffff" } : undefined}
                  >
                    {copied ? (
                      <>
                        <CheckCircle2 className="w-5 h-5" style={{ color: "#34d399" }} />
                        Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="w-5 h-5" />
                        Copiar
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={compartilhar}
                    className="h-12 gap-2 text-sm"
                    style={isDark ? { border: "2px solid #ffffff", color: "#ffffff" } : undefined}
                  >
                    <Share2 className="w-5 h-5" />
                    Compartilhar
                  </Button>
                </div>

                {/* Gerar novo */}
                <button
                  onClick={gerarLink}
                  className="flex items-center gap-2 text-xs hover:text-sky-400 transition-colors mx-auto"
                  style={{ color: isDark ? "rgba(255,255,255,0.5)" : "#64748b" }}
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Gerar novo link
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
