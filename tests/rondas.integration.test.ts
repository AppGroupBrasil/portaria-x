import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";

const TEST_DB_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "portariax-test-rondas-"));
process.env.DB_DIR = TEST_DB_DIR;
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "x".repeat(48);
process.env.LOG_LEVEL = "silent";

let app: Awaited<ReturnType<typeof import("../server/app.js").createApp>>;
let db: any;
let condoAId: number;
let condoBId: number;
let cpInCondoBId: number;

beforeAll(async () => {
  const { createApp } = await import("../server/app.js");
  app = await createApp();
  db = (await import("../server/db.js")).default;
  const bcrypt = (await import("bcryptjs")).default;
  const pass = bcrypt.hashSync("123456", 4);

  condoAId = (db.prepare("INSERT INTO condominios (name, cnpj) VALUES (?, ?)")
    .run("Ronda Condo A", "11221122000123").lastInsertRowid) as number;
  condoBId = (db.prepare("INSERT INTO condominios (name, cnpj) VALUES (?, ?)")
    .run("Ronda Condo B", "11331133000123").lastInsertRowid) as number;

  db.prepare(
    "INSERT INTO users (name, email, phone, password, role, condominio_id) VALUES (?, ?, ?, ?, 'sindico', ?)"
  ).run("Síndico R A", "ronda.sindico.a@test.local", "(11) 97000-0001", pass, condoAId);
  db.prepare(
    "INSERT INTO users (name, email, phone, password, role, condominio_id) VALUES (?, ?, ?, ?, 'morador', ?)"
  ).run("Morador R A", "ronda.morador.a@test.local", "(11) 97000-0002", pass, condoAId);

  cpInCondoBId = (db.prepare(
    "INSERT INTO ronda_checkpoints (condominio_id, nome, qr_code_data) VALUES (?, ?, ?)"
  ).run(condoBId, "CP B-Original", "RONDA-CP-B-ORIG").lastInsertRowid) as number;
});

async function login(email: string) {
  const agent = request.agent(app);
  const r = await agent.post("/api/auth/login").send({ email, password: "123456" });
  expect(r.status).toBe(200);
  return agent;
}

describe("rondas checkpoints CRUD + tenant", () => {
  it("síndico A só vê checkpoints do próprio condomínio", async () => {
    const agent = await login("ronda.sindico.a@test.local");
    const res = await agent.get("/api/rondas/checkpoints");
    expect(res.status).toBe(200);
    expect(res.body.find((c: any) => c.id === cpInCondoBId)).toBeUndefined();
  });

  it("POST cria checkpoint no condomínio do user", async () => {
    const agent = await login("ronda.sindico.a@test.local");
    const res = await agent.post("/api/rondas/checkpoints").send({
      nome: "Portaria",
      descricao: "Entrada principal",
    });
    expect(res.status).toBe(201);
    expect(res.body.condominio_id).toBe(condoAId);
    expect(res.body.qr_code_data).toMatch(/^RONDA-CP-/);
  });

  it("POST sem nome → 400", async () => {
    const agent = await login("ronda.sindico.a@test.local");
    const res = await agent.post("/api/rondas/checkpoints").send({});
    expect(res.status).toBe(400);
  });

  it("morador NÃO pode criar checkpoint → 403", async () => {
    const agent = await login("ronda.morador.a@test.local");
    const res = await agent.post("/api/rondas/checkpoints").send({ nome: "Hack" });
    expect(res.status).toBe(403);
  });

  it("síndico A NÃO renomeia checkpoint do condomínio B → 404", async () => {
    const agent = await login("ronda.sindico.a@test.local");
    const res = await agent.put(`/api/rondas/checkpoints/${cpInCondoBId}`).send({ nome: "Pwned" });
    expect(res.status).toBe(404);

    const row = db.prepare("SELECT nome FROM ronda_checkpoints WHERE id = ?").get(cpInCondoBId) as any;
    expect(row.nome).toBe("CP B-Original");
  });

  it("síndico A NÃO deleta checkpoint do condomínio B → 404", async () => {
    const agent = await login("ronda.sindico.a@test.local");
    const res = await agent.delete(`/api/rondas/checkpoints/${cpInCondoBId}`);
    expect(res.status).toBe(404);

    const row = db.prepare("SELECT id FROM ronda_checkpoints WHERE id = ?").get(cpInCondoBId);
    expect(row).toBeTruthy();
  });
});
