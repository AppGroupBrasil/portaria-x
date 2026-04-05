import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import TutorialButton, { FlowPortaria, TSection, TStep, TBullet } from "@/components/TutorialButton";
import {
  ArrowLeft,
  Wifi,
  WifiOff,
  DoorOpen,
  Loader2,
  CheckCircle2,
  XCircle,
  Settings,
  BookOpen,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  Zap,
  Wrench,
  Cable,
  Plug,
  Smartphone,
  ClipboardCheck,
  AlertTriangle,
  Info,
  Plus,
  Trash2,
  Building,
  ExternalLink,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useTheme } from "@/hooks/useTheme";

const API = "/api";

interface GateDevice {
  id: string;
  name: string;
  ip: string;
  token: string;
  type: "tasmota" | "esp32";
  status: "offline" | "online" | "checking";
}

function loadGates(): GateDevice[] {
  try {
    const raw = localStorage.getItem("gates_config");
    if (raw) {
      const parsed = JSON.parse(raw);
      // Ensure type field exists (migrate old configs)
      return parsed.map((g: any) => ({ ...g, type: g.type || "tasmota" }));
    }
  } catch { /* ignore */ }
  // Migrate old single-gate config
  const oldIp = localStorage.getItem("gate_ip");
  const oldToken = localStorage.getItem("gate_token");
  if (oldIp) {
    const migrated: GateDevice[] = [{ id: "1", name: "Portao Principal", ip: oldIp, token: oldToken || "", type: "tasmota", status: "offline" }];
    localStorage.setItem("gates_config", JSON.stringify(migrated));
    localStorage.removeItem("gate_ip");
    localStorage.removeItem("gate_token");
    return migrated;
  }
  return [];
}

function saveGates(gates: GateDevice[]) {
  localStorage.setItem("gates_config", JSON.stringify(gates.map(g => ({ ...g, status: "offline" }))));
}

