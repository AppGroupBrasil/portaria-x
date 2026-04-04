import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import db, { type DbUser, type DbCondominio } from "./db.js";
import { authenticate } from "./middleware.js";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-production-32chars!!";
const COOKIE_NAME = "session_token";
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

function signToken(userId: number): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "7d" });
}

function sanitizeUser(user: DbUser) {
  let condominioNome: string | null = null;
  if (user.condominio_id) {
    const condo = db.prepare("SELECT name FROM condominios WHERE id = ?").get(user.condominio_id) as { name: string } | undefined;
    condominioNome = condo?.name || null;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    cpf: user.cpf,
    role: user.role,
    perfil: user.perfil,
    unit: user.unit,
    block: user.block,
    condominioId: user.condominio_id,
    condominio_nome: condominioNome,
    parent_administradora_id: user.parent_administradora_id || null,
    avatarUrl: user.avatar_url,
    aprovado: (user as any).aprovado ?? 1,
  };
}

function setCookie(res: any, token: string) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
}

// ─── SEARCH CONDOMÍNIO BY CNPJ ────────────────────────────────────────────
router.get("/condominio/search", (req, res) => {
  try {
    const { cnpj } = req.query;
    if (!cnpj || typeof cnpj !== "string") {
      res.status(400).json({ error: "Informe o CNPJ." });
      return;
    }

    const cleanCnpj = cnpj.replaceAll(/\D/g, "");
    if (cleanCnpj.length !== 14) {
      res.status(400).json({ error: "CNPJ deve ter 14 dígitos." });
      return;
    }

    const condo = db.prepare("SELECT * FROM condominios WHERE cnpj = ?").get(cleanCnpj) as DbCondominio | undefined;
    if (!condo) {
      res.status(404).json({ error: "Condomínio não encontrado. Verifique o CNPJ." });
      return;
    }

    const blocks = db.prepare("SELECT id, name FROM blocks WHERE condominio_id = ? ORDER BY name").all(condo.id) as { id: number; name: string }[];

    res.json({
      condominio: {
        id: condo.id,
        name: condo.name,
        address: condo.address,
        city: condo.city,
        state: condo.state,
        blocks: blocks.map((b) => b.name),
      },
    });
  } catch (err) {
    console.error("Condominio search error:", err);
    res.status(500).json({ error: "Erro interno do servidor." });
  }
});

// ─── REGISTER MORADOR ────────────────────────────────────
router.post("/register/morador", async (req, res) => {
  try {
    const { name, email, phone, perfil, password, unit, block, condominioId } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ error: "Nome, e-mail e senha são obrigatórios." });
      return;
    }
    if (!/^\d{6}$/.test(password)) {
      res.status(400).json({ error: "Senha deve ter exatamente 6 dígitos numéricos." });
      return;
    }

    const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email.toLowerCase().trim());
    if (existing) {
      res.status(409).json({ error: "Este e-mail já está cadastrado." });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    // Check if auto-cadastro requires approval for this condomínio
    let needsApproval = false;
    if (condominioId) {
      const configRow = db.prepare(
        "SELECT value FROM condominio_config WHERE condominio_id = ? AND key = 'feature_auto_cadastro'"
      ).get(condominioId) as { value: string } | undefined;
      if (configRow?.value === "true") {
        needsApproval = true;
      }
    }

    const result = db.prepare(
      "INSERT INTO users (name, email, phone, perfil, password, role, unit, block, condominio_id, aprovado) VALUES (?, ?, ?, ?, ?, 'morador', ?, ?, ?, ?)"
    ).run(
      name.trim(),
      email.toLowerCase().trim(),
      phone?.replaceAll(/\D/g, "") || null,
      perfil || null,
      hashedPassword,
      unit?.trim() || null,
      block?.trim() || null,
      condominioId || null,
      needsApproval ? 0 : 1
    );

    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(result.lastInsertRowid) as DbUser;

    if (needsApproval) {
      res.json({
        pendingApproval: true,
        message: "Cadastro realizado com sucesso! Aguarde a aprovação do síndico ou administradora para acessar o sistema.",
      });
      return;
    }

    const token = signToken(user.id);
    setCookie(res, token);
    res.json({ user: sanitizeUser(user), token });
  } catch (err) {
    console.error("Register morador error:", err);
    res.status(500).json({ error: "Erro interno do servidor." });
  }
});

