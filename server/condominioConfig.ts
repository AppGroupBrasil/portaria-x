import { Router, Request, Response } from "express";
import db from "./db.js";
import { authenticate, authorize, getAccessibleCondominioIds } from "./middleware.js";

const router = Router();

// Chaves permitidas na configuração do condomínio
const ALLOWED_KEYS = new Set([
  // ── Morador features ──
  "feature_autorizacoes",
  "feature_delivery",
  "feature_veiculos",
  "feature_qr_visitante",
  "feature_correspondencias",
  "feature_auto_cadastro",
  "feature_interfone",
  "feature_estou_chegando",
  "feature_portaria_virtual",
  // ── Porteiro/Funcionário features ──
  "feature_porteiro_pedestres",
  "feature_porteiro_veiculos",
  "feature_porteiro_delivery",
  "feature_porteiro_correspondencias",
  "feature_porteiro_monitoramento",
  "feature_porteiro_rondas",
  "feature_porteiro_interfone",
  "feature_porteiro_estou_chegando",
  "feature_porteiro_portaria_virtual",
  "feature_porteiro_centro_comando",
  "feature_porteiro_qr_scanner",
  "feature_porteiro_livro_protocolo",
  "feature_porteiro_espelho",
  "feature_porteiro_acesso_auto",
  // ── Síndico features ──
  "feature_sindico_cadastros",
  "feature_sindico_blocos",
  "feature_sindico_moradores",
  "feature_sindico_funcionarios",
  "feature_sindico_cameras",
  "feature_sindico_rondas",
  "feature_sindico_interfone",
  "feature_sindico_estou_chegando",
  "feature_sindico_acessos",
  "feature_sindico_portao",
  "feature_sindico_qr_config",
  "feature_sindico_dispositivos",
  "feature_sindico_liberacao",
  "feature_sindico_whatsapp",
  "vehicle_unique_access",
  "vehicle_auto_cancel_time",
  "vehicle_limit_per_apt",
  "vehicle_limit_per_apt_count",
  "vehicle_require_modelo",
  "vehicle_require_cor",
  "vehicle_require_motorista",
  "vehicle_require_observacao",
  "max_auth_days",
  "require_visit_photo",
  "require_visit_document",
  "require_visit_phone",
  "require_visit_reason",
  "require_visit_doc_photo",
  "notify_email_enabled",
  "notify_email_address",
  "notify_whatsapp_enabled",
  "notify_whatsapp_phone",
  "whatsapp_enabled",
  "whatsapp_gupshup_apikey",
  "whatsapp_gupshup_source",
  "whatsapp_gupshup_appname",
  "whatsapp_monthly_limit",
  "whatsapp_cost_per_msg",
  "whatsapp_notify_visitor_arrival",
  "whatsapp_notify_delivery",
  "whatsapp_notify_security_alert",
  "whatsapp_notify_gate_opened",
  "whatsapp_notify_estou_chegando",
  "whatsapp_notify_pre_authorization",
  "whatsapp_notify_vehicle_access",
  "whatsapp_notify_ronda",
  "whatsapp_notify_livro_protocolo",
]);

// ─── DEFAULT CONFIG (copied from Condomínio Exemplo id=1) ──
// Applied automatically to new condominiums
const DEFAULT_CONDOMINIO_ID = 1;

export function applyDefaultConfig(targetCondominioId: number): void {
  try {
    const sourceRows = db
      .prepare("SELECT key, value FROM condominio_config WHERE condominio_id = ?")
      .all(DEFAULT_CONDOMINIO_ID) as { key: string; value: string }[];

    if (sourceRows.length === 0) return;

    const upsert = db.prepare(`
      INSERT INTO condominio_config (condominio_id, key, value, updated_at)
      VALUES (?, ?, ?, datetime('now'))
      ON CONFLICT(condominio_id, key)
      DO UPDATE SET value = excluded.value, updated_at = datetime('now')
    `);

    const tx = db.transaction(() => {
      for (const row of sourceRows) {
        if (!ALLOWED_KEYS.has(row.key)) continue;
        upsert.run(targetCondominioId, row.key, row.value);
      }
    });
    tx();
  } catch (err) {
    console.error(`[CONFIG] Erro ao aplicar config padrão ao condomínio ${targetCondominioId}:`, err);
  }
}

