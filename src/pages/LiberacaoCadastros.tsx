import { useState, useEffect, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";

import { apiFetch } from "@/lib/api";
import {
  ArrowLeft,
  UserCheck,

  Clock,
  Search,
  CheckCircle2,
  XCircle,
  Loader2,
  ShieldCheck,
  Building2,
  Phone,
  Mail,
  Home,
  MessageCircle,
  Save,
} from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { getConfigBoolean } from "@/lib/featureFlags";
import { dialogConfirm, dialogAlert } from "@/lib/dialog";

interface PendingMorador {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  perfil: string | null;
  unit: string | null;
  block: string | null;
  condominio_id: number | null;
  created_at: string;
}

type Paleta = ReturnType<typeof useTheme>["p"];

const cardStyle = (p: Paleta, destaque: string): CSSProperties => ({
  borderRadius: "20px",
  padding: "20px",
  background: p.cardBg,
  border: destaque ? `1px solid ${destaque}55` : `1px solid ${p.cardBorder}`,
  boxShadow: destaque ? `0 10px 24px ${destaque}1f` : "0 6px 18px rgba(15,23,42,0.06)",
  transition: "border-color 0.25s, box-shadow 0.25s",
});

const iconBoxStyle = (cor: string, tamanho = 44): CSSProperties => ({
  width: tamanho, height: tamanho, borderRadius: tamanho / 3.2,
  background: `${cor}1f`, border: `1px solid ${cor}33`,
  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
});

const titleStyle = (p: Paleta): CSSProperties => ({
  fontSize: "15.5px", fontWeight: 700, lineHeight: 1.3, color: p.textHeading, margin: 0,
});

const subtitleStyle = (p: Paleta): CSSProperties => ({
  fontSize: "12.5px", lineHeight: 1.55, color: p.textMuted, margin: "5px 0 0",
});

const pillStyle = (cor: string): CSSProperties => ({
  display: "inline-flex", alignItems: "center", gap: "7px", marginTop: "16px",
  padding: "8px 14px", borderRadius: "999px",
  background: `${cor}18`, color: cor, fontSize: "12.5px", fontWeight: 600,
});

const fieldBlockStyle = (p: Paleta): CSSProperties => ({
  marginTop: "18px", paddingTop: "18px", borderTop: `1px solid ${p.divider}`,
});

const fieldLabelStyle = (p: Paleta): CSSProperties => ({
  display: "block", marginBottom: "10px", fontSize: "11.5px", fontWeight: 700,
  letterSpacing: "0.04em", textTransform: "uppercase", color: p.textMuted,
});

const inputStyle = (p: Paleta, isDark: boolean): CSSProperties => ({
  width: "100%", height: "50px", padding: "0 16px", borderRadius: "14px",
  border: `1px solid ${p.cardBorder}`,
  background: isDark ? "rgba(255,255,255,0.05)" : "#f8fafc",
  fontSize: "14px", color: p.text, outline: "none",
});

const saveBtnStyle = (fundo: string, desabilitado: boolean): CSSProperties => ({
  width: "100%", height: "48px", marginTop: "12px", borderRadius: "14px", border: "none",
  background: fundo, color: "#ffffff", fontSize: "14.5px", fontWeight: 700,
  display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
  cursor: desabilitado ? "not-allowed" : "pointer", opacity: desabilitado ? 0.55 : 1,
  boxShadow: desabilitado ? "none" : "0 8px 18px rgba(15,23,42,0.18)",
  transition: "opacity 0.2s, box-shadow 0.2s",
});

function Switch({ on, color, loading, onClick, label }: {
  on: boolean; color: string; loading: boolean; onClick: () => void; label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      aria-label={label}
      aria-pressed={on}
      style={{
        width: "58px", height: "34px", flexShrink: 0, padding: "3px",
        borderRadius: "999px", border: "none",
        background: on ? color : "rgba(148,163,184,0.45)",
        boxShadow: on ? `0 0 0 4px ${color}22` : "none",
        display: "flex", alignItems: "center", justifyContent: on ? "flex-end" : "flex-start",
        cursor: loading ? "wait" : "pointer", opacity: loading ? 0.7 : 1,
        transition: "background 0.25s, box-shadow 0.25s",
      }}
    >
      <span
        style={{
          width: "28px", height: "28px", borderRadius: "50%", background: "#ffffff",
          boxShadow: "0 1px 4px rgba(15,23,42,0.3)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" style={{ color: "#64748b" }} />}
      </span>
    </button>
  );
}

export default function LiberacaoCadastros() {
  const { p, isDark } = useTheme();

  const navigate = useNavigate();
  const [pendentes, setPendentes] = useState<PendingMorador[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [autoCadastroEnabled, setAutoCadastroEnabled] = useState(false);
  const [configLoading, setConfigLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState("");

  // Notification states
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [emailAddress, setEmailAddress] = useState("");
  const [emailSaving, setEmailSaving] = useState(false);
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);
  const [whatsappPhone, setWhatsappPhone] = useState("");
  const [whatsappSaving, setWhatsappSaving] = useState(false);

  const formatPhone = (value: string) => {
    const digits = value.replaceAll(/\D/g, "").slice(0, 11);
    if (digits.length <= 2) return digits.length ? `(${digits}` : "";
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  useEffect(() => {
    fetchPendentes();
    fetchConfig();
  }, []);

  async function fetchPendentes() {
    setLoading(true);
    try {
      const res = await apiFetch("/api/moradores/pendentes");
      if (res.ok) {
        const data = await res.json();
        setPendentes(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchConfig() {
    setConfigLoading(true);
    try {
      const res = await apiFetch("/api/condominio-config");
      if (res.ok) {
        const data = await res.json();
        setAutoCadastroEnabled(getConfigBoolean(data, "feature_auto_cadastro", false));
        setEmailEnabled(getConfigBoolean(data, "notify_email_enabled", false));
        setEmailAddress(data.notify_email_address || "");
        setWhatsappEnabled(getConfigBoolean(data, "notify_whatsapp_enabled", false));
        setWhatsappPhone(data.notify_whatsapp_phone || "");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setConfigLoading(false);
    }
  }

  async function toggleAutoCadastro() {
    const newValue = !autoCadastroEnabled;
    setConfigLoading(true);
    try {
      const res = await apiFetch("/api/condominio-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feature_auto_cadastro: String(newValue) }),
      });
      if (res.ok) {
        setAutoCadastroEnabled(newValue);
        setSuccessMsg(newValue ? "Aprovação ativada!" : "Aprovação desativada!");
        setTimeout(() => setSuccessMsg(""), 3000);
      } else {
        const data = await res.json().catch(() => ({}));
        void dialogAlert(data.error || "Erro ao alterar configuração");
      }
    } catch (err) {
      console.error("Toggle error:", err);
      void dialogAlert("Erro de conexão ao alterar configuração");
    } finally {
      setConfigLoading(false);
    }
  }

  async function saveEmailNotification(enabled?: boolean) {
    setEmailSaving(true);
    const newEnabled = enabled !== undefined ? enabled : emailEnabled;
    try {
      const res = await apiFetch("/api/condominio-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notify_email_enabled: String(newEnabled),
          notify_email_address: emailAddress.trim(),
        }),
      });
      if (res.ok) {
        setEmailEnabled(newEnabled);
        setSuccessMsg(newEnabled ? "Notificação por e-mail ativada!" : "Notificação por e-mail desativada!");
        setTimeout(() => setSuccessMsg(""), 3000);
      } else {
        const data = await res.json().catch(() => ({}));
        void dialogAlert(data.error || "Erro ao salvar configuração de e-mail");
      }
    } catch (err) {
      console.error("Email save error:", err);
      void dialogAlert("Erro de conexão ao salvar e-mail");
    } finally {
      setEmailSaving(false);
    }
  }

  async function saveWhatsappNotification(enabled?: boolean) {
    setWhatsappSaving(true);
    const newEnabled = enabled !== undefined ? enabled : whatsappEnabled;
    try {
      const res = await apiFetch("/api/condominio-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notify_whatsapp_enabled: String(newEnabled),
          notify_whatsapp_phone: whatsappPhone.trim(),
        }),
      });
      if (res.ok) {
        setWhatsappEnabled(newEnabled);
        setSuccessMsg(newEnabled ? "Notificação por WhatsApp ativada!" : "Notificação por WhatsApp desativada!");
        setTimeout(() => setSuccessMsg(""), 3000);
      } else {
        const data = await res.json().catch(() => ({}));
        void dialogAlert(data.error || "Erro ao salvar configuração de WhatsApp");
      }
    } catch (err) {
      console.error("WhatsApp save error:", err);
      void dialogAlert("Erro de conexão ao salvar WhatsApp");
    } finally {
      setWhatsappSaving(false);
    }
  }

  async function handleAprovar(id: number) {
    setActionLoading(id);
    try {
      const res = await apiFetch(`/api/moradores/${id}/aprovar`, { method: "PUT" });
      const data = await res.json();
      if (res.ok) {
        setPendentes((prev) => prev.filter((p) => p.id !== id));
        setSuccessMsg(data.message || "Aprovado!");
        setTimeout(() => setSuccessMsg(""), 3000);
      } else {
        void dialogAlert(data.error || "Erro ao aprovar.");
      }
    } catch (err) {
      void dialogAlert("Erro de conexão.");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleRejeitar(id: number, nome: string) {
    if (!await dialogConfirm(`Rejeitar o cadastro de "${nome}"? Isso removerá o registro permanentemente.`)) return;
    setActionLoading(id);
    try {
      const res = await apiFetch(`/api/moradores/${id}/rejeitar`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        setPendentes((prev) => prev.filter((p) => p.id !== id));
        setSuccessMsg(data.message || "Rejeitado.");
        setTimeout(() => setSuccessMsg(""), 3000);
      } else {
        void dialogAlert(data.error || "Erro ao rejeitar.");
      }
    } catch (err) {
      void dialogAlert("Erro de conexão.");
    } finally {
      setActionLoading(null);
    }
  }

  const filtered = pendentes.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.email.toLowerCase().includes(search.toLowerCase()) ||
      (p.block && p.block.toLowerCase().includes(search.toLowerCase())) ||
      (p.unit && p.unit.toLowerCase().includes(search.toLowerCase()))
  );

  const perfilLabel = (p: string | null) => {
    const map: Record<string, string> = {
      proprietario: "Proprietário",
      inquilino: "Inquilino",
      familiar: "Familiar",
      dependente: "Dependente",
    };
    return map[p || ""] || p || "—";
  };

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: p.pageBg }}>
      {/* Header */}
      <header className="sticky top-0 z-40" style={{ background: p.headerBg, borderBottom: p.headerBorder, boxShadow: p.headerShadow, color: p.text, paddingTop: "max(0px, env(safe-area-inset-top))" }}>
        <div style={{ height: "4.5rem", display: "flex", alignItems: "center", gap: 12, paddingLeft: "16px", paddingRight: "24px" }}>
          <button onClick={() => navigate(-1)} style={{ width: 40, height: 40, borderRadius: 12, background: p.btnBg, border: p.btnBorder, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: p.text }}>
            <ArrowLeft className="w-6 h-6" />
          </button>
          <ShieldCheck className="w-6 h-6" />
          <span style={{ fontWeight: 700, fontSize: 16 }}>Liberação de Cadastros</span>
          <div className="flex-1" />
          {pendentes.length > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
              {pendentes.length}
            </span>
          )}
        </div>
      </header>

      <main
        className="flex-1 overflow-y-auto"
        style={{ padding: "20px 18px 3rem", display: "flex", flexDirection: "column", gap: "16px" }}
      >
        {/* Aprovação de auto-cadastro */}
        <section style={cardStyle(p, autoCadastroEnabled ? "#0ea5e9" : "")}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "14px" }}>
            <div style={iconBoxStyle("#0ea5e9")}>
              <UserCheck className="w-[22px] h-[22px]" style={{ color: "#0ea5e9" }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={titleStyle(p)}>Aprovação de cadastro</p>
              <p style={subtitleStyle(p)}>
                {autoCadastroEnabled
                  ? "O morador aguarda sua liberação depois de se cadastrar."
                  : "O morador entra direto, sem passar por você."}
              </p>
            </div>
            <Switch
              on={autoCadastroEnabled}
              color="#0ea5e9"
              loading={configLoading}
              onClick={toggleAutoCadastro}
              label="Ativar aprovação de cadastro"
            />
          </div>
          <div style={pillStyle(autoCadastroEnabled ? "#0284c7" : "#dc2626")}>
            {autoCadastroEnabled ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
            {autoCadastroEnabled ? "Liberação manual ativada" : "Liberação automática"}
          </div>
        </section>

        {/* Notificação por e-mail */}
        <section style={cardStyle(p, emailEnabled ? "#0ea5e9" : "")}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "14px" }}>
            <div style={iconBoxStyle("#0ea5e9")}>
              <Mail className="w-[22px] h-[22px]" style={{ color: "#0ea5e9" }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={titleStyle(p)}>Aviso por e-mail</p>
              <p style={subtitleStyle(p)}>Receba um e-mail a cada cadastro pendente.</p>
            </div>
            <Switch
              on={emailEnabled}
              color="#0ea5e9"
              loading={emailSaving}
              onClick={() => saveEmailNotification(!emailEnabled)}
              label="Ativar aviso por e-mail"
            />
          </div>

          {emailEnabled && (
            <div style={fieldBlockStyle(p)}>
              <span style={fieldLabelStyle(p)}>E-mail para receber os avisos</span>
              <input
                type="email"
                inputMode="email"
                placeholder="sindico@exemplo.com"
                value={emailAddress}
                onChange={(e) => setEmailAddress(e.target.value)}
                style={inputStyle(p, isDark)}
              />
              <button
                onClick={() => saveEmailNotification()}
                disabled={emailSaving || !emailAddress.trim()}
                style={saveBtnStyle("linear-gradient(135deg, #0062d1 0%, #003580 100%)", emailSaving || !emailAddress.trim())}
              >
                {emailSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Salvar e-mail
              </button>
            </div>
          )}
        </section>

        {/* Notificação por WhatsApp */}
        <section style={cardStyle(p, whatsappEnabled ? "#128C7E" : "")}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "14px" }}>
            <div style={iconBoxStyle("#16a34a")}>
              <MessageCircle className="w-[22px] h-[22px]" style={{ color: "#16a34a" }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={titleStyle(p)}>Pedido por WhatsApp</p>
              <p style={subtitleStyle(p)}>O morador pode pedir a liberação assim que terminar o cadastro.</p>
            </div>
            <Switch
              on={whatsappEnabled}
              color="#16a34a"
              loading={whatsappSaving}
              onClick={() => saveWhatsappNotification(!whatsappEnabled)}
              label="Ativar pedido por WhatsApp"
            />
          </div>

          {whatsappEnabled && (
            <div style={fieldBlockStyle(p)}>
              <span style={fieldLabelStyle(p)}>WhatsApp do síndico ou da administradora</span>
              <input
                type="tel"
                inputMode="tel"
                placeholder="(11) 99999-9999"
                value={whatsappPhone}
                onChange={(e) => setWhatsappPhone(formatPhone(e.target.value))}
                style={inputStyle(p, isDark)}
              />
              <button
                onClick={() => saveWhatsappNotification()}
                disabled={whatsappSaving || !whatsappPhone.trim()}
                style={saveBtnStyle("linear-gradient(135deg, #16a34a 0%, #128C7E 100%)", whatsappSaving || !whatsappPhone.trim())}
              >
                {whatsappSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Salvar telefone
              </button>
              <p style={{ fontSize: "11.5px", lineHeight: 1.55, color: p.textMuted, margin: "10px 0 0" }}>
                Esse número recebe o pedido de liberação enviado pelo morador.
              </p>
            </div>
          )}
        </section>

        {successMsg && (
          <div
            style={{
              display: "flex", alignItems: "center", gap: "10px",
              padding: "12px 14px", borderRadius: "14px",
              background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.35)",
            }}
          >
            <CheckCircle2 className="w-5 h-5 shrink-0" style={{ color: "#10b981" }} />
            <span style={{ fontSize: "13px", fontWeight: 600, color: isDark ? "#6ee7b7" : "#047857" }}>{successMsg}</span>
          </div>
        )}

        {/* Busca */}
        <div
          style={{
            display: "flex", alignItems: "center", gap: "10px",
            height: "52px", padding: "0 16px", marginTop: "6px",
            borderRadius: "16px", background: p.cardBg, border: `1px solid ${p.cardBorder}`,
          }}
        >
          <Search className="w-5 h-5 shrink-0" style={{ color: p.textMuted }} />
          <input
            type="text"
            placeholder="Buscar por nome, bloco ou unidade"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              flex: 1, minWidth: 0, background: "transparent", border: "none",
              outline: "none", fontSize: "14px", color: p.text,
            }}
          />
        </div>

        {/* Contador de pendentes */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "2px 4px" }}>
          <div style={iconBoxStyle("#f59e0b", 36)}>
            <Clock className="w-[18px] h-[18px]" style={{ color: "#f59e0b" }} />
          </div>
          <span style={{ fontSize: "14px", fontWeight: 700, color: p.textHeading }}>
            {pendentes.length} cadastro{pendentes.length === 1 ? "" : "s"} aguardando liberação
          </span>
        </div>
        {/* List */}
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "56px 0" }}>
            <Loader2 className="w-7 h-7 animate-spin" style={{ color: "#0062d1" }} />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ ...cardStyle(p, ""), textAlign: "center", padding: "40px 24px" }}>
            <div style={{ ...iconBoxStyle("#10b981", 56), margin: "0 auto 14px" }}>
              <CheckCircle2 style={{ width: 28, height: 28, color: "#10b981" }} />
            </div>
            <p style={{ ...titleStyle(p), fontSize: "15px" }}>
              {pendentes.length === 0 ? "Nenhum cadastro pendente" : "Nenhum resultado"}
            </p>
            <p style={{ ...subtitleStyle(p), marginTop: "6px" }}>
              {pendentes.length === 0
                ? "Todos os moradores já foram liberados."
                : "Tente outro nome, bloco ou unidade."}
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {filtered.map((cad) => {
              const detalhes: Array<{ icone: typeof Mail; texto: string }> = [
                { icone: Mail, texto: cad.email },
                ...(cad.phone ? [{ icone: Phone, texto: cad.phone }] : []),
                ...(cad.block ? [{ icone: Building2, texto: `Bloco ${cad.block}` }] : []),
                ...(cad.unit ? [{ icone: Home, texto: `Unidade ${cad.unit}` }] : []),
                ...(cad.perfil ? [{ icone: UserCheck, texto: perfilLabel(cad.perfil) }] : []),
              ];
              const ocupado = actionLoading === cad.id;

              return (
                <section key={cad.id} style={cardStyle(p, "#f59e0b")}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "14px" }}>
                    <div style={iconBoxStyle("#f59e0b", 46)}>
                      <Clock style={{ width: 23, height: 23, color: "#f59e0b" }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h2 style={{ ...titleStyle(p), fontSize: "16px" }}>{cad.name}</h2>
                      <p style={subtitleStyle(p)}>
                        {new Date(cad.created_at).toLocaleDateString("pt-BR")} às{" "}
                        {new Date(cad.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    <span
                      style={{
                        padding: "6px 12px", borderRadius: "999px", background: "#f59e0b18",
                        color: "#b45309", fontSize: "11.5px", fontWeight: 700, whiteSpace: "nowrap",
                      }}
                    >
                      Pendente
                    </span>
                  </div>

                  <div
                    style={{
                      marginTop: "18px", paddingTop: "18px", borderTop: `1px solid ${p.divider}`,
                      display: "flex", flexDirection: "column", gap: "12px",
                    }}
                  >
                    {detalhes.map(({ icone: Icone, texto }) => (
                      <div key={texto} style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
                        <div style={iconBoxStyle(p.accentBright, 34)}>
                          <Icone style={{ width: 16, height: 16, color: p.accentBright }} />
                        </div>
                        <span
                          style={{
                            fontSize: "14px", color: p.textSecondary, overflow: "hidden",
                            textOverflow: "ellipsis", whiteSpace: "nowrap",
                          }}
                        >
                          {texto}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div style={{ marginTop: "20px", display: "flex", flexDirection: "column", gap: "10px" }}>
                    <button
                      onClick={() => handleAprovar(cad.id)}
                      disabled={ocupado}
                      style={saveBtnStyle("linear-gradient(135deg, #10b981 0%, #047857 100%)", ocupado)}
                    >
                      {ocupado ? (
                        <Loader2 className="animate-spin" style={{ width: 18, height: 18 }} />
                      ) : (
                        <UserCheck style={{ width: 18, height: 18 }} />
                      )}
                      Aprovar cadastro
                    </button>
                    <button
                      onClick={() => handleRejeitar(cad.id, cad.name)}
                      disabled={ocupado}
                      style={{
                        width: "100%", height: "48px", borderRadius: "14px",
                        border: "1.5px solid #ef444455", background: "transparent",
                        color: "#ef4444", fontSize: "14.5px", fontWeight: 600,
                        display: "flex", alignItems: "center", justifyContent: "center", gap: "9px",
                        cursor: ocupado ? "default" : "pointer", opacity: ocupado ? 0.6 : 1,
                      }}
                    >
                      <XCircle style={{ width: 18, height: 18 }} />
                      Rejeitar
                    </button>
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
