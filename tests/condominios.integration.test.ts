import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";

const TEST_DB_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "portariax-test-condo-"));
process.env.DB_DIR = TEST_DB_DIR;
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "x".repeat(48);
process.env.LOG_LEVEL = "silent";

let app: Awaited<ReturnType<typeof import("../server/app.js").createApp>>;
let db: any;
let condoAId: number;
let condoBId: number;

beforeAll(async () => {
  const { createApp } = await import("../server/app.js");
  app = await createApp();
  db = (await import("../server/db.js")).default;
  const bcrypt = (await import("bcryptjs")).default;
  const pass = bcrypt.hashSync("123456", 4);

  condoAId = (db.prepare("INSERT INTO condominios (name, cnpj) VALUES (?, ?)")
    .run("Condos Test A", "14141414000123").lastInsertRowid) as number;
  condoBId = (db.prepare("INSERT INTO condominios (name, cnpj) VALUES (?, ?)")
    .run("Condos Test B", "15151515000123").lastInsertRowid) as number;

  db.prepare(
    "INSERT INTO users (name, email, phone, password, role, condominio_id) VALUES (?, ?, ?, ?, 'sindico', ?)"
  ).run("Síndico C A", "cd.sindico.a@test.local", "(11) 99000-0001", pass, condoAId);
  db.prepare(
    "INSERT INTO users (name, email, phone, password, role, condominio_id) VALUES (?, ?, ?, ?, 'morador', ?)"
  ).run("Morador C A", "cd.morador.a@test.local", "(11) 99000-0002", pass, condoAId);
  // Master sem condominio
  db.prepare(
    "INSERT INTO users (name, email, phone, password, role) VALUES (?, ?, ?, ?, 'master')"
  ).run("Master", "cd.master@test.local", "(11) 99000-9999", pass);
});

async function login(email: string) {
  const agent = request.agent(app);
  const r = await agent.post("/api/auth/login").send({ email, password: "123456" });
  expect(r.status).toBe(200);
  return agent;
}

describe("condominios tenant boundary", () => {
  it("síndico A só vê o próprio condomínio em GET /", async () => {
    const agent = await login("cd.sindico.a@test.local");
    const res = await agent.get("/api/condominios");
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].id).toBe(condoAId);
  });

  it("síndico A NÃO consegue editar condomínio B → 404", async () => {
    const agent = await login("cd.sindico.a@test.local");
    const res = await agent.put(`/api/condominios/${condoBId}`).send({ name: "Hacked" });
    expect(res.status).toBe(404);

    const row = db.prepare("SELECT name FROM condominios WHERE id = ?").get(condoBId) as any;
    expect(row.name).toBe("Condos Test B");
  });

  it("síndico A pode editar o próprio condomínio", async () => {
    const agent = await login("cd.sindico.a@test.local");
    const res = await agent.put(`/api/condominios/${condoAId}`).send({ name: "Condos Test A v2" });
    expect(res.status).toBe(200);
  });

  it("síndico NÃO pode deletar condomínio (master only) → 403", async () => {
    const agent = await login("cd.sindico.a@test.local");
    const res = await agent.delete(`/api/condominios/${condoAId}`);
    expect(res.status).toBe(403);
  });

  it("master vê todos os condomínios", async () => {
    const agent = await login("cd.master@test.local");
    const res = await agent.get("/api/condominios");
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(2);
  });
});
