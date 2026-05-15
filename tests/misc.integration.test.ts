import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";

const TEST_DB_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "portariax-test-misc-"));
process.env.DB_DIR = TEST_DB_DIR;
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "x".repeat(48);
process.env.LOG_LEVEL = "silent";

let app: Awaited<ReturnType<typeof import("../server/app.js").createApp>>;
let db: any;
let sindicoEmail = "misc.sindico@test.local";
let condoId: number;

beforeAll(async () => {
  const { createApp } = await import("../server/app.js");
  app = await createApp();
  db = (await import("../server/db.js")).default;
  const bcrypt = (await import("bcryptjs")).default;
  const pass = bcrypt.hashSync("123456", 4);

  condoId = (db.prepare("INSERT INTO condominios (name, cnpj) VALUES (?, ?)")
    .run("Misc Condo", "21212121000123").lastInsertRowid) as number;
  db.prepare(
    "INSERT INTO users (name, email, phone, password, role, condominio_id) VALUES (?, ?, ?, ?, 'sindico', ?)"
  ).run("Síndico Misc", sindicoEmail, "(11) 14000-0001", pass, condoId);
});

async function login(email: string) {
  const agent = request.agent(app);
  const r = await agent.post("/api/auth/login").send({ email, password: "123456" });
  expect(r.status).toBe(200);
  return agent;
}

describe("device tokens", () => {
  it("POST sem auth → 401", async () => {
    const res = await request(app).post("/api/device-tokens").send({ token: "x".repeat(20) });
    expect(res.status).toBe(401);
  });

  it("POST com token curto → 400", async () => {
    const agent = await login(sindicoEmail);
    const res = await agent.post("/api/device-tokens").send({ token: "short" });
    expect(res.status).toBe(400);
  });

  it("POST com token válido registra device", async () => {
    const agent = await login(sindicoEmail);
    const res = await agent.post("/api/device-tokens").send({
      token: "fake-fcm-token-1234567890",
      platform: "android",
    });
    expect(res.status).toBe(200);

    const row = db.prepare("SELECT active FROM device_tokens WHERE token = ?").get("fake-fcm-token-1234567890") as any;
    expect(row.active).toBe(1);
  });
});

describe("visitor QR share", () => {
  it("POST /visitor-qr/share sem auth → 401", async () => {
    const res = await request(app).post("/api/visitor-qr/share").send({});
    expect(res.status).toBe(401);
  });

  it("POST com campos obrigatórios cria token e GET público retorna dados", async () => {
    const agent = await login(sindicoEmail);
    const res = await agent.post("/api/visitor-qr/share").send({
      qr_data: "QR-DATA-XYZ",
      visitor_name: "Visitante Teste",
      data_inicio: "2026-06-01",
      hora_inicio: "08:00",
      data_fim: "2026-06-30",
      hora_fim: "18:00",
    });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();

    const pub = await request(app).get(`/api/visitor-qr/${res.body.token}`);
    expect(pub.status).toBe(200);
    expect(pub.body.visitor_name).toBe("Visitante Teste");
  });

  it("GET com token inválido → 404", async () => {
    const res = await request(app).get("/api/visitor-qr/bogus-token-xyz");
    expect(res.status).toBe(404);
  });
});

describe("condominio config PUT permissions", () => {
  it("funcionário NÃO pode editar config → 403", async () => {
    const bcrypt = require("bcryptjs");
    const pass = bcrypt.hashSync("123456", 4);
    db.prepare(
      "INSERT INTO users (name, email, phone, password, role, condominio_id) VALUES (?, ?, ?, ?, 'funcionario', ?)"
    ).run("Func Misc", "misc.func@test.local", "(11) 14000-0002", pass, condoId);

    const agent = await login("misc.func@test.local");
    const res = await agent.put("/api/condominio-config").send({ feature_visitors: "true" });
    expect(res.status).toBe(403);
  });

  it("síndico pode editar config", async () => {
    const agent = await login(sindicoEmail);
    const res = await agent.put("/api/condominio-config").send({ feature_visitors: "true" });
    expect(res.status).toBe(200);
  });
});
