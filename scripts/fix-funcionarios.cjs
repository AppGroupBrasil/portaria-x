const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.join(__dirname, 'data.db');
const db = new Database(dbPath);

console.log("DB Path:", dbPath);

// List existing tables
console.log("\n=== EXISTING TABLES ===");
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
tables.forEach(t => console.log(t.name));

// Check if funcionarios exists
const hasFuncionarios = tables.some(t => t.name === 'funcionarios');
console.log("\nHas funcionarios table:", hasFuncionarios);

if (!hasFuncionarios) {
  console.log("\nCreating funcionarios table...");
  db.exec(`
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
    )
  `);
  db.exec('CREATE INDEX IF NOT EXISTS idx_funcionarios_condominio ON funcionarios(condominio_id)');
  console.log("Table created successfully!");
} else {
  console.log("Table already exists.");
}

// Check count
const count = db.prepare('SELECT COUNT(*) as c FROM funcionarios').get();
console.log("Funcionarios count:", count.c);

db.close();
