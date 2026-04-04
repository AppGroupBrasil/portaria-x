const FEATURE_DEFAULTS: Record<string, boolean> = {
  feature_autorizacoes: true,
  feature_delivery: true,
  feature_veiculos: true,
  feature_qr_visitante: true,
  feature_correspondencias: true,
  feature_estou_chegando: true,
  feature_portaria_virtual: false,
  feature_auto_cadastro: false,

  feature_porteiro_pedestres: true,
  feature_porteiro_veiculos: true,
  feature_porteiro_delivery: true,
  feature_porteiro_correspondencias: true,
  feature_porteiro_rondas: true,
  feature_porteiro_estou_chegando: true,
  feature_porteiro_centro_comando: true,
  feature_porteiro_qr_scanner: true,
  feature_porteiro_livro_protocolo: true,
  feature_porteiro_espelho: true,
  feature_porteiro_monitoramento: false,
  feature_porteiro_portaria_virtual: false,
  feature_porteiro_acesso_auto: false,

  feature_sindico_cadastros: true,
  feature_sindico_blocos: true,
  feature_sindico_moradores: true,
  feature_sindico_funcionarios: true,
  feature_sindico_rondas: true,
  feature_sindico_estou_chegando: true,
  feature_sindico_qr_config: true,
  feature_sindico_liberacao: true,
  feature_sindico_cameras: false,
  feature_sindico_acessos: false,
  feature_sindico_portao: false,
  feature_sindico_dispositivos: false,
  feature_sindico_whatsapp: false,
};

export function getFeatureDefault(key: string, fallback = true): boolean {
  if (key in FEATURE_DEFAULTS) {
    return FEATURE_DEFAULTS[key];
  }
  return fallback;
}

export function isFeatureEnabled(
  config: Record<string, string> | undefined,
  key: string,
  fallback = true,
): boolean {
  const value = config?.[key];
  if (value === "true") return true;
  if (value === "false") return false;
  return getFeatureDefault(key, fallback);
}

export function getConfigBoolean(
  config: Record<string, string> | undefined,
  key: string,
  fallback = false,
): boolean {
  const value = config?.[key];
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

export { FEATURE_DEFAULTS };