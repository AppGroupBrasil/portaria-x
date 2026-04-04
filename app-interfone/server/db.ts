import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// In production, use /app/data/ (Docker volume) for persistence
// In development, use project root
const dbPath = process.env.NODE_ENV === "production"
  ? path.join("/app", "data", "data.db")
  : path.join(__dirname, "..", "data.db");

const db = new Database(dbPath);

// Enable WAL mode for better performance
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
db.pragma("encoding = 'UTF-8'");
db.pragma("busy_timeout = 5000");

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS condominios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    cnpj TEXT UNIQUE,
    address TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    units_count INTEGER DEFAULT 0,
    admin_user_id INTEGER,
    administradora_id INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT,
    cpf TEXT,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'morador',
    perfil TEXT,
    unit TEXT,
    block TEXT,
    condominio_id INTEGER REFERENCES condominios(id),
    parent_administradora_id INTEGER REFERENCES users(id),
    avatar_url TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS blocks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    condominio_id INTEGER NOT NULL REFERENCES condominios(id),
    name TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS funcionarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    sobrenome TEXT NOT NULL,
    cargo TEXT NOT NULL,
    login TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    condominio_id INTEGER REFERENCES condominios(id),
    created_by INTEGER REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id INTEGER,
    details TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS system_config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS condominio_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    condominio_id INTEGER NOT NULL REFERENCES condominios(id),
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(condominio_id, key)
  );
`);

// ─── Ensure global system record (id=0) exists for shared config ───
const globalCond = db.prepare("SELECT id FROM condominios WHERE id = 0").get();
if (!globalCond) {
  db.exec(`INSERT INTO condominios (id, name) VALUES (0, '__SISTEMA_GLOBAL__')`);
}

// ─── Gate Logs table (smart switch activity) ───
db.exec(`
  CREATE TABLE IF NOT EXISTS gate_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    condominio_id INTEGER NOT NULL REFERENCES condominios(id),
    user_id INTEGER REFERENCES users(id),
    user_name TEXT NOT NULL,
    action TEXT NOT NULL,
    details TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// ─── Gate Access Points table (multi-access per condo) ───
db.exec(`
  CREATE TABLE IF NOT EXISTS gate_access_points (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    condominio_id INTEGER NOT NULL REFERENCES condominios(id),
    name TEXT NOT NULL,
    icon TEXT NOT NULL DEFAULT 'DoorOpen',
    device_id TEXT,
    enabled INTEGER NOT NULL DEFAULT 1,
    pulse_duration INTEGER NOT NULL DEFAULT 1000,
    allowed_roles TEXT NOT NULL DEFAULT '["morador","funcionario","sindico"]',
    order_index INTEGER NOT NULL DEFAULT 0,
    is_custom INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// Add device_protocol and device_config columns if missing
try {
  db.exec(`ALTER TABLE gate_access_points ADD COLUMN device_protocol TEXT NOT NULL DEFAULT 'ewelink'`);
} catch {}
try {
  db.exec(`ALTER TABLE gate_access_points ADD COLUMN device_config TEXT`);
} catch {}
try {
  db.exec(`ALTER TABLE gate_access_points ADD COLUMN channel INTEGER`);
} catch {}
try {
  db.exec(`ALTER TABLE gate_access_points ADD COLUMN allow_manual_open INTEGER NOT NULL DEFAULT 1`);
} catch {}
try {
  db.exec(`ALTER TABLE gate_access_points ADD COLUMN allow_botoeira_morador INTEGER NOT NULL DEFAULT 1`);
} catch {}
try {
  db.exec(`ALTER TABLE gate_access_points ADD COLUMN allow_botoeira_portaria INTEGER NOT NULL DEFAULT 1`);
} catch {}

// ─── Interfone Digital tables ───
db.exec(`
  CREATE TABLE IF NOT EXISTS interfone_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    condominio_id INTEGER NOT NULL REFERENCES condominios(id),
    bloco_id INTEGER REFERENCES blocks(id),
    bloco_nome TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    ativo INTEGER NOT NULL DEFAULT 1,
    created_by INTEGER REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS interfone_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    condominio_id INTEGER NOT NULL REFERENCES condominios(id),
    nivel_seguranca INTEGER NOT NULL DEFAULT 1,
    nome_validacao TEXT,
    horario_silencioso_inicio TEXT,
    horario_silencioso_fim TEXT,
    bloqueados TEXT,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(user_id)
  );

  CREATE TABLE IF NOT EXISTS interfone_calls (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    condominio_id INTEGER NOT NULL REFERENCES condominios(id),
    bloco TEXT NOT NULL,
    apartamento TEXT NOT NULL,
    morador_id INTEGER REFERENCES users(id),
    morador_nome TEXT,
    visitante_nome TEXT,
    visitante_empresa TEXT,
    visitante_foto TEXT,
    nivel_seguranca INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'chamando',
    duracao_segundos INTEGER DEFAULT 0,
    resultado TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    atendido_at TEXT,
    encerrado_at TEXT
  );
