const bcrypt = require('bcryptjs');
const db = require('better-sqlite3')('/app/data/data.db');
const hash = bcrypt.hashSync('123456', 10);
const r = db.prepare('UPDATE users SET password = ?').run(hash);
console.log('Produção:', r.changes, 'usuarios atualizados');
db.close();
