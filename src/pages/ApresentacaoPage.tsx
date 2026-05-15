import { useNavigate } from "react-router-dom";
import {
  Shield, UserPlus, Car, Package, Truck, BookOpen, DoorOpen, Camera,
  ShieldCheck, Users, Building2, Check, Star,
  ArrowLeft, ArrowRight, Eye, Fingerprint, Lock, Bell,
  Printer, Copy, MessageCircle, Share2,
  Monitor, Route, ScanLine, BarChart3, Cog, Navigation,
  Cpu, Globe, Wifi, Signal, Wrench,
} from "lucide-react";
import { useState } from "react";
import { BRANDS, INTEGRATION_LABELS } from "@/lib/deviceLibrary";

const WHATSAPP_NUMBER = "5511933284364";
const SITE_URL = "https://www.portariax.com.br";

/* ─── Profile badge config ─── */
const PROFILES = {
  portaria: { label: "Portaria", icon: Shield, color: "#2563eb", bg: "#2563eb" },
  morador:  { label: "Morador",  icon: Users,  color: "#059669", bg: "#059669" },
  sindico:  { label: "Síndico",  icon: Building2, color: "#7c3aed", bg: "#7c3aed" },
} as const;
type ProfileKey = keyof typeof PROFILES;

/* ─── Feature data ─── */
const standardFeatures = [
  { icon: UserPlus, title: "Cadastro de Visitantes", desc: "Registre visitantes com foto, documento e reconhecimento facial. QR Code de acesso enviado por WhatsApp.", profiles: ["portaria"] as ProfileKey[] },
  { icon: ShieldCheck, title: "Autorizações Prévias", desc: "Moradores pré-autorizam visitantes pelo app. Porteiro já sabe quem pode entrar antes de chegar.", profiles: ["portaria", "morador"] as ProfileKey[] },
  { icon: Car, title: "Controle de Veículos", desc: "Cadastro com leitura automática de placas (OCR). Entrada e saída registradas. Morador acompanha pelo app.", profiles: ["portaria", "morador"] as ProfileKey[] },
  { icon: Package, title: "Correspondências", desc: "Registro de encomendas com foto. Morador recebe aviso no WhatsApp na hora. Controle de retirada.", profiles: ["portaria", "morador"] as ProfileKey[] },
  { icon: Truck, title: "Delivery", desc: "Morador avisa que espera delivery. Porteiro já tem o código. Notificação automática quando chegar.", profiles: ["portaria", "morador"] as ProfileKey[] },
  { icon: Navigation, title: "Estou Chegando", desc: "Morador avisa que está chegando via GPS. Porteiro recebe alerta sonoro em tempo real com mapa, veículo e distância.", profiles: ["portaria", "morador", "sindico"] as ProfileKey[] },
  { icon: BookOpen, title: "Livro de Protocolo", desc: "Registro digital com assinatura na tela. Gera PDF oficial. Síndico e administradora acompanham em tempo real.", profiles: ["portaria"] as ProfileKey[] },
  { icon: Camera, title: "Espelho de Portaria", desc: "Monitore tudo que acontece na portaria em tempo real, de qualquer lugar. Visão completa para o síndico.", profiles: ["portaria", "sindico"] as ProfileKey[] },
  { icon: Route, title: "Controle de Rondas", desc: "Rondas com checkpoints QR Code, registro fotográfico e geolocalização. Relatório automático para o síndico.", profiles: ["portaria", "sindico"] as ProfileKey[] },
  { icon: ScanLine, title: "QR Scanner de Visitantes", desc: "Leia o QR Code do visitante e valide a autorização instantaneamente. Rápido, seguro e sem papel.", profiles: ["portaria"] as ProfileKey[] },
  { icon: Building2, title: "Gestão de Condomínio", desc: "Cadastre blocos, moradores e funcionários. Multi-perfil e multi-condomínio. Tudo centralizado.", profiles: ["sindico"] as ProfileKey[] },
  { icon: BarChart3, title: "Relatórios e Dashboards", desc: "Relatórios em PDF + dashboards visuais com gráficos de visitantes, veículos, rondas e correspondências.", profiles: ["sindico"] as ProfileKey[] },
  { icon: Cog, title: "Configuração de Features", desc: "Ative ou desative funcionalidades por condomínio. Personalize o sistema conforme a necessidade.", profiles: ["sindico"] as ProfileKey[] },
];

