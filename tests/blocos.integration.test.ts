import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";

const TEST_DB_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "portariax-test-blocos-"));
process.env.DB_DIR = TEST_DB_DIR;
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "x".repeat(48);
process.env.LOG_LEVEL = "silent";

let app: Awaited<ReturnType<typeof import("../server/app.js").createApp>>;
let db: any;
let condoAId: number;
let condoBId: number;
let blocoInCondoBId: number;

beforeAll(async () => {
  const { createApp } = await import("../server/app.js");
  app = await createApp();
  db = (await import("../server/db.js")).default;
  const bcrypt = (await import("bcryptjs")).default;
  const pass = bcrypt.hashSync("123456", 4);

  condoAId = (db.prepare("INSERT INTO condominios (name, cnpj) VALUES (?, ?)")
    .run("Bloco Condo A", "60606060000123").lastInsertRowid) as number;
  condoBId = (db.prepare("INSERT INTO condominios (name, cnpj) VALUES (?, ?)")
    .run("Bloco Condo B", "70707070000123").lastInsertRowid) as number;

  db.prepare(
    "INSERT INTO users (name, email, phone, password, role, condominio_id) VALUES (?, ?, ?, ?, 'sindico', ?)"
  ).run("Síndico Bloco A", "bloco.sindico.a@test.local", "(11) 96000-0001", pass, condoAId);
  db.prepare(
    "INSERT INTO users (name, email, phone, password, role, condominio_id) VALUES (?, ?, ?, ?, 'morador', ?)"
  ).run("Morador Bloco A", "bloco.morador.a@test.local", "(11) 96000-0002", pass, condoAId);

  blocoInCondoBId = (db.prepare(
    "INSERT INTO blocks (condominio_id, name) VALUES (?, ?)"
  ).run(condoBId, "Bloco B-Original").lastInsertRowid) as number;
});

async function login(email: string) {
  const agent = request.agent(app);
  const r = await agent.post("/api/auth/login").send({ email, password: "123456" });
  expect(r.status).toBe(200);
  return agent;
}

describe("blocos CRUD + tenant isolation", () => {
  it("síndico A só vê blocos do próprio condomínio (GET)", async () => {
    const agent = await login("bloco.sindico.a@test.local");
    const res = await agent.get("/api/blocos");
    expect(res.status).toBe(200);
    expect(res.body.find((b: any) => b.id === blocoInCondoBId)).toBeUndefined();
  });

  it("POST /personalizado cria bloco no condomínio do user", async () => {
    const agent = await login("bloco.sindico.a@test.local");
    const res = await agent.post("/api/blocos/personalizado").send({
      nomes: ["Torre Norte"],
    });
    expect(res.status).toBe(201);
    expect(res.body.created).toBe(1);

    const row = db.prepare("SELECT condominio_id FROM blocks WHERE name = ?").get("Torre Norte") as any;
    expect(row.condominio_id).toBe(condoAId);
  });

  it("morador NÃO consegue criar bloco → 403", async () => {
    const agent = await login("bloco.morador.a@test.local");
    const res = await agent.post("/api/blocos/personalizado").send({ nomes: ["Hack"] });
    expect(res.status).toBe(403);
  });

  it("síndico A NÃO renomeia bloco do condomínio B → 404", async () => {
    const agent = await login("bloco.sindico.a@test.local");
    const res = await agent.put(`/api/blocos/${blocoInCondoBId}`).send({ name: "Renomeado" });
    expect(res.status).toBe(404);

    const row = db.prepare("SELECT name FROM blocks WHERE id = ?").get(blocoInCondoBId) as any;
    expect(row.name).toBe("Bloco B-Original");
  });

  it("síndico A NÃO deleta bloco do condomínio B → 404", async () => {
    const agent = await login("bloco.sindico.a@test.local");
    const res = await agent.delete(`/api/blocos/${blocoInCondoBId}`);
    expect(res.status).toBe(404);

    const row = db.prepare("SELECT id FROM blocks WHERE id = ?").get(blocoInCondoBId);
    expect(row).toBeTruthy();
  });

  it("POST /personalizado com nomes vazios → 400", async () => {
    const agent = await login("bloco.sindico.a@test.local");
    const res = await agent.post("/api/blocos/personalizado").send({ nomes: [] });
    expect(res.status).toBe(400);
  });
});
