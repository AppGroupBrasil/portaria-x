const Database = require('better-sqlite3');
const db = new Database('./data.db');

db.prepare("INSERT INTO condominios (name, cnpj, address, city, state) VALUES (?, ?, ?, ?, ?)")
  .run('Condomínio Exemplo', '12345678910111', 'Rua das Flores, 100', 'São Paulo', 'SP');

const condo = db.prepare("SELECT id FROM condominios WHERE cnpj = ?").get('12345678910111');

db.prepare("INSERT INTO blocks (condominio_id, name) VALUES (?, ?)").run(condo.id, 'Bloco A');
db.prepare("INSERT INTO blocks (condominio_id, name) VALUES (?, ?)").run(condo.id, 'Bloco B');
db.prepare("INSERT INTO blocks (condominio_id, name) VALUES (?, ?)").run(condo.id, 'Bloco C');

console.log('Condomínio Exemplo inserido com sucesso! ID:', condo.id);
db.close();
