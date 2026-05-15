const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, 'data.db'));

// Check users table columns
console.log("=== USERS TABLE COLUMNS ===");
const cols = db.prepare('PRAGMA table_info(users)').all();
cols.forEach(c => console.log(`  ${c.name} (${c.type})`));

// Check if perfil column exists
const hasPerfil = cols.some(c => c.name === 'perfil');
console.log("\nHas 'perfil' column:", hasPerfil);

// Check if parent_administradora_id column exists
const hasParentAdmin = cols.some(c => c.name === 'parent_administradora_id');
console.log("Has 'parent_administradora_id' column:", hasParentAdmin);

// Check if updated_at column exists
const hasUpdatedAt = cols.some(c => c.name === 'updated_at');
console.log("Has 'updated_at' column:", hasUpdatedAt);

// Try the exact query from master.ts GET /users
console.log("\n=== TESTING MASTER USERS QUERY ===");
try {
  // Simulate administradora user
  const admins = db.prepare("SELECT id, name, role, condominio_id, parent_administradora_id FROM users WHERE role = 'administradora' LIMIT 1").all();
  console.log("Administradora users:", admins);
  
  if (admins.length > 0) {
    const user = admins[0];
    const adminId = user.parent_administradora_id || user.id;
    
    console.log("\nAdmin ID for group:", adminId);
    
    const groupIds = db.prepare(
      "SELECT id FROM users WHERE (id = ? OR parent_administradora_id = ?) AND role = 'administradora'"
    ).all(adminId, adminId);
    console.log("Group IDs:", groupIds);
    
    const allAdminIds = groupIds.map(r => r.id);
    if (allAdminIds.length === 0) allAdminIds.push(adminId);
    
    const ph = allAdminIds.map(() => "?").join(",");
    const condoIds = db.prepare(
      `SELECT id FROM condominios WHERE administradora_id IN (${ph})`
    ).all(...allAdminIds);
    console.log("Condo IDs:", condoIds);
    
    // Now try the full query
    let where = "1=1 AND role != 'master' AND role != 'administradora'";
    const params = [];
    
    if (condoIds.length > 0) {
      const condoPlaceholders = condoIds.map(() => "?").join(",");
      where += ` AND condominio_id IN (${condoPlaceholders})`;
      params.push(...condoIds.map(c => c.id));
    } else {
      where += " AND 1=0";
    }
    
    console.log("\nWHERE clause:", where);
    console.log("Params:", params);
    
    const query = `SELECT u.id, u.name, u.email, u.phone, u.cpf, u.role, u.perfil, u.unit, u.block,
              u.condominio_id, u.parent_administradora_id, u.created_at, u.updated_at,
              c.name as condominio_nome,
              pa.name as parent_administradora_nome
       FROM users u
       LEFT JOIN condominios c ON u.condominio_id = c.id
       LEFT JOIN users pa ON u.parent_administradora_id = pa.id
       WHERE ${where}
       ORDER BY u.created_at DESC
       LIMIT 20 OFFSET 0`;
    
    console.log("\nQuery:", query);
    const users = db.prepare(query).all(...params);
    console.log("Result count:", users.length);
  }
} catch (err) {
  console.log("ERROR:", err.message);
}

// Also check funcionarios and their condominio_ids
console.log("\n=== FUNCIONARIOS DATA ===");
const funcs = db.prepare('SELECT id, nome, sobrenome, login, condominio_id FROM funcionarios').all();
console.log("Funcionarios:", funcs);

// Check condominios
console.log("\n=== CONDOMINIOS ===");
const condos = db.prepare('SELECT id, name, administradora_id FROM condominios').all();
console.log("Condominios:", condos);

db.close();
