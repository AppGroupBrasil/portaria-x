import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Shield, UserPlus, Car, Package, Truck, BookOpen, DoorOpen, Camera,
  ShieldCheck, Users, Building2, ChevronRight, Check, Star,
  ArrowRight, MessageCircle, Zap, Lock, Eye, Fingerprint,
  Bell, QrCode, FileText, Wifi, Sun, Moon, Code2,
  Monitor, Route, ScanLine, BarChart3, Cog, Navigation,
  Cpu, Signal, Globe, Wrench, Play, Download,
} from "lucide-react";
import LandingTutorialModal from "@/components/LandingTutorialModal";
import { BRANDS, INTEGRATION_LABELS } from "@/lib/deviceLibrary";
import { useAuth } from "@/hooks/useAuth";
import { dialogAlert } from "@/lib/dialog";

/* ═══════════════════════════════════════════════
   LANDING PAGE — Portaria X
   ═══════════════════════════════════════════════ */

const WHATSAPP_NUMBER = "5511933284364";
const WHATSAPP_LINK = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Olá! Gostaria de saber mais sobre o Portaria X.")}`;
const SHOW_PREMIUM_LANDING = false; // alterar para true quando quiser reexibir os módulos premium na landing

/* ─── Theme palettes ─── */
const themes = {
  dark: {
    bg1: "#003580", bg2: "#002a66",
    text1: "#e2e8f0", text2: "#f1f5f9", text3: "#94a3b8", text4: "#cbd5e1", text5: "#7da1c9",
    card: "rgba(0,40,100,0.8)", card2: "rgba(0,30,80,0.6)", card3: "rgba(0,40,100,0.6)",
    border: "rgba(255,255,255,0.08)", borderMed: "rgba(255,255,255,0.18)",
    heroGrad: "radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.08) 0%, transparent 60%), linear-gradient(180deg, #001533 0%, #002254 40%, #003d80 70%, #004aad 100%)",
    orb1: "radial-gradient(circle, rgba(255,255,255,0.04), transparent 70%)",
    orb2: "radial-gradient(circle, rgba(16,185,129,0.06), transparent 70%)",
    sectionGrad1: "linear-gradient(180deg, #003d80 0%, #002254 50%, #001533 100%)",
    sectionGrad2: "linear-gradient(180deg, #001533 0%, #002254 50%, #003d80 100%)",
    planCardBg: "rgba(0,40,100,0.6)", planBtnBg: "rgba(255,255,255,0.1)",
    faqBg: "rgba(0,30,80,0.6)",
    ctaBtnBorder: "2px solid rgba(255,255,255,0.5)", ctaBtnBg: "rgba(255,255,255,0.1)",
    priceNum: "#f1f5f9",
    footerBorder: "1px solid rgba(255,255,255,0.08)",
    loginBtnBg: "rgba(255,255,255,0.05)", loginBtnBorder: "1px solid rgba(255,255,255,0.18)",
  },
  light: {
    bg1: "#ffffff", bg2: "#f8fafc",
    text1: "#003580", text2: "#003580", text3: "#336699", text4: "#003580", text5: "#4d7faa",
    card: "#ffffff", card2: "#ffffff", card3: "#ffffff",
    border: "rgba(0,53,128,0.2)", borderMed: "rgba(0,53,128,0.3)",
    heroGrad: "radial-gradient(ellipse at 50% 0%, rgba(0,53,128,0.05) 0%, transparent 60%), #ffffff",
    orb1: "radial-gradient(circle, rgba(0,53,128,0.04), transparent 70%)",
    orb2: "radial-gradient(circle, rgba(0,53,128,0.03), transparent 70%)",
    sectionGrad1: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
    sectionGrad2: "linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)",
    planCardBg: "#f8fafc", planBtnBg: "rgba(0,53,128,0.08)",
    faqBg: "#f8fafc",
    ctaBtnBorder: "2px solid #003580", ctaBtnBg: "rgba(0,53,128,0.08)",
    priceNum: "#003580",
    footerBorder: "1px solid rgba(0,53,128,0.15)",
    loginBtnBg: "rgba(0,53,128,0.05)", loginBtnBorder: "1px solid rgba(0,53,128,0.2)",
  },
} as const;

type ThemeColors = (typeof themes)[keyof typeof themes];

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

/* ─── FAQ data ─── */
const FAQS = [
  { q: "Preciso instalar algo no celular?", a: "Não! O sistema funciona 100% no navegador — basta acessar o link. Funciona em qualquer celular, tablet ou computador." },
  { q: "Quanto tempo leva para implantar?", a: "O cadastro leva 5 minutos. Os moradores se cadastram via link ou QR Code. Em 24h o condomínio já está operando." },
  SHOW_PREMIUM_LANDING
    ? { q: "A Portaria Virtual precisa de obra?", a: "Não. O módulo IoT usa ESP32 + relé, instalação simples sem fio. Funciona com qualquer portão elétrico." }
    : { q: "Preciso cadastrar os moradores manualmente?", a: "Não. Você pode cadastrar manualmente, por link, QR Code ou importação em lote por planilha." },
  { q: "Posso cancelar quando quiser?", a: "Sim, sem fidelidade e sem multa. Cancele a qualquer momento pelo painel." },
  { q: "Preciso de uma função específica?", a: "Desenvolvemos para você sem nenhum custo adicional! Fale conosco pelo WhatsApp." },
];

/* ─── Profile badge config ─── */
const PROFILES = {
  portaria: { label: "Portaria", icon: Shield, color: "#2563eb", bg: "#2563eb", link: "/register/condominio" },
  morador:  { label: "Morador",  icon: Users,  color: "#059669", bg: "#059669", link: "/register/morador/search" },
  sindico:  { label: "Síndico",  icon: Building2, color: "#7c3aed", bg: "#7c3aed", link: "/register/condominio" },
} as const;
type ProfileKey = keyof typeof PROFILES;

/* ─── Unified feature data ─── */
const standardFeatures = [
  {
    icon: UserPlus, title: "Cadastro de Visitantes",
    desc: "Registre visitantes com foto, documento e reconhecimento facial. QR Code de acesso enviado por WhatsApp.",
    profiles: ["portaria"] as ProfileKey[],
  },
  {
    icon: ShieldCheck, title: "Autorizações Prévias",
    desc: "Moradores pré-autorizam visitantes pelo app. Porteiro já sabe quem pode entrar antes de chegar.",
    profiles: ["portaria", "morador"] as ProfileKey[],
  },
  {
    icon: Car, title: "Controle de Veículos",
    desc: "Cadastro com leitura automática de placas (OCR). Entrada e saída registradas. Morador acompanha pelo app.",
    profiles: ["portaria", "morador"] as ProfileKey[],
  },
  {
    icon: Package, title: "Correspondências",
    desc: "Registro de encomendas com foto. Morador recebe aviso no WhatsApp na hora. Controle de retirada.",
    profiles: ["portaria", "morador"] as ProfileKey[],
  },
  {
    icon: Truck, title: "Delivery",
    desc: "Morador avisa que espera delivery. Porteiro já tem o código. Notificação automática quando chegar.",
    profiles: ["portaria", "morador"] as ProfileKey[],
  },
  {
    icon: Navigation, title: "Estou Chegando",
    desc: "Morador avisa que está chegando via GPS. Porteiro recebe alerta sonoro em tempo real com mapa, veículo e distância.",
    profiles: ["portaria", "morador", "sindico"] as ProfileKey[],
  },
  {
    icon: BookOpen, title: "Livro de Protocolo",
    desc: "Registro digital com assinatura na tela. Gera PDF oficial. Síndico e administradora acompanham em tempo real.",
    profiles: ["portaria"] as ProfileKey[],
  },
  {
    icon: Camera, title: "Espelho de Portaria",
    desc: "Monitore tudo que acontece na portaria em tempo real, de qualquer lugar. Visão completa para o síndico.",
    profiles: ["portaria", "sindico"] as ProfileKey[],
  },
  {
    icon: Route, title: "Controle de Rondas",
    desc: "Rondas com checkpoints QR Code, registro fotográfico e geolocalização. Relatório automático para o síndico.",
    profiles: ["portaria", "sindico"] as ProfileKey[],
  },
  {
    icon: ScanLine, title: "QR Scanner de Visitantes",
    desc: "Leia o QR Code do visitante e valide a autorização instantaneamente. Rápido, seguro e sem papel.",
    profiles: ["portaria"] as ProfileKey[],
  },
  {
    icon: Building2, title: "Gestão de Condomínio",
    desc: "Cadastre blocos, moradores e funcionários. Multi-perfil e multi-condomínio. Tudo centralizado.",
    profiles: ["sindico"] as ProfileKey[],
  },
  {
    icon: BarChart3, title: "Relatórios e Dashboards",
    desc: "Relatórios em PDF + dashboards visuais com gráficos de visitantes, veículos, rondas e correspondências.",
    profiles: ["sindico"] as ProfileKey[],
  },
  {
    icon: Cog, title: "Configuração de Features",
    desc: "Ative ou desative funcionalidades por condomínio. Personalize o sistema conforme a necessidade.",
    profiles: ["sindico"] as ProfileKey[],
  },
];

