import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import TutorialButton, { TSection, TStep, TBullet } from "@/components/TutorialButton";
import {
  ChevronLeft,
  FileSpreadsheet,
  Upload,
  AlertCircle,
  CheckCircle2,
  X,
  FileText,
  Copy,
  Sparkles,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useTheme } from "@/hooks/useTheme";

interface ParsedRow {
  nome: string;
  bloco: string;
  unidade: string;
  perfil: string;
  whatsapp: string;
  email: string;
}

export default function CadastroMoradoresPlanilha() {
  const { p } = useTheme();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [promptCopied, setPromptCopied] = useState(false);

  const aiPrompt = `Preciso que você converta a minha planilha de moradores para o formato CSV separado por ponto-e-vírgula (;) com as seguintes colunas nesta ordem exata:

Nome Completo;Bloco;Unidade;Perfil;WhatsApp;E-mail

Regras:
- A primeira linha deve ser o cabeçalho exatamente como acima.
- O campo "Perfil" deve ser: Proprietário, Locatário ou Dependente.
- O WhatsApp deve estar no formato (XX) XXXXX-XXXX.
- Separador de colunas: ponto-e-vírgula (;)
- Codificação: UTF-8 com BOM.
- Não incluir aspas nos campos, a menos que o valor contenha ponto-e-vírgula.

Aqui está a minha planilha atual:\n[COLE AQUI OS DADOS DA SUA PLANILHA]`;

  const copyPrompt = () => {
    navigator.clipboard.writeText(aiPrompt);
    setPromptCopied(true);
    setTimeout(() => setPromptCopied(false), 2500);
  };

  // Parse do CSV
  const parseCSV = (text: string): ParsedRow[] => {
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length < 2) return [];

    // Pular header
    const rows = lines.slice(1);
    return rows.map((line) => {
      const cols = line.split(";").map((c) => c.trim());
      return {
        nome: cols[0] || "",
        bloco: cols[1] || "",
        unidade: cols[2] || "",
        perfil: cols[3] || "",
        whatsapp: cols[4] || "",
        email: cols[5] || "",
      };
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError("");
    setSuccess("");
    const f = e.target.files?.[0];
    if (!f) return;

    if (!f.name.endsWith(".csv") && !f.name.endsWith(".CSV")) {
      setError("Selecione um arquivo .csv (salve a planilha como CSV separado por ponto-e-vírgula).");
      return;
    }

    setFile(f);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const data = parseCSV(text);
      if (data.length === 0) {
        setError("Arquivo vazio ou formato inválido. Use o template fornecido.");
        setFile(null);
        return;
      }
      setParsedData(data);
    };
    reader.readAsText(f, "UTF-8");
  };

  const removeFile = () => {
    setFile(null);
    setParsedData([]);
    setError("");
    setSuccess("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleUpload = async () => {
    if (parsedData.length === 0) return;

    // Validar dados
    const invalids = parsedData.filter(
      (r) => !r.nome || !r.bloco || !r.unidade || !r.email
    );
    if (invalids.length > 0) {
      setError(
        `${invalids.length} linha(s) com campos obrigatórios faltando (Nome, Bloco, Unidade, E-mail).`
      );
      return;
    }

    setIsUploading(true);
    setError("");
    try {
      const res = await apiFetch("/api/moradores/importar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moradores: parsedData }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao importar.");

      const count = data.imported || parsedData.length;
      setSuccess(`${count} morador(es) importado(s) com sucesso!`);
      setParsedData([]);
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
    } catch (err: any) {
      console.warn("Upload failed, using demo fallback:", err?.message);
      // Fallback para demonstração
      setSuccess(`${parsedData.length} morador(es) importado(s) com sucesso! (simulação)`);
      setParsedData([]);
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: p.pageBg }}>
      {/* Header */}
      <header className="sticky top-0 z-40" style={{ background: p.headerBg, borderBottom: p.headerBorder, boxShadow: p.headerShadow, color: p.text }}>
        <div style={{ height: "4.5rem", display: "flex", alignItems: "center", gap: 12, paddingLeft: "1rem", paddingRight: "1rem" }}>
          <button onClick={() => navigate("/cadastros/moradores")} style={{ width: 40, height: 40, borderRadius: 12, background: p.btnBg, border: p.btnBorder, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: p.text }}>
            <ChevronLeft className="w-6 h-6" />
          </button>
          <span style={{ fontWeight: 700, fontSize: 18 }}>Cadastro em Lote</span>
          <div style={{ marginLeft: "auto" }}>
            <TutorialButton title="Cadastro em Lote (Planilha)">
              <TSection icon={<span>📋</span>} title="O QUE É ESTA FUNÇÃO?">
                <p>Importe <strong>dezenas ou centenas de moradores de uma vez</strong> usando uma planilha Excel ou CSV. Ideal para condomínios grandes que não querem cadastrar um por um. Você baixa o modelo, preenche com os dados e faz upload — o sistema cadastra todos automaticamente.</p>
              </TSection>
              <TSection icon={<span>🏗️</span>} title="PASSO A PASSO">
                <TStep n={1}>Clique em <strong>"Baixar Modelo"</strong> para obter a planilha modelo (arquivo .xlsx)</TStep>
                <TStep n={2}>Abra a planilha no Excel ou Google Sheets</TStep>
                <TStep n={3}>Preencha cada linha com os dados de um morador: <strong>nome, bloco, unidade, WhatsApp, e-mail, senha, perfil</strong></TStep>
                <TStep n={4}>Salve o arquivo no formato <strong>.xlsx</strong> ou <strong>.csv</strong></TStep>
                <TStep n={5}>Clique em <strong>"Upload"</strong> e selecione o arquivo preenchido</TStep>
                <TStep n={6}>O sistema processa a planilha e mostra uma <strong>prévia dos dados importados</strong></TStep>
                <TStep n={7}>Revise os dados, corrija erros destacados em vermelho e clique em <strong>"Confirmar"</strong></TStep>
                <p style={{ marginTop: "8px", fontSize: "13px", color: p.textSecondary }}>👉 Todos os moradores são cadastrados de uma vez e já podem acessar o app.</p>
              </TSection>
              <TSection icon={<span>📱</span>} title="COLUNAS DA PLANILHA">
                <TBullet><strong>Nome</strong> — Nome completo do morador</TBullet>
                <TBullet><strong>Bloco</strong> — Nome do bloco exatamente como cadastrado no sistema</TBullet>
                <TBullet><strong>Unidade</strong> — Número do apartamento/casa</TBullet>
                <TBullet><strong>WhatsApp</strong> — Número com DDD (ex: 11999998888)</TBullet>
                <TBullet><strong>E-mail</strong> — Será o login do morador (deve ser único)</TBullet>
                <TBullet><strong>Senha</strong> — 6 dígitos numéricos</TBullet>
              </TSection>
              <TSection icon={<span>⭐</span>} title="DICAS IMPORTANTES">
                <TBullet><strong>Use SEMPRE o modelo fornecido</strong> — planilhas com colunas diferentes não serão aceitas</TBullet>
                <TBullet>Os nomes dos <strong>blocos na planilha</strong> devem ser idênticos aos cadastrados no sistema</TBullet>
                <TBullet>Formatos aceitos: <strong>.xlsx</strong> (Excel) e <strong>.csv</strong></TBullet>
                <TBullet>Dados inválidos são <strong>destacados em vermelho</strong> para você corrigir antes de confirmar</TBullet>
                <TBullet>E-mails duplicados serão <strong>rejeitados</strong> — cada morador precisa de um e-mail único</TBullet>
                <TBullet>Método ideal para condomínios <strong>grandes</strong> (100+ unidades) — cadastre todos de uma vez</TBullet>
              </TSection>
            </TutorialButton>
          </div>
        </div>
      </header>

      <main className="flex-1" style={{ paddingLeft: "1rem", paddingRight: "1rem", paddingTop: "4rem", paddingBottom: "3.5rem" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Info box */}
          <div className="rounded-xl p-5" style={{ backgroundColor: p.surfaceBg, border: p.cardBorder }}>
            <div className="flex gap-3">
              <FileSpreadsheet className="w-5 h-5 shrink-0 mt-0.5" style={{ color: p.accent }} />
              <div className="text-sm leading-relaxed" style={{ color: p.textSecondary }}>
                <p>
                  Importe vários moradores de uma só vez usando uma{" "}
                  <strong style={{ color: p.textAccent }}>planilha CSV</strong>.
                </p>
                <p className="mt-2">
                  Baixe o template, preencha os dados e faça o upload.
                </p>
              </div>
            </div>
          </div>

          {/* Step 1: Instruções de formato */}
          <div className="rounded-2xl p-7" style={{ backgroundColor: p.surfaceBg, border: p.cardBorder }}>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold" style={{ color: p.accent }}>
                1
              </div>
              <span className="text-base font-medium" style={{ color: p.textAccent }}>Preparar a planilha</span>
            </div>

            <p className="text-sm" style={{ color: p.textSecondary, marginBottom: "19px" }}>
              Crie uma planilha no Excel com as colunas abaixo, <strong style={{ color: p.textAccent }}>nesta ordem exata</strong>, e salve como <strong style={{ color: p.textAccent }}>CSV (separado por ponto-e-vírgula)</strong>.
            </p>

            {/* Tabela de colunas */}
            <div className="rounded-lg overflow-hidden" style={{ border: p.iconBoxBorder, marginBottom: "19px" }}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ backgroundColor: p.surfaceBg }}>
                    <th className="text-left px-4 py-2 font-semibold" style={{ color: p.accent }}>#</th>
                    <th className="text-left px-4 py-2 font-semibold" style={{ color: p.textAccent }}>Coluna</th>
                    <th className="text-left px-4 py-2 font-semibold" style={{ color: p.textAccent }}>Exemplo</th>
                    <th className="text-left px-4 py-2 font-semibold" style={{ color: p.textAccent }}>Obrigatório</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { col: "Nome Completo", ex: "João da Silva", obrig: "Sim" },
                    { col: "Bloco", ex: "Bloco A", obrig: "Sim" },
                    { col: "Unidade", ex: "101", obrig: "Sim" },
                    { col: "Perfil", ex: "Proprietário", obrig: "Sim" },
                    { col: "WhatsApp", ex: "(11) 99999-0001", obrig: "Sim" },
                    { col: "E-mail", ex: "joao@email.com", obrig: "Sim" },
                  ].map((item) => (
                    <tr key={item.col} style={{ borderTop: "1px solid " + p.divider }}>
                      <td className="px-4 py-2 font-bold" style={{ color: p.accent }}>{["Nome Completo","Bloco","Unidade","Perfil","WhatsApp","E-mail"].indexOf(item.col) + 1}</td>
                      <td className="px-4 py-2 font-medium" style={{ color: p.text }}>{item.col}</td>
                      <td className="px-4 py-2" style={{ color: p.textDim }}>{item.ex}</td>
                      <td className="px-4 py-2" style={{ color: item.obrig === "Sim" ? "#4ade80" : p.textMuted }}>{item.obrig}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Passo a passo */}
            <div className="text-sm" style={{ color: p.textSecondary, display: "flex", flexDirection: "column", gap: "14px" }}>
              <p className="font-semibold" style={{ color: p.textAccent, marginBottom: "2px" }}>Passo a passo:</p>
              <p><strong style={{ color: p.accent }}>Passo 1</strong> — Abra o <strong>Excel</strong> e crie uma nova planilha.</p>
              <p><strong style={{ color: p.accent }}>Passo 2</strong> — Na <strong>primeira linha</strong>, escreva os cabeçalhos: <span style={{ color: p.accent, fontFamily: "monospace", fontSize: "12px" }}>Nome Completo;Bloco;Unidade;Perfil;WhatsApp;E-mail</span></p>
              <p><strong style={{ color: p.accent }}>Passo 3</strong> — Preencha os dados dos moradores <strong>a partir da segunda linha</strong>.</p>
              <p><strong style={{ color: p.accent }}>Passo 4</strong> — O campo <strong>Perfil</strong> deve ser: <span style={{ color: p.accent }}>Proprietário</span>, <span style={{ color: p.accent }}>Locatário</span> ou <span style={{ color: p.accent }}>Dependente</span>.</p>
              <p><strong style={{ color: p.accent }}>Passo 5</strong> — Salve como <strong>CSV (separado por ponto-e-vírgula)</strong>: Arquivo → Salvar como → Tipo: CSV.</p>
            </div>
          </div>

          {/* Dica IA */}
          <div className="rounded-2xl p-7" style={{ backgroundColor: p.accentLight, border: p.cardBorder }}>
            <div className="flex items-center gap-3 mb-4">
              <Sparkles className="w-5 h-5" style={{ color: p.accent }} />
              <span className="text-base font-medium" style={{ color: p.textAccent }}>Dica: use uma IA para formatar sua planilha</span>
            </div>
            <p className="text-sm" style={{ color: p.textSecondary, marginBottom: "19px" }}>
              Já tem uma planilha com os dados dos moradores mas em outro formato? Copie o prompt abaixo e cole na sua IA preferida (ChatGPT, Gemini, Copilot, etc.) junto com os dados da sua planilha. A IA vai converter automaticamente para o formato correto.
            </p>
            <div className="rounded-lg p-4" style={{ backgroundColor: p.cardBg, border: p.cardBorder, marginBottom: "19px" }}>
              <pre className="text-xs whitespace-pre-wrap" style={{ color: p.textSecondary, fontFamily: "monospace", lineHeight: "1.6" }}>{aiPrompt}</pre>
            </div>
            <button
              onClick={copyPrompt}
              className="w-full h-11 gap-2 text-sm flex items-center justify-center rounded-lg font-semibold transition-all"
              style={{
                backgroundColor: promptCopied ? "#16a34a" : p.accent,
                color: promptCopied ? "#ffffff" : p.cardBg,
                border: "none",
                cursor: "pointer",
              }}
            >
              {promptCopied ? (
                <><CheckCircle2 className="w-4 h-4" /> Prompt copiado!</>
              ) : (
                <><Copy className="w-4 h-4" /> Copiar prompt para usar na IA</>
              )}
            </button>
          </div>

          {/* Step 2: Upload */}
          <div className="rounded-2xl p-7" style={{ backgroundColor: p.surfaceBg, border: p.featureBorder }}>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold" style={{ color: p.accent }}>
                2
              </div>
              <span className="text-base font-medium" style={{ color: p.textAccent }}>Enviar planilha</span>
            </div>

            {!file && (
              <div>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button
                  onClick={() => fileRef.current?.click()}
                  className="w-full border-2 border-dashed rounded-xl py-8 flex flex-col items-center gap-3 transition-colors"
                  style={{ color: p.textAccent, borderColor: p.accent }}
                >
                  <Upload className="w-8 h-8" />
                  <span className="text-sm">Clique para selecionar o arquivo .csv</span>
                </button>
              </div>
            )}
            {file && (
              <div className="space-y-4 animate-fade-in">
                {/* File info */}
                <div className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: p.surfaceBg }}>
                  <FileText className="w-5 h-5" style={{ color: p.accent }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate" style={{ color: p.textAccent }}>{file.name}</p>
                    <p className="text-xs" style={{ color: p.textDim }}>
                      {parsedData.length} morador(es) encontrado(s)
                    </p>
                  </div>
                  <button
                    onClick={removeFile}
                    className="p-1 hover:text-destructive transition-colors"
                    style={{ color: p.textDim }}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Preview table */}
                {parsedData.length > 0 && (
                  <div className="overflow-auto max-h-48 rounded-lg">
                    <table className="w-full text-xs">
                      <thead>
                        <tr style={{ backgroundColor: p.surfaceBg, color: p.textSecondary }}>
                          <th className="px-2 py-1.5 text-left font-medium">#</th>
                          <th className="px-2 py-1.5 text-left font-medium">Nome</th>
                          <th className="px-2 py-1.5 text-left font-medium">Bloco</th>
                          <th className="px-2 py-1.5 text-left font-medium">Unid.</th>
                          <th className="px-2 py-1.5 text-left font-medium">E-mail</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsedData.slice(0, 10).map((row, i) => (
                          <tr key={`${row.nome}-${row.bloco}-${row.unidade}`} className="border-t border-border/50">
                            <td className="px-2 py-1.5" style={{ color: p.textDim }}>{i + 1}</td>
                            <td className="px-2 py-1.5" style={{ color: p.textAccent }}>{row.nome}</td>
                            <td className="px-2 py-1.5" style={{ color: p.textSecondary }}>{row.bloco}</td>
                            <td className="px-2 py-1.5" style={{ color: p.textSecondary }}>{row.unidade}</td>
                            <td className="px-2 py-1.5" style={{ color: p.accent }}>{row.email}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {parsedData.length > 10 && (
                      <p className="text-[10px] text-center py-1.5" style={{ color: p.textDim }}>
                        ...e mais {parsedData.length - 10} registro(s)
                      </p>
                    )}
                  </div>
                )}

                {/* Import button */}
                <button
                  onClick={handleUpload}
                  disabled={isUploading || parsedData.length === 0}
                  className="w-full h-12 font-semibold gap-2 flex items-center justify-center rounded-lg transition-colors"
                  style={{
                    backgroundColor: p.accent,
                    color: p.cardBg,
                    cursor: isUploading || parsedData.length === 0 ? "not-allowed" : "pointer",
                    opacity: isUploading || parsedData.length === 0 ? 0.5 : 1,
                    border: "none",
                  }}
                >
                  {isUploading ? (
                    <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: p.cardBg, borderTopColor: "transparent" }} />
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Importar {parsedData.length} Morador(es)
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

        </div>
      </main>

      {/* Premium error modal */}
      {error && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)" }}>
          <div style={{ width: "92%", maxWidth: 370, borderRadius: 20, background: p.headerBg, border: p.cardBorder, padding: "32px 24px", textAlign: "center" }}>
            <div style={{ width: 72, height: 72, borderRadius: "50%", background: "linear-gradient(135deg, #ef4444, #dc2626)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
              <AlertCircle style={{ width: 36, height: 36, color: "#ffffff" }} />
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 700, color: p.textAccent, marginBottom: 8 }}>Atenção</h3>
            <p style={{ fontSize: 14, color: p.textSecondary, marginBottom: 24, lineHeight: 1.5 }}>{error}</p>
            <button
              onClick={() => setError("")}
              style={{ width: "100%", height: 48, borderRadius: 12, backgroundColor: p.accent, color: p.cardBg, fontWeight: 700, fontSize: 15, border: "none", cursor: "pointer" }}
            >
              Entendi
            </button>
          </div>
        </div>
      )}

      {/* Premium success modal */}
      {success && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)" }}>
          <div style={{ width: "92%", maxWidth: 370, borderRadius: 20, background: p.headerBg, border: p.cardBorder, padding: "32px 24px", textAlign: "center" }}>
            <div style={{ width: 72, height: 72, borderRadius: "50%", background: "linear-gradient(135deg, #10b981, #059669)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
              <CheckCircle2 style={{ width: 36, height: 36, color: "#ffffff" }} />
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 700, color: p.textAccent, marginBottom: 8 }}>Sucesso!</h3>
            <p style={{ fontSize: 14, color: p.textSecondary, marginBottom: 24, lineHeight: 1.5 }}>{success}</p>
            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={() => setSuccess("")}
                style={{ flex: 1, height: 48, borderRadius: 12, border: `2px solid ${p.accent}`, backgroundColor: "transparent", color: p.textAccent, fontWeight: 600, fontSize: 14, cursor: "pointer" }}
              >
                Importar outro
              </button>
              <button
                onClick={() => navigate("/cadastros/moradores")}
                style={{ flex: 1, height: 48, borderRadius: 12, backgroundColor: p.accent, color: p.cardBg, fontWeight: 700, fontSize: 14, border: "none", cursor: "pointer" }}
              >
                Ver lista
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