export default function PortariaVirtual() {
  const { isDark, p } = useTheme();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tab, setTab] = useState<"controle" | "tutorial" | "config">("controle");

  // Multi-gate states
  const [gates, setGates] = useState<GateDevice[]>(loadGates);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [lastActions, setLastActions] = useState<Record<string, string>>({});

  // Config form
  const [editName, setEditName] = useState("");
  const [editIp, setEditIp] = useState("");
  const [editToken, setEditToken] = useState("");
  const [editType, setEditType] = useState<"tasmota" | "esp32">("tasmota");
  const [editId, setEditId] = useState<string | null>(null);

  // Tutorial states
  const [openStep, setOpenStep] = useState<number | null>(1);

  useEffect(() => {
    if (gates.length > 0 && tab === "controle") {
      gates.forEach(g => checkGateStatus(g.id));
    }
  }, [tab]);

  const checkGateStatus = async (gateId: string) => {
    setGates(prev => prev.map(g => g.id === gateId ? { ...g, status: "checking" } : g));
    const gate = gates.find(g => g.id === gateId);
    if (!gate) return;
    try {
      const res = await apiFetch(`${API}/gate/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ip: gate.ip, token: gate.token, type: gate.type }),
      });
      setGates(prev => prev.map(g => g.id === gateId ? { ...g, status: res.ok ? "online" : "offline" } : g));
    } catch {
      setGates(prev => prev.map(g => g.id === gateId ? { ...g, status: "offline" } : g));
    }
  };

  const handleOpenGate = async (gate: GateDevice) => {
    if (openingId) return;
    setOpeningId(gate.id);
    try {
      const res = await apiFetch(`${API}/gate/open`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ip: gate.ip, token: gate.token, type: gate.type, gateName: gate.name }),
      });
      if (res.ok) {
        setLastActions(prev => ({ ...prev, [gate.id]: new Date().toLocaleString("pt-BR") }));
      }
    } catch { /* error */ }
    setTimeout(() => setOpeningId(null), 2000);
  };

  const handleAddGate = () => {
    if (!editName.trim() || !editIp.trim()) return;
    const newGates = [...gates];
    if (editId) {
      const idx = newGates.findIndex(g => g.id === editId);
      if (idx >= 0) {
        newGates[idx] = { ...newGates[idx], name: editName, ip: editIp, token: editToken, type: editType };
      }
    } else {
      newGates.push({ id: Date.now().toString(), name: editName, ip: editIp, token: editToken, type: editType, status: "offline" });
    }
    setGates(newGates);
    saveGates(newGates);
    setEditName("");
    setEditIp("");
    setEditToken("");
    setEditType("tasmota");
    setEditId(null);
  };

  const handleDeleteGate = (id: string) => {
    const newGates = gates.filter(g => g.id !== id);
    setGates(newGates);
    saveGates(newGates);
  };

  const startEditGate = (gate: GateDevice) => {
    setEditId(gate.id);
    setEditName(gate.name);
    setEditIp(gate.ip);
    setEditToken(gate.token);
    setEditType(gate.type || "tasmota");
    setTab("config");
  };

  const tutorialSteps = [
    {
      num: 1,
      title: "ESCOLHA SEU DISPOSITIVO",
      icon: <ClipboardCheck className="w-6 h-6" />,
      color: "#6366f1",
      content: (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <p style={{ fontSize: "15px", lineHeight: 1.7, color: "#374151" }}>
            Voce tem <strong>2 opcoes</strong> de dispositivo para instalar. Recomendamos a <strong>Opcao 1</strong> (mais facil e mais barata).
          </p>

          {/* OPTION 1: Mini Smart Switch */}
          <div style={{ background: "#f0fdf4", borderRadius: "12px", padding: "16px", border: "2px solid #16a34a" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
              <span style={{ background: "#16a34a", color: p.text, fontWeight: 800, fontSize: "13px", padding: "4px 10px", borderRadius: "6px" }}>OPCAO 1 — RECOMENDADA</span>
            </div>
            <p style={{ fontWeight: 800, fontSize: "16px", color: "#166534", marginBottom: "4px" }}>Mini Smart Switch (Tasmota)</p>
            <p style={{ fontSize: "13px", color: "#374151", lineHeight: 1.7, marginBottom: "12px" }}>
              E um interruptor inteligente <strong>compacto e completo</strong> — ja vem com WiFi + rele + alimentacao tudo em 1 pecinha.
              Muito mais facil de instalar: so liga 2 fios no motor e pronto. Nao precisa de fonte USB, fios jumper nem conhecimento tecnico.
            </p>

            <div style={{ background: "#fff", borderRadius: "8px", padding: "12px", border: "1px solid #d1fae5", marginBottom: "10px" }}>
              <p style={{ fontWeight: 700, fontSize: "14px", color: "#059669" }}>1 x Mini Smart Switch WiFi (com Tasmota)</p>
              <p style={{ fontSize: "13px", color: "#6b7280", marginTop: "4px" }}>Busque: "mini smart switch wifi tasmota" ou "sonoff mini r2"</p>
              <p style={{ fontSize: "13px", fontWeight: 600, color: "#d97706", marginTop: "2px" }}>Preco: R$20 a R$35</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "8px" }}>
                {[
                  { loja: "Mercado Livre", url: "https://lista.mercadolivre.com.br/mini-smart-switch-wifi" },
                  { loja: "Shopee", url: "https://shopee.com.br/search?keyword=mini%20smart%20switch%20wifi" },
                  { loja: "Amazon", url: "https://www.amazon.com.br/s?k=sonoff+mini+r2" },
                ].map((link, j) => (
                  <a key={j} href={link.url} target="_blank" rel="noopener noreferrer"
                    style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "6px 12px", borderRadius: "6px", border: "1px solid #16a34a", backgroundColor: "#f0fdf4", color: "#16a34a", fontSize: "12px", fontWeight: 700, textDecoration: "none" }}>
                    <ExternalLink style={{ width: "12px", height: "12px" }} /> {link.loja}
                  </a>
                ))}
              </div>
            </div>

            <div style={{ background: "#fff", borderRadius: "8px", padding: "12px", border: "1px solid #d1fae5" }}>
              <p style={{ fontWeight: 700, fontSize: "14px", color: "#059669" }}>1 metro de Fio Paralelo Fino</p>
              <p style={{ fontSize: "13px", color: "#6b7280", marginTop: "4px" }}>Qualquer loja de eletrica tem — fio de campainha serve</p>
              <p style={{ fontSize: "13px", fontWeight: 600, color: "#d97706", marginTop: "2px" }}>Preco: R$2</p>
            </div>

            <div style={{ marginTop: "12px", background: "#ecfdf5", borderRadius: "8px", padding: "10px", textAlign: "center" }}>
              <p style={{ fontWeight: 800, fontSize: "15px", color: "#16a34a" }}>CUSTO TOTAL: R$22 a R$37 por portao</p>
            </div>
          </div>

          {/* OPTION 2: ESP32 + Relay */}
          <div style={{ background: "#f9fafb", borderRadius: "12px", padding: "16px", border: "1px solid #d1d5db" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
              <span style={{ background: "#6b7280", color: p.text, fontWeight: 800, fontSize: "13px", padding: "4px 10px", borderRadius: "6px" }}>OPCAO 2 — ALTERNATIVA</span>
            </div>
            <p style={{ fontWeight: 800, fontSize: "16px", color: "#374151", marginBottom: "4px" }}>ESP32 DevKit + Modulo Rele</p>
            <p style={{ fontSize: "13px", color: "#6b7280", lineHeight: 1.7, marginBottom: "12px" }}>
              Monta voce mesmo: placa ESP32 + modulo rele + fios + fonte USB. Requer mais passos na instalacao, mas funciona igualmente bem.
            </p>

            {[
              { nome: "ESP32 DevKit V1", preco: "R$25~40", links: [
                { loja: "Mercado Livre", url: "https://lista.mercadolivre.com.br/esp32-devkit-v1" },
                { loja: "Shopee", url: "https://shopee.com.br/search?keyword=esp32%20devkit%20v1" },
              ]},
              { nome: "Modulo Rele 1 Canal 5V", preco: "R$8~12", links: [
                { loja: "Mercado Livre", url: "https://lista.mercadolivre.com.br/modulo-rele-1-canal-5v" },
                { loja: "Shopee", url: "https://shopee.com.br/search?keyword=modulo%20rele%201%20canal%205v" },
              ]},
              { nome: "Fonte USB 5V + Cabo", preco: "R$10~15", links: [] },
              { nome: "3 Fios Jumper Femea-Femea", preco: "R$3~5", links: [] },
              { nome: "1m Fio Paralelo Fino", preco: "R$2", links: [] },
            ].map((item, i) => (
              <div key={i} style={{ background: "#fff", borderRadius: "8px", padding: "10px", border: "1px solid #e5e7eb", marginBottom: "6px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <p style={{ fontWeight: 700, fontSize: "13px", color: "#374151" }}>{item.nome}</p>
                  <p style={{ fontSize: "12px", fontWeight: 600, color: "#d97706" }}>{item.preco}</p>
                </div>
                {item.links.length > 0 && (
                  <div style={{ display: "flex", gap: "6px", marginTop: "6px" }}>
                    {item.links.map((link, j) => (
                      <a key={j} href={link.url} target="_blank" rel="noopener noreferrer"
                        style={{ fontSize: "11px", color: "#4f46e5", textDecoration: "none", padding: "2px 6px", borderRadius: "4px", background: "#eef2ff" }}>
                        {link.loja} ↗
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <div style={{ marginTop: "8px", background: "#f3f4f6", borderRadius: "8px", padding: "10px", textAlign: "center" }}>
              <p style={{ fontWeight: 800, fontSize: "15px", color: "#6b7280" }}>CUSTO TOTAL: R$50 a R$75 por portao</p>
            </div>
          </div>

          <div style={{ background: "#eef0f5", borderRadius: "8px", padding: "12px", border: "1px solid rgba(45,51,84,0.3)" }}>
            <p style={{ fontSize: "13px", color: "#2d3354", lineHeight: 1.7 }}>
              <strong>DICA:</strong> Se voce ja tem o Mini Smart Switch, ele e a melhor opcao — mais barato, mais simples e mais compacto.
              Compre 1 dispositivo para CADA portao. Ex: 1 entrada + 3 blocos = 4 dispositivos.
            </p>
          </div>
        </div>
      ),
    },
    {
      num: 2,
      title: "VERIFICAR O WIFI DO CONDOMINIO",
      icon: <Wifi className="w-6 h-6" />,
      color: "#0ea5e9",
      content: (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ background: "#eef0f5", borderRadius: "12px", padding: "16px", border: "1px solid rgba(45,51,84,0.3)" }}>
            <p style={{ fontWeight: 700, fontSize: "15px", color: "#2d3354", marginBottom: "8px" }}>POR QUE PRECISA DE WIFI?</p>
            <p style={{ fontSize: "14px", lineHeight: 1.7, color: "#374151" }}>
              O aparelhinho (ESP32) usa o WiFi do condominio para se comunicar com o celular.
              Sem WiFi, ele nao funciona. E igual um celular sem internet.
            </p>
          </div>

          <p style={{ fontWeight: 700, fontSize: "15px", color: "#374151" }}>O QUE FAZER:</p>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ background: "#fff", borderRadius: "8px", padding: "14px", border: "1px solid #e5e7eb" }}>
              <p style={{ fontWeight: 700, color: "#059669" }}>1. Va ate o portao do condominio</p>
              <p style={{ fontSize: "14px", color: "#6b7280", marginTop: "4px" }}>
                Fique bem perto do motor do portao (geralmente e uma caixa de metal na parede, perto do portao).
              </p>
            </div>

            <div style={{ background: "#fff", borderRadius: "8px", padding: "14px", border: "1px solid #e5e7eb" }}>
              <p style={{ fontWeight: 700, color: "#059669" }}>2. Pegue seu celular</p>
              <p style={{ fontSize: "14px", color: "#6b7280", marginTop: "4px" }}>
                Conecte no WiFi do condominio. Abra o Google ou qualquer site. Se o site abrir, o sinal e bom!
              </p>
            </div>

            <div style={{ background: "#fff", borderRadius: "8px", padding: "14px", border: "1px solid #e5e7eb" }}>
              <p style={{ fontWeight: 700, color: "#059669" }}>3. O site abriu?</p>
              <p style={{ fontSize: "14px", color: "#6b7280", marginTop: "4px" }}>
                <strong style={{ color: "#16a34a" }}>SIM</strong> = Otimo! Pode ir para o proximo passo.<br />
                <strong style={{ color: "#dc2626" }}>NAO</strong> = Vai precisar de um repetidor de WiFi (R$50-80) perto do portao.
              </p>
            </div>
          </div>

          <div style={{ background: "#fef2f2", borderRadius: "8px", padding: "12px", border: "1px solid #fecaca" }}>
            <p style={{ fontSize: "13px", color: "#991b1b" }}>
              <strong>IMPORTANTE:</strong> Anote o NOME do WiFi e a SENHA. Voce vai precisar depois.
            </p>
          </div>
        </div>
      ),
    },
    {
      num: 3,
      title: "INSTALAR O MINI SMART SWITCH (OPCAO 1)",
      icon: <Zap className="w-6 h-6" />,
      color: "#16a34a",
      content: (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ background: "#f0fdf4", borderRadius: "12px", padding: "16px", border: "2px solid #16a34a" }}>
            <p style={{ fontWeight: 700, fontSize: "15px", color: "#166534", marginBottom: "8px" }}>SE VOCE ESCOLHEU O MINI SMART SWITCH:</p>
            <p style={{ fontSize: "14px", lineHeight: 1.7, color: "#374151" }}>
              O Mini Smart Switch e muito mais simples de instalar que o ESP32. Ele liga direto na rede eletrica
              e tem bornes (parafusinhos) prontos para conectar. Siga estes passos:
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ background: "#fff", borderRadius: "8px", padding: "14px", border: "1px solid #e5e7eb" }}>
              <p style={{ fontWeight: 700, color: "#059669" }}>1. Flashear com Tasmota (so 1 vez)</p>
              <p style={{ fontSize: "14px", color: "#6b7280", marginTop: "4px" }}>
                Use o site <strong>tasmota.github.io/install</strong> no computador. Conecte o switch via USB (se tiver porta)
                ou use <strong>Tuya-Convert</strong> pelo celular (OTA, sem fios). Escolha o firmware "Tasmota Lite".
              </p>
            </div>

            <div style={{ background: "#fff", borderRadius: "8px", padding: "14px", border: "1px solid #e5e7eb" }}>
              <p style={{ fontWeight: 700, color: "#059669" }}>2. Configurar o WiFi no Tasmota</p>
              <p style={{ fontSize: "14px", color: "#6b7280", marginTop: "4px" }}>
                Apos flashear, o switch cria uma rede WiFi "tasmota-XXXX". Conecte nela pelo celular,
                vai abrir uma pagina automatica. Digite o nome e senha do WiFi do condominio. Pronto!
              </p>
            </div>

            <div style={{ background: "#fff", borderRadius: "8px", padding: "14px", border: "1px solid #e5e7eb" }}>
              <p style={{ fontWeight: 700, color: "#059669" }}>3. Ache o IP do dispositivo</p>
              <p style={{ fontSize: "14px", color: "#6b7280", marginTop: "4px" }}>
                Depois de conectar no WiFi, abra o navegador e acesse o roteador (geralmente 192.168.1.1)
                para ver o IP que foi atribuido ao switch. Anote esse IP.
              </p>
            </div>

            <div style={{ background: "#fff", borderRadius: "8px", padding: "14px", border: "1px solid #e5e7eb" }}>
              <p style={{ fontWeight: 700, color: "#059669" }}>4. Abrir o motor do portao</p>
              <p style={{ fontSize: "14px", color: "#6b7280", marginTop: "4px" }}>
                Abra a tampa do motor com chave Phillips. Procure os bornes marcados
                <strong> "FECHA"</strong> (ou FC/CLOSE) e <strong>"COM"</strong> (ou COMUM/COMMON).
              </p>
            </div>

            <div style={{ background: "#f0fdf4", borderRadius: "12px", padding: "14px", border: "2px solid #16a34a" }}>
              <p style={{ fontWeight: 700, fontSize: "15px", color: "#16a34a", marginBottom: "8px" }}>5. Ligar os fios — SO 2 FIOS!</p>
              <p style={{ fontSize: "14px", color: "#374151" }}>
                O Mini Smart Switch tem bornes marcados <strong>S1</strong> e <strong>S2</strong>. Ligue assim:
              </p>
              <div style={{ marginTop: "10px", display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{ background: "#fff", borderRadius: "8px", padding: "10px", border: "1px solid #bbf7d0" }}>
                  <p style={{ fontWeight: 700, color: "#16a34a" }}>FIO 1: Borne S1 do Switch → Borne FECHA do Motor</p>
                </div>
                <div style={{ background: "#fff", borderRadius: "8px", padding: "10px", border: "1px solid #bbf7d0" }}>
                  <p style={{ fontWeight: 700, color: "#16a34a" }}>FIO 2: Borne S2 do Switch → Borne COM do Motor</p>
                </div>
              </div>
              <p style={{ fontSize: "13px", color: "#6b7280", marginTop: "8px" }}>
                Desencape as pontas dos fios (1cm), coloque no borne e aperte o parafuso.
              </p>
            </div>

            <div style={{ background: "#fff", borderRadius: "8px", padding: "14px", border: "1px solid #e5e7eb" }}>
              <p style={{ fontWeight: 700, color: "#059669" }}>6. Alimentar o switch</p>
              <p style={{ fontSize: "14px", color: "#6b7280", marginTop: "4px" }}>
                O Mini Smart Switch alimenta direto na rede eletrica (100-240V). Ligue os bornes
                <strong> L-In</strong> e <strong>N-In</strong> na fase e neutro da tomada mais proxima (peca a um eletricista se nao souber).
                Os bornes L-Out e N-Out nao sao usados neste caso.
              </p>
            </div>

            <div style={{ background: "#fff", borderRadius: "8px", padding: "14px", border: "1px solid #e5e7eb" }}>
              <p style={{ fontWeight: 700, color: "#059669" }}>7. Configurar PulseTime no Tasmota</p>
              <p style={{ fontSize: "14px", color: "#6b7280", marginTop: "4px" }}>
                Acesse o IP do switch no navegador. Va em <strong>Console</strong> e digite: <strong>PulseTime 10</strong>
                (isso faz o rele ligar por 1 segundo e desligar automatico — perfeito para portao).
              </p>
            </div>
          </div>

          <div style={{ background: "#ecfdf5", borderRadius: "8px", padding: "12px", border: "1px solid #a7f3d0", textAlign: "center" }}>
            <p style={{ fontWeight: 800, fontSize: "15px", color: "#16a34a" }}>
              PRONTO! Pule direto para o Passo 7 (Testar pelo App)
            </p>
            <p style={{ fontSize: "13px", color: "#6b7280", marginTop: "4px" }}>
              Os Passos 4, 5 e 6 sao apenas para quem escolheu ESP32+Rele.
            </p>
          </div>
        </div>
      ),
    },
    {
      num: 4,
      title: "ABRIR O MOTOR DO PORTAO (ESP32)",
      icon: <Wrench className="w-6 h-6" />,
      color: "#f59e0b",
      content: (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ background: "#fffbeb", borderRadius: "12px", padding: "16px", border: "1px solid #fde68a" }}>
            <p style={{ fontWeight: 700, fontSize: "15px", color: "#92400e", marginBottom: "8px" }}>O QUE E O MOTOR DO PORTAO?</p>
            <p style={{ fontSize: "14px", lineHeight: 1.7, color: "#374151" }}>
              E uma caixa de metal que fica perto do portao, geralmente na parede. Dentro dela tem uma placa
              eletronica (um quadradinho verde ou azul) com varios parafusos pequenos.
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ background: "#fff", borderRadius: "8px", padding: "14px", border: "1px solid #e5e7eb" }}>
              <p style={{ fontWeight: 700, color: "#059669" }}>1. Abra a tampa do motor</p>
              <p style={{ fontSize: "14px", color: "#6b7280", marginTop: "4px" }}>
                Usando uma chave Phillips (a chave em formato de estrela/cruz), tire os parafusos da tampa.
                Geralmente sao 2 ou 4 parafusos.
              </p>
            </div>

            <div style={{ background: "#fff", borderRadius: "8px", padding: "14px", border: "1px solid #e5e7eb" }}>
              <p style={{ fontWeight: 700, color: "#059669" }}>2. Ache os parafusinhos com nomes</p>
              <p style={{ fontSize: "14px", color: "#6b7280", marginTop: "4px" }}>
                Na placa, voce vai ver parafusinhos pequenos com letras escritas do lado.
                Procure por: <strong>FECHA</strong> e <strong>COM</strong> (ou <strong>COMUM</strong>).
              </p>
              <p style={{ fontSize: "13px", color: "#9ca3af", marginTop: "4px" }}>
                Outras marcas podem escrever: FC e COM, ou BOTAO.
              </p>
            </div>

            <div style={{ background: "#fff", borderRadius: "8px", padding: "14px", border: "1px solid #e5e7eb" }}>
              <p style={{ fontWeight: 700, color: "#059669" }}>3. Faca o TESTE</p>
              <p style={{ fontSize: "14px", color: "#6b7280", marginTop: "4px" }}>
                Pegue um pedacinho de fio. Encoste uma ponta no parafuso <strong>FECHA</strong> e a outra ponta no
                parafuso <strong>COM</strong>. So encostar por 1 segundo e tirar.
              </p>
              <p style={{ fontSize: "14px", fontWeight: 700, color: "#16a34a", marginTop: "8px" }}>
                Se o portao mexeu = PARABENS! Sao esses os parafusos certos!
              </p>
              <p style={{ fontSize: "14px", fontWeight: 700, color: "#dc2626", marginTop: "4px" }}>
                Se nao mexeu = Tente outros parafusos (ABRE + COM).
              </p>
            </div>
          </div>

          <div style={{ background: "#f0fdf4", borderRadius: "8px", padding: "12px", border: "1px solid #bbf7d0" }}>
            <p style={{ fontSize: "13px", color: "#166534" }}>
              <strong>NAO TENHA MEDO:</strong> Esses parafusinhos tem apenas 12 volts (como uma pilha grande). NAO da choque.
              E 100% seguro encostar o fio neles.
            </p>
          </div>
        </div>
      ),
    },
    {
      num: 5,
      title: "LIGAR OS FIOS - PARTE 1 (ESP32 NO RELE)",
      icon: <Cable className="w-6 h-6" />,
      color: "#8b5cf6",
      content: (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ background: "#f5f3ff", borderRadius: "12px", padding: "16px", border: "1px solid #ddd6fe" }}>
            <p style={{ fontWeight: 700, fontSize: "15px", color: "#5b21b6", marginBottom: "8px" }}>O QUE VAMOS FAZER AGORA?</p>
            <p style={{ fontSize: "14px", lineHeight: 1.7, color: "#374151" }}>
              Vamos ligar o aparelhinho (ESP32) no modulo rele usando 3 fios jumper.
              E so encaixar igual LEGO, nao precisa de solda nem de ferramenta.
            </p>
          </div>

          <div style={{ background: "#fff", borderRadius: "12px", padding: "16px", border: "2px solid #8b5cf6" }}>
            <p style={{ fontWeight: 700, fontSize: "16px", color: "#5b21b6", marginBottom: "16px", textAlign: "center" }}>
              ENCAIXE OS 3 FIOS ASSIM:
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {[
                { de: "Pino D26 do ESP32", para: "Pino IN do Rele", cor: "#ef4444", corNome: "FIO VERMELHO (ou qualquer cor)" },
                { de: "Pino 5V do ESP32", para: "Pino VCC do Rele", cor: "#f59e0b", corNome: "FIO AMARELO (ou qualquer cor)" },
                { de: "Pino GND do ESP32", para: "Pino GND do Rele", cor: "#111827", corNome: "FIO PRETO (ou qualquer cor)" },
              ].map((fio, i) => (
                <div key={i} style={{ background: "#faf5ff", borderRadius: "8px", padding: "12px", border: "1px solid #e9d5ff" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: fio.cor, display: "flex", alignItems: "center", justifyContent: "center", color: p.text, fontWeight: 700, fontSize: "14px", flexShrink: 0 }}>
                      {i + 1}
                    </div>
                    <div>
                      <p style={{ fontWeight: 700, fontSize: "14px", color: "#374151" }}>
                        {fio.de} &rarr; {fio.para}
                      </p>
                      <p style={{ fontSize: "12px", color: "#9ca3af" }}>{fio.corNome}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <p style={{ fontSize: "13px", color: "#6b7280", marginTop: "12px", textAlign: "center" }}>
              Os pinos tem o nome escrito na placa do ESP32. So olhar com atencao.
            </p>
          </div>

          <div style={{ background: "#f0fdf4", borderRadius: "8px", padding: "12px", border: "1px solid #bbf7d0" }}>
            <p style={{ fontSize: "13px", color: "#166534" }}>
              <strong>DICA:</strong> O fio jumper e aquele fiozinho com uma pontinha de plastico.
              Voce so ENCAIXA na ponta do ESP32. Nao precisa apertar parafuso nem soldar.
              Se nao encaixou, vire o fio e tente do outro lado.
            </p>
          </div>
        </div>
      ),
    },
    {
      num: 6,
      title: "LIGAR OS FIOS - PARTE 2 (RELE NO MOTOR)",
      icon: <Zap className="w-6 h-6" />,
      color: "#ef4444",
      content: (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ background: "#fef2f2", borderRadius: "12px", padding: "16px", border: "1px solid #fecaca" }}>
            <p style={{ fontWeight: 700, fontSize: "15px", color: "#991b1b", marginBottom: "8px" }}>AGORA VAMOS LIGAR NO MOTOR!</p>
            <p style={{ fontSize: "14px", lineHeight: 1.7, color: "#374151" }}>
              Corte o fio paralelo em 2 pedacos. Desencape as pontas (tire 1cm do plastico com uma faca ou
              alicate). Agora ligue assim:
            </p>
          </div>

          <div style={{ background: "#fff", borderRadius: "12px", padding: "16px", border: "2px solid #ef4444" }}>
            <p style={{ fontWeight: 700, fontSize: "16px", color: "#dc2626", marginBottom: "16px", textAlign: "center" }}>
              LIGUE OS 2 FIOS ASSIM:
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ background: "#fef2f2", borderRadius: "8px", padding: "14px", border: "1px solid #fecaca" }}>
                <p style={{ fontWeight: 700, fontSize: "15px", color: "#dc2626" }}>FIO 1:</p>
                <p style={{ fontSize: "14px", color: "#374151", marginTop: "4px" }}>
                  Parafuso <strong>COM</strong> do Rele &rarr; Parafuso <strong>FECHA</strong> do Motor
                </p>
                <p style={{ fontSize: "13px", color: "#9ca3af", marginTop: "4px" }}>
                  (desparafuse, coloque a ponta do fio, reaparafuse)
                </p>
              </div>

              <div style={{ background: "#fef2f2", borderRadius: "8px", padding: "14px", border: "1px solid #fecaca" }}>
                <p style={{ fontWeight: 700, fontSize: "15px", color: "#dc2626" }}>FIO 2:</p>
                <p style={{ fontSize: "14px", color: "#374151", marginTop: "4px" }}>
                  Parafuso <strong>NO</strong> do Rele &rarr; Parafuso <strong>COM</strong> do Motor
                </p>
                <p style={{ fontSize: "13px", color: "#9ca3af", marginTop: "4px" }}>
                  (NO quer dizer "Normalmente Aberto" - e o parafuso do meio do rele)
                </p>
              </div>
            </div>
          </div>

          <div style={{ background: "#fffbeb", borderRadius: "8px", padding: "12px", border: "1px solid #fde68a" }}>
            <p style={{ fontSize: "13px", color: "#92400e" }}>
              <strong>ATENCAO:</strong> Nao desconecte nenhum fio que ja estava ligado no motor!
              Os fios do controle remoto continuam onde estavam. Voce so ADICIONA 2 fios novos.
              O controle remoto e o app vao funcionar juntos.
            </p>
          </div>
        </div>
      ),
    },
    {
      num: 7,
      title: "LIGAR NA TOMADA (ESP32)",
      icon: <Plug className="w-6 h-6" />,
      color: "#10b981",
      content: (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ background: "#fff", borderRadius: "8px", padding: "14px", border: "1px solid #e5e7eb" }}>
              <p style={{ fontWeight: 700, color: "#059669" }}>1. Ache uma tomada perto do portao</p>
              <p style={{ fontSize: "14px", color: "#6b7280", marginTop: "4px" }}>
                Se nao tem tomada perto, use uma extensao.
              </p>
            </div>

            <div style={{ background: "#fff", borderRadius: "8px", padding: "14px", border: "1px solid #e5e7eb" }}>
              <p style={{ fontWeight: 700, color: "#059669" }}>2. Plugue a fonte USB na tomada</p>
              <p style={{ fontSize: "14px", color: "#6b7280", marginTop: "4px" }}>
                E igualzinho carregar um celular. A fonte vai na tomada.
              </p>
            </div>

            <div style={{ background: "#fff", borderRadius: "8px", padding: "14px", border: "1px solid #e5e7eb" }}>
              <p style={{ fontWeight: 700, color: "#059669" }}>3. Conecte o cabo USB no ESP32</p>
              <p style={{ fontSize: "14px", color: "#6b7280", marginTop: "4px" }}>
                O cabo micro USB vai na entradinha do ESP32 (igual entrada de celular antigo).
              </p>
            </div>

            <div style={{ background: "#f0fdf4", borderRadius: "12px", padding: "14px", border: "2px solid #16a34a" }}>
              <p style={{ fontWeight: 700, fontSize: "15px", color: "#16a34a" }}>4. Uma luzinha azul acendeu no ESP32?</p>
              <p style={{ fontSize: "14px", color: "#374151", marginTop: "4px" }}>
                <strong style={{ color: "#16a34a" }}>SIM</strong> = Esta ligado! Funcionou! Va para o proximo passo.<br />
                <strong style={{ color: "#dc2626" }}>NAO</strong> = Verifique se o cabo esta bem encaixado. Tente outra tomada.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      num: 8,
      title: "TESTAR PELO APLICATIVO",
      icon: <Smartphone className="w-6 h-6" />,
      color: "#06b6d4",
      content: (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ background: "#ecfeff", borderRadius: "12px", padding: "16px", border: "1px solid #a5f3fc" }}>
            <p style={{ fontWeight: 700, fontSize: "15px", color: "#155e75", marginBottom: "8px" }}>HORA DO TESTE!</p>
            <p style={{ fontSize: "14px", lineHeight: 1.7, color: "#374151" }}>
              Se chegou ate aqui, esta quase pronto! Agora vamos testar se tudo funciona.
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ background: "#fff", borderRadius: "8px", padding: "14px", border: "1px solid #e5e7eb" }}>
              <p style={{ fontWeight: 700, color: "#059669" }}>1. Abra o app no celular</p>
              <p style={{ fontSize: "14px", color: "#6b7280", marginTop: "4px" }}>
                Entre com seu login e va ate esta tela (Portaria Virtual).
              </p>
            </div>

            <div style={{ background: "#fff", borderRadius: "8px", padding: "14px", border: "1px solid #e5e7eb" }}>
              <p style={{ fontWeight: 700, color: "#059669" }}>2. Va na aba "Configuracao"</p>
              <p style={{ fontSize: "14px", color: "#6b7280", marginTop: "4px" }}>
                Selecione o tipo do dispositivo (Mini Smart Switch ou ESP32). Digite o IP do dispositivo e o token (se necessario).
              </p>
            </div>

            <div style={{ background: "#fff", borderRadius: "8px", padding: "14px", border: "1px solid #e5e7eb" }}>
              <p style={{ fontWeight: 700, color: "#059669" }}>3. Va na aba "Controle"</p>
              <p style={{ fontSize: "14px", color: "#6b7280", marginTop: "4px" }}>
                Verifique se o status esta "ONLINE" (bolinha verde). Se sim, toque no botao grande "ABRIR PORTAO".
              </p>
            </div>

            <div style={{ background: "#f0fdf4", borderRadius: "12px", padding: "14px", border: "2px solid #16a34a" }}>
              <p style={{ fontWeight: 700, fontSize: "15px", color: "#16a34a" }}>4. O portao abriu?</p>
              <p style={{ fontSize: "14px", color: "#374151", marginTop: "4px" }}>
                <strong style={{ color: "#16a34a" }}>SIM</strong> = PARABENS! Instalacao concluida com sucesso!<br />
                <strong style={{ color: "#dc2626" }}>NAO</strong> = Revise os fios (Passo 4 e 5). Verifique se o WiFi esta funcionando (Passo 2).
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      num: 9,
      title: "ORGANIZAR E GUARDAR",
      icon: <ClipboardCheck className="w-6 h-6" />,
      color: "#16a34a",
      content: (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ background: "#fff", borderRadius: "8px", padding: "14px", border: "1px solid #e5e7eb" }}>
              <p style={{ fontWeight: 700, color: "#059669" }}>1. Coloque tudo dentro de uma caixinha</p>
              <p style={{ fontSize: "14px", color: "#6b7280", marginTop: "4px" }}>
                Compre uma caixinha plastica de sobrepor 4x2 (R$5 em loja de eletrica).
                Coloque o ESP32 e o rele dentro. Faca um furinho para passar os fios e o cabo USB.
              </p>
            </div>

            <div style={{ background: "#fff", borderRadius: "8px", padding: "14px", border: "1px solid #e5e7eb" }}>
              <p style={{ fontWeight: 700, color: "#059669" }}>2. Fixe na parede</p>
              <p style={{ fontSize: "14px", color: "#6b7280", marginTop: "4px" }}>
                Use fita dupla face forte ou 2 parafusos. Fixe perto do motor do portao.
              </p>
            </div>

            <div style={{ background: "#fff", borderRadius: "8px", padding: "14px", border: "1px solid #e5e7eb" }}>
              <p style={{ fontWeight: 700, color: "#059669" }}>3. Organize os fios</p>
              <p style={{ fontSize: "14px", color: "#6b7280", marginTop: "4px" }}>
                Use uma abracadeira (aquele plastico de prender fio) para deixar bonito.
              </p>
            </div>

            <div style={{ background: "#fff", borderRadius: "8px", padding: "14px", border: "1px solid #e5e7eb" }}>
              <p style={{ fontWeight: 700, color: "#059669" }}>4. Feche a tampa do motor</p>
              <p style={{ fontSize: "14px", color: "#6b7280", marginTop: "4px" }}>
                Recoloque os parafusos da tampa. Pronto, acabou!
              </p>
            </div>
          </div>

          <div style={{ background: "#f0fdf4", borderRadius: "12px", padding: "16px", border: "2px solid #16a34a", textAlign: "center" }}>
            <CheckCircle2 className="w-10 h-10 mx-auto" style={{ color: "#16a34a" }} />
            <p style={{ fontWeight: 700, fontSize: "18px", color: "#16a34a", marginTop: "8px" }}>
              INSTALACAO CONCLUIDA!
            </p>
            <p style={{ fontSize: "14px", color: "#374151", marginTop: "4px" }}>
              Agora os moradores podem abrir o portao pelo celular.
            </p>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-dvh bg-background flex flex-col">
      {/* Header */}
      <header className="premium-header safe-area-top" style={{ padding: "18px 24px", paddingTop: "max(0, env(safe-area-inset-top))" }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} style={{ color: p.text }}>
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div style={{ flex: 1 }}>
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
              <DoorOpen className="w-5 h-5" /> Portaria Virtual
            </h1>
            <p className="text-xs text-white/70">Controle de Portao por App</p>
          </div>
          <TutorialButton title="Portaria Virtual">
            <TSection icon={<span>📋</span>} title="O QUE E ESTA FUNCAO?">
              <p>Permite <strong>abrir portoes do condominio pelo celular</strong>, sem precisar de controle remoto fisico. O porteiro ou funcionario autorizado toca um botao no app e o portao abre automaticamente. Todas as aberturas ficam registradas com data, hora e nome de quem abriu.</p>
            </TSection>
            <FlowPortaria>
              <TStep n={1}>Acesse a aba <strong>"Controle"</strong> na Portaria Virtual</TStep>
              <TStep n={2}>Voce vera todos os <strong>portoes cadastrados</strong> (Entrada Principal, Bloco A, Bloco B, Garagem, etc.)</TStep>
              <TStep n={3}>Toque no botao <strong>"ABRIR PORTAO"</strong> do portao desejado</TStep>
              <TStep n={4}>O portao abre <strong>automaticamente</strong> em 2-3 segundos</TStep>
              <TStep n={5}>O sistema registra a abertura com <strong>data, hora e seu nome</strong> para auditoria</TStep>
              <p style={{ marginTop: "8px", fontSize: "13px", color: "#2d3354" }}>👉 <strong>Seguranca:</strong> O sindico pode consultar o historico de todas as aberturas no Espelho da Portaria.</p>
            </FlowPortaria>
            <TSection icon={<span>🔧</span>} title="3 ABAS DISPONIVEIS">
              <TBullet><strong>Controle</strong> — Botoes para abrir cada portao cadastrado. Tela principal do dia a dia.</TBullet>
              <TBullet><strong>Tutorial</strong> — Guia passo a passo com fotos mostrando como instalar o hardware (ESP32 + rele). Envie para o tecnico.</TBullet>
              <TBullet><strong>Configuracao</strong> — Cadastrar, editar e excluir portoes. Informar IP e token de cada dispositivo ESP32.</TBullet>
            </TSection>
            <TSection icon={<span>🏢</span>} title="COMO CONFIGURAR UM PORTAO (SINDICO)">
              <TStep n={1}>Va na aba <strong>"Configuracao"</strong></TStep>
              <TStep n={2}>Clique em <strong>"+"</strong> para adicionar novo portao</TStep>
              <TStep n={3}>Informe o <strong>nome</strong> (ex: "Entrada Principal", "Garagem Bloco A")</TStep>
              <TStep n={4}>Informe o <strong>IP do dispositivo ESP32</strong> na rede local</TStep>
              <TStep n={5}>Informe o <strong>token de seguranca</strong> do dispositivo</TStep>
              <TStep n={6}>Clique em <strong>"Salvar"</strong> — o portao aparece na aba Controle</TStep>
            </TSection>
            <TSection icon={<span>🏢</span>} title="REQUISITOS DE HARDWARE">
              <TBullet>Cada portao precisa de <strong>1 ESP32 + 1 rele</strong> instalado no motor do portao</TBullet>
              <TBullet>O ESP32 deve estar <strong>conectado na mesma rede Wi-Fi</strong> do condominio</TBullet>
              <TBullet>A instalacao pode ser feita por qualquer <strong>tecnico de automacao</strong> seguindo o tutorial do app</TBullet>
            </TSection>
            <TSection icon={<span>⭐</span>} title="DICAS IMPORTANTES">
              <TBullet>O botao fica <strong>verde</strong> quando o portao esta online e <strong>vermelho</strong> quando offline</TBullet>
              <TBullet>Se o portao nao abrir, verifique se o ESP32 esta <strong>conectado ao Wi-Fi</strong></TBullet>
              <TBullet>O <strong>historico de aberturas</strong> pode ser consultado pelo sindico no Espelho da Portaria</TBullet>
              <TBullet>Apenas funcionarios <strong>logados no sistema</strong> podem abrir portoes — visitantes nao tem acesso</TBullet>
            </TSection>
          </TutorialButton>
        </div>
      </header>

      {/* Tabs */}
      <div style={{ padding: "12px 24px 0", display: "flex", gap: "8px" }}>
        {[
          { key: "controle" as const, label: "Controle", icon: <DoorOpen className="w-4 h-4" /> },
          { key: "tutorial" as const, label: "Tutorial", icon: <BookOpen className="w-4 h-4" /> },
          { key: "config" as const, label: "Configuracao", icon: <Settings className="w-4 h-4" /> },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              padding: "12px 8px",
              borderRadius: "10px",
              border: tab === t.key ? "2px solid #003580" : "2px solid #e5e7eb",
              backgroundColor: tab === t.key ? "#003580" : "#fff",
              color: tab === t.key ? "#fff" : "#6b7280",
              fontWeight: 700,
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <main className="flex-1 overflow-y-auto" style={{ padding: "16px 24px 120px" }}>

        {/* ═══ CONTROLE ═══ */}
        {tab === "controle" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px", marginTop: "8px" }}>

            {gates.length === 0 ? (
              <div style={{ textAlign: "center", padding: "32px 16px", background: "#fffbeb", borderRadius: "16px", border: "2px dashed #fde68a" }}>
                <Building className="w-10 h-10 mx-auto" style={{ color: "#d97706" }} />
                <p style={{ fontWeight: 800, fontSize: "17px", color: "#92400e", marginTop: "12px" }}>
                  NENHUM PORTAO CONFIGURADO
                </p>
                <p style={{ fontSize: "14px", color: "#78716c", marginTop: "8px", lineHeight: 1.6 }}>
                  Va na aba "Configuracao" para adicionar os portoes do condominio (entrada principal, blocos, etc).
                </p>
                <button
                  onClick={() => setTab("config")}
                  style={{
                    marginTop: "16px",
                    padding: "12px 28px",
                    borderRadius: "10px",
                    border: "none",
                    background: isDark ? "linear-gradient(135deg, #0062d1 0%, #003d99 50%, #001d4a 100%)" : "#ffffff",
                    color: p.text,
                    fontWeight: 700,
                    fontSize: "14px",
                    cursor: "pointer",
                  }}
                >
                  Configurar Portoes
                </button>
              </div>
            ) : (
              <>
                {/* Gate cards */}
                {gates.map((gate) => (
                  <div
                    key={gate.id}
                    style={{
                      borderRadius: "16px",
                      border: gate.status === "online" ? "2px solid #86efac" : "2px solid #e5e7eb",
                      overflow: "hidden",
                      background: "#fff",
                    }}
                  >
                    {/* Gate header with status */}
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "14px 16px",
                      background: gate.status === "online" ? "linear-gradient(135deg, #f0fdf4, #dcfce7)" : "linear-gradient(135deg, #f9fafb, #f3f4f6)",
                      borderBottom: "1px solid #e5e7eb",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <Building className="w-5 h-5" style={{ color: gate.status === "online" ? "#16a34a" : "#9ca3af" }} />
                        <div>
                          <p style={{ fontWeight: 700, fontSize: "15px", color: "#374151" }}>{gate.name}</p>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "2px" }}>
                            <p style={{ fontSize: "12px", color: "#9ca3af" }}>IP: {gate.ip}</p>
                            <span style={{ fontSize: "10px", fontWeight: 700, color: "#6366f1", background: "#ede9fe", padding: "1px 6px", borderRadius: "4px" }}>
                              {gate.type === "esp32" ? "ESP32" : "Smart Switch"}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        {gate.status === "checking" ? (
                          <Loader2 className="w-4 h-4 animate-spin" style={{ color: "#6b7280" }} />
                        ) : gate.status === "online" ? (
                          <Wifi className="w-4 h-4" style={{ color: "#16a34a" }} />
                        ) : (
                          <WifiOff className="w-4 h-4" style={{ color: "#dc2626" }} />
                        )}
                        <span style={{
                          fontWeight: 700,
                          fontSize: "12px",
                          color: gate.status === "online" ? "#16a34a" : gate.status === "checking" ? "#6b7280" : "#dc2626",
                          padding: "4px 10px",
                          borderRadius: "20px",
                          background: gate.status === "online" ? "#dcfce7" : gate.status === "checking" ? "#f3f4f6" : "#fee2e2",
                        }}>
                          {gate.status === "checking" ? "..." : gate.status === "online" ? "ONLINE" : "OFFLINE"}
                        </span>
                      </div>
                    </div>

                    {/* Gate actions */}
                    <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
                      <button
                        onClick={() => handleOpenGate(gate)}
                        disabled={openingId !== null}
                        style={{
                          width: "100%",
                          padding: "18px",
                          borderRadius: "14px",
                          border: "none",
                          background: openingId === gate.id ? "#fbbf24" : "linear-gradient(135deg, #16a34a, #15803d)",
                          color: "#fff",
                          fontSize: "17px",
                          fontWeight: 800,
                          cursor: openingId !== null ? "not-allowed" : "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "10px",
                          opacity: openingId !== null && openingId !== gate.id ? 0.5 : 1,
                          transition: "all 0.3s",
                          boxShadow: "0 4px 20px rgba(22,163,106,0.3)",
                        }}
                      >
                        {openingId === gate.id ? (
                          <>
                            <Loader2 className="w-6 h-6 animate-spin" />
                            <span>ABRINDO...</span>
                          </>
                        ) : (
                          <>
                            <DoorOpen className="w-6 h-6" />
                            <span>ABRIR PORTAO</span>
                          </>
                        )}
                      </button>

                      <div style={{ display: "flex", gap: "8px" }}>
                        <button
                          onClick={() => checkGateStatus(gate.id)}
                          style={{
                            flex: 1,
                            padding: "10px",
                            borderRadius: "8px",
                            border: "1px solid #d1d5db",
                            backgroundColor: "#fff",
                            color: "#374151",
                            fontSize: "12px",
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          Verificar Status
                        </button>
                        <button
                          onClick={() => startEditGate(gate)}
                          style={{
                            padding: "10px 14px",
                            borderRadius: "8px",
                            border: "1px solid #d1d5db",
                            backgroundColor: "#fff",
                            color: "#6b7280",
                            fontSize: "12px",
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          <Settings className="w-4 h-4" />
                        </button>
                      </div>

                      {lastActions[gate.id] && (
                        <p style={{ fontSize: "12px", color: "#166534", textAlign: "center" }}>
                          <CheckCircle2 className="w-3 h-3 inline-block mr-1" style={{ verticalAlign: "-1px" }} />
                          Ultimo acionamento: {lastActions[gate.id]}
                        </p>
                      )}
                    </div>
                  </div>
                ))}

                {/* Security notice */}
                <div style={{ padding: "14px", background: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                    <ShieldAlert className="w-4 h-4" style={{ color: "#6366f1" }} />
                    <span style={{ fontWeight: 700, fontSize: "13px", color: "#374151" }}>Seguranca</span>
                  </div>
                  <p style={{ fontSize: "12px", color: "#6b7280", lineHeight: 1.6 }}>
                    Apenas usuarios autorizados podem abrir o portao. Todas as acoes sao registradas com data, hora e nome do usuario.
                  </p>
                </div>
              </>
            )}
          </div>
        )}

        {/* ═══ TUTORIAL ═══ */}
        {tab === "tutorial" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "8px" }}>
            {/* Intro */}
            <div style={{
              background: "linear-gradient(135deg, #eef0f5, #e0e2ea)",
              borderRadius: "16px",
              padding: "20px",
              border: "2px solid #2d3354",
              textAlign: "center",
            }}>
              <Info className="w-8 h-8 mx-auto" style={{ color: "#2d3354" }} />
              <p style={{ fontWeight: 800, fontSize: "17px", color: "#2d3354", marginTop: "8px" }}>
                COMO INSTALAR O ABRIDOR DE PORTAO
              </p>
              <p style={{ fontSize: "14px", color: "#374151", marginTop: "6px", lineHeight: 1.6 }}>
                Siga os passos abaixo, um de cada vez.
                Cada passo explica TUDO que voce precisa fazer.
                Qualquer pessoa consegue instalar!
              </p>
              <p style={{ fontSize: "13px", color: "#6b7280", marginTop: "6px" }}>
                Tempo total: 30 a 40 minutos
              </p>
            </div>

            {/* Steps */}
            {tutorialSteps.map((step) => (
              <div
                key={step.num}
                style={{
                  borderRadius: "14px",
                  border: openStep === step.num ? `2px solid ${step.color}` : "2px solid #e5e7eb",
                  overflow: "hidden",
                  transition: "all 0.3s",
                }}
              >
                <button
                  onClick={() => setOpenStep(openStep === step.num ? null : step.num)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "16px",
                    border: "none",
                    backgroundColor: openStep === step.num ? step.color : "#fff",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <div style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "10px",
                    background: openStep === step.num ? "rgba(255,255,255,0.25)" : step.color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: openStep === step.num ? "#fff" : "#fff",
                    flexShrink: 0,
                  }}>
                    {step.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      color: openStep === step.num ? "rgba(255,255,255,0.8)" : "#9ca3af",
                      textTransform: "uppercase",
                    }}>
                      Passo {step.num} de 9
                    </p>
                    <p style={{
                      fontSize: "14px",
                      fontWeight: 800,
                      color: openStep === step.num ? "#fff" : "#374151",
                      marginTop: "2px",
                    }}>
                      {step.title}
                    </p>
                  </div>
                  {openStep === step.num ? (
                    <ChevronUp className="w-5 h-5" style={{ color: p.text, flexShrink: 0 }} />
                  ) : (
                    <ChevronDown className="w-5 h-5" style={{ color: "#9ca3af", flexShrink: 0 }} />
                  )}
                </button>

                {openStep === step.num && (
                  <div style={{ padding: "16px", backgroundColor: "#fafafa" }}>
                    {step.content}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ═══ CONFIGURAÇÃO ═══ */}
        {tab === "config" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px", marginTop: "8px" }}>

            <div style={{
              background: "linear-gradient(135deg, #faf5ff, #f3e8ff)",
              borderRadius: "16px",
              padding: "20px",
              border: "2px solid #c4b5fd",
            }}>
              <p style={{ fontWeight: 800, fontSize: "16px", color: "#5b21b6", marginBottom: "8px" }}>
                Configuracao dos Portoes
              </p>
              <p style={{ fontSize: "13px", color: "#6b7280", lineHeight: 1.6 }}>
                Adicione cada portao do condominio. Normalmente tem 1 portao na <strong>entrada principal</strong> e
                depois 1 portao por <strong>bloco</strong>. Cada portao precisa de 1 ESP32 instalado.
              </p>
            </div>

            {/* Existing gates list */}
            {gates.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <p style={{ fontWeight: 700, fontSize: "14px", color: "#374151" }}>
                  PORTOES CADASTRADOS ({gates.length})
                </p>
                {gates.map((gate) => (
                  <div key={gate.id} style={{
                    background: "#fff",
                    borderRadius: "12px",
                    padding: "14px",
                    border: editId === gate.id ? "2px solid #6366f1" : "2px solid #e5e7eb",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                  }}>
                    <Building className="w-5 h-5" style={{ color: "#6366f1", flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 700, fontSize: "14px", color: "#374151" }}>{gate.name}</p>
                      <p style={{ fontSize: "12px", color: "#9ca3af" }}>IP: {gate.ip}</p>
                    </div>
                    <button
                      onClick={() => startEditGate(gate)}
                      style={{
                        padding: "6px 12px",
                        borderRadius: "6px",
                        border: "1px solid #d1d5db",
                        background: "#fff",
                        color: "#6366f1",
                        fontSize: "12px",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDeleteGate(gate.id)}
                      style={{
                        padding: "6px 10px",
                        borderRadius: "6px",
                        border: "1px solid #fca5a5",
                        background: "#fff",
                        color: "#dc2626",
                        cursor: "pointer",
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add / Edit gate form */}
            <div style={{
              background: "#fff",
              borderRadius: "16px",
              padding: "20px",
              border: "2px solid #6366f1",
            }}>
              <p style={{ fontWeight: 800, fontSize: "15px", color: "#5b21b6", marginBottom: "14px", display: "flex", alignItems: "center", gap: "8px" }}>
                <Plus className="w-5 h-5" />
                {editId ? "EDITAR PORTAO" : "ADICIONAR NOVO PORTAO"}
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                {/* Device Type Selector */}
                <div>
                  <span style={{ display: "block", fontWeight: 700, fontSize: "14px", color: "#374151", marginBottom: "6px" }}>
                    Tipo do Dispositivo
                  </span>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      type="button"
                      onClick={() => setEditType("tasmota")}
                      style={{
                        flex: 1,
                        padding: "12px 8px",
                        borderRadius: "10px",
                        border: editType === "tasmota" ? "2px solid #6366f1" : "2px solid #d1d5db",
                        background: editType === "tasmota" ? "#ede9fe" : "#fff",
                        cursor: "pointer",
                        textAlign: "center",
                      }}
                    >
                      <p style={{ fontWeight: 700, fontSize: "13px", color: editType === "tasmota" ? "#5b21b6" : "#6b7280" }}>
                        Mini Smart Switch
                      </p>
                      <p style={{ fontSize: "11px", color: "#9ca3af", marginTop: "2px" }}>
                        Sonoff / Tasmota
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditType("esp32")}
                      style={{
                        flex: 1,
                        padding: "12px 8px",
                        borderRadius: "10px",
                        border: editType === "esp32" ? "2px solid #6366f1" : "2px solid #d1d5db",
                        background: editType === "esp32" ? "#ede9fe" : "#fff",
                        cursor: "pointer",
                        textAlign: "center",
                      }}
                    >
                      <p style={{ fontWeight: 700, fontSize: "13px", color: editType === "esp32" ? "#5b21b6" : "#6b7280" }}>
                        ESP32 + Rele
                      </p>
                      <p style={{ fontSize: "11px", color: "#9ca3af", marginTop: "2px" }}>
                        Firmware customizado
                      </p>
                    </button>
                  </div>
                </div>

                <div>
                  <span style={{ display: "block", fontWeight: 700, fontSize: "14px", color: "#374151", marginBottom: "6px" }}>
                    Nome do Portao
                  </span>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder='Ex: "Entrada Principal", "Bloco A", "Bloco B"'
                    style={{
                      width: "100%",
                      padding: "14px",
                      borderRadius: "10px",
                      border: "2px solid #d1d5db",
                      fontSize: "15px",
                      fontWeight: 600,
                      color: "#374151",
                      backgroundColor: "#fff",
                    }}
                  />
                </div>

                <div>
                  <span style={{ display: "block", fontWeight: 700, fontSize: "14px", color: "#374151", marginBottom: "6px" }}>
                    Endereco IP do Dispositivo
                  </span>
                  <input
                    type="text"
                    value={editIp}
                    onChange={(e) => setEditIp(e.target.value)}
                    placeholder="Ex: 192.168.1.200"
                    style={{
                      width: "100%",
                      padding: "14px",
                      borderRadius: "10px",
                      border: "2px solid #d1d5db",
                      fontSize: "15px",
                      fontWeight: 600,
                      color: "#374151",
                      backgroundColor: "#fff",
                    }}
                  />
                  <p style={{ fontSize: "12px", color: "#9ca3af", marginTop: "4px" }}>
                    {editType === "tasmota"
                      ? "O IP aparece no painel Tasmota do dispositivo. Acesse http://IP na rede local."
                      : "O IP aparece quando o ESP32 liga. Cada portao tem um IP diferente."}
                  </p>
                </div>

                <div>
                  <span style={{ display: "block", fontWeight: 700, fontSize: "14px", color: "#374151", marginBottom: "6px" }}>
                    Token de Seguranca
                  </span>
                  <input
                    type="text"
                    value={editToken}
                    onChange={(e) => setEditToken(e.target.value)}
                    placeholder="Ex: TOKEN_SECRETO_123"
                    style={{
                      width: "100%",
                      padding: "14px",
                      borderRadius: "10px",
                      border: "2px solid #d1d5db",
                      fontSize: "15px",
                      fontWeight: 600,
                      color: "#374151",
                      backgroundColor: "#fff",
                    }}
                  />
                  <p style={{ fontSize: "12px", color: "#9ca3af", marginTop: "4px" }}>
                    {editType === "tasmota"
                      ? "Opcional para Mini Smart Switch. Deixe vazio se nao configurou senha no Tasmota."
                      : "Senha que protege o portao. Peca ao suporte."}
                  </p>
                </div>

                <button
                  onClick={handleAddGate}
                  disabled={!editName.trim() || !editIp.trim()}
                  style={{
                    width: "100%",
                    padding: "16px",
                    borderRadius: "12px",
                    border: "none",
                    background: !editName.trim() || !editIp.trim() ? "#d1d5db" : "#003580",
                    color: p.text,
                    fontSize: "16px",
                    fontWeight: 700,
                    cursor: !editName.trim() || !editIp.trim() ? "not-allowed" : "pointer",
                    marginTop: "8px",
                  }}
                >
                  {editId ? "Salvar Alteracoes" : "Adicionar Portao"}
                </button>

                {editId && (
                  <button
                    onClick={() => { setEditId(null); setEditName(""); setEditIp(""); setEditToken(""); setEditType("tasmota"); }}
                    style={{
                      width: "100%",
                      padding: "12px",
                      borderRadius: "12px",
                      border: "2px solid #d1d5db",
                      background: "#fff",
                      color: "#6b7280",
                      fontSize: "14px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Cancelar Edicao
                  </button>
                )}
              </div>
            </div>

            {/* Example layout */}
            <div style={{
              background: "#eef0f5",
              borderRadius: "12px",
              padding: "16px",
              border: "1px solid rgba(45,51,84,0.3)",
            }}>
              <p style={{ fontWeight: 700, fontSize: "14px", color: "#2d3354", marginBottom: "10px" }}>
                EXEMPLO DE CONFIGURACAO:
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "13px", color: "#374151" }}>
                <p>• <strong>Portao 1:</strong> "Entrada Principal" — Mini Smart Switch — IP: 192.168.1.200</p>
                <p>• <strong>Portao 2:</strong> "Bloco A" — Mini Smart Switch — IP: 192.168.1.201</p>
                <p>• <strong>Portao 3:</strong> "Bloco B" — ESP32 + Rele — IP: 192.168.1.202</p>
              </div>
              <p style={{ fontSize: "12px", color: "#6b7280", marginTop: "8px" }}>
                Cada portao precisa de 1 dispositivo (Mini Smart Switch OU ESP32+Rele) instalado.
              </p>
            </div>

            {/* Troubleshooting */}
            <div style={{
              background: "#fffbeb",
              borderRadius: "12px",
              padding: "16px",
              border: "1px solid #fde68a",
            }}>
              <p style={{ fontWeight: 700, fontSize: "14px", color: "#92400e", marginBottom: "10px" }}>
                PROBLEMAS COMUNS:
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {[
                  { p: "Status OFFLINE", s: "Verifique se o dispositivo esta ligado e conectado ao WiFi. Para Tasmota, acesse o IP no navegador." },
                  { p: "Portao nao abre", s: "Mini Smart Switch: verifique os fios S1/S2 nos bornes FECHA e COM do motor. ESP32: verifique fios do rele." },
                  { p: "Nao sei o IP", s: "Mini Smart Switch: abra o app eWeLink/Tuya e veja o IP na rede. ESP32: o IP aparece no monitor serial." },
                  { p: "WiFi nao chega no portao", s: "Instale um repetidor de WiFi perto do portao (custa R$50-80)." },
                  { p: "Tenho varios blocos", s: "Instale 1 dispositivo em CADA portao. Cada um tera um IP diferente. Adicione todos aqui." },
                ].map((item, i) => (
                  <div key={i} style={{ background: "#fff", borderRadius: "8px", padding: "10px", border: "1px solid #fde68a" }}>
                    <p style={{ fontWeight: 700, fontSize: "13px", color: "#dc2626" }}>{item.p}</p>
                    <p style={{ fontSize: "12px", color: "#6b7280", marginTop: "2px" }}>{item.s}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