const premiumFeatures = [
  {
    icon: Monitor, title: "Monitoramento de Câmeras",
    desc: "Câmeras RTSP em tempo real. Grade multi-câmera com snapshot automático. Configure pelo painel do síndico.",
    profiles: ["portaria", "sindico"] as ProfileKey[],
  },
  {
    icon: DoorOpen, title: "Portaria Virtual (IoT)",
    desc: "Abra portões e portas dos blocos pelo app com ESP32 + relé. Multi-portão. Sem fio. Instalação simples.",
    profiles: ["portaria", "morador", "sindico"] as ProfileKey[],
  },
  {
    icon: Eye, title: "Leitura de Placa Veicular por Câmera IP",
    desc: "Câmera IP lê a placa automaticamente na entrada e saída. Identifica veículos cadastrados e libera acesso sem interação manual. <strong style='color:#ffffff'>Pelo celular já incluso no plano.</strong>",
    profiles: ["portaria", "sindico"] as ProfileKey[],
  },
  {
    icon: Fingerprint, title: "Biometria Facial por Câmera IP",
    desc: "Reconhecimento facial via câmera IP na entrada do condomínio. Identificação automática sem contato. <strong style='color:#ffffff'>Pelo celular já incluso no plano.</strong>",
    profiles: ["portaria", "sindico"] as ProfileKey[],
  },
];

/* ─── Plans ─── */
const baseFeatures = [
  "Cadastro de Visitantes com QR Code",
  "Autorizações Prévias",
  "Controle de Veículos + OCR",
  "Correspondências com Notificação",
  "Delivery",
  "Estou Chegando (GPS)",
  "Livro de Protocolo Digital",
  "Espelho de Portaria",
  "Controle de Rondas",
  "Relatórios em PDF e Gráficos",
  "Configuração de Features",
  "App do Morador completo",
  "Multi-perfil (5 níveis)",
  "Integração com WhatsApp com mensagens ilimitadas",
  "Suporte por WhatsApp",
];

const allPlanFeatures = [...baseFeatures];

const plans = [
  {
    name: "Plano até 299 unidades",
    price: "199",
    color: "#6366f1",
    features: baseFeatures,
    popular: false,
  },
  {
    name: "Plano acima de 300 unidades",
    price: "299",
    color: "#0ea5e9",
    features: allPlanFeatures,
    popular: false,
  },
];

/* ═══════════════════════════════════════════════
   EXTRACTED SECTION COMPONENTS
   ═══════════════════════════════════════════════ */

function PlanCard({ plan, onNavigate }: Readonly<{ plan: typeof plans[number]; onNavigate: () => void }>) {
  return (
    <div
      style={{
        background: "var(--color-card, #fff)",
        borderRadius: "20px", padding: "36px 28px",
        border: "2px solid #003580",
        position: "relative",
        width: "100%", maxWidth: "380px",
      }}
    >
      {plan.popular && (
        <div style={{
          position: "absolute", top: "-14px", left: "50%", transform: "translateX(-50%)",
          background: "linear-gradient(135deg, #0062d1 0%, #003d99 50%, #001d4a 100%)", color: "white",
          fontSize: "13px", fontWeight: 700, padding: "5px 20px", borderRadius: "999px",
          boxShadow: "0 4px 16px rgba(99,102,241,0.3)",
        }}>
          MAIS POPULAR
        </div>
      )}

      <h3 style={{ fontWeight: 800, fontSize: "20px", color: "#003580", marginBottom: "12px" }}>{plan.name}</h3>

      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: "16px",
          padding: "8px 12px",
          borderRadius: "999px",
          background: "linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)",
          border: "1px solid #22c55e",
          color: "#166534",
          fontSize: "13px",
          fontWeight: 800,
        }}
      >
        <MessageCircle style={{ width: "14px", height: "14px" }} />
        Integrado ao WhatsApp com mensagens ilimitadas em todos os planos*
      </div>

      <div style={{ display: "flex", alignItems: "baseline", gap: "4px", marginBottom: "8px" }}>
        <span style={{ fontSize: "15px", color: "#003580" }}>R$</span>
        <span style={{ fontSize: "48px", fontWeight: 900, color: "#003580", lineHeight: 1 }}>{plan.price}</span>
        <span style={{ fontSize: "15px", color: "#003580" }}>/mês</span>
      </div>

      <div style={{
        display: "flex", flexDirection: "column", gap: "12px",
        marginBottom: "28px", marginTop: "20px",
      }}>
        {plan.features.map((feat) => (
          <div key={feat} style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "15px", color: "#003580" }}>
            <Check style={{ width: "16px", height: "16px", color: "#10b981", flexShrink: 0 }} />
            {feat}
          </div>
        ))}
      </div>

      <p style={{ fontSize: "12px", color: "#336699", lineHeight: 1.5, marginBottom: "20px" }}>
        * Sujeito ao uso responsável da plataforma e às políticas de envio do WhatsApp.
      </p>

      <button
        onClick={onNavigate}
        style={{
          width: "100%", padding: "14px", borderRadius: "12px", border: "none",
          background: "linear-gradient(135deg, #0062d1 0%, #003d99 50%, #001d4a 100%)",
          color: "#ffffff",
          fontWeight: 700, fontSize: "16px", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: "12px",
          transition: "transform 0.2s",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.02)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
      >
        Testar Grátis 7 Dias <ChevronRight style={{ width: "16px", height: "16px" }} />
      </button>
    </div>
  );
}

function ThemeToggle({ mode, onToggle }: Readonly<{ mode: "dark" | "light"; onToggle: () => void }>) {
  return (
    <button
      onClick={onToggle}
      aria-label="Alternar tema claro/escuro"
      style={{
        position: "fixed", top: "24px", right: "24px", zIndex: 9999,
        width: "44px", height: "44px", borderRadius: "50%",
        background: mode === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,53,128,0.08)",
        border: mode === "dark" ? "1px solid rgba(255,255,255,0.15)" : "1px solid rgba(0,53,128,0.2)",
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer", transition: "transform 0.2s, background 0.3s",
        backdropFilter: "blur(8px)",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.1)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
    >
      {mode === "dark"
        ? <Sun style={{ width: "20px", height: "20px", color: "#fbbf24" }} />
        : <Moon style={{ width: "20px", height: "20px", color: "#003580" }} />
      }
    </button>
  );
}

