import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";

const TEST_DB_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "portariax-test-corresp-"));
process.env.DB_DIR = TEST_DB_DIR;
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "x".repeat(48);
process.env.LOG_LEVEL = "silent";

let app: Awaited<ReturnType<typeof import("../server/app.js").createApp>>;
let db: any;
let condoAId: number;
let condoBId: number;
let moradorAId: number;
let moradorA2Id: number;
let corrAId: number;
let corrBId: number;

beforeAll(async () => {
  const { createApp } = await import("../server/app.js");
  app = await createApp();
  db = (await import("../server/db.js")).default;
  const bcrypt = (await import("bcryptjs")).default;
  const pass = bcrypt.hashSync("123456", 4);

  condoAId = (db.prepare("INSERT INTO condominios (name, cnpj) VALUES (?, ?)")
    .run("Corr Condo A", "20202020000123").lastInsertRowid) as number;
  condoBId = (db.prepare("INSERT INTO condominios (name, cnpj) VALUES (?, ?)")
    .run("Corr Condo B", "30303030000123").lastInsertRowid) as number;

  // Porteiro condo A
  db.prepare(
    "INSERT INTO users (name, email, phone, password, role, condominio_id) VALUES (?, ?, ?, ?, 'funcionario', ?)"
  ).run("Porteiro A", "corr.porteiro.a@test.local", "(11) 94000-0001", pass, condoAId);

  // Síndico condo B
  db.prepare(
    "INSERT INTO users (name, email, phone, password, role, condominio_id) VALUES (?, ?, ?, ?, 'sindico', ?)"
  ).run("Síndico B", "corr.sindico.b@test.local", "(11) 94000-0002", pass, condoBId);

  // Moradores
  moradorAId = (db.prepare(
    "INSERT INTO users (name, email, phone, password, role, condominio_id, block, unit) VALUES (?, ?, ?, ?, 'morador', ?, 'A', '101')"
  ).run("Morador A", "corr.morador.a@test.local", "(11) 94000-0003", pass, condoAId).lastInsertRowid) as number;
  moradorA2Id = (db.prepare(
    "INSERT INTO users (name, email, phone, password, role, condominio_id, block, unit) VALUES (?, ?, ?, ?, 'morador', ?, 'A', '202')"
  ).run("Morador A2", "corr.morador.a2@test.local", "(11) 94000-0004", pass, condoAId).lastInsertRowid) as number;

  // Pre-existing correspondencias
  corrAId = (db.prepare(
    "INSERT INTO correspondencias (condominio_id, protocolo, morador_id, morador_name, bloco, apartamento, tipo, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'pendente')"
  ).run(condoAId, "PROTO-A-001", moradorAId, "Morador A", "A", "101", "encomenda").lastInsertRowid) as number;
  corrBId = (db.prepare(
    "INSERT INTO correspondencias (condominio_id, protocolo, morador_name, bloco, apartamento, tipo, status) VALUES (?, ?, ?, ?, ?, ?, 'pendente')"
  ).run(condoBId, "PROTO-B-001", "Morador B", "B", "201", "encomenda").lastInsertRowid) as number;
});

async function login(email: string) {
  const agent = request.agent(app);
  const r = await agent.post("/api/auth/login").send({ email, password: "123456" });
  expect(r.status).toBe(200);
  return agent;
}

describe("correspondencias CRUD + tenant + ownership", () => {
  it("porteiro A só vê correspondências do próprio condomínio", async () => {
    const agent = await login("corr.porteiro.a@test.local");
    const res = await agent.get("/api/correspondencias");
    expect(res.status).toBe(200);
    expect(res.body.find((c: any) => c.id === corrBId)).toBeUndefined();
    expect(res.body.find((c: any) => c.id === corrAId)).toBeTruthy();
  });

  it("porteiro A cria correspondência no condomínio dele", async () => {
    const agent = await login("corr.porteiro.a@test.local");
    const res = await agent.post("/api/correspondencias").send({
      morador_name: "Morador X",
      bloco: "A",
      apartamento: "303",
      tipo: "carta",
      remetente: "Banco",
    });
    expect(res.status).toBe(201);
    expect(res.body.protocolo).toBeTruthy();

    const row = db.prepare("SELECT condominio_id FROM correspondencias WHERE id = ?").get(res.body.id) as any;
    expect(row.condominio_id).toBe(condoAId);
  });

  it("morador NÃO pode criar correspondência → 403", async () => {
    const agent = await login("corr.morador.a@test.local");
    const res = await agent.post("/api/correspondencias").send({
      morador_name: "x", bloco: "A", apartamento: "101",
    });
    expect(res.status).toBe(403);
  });

  it("síndico B NÃO retira correspondência do condomínio A → 403", async () => {
    const agent = await login("corr.sindico.b@test.local");
    const res = await agent.put(`/api/correspondencias/${corrAId}/retirar`).send({});
    expect(res.status).toBe(403);

    const row = db.prepare("SELECT status FROM correspondencias WHERE id = ?").get(corrAId) as any;
    expect(row.status).toBe("pendente");
  });

  it("morador A2 NÃO retira correspondência de morador A → 403", async () => {
    const agent = await login("corr.morador.a2@test.local");
    const res = await agent.put(`/api/correspondencias/${corrAId}/retirar`).send({});
    expect(res.status).toBe(403);
  });

  it("morador A retira a própria correspondência → 200", async () => {
    const agent = await login("corr.morador.a@test.local");
    const res = await agent.put(`/api/correspondencias/${corrAId}/retirar`).send({});
    expect(res.status).toBe(200);

    const row = db.prepare("SELECT status FROM correspondencias WHERE id = ?").get(corrAId) as any;
    expect(row.status).toBe("retirada");
  });
});
