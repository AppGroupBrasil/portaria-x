import { Router } from "express";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import db, { type DbUser } from "./db.js";
import { JWT_SECRET } from "./jwtSecret.js";
import { logger } from "./logger.js";

// ─────────────────────────────────────────────────────────────────────────────
// SSO da central (App Condomínio) — login único.
// A central assina o token com a chave PRIVADA (RS256); aqui verificamos só pela
// chave PÚBLICA do JWKS — não há segredo a vazar. O usuário cadastrado na central
// é a fonte única da verdade: a cada acesso regravamos (read-only) os dados dele.
// ─────────────────────────────────────────────────────────────────────────────

const router = Router();
const COOKIE_NAME = "session_token";
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 dias
const ISS = "auth-central";
const AUDIENCE = process.env.SSO_AUDIENCE || "portaria-x";
const JWKS_URL = process.env.SSO_JWKS_URL || "https://auth.appgroupbrasil.com.br/api/v1/sso/jwks.json";

type Jwk = { kid?: string; kty: string; n: string; e: string; alg?: string };
let jwksCache: { keys: Jwk[]; pems: Map<string, string> } | null = null;
let jwksCacheAt = 0;
const JWKS_TTL = 5 * 60 * 1000;

async function carregarJwks(): Promise<Map<string, string>> {
  if (jwksCache && Date.now() - jwksCacheAt < JWKS_TTL) return jwksCache.pems;
  const res = await fetch(JWKS_URL, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`JWKS ${res.status}`);
  const body = (await res.json()) as { keys: Jwk[] };
  const pems = new Map<string, string>();
  for (const k of body.keys || []) {
    if (k.kty !== "RSA") continue;
    const pem = crypto.createPublicKey({ key: k as any, format: "jwk" }).export({ type: "spki", format: "pem" }) as string;
    pems.set(k.kid || "default", pem);
  }
  jwksCache = { keys: body.keys || [], pems };
  jwksCacheAt = Date.now();
  return pems;
}

function lerKid(token: string): string | null {
  try {
    const [h] = token.split(".");
    const head = JSON.parse(Buffer.from(h, "base64url").toString("utf8"));
    return head.kid || null;
  } catch {
    return null;
  }
}

export interface SsoClaims {
  sub: string;
  email: string;
  nome: string;
  cpf?: string | null;
  telefone?: string | null;
  perfil?: string | null;
  condominio_id?: string | null;
  condominio_nome?: string | null;
  unidade?: string | null;
  bloco?: string | null;
}

async function verificarSso(token: string): Promise<SsoClaims> {
  const pems = await carregarJwks();
  const kid = lerKid(token);
  const candidatos = kid && pems.has(kid) ? [pems.get(kid)!] : [...pems.values()];
  if (candidatos.length === 0) throw new Error("JWKS sem chave RSA");
  let ultimoErro: any;
  for (const pem of candidatos) {
    try {
      return jwt.verify(token, pem, {
        algorithms: ["RS256"],
        issuer: ISS,
        audience: AUDIENCE,
      }) as unknown as SsoClaims;
    } catch (e) {
      ultimoErro = e;
    }
  }
  throw ultimoErro || new Error("assinatura inválida");
}

// central perfil → role do Portaria X
function mapRole(perfil?: string | null): string {
  switch ((perfil || "").toLowerCase()) {
    case "gestor":
    case "sindico":
    case "síndico":
      return "sindico";
    case "funcionario":
    case "funcionário":
      return "funcionario";
    default:
      return "morador";
  }
}

/** Garante o condomínio local espelhando o da central (chave = central_uuid). */
function resolverCondominio(claims: SsoClaims): number | null {
  if (!claims.condominio_id) return null;
  const nome = claims.condominio_nome || "Condomínio";
  const existente = db
    .prepare("SELECT id FROM condominios WHERE central_uuid = ?")
    .get(claims.condominio_id) as { id: number } | undefined;
  if (existente) {
    db.prepare("UPDATE condominios SET name = ?, updated_at = datetime('now') WHERE id = ?").run(nome, existente.id);
    return existente.id;
  }
  const r = db
    .prepare("INSERT INTO condominios (name, central_uuid) VALUES (?, ?)")
    .run(nome, claims.condominio_id);
  return r.lastInsertRowid as number;
}

/** Upsert read-only do usuário pelos claims da central. Retorna o usuário local. */
function provisionarUsuario(claims: SsoClaims): DbUser {
  const role = mapRole(claims.perfil);
  const condominioId = resolverCondominio(claims);
  const email = (claims.email || "").toLowerCase().trim();
  const phone = claims.telefone ? String(claims.telefone).replaceAll(/\D/g, "") || null : null;

  // 1) já vinculado pelo central_uuid
  let user = db.prepare("SELECT * FROM users WHERE central_uuid = ?").get(claims.sub) as DbUser | undefined;

  // 2) legado: mesmo e-mail, ainda sem vínculo → adota
  if (!user && email) {
    const porEmail = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as DbUser | undefined;
    if (porEmail) {
      db.prepare("UPDATE users SET central_uuid = ? WHERE id = ?").run(claims.sub, porEmail.id);
      user = porEmail;
    }
  }

  if (user) {
    db.prepare(
      `UPDATE users SET name = ?, email = ?, phone = ?, cpf = ?, role = ?, perfil = ?,
        unit = ?, block = ?, condominio_id = ?, central_uuid = ?, updated_at = datetime('now') WHERE id = ?`
    ).run(
      claims.nome,
      email,
      phone,
      claims.cpf || null,
      role,
      claims.perfil || null,
      claims.unidade || null,
      claims.bloco || null,
      condominioId,
      claims.sub,
      user.id
    );
  } else {
    // senha inutilizável: usuário SSO não loga por senha (bcrypt.compare nunca casa)
    const senhaInutil = `sso:${crypto.randomBytes(18).toString("hex")}`;
    const r = db
      .prepare(
        `INSERT INTO users (name, email, phone, cpf, password, role, perfil, unit, block, condominio_id, central_uuid)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        claims.nome,
        email,
        phone,
        claims.cpf || null,
        senhaInutil,
        role,
        claims.perfil || null,
        claims.unidade || null,
        claims.bloco || null,
        condominioId,
        claims.sub
      );
    user = db.prepare("SELECT * FROM users WHERE id = ?").get(r.lastInsertRowid) as DbUser;
  }

  // síndico sem admin definido → assume a administração do condomínio
  if (condominioId && role === "sindico") {
    const condo = db.prepare("SELECT admin_user_id FROM condominios WHERE id = ?").get(condominioId) as
      | { admin_user_id: number | null }
      | undefined;
    if (condo && !condo.admin_user_id) {
      db.prepare("UPDATE condominios SET admin_user_id = ? WHERE id = ?").run(user.id, condominioId);
    }
  }

  return user;
}

// GET /sso?token=...  (navegação top-level vinda do hub App Condomínio)
router.get("/", async (req, res) => {
  const token = String(req.query.token || "");
  if (!token) {
    res.redirect("/login?sso=erro");
    return;
  }
  try {
    const claims = await verificarSso(token);
    const user = provisionarUsuario(claims);
    const appToken = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "7d" });
    res.cookie(COOKIE_NAME, appToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: COOKIE_MAX_AGE,
      path: "/",
    });
    res.redirect("/");
  } catch (err: any) {
    logger.error("[SSO] falha:", err?.message || err);
    res.redirect("/login?sso=invalido");
  }
});

export default router;