// ─── PUBLIC config for auto-cadastro (no auth) ──────────
router.get("/public", (req: Request, res: Response) => {
  try {
    const condominioId = req.query.condominio_id ? Number(req.query.condominio_id) : null;
    const publicKeys = [
      'require_visit_photo','require_visit_document','require_visit_phone',
      'require_visit_reason','require_visit_doc_photo',
      'notify_whatsapp_enabled','notify_whatsapp_phone',
      'feature_auto_cadastro',
    ];
    const placeholders = publicKeys.map(() => '?').join(',');
    let query = `SELECT key, value FROM condominio_config WHERE key IN (${placeholders})`;
    let params: any[] = [...publicKeys];
    if (condominioId) {
      query += ` AND condominio_id = ?`;
      params.push(condominioId);
    }
    const rows = db.prepare(query).all(...params) as { key: string; value: string }[];
    const config: Record<string, string> = {};
    for (const row of rows) {
      config[row.key] = row.value;
    }
    res.json(config);
  } catch (err: any) {
    console.error("Erro ao buscar config pública:", err);
    res.status(500).json({ error: "Erro interno" });
  }
});

// ─── Helper: get condominio IDs for current user ────────
function getUserCondominioIds(user: any): number[] {
  if (user.condominio_id) return [user.condominio_id];
  const ids = getAccessibleCondominioIds(user);
  if (ids === null) {
    // master → all condominios
    return (db.prepare("SELECT id FROM condominios").all() as { id: number }[]).map(r => r.id);
  }
  return ids;
}

// ─── GET all config for current condominio ───────────────
router.get("/", authenticate, (req: Request, res: Response) => {
  try {
    const condominioIds = getUserCondominioIds(req.user);
    if (condominioIds.length === 0) {
      return res.json({});
    }
    // Allow selecting a specific condominio via query param
    let targetId = condominioIds[0];
    if (req.query.condominio_id) {
      const requested = Number(req.query.condominio_id);
      if (condominioIds.includes(requested)) {
        targetId = requested;
      }
    }
    const rows = db
      .prepare(`SELECT key, value FROM condominio_config WHERE condominio_id = ?`)
      .all(targetId) as { key: string; value: string }[];

    const config: Record<string, string> = {};
    for (const row of rows) {
      config[row.key] = row.value;
    }

    res.json(config);
  } catch (err: any) {
    console.error("Erro ao buscar config:", err);
    res.status(500).json({ error: "Erro ao buscar configuração" });
  }
});

// ─── UPDATE config (funcionario+ only) ───────────────────
router.put(
  "/",
  authenticate,
  authorize("master", "administradora", "sindico", "funcionario"),
  (req: Request, res: Response) => {
    try {
      const condominioIds = getUserCondominioIds(req.user);
      if (condominioIds.length === 0) {
        return res.status(400).json({ error: "Nenhum condomínio associado" });
      }
      const updates: Record<string, string> = req.body;

      // Allow targeting a specific condominio via query param
      let targetIds = condominioIds;
      if (req.query.condominio_id) {
        const requested = Number(req.query.condominio_id);
        if (condominioIds.includes(requested)) {
          targetIds = [requested];
        }
      }

      const upsert = db.prepare(`
        INSERT INTO condominio_config (condominio_id, key, value, updated_at)
        VALUES (?, ?, ?, datetime('now'))
        ON CONFLICT(condominio_id, key)
        DO UPDATE SET value = excluded.value, updated_at = datetime('now')
      `);

      const tx = db.transaction(() => {
        for (const cid of targetIds) {
          for (const [key, value] of Object.entries(updates)) {
            if (!ALLOWED_KEYS.has(key)) continue;
            upsert.run(cid, key, String(value));
          }
        }
      });
      tx();

      // Return the updated config from targeted condominio
      const rows = db
        .prepare("SELECT key, value FROM condominio_config WHERE condominio_id = ?")
        .all(targetIds[0]) as { key: string; value: string }[];

      const config: Record<string, string> = {};
      for (const row of rows) {
        config[row.key] = row.value;
      }

      res.json(config);
    } catch (err: any) {
      console.error("Erro ao atualizar config:", err);
      res.status(500).json({ error: "Erro ao atualizar configuração" });
    }
  }
);

export default router;