`);

// ─── Interfone: add 'call_id' column for WS signaling callId ───
try {
  db.exec(`ALTER TABLE interfone_calls ADD COLUMN call_id TEXT`);
} catch (_) {}

// ─── Interfone: add 'tipo' column for condominium-wide tokens ───
try {
  db.exec(`ALTER TABLE interfone_tokens ADD COLUMN tipo TEXT NOT NULL DEFAULT 'bloco'`);
} catch (_) {}

// Migration: make bloco_id nullable for condominium-wide tokens
try {
  db.transaction(() => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS interfone_tokens_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        condominio_id INTEGER NOT NULL REFERENCES condominios(id),
        bloco_id INTEGER REFERENCES blocks(id),
        bloco_nome TEXT NOT NULL,
        token TEXT NOT NULL UNIQUE,
        ativo INTEGER NOT NULL DEFAULT 1,
        created_by INTEGER REFERENCES users(id),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        tipo TEXT NOT NULL DEFAULT 'bloco'
      );
      INSERT INTO interfone_tokens_new (id, condominio_id, bloco_id, bloco_nome, token, ativo, created_by, created_at, updated_at, tipo)
        SELECT id, condominio_id, CASE WHEN bloco_id = 0 THEN NULL ELSE bloco_id END, bloco_nome, token, ativo, created_by, created_at, updated_at, tipo
        FROM interfone_tokens;
      DROP TABLE interfone_tokens;
      ALTER TABLE interfone_tokens_new RENAME TO interfone_tokens;
    `);
  })();
} catch (_) {}

// ─── Device tokens (FCM push notifications) ───
db.exec(`
  CREATE TABLE IF NOT EXISTS device_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    platform TEXT NOT NULL DEFAULT 'android',
    device_info TEXT,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(user_id, token)
  );
  CREATE INDEX IF NOT EXISTS idx_device_tokens_user ON device_tokens(user_id, active);
  CREATE INDEX IF NOT EXISTS idx_device_tokens_token ON device_tokens(token);
`);

// Seed default system configs
const existingConfig = db.prepare("SELECT COUNT(*) as count FROM system_config").get() as { count: number };
if (existingConfig.count === 0) {
  db.prepare(`INSERT OR IGNORE INTO system_config (key, value) VALUES
    ('app_name', 'Portaria X'),
    ('maintenance_mode', 'false'),
    ('max_moradores_per_unit', '10'),
    ('allow_self_register', 'true'),
    ('notification_email', ''),
    ('backup_frequency', 'daily')
  `).run();
}

// ─── Database Indexes for Performance ───
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_users_condominio ON users(condominio_id);
  CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
  CREATE INDEX IF NOT EXISTS idx_blocks_condominio ON blocks(condominio_id);
  CREATE INDEX IF NOT EXISTS idx_funcionarios_condominio ON funcionarios(condominio_id);
  CREATE INDEX IF NOT EXISTS idx_interfone_tokens_condominio ON interfone_tokens(condominio_id);
  CREATE INDEX IF NOT EXISTS idx_interfone_calls_condominio ON interfone_calls(condominio_id);
  CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
  CREATE INDEX IF NOT EXISTS idx_condominios_cnpj ON condominios(cnpj);
