import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";

const TEST_DB_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "portariax-test-lp-"));
process.env.DB_DIR = TEST_DB_DIR;
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "x".repeat(48);
process.env.LOG_LEVEL = "silent";

let app: Awaited<ReturnType<typeof import("../server/app.js").createApp>>;
let db: any;
let condoAId: number;
let condoBId: number;
let entryInCondoBId: number;

beforeAll(async () => {
  const { createApp } = await import("../server/app.js");
  app = await createApp();
  db = (await import("../server/db.js")).default;
  const bcrypt = (await import("bcryptjs")).default;
  const pass = bcrypt.hashSync("123456", 4);

  condoAId = (db.prepare("INSERT INTO condominios (name, cnpj) VALUES (?, ?)")
    .run("LP Condo A", "16161616000123").lastInsertRowid) as number;
  condoBId = (db.prepare("INSERT INTO condominios (name, cnpj) VALUES (?, ?)")
    .run("LP Condo B", "17171717000123").lastInsertRowid) as number;

  db.prepare(
    "INSERT INTO users (name, email, phone, password, role, condominio_id) VALUES (?, ?, ?, ?, 'funcionario', ?)"
  ).run("Porteiro A", "lp.porteiro.a@test.local", "(11) 12000-0001", pass, condoAId);
  db.prepare(
    "INSERT INTO users (name, email, phone, password, role, condominio_id) VALUES (?, ?, ?, ?, 'morador', ?)"
  ).run("Morador A", "lp.morador.a@test.local", "(11) 12000-0002", pass, condoAId);

  entryInCondoBId = (db.prepare(
    "INSERT INTO livro_protocolo (condominio_id, protocolo, tipo) VALUES (?, ?, ?)"
  ).run(condoBId, "LP-B-001", "entrega").lastInsertRowid) as number;
});

async function login(email: string) {
  const agent = request.agent(app);
  const r = await agent.post("/api/auth/login").send({ email, password: "123456" });
  expect(r.status).toBe(200);
  return agent;
}

describe("livro protocolo CRUD + tenant", () => {
  it("porteiro A só vê entradas do próprio condomínio", async () => {
    const agent = await login("lp.porteiro.a@test.local");
    const res = await agent.get("/api/livro-protocolo");
    expect(res.status).toBe(200);
    expect(res.body.find((e: any) => e.id === entryInCondoBId)).toBeUndefined();
  });

  it("POST cria entrada no condomínio do user", async () => {
    const agent = await login("lp.porteiro.a@test.local");
    const res = await agent.post("/api/livro-protocolo").send({
      tipo: "entrega",
      deixada_por: "Correios",
      para: "Apto 101",
    });
    expect(res.status).toBe(201);

    const row = db.prepare("SELECT condominio_id, protocolo FROM livro_protocolo WHERE id = ?").get(res.body.id) as any;
    expect(row.condominio_id).toBe(condoAId);
    expect(row.protocolo).toBe(res.body.protocolo);
  });

  it("POST sem tipo → 400", async () => {
    const agent = await login("lp.porteiro.a@test.local");
    const res = await agent.post("/api/livro-protocolo").send({});
    expect(res.status).toBe(400);
  });

  it("morador NÃO pode criar entrada → 403", async () => {
    const agent = await login("lp.morador.a@test.local");
    const res = await agent.post("/api/livro-protocolo").send({ tipo: "entrega" });
    expect(res.status).toBe(403);
  });

  it("porteiro A NÃO consegue ver entrada de outro condomínio → 404", async () => {
    const agent = await login("lp.porteiro.a@test.local");
    const res = await agent.get(`/api/livro-protocolo/${entryInCondoBId}`);
    expect(res.status).toBe(404);
  });
});
