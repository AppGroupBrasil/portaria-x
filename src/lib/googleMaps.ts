import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

export const GOOGLE_MAPS_API_KEY = (((import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY ?? "") as string).trim();

export const GOOGLE_MAPS_MAP_ID = (((import.meta as any).env?.VITE_GOOGLE_MAPS_MAP_ID ?? "") as string).trim();

export const DEFAULT_MAP_CENTER = {
  lat: -23.55,
  lng: -46.63,
};

let cacheRuntime: { apiKey: string; mapId: string } | null = null;
let buscaFeita = false;

/**
 * A chave vem do bundle quando o build teve acesso ao .env. Em producao a
 * imagem Docker e construida sem os .env, entao caimos no /api/maps-config,
 * que le a chave do ambiente do servidor.
 */
export function useGoogleMapsConfig() {
  const [config, setConfig] = useState(
    () => cacheRuntime ?? { apiKey: GOOGLE_MAPS_API_KEY, mapId: GOOGLE_MAPS_MAP_ID },
  );

  useEffect(() => {
    if (config.apiKey || buscaFeita) return;
    buscaFeita = true;
    let vivo = true;
    apiFetch("/api/maps-config")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data?.apiKey) {
          // resposta vazia ou erro: libera nova tentativa numa proxima montagem
          buscaFeita = false;
          return;
        }
        if (!vivo) return;
        cacheRuntime = { apiKey: String(data.apiKey), mapId: String(data.mapId || "") };
        setConfig(cacheRuntime);
      })
      .catch(() => { buscaFeita = false; });
    return () => { vivo = false; };
  }, [config.apiKey]);

  return config;
}
