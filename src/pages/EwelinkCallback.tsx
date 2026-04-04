import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { apiFetch } from "@/lib/api";

/**
 * eWeLink OAuth2.0 Callback Page
 * 
 * eWeLink redirects here with ?code=xxx&state=xxx after user authorizes.
 * We exchange the code for a token via our backend, then redirect to the
 * master gate config page.
 */
export default function EwelinkCallback() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Processando autorização eWeLink...");

  useEffect(() => {
    const code = searchParams.get("code");
    const region = searchParams.get("region");

    if (!code) {
      setStatus("error");
      setMessage("Código de autorização não recebido. Tente novamente.");
      return;
    }

    exchangeCode(code, region);
  }, []);

  async function exchangeCode(code: string, region: string | null) {
    try {
      // Build the redirect URL that was used to generate the OAuth URL
      const redirectUrl = `${globalThis.window.location.origin}/callback`;
      
      const res = await apiFetch("/api/gate/oauth-exchange", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, redirectUrl, region }),
      });

      const data = await res.json();

      if (data.success) {
        setStatus("success");
        setMessage("Autorização eWeLink realizada com sucesso! Redirecionando...");
        setTimeout(() => {
          globalThis.window.location.href = "/master/portao?oauth=success";
        }, 1500);
      } else {
        setStatus("error");
        setMessage(data.error || "Erro ao trocar código por token.");
      }
    } catch (err: any) {
      setStatus("error");
      setMessage(err.message || "Erro de conexão.");
    }
  }

  return (
    <div className="min-h-dvh bg-background flex items-center justify-center p-4">
      <div className="text-center space-y-4">
        {status === "loading" && (
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
        )}
        {status === "success" && (
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
        )}
        {status === "error" && (
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
        )}
        <p className="text-lg text-foreground">{message}</p>
        {status === "error" && (
          <button
            onClick={() => globalThis.window.location.href = "/master/portao?oauth=error&msg=" + encodeURIComponent(message)}
            className="px-6 py-3 rounded-xl bg-[#003580] text-white text-base font-semibold mt-4"
          >
            Voltar à Configuração
          </button>
        )}
      </div>
    </div>
  );
}