const extraFeatures = [
  { icon: Monitor, title: "Monitoramento de Câmeras", desc: "Câmeras RTSP em tempo real. Grade multi-câmera com snapshot automático. Configure pelo painel do síndico.", profiles: ["portaria", "sindico"] as ProfileKey[] },
  { icon: DoorOpen, title: "Portaria Virtual (IoT)", desc: "Abra portões e portas dos blocos pelo app com ESP32 + relé. Multi-portão. Sem fio. Instalação simples.", profiles: ["portaria", "morador", "sindico"] as ProfileKey[] },
  { icon: Eye, title: "Leitura de Placa Veicular por Câmera IP", desc: "Câmera IP lê a placa automaticamente na entrada e saída. Identifica veículos cadastrados e libera acesso sem interação manual. Pelo celular já incluso no plano.", profiles: ["portaria", "sindico"] as ProfileKey[] },
  { icon: Fingerprint, title: "Biometria Facial por Câmera IP", desc: "Reconhecimento facial via câmera IP na entrada do condomínio. Identificação automática sem contato. Pelo celular já incluso no plano.", profiles: ["portaria", "sindico"] as ProfileKey[] },
];

const planFeatures = [
  "Cadastro de Visitantes com QR Code", "Autorizações Prévias", "Controle de Veículos + OCR",
  "Correspondências com Notificação", "Delivery",
  "Estou Chegando (GPS)", "Livro de Protocolo Digital", "Espelho de Portaria",
  "Monitoramento de Câmeras (CFTV)", "Controle de Rondas", "Relatórios em PDF e Gráficos",
  "Configuração de Features", "App do Morador completo", "Multi-perfil (5 níveis)",
  "Integração com WhatsApp com mensagens ilimitadas", "Suporte por WhatsApp",
];