// ─── REGISTER CONDOMÍNIO ─────────────────────────────────
router.post("/register/condominio", async (req, res) => {
  try {
    const { condominioName, cnpj, address, city, state, zipCode, unitsCount, adminName, email, phone, password } = req.body;

    if (!condominioName || !adminName || !email || !password) {
      res.status(400).json({ error: "Nome do condomínio, responsável, e-mail e senha são obrigatórios." });
      return;
    }
    if (!/^\d{6}$/.test(password)) {
      res.status(400).json({ error: "Senha deve ter exatamente 6 dígitos numéricos." });
      return;
    }

    const existingUser = db.prepare("SELECT id FROM users WHERE email = ?").get(email.toLowerCase().trim());
    if (existingUser) {
      res.status(409).json({ error: "Este e-mail já está cadastrado." });
      return;
    }

    if (cnpj) {
      const existingCondo = db.prepare("SELECT id FROM condominios WHERE cnpj = ?").get(cnpj.replaceAll(/\D/g, ""));
      if (existingCondo) {
        res.status(409).json({ error: "Este CNPJ já está cadastrado." });
        return;
      }
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const condoResult = db.prepare(
      "INSERT INTO condominios (name, cnpj, address, city, state, zip_code, units_count) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run(
      condominioName.trim(),
      cnpj?.replaceAll(/\D/g, "") || null,
      address?.trim() || null,
      city?.trim() || null,
      state?.trim() || null,
      zipCode?.replaceAll(/\D/g, "") || null,
      unitsCount ? Number.parseInt(unitsCount) : 0
    );

    const userResult = db.prepare(
      "INSERT INTO users (name, email, phone, password, role, condominio_id) VALUES (?, ?, ?, ?, 'sindico', ?)"
    ).run(
      adminName.trim(),
      email.toLowerCase().trim(),
      phone?.replaceAll(/\D/g, "") || null,
      hashedPassword,
      condoResult.lastInsertRowid
    );

    db.prepare("UPDATE condominios SET admin_user_id = ? WHERE id = ?").run(
      userResult.lastInsertRowid,
      condoResult.lastInsertRowid
    );

    // Auto-create a demo resident account
    let samplePorteiroData: { email: string; name: string; cargo: string } | null = null;
    try {
      const sampleEmail = `morador.exemplo.${condoResult.lastInsertRowid}@demo.app`;
      db.prepare(
        `INSERT INTO users (name, email, phone, password, role, unit, block, condominio_id, is_demo)
         VALUES (?, ?, ?, ?, 'morador', ?, ?, ?, 1)`
      ).run("Morador Exemplo", sampleEmail, phone?.replaceAll(/\D/g, "") || null, hashedPassword, "101", "A", condoResult.lastInsertRowid);
    } catch (sampleErr) {
      console.warn("[REGISTER] Falha ao criar morador exemplo:", sampleErr);
    }

    // Auto-create a demo porteiro account
    try {
      const porteiroEmail = `porteiro.exemplo.${condoResult.lastInsertRowid}@demo.app`;
      db.prepare(
        `INSERT INTO users (name, email, phone, password, role, condominio_id, is_demo)
         VALUES (?, ?, ?, ?, 'funcionario', ?, 1)`
      ).run("Porteiro Exemplo", porteiroEmail, phone?.replaceAll(/\D/g, "") || null, hashedPassword, condoResult.lastInsertRowid);
      samplePorteiroData = { email: porteiroEmail, name: "Porteiro Exemplo", cargo: "Porteiro" };
    } catch (porteiroErr) {
      console.warn("[REGISTER] Falha ao criar porteiro exemplo:", porteiroErr);
    }

    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userResult.lastInsertRowid) as DbUser;
    const token = signToken(user.id);
    setCookie(res, token);

    res.json({
      user: sanitizeUser(user),
      token,
      sampleMorador: {
        email: `morador.exemplo.${condoResult.lastInsertRowid}@demo.app`,
        name: "Morador Exemplo",
        block: "A",
        unit: "101",
        phone: phone?.replaceAll(/\D/g, "") || null,
        message: "Acesso de morador de exemplo criado automaticamente."
      },
      samplePorteiro: samplePorteiroData ? {
        email: samplePorteiroData.email,
        name: samplePorteiroData.name,
        cargo: samplePorteiroData.cargo,
        phone: phone?.replaceAll(/\D/g, "") || null,
        message: "Acesso de porteiro de exemplo criado automaticamente."
      } : null
    });
  } catch (err) {
    console.error("Register condominio error:", err);
    res.status(500).json({ error: "Erro interno do servidor." });
  }
});

