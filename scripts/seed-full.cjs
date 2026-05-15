const bcrypt = require('bcryptjs');
const db = require('better-sqlite3')('./data.db');

// Criar condomínio
const condo = db.prepare(
  "INSERT OR IGNORE INTO condominios (name, cnpj, address, city, state) VALUES (?, ?, ?, ?, ?)"
).run('Condomínio Exemplo', '12345678910111', 'Rua das Flores, 100', 'São Paulo', 'SP');
const condoId = condo.lastInsertRowid || db.prepare("SELECT id FROM condominios WHERE cnpj='12345678910111'").get().id;

// Criar blocos
const insertBlock = db.prepare("INSERT OR IGNORE INTO blocks (condominio_id, name) VALUES (?, ?)");
insertBlock.run(condoId, 'Bloco A');
insertBlock.run(condoId, 'Bloco B');
insertBlock.run(condoId, 'Bloco C');

// Criar usuário MASTER (Admin Master - vê tudo, pode tudo)
const hash = bcrypt.hashSync('1234', 10);
const existing = db.prepare("SELECT id FROM users WHERE email = ?").get('eduardodominikus@hotmail.com');
if (!existing) {
  db.prepare(
    "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)"
  ).run('Eduardo', 'eduardodominikus@hotmail.com', hash, 'master');
  console.log('Admin Master criado com sucesso!');
} else {
  db.prepare("UPDATE users SET password = ?, role = 'master' WHERE email = ?").run(hash, 'eduardodominikus@hotmail.com');
  console.log('Admin Master atualizado (role=master)!');
}

// Criar síndico de exemplo vinculado ao condomínio
const sindicoEmail = 'sindico@exemplo.com';
const existingSindico = db.prepare("SELECT id FROM users WHERE email = ?").get(sindicoEmail);
if (!existingSindico) {
  db.prepare(
    "INSERT INTO users (name, email, password, role, condominio_id) VALUES (?, ?, ?, ?, ?)"
  ).run('Carlos Síndico', sindicoEmail, hash, 'sindico', condoId);
  console.log('Síndico de exemplo criado (sindico@exemplo.com / 1234)');
}

// Vincular condomínio ao síndico
const sindico = db.prepare("SELECT id FROM users WHERE email = ?").get(sindicoEmail);
if (sindico) {
  db.prepare("UPDATE condominios SET admin_user_id = ? WHERE id = ?").run(sindico.id, condoId);
}

// Criar administradora de exemplo
const adminEmail = 'administradora@exemplo.com';
const existingAdmin = db.prepare("SELECT id FROM users WHERE email = ?").get(adminEmail);
if (!existingAdmin) {
  db.prepare(
    "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)"
  ).run('Maria Administradora', adminEmail, hash, 'administradora');
  console.log('Administradora criada (administradora@exemplo.com / 1234)');
}

// Criar funcionário de exemplo vinculado ao condomínio
const funcEmail = 'funcionario@exemplo.com';
const existingFunc = db.prepare("SELECT id FROM users WHERE email = ?").get(funcEmail);
if (!existingFunc) {
  db.prepare(
    "INSERT INTO users (name, email, password, role, condominio_id) VALUES (?, ?, ?, ?, ?)"
  ).run('João Funcionário', funcEmail, hash, 'funcionario', condoId);
  console.log('Funcionário criado (funcionario@exemplo.com / 1234)');
}

// Criar morador de exemplo vinculado ao condomínio
const moradorEmail = 'morador@exemplo.com';
const existingMorador = db.prepare("SELECT id FROM users WHERE email = ?").get(moradorEmail);
if (!existingMorador) {
  db.prepare(
    "INSERT INTO users (name, email, password, role, perfil, unit, block, condominio_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  ).run('Ana Moradora', moradorEmail, hash, 'morador', 'proprietario', '101', 'Bloco A', condoId);
  console.log('Morador criado (morador@exemplo.com / 1234)');
}

db.close();
console.log('\nSeed completo! Logins disponíveis:');
console.log('  Master:         eduardodominikus@hotmail.com / 1234');
console.log('  Administradora: administradora@exemplo.com / 1234');
console.log('  Síndico:        sindico@exemplo.com / 1234');
console.log('  Funcionário:    funcionario@exemplo.com / 1234');
console.log('  Morador:        morador@exemplo.com / 1234');
