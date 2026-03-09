const db = require('better-sqlite3')('data.db');
const c = db.prepare("SELECT id, name FROM condominios WHERE id=0").get();
console.log("Condominio 0:", c);
