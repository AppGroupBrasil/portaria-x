const db = require('better-sqlite3')('./data.db');
const rows = db.prepare("SELECT id, name, perfil, hex(perfil) as hex_perfil FROM users WHERE role = 'morador'").all();
console.log(JSON.stringify(rows, null, 2));
db.close();
