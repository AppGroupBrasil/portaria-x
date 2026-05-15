import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";

const TEST_DB_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "portariax-test-func-"));
process.env.DB_DIR = TEST_DB_DIR;
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "x".repeat(48);
process.env.LOG_LEVEL = "silent";

let app: Awaited<ReturnType<typeof import("../server/app.js").createApp>>;
let db: any;
let condoAId: number;
let condoBId: number;
let funcInCondoBId: number;

beforeAll(async () => {
  const { createApp } = await import("../server/app.js");
  app = await createApp();
  db = (await import("../server/db.js")).default;
  const bcrypt = (await import("bcryptjs")).default;
  const pass = bcrypt.hashSync("123456", 4);

  condoAId = (db.prepare("INSERT INTO condominios (name, cnpj) VALUES (?, ?)")
    .run("Func Condo A", "12121212000123").lastInsertRowid) as number;
  condoBId = (db.prepare("INSERT INTO condominios (name, cnpj) VALUES (?, ?)")
    .run("Func Condo B", "13131313000123").lastInsertRowid) as number;

  db.prepare(
    "INSERT INTO users (name, email, phone, password, role, condominio_id) VALUES (?, ?, ?, ?, 'sindico', ?)"
  ).run("Síndico F A", "func.sindico.a@test.local", "(11) 98000-0001", pass, condoAId);
  db.prepare(
    "INSERT INTO users (name, email, phone, password, role, condominio_id) VALUES (?, ?, ?, ?, 'morador', ?)"
  ).run("Morador F A", "func.morador.a@test.local", "(11) 98000-0002", pass, condoAId);

  funcInCondoBId = (db.prepare(
    "INSERT INTO funcionarios (nome, sobrenome, cargo, login, password, condominio_id) VALUES (?, ?, ?, ?, ?, ?)"
  ).run("Porteiro", "Original", "porteiro", "porteirob", pass, condoBId).lastInsertRowid) as number;
});

async function login(email: string) {
  const agent = request.agent(app);
  const r = await agent.post("/api/auth/login").send({ email, password: "123456" });
  expect(r.status).toBe(200);
  return agent;
}

describe("funcionarios CRUD + tenant isolation", () => {
  it("síndico A só vê funcionários do próprio condomínio", async () => {
    const agent = await login("func.sindico.a@test.local");
    const res = await agent.get("/api/funcionarios");
    expect(res.status).toBe(200);
    expect(res.body.find((f: any) => f.id === funcInCondoBId)).toBeUndefined();
  });

  it("POST cria funcionário no condomínio do user", async () => {
    const agent = await login("func.sindico.a@test.local");
    const res = await agent.post("/api/funcionarios").send({
      nome: "Carlos",
      sobrenome: "Silva",
      cargo: "porteiro",
      login: "carlossilva",
      password: "654321",
    });
    expect(res.status).toBe(201);

    const row = db.prepare("SELECT condominio_id FROM funcionarios WHERE login = ?").get("carlossilva") as any;
    expect(row.condominio_id).toBe(condoAId);
  });

  it("POST com login inválido (acento) → 400", async () => {
    const agent = await login("func.sindico.a@test.local");
    const res = await agent.post("/api/funcionarios").send({
      nome: "X", sobrenome: "Y", cargo: "z", login: "joão", password: "123456",
    });
    expect(res.status).toBe(400);
  });

  it("POST com senha não numérica → 400", async () => {
    const agent = await login("func.sindico.a@test.local");
    const res = await agent.post("/api/funcionarios").send({
      nome: "X", sobrenome: "Y", cargo: "z", login: "validlogin", password: "abcdef",
    });
    expect(res.status).toBe(400);
  });

  it("morador NÃO pode criar funcionário → 403", async () => {
    const agent = await login("func.morador.a@test.local");
    const res = await agent.post("/api/funcionarios").send({
      nome: "X", sobrenome: "Y", cargo: "z", login: "abc", password: "123456",
    });
    expect(res.status).toBe(403);
  });

  it("síndico A NÃO consegue editar/deletar funcionário do condomínio B → 404", async () => {
    const agent = await login("func.sindico.a@test.local");
    const put = await agent.put(`/api/funcionarios/${funcInCondoBId}`).send({
      nome: "Hack", sobrenome: "Hacker", cargo: "porteiro", login: "porteirob",
    });
    expect(put.status).toBe(404);

    const del = await agent.delete(`/api/funcionarios/${funcInCondoBId}`);
    expect(del.status).toBe(404);

    const row = db.prepare("SELECT nome FROM funcionarios WHERE id = ?").get(funcInCondoBId) as any;
    expect(row.nome).toBe("Porteiro");
  });
});