function WhatsAppFloat() {
  return (
    <a
      href={WHATSAPP_LINK}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Fale conosco no WhatsApp"
      style={{
        position: "fixed", bottom: "24px", right: "24px", zIndex: 9999,
        width: "60px", height: "60px", borderRadius: "50%",
        background: "#25D366", display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "0 4px 20px rgba(37,211,102,0.4)",
        cursor: "pointer", transition: "transform 0.2s, box-shadow 0.2s",
        animation: "whatsappPulse 2s infinite",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.1)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
    >
      <svg viewBox="0 0 24 24" width="32" height="32" fill="white">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
      </svg>
    </a>
  );
}

function CssAnimations() {
  return (
    <style>{`
      @keyframes whatsappPulse {
        0%, 100% { box-shadow: 0 4px 20px rgba(37,211,102,0.4); }
        50% { box-shadow: 0 4px 30px rgba(37,211,102,0.7), 0 0 0 12px rgba(37,211,102,0.1); }
      }
      @keyframes fadeInUp {
        from { opacity: 0; transform: translateY(30px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes float {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-10px); }
      }
      .fade-up { animation: fadeInUp 0.7s ease-out both; }
      .fade-up-d1 { animation-delay: 0.1s; }
      .fade-up-d2 { animation-delay: 0.2s; }
      .fade-up-d3 { animation-delay: 0.3s; }
      .landing-section { padding: 80px 24px; max-width: 1200px; margin: 0 auto; }
      @media (max-width: 768px) { .landing-section { padding: 48px 16px; } }
      .gradient-title {
        -webkit-background-clip: text !important;
        background-clip: text !important;
        -webkit-text-fill-color: transparent !important;
        color: transparent !important;
      }
      @media print {
        * { break-inside: avoid; }
        section { break-before: avoid; break-after: avoid; page-break-before: avoid; page-break-after: avoid; page-break-inside: avoid; }
        body, html { overflow: visible !important; }
      }
    `}</style>
  );
}

function HeroSection({ mode, t, onNavigate }: Readonly<{ mode: "dark" | "light"; t: ThemeColors; onNavigate: (path: string) => void }>) {
  return (
    <section style={{
      minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center",
      alignItems: "center", textAlign: "center", padding: "120px 24px 80px",
      background: t.heroGrad,
      position: "relative", overflow: "hidden", transition: "background 0.4s",
    }}>
      {/* Decorative orbs */}
      <div style={{ position: "absolute", top: "-120px", left: "-80px", width: "400px", height: "400px", borderRadius: "50%", background: t.orb1, pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: "-120px", right: "-80px", width: "500px", height: "500px", borderRadius: "50%", background: t.orb2, pointerEvents: "none" }} />

      <img src="/logo.png" alt="Portaria X" className="fade-up" style={{ width: "120px", height: "120px", borderRadius: "24px", marginBottom: "28px", objectFit: "cover", border: "3px solid #ffffff" }} />

      <h1 className="fade-up gradient-title" style={{
        fontSize: "clamp(2.2rem, 5vw, 4rem)", fontWeight: 900, lineHeight: 1.1,
        maxWidth: "800px", marginBottom: "24px",
        background: mode === "dark" ? "linear-gradient(135deg, #fff 0%, #c7d2fe 50%, #818cf8 100%)" : "linear-gradient(135deg, #003580 0%, #0050b3 50%, #003580 100%)",
      }}>
        Portaria X<br />Portaria Inteligente para o seu Condomínio
      </h1>

      <p className="fade-up fade-up-d2" style={{ fontSize: "clamp(1rem, 2vw, 1.25rem)", color: t.text3, maxWidth: "600px", lineHeight: 1.7, marginBottom: "40px" }}>
        {SHOW_PREMIUM_LANDING
          ? <>Visitantes, veículos, correspondências, delivery, protocolo digital e portaria virtual — tudo em um só sistema. <strong style={{ color: t.text1 }}>Funciona no celular, tablet e computador.</strong></>
          : <>Visitantes, veículos, correspondências, delivery e protocolo digital — tudo em um só sistema. <strong style={{ color: t.text1 }}>Funciona no celular, tablet e computador.</strong></>}
      </p>

      <div className="fade-up fade-up-d3" style={{ display: "flex", gap: "16px", flexWrap: "wrap", justifyContent: "center" }}>
        <button
          onClick={() => onNavigate("/register/condominio")}
          style={{
            padding: "16px 32px", borderRadius: "14px",
            border: "2px solid #003580", background: "var(--color-card, #fff)",
            color: "#003580", fontWeight: 700, fontSize: "16px", cursor: "pointer",
            display: "flex", alignItems: "center", gap: "12px",
            transition: "transform 0.2s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; }}
        >
          Testar Grátis por 7 Dias <ArrowRight style={{ width: "18px", height: "18px", color: "#003580" }} />
        </button>
        <button
          onClick={() => onNavigate("/login")}
          style={{
            padding: "16px 32px", borderRadius: "14px",
            border: "2px solid #ffffff", background: "linear-gradient(135deg, #0062d1 0%, #003d99 50%, #001d4a 100%)",
            color: "#ffffff", fontWeight: 700, fontSize: "16px", cursor: "pointer",
            display: "flex", alignItems: "center", gap: "12px",
            transition: "transform 0.2s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; }}
        >
          <Lock style={{ width: "18px", height: "18px", color: "#ffffff" }} /> Acessar Plataforma
        </button>
      </div>

      {/* Highlight features */}
      <div className="fade-up" style={{ marginTop: "48px", display: "flex", gap: "16px", flexWrap: "wrap", justifyContent: "center" }}>
        {(SHOW_PREMIUM_LANDING
          ? [
              { icon: Fingerprint, text: "Biometria Facial", bg: "#ffffff", border: "#003580", textColor: "#003580", iconColor: "#003580" },
              { icon: Bell, text: "Alertas em Tempo Real", bg: "#003580", border: "#ffffff", textColor: "#ffffff", iconColor: "#ffffff" },
              { icon: MessageCircle, text: "Integrado ao WhatsApp", bg: "#25D366", border: "#ffffff", textColor: "#ffffff", iconColor: "#ffffff" },
            ]
          : [
              { icon: QrCode, text: "QR Code para Visitantes", bg: "#ffffff", border: "#003580", textColor: "#003580", iconColor: "#003580" },
              { icon: Navigation, text: "Estou Chegando", bg: "#003580", border: "#ffffff", textColor: "#ffffff", iconColor: "#ffffff" },
              { icon: MessageCircle, text: "Integrado ao WhatsApp", bg: "#25D366", border: "#ffffff", textColor: "#ffffff", iconColor: "#ffffff" },
            ]).map((b) => (
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
      <div className="fade-up" style={{ marginTop: "32px", display: "flex", gap: "32px", flexWrap: "wrap", justifyContent: "center", opacity: 0.6 }}>
        {[
          { icon: Lock, text: "Dados criptografados" },
          { icon: Wifi, text: "100% na nuvem" },
          { icon: Eye, text: "Monitoramento em tempo real" },
          { icon: Bell, text: "Notificações automáticas" },
        ].map((b) => (
          <div key={b.text} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "14px", color: t.text3 }}>
            <b.icon style={{ width: "16px", height: "16px" }} /> {b.text}
          </div>
        ))}
      </div>
    </section>
  );
}

function StartUsingBanner({ mode }: Readonly<{ mode: "dark" | "light" }>) {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };

    globalThis.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => globalThis.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  const handleInstallApp = async () => {
    if (!installPrompt) {
      void dialogAlert("Se o navegador não mostrar a instalação automática, abra o menu do navegador e escolha 'Instalar app' ou 'Adicionar à tela inicial'.");
      return;
    }

    setInstalling(true);
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
    setInstalling(false);
  };

  return (
    <section style={{ background: mode === "dark" ? "#ffffff" : "#003580", padding: "60px 24px", transition: "background 0.4s" }}>
      <div style={{ maxWidth: "1100px", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "40px" }}>
        {/* Left — text */}
        <div style={{ flex: "1 1 300px", minWidth: "260px", textAlign: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px", justifyContent: "center" }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "linear-gradient(135deg, #0062d1 0%, #003d99 50%, #001d4a 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Zap style={{ width: "18px", height: "18px", color: "#fff" }} />
            </div>
            <h3 style={{ fontWeight: 800, fontSize: "clamp(1.2rem, 2.5vw, 1.5rem)", color: mode === "dark" ? "#003580" : "#ffffff" }}>
              Comece a usar agora mesmo
            </h3>
          </div>
          <p style={{ fontSize: "16px", color: mode === "dark" ? "#475569" : "rgba(255,255,255,0.8)", lineHeight: 1.6, maxWidth: "400px", margin: "0 auto" }}>
            Acesse pelo navegador e transforme a gestão de portaria do seu condomínio.
          </p>
        </div>

        {/* Center — Google Play */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", flex: "1 1 200px" }}>
          <div style={{ width: "64px", height: "64px", borderRadius: "16px", background: "linear-gradient(135deg, #22c55e, #16a34a)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 20px rgba(34,197,94,0.3)" }}>
            <svg viewBox="0 0 24 24" fill="white" width="28" height="28"><path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 0 1-.61-.92V2.734a1 1 0 0 1 .609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-1.07l2.834 1.639a1 1 0 0 1 0 1.448l-2.834 1.639-2.532-2.532 2.532-2.194zM5.864 2.658L16.8 8.99l-2.302 2.302-8.635-8.635z"/></svg>
          </div>
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: "12px", fontWeight: 700, letterSpacing: "1.5px", color: mode === "dark" ? "#64748b" : "rgba(255,255,255,0.7)", textTransform: "uppercase", marginBottom: "6px" }}>INSTALAR APP</p>
            <button
              onClick={handleInstallApp}
              disabled={installing}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                minWidth: "170px",
                padding: "12px 20px",
                borderRadius: "12px",
                border: `2px solid ${mode === "dark" ? "#16a34a" : "#ffffff"}`,
                background: mode === "dark" ? "#16a34a" : "rgba(255,255,255,0.12)",
                color: "#ffffff",
                fontSize: "16px",
                fontWeight: 800,
                cursor: installing ? "wait" : "pointer",
                boxShadow: "0 8px 24px rgba(34,197,94,0.24)",
              }}
            >
              <Download style={{ width: "16px", height: "16px" }} />
              {installing ? "Instalando..." : "Instalar app"}
            </button>
          </div>
        </div>

        {/* Right — Browser */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", flex: "1 1 200px" }}>
          <div style={{ width: "64px", height: "64px", borderRadius: "16px", background: "linear-gradient(135deg, #f97316, #ea580c)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 20px rgba(249,115,22,0.3)" }}>
            <svg viewBox="0 0 24 24" fill="white" width="28" height="28"><path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm-1 17.938A8.004 8.004 0 0 1 4.062 13H7.1a14.9 14.9 0 0 0 .9 4.24 10.18 10.18 0 0 0 3 2.698zm0-3.476A8.24 8.24 0 0 1 8.14 13H11v3.462zm0-5.462H8.14A8.24 8.24 0 0 1 11 7.538V11zm0-5.462A10.18 10.18 0 0 0 8 8.24 14.9 14.9 0 0 0 7.1 11H4.062A8.004 8.004 0 0 1 11 4.062zM19.938 11H16.9a14.9 14.9 0 0 0-.9-2.76A10.18 10.18 0 0 0 13 5.538V4.062A8.004 8.004 0 0 1 19.938 11zM13 7.538A8.24 8.24 0 0 1 15.86 11H13V7.538zM13 13h2.86A8.24 8.24 0 0 1 13 16.462V13zm0 6.938v-1.476a10.18 10.18 0 0 0 3-2.698A14.9 14.9 0 0 0 16.9 13h3.038A8.004 8.004 0 0 1 13 19.938z"/></svg>
          </div>
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: "12px", fontWeight: 700, letterSpacing: "1.5px", color: mode === "dark" ? "#64748b" : "rgba(255,255,255,0.7)", textTransform: "uppercase", marginBottom: "6px" }}>ACESSE PELO NAVEGADOR</p>
            <div style={{ border: `2px dashed ${mode === "dark" ? "#003580" : "#ffffff"}`, borderRadius: "10px", padding: "8px 20px" }}>
              <p style={{ fontSize: "16px", fontWeight: 700, color: mode === "dark" ? "#003580" : "#ffffff" }}>www.portariax.com.br</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function DemoSection({ demoLoading, onDemoLogin }: Readonly<{ demoLoading: string | null; onDemoLogin: (role: "sindico" | "portaria" | "morador") => void }>) {
  return (
    <section style={{ background: "linear-gradient(135deg, #0a1628 0%, #0d2847 50%, #0a1628 100%)", padding: "80px 24px" }}>
      <div style={{ maxWidth: "900px", margin: "0 auto", textAlign: "center" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: "12px", background: "rgba(255,255,255,0.08)", border: "1.5px solid rgba(255,255,255,0.2)", borderRadius: "999px", padding: "6px 16px", marginBottom: "16px", fontSize: "14px", color: "#ffffff" }}>
          <Play style={{ width: "14px", height: "14px" }} /> Teste Agora
        </div>
        <h2 style={{ fontSize: "clamp(1.6rem, 3.5vw, 2.4rem)", fontWeight: 800, color: "#ffffff", marginBottom: "12px", lineHeight: 1.2 }}>
          Navegue pelo Sistema
        </h2>
        <p style={{ fontSize: "16px", color: "rgba(255,255,255,0.7)", maxWidth: "560px", margin: "0 auto 48px", lineHeight: 1.7 }}>
          Escolha um perfil e explore o sistema completo com dados fictícios. Sem cadastro, sem compromisso.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "20px" }}>
          {/* Síndico */}
          <button
            disabled={!!demoLoading}
            onClick={() => onDemoLogin("sindico")}
            style={{
              background: "linear-gradient(135deg, #7c3aed, #5b21b6)", border: "2px solid rgba(255,255,255,0.2)",
              borderRadius: "20px", padding: "32px 24px", cursor: demoLoading ? "wait" : "pointer",
              display: "flex", flexDirection: "column", alignItems: "center", gap: "16px",
              transition: "transform 0.2s, box-shadow 0.2s", opacity: demoLoading && demoLoading !== "sindico" ? 0.5 : 1,
            }}
            onMouseEnter={e => { if (!demoLoading) { e.currentTarget.style.transform = "translateY(-6px)"; e.currentTarget.style.boxShadow = "0 16px 40px rgba(124,58,237,0.4)"; } }}
            onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
          >
            <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Building2 style={{ width: "32px", height: "32px", color: "#ffffff" }} />
            </div>
            <span style={{ fontSize: "18px", fontWeight: 800, color: "#ffffff" }}>{demoLoading === "sindico" ? "Carregando..." : "Síndico"}</span>
            <span style={{ fontSize: "14px", color: "rgba(255,255,255,0.7)", lineHeight: 1.5 }}>Gestão completa do condomínio, configurações e relatórios</span>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "4px", color: "#ffffff", fontWeight: 700, fontSize: "14px" }}>
              Explorar <ArrowRight style={{ width: "14px", height: "14px" }} />
            </div>
          </button>

          {/* Portaria */}
          <button
            disabled={!!demoLoading}
            onClick={() => onDemoLogin("portaria")}
            style={{
              background: "linear-gradient(135deg, #2563eb, #1d4ed8)", border: "2px solid rgba(255,255,255,0.2)",
              borderRadius: "20px", padding: "32px 24px", cursor: demoLoading ? "wait" : "pointer",
              display: "flex", flexDirection: "column", alignItems: "center", gap: "16px",
              transition: "transform 0.2s, box-shadow 0.2s", opacity: demoLoading && demoLoading !== "portaria" ? 0.5 : 1,
            }}
            onMouseEnter={e => { if (!demoLoading) { e.currentTarget.style.transform = "translateY(-6px)"; e.currentTarget.style.boxShadow = "0 16px 40px rgba(37,99,235,0.4)"; } }}
            onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
          >
            <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Shield style={{ width: "32px", height: "32px", color: "#ffffff" }} />
            </div>
            <span style={{ fontSize: "18px", fontWeight: 800, color: "#ffffff" }}>{demoLoading === "portaria" ? "Carregando..." : "Portaria"}</span>
            <span style={{ fontSize: "14px", color: "rgba(255,255,255,0.7)", lineHeight: 1.5 }}>Visitantes, veículos, correspondências, rondas e livro de protocolo</span>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "4px", color: "#ffffff", fontWeight: 700, fontSize: "14px" }}>
              Explorar <ArrowRight style={{ width: "14px", height: "14px" }} />
            </div>
          </button>

          {/* Morador */}
          <button
            disabled={!!demoLoading}
            onClick={() => onDemoLogin("morador")}
            style={{
              background: "linear-gradient(135deg, #059669, #047857)", border: "2px solid rgba(255,255,255,0.2)",
              borderRadius: "20px", padding: "32px 24px", cursor: demoLoading ? "wait" : "pointer",
              display: "flex", flexDirection: "column", alignItems: "center", gap: "16px",
              transition: "transform 0.2s, box-shadow 0.2s", opacity: demoLoading && demoLoading !== "morador" ? 0.5 : 1,
            }}
            onMouseEnter={e => { if (!demoLoading) { e.currentTarget.style.transform = "translateY(-6px)"; e.currentTarget.style.boxShadow = "0 16px 40px rgba(5,150,105,0.4)"; } }}
            onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
          >
            <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Users style={{ width: "32px", height: "32px", color: "#ffffff" }} />
            </div>
            <span style={{ fontSize: "18px", fontWeight: 800, color: "#ffffff" }}>{demoLoading === "morador" ? "Carregando..." : "Morador"}</span>
            <span style={{ fontSize: "14px", color: "rgba(255,255,255,0.7)", lineHeight: 1.5 }}>Autorizações, veículos, delivery e correspondências</span>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "4px", color: "#ffffff", fontWeight: 700, fontSize: "14px" }}>
              Explorar <ArrowRight style={{ width: "14px", height: "14px" }} />
            </div>
          </button>
        </div>

        <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.4)", marginTop: "24px" }}>
          * Dados fictícios para demonstração. Nenhuma ação real será executada.
        </p>
      </div>
    </section>
  );
}

