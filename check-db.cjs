const Database = require('better-sqlite3');
const db = new Database('./portariax.db');

console.log("=== USERS TABLE COLUMNS ===");
const userCols = db.prepare('PRAGMA table_info(users)').all();
userCols.forEach(c => console.log(c.name));

console.log("\n=== FUNCIONARIOS TABLE COLUMNS ===");
try {
  const funcCols = db.prepare('PRAGMA table_info(funcionarios)').all();
  funcCols.forEach(c => console.log(c.name));
} catch(e) {
  console.log("TABLE NOT FOUND:", e.message);
}

console.log("\n=== FUNCIONARIOS COUNT ===");
try {
  const count = db.prepare('SELECT COUNT(*) as c FROM funcionarios').get();
  console.log("Count:", count.c);
} catch(e) {
  console.log("ERROR:", e.message);
}

console.log("\n=== TEST QUERY (master users) ===");
try {
  const q = db.prepare("SELECT u.id, u.name, u.email, u.phone, u.cpf, u.role, u.perfil, u.unit, u.block, u.condominio_id, u.parent_administradora_id, u.created_at, u.updated_at, c.name as condominio_nome, pa.name as parent_administradora_nome FROM users u LEFT JOIN condominios c ON u.condominio_id = c.id LEFT JOIN users pa ON u.parent_administradora_id = pa.id WHERE 1=1 ORDER BY u.created_at DESC LIMIT 20 OFFSET 0");
  const rows = q.all();
  console.log("Rows:", rows.length);
} catch(e) {
  console.log("QUERY ERROR:", e.message);
}

db.close();
