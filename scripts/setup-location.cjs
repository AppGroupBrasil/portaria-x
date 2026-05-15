const db = require('better-sqlite3')('./data.db');

// Set location (São Paulo - Av. Paulista) for condominio_id = 1
db.prepare("UPDATE condominios SET latitude = -23.5615, longitude = -46.6559, updated_at = datetime('now') WHERE id = 1").run();

// Enable estou_chegando + set config
const upsert = db.prepare("INSERT INTO condominio_config (condominio_id, key, value) VALUES (?, ?, ?) ON CONFLICT(condominio_id, key) DO UPDATE SET value = excluded.value");
upsert.run(1, 'estou_chegando_enabled', 'true');
upsert.run(1, 'estou_chegando_horario_inicio', '00:00');
upsert.run(1, 'estou_chegando_horario_fim', '23:59');
upsert.run(1, 'estou_chegando_radius', '500');

// Verify
const condo = db.prepare('SELECT id, name, latitude, longitude FROM condominios WHERE id = 1').get();
console.log('Condomínio:', condo);

const configs = db.prepare("SELECT key, value FROM condominio_config WHERE condominio_id = 1 AND key LIKE 'estou_chegando%'").all();
console.log('Configs:', configs);

console.log('\nLocalização configurada com sucesso!');
console.log('Lat: -23.5615, Lng: -46.6559 (São Paulo - Av. Paulista)');
console.log('Raio: 500m, Horário: 00:00 - 23:59, Habilitado: true');
