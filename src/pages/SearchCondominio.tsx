import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Search,
  ArrowRight,
  Loader2,
  AlertCircle,
  Building2,
  CheckCircle2,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { APP_ERROR_CODES, readErrorResponse, toAppError } from "@/lib/errorCodes";

interface CondominioResult {
  id: number;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  blocks: string[];
}

export default function SearchCondominio() {
  const navigate = useNavigate();

  const [cnpj, setCnpj] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState("");
  const [condominio, setCondominio] = useState<CondominioResult | null>(null);

  const formatCnpj = (value: string) => {
    const n = value.replaceAll(/\D/g, "");
    if (n.length <= 2) return n;
    if (n.length <= 5) return `${n.slice(0, 2)}.${n.slice(2)}`;
    if (n.length <= 8) return `${n.slice(0, 2)}.${n.slice(2, 5)}.${n.slice(5)}`;
    if (n.length <= 12) return `${n.slice(0, 2)}.${n.slice(2, 5)}.${n.slice(5, 8)}/${n.slice(8)}`;
    return `${n.slice(0, 2)}.${n.slice(2, 5)}.${n.slice(5, 8)}/${n.slice(8, 12)}-${n.slice(12, 14)}`;
  };

  const handleSearch = async () => {
    setError("");
    setCondominio(null);

    const clean = cnpj.replaceAll(/\D/g, "");
    if (clean.length !== 14) {
      setError("CNPJ deve ter 14 dígitos.");
      return;
    }

    setIsSearching(true);
    try {
      const res = await apiFetch(`/api/auth/condominio/search?cnpj=${clean}`);
      if (!res.ok) {
        throw await readErrorResponse(res, "Condomínio não encontrado.", APP_ERROR_CODES.CONDO_NOT_FOUND);
      }
      const data = await res.json();
      setCondominio(data.condominio);
    } catch (err: unknown) {
      setError(toAppError(err, "Erro ao buscar condomínio.").message);
    } finally {
      setIsSearching(false);
    }
  };

  const handleContinue = () => {
    if (!condominio) return;
    if (condominio.blocks.length === 0) {
      setError("Este condomínio ainda não possui blocos cadastrados. Solicite ao síndico que cadastre um bloco primeiro.");
      return;
    }
    navigate("/register/morador", {
      state: {
        condominioId: condominio.id,
        condominioName: condominio.name,
        blocks: condominio.blocks,
      },
    });
  };

  const buildAddress = () => {
    if (!condominio) return "";
    const parts = [condominio.address, condominio.city, condominio.state].filter(Boolean);
    return parts.join(", ");
  };

  return (
    <div className="min-h-dvh bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-32 -right-32 w-64 h-64 rounded-full bg-primary/8 blur-3xl animate-pulse" />
        <div className="absolute -bottom-32 -left-32 w-72 h-72 rounded-full bg-primary/5 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(oklch(0.95 0.01 260) 1px, transparent 1px), linear-gradient(90deg, oklch(0.95 0.01 260) 1px, transparent 1px)`,
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      <div className="w-full max-w-sm relative z-10 animate-slide-up">
        {/* Header */}
        <div className="text-center" style={{ marginBottom: "32px" }}>
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl" style={{ background: "linear-gradient(135deg, #0062d1 0%, #003d99 50%, #001d4a 100%)", marginBottom: "19px" }}>
            <Search className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight" style={{ marginBottom: "19px" }}>
            Buscar Condomínio
          </h1>
          <p className="text-sm text-muted-foreground">
            Informe o CNPJ do seu condomínio para continuar
          </p>
        </div>

        {/* Search Card */}
        <div className="glass rounded-2xl p-8 shadow-2xl shadow-black/20">
          <div style={{ display: "flex", flexDirection: "column", gap: "19px" }}>
            {/* CNPJ Input */}
            <div className="space-y-2">
              <Label htmlFor="cnpj">CNPJ do Condomínio *</Label>
              <Input
                id="cnpj"
                placeholder="00.000.000/0000-00"
                value={cnpj}
                onChange={(e) => {
                  setCnpj(formatCnpj(e.target.value));
                  setCondominio(null);
                  setError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSearch();
                  }
                }}
              />
            </div>

            {/* Search Button */}
            {!condominio && (
              <Button
                type="button"
                onClick={handleSearch}
                disabled={isSearching}
                className="w-full"
              >
                {isSearching ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Buscando...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    Buscar condomínio
                  </>
                )}
              </Button>
            )}

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm animate-fade-in">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Condomínio Found */}
            {condominio && (
              <div className="animate-fade-in space-y-4">
                <div className="p-4 rounded-lg bg-emerald-500/10 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="text-sm font-medium">Condomínio encontrado!</span>
                  </div>
                  <div className="space-y-1 mt-2">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
                      <p className="text-sm font-semibold text-foreground">{condominio.name}</p>
                    </div>
                    {buildAddress() && (
                      <p className="text-xs text-muted-foreground ml-6">{buildAddress()}</p>
                    )}
                    {condominio.blocks.length > 0 ? (
                      <div className="mt-2 ml-6">
                        <p className="text-xs text-muted-foreground mb-1">Blocos cadastrados:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {condominio.blocks.map((b) => (
                            <span
                              key={b}
                              className="px-2 py-0.5 text-xs rounded-md bg-secondary/80 text-foreground"
                            >
                              {b}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="mt-2 ml-6 rounded-md bg-amber-500/10 border border-amber-500/20 px-3 py-2">
                        <p className="text-xs text-amber-500">
                          Este condomínio ainda não possui blocos cadastrados. O cadastro de moradores fica liberado após o síndico cadastrar pelo menos um bloco.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={handleContinue}
                  className="w-full"
                  disabled={condominio.blocks.length === 0}
                >
                  {condominio.blocks.length === 0 ? "Cadastre um bloco primeiro" : "Continuar cadastro"}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Back to login */}
        <p className="text-center text-sm text-muted-foreground mt-6">
          Já tem conta?{" "}
          <Link to="/login" className="text-primary font-medium hover:text-primary/80 transition-colors">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
