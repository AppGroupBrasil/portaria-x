const db = require('better-sqlite3')('./data.db');
console.log("=== ADMIN/MASTER USERS ===");
console.log(db.prepare("SELECT id, name, role, condominio_id FROM users WHERE role IN ('administradora','master')").all());
console.log("\n=== CONDOMINIOS ===");
console.log(db.prepare("SELECT id, name, administradora_id FROM condominios").all());
console.log("\n=== FUNCIONARIOS ===");
console.log(db.prepare("SELECT id, nome, sobrenome, condominio_id, created_by FROM funcionarios").all());
db.close();
