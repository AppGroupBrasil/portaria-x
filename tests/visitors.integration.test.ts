import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";

const TEST_DB_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "portariax-test-visitors-"));
process.env.DB_DIR = TEST_DB_DIR;
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "x".repeat(48);
process.env.LOG_LEVEL = "silent";

let app: Awaited<ReturnType<typeof import("../server/app.js").createApp>>;
let db: any;
let condoAId: number;
let condoBId: number;
let funcAId: number;
let visitorInCondoBId: number;

beforeAll(async () => {
  const { createApp } = await import("../server/app.js");
  app = await createApp();
  db = (await import("../server/db.js")).default;
  const bcrypt = (await import("bcryptjs")).default;
  const pass = bcrypt.hashSync("123456", 4);

  condoAId = (db.prepare("INSERT INTO condominios (name, cnpj) VALUES (?, ?)")
    .run("Vis Condo A", "77777777000177").lastInsertRowid) as number;
  condoBId = (db.prepare("INSERT INTO condominios (name, cnpj) VALUES (?, ?)")
    .run("Vis Condo B", "88888888000188").lastInsertRowid) as number;

  funcAId = (db.prepare(
    "INSERT INTO users (name, email, phone, password, role, condominio_id) VALUES (?, ?, ?, ?, 'funcionario', ?)"
  ).run("Porteiro A", "vis.porteiro.a@test.local", "(11) 92000-0001", pass, condoAId).lastInsertRowid) as number;
  db.prepare(
    "INSERT INTO users (name, email, phone, password, role, condominio_id) VALUES (?, ?, ?, ?, 'morador', ?)"
  ).run("Morador A", "vis.morador.a@test.local", "(11) 92000-0002", pass, condoAId);

  // Pre-existing visitor in condo B
  visitorInCondoBId = (db.prepare(
    "INSERT INTO visitors (condominio_id, nome, status, token, created_by) VALUES (?, ?, 'pendente', ?, ?)"
  ).run(condoBId, "Visitor B Existente", "vis-tok-b", funcAId).lastInsertRowid) as number;
});

async function login(email: string) {
  const agent = request.agent(app);
  const r = await agent.post("/api/auth/login").send({ email, password: "123456" });
  expect(r.status).toBe(200);
  return agent;
}

describe("visitors CRUD + tenant isolation", () => {
  it("funcionário A só vê visitantes do próprio condomínio", async () => {
    const agent = await login("vis.porteiro.a@test.local");
    const res = await agent.get("/api/visitors");
    expect(res.status).toBe(200);
    expect(res.body.find((v: any) => v.id === visitorInCondoBId)).toBeUndefined();
  });

  it("POST /visitors cria visitante no condomínio do user", async () => {
    const agent = await login("vis.porteiro.a@test.local");
    const res = await agent.post("/api/visitors").send({ nome: "Novo Visitante" });
    expect(res.status).toBe(201);
    expect(res.body.condominio_id).toBe(condoAId);
    expect(res.body.status).toBe("pendente");
  });

  it("POST /visitors sem nome → 400", async () => {
    const agent = await login("vis.porteiro.a@test.local");
    const res = await agent.post("/api/visitors").send({});
    expect(res.status).toBe(400);
  });

  it("morador não consegue POST /visitors → 403", async () => {
    const agent = await login("vis.morador.a@test.local");
    const res = await agent.post("/api/visitors").send({ nome: "X" });
    expect(res.status).toBe(403);
  });

  it("DELETE visitor de outro condomínio → 200 mas não remove (filtra por condominio_id)", async () => {
    const agent = await login("vis.porteiro.a@test.local");
    const res = await agent.delete(`/api/visitors/${visitorInCondoBId}`);
    // mesmo se 200, a query DELETE inclui AND condominio_id = ? — não afeta condo B
    const row = db.prepare("SELECT id FROM visitors WHERE id = ?").get(visitorInCondoBId);
    expect(row).toBeTruthy();
    expect([200, 404]).toContain(res.status);
  });

  it("GET /visitors/auth/:token (público) retorna 404 para token inválido", async () => {
    const res = await request(app).get("/api/visitors/auth/bogus-token-xyz");
    expect(res.status).toBe(404);
  });
});
