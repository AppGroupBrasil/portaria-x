const db = require('better-sqlite3')('./data.db');
const bcrypt = require('bcryptjs');

// 1. Ativar feature_auto_cadastro no condominio 1
db.prepare(`INSERT INTO condominio_config (condominio_id, key, value, updated_at) VALUES (1, 'feature_auto_cadastro', 'true', datetime('now')) ON CONFLICT(condominio_id, key) DO UPDATE SET value='true', updated_at=datetime('now')`).run();
console.log('✔ feature_auto_cadastro ativado no condominio 1');

// 2. Criar moradores pendentes (aprovado=0)
const hash = bcrypt.hashSync('teste123', 10);

// Limpar anteriores
db.prepare("DELETE FROM users WHERE email IN ('morador.teste@teste.com','maria.teste@teste.com')").run();

db.prepare("INSERT INTO users (name, email, phone, password, role, unit, block, condominio_id, aprovado) VALUES (?,?,?,?,?,?,?,?,?)").run(
  'João Teste', 'morador.teste@teste.com', '11999998888', hash, 'morador', '101', 'A', 1, 0
);
console.log('✔ Morador pendente: João Teste (morador.teste@teste.com / teste123)');

db.prepare("INSERT INTO users (name, email, phone, password, role, unit, block, condominio_id, aprovado) VALUES (?,?,?,?,?,?,?,?,?)").run(
  'Maria Silva', 'maria.teste@teste.com', '11988887777', hash, 'morador', '205', 'B', 1, 0
);
console.log('✔ Morador pendente: Maria Silva (maria.teste@teste.com / teste123)');

// Verificar
const pending = db.prepare("SELECT id, name, email, aprovado FROM users WHERE aprovado=0").all();
console.log('\nPendentes de aprovação:', pending);
console.log('\nAgora abra http://localhost:5173/liberacao-cadastros para aprovar!');