`);

// ─── Migration: add is_demo column for demo/sample accounts ───
try {
  db.prepare("SELECT is_demo FROM users LIMIT 1").get();
} catch {
  db.exec("ALTER TABLE users ADD COLUMN is_demo INTEGER DEFAULT 0");
}
db.exec(`CREATE INDEX IF NOT EXISTS idx_users_is_demo ON users(is_demo) WHERE is_demo = 1`);

// ─── Migration: add aprovado column for self-registration approval ───
try {
  db.prepare("SELECT aprovado FROM users LIMIT 1").get();
} catch {
  db.exec("ALTER TABLE users ADD COLUMN aprovado INTEGER DEFAULT 1");
  db.exec("UPDATE users SET aprovado = 1");
}
db.exec(`CREATE INDEX IF NOT EXISTS idx_users_aprovado ON users(aprovado) WHERE aprovado = 0`);

// ─── Migration: add condominio management columns ───
const condoAdminColumns = [
  { col: "status_pagamento", def: "TEXT DEFAULT 'adimplente'" },
  { col: "bloqueado", def: "INTEGER DEFAULT 0" },
  { col: "bloqueado_at", def: "TEXT" },
  { col: "bloqueado_motivo", def: "TEXT" },
  { col: "last_access_at", def: "TEXT" },
  { col: "access_count", def: "INTEGER DEFAULT 0" },
];
for (const { col, def } of condoAdminColumns) {
  try {
    db.prepare(`SELECT ${col} FROM condominios LIMIT 1`).get();
  } catch {
    db.exec(`ALTER TABLE condominios ADD COLUMN ${col} ${def}`);
  }
}

// ─── Migration: add whatsapp_interfone to interfone_config ───
try {
  db.prepare("SELECT whatsapp_interfone FROM interfone_config LIMIT 1").get();
} catch {
  db.exec("ALTER TABLE interfone_config ADD COLUMN whatsapp_interfone TEXT");
}

// ─── Migration: add parent_administradora_id to users ───
try {
  db.prepare("SELECT parent_administradora_id FROM users LIMIT 1").get();
} catch {
  db.exec("ALTER TABLE users ADD COLUMN parent_administradora_id INTEGER REFERENCES users(id)");
}

// ─── Migration: add face_descriptor to users (selfie authentication) ───
try {
  db.prepare("SELECT face_descriptor FROM users LIMIT 1").get();
} catch {
  db.exec("ALTER TABLE users ADD COLUMN face_descriptor TEXT");
}

// ─── Database Backup ───
const backupDir = process.env.NODE_ENV === "production"
  ? path.join("/app", "data", "backups")
  : path.join(__dirname, "..", "backups");

export function performBackup(): string | null {
  try {
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const backupPath = path.join(backupDir, `data-${timestamp}.db`);

    db.backup(backupPath);

    const files = fs.readdirSync(backupDir)
      .filter(f => f.startsWith("data-") && f.endsWith(".db"))
      .sort()
      .reverse();

    for (const file of files.slice(7)) {
      fs.unlinkSync(path.join(backupDir, file));
    }

    console.log(`[BACKUP] Backup criado: ${backupPath}`);
    return backupPath;
  } catch (err) {
    console.error("[BACKUP] Erro ao criar backup:", err);
    return null;
  }
}

// ─── Cleanup: old audit logs (keep 90 days) ───
export function cleanupOldAuditLogs(): number {
  try {
    const result = db.prepare(`
      DELETE FROM audit_logs
      WHERE created_at < datetime('now', '-90 days')
    `).run();
    if (result.changes > 0) {
      console.log(`[CLEANUP] ${result.changes} log(s) de auditoria removido(s) (90+ dias)`);
    }
    return result.changes;
  } catch (err) {
    console.error("[CLEANUP] Erro ao limpar logs:", err);
    return 0;
  }
}

export default db;

// Helper types
export interface DbCondominio {
  id: number;
  name: string;
  cnpj: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  units_count: number;
  admin_user_id: number | null;
  administradora_id: number | null;
  status_pagamento: string;
  bloqueado: number;
  bloqueado_at: string | null;
  bloqueado_motivo: string | null;
  last_access_at: string | null;
  access_count: number;
  created_at: string;
  updated_at: string;
}

export interface DbUser {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  cpf: string | null;
  password: string;
  role: string;
  perfil: string | null;
  unit: string | null;
  block: string | null;
  condominio_id: number | null;
  parent_administradora_id: number | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}
