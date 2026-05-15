import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";

const TEST_DB_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "portariax-test-vehicles-"));
process.env.DB_DIR = TEST_DB_DIR;
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "x".repeat(48);
process.env.LOG_LEVEL = "silent";

let app: Awaited<ReturnType<typeof import("../server/app.js").createApp>>;
let db: any;
let condoAId: number;
let condoBId: number;
let moradorAId: number;
let vehInCondoBId: number;

beforeAll(async () => {
  const { createApp } = await import("../server/app.js");
  app = await createApp();
  db = (await import("../server/db.js")).default;
  const bcrypt = (await import("bcryptjs")).default;
  const pass = bcrypt.hashSync("123456", 4);

  condoAId = (db.prepare("INSERT INTO condominios (name, cnpj) VALUES (?, ?)")
    .run("Veh Condo A", "99999999000111").lastInsertRowid) as number;
  condoBId = (db.prepare("INSERT INTO condominios (name, cnpj) VALUES (?, ?)")
    .run("Veh Condo B", "10101010000122").lastInsertRowid) as number;

  moradorAId = (db.prepare(
    "INSERT INTO users (name, email, phone, password, role, condominio_id, block, unit) VALUES (?, ?, ?, ?, 'morador', ?, 'A', '101')"
  ).run("Morador V A", "veh.morador.a@test.local", "(11) 93000-0001", pass, condoAId).lastInsertRowid) as number;
  const moradorBId = db.prepare(
    "INSERT INTO users (name, email, phone, password, role, condominio_id, block, unit) VALUES (?, ?, ?, ?, 'morador', ?, 'A', '101')"
  ).run("Morador V B", "veh.morador.b@test.local", "(11) 93000-0002", pass, condoBId).lastInsertRowid;

  vehInCondoBId = (db.prepare(
    "INSERT INTO vehicle_authorizations (condominio_id, morador_id, morador_name, placa, data_inicio, data_fim, status) VALUES (?, ?, ?, ?, ?, ?, 'ativa')"
  ).run(condoBId, moradorBId, "Morador V B", "BBB-1111", "2026-01-01", "2027-12-31").lastInsertRowid) as number;
});

async function login(email: string) {
  const agent = request.agent(app);
  const r = await agent.post("/api/auth/login").send({ email, password: "123456" });
  expect(r.status).toBe(200);
  return agent;
}

describe("vehicle authorizations CRUD + tenant isolation", () => {
  it("morador A só vê veículos do próprio condomínio", async () => {
    const agent = await login("veh.morador.a@test.local");
    const res = await agent.get("/api/vehicle-authorizations");
    expect(res.status).toBe(200);
    expect(res.body.find((v: any) => v.id === vehInCondoBId)).toBeUndefined();
  });

  it("POST cria veículo no condomínio do user", async () => {
    const agent = await login("veh.morador.a@test.local");
    const res = await agent.post("/api/vehicle-authorizations").send({
      placa: "abc-1234",
      data_inicio: "2026-06-01",
      data_fim: "2026-12-31",
    });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeTruthy();

    // Verifica no banco que tenant + uppercasing aplicaram
    const row = db.prepare("SELECT condominio_id, morador_id, placa, status FROM vehicle_authorizations WHERE id = ?").get(res.body.id) as any;
    expect(row.condominio_id).toBe(condoAId);
    expect(row.morador_id).toBe(moradorAId);
    expect(row.placa).toBe("ABC-1234");
    expect(row.status).toBe("ativa");
  });

  it("POST sem placa → 400", async () => {
    const agent = await login("veh.morador.a@test.local");
    const res = await agent.post("/api/vehicle-authorizations").send({
      data_inicio: "2026-06-01",
      data_fim: "2026-12-31",
    });
    expect(res.status).toBe(400);
  });

  it("POST sem datas → 400", async () => {
    const agent = await login("veh.morador.a@test.local");
    const res = await agent.post("/api/vehicle-authorizations").send({ placa: "ABC-1234" });
    expect(res.status).toBe(400);
  });

  it("morador A NÃO consegue DELETE veículo do condomínio B → 404", async () => {
    const agent = await login("veh.morador.a@test.local");
    const res = await agent.delete(`/api/vehicle-authorizations/${vehInCondoBId}`);
    expect(res.status).toBe(404);

    const row = db.prepare("SELECT id FROM vehicle_authorizations WHERE id = ?").get(vehInCondoBId);
    expect(row).toBeTruthy();
  });
});
