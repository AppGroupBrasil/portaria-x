import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";

const TEST_DB_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "portariax-test-master-"));
process.env.DB_DIR = TEST_DB_DIR;
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "x".repeat(48);
process.env.LOG_LEVEL = "silent";

let app: Awaited<ReturnType<typeof import("../server/app.js").createApp>>;
let db: any;
let bcrypt: any;
let adminAId: number;
let condoAId: number;
let condoBId: number;
let userInCondoBId: number;

beforeAll(async () => {
  const { createApp } = await import("../server/app.js");
  app = await createApp();
  db = (await import("../server/db.js")).default;
  bcrypt = (await import("bcryptjs")).default;

  // Seed: two condominios, one administradora owning A, one regular user in B.
  const passHash = bcrypt.hashSync("123456", 4);

  // adminA — administradora user
  const adminRes = db.prepare(
    "INSERT INTO users (name, email, phone, password, role) VALUES (?, ?, ?, ?, 'administradora')"
  ).run("Admin A", "admin.a@test.local", "(11) 90000-0001", passHash);
  adminAId = adminRes.lastInsertRowid as number;

  // Condo A — administered by adminA
  const condoARes = db.prepare(
    "INSERT INTO condominios (name, cnpj, administradora_id) VALUES (?, ?, ?)"
  ).run("Condo A", "11111111000111", adminAId);
  condoAId = condoARes.lastInsertRowid as number;

  // Condo B — NOT administered by adminA (orphan, no administradora_id)
  const condoBRes = db.prepare(
    "INSERT INTO condominios (name, cnpj) VALUES (?, ?)"
  ).run("Condo B", "22222222000122");
  condoBId = condoBRes.lastInsertRowid as number;

  // A regular sindico user inside condo B
  const userRes = db.prepare(
    "INSERT INTO users (name, email, phone, password, role, condominio_id) VALUES (?, ?, ?, ?, 'sindico', ?)"
  ).run("Síndico B", "sindico.b@test.local", "(11) 90000-0002", passHash, condoBId);
  userInCondoBId = userRes.lastInsertRowid as number;
});

async function loginAdminA() {
  const agent = request.agent(app);
  const res = await agent.post("/api/auth/login").send({
    email: "admin.a@test.local",
    password: "123456",
  });
  expect(res.status).toBe(200);
  return agent;
}

describe("master scope: administradora cannot escalate to other condominios", () => {
  it("PUT /master/condominios/:other-id/bloquear → 403", async () => {
    const agent = await loginAdminA();
    const res = await agent
      .put(`/api/master/condominios/${condoBId}/bloquear`)
      .send({ bloqueado: true, motivo: "test" });
    expect(res.status).toBe(403);

    // verify condo B still not blocked
    const condo = db.prepare("SELECT bloqueado FROM condominios WHERE id = ?").get(condoBId) as any;
    expect(condo.bloqueado).toBe(0);
  });

  it("PUT /master/condominios/:own-id/bloquear → 200 (own condominio)", async () => {
    const agent = await loginAdminA();
    const res = await agent
      .put(`/api/master/condominios/${condoAId}/bloquear`)
      .send({ bloqueado: true, motivo: "test" });
    expect(res.status).toBe(200);

    // cleanup
    db.prepare("UPDATE condominios SET bloqueado = 0 WHERE id = ?").run(condoAId);
  });

  it("PUT /master/condominios/:other-id/status-pagamento → 403", async () => {
    const agent = await loginAdminA();
    const res = await agent
      .put(`/api/master/condominios/${condoBId}/status-pagamento`)
      .send({ status_pagamento: "inadimplente" });
    expect(res.status).toBe(403);
  });

  it("PUT /master/users/:id (user in foreign condo) → 403", async () => {
    const agent = await loginAdminA();
    const res = await agent
      .put(`/api/master/users/${userInCondoBId}`)
      .send({ name: "Hacked" });
    expect(res.status).toBe(403);

    const user = db.prepare("SELECT name FROM users WHERE id = ?").get(userInCondoBId) as any;
    expect(user.name).toBe("Síndico B");
  });

  it("DELETE /master/users/:id (user in foreign condo) → 403", async () => {
    const agent = await loginAdminA();
    const res = await agent.delete(`/api/master/users/${userInCondoBId}`);
    expect(res.status).toBe(403);

    const user = db.prepare("SELECT id FROM users WHERE id = ?").get(userInCondoBId);
    expect(user).toBeTruthy();
  });

  it("PUT /whatsapp/config/:foreign-id → 403", async () => {
    const agent = await loginAdminA();
    const res = await agent
      .put(`/api/whatsapp/config/${condoBId}`)
      .send({ whatsapp_enabled: "true" });
    expect(res.status).toBe(403);
  });

  it("GET /whatsapp/stats?condominio_id=foreign → 403", async () => {
    const agent = await loginAdminA();
    const res = await agent.get(`/api/whatsapp/stats?condominio_id=${condoBId}`);
    expect(res.status).toBe(403);
  });
});
