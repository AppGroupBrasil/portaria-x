export const GOOGLE_MAPS_API_KEY = (((import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY ?? "") as string).trim();

export const GOOGLE_MAPS_MAP_ID = (((import.meta as any).env?.VITE_GOOGLE_MAPS_MAP_ID ?? "") as string).trim();

export const DEFAULT_MAP_CENTER = {
  lat: -23.55,
  lng: -46.63,
};