function FeaturesSection({ mode, t, onNavigate, onOpenTutorial }: Readonly<{ mode: "dark" | "light"; t: ThemeColors; onNavigate: (path: string) => void; onOpenTutorial: (title: string) => void }>) {
  return (
    <section style={{ background: t.sectionGrad1, transition: "background 0.4s" }}>
      <div className="landing-section">
        <div style={{ textAlign: "center", marginBottom: "60px" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "12px", background: mode === "dark" ? "#003580" : "#ffffff", border: mode === "dark" ? "1.5px solid #ffffff" : "1.5px solid #003580", borderRadius: "999px", padding: "6px 16px", marginBottom: "16px", fontSize: "14px", color: mode === "dark" ? "#ffffff" : "#003580" }}>
            <Zap style={{ width: "14px", height: "14px" }} /> Funcionalidades
          </div>
          <h2 style={{ fontSize: "clamp(1.8rem, 3.5vw, 2.5rem)", fontWeight: 800, marginBottom: "12px", color: t.text2 }}>
            Tudo em Um Só Sistema
          </h2>
          <p style={{ color: t.text3, fontSize: "16px", maxWidth: "560px", margin: "0 auto", lineHeight: 1.7 }}>
            Gestão completa do seu condomínio — controle de acesso, comunicação e segurança integrados em uma única plataforma.
          </p>
          {/* Profile legend */}
          <div style={{ display: "flex", gap: "12px", justifyContent: "center", marginTop: "24px", flexWrap: "wrap" }}>
            {(["portaria", "morador", "sindico"] as ProfileKey[]).map((k) => {
              const pr = PROFILES[k];
              const PrIcon = pr.icon;
              return (
                <button type="button" key={k} onClick={() => onNavigate(pr.link)} style={{ display: "flex", alignItems: "center", gap: "6px", background: pr.bg, padding: "6px 14px", borderRadius: "999px", border: "none", boxShadow: `0 2px 8px ${pr.color}40`, cursor: "pointer", transition: "transform 0.15s" }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.06)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
                >
                  <PrIcon style={{ width: "14px", height: "14px", color: "#ffffff" }} />
                  <span style={{ fontSize: "14px", fontWeight: 700, color: "#ffffff" }}>{pr.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "20px" }}>
          {standardFeatures.map((f) => {
            const Icon = f.icon;
            return (
              <button type="button"
                key={f.title}
                onClick={() => {
                  if (f.title === "Portaria Virtual (IoT)") { onNavigate("/portaria-virtual-tutorial"); }
                  else { onOpenTutorial(f.title); }
                }}
                style={{
                  background: t.card, borderRadius: "16px", padding: "28px",
                  border: mode === "dark" ? "2px solid rgba(255,255,255,0.6)" : `1.5px solid ${t.border}`,
                  transition: "transform 0.2s, border-color 0.2s, box-shadow 0.2s, background 0.4s",
                  position: "relative", cursor: "pointer",
                  display: "flex", flexDirection: "column", textAlign: "left" as const,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-4px)";
                  e.currentTarget.style.borderColor = mode === "dark" ? "rgba(255,255,255,0.9)" : "rgba(0,53,128,0.6)";
                  e.currentTarget.style.boxShadow = "0 12px 32px rgba(0,0,0,0.12)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.borderColor = mode === "dark" ? "rgba(255,255,255,0.6)" : "rgba(0,53,128,0.3)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <div style={{
                  width: "48px", height: "48px", borderRadius: "12px",
                  background: mode === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,53,128,0.1)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  marginBottom: "16px",
                }}>
                  <Icon style={{ width: "24px", height: "24px", color: mode === "dark" ? "#ffffff" : "#003580" }} />
                </div>
                <h3 style={{ fontWeight: 700, fontSize: "16px", marginBottom: "8px", color: t.text2 }}>{f.title}</h3>
                <p style={{ fontSize: "15px", color: t.text3, lineHeight: 1.6, flex: 1 }} dangerouslySetInnerHTML={{ __html: f.desc }} />

                {/* Profile badges */}
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "16px", paddingTop: "14px", borderTop: `1px solid ${mode === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,53,128,0.08)"}` }}>
                  {f.profiles.map((pk) => {
                    const pr = PROFILES[pk];
                    const PrIcon = pr.icon;
                    return (
                      <button type="button" key={pk} onClick={(e) => { e.stopPropagation(); onNavigate(pr.link); }} style={{
                        display: "flex", alignItems: "center", gap: "5px",
                        background: pr.bg,
                        padding: "4px 10px", borderRadius: "999px",
                        border: "none",
                        boxShadow: `0 1px 6px ${pr.color}35`,
                        cursor: "pointer", transition: "transform 0.15s, box-shadow 0.15s",
                      }}
                        onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.08)"; e.currentTarget.style.boxShadow = `0 2px 10px ${pr.color}55`; }}
                        onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = `0 1px 6px ${pr.color}35`; }}
                      >
                        <PrIcon style={{ width: "12px", height: "12px", color: "#ffffff" }} />
                        <span style={{ fontSize: "12px", fontWeight: 700, color: "#ffffff" }}>{pr.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* CTA */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (f.title === "Portaria Virtual (IoT)") { onNavigate("/portaria-virtual-tutorial"); }
                    else { onOpenTutorial(f.title); }
                  }}
                  style={{
                    marginTop: "14px", padding: "10px 20px", borderRadius: "10px",
                    border: mode === "dark" ? "2px solid #ffffff" : "2px solid #003580",
                    background: "transparent",
                    color: mode === "dark" ? "#ffffff" : "#003580",
                    fontWeight: 700, fontSize: "14px", cursor: "pointer",
                    display: "flex", alignItems: "center", gap: "6px",
                    transition: "background 0.2s", alignSelf: "flex-start",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = mode === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,53,128,0.08)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                  Saiba mais <ChevronRight style={{ width: "14px", height: "14px" }} />
                </button>
              </button>
            );
          })}
        </div>

      </div>
    </section>
  );
}

function PremiumFeaturesSection({ mode, t, onNavigate, onOpenTutorial }: Readonly<{ mode: "dark" | "light"; t: ThemeColors; onNavigate: (path: string) => void; onOpenTutorial: (title: string) => void }>) {
  return (
    <section style={{ background: t.sectionGrad2, transition: "background 0.4s" }}>
      <div className="landing-section">
        <div style={{ textAlign: "center", marginBottom: "60px" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "12px", background: "linear-gradient(135deg, #7c3aed, #6d28d9)", border: "1.5px solid rgba(124,58,237,0.4)", borderRadius: "999px", padding: "6px 16px", marginBottom: "16px", fontSize: "14px", fontWeight: 700, color: "#ffffff" }}>
            <Star style={{ width: "14px", height: "14px" }} /> Premium
          </div>
          <h2 style={{ fontSize: "clamp(1.8rem, 3.5vw, 2.5rem)", fontWeight: 800, marginBottom: "12px", color: t.text2 }}>
            Funções Premium
          </h2>
          <p style={{ color: t.text3, fontSize: "16px", maxWidth: "560px", margin: "0 auto", lineHeight: 1.7 }}>
            Módulos avançados para condomínios que buscam o máximo em tecnologia e automação.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "20px" }}>
          {premiumFeatures.map((f) => {
            const Icon = f.icon;
            return (
              <button type="button"
                key={f.title}
                onClick={() => {
                  if (f.title === "Portaria Virtual (IoT)") { onNavigate("/portaria-virtual-tutorial"); }
                  else { onOpenTutorial(f.title); }
                }}
                style={{
                  background: t.card, borderRadius: "16px", padding: "28px",
                  border: mode === "dark" ? "2px solid rgba(124,58,237,0.5)" : "2px solid rgba(124,58,237,0.3)",
                  transition: "transform 0.2s, border-color 0.2s, box-shadow 0.2s, background 0.4s",
                  position: "relative", cursor: "pointer",
                  display: "flex", flexDirection: "column", textAlign: "left" as const,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-4px)";
                  e.currentTarget.style.borderColor = "rgba(124,58,237,0.7)";
                  e.currentTarget.style.boxShadow = "0 12px 32px rgba(124,58,237,0.15)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.borderColor = mode === "dark" ? "rgba(124,58,237,0.5)" : "rgba(124,58,237,0.3)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <div style={{
                  width: "48px", height: "48px", borderRadius: "12px",
                  background: mode === "dark" ? "rgba(124,58,237,0.15)" : "rgba(124,58,237,0.1)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  marginBottom: "16px",
                }}>
                  <Icon style={{ width: "24px", height: "24px", color: "#7c3aed" }} />
                </div>
                <h3 style={{ fontWeight: 700, fontSize: "16px", marginBottom: "8px", color: t.text2 }}>{f.title}</h3>
                <p style={{ fontSize: "15px", color: t.text3, lineHeight: 1.6, flex: 1 }} dangerouslySetInnerHTML={{ __html: f.desc }} />

                {/* Profile badges */}
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "16px", paddingTop: "14px", borderTop: `1px solid ${mode === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,53,128,0.08)"}` }}>
                  {f.profiles.map((pk) => {
                    const pr = PROFILES[pk];
                    const PrIcon = pr.icon;
                    return (
                      <button type="button" key={pk} onClick={(e) => { e.stopPropagation(); onNavigate(pr.link); }} style={{
                        display: "flex", alignItems: "center", gap: "5px",
                        background: pr.bg,
                        padding: "4px 10px", borderRadius: "999px",
                        border: "none",
                        boxShadow: `0 1px 6px ${pr.color}35`,
                        cursor: "pointer", transition: "transform 0.15s, box-shadow 0.15s",
                      }}
                        onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.08)"; e.currentTarget.style.boxShadow = `0 2px 10px ${pr.color}55`; }}
                        onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = `0 1px 6px ${pr.color}35`; }}
                      >
                        <PrIcon style={{ width: "12px", height: "12px", color: "#ffffff" }} />
                        <span style={{ fontSize: "12px", fontWeight: 700, color: "#ffffff" }}>{pr.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* CTA */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (f.title === "Portaria Virtual (IoT)") { onNavigate("/portaria-virtual-tutorial"); }
                    else { onOpenTutorial(f.title); }
                  }}
                  style={{
                    marginTop: "14px", padding: "10px 20px", borderRadius: "10px",
                    border: "2px solid #7c3aed",
                    background: "transparent",
                    color: "#7c3aed",
                    fontWeight: 700, fontSize: "14px", cursor: "pointer",
                    display: "flex", alignItems: "center", gap: "6px",
                    transition: "background 0.2s", alignSelf: "flex-start",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(124,58,237,0.08)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                  Saiba mais <ChevronRight style={{ width: "14px", height: "14px" }} />
                </button>
              </button>
            );
          })}
        </div>

      </div>
    </section>
  );
}

function PresentationSection({ mode, onNavigate }: Readonly<{ mode: "dark" | "light"; onNavigate: (path: string) => void }>) {
  return (
    <section style={{ background: mode === "dark" ? "#ffffff" : "#003580", padding: "80px 24px", transition: "background 0.4s" }}>
      <div style={{ maxWidth: "900px", margin: "0 auto", textAlign: "center" }}>
        {/* Badge */}
        <div style={{ display: "inline-flex", alignItems: "center", gap: "12px", background: mode === "dark" ? "#003580" : "rgba(255,255,255,0.1)", border: "1.5px solid #ffffff", borderRadius: "999px", padding: "8px 20px", marginBottom: "24px", fontSize: "15px", fontWeight: 600, color: "#ffffff" }}>
          <Zap style={{ width: "16px", height: "16px" }} /> Apresentação Completa
        </div>

        <h2 style={{ fontSize: "clamp(1.8rem, 4vw, 2.8rem)", fontWeight: 900, color: mode === "dark" ? "#003580" : "#ffffff", marginBottom: "16px", lineHeight: 1.2 }}>
          Conheça o <span style={{ color: mode === "dark" ? "#003580" : "#ffffff" }}>Portaria X</span>
        </h2>
        <p style={{ fontSize: "16px", color: mode === "dark" ? "#475569" : "rgba(255,255,255,0.8)", maxWidth: "550px", margin: "0 auto 48px", lineHeight: 1.7 }}>
          Baixe nossa apresentação completa ou compartilhe o link com sua equipe e parceiros.
        </p>

        {/* 3 Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "20px" }}>
          {/* Card 1 — Baixar Apresentação */}
          <button type="button" style={{
            background: mode === "dark" ? "#003580" : "#ffffff",
            border: mode === "dark" ? "2px solid rgba(255,255,255,0.3)" : "2px solid rgba(0,53,128,0.3)", borderRadius: "16px",
            padding: "36px 24px", display: "flex", flexDirection: "column", alignItems: "center", gap: "16px",
            transition: "transform 0.2s, border-color 0.2s, box-shadow 0.2s",
            cursor: "pointer", boxShadow: mode === "dark" ? "0 2px 12px rgba(0,0,0,0.15)" : "0 2px 12px rgba(0,0,0,0.08)",
          }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.borderColor = mode === "dark" ? "rgba(255,255,255,0.6)" : "rgba(0,53,128,0.6)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.borderColor = mode === "dark" ? "rgba(255,255,255,0.3)" : "rgba(0,53,128,0.3)"; }}
            onClick={() => globalThis.open("/apresentacao", "_blank")}
          >
            <div style={{ width: "56px", height: "56px", borderRadius: "14px", background: "linear-gradient(135deg, #f97316, #ea580c)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 20px rgba(249,115,22,0.3)" }}>
              <FileText style={{ width: "26px", height: "26px", color: "#fff" }} />
            </div>
            <h3 style={{ fontWeight: 800, fontSize: "17px", color: mode === "dark" ? "#ffffff" : "#003580" }}>Baixar Apresentação</h3>
            <p style={{ fontSize: "14px", color: mode === "dark" ? "rgba(255,255,255,0.7)" : "#336699", lineHeight: 1.6 }}>
              Abra a apresentação completa e salve como PDF para enviar por e-mail.
            </p>
            <span style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "15px", fontWeight: 600, color: "#f97316", marginTop: "auto" }}>
              <FileText style={{ width: "14px", height: "14px" }} /> Abrir e exportar PDF <ArrowRight style={{ width: "14px", height: "14px" }} />
            </span>
          </button>

          {/* Card 2 — Copiar Link */}
          <button type="button" style={{
            background: mode === "dark" ? "#003580" : "#ffffff",
            border: mode === "dark" ? "2px solid rgba(255,255,255,0.3)" : "2px solid rgba(0,53,128,0.3)", borderRadius: "16px",
            padding: "36px 24px", display: "flex", flexDirection: "column", alignItems: "center", gap: "16px",
            transition: "transform 0.2s, border-color 0.2s, box-shadow 0.2s",
            cursor: "pointer", boxShadow: mode === "dark" ? "0 2px 12px rgba(0,0,0,0.15)" : "0 2px 12px rgba(0,0,0,0.08)",
          }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.borderColor = mode === "dark" ? "rgba(255,255,255,0.6)" : "rgba(0,53,128,0.6)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.borderColor = mode === "dark" ? "rgba(255,255,255,0.3)" : "rgba(0,53,128,0.3)"; }}
            onClick={() => { navigator.clipboard.writeText(globalThis.window.location.origin + "/apresentacao"); }}
          >
            <div style={{ width: "56px", height: "56px", borderRadius: "14px", background: "linear-gradient(135deg, #6366f1, #4f46e5)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 20px rgba(99,102,241,0.3)" }}>
              <QrCode style={{ width: "26px", height: "26px", color: "#fff" }} />
            </div>
            <h3 style={{ fontWeight: 800, fontSize: "17px", color: mode === "dark" ? "#ffffff" : "#003580" }}>Copiar Link</h3>
            <p style={{ fontSize: "14px", color: mode === "dark" ? "rgba(255,255,255,0.7)" : "#336699", lineHeight: 1.6 }}>
              Copie o link da apresentação e envie para quem desejar.
            </p>
            <span style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "15px", fontWeight: 600, color: "#818cf8", marginTop: "auto" }}>
              <ChevronRight style={{ width: "14px", height: "14px" }} /> Copiar para área de transferência <ArrowRight style={{ width: "14px", height: "14px" }} />
            </span>
          </button>

          {/* Card 3 — Enviar via WhatsApp */}
          <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer" style={{
              textDecoration: "none",
              background: mode === "dark" ? "#003580" : "#ffffff",
              border: mode === "dark" ? "2px solid rgba(255,255,255,0.3)" : "2px solid rgba(0,53,128,0.3)", borderRadius: "16px",
              padding: "36px 24px", display: "flex", flexDirection: "column", alignItems: "center", gap: "16px",
              transition: "transform 0.2s, border-color 0.2s, box-shadow 0.2s",
              cursor: "pointer", height: "100%", boxShadow: mode === "dark" ? "0 2px 12px rgba(0,0,0,0.15)" : "0 2px 12px rgba(0,0,0,0.08)",
            }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.borderColor = mode === "dark" ? "rgba(255,255,255,0.6)" : "rgba(0,53,128,0.6)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.borderColor = mode === "dark" ? "rgba(255,255,255,0.3)" : "rgba(0,53,128,0.3)"; }}
            >
              <div style={{ width: "56px", height: "56px", borderRadius: "14px", background: "linear-gradient(135deg, #25D366, #128C7E)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 20px rgba(37,211,102,0.3)" }}>
                <MessageCircle style={{ width: "26px", height: "26px", color: "#fff" }} />
              </div>
              <h3 style={{ fontWeight: 800, fontSize: "17px", color: mode === "dark" ? "#ffffff" : "#003580" }}>Enviar via WhatsApp</h3>
              <p style={{ fontSize: "14px", color: mode === "dark" ? "rgba(255,255,255,0.7)" : "#336699", lineHeight: 1.6 }}>
                Compartilhe a apresentação diretamente pelo WhatsApp.
              </p>
              <span style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "15px", fontWeight: 600, color: "#25D366", marginTop: "auto" }}>
                <ArrowRight style={{ width: "14px", height: "14px" }} /> Compartilhar agora <ArrowRight style={{ width: "14px", height: "14px" }} />
              </span>
          </a>

        </div>

        {/* Card 4 — Modelo de Contrato (centralizado) */}
        <div style={{ display: "flex", justifyContent: "center", marginTop: "20px" }}>
          <button type="button" style={{
            background: mode === "dark" ? "#003580" : "#ffffff",
            border: mode === "dark" ? "2px solid rgba(255,255,255,0.3)" : "2px solid rgba(0,53,128,0.3)", borderRadius: "16px",
            padding: "36px 24px", display: "flex", flexDirection: "column", alignItems: "center", gap: "16px",
            transition: "transform 0.2s, border-color 0.2s, box-shadow 0.2s",
            cursor: "pointer", boxShadow: mode === "dark" ? "0 2px 12px rgba(0,0,0,0.15)" : "0 2px 12px rgba(0,0,0,0.08)",
            width: "100%", maxWidth: "320px",
          }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.borderColor = mode === "dark" ? "rgba(255,255,255,0.6)" : "rgba(0,53,128,0.6)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.borderColor = mode === "dark" ? "rgba(255,255,255,0.3)" : "rgba(0,53,128,0.3)"; }}
            onClick={() => onNavigate("/contrato")}
          >
            <div style={{ width: "56px", height: "56px", borderRadius: "14px", background: "linear-gradient(135deg, #0ea5e9, #0284c7)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 20px rgba(14,165,233,0.3)" }}>
              <BookOpen style={{ width: "26px", height: "26px", color: "#fff" }} />
            </div>
            <h3 style={{ fontWeight: 800, fontSize: "17px", color: mode === "dark" ? "#ffffff" : "#003580" }}>Modelo de Contrato</h3>
            <p style={{ fontSize: "14px", color: mode === "dark" ? "rgba(255,255,255,0.7)" : "#336699", lineHeight: 1.6 }}>
              Veja o modelo de contrato de prestação de serviços do Portaria X.
            </p>
            <span style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "15px", fontWeight: 600, color: "#0ea5e9", marginTop: "auto" }}>
              <BookOpen style={{ width: "14px", height: "14px" }} /> Ver contrato <ArrowRight style={{ width: "14px", height: "14px" }} />
            </span>
          </button>
        </div>
      </div>
    </section>
  );
}

