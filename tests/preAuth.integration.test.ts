import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";

const TEST_DB_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "portariax-test-preauth-"));
process.env.DB_DIR = TEST_DB_DIR;
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "x".repeat(48);
process.env.LOG_LEVEL = "silent";

let app: Awaited<ReturnType<typeof import("../server/app.js").createApp>>;
let db: any;
let moradorAId: number;
let moradorBId: number;
let condoAId: number;
let condoBId: number;
let preAuthInCondoBId: number;

beforeAll(async () => {
  const { createApp } = await import("../server/app.js");
  app = await createApp();
  db = (await import("../server/db.js")).default;
  const bcrypt = (await import("bcryptjs")).default;

  const pass = bcrypt.hashSync("123456", 4);
  condoAId = (db.prepare("INSERT INTO condominios (name, cnpj) VALUES (?, ?)")
    .run("PA Condo A", "55555555000155").lastInsertRowid) as number;
  condoBId = (db.prepare("INSERT INTO condominios (name, cnpj) VALUES (?, ?)")
    .run("PA Condo B", "66666666000166").lastInsertRowid) as number;

  moradorAId = (db.prepare(
    "INSERT INTO users (name, email, phone, password, role, condominio_id, block, unit) VALUES (?, ?, ?, ?, 'morador', ?, 'A', '101')"
  ).run("Morador A", "pa.morador.a@test.local", "(11) 91000-0001", pass, condoAId).lastInsertRowid) as number;
  moradorBId = (db.prepare(
    "INSERT INTO users (name, email, phone, password, role, condominio_id, block, unit) VALUES (?, ?, ?, ?, 'morador', ?, 'A', '101')"
  ).run("Morador B", "pa.morador.b@test.local", "(11) 91000-0002", pass, condoBId).lastInsertRowid) as number;

  preAuthInCondoBId = (db.prepare(
    "INSERT INTO pre_authorizations (condominio_id, morador_id, morador_name, visitante_nome, data_inicio, data_fim, status, token) VALUES (?, ?, ?, ?, ?, ?, 'ativa', ?)"
  ).run(condoBId, moradorBId, "Morador B", "Visitante B", "2026-01-01", "2027-12-31", "tok-b-existing").lastInsertRowid) as number;
});

async function login(email: string) {
  const agent = request.agent(app);
  const res = await agent.post("/api/auth/login").send({ email, password: "123456" });
  expect(res.status).toBe(200);
  return agent;
}

describe("pre-authorizations CRUD + tenant isolation", () => {
  it("morador A só vê pré-auths do próprio condomínio", async () => {
    const agent = await login("pa.morador.a@test.local");
    const res = await agent.get("/api/pre-authorizations");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.find((a: any) => a.id === preAuthInCondoBId)).toBeUndefined();
  });

  it("POST cria pré-auth amarrada ao morador e condomínio dele", async () => {
    const agent = await login("pa.morador.a@test.local");
    const res = await agent.post("/api/pre-authorizations").send({
      visitante_nome: "Visita A",
      data_inicio: "2026-06-01",
      data_fim: "2026-06-30",
    });
    expect(res.status).toBe(201);
    expect(res.body.condominio_id).toBe(condoAId);
    expect(res.body.morador_id).toBe(moradorAId);
    expect(res.body.status).toBe("ativa");
  });

  it("POST sem campos obrigatórios → 400", async () => {
    const agent = await login("pa.morador.a@test.local");
    const r1 = await agent.post("/api/pre-authorizations").send({ data_inicio: "2026-06-01", data_fim: "2026-06-30" });
    expect(r1.status).toBe(400);
    const r2 = await agent.post("/api/pre-authorizations").send({ visitante_nome: "X" });
    expect(r2.status).toBe(400);
  });

  it("morador A NÃO consegue PUT pré-auth do morador B → 404", async () => {
    const agent = await login("pa.morador.a@test.local");
    const res = await agent.put(`/api/pre-authorizations/${preAuthInCondoBId}`).send({ visitante_nome: "Hacked" });
    expect(res.status).toBe(404);

    const row = db.prepare("SELECT visitante_nome FROM pre_authorizations WHERE id = ?").get(preAuthInCondoBId) as any;
    expect(row.visitante_nome).toBe("Visitante B");
  });

  it("morador A NÃO consegue DELETE pré-auth do morador B → 404", async () => {
    const agent = await login("pa.morador.a@test.local");
    const res = await agent.delete(`/api/pre-authorizations/${preAuthInCondoBId}`);
    expect(res.status).toBe(404);

    const row = db.prepare("SELECT id FROM pre_authorizations WHERE id = ?").get(preAuthInCondoBId);
    expect(row).toBeTruthy();
  });
});
