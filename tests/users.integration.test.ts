import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";

const TEST_DB_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "portariax-test-users-"));
process.env.DB_DIR = TEST_DB_DIR;
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "x".repeat(48);
process.env.LOG_LEVEL = "silent";

let app: Awaited<ReturnType<typeof import("../server/app.js").createApp>>;
let db: any;
let adminAId: number;
let condoAId: number;
let condoBId: number;
let sindicoBId: number;

beforeAll(async () => {
  const { createApp } = await import("../server/app.js");
  app = await createApp();
  db = (await import("../server/db.js")).default;
  const bcrypt = (await import("bcryptjs")).default;
  const pass = bcrypt.hashSync("123456", 4);

  // Master
  db.prepare(
    "INSERT INTO users (name, email, phone, password, role) VALUES (?, ?, ?, ?, 'master')"
  ).run("Master", "u.master@test.local", "(11) 13000-9999", pass);

  // Administradora A
  adminAId = (db.prepare(
    "INSERT INTO users (name, email, phone, password, role) VALUES (?, ?, ?, ?, 'administradora')"
  ).run("Admin Users A", "u.admin.a@test.local", "(11) 13000-0001", pass).lastInsertRowid) as number;

  // Condo A (admin's) + Condo B (orphan)
  condoAId = (db.prepare("INSERT INTO condominios (name, cnpj, administradora_id) VALUES (?, ?, ?)")
    .run("Users Condo A", "18181818000123", adminAId).lastInsertRowid) as number;
  condoBId = (db.prepare("INSERT INTO condominios (name, cnpj) VALUES (?, ?)")
    .run("Users Condo B", "19191919000123").lastInsertRowid) as number;

  // Síndico do condo B (não pertence à admin A)
  sindicoBId = (db.prepare(
    "INSERT INTO users (name, email, phone, password, role, condominio_id) VALUES (?, ?, ?, ?, 'sindico', ?)"
  ).run("Síndico B Existente", "u.sindico.b@test.local", "(11) 13000-0002", pass, condoBId).lastInsertRowid) as number;
});

async function login(email: string) {
  const agent = request.agent(app);
  const r = await agent.post("/api/auth/login").send({ email, password: "123456" });
  expect(r.status).toBe(200);
  return agent;
}

describe("users administradora/síndico scoping", () => {
  it("administradora A só vê síndicos dos próprios condomínios", async () => {
    const agent = await login("u.admin.a@test.local");
    const res = await agent.get("/api/users/sindicos");
    expect(res.status).toBe(200);
    expect(res.body.find((s: any) => s.id === sindicoBId)).toBeUndefined();
  });

  it("master vê todos os síndicos", async () => {
    const agent = await login("u.master@test.local");
    const res = await agent.get("/api/users/sindicos");
    expect(res.status).toBe(200);
    expect(res.body.find((s: any) => s.id === sindicoBId)).toBeTruthy();
  });

  it("POST /users/sindico cria síndico no condomínio da admin", async () => {
    const agent = await login("u.admin.a@test.local");
    const res = await agent.post("/api/users/sindico").send({
      nome: "Novo Síndico",
      email: "novo.sindico@test.local",
      phone: "(11) 13000-1234",
      password: "654321",
      condominioId: condoAId,
    });
    expect(res.status).toBe(201);

    const row = db.prepare("SELECT condominio_id FROM users WHERE email = ?").get("novo.sindico@test.local") as any;
    expect(row.condominio_id).toBe(condoAId);
  });

  it("administradora NÃO consegue criar síndico em condomínio alheio → 403", async () => {
    const agent = await login("u.admin.a@test.local");
    const res = await agent.post("/api/users/sindico").send({
      nome: "Hack Sindico",
      email: "hack.sindico@test.local",
      phone: "(11) 13000-1235",
      password: "654321",
      condominioId: condoBId,
    });
    expect(res.status).toBe(403);
  });

  it("síndico (sem permissão) NÃO consegue listar síndicos → 403", async () => {
    const agent = await login("u.sindico.b@test.local");
    const res = await agent.get("/api/users/sindicos");
    expect(res.status).toBe(403);
  });

  it("síndico NÃO consegue criar administradora → 403", async () => {
    const agent = await login("u.sindico.b@test.local");
    const res = await agent.post("/api/users/administradora").send({
      name: "x", email: "x@x.com", phone: "y", password: "123456",
    });
    expect(res.status).toBe(403);
  });
});