export default function ApresentacaoPage() {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const plans = [
    { name: "Plano até 299 unidades", price: "199" },
    { name: "Plano acima de 300 unidades", price: "299" },
  ];
  const faqs = [
    { q: "Preciso instalar algo no celular?", a: "Não. O sistema funciona 100% no navegador e também pode ser instalado como app pelo navegador quando o dispositivo permitir." },
    { q: "Quanto tempo leva para implantar?", a: "O cadastro inicial leva poucos minutos. Os moradores podem entrar por link, QR Code ou importação em lote, acelerando a ativação do condomínio." },
    { q: "Preciso cadastrar os moradores manualmente?", a: "Não. Você pode cadastrar manualmente, por link, QR Code ou por planilha, dependendo do tamanho do condomínio." },
    { q: "Posso cancelar quando quiser?", a: "Sim. Não há fidelidade nem multa de cancelamento." },
    { q: "Preciso de uma função específica?", a: "Sim. É possível solicitar funcionalidades específicas conforme a operação do condomínio." },
  ];

  const divider = {
    border: 0,
    borderTop: "1px solid #e2e8f0",
    margin: 0,
  } as const;

  const sectionWrap = {
    padding: "80px 24px",
    maxWidth: "1200px",
    margin: "0 auto",
  } as const;

  const sectionTitle = {
    fontSize: "clamp(1.8rem, 4vw, 2.6rem)",
    fontWeight: 900,
    color: "#003580",
    marginBottom: "12px",
    lineHeight: 1.2,
  } as const;

  const sectionSub = {
    fontSize: "16px",
    color: "var(--muted-foreground)",
    lineHeight: 1.7,
    maxWidth: "720px",
    margin: "0 auto",
  } as const;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(SITE_URL);
    setCopied(true);
    globalThis.setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsApp = () => {
    globalThis.open(
      `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Olá! Gostaria de saber mais sobre o Portaria X.")}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  return (
    <div style={{ background: "var(--color-card, #fff)", minHeight: "100vh" }}>
      <div className="no-print" style={{
        position: "sticky", top: 0, zIndex: 100, background: "rgba(255,255,255,0.96)",
        borderBottom: "1px solid #e2e8f0", backdropFilter: "blur(10px)",
      }}>
        <div style={{
          maxWidth: "1200px", margin: "0 auto", padding: "14px 24px",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap",
        }}>
          <button onClick={() => navigate(-1)} style={{
            display: "flex", alignItems: "center", gap: "12px",
            background: "transparent", border: "none", color: "#003580",
            fontWeight: 700, fontSize: "16px", cursor: "pointer",
          }}>
            <ArrowLeft style={{ width: "18px", height: "18px" }} /> Voltar
          </button>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button onClick={() => globalThis.print()} style={{
              display: "flex", alignItems: "center", gap: "6px",
              padding: "10px 20px", borderRadius: "10px",
              background: "linear-gradient(135deg, #0062d1, #003580)", border: "none",
              color: "#ffffff", fontWeight: 700, fontSize: "15px", cursor: "pointer",
            }}>
              <Printer style={{ width: "16px", height: "16px" }} /> Imprimir / PDF
            </button>
            <button onClick={handleCopy} style={{
              display: "flex", alignItems: "center", gap: "6px",
              padding: "10px 20px", borderRadius: "10px",
              background: copied ? "#10b981" : "#f8fafc", border: "1px solid #e2e8f0",
              color: copied ? "#ffffff" : "#003580", fontWeight: 700, fontSize: "15px", cursor: "pointer",
            }}>
              <Copy style={{ width: "16px", height: "16px" }} /> {copied ? "Copiado!" : "Copiar Link"}
            </button>
            <button onClick={handleWhatsApp} style={{
              display: "flex", alignItems: "center", gap: "6px",
              padding: "10px 20px", borderRadius: "10px",
              background: "#25D366", border: "none",
              color: "#ffffff", fontWeight: 700, fontSize: "15px", cursor: "pointer",
            }}>
              <MessageCircle style={{ width: "16px", height: "16px" }} /> WhatsApp
            </button>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════
          CAPA / HEADER
      ═══════════════════════════════════ */}
      <section style={{
        minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center",
        alignItems: "center", textAlign: "center", padding: "120px 24px 80px",
        background: "linear-gradient(135deg, #001533 0%, #002a66 40%, #003580 70%, #004aad 100%)",
        position: "relative", overflow: "hidden", color: "#ffffff",
      }}>
        {/* Decorative orbs */}
        <div style={{ position: "absolute", top: "-120px", left: "-80px", width: "400px", height: "400px", borderRadius: "50%", background: "radial-gradient(circle, rgba(0,98,209,0.2), transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: "-120px", right: "-80px", width: "500px", height: "500px", borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.15), transparent 70%)", pointerEvents: "none" }} />

        <img src="/logo.png" alt="Portaria X" style={{ width: "120px", height: "120px", borderRadius: "24px", marginBottom: "28px", objectFit: "cover", border: "3px solid #ffffff" }} />

        <h1 style={{
          fontSize: "clamp(2.2rem, 5vw, 4rem)", fontWeight: 900, lineHeight: 1.1,
          maxWidth: "800px", marginBottom: "24px",
          background: "linear-gradient(135deg, #fff 0%, #c7d2fe 50%, #818cf8 100%)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
        }}>
          Portaria X<br />Portaria Inteligente para o seu Condomínio
        </h1>

        <p style={{ fontSize: "clamp(1rem, 2vw, 1.25rem)", color: "rgba(255,255,255,0.7)", maxWidth: "600px", lineHeight: 1.7, marginBottom: "40px" }}>
          Visitantes, veículos, correspondências, delivery, protocolo digital e portaria virtual — tudo em um só sistema.{" "}
          <strong style={{ color: "#ffffff" }}>Funciona no celular, tablet e computador.</strong>
        </p>

        <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", justifyContent: "center" }}>
          <a
            href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Olá! Gostaria de testar o Portaria X gratuitamente.")}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: "16px 32px", borderRadius: "14px",
              border: "2px solid #003580", background: "var(--color-card, #fff)",
              color: "#003580", fontWeight: 700, fontSize: "16px", cursor: "pointer",
              display: "flex", alignItems: "center", gap: "12px",
              textDecoration: "none",
            }}
          >
            Testar Grátis por 7 Dias <ArrowRight style={{ width: "18px", height: "18px", color: "#003580" }} />
          </a>
          <a
            href={SITE_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: "16px 32px", borderRadius: "14px",
              border: "2px solid #ffffff", background: "linear-gradient(135deg, #0062d1 0%, #003d99 50%, #001d4a 100%)",
              color: "#ffffff", fontWeight: 700, fontSize: "16px", cursor: "pointer",
              display: "flex", alignItems: "center", gap: "12px",
              textDecoration: "none",
            }}
          >
            <Lock style={{ width: "18px", height: "18px", color: "#ffffff" }} /> Acessar Plataforma
          </a>
        </div>

        {/* Highlight features */}
        <div style={{ marginTop: "48px", display: "flex", gap: "16px", flexWrap: "wrap", justifyContent: "center" }}>
          {[
            { icon: Fingerprint, text: "Biometria Facial", bg: "#ffffff", border: "#003580", textColor: "#003580", iconColor: "#003580" },
            { icon: DoorOpen, text: "Portaria Virtual (IoT)", bg: "#003580", border: "#ffffff", textColor: "#ffffff", iconColor: "#ffffff" },
            { icon: MessageCircle, text: "Integrado ao WhatsApp", bg: "#25D366", border: "#ffffff", textColor: "#ffffff", iconColor: "#ffffff" },
          ].map((b) => (
            <div key={b.text} style={{
              display: "flex", alignItems: "center", gap: "10px",
              background: b.bg, border: `2px solid ${b.border}`,
              borderRadius: "14px", padding: "12px 28px",
              fontSize: "16px", fontWeight: 600, color: b.textColor,
              minWidth: "220px", justifyContent: "center",
            }}>
              <b.icon style={{ width: "20px", height: "20px", color: b.iconColor }} /> {b.text}
            </div>
          ))}
        </div>

        {/* Trust badges */}
        <div style={{ marginTop: "32px", display: "flex", gap: "32px", flexWrap: "wrap", justifyContent: "center", opacity: 0.6 }}>
          {[
            { icon: Lock, text: "Dados criptografados" },
            { icon: Wifi, text: "100% na nuvem" },
            { icon: Eye, text: "Monitoramento em tempo real" },
            { icon: Bell, text: "Notificações automáticas" },
          ].map((b) => (
            <div key={b.text} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "14px", color: "rgba(255,255,255,0.7)" }}>
              <b.icon style={{ width: "16px", height: "16px" }} /> {b.text}
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════
          FUNCIONALIDADES
      ═══════════════════════════════════ */}
      <section style={sectionWrap}>
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <h2 style={sectionTitle}>Funcionalidades Completas</h2>
          <p style={sectionSub}>Cada funcionalidade atende portaria, morador e síndico. Veja quem usa cada recurso.</p>
          <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" }}>
            {(["portaria", "morador", "sindico"] as ProfileKey[]).map((k) => {
              const pr = PROFILES[k]; const PrIcon = pr.icon;
              return (
                <div key={k} style={{ display: "flex", alignItems: "center", gap: "6px", background: pr.bg, padding: "5px 12px", borderRadius: "999px" }}>
                  <PrIcon style={{ width: "13px", height: "13px", color: "#fff" }} />
                  <span style={{ fontSize: "13px", fontWeight: 700, color: "#fff" }}>{pr.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Funções Padrão ── */}
        <div style={{
          display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px",
          padding: "14px 20px", borderRadius: "14px",
          background: "linear-gradient(135deg, rgba(0,53,128,0.06), rgba(0,53,128,0.02))",
          border: "1.5px solid rgba(0,53,128,0.12)",
        }}>
          <Star style={{ width: "20px", height: "20px", color: "#003580" }} />
          <div>
            <h3 style={{ fontWeight: 800, fontSize: "16px", color: "#003580", margin: 0 }}>Funções Incluídas no Plano</h3>
            <p style={{ fontSize: "13px", color: "#336699", margin: 0 }}>Disponíveis para todos os condomínios — {standardFeatures.length} funcionalidades</p>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px" }}>
          {standardFeatures.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="print-section" style={{
                border: "1.5px solid #e2e8f0", borderRadius: "14px", padding: "22px",
                display: "flex", flexDirection: "column", position: "relative",
              }}>
                <div style={{
                  width: "40px", height: "40px", borderRadius: "10px",
                  background: "rgba(0,53,128,0.08)", display: "flex", alignItems: "center",
                  justifyContent: "center", marginBottom: "12px",
                }}>
                  <Icon style={{ width: "20px", height: "20px", color: "#003580" }} />
                </div>
                <h3 style={{ fontWeight: 700, fontSize: "16px", color: "#003580", marginBottom: "6px" }}>{f.title}</h3>
                <p style={{ fontSize: "14px", color: "var(--muted-foreground)", lineHeight: 1.6, flex: 1 }}>{f.desc}</p>
                <div style={{ display: "flex", gap: "5px", flexWrap: "wrap", marginTop: "12px", paddingTop: "10px", borderTop: "1px solid #f1f5f9" }}>
                  {f.profiles.map((pk) => {
                    const pr = PROFILES[pk]; const PrIcon = pr.icon;
                    return (
                      <div key={pk} style={{ display: "flex", alignItems: "center", gap: "4px", background: pr.bg, padding: "3px 8px", borderRadius: "999px" }}>
                        <PrIcon style={{ width: "11px", height: "11px", color: "#fff" }} />
                        <span style={{ fontSize: "12px", fontWeight: 700, color: "#fff" }}>{pr.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Funções Extras ── */}
        <div style={{
          display: "flex", alignItems: "center", gap: "10px", marginTop: "48px", marginBottom: "20px",
          padding: "14px 20px", borderRadius: "14px",
          background: "linear-gradient(135deg, rgba(124,58,237,0.06), rgba(124,58,237,0.02))",
          border: "1.5px dashed rgba(124,58,237,0.25)",
        }}>
          <Cpu style={{ width: "20px", height: "20px", color: "#7c3aed" }} />
          <div>
            <h3 style={{ fontWeight: 800, fontSize: "16px", color: "#7c3aed", margin: 0 }}>Módulos Extras</h3>
            <p style={{ fontSize: "13px", color: "#8b5cf6", margin: 0 }}>
              Funcionalidades extras em preparação — <strong>DISPONÍVEL EM BREVE</strong>
            </p>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px" }}>
          {extraFeatures.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="print-section" style={{
                border: "1.5px solid #e2e8f0", borderRadius: "14px", padding: "22px",
                display: "flex", flexDirection: "column", position: "relative",
              }}>

                <div style={{
                  position: "absolute",
                  top: 14,
                  right: 14,
                  background: "#f59e0b",
                  color: "#ffffff",
                  borderRadius: "999px",
                  padding: "4px 10px",
                  fontSize: "12px",
                  fontWeight: 800,
                  letterSpacing: "0.3px",
                }}>
                  DISPONÍVEL EM BREVE
                </div>

                <div style={{
                  width: "40px", height: "40px", borderRadius: "10px",
                  background: "rgba(0,53,128,0.08)", display: "flex", alignItems: "center",
                  justifyContent: "center", marginBottom: "12px",
                }}>
                  <Icon style={{ width: "20px", height: "20px", color: "#003580" }} />
                </div>
                <h3 style={{ fontWeight: 700, fontSize: "16px", color: "#003580", marginBottom: "6px" }}>{f.title}</h3>
                <p style={{ fontSize: "14px", color: "var(--muted-foreground)", lineHeight: 1.6, flex: 1 }}>{f.desc}</p>
                <div style={{ display: "flex", gap: "5px", flexWrap: "wrap", marginTop: "12px", paddingTop: "10px", borderTop: "1px solid #f1f5f9" }}>
                  {f.profiles.map((pk) => {
                    const pr = PROFILES[pk]; const PrIcon = pr.icon;
                    return (
                      <div key={pk} style={{ display: "flex", alignItems: "center", gap: "4px", background: pr.bg, padding: "3px 8px", borderRadius: "999px" }}>
                        <PrIcon style={{ width: "11px", height: "11px", color: "#fff" }} />
                        <span style={{ fontSize: "12px", fontWeight: 700, color: "#fff" }}>{pr.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <hr style={divider} />

      {/* ═══════════════════════════════════
          INTEGRAÇÕES
      ═══════════════════════════════════ */}
      <section style={sectionWrap}>
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <h2 style={sectionTitle}>Biblioteca de Integrações IoT</h2>
          <p style={sectionSub}>Conecte portões, fechaduras e acessos com dispositivos de diversas marcas.</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "16px" }}>
          {BRANDS.map((brand) => {
            let diffColor: string;
            let diffLabel: string;
            if (brand.difficulty <= 3) { diffColor = "#10b981"; diffLabel = "Fácil"; }
            else if (brand.difficulty <= 5) { diffColor = "#f59e0b"; diffLabel = "Moderado"; }
            else if (brand.difficulty <= 7) { diffColor = "#f97316"; diffLabel = "Avançado"; }
            else { diffColor = "#ef4444"; diffLabel = "Expert"; }
            let IntegIcon: typeof Globe;
            if (brand.integrationType === "cloud") IntegIcon = Globe;
            else if (brand.integrationType === "local") IntegIcon = Wifi;
            else IntegIcon = Signal;
            return (
              <div key={brand.id} className="print-section" style={{
                border: "1.5px solid #e2e8f0", borderRadius: "14px", padding: "20px",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                  <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "rgba(0,53,128,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Cpu style={{ width: "18px", height: "18px", color: "#003580" }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontWeight: 700, fontSize: "16px", color: "#003580", margin: 0 }}>{brand.name}</h3>
                    <span style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>{brand.country}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "4px", background: "#f8fafc", padding: "3px 8px", borderRadius: "999px", fontSize: "12px", color: "var(--muted-foreground)", fontWeight: 600 }}>
                    <IntegIcon style={{ width: "12px", height: "12px" }} />
                    {INTEGRATION_LABELS[brand.integrationType].split(" ")[0]}
                  </div>
                </div>
                <p style={{ fontSize: "14px", color: "var(--muted-foreground)", lineHeight: 1.6, marginBottom: "12px" }}>{brand.description}</p>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--muted-foreground)", display: "flex", alignItems: "center", gap: "4px" }}>
                    <Wrench style={{ width: "12px", height: "12px" }} /> Dificuldade
                  </span>
                  <span style={{ fontSize: "13px", fontWeight: 700, color: diffColor }}>{brand.difficulty}/10 — {diffLabel}</span>
                </div>
                <div style={{ width: "100%", height: "5px", borderRadius: "999px", background: "#f1f5f9", overflow: "hidden", marginTop: "6px" }}>
                  <div style={{ width: `${brand.difficulty * 10}%`, height: "100%", borderRadius: "999px", background: diffColor }} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <hr style={divider} />

      {/* ═══════════════════════════════════
          PLANOS E PREÇOS
      ═══════════════════════════════════ */}
      <section style={sectionWrap}>
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <h2 style={sectionTitle}>Planos e Preços</h2>
          <p style={sectionSub}>Teste grátis por 7 dias. Sem taxa de implantação. Sem fidelidade. Cancele quando quiser.</p>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "20px", maxWidth: "960px", margin: "0 auto" }}>
          {plans.map((plan) => (
            <div key={`${plan.name}-${plan.price}`} className="print-section" style={{
              border: "2px solid #003580", borderRadius: "16px", padding: "28px 24px",
              width: "100%", maxWidth: "360px",
            }}>
              <h3 style={{ fontWeight: 800, fontSize: "18px", color: "#003580", marginBottom: "16px" }}>{plan.name}</h3>
              <div style={{ display: "flex", alignItems: "baseline", gap: "4px", marginBottom: "20px" }}>
                <span style={{ fontSize: "15px", color: "#003580" }}>R$</span>
                <span style={{ fontSize: "44px", fontWeight: 900, color: "#003580", lineHeight: 1 }}>{plan.price}</span>
                <span style={{ fontSize: "15px", color: "#003580" }}>/mês</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {planFeatures.map((f) => (
                  <div key={f} style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "14px", color: "#003580" }}>
                    <Check style={{ width: "15px", height: "15px", color: "#10b981", flexShrink: 0 }} /> {f}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>


      </section>

      <hr style={divider} />

      {/* ═══════════════════════════════════
          FAQ (todas abertas)
      ═══════════════════════════════════ */}
      <section style={sectionWrap}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <h2 style={sectionTitle}>Perguntas Frequentes</h2>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", maxWidth: "700px", margin: "0 auto" }}>
          {faqs.map((faq) => (
            <div key={faq.q} className="print-section" style={{ border: "1.5px solid #e2e8f0", borderRadius: "12px", overflow: "hidden" }}>
              <div style={{ background: "#f8fafc", padding: "14px 18px", fontWeight: 700, fontSize: "16px", color: "#003580" }}>
                {faq.q}
              </div>
              <div style={{ padding: "14px 18px", fontSize: "15px", color: "var(--muted-foreground)", lineHeight: 1.7 }}>
                {faq.a}
              </div>
            </div>
          ))}
        </div>
      </section>

      <hr style={divider} />

      {/* ═══════════════════════════════════
          CONTATO / RODAPÉ
      ═══════════════════════════════════ */}
      <section style={{
        background: "linear-gradient(135deg, #001533 0%, #002a66 40%, #003580 70%, #004aad 100%)",
        padding: "48px 32px", textAlign: "center", color: "#ffffff",
      }}>
        <h2 style={{ fontWeight: 900, fontSize: "24px", marginBottom: "12px" }}>Entre em contato</h2>
        <p style={{ fontSize: "16px", color: "rgba(255,255,255,0.8)", marginBottom: "24px" }}>
          Teste grátis por 7 dias. Fale conosco e transforme a portaria do seu condomínio.
        </p>
        <div style={{ display: "flex", gap: "16px", justifyContent: "center", flexWrap: "wrap", marginBottom: "32px" }}>
          <div style={{ border: "1.5px solid rgba(255,255,255,0.4)", borderRadius: "10px", padding: "12px 24px", fontSize: "16px", fontWeight: 600 }}>
            📱 (11) 93328-4364
          </div>
          <div style={{ border: "1.5px solid rgba(255,255,255,0.4)", borderRadius: "10px", padding: "12px 24px", fontSize: "16px", fontWeight: 600 }}>
            🌐 www.portariax.com.br
          </div>
        </div>
        <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.4)" }}>© 2026 Portaria X — APP GROUP LTDA-ME</p>
      </section>

      {/* ═══ BOTTOM ACTION BAR ═══ */}
      <div className="no-print" style={{
        position: "sticky", bottom: 0, zIndex: 100,
        background: "var(--color-card, #fff)", borderTop: "1px solid #e2e8f0",
        padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "center",
        gap: "10px", flexWrap: "wrap",
      }}>
        <button onClick={() => globalThis.print()} style={{
          display: "flex", alignItems: "center", gap: "6px",
          padding: "12px 24px", borderRadius: "10px",
          background: "linear-gradient(135deg, #0062d1, #003580)", border: "none",
          color: "#ffffff", fontWeight: 700, fontSize: "15px", cursor: "pointer",
        }}>
          <Printer style={{ width: "16px", height: "16px" }} /> Imprimir / Salvar PDF
        </button>
        <button onClick={handleCopy} style={{
          display: "flex", alignItems: "center", gap: "6px",
          padding: "12px 24px", borderRadius: "10px",
          background: copied ? "#10b981" : "#f8fafc", border: "1px solid #e2e8f0",
          color: copied ? "#ffffff" : "#003580", fontWeight: 700, fontSize: "15px", cursor: "pointer",
        }}>
          <Share2 style={{ width: "16px", height: "16px" }} /> {copied ? "Link Copiado!" : "Compartilhar Link"}
        </button>
        <button onClick={handleWhatsApp} style={{
          display: "flex", alignItems: "center", gap: "6px",
          padding: "12px 24px", borderRadius: "10px",
          background: "#25D366", border: "none",
          color: "#ffffff", fontWeight: 700, fontSize: "15px", cursor: "pointer",
        }}>
          <MessageCircle style={{ width: "16px", height: "16px" }} /> Enviar via WhatsApp
        </button>
      </div>
    </div>
  );
}