// ─── FUNCIONÁRIO LOGIN HANDLER ────────────────────────────
async function handleFuncionarioLogin(credential: string, password: string, res: any) {
  const func = db.prepare("SELECT * FROM funcionarios WHERE login = ?").get(credential) as any;
  if (!func) {
    res.status(401).json({ error: "Login ou senha incorretos." });
    return;
  }

  const valid = await bcrypt.compare(password, func.password);
  if (!valid) {
    res.status(401).json({ error: "Login ou senha incorretos." });
    return;
  }

  if (func.condominio_id) {
    const condo = db.prepare("SELECT bloqueado, bloqueado_motivo, name FROM condominios WHERE id = ?")
      .get(func.condominio_id) as { bloqueado: number; bloqueado_motivo: string | null; name: string } | undefined;
    if (condo?.bloqueado === 1) {
      res.status(403).json({
        error: "Usuário bloqueado! Entre em contato com seu síndico ou administradora.",
        blocked: true,
      });
      return;
    }
  }

  db.prepare("UPDATE funcionarios SET updated_at = datetime('now') WHERE id = ?").run(func.id);

  if (func.condominio_id) {
    db.prepare(`
      UPDATE condominios
      SET last_access_at = datetime('now'),
          access_count = COALESCE(access_count, 0) + 1
      WHERE id = ?
    `).run(func.condominio_id);
  }

  const token = jwt.sign({ funcId: func.id }, JWT_SECRET, { expiresIn: "7d" });

  let condominioNome: string | null = null;
  if (func.condominio_id) {
    const condo = db.prepare("SELECT name FROM condominios WHERE id = ?").get(func.condominio_id) as { name: string } | undefined;
    condominioNome = condo?.name || null;
  }

  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });

  res.json({
    user: {
      id: func.id,
      name: `${func.nome} ${func.sobrenome}`,
      email: func.login,
      phone: null,
      cpf: null,
      role: "funcionario",
      perfil: func.cargo,
      unit: null,
      block: null,
      condominioId: func.condominio_id,
      condominio_nome: condominioNome,
      parent_administradora_id: null,
      avatarUrl: null,
      aprovado: 1,
    },
    token,
  });
}

// ─── LOGIN ───────────────────────────────────────────────
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: "E-mail/login e senha são obrigatórios." });
      return;
    }

    const credential = email.toLowerCase().trim();
    const isEmail = credential.includes("@");

    // ─── FUNCIONÁRIO LOGIN (sem @) ─────────────────────────
    if (!isEmail) {
      await handleFuncionarioLogin(credential, password, res);
      return;
    }

    // ─── USER LOGIN (com @) ────────────────────────────────
    const user = db
      .prepare("SELECT * FROM users WHERE email = ?")
      .get(credential) as DbUser | undefined;

    if (!user) {
      res.status(401).json({ error: "E-mail ou senha incorretos." });
      return;
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      res.status(401).json({ error: "E-mail ou senha incorretos." });
      return;
    }

    if (user.condominio_id && user.role !== "master") {
      const condo = db.prepare("SELECT bloqueado, bloqueado_motivo, name FROM condominios WHERE id = ?")
        .get(user.condominio_id) as { bloqueado: number; bloqueado_motivo: string | null; name: string } | undefined;
      if (condo?.bloqueado === 1) {
        res.status(403).json({
          error: "Usuário bloqueado! Entre em contato com seu síndico ou administradora.",
          blocked: true,
        });
        return;
      }
    }

    if (user.role === "morador" && (user as any).aprovado === 0) {
      res.status(403).json({
        error: "Seu cadastro ainda está aguardando aprovação do síndico ou administradora.",
        pendingApproval: true,
      });
      return;
    }

    db.prepare("UPDATE users SET updated_at = datetime('now') WHERE id = ?").run(user.id);

    if (user.condominio_id) {
      db.prepare(`
        UPDATE condominios
        SET last_access_at = datetime('now'),
            access_count = COALESCE(access_count, 0) + 1
        WHERE id = ?
      `).run(user.condominio_id);
    }

    const token = signToken(user.id);

    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: COOKIE_MAX_AGE,
      path: "/",
    });

    res.json({ user: sanitizeUser(user), token });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Erro interno do servidor." });
  }
});

