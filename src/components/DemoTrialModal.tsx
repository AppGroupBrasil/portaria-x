import { X, Rocket, Users, Building2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function DemoTrialModal({ open, onClose }: Props) {
  const navigate = useNavigate();

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 99999,
        background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "24px",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "var(--color-card, #fff)", borderRadius: "20px", padding: "40px 32px",
          maxWidth: "440px", width: "100%", textAlign: "center",
          boxShadow: "0 24px 64px rgba(0,0,0,0.25)",
          position: "relative",
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute", top: "16px", right: "16px",
            background: "none", border: "none", cursor: "pointer",
            color: "#94a3b8", padding: "4px",
          }}
        >
          <X style={{ width: "20px", height: "20px" }} />
        </button>

        <div style={{
          width: "72px", height: "72px", borderRadius: "50%",
          background: "linear-gradient(135deg, #003580, #0062d1)",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 20px",
        }}>
          <Rocket style={{ width: "36px", height: "36px", color: "#ffffff" }} />
        </div>

        <h2 style={{ fontSize: "22px", fontWeight: 800, color: "#003580", marginBottom: "8px" }}>
          Gostou do que viu?
        </h2>
        <p style={{ fontSize: "16px", color: "var(--muted-foreground)", lineHeight: 1.6, marginBottom: "28px" }}>
          Cadastre-se agora e <strong style={{ color: "#003580" }}>teste integralmente por 7 dias grátis</strong>. 
          Sem cartão de crédito, sem compromisso.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <button
            onClick={() => { onClose(); navigate("/register/condominio"); }}
            style={{
              width: "100%", padding: "14px", borderRadius: "12px",
              background: "linear-gradient(135deg, #003580, #0062d1)",
              color: "#ffffff", fontWeight: 700, fontSize: "16px",
              border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
            }}
          >
            <Building2 style={{ width: "18px", height: "18px" }} />
            Cadastrar Condomínio — 7 Dias Grátis
          </button>

          <button
            onClick={() => { onClose(); navigate("/register/morador/search"); }}
            style={{
              width: "100%", padding: "14px", borderRadius: "12px",
              background: "transparent",
              color: "#003580", fontWeight: 700, fontSize: "16px",
              border: "2px solid #003580", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
            }}
          >
            <Users style={{ width: "18px", height: "18px" }} />
            Sou Morador — Quero Entrar
          </button>
        </div>

        <p style={{ fontSize: "13px", color: "#94a3b8", marginTop: "16px" }}>
          Você está no modo demonstração. Cadastre-se para ter acesso completo.
        </p>
      </div>
    </div>
  );
}
