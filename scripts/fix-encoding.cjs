const db = require('better-sqlite3')('./data.db');

// Fix corrupted perfil values
const fixes = {
  'Locat\uFFFDrio': 'Locatário',
  'Propriet\uFFFDrio': 'Proprietário',
  'Funcion\uFFFDrio': 'Funcionário',
  'Locat\uFFFDrio Tempor\uFFFDrio AirBnB': 'Locatário Temporário AirBnB',
};

let totalFixed = 0;
for (const [broken, correct] of Object.entries(fixes)) {
  const result = db.prepare("UPDATE users SET perfil = ? WHERE perfil = ?").run(correct, broken);
  if (result.changes > 0) {
    console.log(`Fixed ${result.changes} row(s): "${broken}" -> "${correct}"`);
    totalFixed += result.changes;
  }
}

// Also fix 'proprietario' (lowercase no accent from seed) to 'Proprietário'
const r2 = db.prepare("UPDATE users SET perfil = 'Proprietário' WHERE perfil = 'proprietario'").run();
if (r2.changes > 0) {
  console.log(`Fixed ${r2.changes} row(s): "proprietario" -> "Proprietário"`);
  totalFixed += r2.changes;
}

const r3 = db.prepare("UPDATE users SET perfil = 'Locatário' WHERE perfil = 'locatario'").run();
if (r3.changes > 0) {
  console.log(`Fixed ${r3.changes} row(s): "locatario" -> "Locatário"`);
  totalFixed += r3.changes;
}

const r4 = db.prepare("UPDATE users SET perfil = 'Funcionário' WHERE perfil = 'funcionario'").run();
if (r4.changes > 0) {
  console.log(`Fixed ${r4.changes} row(s): "funcionario" -> "Funcionário"`);
  totalFixed += r4.changes;
}

console.log(`\nTotal fixed: ${totalFixed}`);

// Verify
const rows = db.prepare("SELECT id, name, perfil FROM users WHERE role = 'morador'").all();
console.log('\nCurrent moradores:');
rows.forEach(r => console.log(`  ID ${r.id}: ${r.name} - perfil: ${r.perfil}`));

db.close();
