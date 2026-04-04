const db = require('better-sqlite3')('./data.db');

const SOURCE_ID = 1; // Condomínio Exemplo
const sourceRows = db.prepare('SELECT key, value FROM condominio_config WHERE condominio_id = ?').all(SOURCE_ID);
console.log(`Config padrão (Condomínio Exemplo): ${sourceRows.length} chaves`);

const condos = db.prepare('SELECT id, name FROM condominios WHERE id != ? AND id != 0').all(SOURCE_ID);
console.log(`Condomínios para aplicar: ${condos.map(c => c.name).join(', ')}`);

const upsert = db.prepare(`
  INSERT INTO condominio_config (condominio_id, key, value, updated_at)
  VALUES (?, ?, ?, datetime('now'))
  ON CONFLICT(condominio_id, key)
  DO UPDATE SET value = excluded.value, updated_at = datetime('now')
`);

const tx = db.transaction(() => {
  for (const condo of condos) {
    let applied = 0;
    for (const row of sourceRows) {
      upsert.run(condo.id, row.key, row.value);
      applied++;
    }
    console.log(`  -> ${condo.name} (id=${condo.id}): ${applied} configs aplicadas`);
  }
});

tx();
console.log('DONE! Config padrão aplicada a todos os condomínios.');
