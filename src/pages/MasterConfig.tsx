import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  Settings,
  ArrowLeft,
  Save,
  ToggleLeft,
  ToggleRight,
  Hash,
  Type,
  Mail,
  Clock,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useTheme } from "@/hooks/useTheme";

const API = "/api";

interface ConfigItem {
  key: string;
  value: string;
  updated_at: string;
}

const CONFIG_META: Record<string, { label: string; description: string; type: "text" | "boolean" | "number" | "email"; icon: any }> = {
  app_name: { label: "Nome do App", description: "Nome exibido no sistema", type: "text", icon: Type },
  maintenance_mode: { label: "Modo Manutenção", description: "Bloqueia acesso ao sistema", type: "boolean", icon: Settings },
  max_moradores_per_unit: { label: "Máx. Moradores/Unidade", description: "Limite de moradores por unidade", type: "number", icon: Hash },
  allow_self_register: { label: "Auto-Cadastro", description: "Permite moradores se cadastrarem", type: "boolean", icon: ToggleLeft },
  notification_email: { label: "Email de Notificações", description: "Email para receber alertas do sistema", type: "email", icon: Mail },
  backup_frequency: { label: "Frequência de Backup", description: "Periodicidade dos backups", type: "text", icon: Clock },
};

export default function MasterConfig() {
  const { isDark, p } = useTheme();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [configs, setConfigs] = useState<ConfigItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user?.role !== "master") {
      navigate("/dashboard");
      return;
    }
    fetchConfigs();
  }, []);

  async function fetchConfigs() {
    setLoading(true);
    try {
      const res = await apiFetch(`${API}/master/config`);
      const data = await res.json();
      setConfigs(data);
      const values: Record<string, string> = {};
      data.forEach((c: ConfigItem) => { values[c.key] = c.value; });
      setEditedValues(values);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      const configsArray = Object.entries(editedValues).map(([key, value]) => ({ key, value }));
      const res = await apiFetch(`${API}/master/config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ configs: configsArray }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      alert(err.message || "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  function toggleBoolean(key: string) {
    setEditedValues((prev) => ({
      ...prev,
      [key]: prev[key] === "true" ? "false" : "true",
    }));
  }

  return (
    <div className="min-h-dvh bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40" style={{ background: p.headerBg, borderBottom: p.headerBorder, boxShadow: p.headerShadow, color: p.text }}>
        <div className="px-4 h-14 flex items-center gap-3">
          <button onClick={() => navigate("/dashboard")} className="p-1">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <Settings className="w-5 h-5" />
          <span className="font-semibold text-sm">Configurações do Sistema</span>
        </div>
      </header>

      <main className="flex-1 px-4 py-4 space-y-3">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {configs.map((config) => {
              const meta = CONFIG_META[config.key] || {
                label: config.key,
                description: "",
                type: "text" as const,
                icon: Settings,
              };
              const IconComp = meta.icon;
              const isBoolean = meta.type === "boolean";
              const boolValue = editedValues[config.key] === "true";

              return (
                <div
                  key={config.key}
                  className="rounded-xl border border-border/50 bg-card p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#003580]/10 border border-[#003580]/20 flex items-center justify-center shrink-0 mt-0.5">
                      <IconComp className="w-5 h-5 text-sky-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{meta.label}</p>
                      <p className="text-[10px] text-muted-foreground mb-2">{meta.description}</p>

                      {isBoolean ? (
                        <button
                          onClick={() => toggleBoolean(config.key)}
                          className="flex items-center gap-2"
                        >
                          {boolValue ? (
                            <ToggleRight className="w-8 h-8 text-sky-400" />
                          ) : (
                            <ToggleLeft className="w-8 h-8 text-muted-foreground" />
                          )}
                          <span className={`text-xs font-medium ${boolValue ? "text-sky-400" : "text-muted-foreground"}`}>
                            {boolValue ? "Ativado" : "Desativado"}
                          </span>
                        </button>
                      ) : (
                        <input
                          type={meta.type === "number" ? "number" : meta.type === "email" ? "email" : "text"}
                          value={editedValues[config.key] || ""}
                          onChange={(e) =>
                            setEditedValues((prev) => ({ ...prev, [config.key]: e.target.value }))
                          }
                          className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                        />
                      )}
                    </div>
                  </div>
                  <p className="text-[9px] text-muted-foreground text-right mt-2">
                    Atualizado: {new Date(config.updated_at).toLocaleString("pt-BR")}
                  </p>
                </div>
              );
            })}

            {/* Save Button */}
            <button
              onClick={handleSave}
              disabled={saving}
              className={`w-full h-12 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                saved ? "bg-emerald-500" : "btn-grad-blue"
              } disabled:opacity-50`}
            >
              <Save className="w-5 h-5" />
              {saving ? "Salvando..." : saved ? "Salvo com sucesso!" : "Salvar Configurações"}
            </button>
          </>
        )}
      </main>
    </div>
  );
}