function IntegrationsSection({ mode, t, onNavigate }: Readonly<{ mode: "dark" | "light"; t: ThemeColors; onNavigate: (path: string) => void }>) {
  return (
    <section id="integracoes" style={{ background: t.sectionGrad1, transition: "background 0.4s" }}>
      <div className="landing-section">
        <div style={{ textAlign: "center", marginBottom: "60px" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "12px", background: mode === "dark" ? "#003580" : "#ffffff", border: mode === "dark" ? "1.5px solid #ffffff" : "1.5px solid #003580", borderRadius: "999px", padding: "6px 16px", marginBottom: "16px", fontSize: "14px", color: mode === "dark" ? "#ffffff" : "#003580" }}>
            <Cpu style={{ width: "14px", height: "14px" }} /> Integrações IoT
          </div>
          <h2 style={{ fontSize: "clamp(1.8rem, 3.5vw, 2.5rem)", fontWeight: 800, marginBottom: "12px", color: t.text2 }}>
            Biblioteca de Integrações
          </h2>
          <p style={{ color: t.text3, fontSize: "16px", maxWidth: "600px", margin: "0 auto" }}>
            Conecte portões, fechaduras e acessos com dispositivos de diversas marcas. Veja o que cada plataforma oferece e o nível de dificuldade da integração.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "20px" }}>
          {BRANDS.map((brand) => {
            let diffColor: string;
            let diffLabel: string;
            if (brand.difficulty <= 3) { diffColor = "#10b981"; diffLabel = "Fácil"; }
            else if (brand.difficulty <= 5) { diffColor = "#f59e0b"; diffLabel = "Moderado"; }
            else if (brand.difficulty <= 7) { diffColor = "#f97316"; diffLabel = "Avançado"; }
            else { diffColor = "#ef4444"; diffLabel = "Expert"; }
            let integIcon: typeof Globe;
            if (brand.integrationType === "cloud") { integIcon = Globe; }
            else if (brand.integrationType === "local") { integIcon = Wifi; }
            else { integIcon = Signal; }
            const IntegIcon = integIcon;
            return (
              <button
                type="button"
                key={brand.id}
                onClick={() => onNavigate("/login")}
                style={{
                  background: t.card3, borderRadius: "16px", padding: "28px",
                  border: mode === "dark" ? "2px solid rgba(255,255,255,0.15)" : "2px solid rgba(0,53,128,0.15)",
                  transition: "transform 0.2s, border-color 0.3s, box-shadow 0.3s",
                  cursor: "pointer", position: "relative", overflow: "hidden",
                  textAlign: "left", fontFamily: "inherit",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-6px)";
                  e.currentTarget.style.borderColor = mode === "dark" ? "rgba(255,255,255,0.5)" : "rgba(0,53,128,0.5)";
                  e.currentTarget.style.boxShadow = "0 12px 32px rgba(0,0,0,0.12)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.borderColor = mode === "dark" ? "rgba(255,255,255,0.15)" : "rgba(0,53,128,0.15)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                {/* Header: brand name + country flag */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{
                      width: "42px", height: "42px", borderRadius: "12px",
                      background: mode === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,53,128,0.08)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <Cpu style={{ width: "20px", height: "20px", color: mode === "dark" ? "#ffffff" : "#003580" }} />
                    </div>
                    <div>
                      <h3 style={{ fontWeight: 700, fontSize: "16px", color: t.text2, margin: 0 }}>{brand.name}</h3>
                      <span style={{ fontSize: "12px", color: t.text3 }}>{brand.country}</span>
                    </div>
                  </div>
                  {/* Integration type badge */}
                  <div style={{
                    display: "flex", alignItems: "center", gap: "4px",
                    background: mode === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,53,128,0.06)",
                    padding: "4px 10px", borderRadius: "999px", fontSize: "12px",
                    color: t.text3, fontWeight: 600,
                  }}>
                    <IntegIcon style={{ width: "12px", height: "12px" }} />
                    {INTEGRATION_LABELS[brand.integrationType].split(" ")[0]}
                  </div>
                </div>

                {/* Description */}
                <p style={{ fontSize: "14px", color: t.text3, lineHeight: 1.6, marginBottom: "18px", minHeight: "60px" }}>
                  {brand.description}
                </p>

                {/* Difficulty gauge */}
                <div style={{ marginBottom: "14px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                    <span style={{ fontSize: "13px", fontWeight: 600, color: t.text3, display: "flex", alignItems: "center", gap: "4px" }}>
                      <Wrench style={{ width: "12px", height: "12px" }} /> Dificuldade
                    </span>
                    <span style={{ fontSize: "13px", fontWeight: 700, color: diffColor }}>
                      {brand.difficulty}/10 — {diffLabel}
                    </span>
                  </div>
                  <div style={{
                    width: "100%", height: "6px", borderRadius: "999px",
                    background: mode === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,53,128,0.1)",
                    overflow: "hidden",
                  }}>
                    <div style={{
                      width: `${brand.difficulty * 10}%`, height: "100%",
                      borderRadius: "999px", background: diffColor,
                      transition: "width 0.6s ease",
                    }} />
                  </div>
                </div>

                {/* Footer CTA */}
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  paddingTop: "14px", borderTop: `1px solid ${mode === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,53,128,0.08)"}`,
                }}>
                  <span style={{ fontSize: "13px", fontWeight: 600, color: mode === "dark" ? "#60a5fa" : "#003580", display: "flex", alignItems: "center", gap: "4px" }}>
                    Ver dispositivos <ArrowRight style={{ width: "13px", height: "13px" }} />
                  </span>
                  <span style={{
                    fontSize: "12px", fontWeight: 600, color: diffColor,
                    background: `${diffColor}18`, padding: "3px 8px", borderRadius: "6px",
                  }}>
                    {brand.protocols.length > 1 ? `${brand.protocols.length} protocolos` : INTEGRATION_LABELS[brand.integrationType]}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <div style={{ textAlign: "center", marginTop: "48px" }}>
          <button
            onClick={() => onNavigate("/login")}
            style={{
              padding: "14px 32px", borderRadius: "12px",
              border: mode === "dark" ? "2px solid rgba(255,255,255,0.5)" : "2px solid #003580",
              background: mode === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,53,128,0.06)",
              color: mode === "dark" ? "#ffffff" : "#003580",
              fontWeight: 700, fontSize: "16px", cursor: "pointer",
              display: "inline-flex", alignItems: "center", gap: "12px",
              transition: "background 0.2s, transform 0.2s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.03)"; e.currentTarget.style.background = mode === "dark" ? "rgba(255,255,255,0.14)" : "rgba(0,53,128,0.12)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.background = mode === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,53,128,0.06)"; }}
          >
            <Cpu style={{ width: "18px", height: "18px" }} />
            Acessar Biblioteca Completa
            <ChevronRight style={{ width: "16px", height: "16px" }} />
          </button>
        </div>
      </div>
    </section>
  );
}

function PlansSection({ mode, t, onNavigate }: Readonly<{ mode: "dark" | "light"; t: ThemeColors; onNavigate: (path: string) => void }>) {
  return (
    <section id="precos" style={{ background: t.bg1, transition: "background 0.4s" }}>
      <div className="landing-section">
        <div style={{ textAlign: "center", marginBottom: "60px" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "12px", background: mode === "dark" ? "#003580" : "#ffffff", border: mode === "dark" ? "1.5px solid #ffffff" : "1.5px solid #003580", borderRadius: "999px", padding: "6px 16px", marginBottom: "16px", fontSize: "14px", color: mode === "dark" ? "#ffffff" : "#003580" }}>
            <Star style={{ width: "14px", height: "14px" }} /> Preços
          </div>
          <h2 style={{ fontSize: "clamp(1.8rem, 3.5vw, 2.5rem)", fontWeight: 800, marginBottom: "12px", color: t.text2 }}>
            Planos Simples e Transparentes
          </h2>
          <p style={{ color: t.text3, fontSize: "16px", maxWidth: "500px", margin: "0 auto" }}>
            Teste grátis por 7 dias. Sem taxa de implantação. Sem fidelidade. Cancele quando quiser.
          </p>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "24px", maxWidth: "1000px", margin: "0 auto" }}>
          {plans.map((plan) => (
            <PlanCard key={`${plan.name}-${plan.price}`} plan={plan} onNavigate={() => onNavigate("/register/condominio")} />
          ))}
        </div>
      </div>
    </section>
  );
}

