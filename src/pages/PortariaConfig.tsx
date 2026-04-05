import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Settings,
  Car,
  Save,
  CheckCircle2,
  Loader2,
  ShieldAlert,
  Hash,
  Clock,
  Palette,
  ChevronRight,
  FileText,
  Camera,
  Phone,
  CreditCard,
  MessageSquare,
  Image,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useTheme } from "@/hooks/useTheme";
import { getConfigBoolean } from "@/lib/featureFlags";

const API = "/api/condominio-config";

export default function PortariaConfig() {
  const { isDark, p } = useTheme();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Vehicle configs
  const [vehicleUniqueAccess, setVehicleUniqueAccess] = useState(false);
  const [vehicleLimitPerApt, setVehicleLimitPerApt] = useState(false);
  const [vehicleLimitPerAptCount, setVehicleLimitPerAptCount] = useState("3");
  const [maxAuthDays, setMaxAuthDays] = useState("7");
  const [maxAuthDaysEnabled, setMaxAuthDaysEnabled] = useState(false);

  // Auto-cadastro required fields
  const [requireFields, setRequireFields] = useState({
    require_visit_photo: false,
    require_visit_document: false,
    require_visit_phone: false,
    require_visit_reason: false,
    require_visit_doc_photo: false,
  });

  const toggleRequireField = (key: keyof typeof requireFields) => {
    setRequireFields((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await apiFetch(API);
      if (res.ok) {
        const config = await res.json();
        setVehicleUniqueAccess(getConfigBoolean(config, "vehicle_unique_access", false));
        setVehicleLimitPerApt(getConfigBoolean(config, "vehicle_limit_per_apt", false));
        if (config.vehicle_limit_per_apt_count) {
          setVehicleLimitPerAptCount(config.vehicle_limit_per_apt_count);
        }
        if (config.max_auth_days) {
          setMaxAuthDaysEnabled(true);
          setMaxAuthDays(config.max_auth_days);
        }
        setRequireFields({
          require_visit_photo: getConfigBoolean(config, "require_visit_photo", false),
          require_visit_document: getConfigBoolean(config, "require_visit_document", false),
          require_visit_phone: getConfigBoolean(config, "require_visit_phone", false),
          require_visit_reason: getConfigBoolean(config, "require_visit_reason", false),
          require_visit_doc_photo: getConfigBoolean(config, "require_visit_doc_photo", false),
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await apiFetch(API, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicle_unique_access: vehicleUniqueAccess ? "true" : "false",
          vehicle_limit_per_apt: vehicleLimitPerApt ? "true" : "false",
          vehicle_limit_per_apt_count: vehicleLimitPerAptCount,
          max_auth_days: maxAuthDaysEnabled ? maxAuthDays : "0",
          require_visit_photo: requireFields.require_visit_photo ? "true" : "false",
          require_visit_document: requireFields.require_visit_document ? "true" : "false",
          require_visit_phone: requireFields.require_visit_phone ? "true" : "false",
          require_visit_reason: requireFields.require_visit_reason ? "true" : "false",
          require_visit_doc_photo: requireFields.require_visit_doc_photo ? "true" : "false",
        }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: p.pageBg }}>
      {/* Header */}
      <header
        className="sticky top-0 z-40"
        style={{ background: p.headerBg, padding: "1rem 1.5rem", borderBottom: p.headerBorder, boxShadow: p.headerShadow, color: p.text, paddingTop: "max(0, env(safe-area-inset-top))" }}
      >
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/dashboard")}
            style={{ width: 40, height: 40, borderRadius: 12, background: p.btnBg, border: p.btnBorder, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: p.text }}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <Settings className="w-6 h-6" />
            <div>
              <h1 style={{ fontWeight: 700, fontSize: 18 }}>Configurações</h1>
              <p style={{ color: isDark ? "rgba(255,255,255,0.6)" : "#64748b", fontSize: 12 }}>Regras de acesso do condomínio</p>
            </div>
          </div>
        </div>
      </header>

      <main style={{ flex: 1, display: "flex", flexDirection: "column", gap: "24px", padding: "24px", paddingBottom: "120px" }}>

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "48px" }}>
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#64748b" }} />
          </div>
        ) : (
          <>
            {/* ═══ Personalizar Dashboard ═══ */}
            <button
              onClick={() => navigate("/portaria/personalizar-dashboard")}
              style={{
                width: "100%", background: "var(--color-card, #fff)", borderRadius: "16px", padding: "20px",
                border: "2px solid #003580", display: "flex", alignItems: "center", gap: "14px",
                cursor: "pointer", transition: "all 0.2s",
              }}
            >
              <div style={{
                width: "36px", height: "36px", borderRadius: "10px",
                border: "2px solid #003580", background: "transparent",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                <Palette className="w-5 h-5" style={{ color: "#003580" }} />
              </div>
              <div style={{ flex: 1, textAlign: "left" }}>
                <h2 style={{ fontWeight: 700, fontSize: "15px", color: "var(--color-foreground, #0f172a)" }}>Personalizar Dashboard</h2>
                <p style={{ fontSize: "12px", color: "#64748b" }}>Reorganize ícones do dashboard e barra inferior</p>
              </div>
              <ChevronRight className="w-5 h-5" style={{ color: "#003580" }} />
            </button>

            {/* ═══ Section: Veículos ═══ */}
            <div style={{
              background: "var(--color-card, #fff)", borderRadius: "16px", padding: "20px",
              border: "1px solid rgba(0,0,0,0.08)", display: "flex", flexDirection: "column", gap: "20px",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
                <div style={{
                  width: "36px", height: "36px", borderRadius: "10px",
                  background: "#e0f2fe", display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Car className="w-5 h-5" style={{ color: "#0284c7" }} />
                </div>
                <div>
                  <h2 style={{ fontWeight: 700, fontSize: "15px", color: "#0f172a" }}>Controle de Veículos</h2>
                  <p style={{ fontSize: "12px", color: "#64748b" }}>Regras para autorização de acesso de veículos</p>
                </div>
              </div>

              {/* ── Toggle: Acesso único por placa ── */}
              <div
                onClick={() => setVehicleUniqueAccess(!vehicleUniqueAccess)}
                style={{
                  display: "flex", alignItems: "flex-start", gap: "14px",
                  padding: "14px 16px", borderRadius: "14px", cursor: "pointer",
                  border: vehicleUniqueAccess ? "2px solid #0ea5e9" : "2px solid #e2e8f0",
                  background: vehicleUniqueAccess ? "#f0f9ff" : "#fff",
                  transition: "all 0.2s",
                }}
              >
                <div style={{
                  width: "24px", height: "24px", borderRadius: "6px", marginTop: "2px",
                  border: vehicleUniqueAccess ? "2px solid #0ea5e9" : "2px solid #cbd5e1",
                  background: vehicleUniqueAccess ? "#0ea5e9" : "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.2s", flexShrink: 0,
                }}>
                  {vehicleUniqueAccess && <CheckCircle2 className="w-4 h-4" style={{ color: p.text }} />}
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <ShieldAlert className="w-4 h-4" style={{ color: vehicleUniqueAccess ? "#0284c7" : "#94a3b8" }} />
                    <p style={{ fontWeight: 600, fontSize: "14px", color: "#0f172a" }}>
                      Acesso único por placa
                    </p>
                  </div>
                  <p style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>
                    Só permitir o cadastro de uma nova autorização para um veículo quando não houver
                    nenhuma autorização ativa para a mesma placa.
                  </p>
                </div>
              </div>

              {/* ── Toggle: Limite por apartamento ── */}
              <div
                onClick={() => setVehicleLimitPerApt(!vehicleLimitPerApt)}
                style={{
                  display: "flex", alignItems: "flex-start", gap: "14px",
                  padding: "14px 16px", borderRadius: "14px", cursor: "pointer",
                  border: vehicleLimitPerApt ? "2px solid #0ea5e9" : "2px solid #e2e8f0",
                  background: vehicleLimitPerApt ? "#f0f9ff" : "#fff",
                  transition: "all 0.2s",
                }}
              >
                <div style={{
                  width: "24px", height: "24px", borderRadius: "6px", marginTop: "2px",
                  border: vehicleLimitPerApt ? "2px solid #0ea5e9" : "2px solid #cbd5e1",
                  background: vehicleLimitPerApt ? "#0ea5e9" : "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.2s", flexShrink: 0,
                }}>
                  {vehicleLimitPerApt && <CheckCircle2 className="w-4 h-4" style={{ color: p.text }} />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <Hash className="w-4 h-4" style={{ color: vehicleLimitPerApt ? "#0284c7" : "#94a3b8" }} />
                    <p style={{ fontWeight: 600, fontSize: "14px", color: "#0f172a" }}>
                      Limitar veículos por apartamento
                    </p>
                  </div>
                  <p style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>
                    Limitar a quantidade de veículos com autorizações ativas por apartamento.
                  </p>

                  {/* Limit input */}
                  {vehicleLimitPerApt && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "12px" }}
                    >
                      <span style={{ fontSize: "13px", fontWeight: 600, color: "#1e293b" }}>Limite:</span>
                      <input
                        type="number"
                        min="1"
                        max="50"
                        value={vehicleLimitPerAptCount}
                        onChange={(e) => setVehicleLimitPerAptCount(e.target.value)}
                        style={{
                          width: "80px", padding: "8px 12px", borderRadius: "10px",
                          border: "2px solid #0ea5e9", fontSize: "16px", fontWeight: 700,
                          textAlign: "center", background: "#fff", color: "#0c4a6e",
                          outline: "none", boxSizing: "border-box",
                        }}
                      />
                      <span style={{ fontSize: "12px", color: "#64748b" }}>veículos por apartamento</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ═══ Section: Expiração de Autorizações ═══ */}
            <div style={{
              background: "var(--color-card, #fff)", borderRadius: "16px", padding: "20px",
              border: "1px solid rgba(0,0,0,0.08)", display: "flex", flexDirection: "column", gap: "20px",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
                <div style={{
                  width: "36px", height: "36px", borderRadius: "10px",
                  background: "#fef3c7", display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Clock className="w-5 h-5" style={{ color: "#d97706" }} />
                </div>
                <div>
                  <h2 style={{ fontWeight: 700, fontSize: "15px", color: "#0f172a" }}>Expiração de Autorizações</h2>
                  <p style={{ fontSize: "12px", color: "#64748b" }}>Prazo máximo para autorizações de visitantes e veículos</p>
                </div>
              </div>

              <div
                onClick={() => setMaxAuthDaysEnabled(!maxAuthDaysEnabled)}
                style={{
                  display: "flex", alignItems: "flex-start", gap: "14px",
                  padding: "14px 16px", borderRadius: "14px", cursor: "pointer",
                  border: maxAuthDaysEnabled ? "2px solid #f59e0b" : "2px solid #e2e8f0",
                  background: maxAuthDaysEnabled ? "#fffbeb" : "#fff",
                  transition: "all 0.2s",
                }}
              >
                <div style={{
                  width: "24px", height: "24px", borderRadius: "6px", marginTop: "2px",
                  border: maxAuthDaysEnabled ? "2px solid #f59e0b" : "2px solid #cbd5e1",
                  background: maxAuthDaysEnabled ? "#f59e0b" : "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.2s", flexShrink: 0,
                }}>
                  {maxAuthDaysEnabled && <CheckCircle2 className="w-4 h-4" style={{ color: p.text }} />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <Clock className="w-4 h-4" style={{ color: maxAuthDaysEnabled ? "#d97706" : "#94a3b8" }} />
                    <p style={{ fontWeight: 600, fontSize: "14px", color: "#0f172a" }}>
                      Prazo máximo de autorização
                    </p>
                  </div>
                  <p style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>
                    Autorizações prévias e automáticas de visitantes e veículos expiram automaticamente após o prazo definido.
                  </p>

                  {maxAuthDaysEnabled && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "12px" }}
                    >
                      <span style={{ fontSize: "13px", fontWeight: 600, color: "#1e293b" }}>Prazo:</span>
                      <input
                        type="number"
                        min="1"
                        max="365"
                        value={maxAuthDays}
                        onChange={(e) => setMaxAuthDays(e.target.value)}
                        style={{
                          width: "80px", padding: "8px 12px", borderRadius: "10px",
                          border: "2px solid #f59e0b", fontSize: "16px", fontWeight: 700,
                          textAlign: "center", background: "#fff", color: "#92400e",
                          outline: "none", boxSizing: "border-box",
                        }}
                      />
                      <span style={{ fontSize: "12px", color: "#64748b" }}>dias</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ═══ Section: Auto-Cadastro ═══ */}
            <div style={{
              background: "var(--color-card, #fff)", borderRadius: "16px", padding: "20px",
              border: "1px solid rgba(0,0,0,0.08)", display: "flex", flexDirection: "column", gap: "16px",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
                <div style={{
                  width: "36px", height: "36px", borderRadius: "10px",
                  background: "#ede9fe", display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <FileText className="w-5 h-5" style={{ color: "#7c3aed" }} />
                </div>
                <div>
                  <h2 style={{ fontWeight: 700, fontSize: "15px", color: "#0f172a" }}>Auto-Cadastro de Visitantes</h2>
                  <p style={{ fontSize: "12px", color: "#64748b" }}>Campos obrigatórios no formulário de auto-cadastro</p>
                </div>
              </div>

              <p style={{ fontSize: "12px", color: "#94a3b8", marginTop: "-8px" }}>
                O campo <strong>Nome</strong> é sempre obrigatório. Marque abaixo os demais campos que devem ser obrigatórios.
              </p>

              {([
                { key: "require_visit_photo" as const, label: "Foto do visitante", icon: Camera },
                { key: "require_visit_document" as const, label: "Documento (RG/CPF)", icon: CreditCard },
                { key: "require_visit_phone" as const, label: "Telefone", icon: Phone },
                { key: "require_visit_reason" as const, label: "Motivo da visita (Observações)", icon: MessageSquare },
                { key: "require_visit_doc_photo" as const, label: "Foto do documento", icon: Image },
              ]).map(({ key, label, icon: Icon }) => (
                <div
                  key={key}
                  onClick={() => toggleRequireField(key)}
                  style={{
                    display: "flex", alignItems: "center", gap: "12px",
                    padding: "12px 14px", borderRadius: "12px", cursor: "pointer",
                    border: requireFields[key] ? "2px solid #7c3aed" : "2px solid #e2e8f0",
                    background: requireFields[key] ? "#f5f3ff" : "#fff",
                    transition: "all 0.2s",
                  }}
                >
                  <div style={{
                    width: "22px", height: "22px", borderRadius: "6px",
                    border: requireFields[key] ? "2px solid #7c3aed" : "2px solid #cbd5e1",
                    background: requireFields[key] ? "#7c3aed" : "#fff",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "all 0.2s", flexShrink: 0,
                  }}>
                    {requireFields[key] && <CheckCircle2 className="w-3.5 h-3.5" style={{ color: p.text }} />}
                  </div>
                  <Icon className="w-4 h-4" style={{ color: requireFields[key] ? "#7c3aed" : "#94a3b8", flexShrink: 0 }} />
                  <p style={{ fontWeight: 600, fontSize: "13px", color: "#0f172a" }}>{label}</p>
                  {requireFields[key] && (
                    <span style={{ marginLeft: "auto", fontSize: "11px", fontWeight: 700, color: "#7c3aed", background: "#ede9fe", padding: "2px 8px", borderRadius: "6px" }}>Obrigatório</span>
                  )}
                  {!requireFields[key] && (
                    <span style={{ marginLeft: "auto", fontSize: "11px", fontWeight: 500, color: "#94a3b8" }}>Opcional</span>
                  )}
                </div>
              ))}
            </div>

            {/* ═══ Save Button ═══ */}
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
                padding: "14px", borderRadius: "14px", width: "100%",
                background: saved
                  ? "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)"
                  : "#003580",
                border: "none", color: p.text, fontWeight: 700, fontSize: "15px",
                cursor: saving ? "not-allowed" : "pointer",
                opacity: saving ? 0.7 : 1,
                transition: "all 0.3s",
              }}
            >
              {saving ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : saved ? (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  Salvo com Sucesso!
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Salvar Configurações
                </>
              )}
            </button>
          </>
        )}
      </main>
    </div>
  );
}
