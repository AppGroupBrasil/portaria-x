import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";

const TEST_DB_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "portariax-test-delivery-"));
process.env.DB_DIR = TEST_DB_DIR;
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "x".repeat(48);
process.env.LOG_LEVEL = "silent";

let app: Awaited<ReturnType<typeof import("../server/app.js").createApp>>;
let db: any;
let condoAId: number;
let condoBId: number;
let moradorAId: number;
let deliveryInCondoBId: number;

beforeAll(async () => {
  const { createApp } = await import("../server/app.js");
  app = await createApp();
  db = (await import("../server/db.js")).default;
  const bcrypt = (await import("bcryptjs")).default;
  const pass = bcrypt.hashSync("123456", 4);

  condoAId = (db.prepare("INSERT INTO condominios (name, cnpj) VALUES (?, ?)")
    .run("Del Condo A", "40404040000123").lastInsertRowid) as number;
  condoBId = (db.prepare("INSERT INTO condominios (name, cnpj) VALUES (?, ?)")
    .run("Del Condo B", "50505050000123").lastInsertRowid) as number;

  moradorAId = (db.prepare(
    "INSERT INTO users (name, email, phone, password, role, condominio_id, block, unit) VALUES (?, ?, ?, ?, 'morador', ?, 'A', '101')"
  ).run("Morador Del A", "del.morador.a@test.local", "(11) 95000-0001", pass, condoAId).lastInsertRowid) as number;
  const moradorBId = db.prepare(
    "INSERT INTO users (name, email, phone, password, role, condominio_id, block, unit) VALUES (?, ?, ?, ?, 'morador', ?, 'A', '101')"
  ).run("Morador Del B", "del.morador.b@test.local", "(11) 95000-0002", pass, condoBId).lastInsertRowid;

  deliveryInCondoBId = (db.prepare(
    "INSERT INTO delivery_authorizations (condominio_id, morador_id, morador_name, servico, status) VALUES (?, ?, ?, ?, 'pendente')"
  ).run(condoBId, moradorBId, "Morador Del B", "ifood").lastInsertRowid) as number;
});

async function login(email: string) {
  const agent = request.agent(app);
  const r = await agent.post("/api/auth/login").send({ email, password: "123456" });
  expect(r.status).toBe(200);
  return agent;
}

describe("delivery authorizations CRUD + tenant isolation", () => {
  it("morador A só vê deliveries do próprio condomínio", async () => {
    const agent = await login("del.morador.a@test.local");
    const res = await agent.get("/api/delivery-authorizations");
    expect(res.status).toBe(200);
    expect(res.body.find((d: any) => d.id === deliveryInCondoBId)).toBeUndefined();
  });

  it("POST cria delivery amarrado ao morador e condomínio", async () => {
    const agent = await login("del.morador.a@test.local");
    const res = await agent.post("/api/delivery-authorizations").send({
      servico: "ifood",
      numero_pedido: "12345",
    });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeTruthy();

    const row = db.prepare("SELECT condominio_id, morador_id, status FROM delivery_authorizations WHERE id = ?").get(res.body.id) as any;
    expect(row.condominio_id).toBe(condoAId);
    expect(row.morador_id).toBe(moradorAId);
    expect(row.status).toBe("pendente");
  });

  it("POST sem serviço → 400", async () => {
    const agent = await login("del.morador.a@test.local");
    const res = await agent.post("/api/delivery-authorizations").send({});
    expect(res.status).toBe(400);
  });

  it("morador A NÃO consegue DELETE delivery do condomínio B → 404", async () => {
    const agent = await login("del.morador.a@test.local");
    const res = await agent.delete(`/api/delivery-authorizations/${deliveryInCondoBId}`);
    expect(res.status).toBe(404);

    const row = db.prepare("SELECT id FROM delivery_authorizations WHERE id = ?").get(deliveryInCondoBId);
    expect(row).toBeTruthy();
  });
});
