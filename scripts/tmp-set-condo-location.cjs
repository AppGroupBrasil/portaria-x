const Database = require('better-sqlite3');
const db = new Database('./data.db');

const latitude = 39.7405253;
const longitude = -8.8237948;
const address = 'Rua Inácia Cova n8 Casa 1';
const city = 'Leiria';
const state = 'Leiria';
const zipCode = '2400-019';
const targetCondoIds = [3, 4];

const upsert = db.prepare(`
  INSERT INTO condominio_config (condominio_id, key, value, updated_at)
  VALUES (?, ?, ?, datetime('now'))
  ON CONFLICT(condominio_id, key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
`);

const updateCondo = db.prepare(`
  UPDATE condominios
  SET latitude = ?, longitude = ?, address = ?, city = ?, state = ?, zip_code = ?, updated_at = datetime('now')
  WHERE id = ?
`);

for (const condoId of targetCondoIds) {
  updateCondo.run(latitude, longitude, address, city, state, zipCode, condoId);
  upsert.run(condoId, 'estou_chegando_enabled', 'true');
  upsert.run(condoId, 'estou_chegando_horario_inicio', '00:00');
  upsert.run(condoId, 'estou_chegando_horario_fim', '23:59');
  upsert.run(condoId, 'estou_chegando_radius', '100');
}

const rows = db.prepare('SELECT id, name, address, city, state, zip_code, latitude, longitude, updated_at FROM condominios WHERE id IN (3,4) ORDER BY id').all();
console.log(JSON.stringify(rows, null, 2));
db.close();
