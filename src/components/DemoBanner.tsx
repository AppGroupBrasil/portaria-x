import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Eye, LogOut, Rocket } from "lucide-react";

export default function DemoBanner() {
  const { isDemo, logout } = useAuth();
  const navigate = useNavigate();

  if (!isDemo) return null;

  return (
    <div style={{
      background: "linear-gradient(90deg, #003580, #0062d1)",
      padding: "10px 20px",
      display: "flex", alignItems: "center", justifyContent: "center", gap: "12px",
      flexWrap: "wrap", position: "sticky", top: 0, zIndex: 9999,
    }}>
      <Eye style={{ width: "16px", height: "16px", color: "#ffffff" }} />
      <span style={{ fontSize: "14px", fontWeight: 600, color: "#ffffff" }}>
        Modo Demonstração — Explorando com dados fictícios
      </span>
      <button
        onClick={() => { navigate("/register/condominio"); }}
        style={{
          background: "var(--color-card, #fff)", color: "#003580", border: "none",
          padding: "5px 14px", borderRadius: "8px", fontWeight: 700,
          fontSize: "13px", cursor: "pointer",
          display: "flex", alignItems: "center", gap: "4px",
        }}
      >
        <Rocket style={{ width: "12px", height: "12px" }} />
        Cadastre-se — 7 Dias Grátis
      </button>
      <button
        onClick={async () => { await logout(); navigate("/"); }}
        style={{
          background: "rgba(255,255,255,0.15)", color: "#ffffff", border: "1px solid rgba(255,255,255,0.3)",
          padding: "5px 14px", borderRadius: "8px", fontWeight: 600,
          fontSize: "13px", cursor: "pointer",
          display: "flex", alignItems: "center", gap: "4px",
        }}
      >
        <LogOut style={{ width: "12px", height: "12px" }} />
        Sair
      </button>
    </div>
  );
}