function CustomDevCtaSection() {
  return (
    <section style={{
      background: "var(--color-card, #fff)",
      padding: "80px 24px", textAlign: "center",
    }}>
      <div style={{ maxWidth: "700px", margin: "0 auto" }}>
        <h2 style={{ fontSize: "clamp(1.5rem, 3vw, 2rem)", fontWeight: 800, color: "#003580", marginBottom: "16px", lineHeight: 1.3 }}>
          PRECISA DE UMA FUNÇÃO OU PARÂMETRO ESPECÍFICO?
        </h2>
        <p style={{ fontSize: "clamp(1.1rem, 2vw, 1.4rem)", color: "#003580", fontWeight: 700, marginBottom: "32px" }}>
          🚀 DESENVOLVEMOS PARA VOCÊ SEM NENHUM CUSTO ADICIONAL!
        </p>
        <div style={{ display: "flex", justifyContent: "center", marginTop: "8px" }}>
          <div style={{
            width: "80px", height: "80px", borderRadius: "50%",
            background: "transparent", border: "3px solid #003580",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Code2 style={{ width: "40px", height: "40px", color: "#003580" }} />
          </div>
        </div>
      </div>
    </section>
  );
}

function FaqSection({ openFaq, onToggleFaq }: Readonly<{ openFaq: number | null; onToggleFaq: (index: number) => void }>) {
  return (
    <section style={{ background: "linear-gradient(135deg, #0062d1 0%, #003d99 50%, #001d4a 100%)", transition: "background 0.4s" }}>
      <div className="landing-section" style={{ maxWidth: "800px" }}>
        <div style={{ textAlign: "center", marginBottom: "48px" }}>
          <h2 style={{ fontSize: "clamp(1.5rem, 3vw, 2rem)", fontWeight: 800, marginBottom: "8px", color: "#ffffff" }}>
            Perguntas Frequentes
          </h2>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {FAQS.map((faq, i) => (
            <div key={faq.q} style={{
              borderRadius: "12px",
              border: "2px solid #ffffff", overflow: "hidden",
              transition: "background 0.4s",
            }}>
              <button
                onClick={() => onToggleFaq(i)}
                style={{
                  width: "100%", padding: "18px 20px", border: "none", background: "linear-gradient(135deg, #0062d1 0%, #003d99 50%, #001d4a 100%)",
                  color: "#ffffff", fontWeight: 600, fontSize: "16px", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  textAlign: "left", borderRadius: openFaq === i ? "12px 12px 0 0" : "12px",
                }}
              >
                {faq.q}
                <ChevronRight style={{
                  width: "18px", height: "18px", color: "rgba(255,255,255,0.6)",
                  transition: "transform 0.2s",
                  transform: openFaq === i ? "rotate(90deg)" : "rotate(0)",
                }} />
              </button>
              {openFaq === i && (
                <div style={{ padding: "16px 20px 18px", fontSize: "15px", color: "#003580", lineHeight: 1.6, background: "var(--color-card, #fff)" }}>
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function AppsSection() {
  return (
    <section style={{ background: "var(--color-card, #fff)", transition: "background 0.4s" }}>
      <div className="landing-section" style={{ maxWidth: "900px", textAlign: "center" }}>
        <h2 style={{ fontSize: "clamp(1.5rem, 3vw, 2rem)", fontWeight: 800, marginBottom: "12px", color: "#003580" }}>
          Nossos Aplicativos
        </h2>
        <p style={{ fontSize: "clamp(0.95rem, 1.5vw, 1.1rem)", color: "#336699", marginBottom: "48px" }}>
          Conheça as soluções completas do nosso ecossistema
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "32px" }}>
          {/* Portaria X */}
          <a href="https://www.portariax.com.br" target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", width: "160px", transition: "transform 0.2s" }}
              onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.08)")}
              onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
          >
            <div style={{ width: "90px", height: "90px", borderRadius: "20px", overflow: "hidden", boxShadow: "0 4px 16px rgba(0,53,128,0.15)", background: "var(--color-card, #fff)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <img src="/logo-portariax.png" alt="Portaria X" style={{ width: "80px", height: "80px", objectFit: "contain" }} />
            </div>
            <span style={{ fontWeight: 700, fontSize: "15px", color: "#003580" }}>Portaria X</span>
            <span style={{ fontSize: "13px", color: "#336699" }}>portariax.com.br</span>
          </a>
          {/* Gestão e Limpeza */}
          <a href="https://www.gestaoelimpeza.com.br" target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", width: "160px", transition: "transform 0.2s" }}
              onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.08)")}
              onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
          >
            <div style={{ width: "90px", height: "90px", borderRadius: "20px", overflow: "hidden", boxShadow: "0 4px 16px rgba(0,53,128,0.15)", background: "var(--color-card, #fff)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <img src="/logo-gestaoelimpeza.png" alt="Gestão e Limpeza" style={{ width: "80px", height: "80px", objectFit: "contain" }} />
            </div>
            <span style={{ fontWeight: 700, fontSize: "15px", color: "#003580" }}>Gestão e Limpeza</span>
            <span style={{ fontSize: "13px", color: "#336699" }}>gestaoelimpeza.com.br</span>
          </a>
          {/* App Correspondência */}
          <a href="https://www.appcorrespondencia.com.br" target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", width: "160px", transition: "transform 0.2s" }}
              onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.08)")}
              onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
          >
            <div style={{ width: "90px", height: "90px", borderRadius: "20px", overflow: "hidden", boxShadow: "0 4px 16px rgba(0,53,128,0.15)", background: "var(--color-card, #fff)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <img src="/logo-appcorrespondencia.png" alt="App Correspondência" style={{ width: "80px", height: "80px", objectFit: "contain" }} />
            </div>
            <span style={{ fontWeight: 700, fontSize: "15px", color: "#003580" }}>App Correspondência</span>
            <span style={{ fontSize: "13px", color: "#336699" }}>appcorrespondencia.com.br</span>
          </a>
          {/* Manutenção X */}
          <a href="https://www.manutencaox.com.br" target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", width: "160px", transition: "transform 0.2s" }}
              onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.08)")}
              onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
          >
            <div style={{ width: "90px", height: "90px", borderRadius: "20px", overflow: "hidden", boxShadow: "0 4px 16px rgba(0,53,128,0.15)", background: "var(--color-card, #fff)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <img src="/logo-manutencaox.png" alt="Manutenção X" style={{ width: "80px", height: "80px", objectFit: "contain" }} />
            </div>
            <span style={{ fontWeight: 700, fontSize: "15px", color: "#003580" }}>Manutenção X</span>
            <span style={{ fontSize: "13px", color: "#336699" }}>manutencaox.com.br</span>
          </a>
        </div>

      </div>
    </section>
  );
}

function FooterSection({ onNavigate }: Readonly<{ onNavigate: (path: string) => void }>) {
  return (
    <footer style={{ background: "var(--color-card, #fff)", borderTop: "1px solid rgba(0,53,128,0.15)", padding: "48px 24px", transition: "background 0.4s" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto", display: "flex", flexWrap: "wrap", gap: "32px", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <p style={{ fontWeight: 800, fontSize: "18px", color: "#003580", marginBottom: "4px" }}>
            Portaria X
          </p>
          <p style={{ fontSize: "14px", color: "#336699" }}>
            © 2026 — www.portariax.com.br
          </p>
        </div>
        <div style={{ display: "flex", gap: "24px", alignItems: "center" }}>
          <button
            onClick={() => onNavigate("/login")}
            style={{
              padding: "10px 20px", borderRadius: "10px",
              border: "1px solid #003580", background: "transparent",
              color: "#003580", fontWeight: 600, fontSize: "15px", cursor: "pointer",
            }}
          >
            Entrar
          </button>
        </div>
      </div>
    </footer>
  );
}

/* ═══════════════════════════════════════════════
   MAIN LANDING PAGE — thin wrapper
   ═══════════════════════════════════════════════ */

export default function LandingPage() {
  const navigate = useNavigate();
  const { loginDemo } = useAuth();
  const [demoLoading, setDemoLoading] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [activeTutorial, setActiveTutorial] = useState<string | null>(null);
  const [mode, setMode] = useState<"dark" | "light">(() => {
    try { return (localStorage.getItem("landing_theme") as "dark" | "light") || "dark"; } catch { return "dark"; }
  });
  const t = themes[mode];

  useEffect(() => {
    try { localStorage.setItem("landing_theme", mode); } catch {}
  }, [mode]);

  async function handleDemoLogin(role: "sindico" | "portaria" | "morador") {
    setDemoLoading(role);
    try { await loginDemo(role); navigate("/dashboard"); } catch { setDemoLoading(null); }
  }

  return (
    <div style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif", color: t.text1, background: t.bg1, transition: "background 0.4s, color 0.4s" }}>
      <ThemeToggle mode={mode} onToggle={() => setMode(mode === "dark" ? "light" : "dark")} />
      <WhatsAppFloat />
      <CssAnimations />
      <HeroSection mode={mode} t={t} onNavigate={navigate} />
      <StartUsingBanner mode={mode} />
      <DemoSection demoLoading={demoLoading} onDemoLogin={handleDemoLogin} />
      <FeaturesSection mode={mode} t={t} onNavigate={navigate} onOpenTutorial={setActiveTutorial} />
      {SHOW_PREMIUM_LANDING && <PremiumFeaturesSection mode={mode} t={t} onNavigate={navigate} onOpenTutorial={setActiveTutorial} />}
      <PresentationSection mode={mode} onNavigate={navigate} />
      {SHOW_PREMIUM_LANDING && <IntegrationsSection mode={mode} t={t} onNavigate={navigate} />}
      <PlansSection mode={mode} t={t} onNavigate={navigate} />
      <CustomDevCtaSection />
      <FaqSection openFaq={openFaq} onToggleFaq={(i) => setOpenFaq(openFaq === i ? null : i)} />
      <AppsSection />
      <FooterSection onNavigate={navigate} />
      {activeTutorial && (
        <LandingTutorialModal
          featureTitle={activeTutorial}
          onClose={() => setActiveTutorial(null)}
        />
      )}
    </div>
  );
}
