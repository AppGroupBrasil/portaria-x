import { useNavigate } from "react-router-dom";
import { useAuth, hasMinRole, type UserRole } from "@/hooks/useAuth";
import {
  Users,
  Home as HomeIcon,
  Building2,
  ChevronLeft,
  ShieldCheck,
  UserCog,
  type LucideIcon,
} from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

interface CadastroItem {
  id: string;
  label: string;
  icon: LucideIcon;
  route?: string;
  minRole: UserRole;
}

const cadastroItems: CadastroItem[] = [
  { id: "administradoras", label: "Administradoras", icon: ShieldCheck, route: "/cadastros/administradoras", minRole: "master" },
  { id: "sindicos", label: "Síndicos", icon: UserCog, route: "/cadastros/sindicos", minRole: "administradora" },
  { id: "funcionarios", label: "Funcionários", icon: Users, route: "/cadastros/funcionarios", minRole: "sindico" },
  { id: "blocos", label: "Blocos", icon: Building2, route: "/cadastros/blocos", minRole: "sindico" },
  { id: "moradores", label: "Moradores", icon: HomeIcon, route: "/cadastros/moradores", minRole: "sindico" },
];

export default function Cadastros() {
  const { isDark, p } = useTheme();
  const navigate = useNavigate();
  const { user } = useAuth();

  const visibleItems = cadastroItems.filter((item) =>
    hasMinRole(user?.role || "morador", item.minRole)
  );

  return (
    <div className="min-h-dvh flex flex-col" style={{ backgroundColor: "#ffffff" }}>
      {/* Header */}
      <header className="sticky top-0 z-40" style={{ background: p.headerBg, borderBottom: p.headerBorder, boxShadow: p.headerShadow, color: p.text, paddingTop: "max(0, env(safe-area-inset-top))" }}>
        <div className="h-16 flex items-center gap-3" style={{ paddingLeft: "1rem", paddingRight: "1rem" }}>
          <button onClick={() => navigate("/dashboard")} className="p-2">
            <ChevronLeft className="w-7 h-7" />
          </button>
          <span className="font-semibold text-lg">Cadastros</span>
        </div>
      </header>

      {/* Grid de ícones */}
      <main className="flex-1" style={{ paddingLeft: "1rem", paddingRight: "1rem", paddingTop: "4rem", paddingBottom: "3.5rem" }}>
        <div className="grid grid-cols-2 gap-8">
          {visibleItems.map((item, index) => (
            <button
              key={item.id}
              onClick={() => item.route && navigate(item.route)}
              className="flex flex-col items-center justify-center gap-3 px-3 rounded-xl active:scale-[0.97] transition-all duration-150 animate-fade-in"
              style={{ animationDelay: `${index * 0.04}s`, padding: "3rem 1rem", background: isDark ? "linear-gradient(135deg, #0062d1 0%, #003d99 50%, #001d4a 100%)" : "#ffffff", border: isDark ? "none" : "2px solid #cbd5e1", borderRadius: 16 }}
            >
              <div className="w-14 h-14 rounded-lg flex items-center justify-center" style={{ backgroundColor: isDark ? "#ffffff" : "#e0ecf7" }}>
                <item.icon className="w-7 h-7" style={{ color: "#003580" }} strokeWidth={1.5} />
              </div>
              <span className="text-base font-semibold text-center leading-tight" style={{ color: p.text }}>
                {item.label}
              </span>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