// ─── ME (Check session) ─────────────────────────────────
router.get("/me", (req, res) => {
  try {
    let token: string | undefined;
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      token = authHeader.slice(7);
    }
    if (!token) {
      token = req.cookies?.[COOKIE_NAME];
    }
    if (!token) {
      res.status(401).json({ error: "Não autenticado." });
      return;
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { userId?: number; funcId?: number };

    // Handle funcionario token
    if (decoded.funcId) {
      const func = db.prepare("SELECT * FROM funcionarios WHERE id = ?").get(decoded.funcId) as any;
      if (!func) {
        res.clearCookie(COOKIE_NAME);
        res.status(401).json({ error: "Funcionário não encontrado." });
        return;
      }
      let condominioNome: string | null = null;
      if (func.condominio_id) {
        const condo = db.prepare("SELECT name FROM condominios WHERE id = ?").get(func.condominio_id) as { name: string } | undefined;
        condominioNome = condo?.name || null;
      }
      res.json({
        user: {
          id: func.id,
          name: `${func.nome} ${func.sobrenome}`,
          email: func.login,
          phone: null,
          cpf: null,
          role: "funcionario",
          perfil: func.cargo,
          unit: null,
          block: null,
          condominioId: func.condominio_id,
          condominio_nome: condominioNome,
          parent_administradora_id: null,
          avatarUrl: null,
          aprovado: 1,
        },
      });
      return;
    }

    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(decoded.userId) as DbUser | undefined;

    if (!user) {
      res.clearCookie(COOKIE_NAME);
      res.status(401).json({ error: "Usuário não encontrado." });
      return;
    }

    res.json({ user: sanitizeUser(user) });
  } catch {
    res.clearCookie(COOKIE_NAME);
    res.status(401).json({ error: "Sessão inválida." });
  }
});

// ─── LOGOUT ──────────────────────────────────────────────
router.post("/logout", (_req, res) => {
  res.clearCookie(COOKIE_NAME, { path: "/" });
  res.json({ success: true });
});

// ─── UPDATE MY ACCOUNT ──────────────────────────────────
router.put("/account", authenticate, async (req, res) => {
  try {
    const user = req.user;
    const { name, phone, email, block, unit } = req.body;

    if (!name?.trim()) {
      res.status(400).json({ error: "Nome é obrigatório." });
      return;
    }

    if (email && email !== user.email) {
      const existing = db.prepare("SELECT id FROM users WHERE email = ? AND id != ?").get(email, user.id) as any;
      if (existing) {
        res.status(400).json({ error: "Este e-mail já está em uso." });
        return;
      }
    }

    db.prepare(
      "UPDATE users SET name = ?, phone = ?, email = ?, block = ?, unit = ? WHERE id = ?"
    ).run(name.trim(), phone || null, email || user.email, block ?? user.block, unit ?? user.unit, user.id);

    const updated = db.prepare("SELECT * FROM users WHERE id = ?").get(user.id) as DbUser;
    res.json({ user: sanitizeUser(updated), message: "Dados atualizados com sucesso." });
  } catch (err: any) {
    console.error("Erro em auth:", err);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// ─── CHANGE PASSWORD ─────────────────────────────────────
router.put("/account/password", authenticate, async (req, res) => {
  try {
    const user = req.user;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      res.status(400).json({ error: "Senha atual e nova senha são obrigatórias." });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({ error: "A nova senha deve ter pelo menos 6 caracteres." });
      return;
    }

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) {
      res.status(400).json({ error: "Senha atual incorreta." });
      return;
    }

    const hash = await bcrypt.hash(newPassword, 10);
    db.prepare("UPDATE users SET password = ? WHERE id = ?").run(hash, user.id);

    res.json({ message: "Senha alterada com sucesso." });
  } catch (err: any) {
    console.error("Erro em auth:", err);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// ─── DELETE MY ACCOUNT (morador only) ────────────────────
router.delete("/account", authenticate, (req, res) => {
  try {
    const user = req.user;

    if (user.role !== "morador") {
      res.status(403).json({ error: "Apenas moradores podem excluir sua própria conta." });
      return;
    }

    db.prepare("DELETE FROM users WHERE id = ?").run(user.id);
    res.clearCookie(COOKIE_NAME, { path: "/" });
    res.json({ message: "Conta excluída com sucesso." });
  } catch (err: any) {
    console.error("Erro em auth:", err);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

export default router;
