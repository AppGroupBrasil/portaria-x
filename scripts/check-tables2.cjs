const Database = require('better-sqlite3');
const db = new Database('./portariax.db');

console.log("=== ALL TABLES ===");
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
tables.forEach(t => console.log(t.name));

db.close();
