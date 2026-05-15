const Database = require('better-sqlite3');
const db = new Database('./data.db');
const upsert = db.prepare(`INSERT INTO system_config (key, value, updated_at) VALUES (?, ?, datetime('now')) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`);
upsert.run('gate_ewelink_appid', 'ZoSZxwCeqNPjHsi7ZytEA7u72vQxDn73');
upsert.run('gate_ewelink_appsecret', '6jcUWVujn8K24RgC7FHWehs87xsH4R9n');
upsert.run('gate_ewelink_email', 'eduardodominikus@hotmail.com');
upsert.run('gate_ewelink_password', '4Dudaedom');
upsert.run('gate_ewelink_region', 'us');
console.log('Credenciais eWeLink inseridas!');
const rows = db.prepare(`SELECT key, value FROM system_config WHERE key LIKE 'gate_ewelink_%'`).all();
rows.forEach(r => {
  const masked = r.key.includes('secret') || r.key.includes('password') ? '****' : r.value;
  console.log(`  ${r.key} = ${masked}`);
});
db.close();
