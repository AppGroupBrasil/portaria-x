import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";

const TEST_DB_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "portariax-test-cameras-"));
process.env.DB_DIR = TEST_DB_DIR;
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "x".repeat(48);
process.env.LOG_LEVEL = "silent";

let app: Awaited<ReturnType<typeof import("../server/app.js").createApp>>;
let db: any;
let bcrypt: any;
let sindicoAId: number;
let sindicoBId: number;
let condoAId: number;
let condoBId: number;
let cameraInCondoBId: number;

beforeAll(async () => {
  const { createApp } = await import("../server/app.js");
  app = await createApp();
  db = (await import("../server/db.js")).default;
  bcrypt = (await import("bcryptjs")).default;

  const passHash = bcrypt.hashSync("123456", 4);

  // Two condominios
  condoAId = (db.prepare("INSERT INTO condominios (name, cnpj) VALUES (?, ?)")
    .run("Cameras Condo A", "33333333000133").lastInsertRowid) as number;
  condoBId = (db.prepare("INSERT INTO condominios (name, cnpj) VALUES (?, ?)")
    .run("Cameras Condo B", "44444444000144").lastInsertRowid) as number;

  // Síndicos
  sindicoAId = (db.prepare(
    "INSERT INTO users (name, email, phone, password, role, condominio_id) VALUES (?, ?, ?, ?, 'sindico', ?)"
  ).run("Síndico A", "cam.sindico.a@test.local", "(11) 90000-1001", passHash, condoAId).lastInsertRowid) as number;
  sindicoBId = (db.prepare(
    "INSERT INTO users (name, email, phone, password, role, condominio_id) VALUES (?, ?, ?, ?, 'sindico', ?)"
  ).run("Síndico B", "cam.sindico.b@test.local", "(11) 90000-1002", passHash, condoBId).lastInsertRowid) as number;

  // Camera pre-existing in condo B
  cameraInCondoBId = (db.prepare(
    "INSERT INTO cameras (condominio_id, nome, setor, created_by) VALUES (?, ?, ?, ?)"
  ).run(condoBId, "Câmera B Existente", "portaria", sindicoBId).lastInsertRowid) as number;
});

async function login(email: string) {
  const agent = request.agent(app);
  const res = await agent.post("/api/auth/login").send({ email, password: "123456" });
  expect(res.status).toBe(200);
  return agent;
}

describe("cameras CRUD + tenant isolation", () => {
  it("síndico A só vê câmeras do próprio condomínio", async () => {
    const agent = await login("cam.sindico.a@test.local");
    const res = await agent.get("/api/cameras");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.every((c: any) => c.condominio_id === condoAId)).toBe(true);
    expect(res.body.find((c: any) => c.id === cameraInCondoBId)).toBeUndefined();
  });

  it("POST cria câmera no condomínio do user", async () => {
    const agent = await login("cam.sindico.a@test.local");
    const res = await agent.post("/api/cameras").send({
      nome: "Câmera Entrada A",
      setor: "portaria",
      url_stream: "http://example/stream",
    });
    expect(res.status).toBe(201);
    expect(res.body.condominio_id).toBe(condoAId);
    expect(res.body.nome).toBe("Câmera Entrada A");
  });

  it("POST sem nome → 400", async () => {
    const agent = await login("cam.sindico.a@test.local");
    const res = await agent.post("/api/cameras").send({ setor: "portaria" });
    expect(res.status).toBe(400);
  });

  it("síndico A NÃO consegue PUT câmera do condomínio B → 404", async () => {
    const agent = await login("cam.sindico.a@test.local");
    const res = await agent.put(`/api/cameras/${cameraInCondoBId}`).send({ nome: "Hacked" });
    expect(res.status).toBe(404);

    const camB = db.prepare("SELECT nome FROM cameras WHERE id = ?").get(cameraInCondoBId) as any;
    expect(camB.nome).toBe("Câmera B Existente");
  });

  it("síndico A NÃO consegue DELETE câmera do condomínio B → 404", async () => {
    const agent = await login("cam.sindico.a@test.local");
    const res = await agent.delete(`/api/cameras/${cameraInCondoBId}`);
    expect(res.status).toBe(404);

    const camB = db.prepare("SELECT id FROM cameras WHERE id = ?").get(cameraInCondoBId);
    expect(camB).toBeTruthy();
  });

  it("GET /cameras/:id de outro condomínio → 404", async () => {
    const agent = await login("cam.sindico.a@test.local");
    const res = await agent.get(`/api/cameras/${cameraInCondoBId}`);
    expect(res.status).toBe(404);
  });

  it("morador (sem write) não consegue criar câmera → 403", async () => {
    // create a morador in condo A
    const moradorEmail = "cam.morador.a@test.local";
    db.prepare(
      "INSERT INTO users (name, email, phone, password, role, condominio_id) VALUES (?, ?, ?, ?, 'morador', ?)"
    ).run("Morador A", moradorEmail, "(11) 90000-1003", bcrypt.hashSync("123456", 4), condoAId);

    const agent = await login(moradorEmail);
    const res = await agent.post("/api/cameras").send({ nome: "Tentativa" });
    expect(res.status).toBe(403);
  });
});
