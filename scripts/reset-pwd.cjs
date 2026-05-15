const bcrypt = require('bcryptjs');
const db = require('better-sqlite3')('./data.db');
const hash = bcrypt.hashSync('1234', 10);
const r = db.prepare('UPDATE users SET password = ? WHERE email = ?').run(hash, 'eduardodominikus@hotmail.com');
console.log('Rows updated:', r.changes);
db.close();
