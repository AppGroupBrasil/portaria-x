import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";

// Isolate test DB BEFORE any server module imports
const TEST_DB_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "portariax-test-"));
process.env.DB_DIR = TEST_DB_DIR;
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "x".repeat(48);
process.env.LOG_LEVEL = "silent";

let app: Awaited<ReturnType<typeof import("../server/app.js").createApp>>;

beforeAll(async () => {
  const { createApp } = await import("../server/app.js");
  app = await createApp();
});

describe("auth integration", () => {
  it("GET /api/health → 200 ok", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });

  it("POST /api/auth/login wrong password → 401 AUTH_INVALID_CREDENTIALS", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "demo.sindico@portariax.com", password: "wrong" });
    expect(res.status).toBe(401);
    expect(res.body.code).toBe("AUTH_INVALID_CREDENTIALS");
  });

  it("GET /api/auth/me without cookie → 401", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });

  it("demo flow: login → me → logout → me forbidden", async () => {
    const agent = request.agent(app);

    const login = await agent.post("/api/auth/demo").send({ role: "sindico" });
    expect(login.status).toBe(200);
    expect(login.body.user.role).toBe("sindico");

    const me = await agent.get("/api/auth/me");
    expect(me.status).toBe(200);
    expect(me.body.user.email).toMatch(/demo/);

    const out = await agent.post("/api/auth/logout");
    expect(out.status).toBe(200);

    const after = await agent.get("/api/auth/me");
    expect(after.status).toBe(401);
  });
});

describe("demo mutation guard", () => {
  it("blocks DELETE for demo users with 403 DEMO_MUTATION_BLOCKED", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/demo").send({ role: "sindico" });

    const blocos = await agent.get("/api/blocos");
    expect(blocos.status).toBe(200);
    const blocoId = blocos.body[0]?.id;
    expect(blocoId).toBeTruthy();

    const del = await agent.delete(`/api/blocos/${blocoId}`);
    expect(del.status).toBe(403);
    expect(del.body.code).toBe("DEMO_MUTATION_BLOCKED");

    // Confirm bloco still exists
    const after = await agent.get("/api/blocos");
    expect(after.body.find((b: any) => b.id === blocoId)).toBeTruthy();
  });

  it("blocks POST for demo users", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/demo").send({ role: "sindico" });

    const res = await agent
      .post("/api/blocos/personalizado")
      .send({ nomes: ["Hack"] });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe("DEMO_MUTATION_BLOCKED");
  });

  it("allows GET (read-only) for demo users", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/demo").send({ role: "sindico" });

    const res = await agent.get("/api/visitors");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe("auth required endpoints", () => {
  it("POST /api/visitor-qr/share without auth → 401", async () => {
    const res = await request(app).post("/api/visitor-qr/share").send({});
    expect(res.status).toBe(401);
  });

  it("POST /api/gate/oauth-exchange without auth → 401", async () => {
    const res = await request(app).post("/api/gate/oauth-exchange").send({ code: "x" });
    expect(res.status).toBe(401);
  });

  it("POST /api/gate/oauth-exchange as sindico → 403 (master/administradora only)", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/demo").send({ role: "sindico" });
    const res = await agent.post("/api/gate/oauth-exchange").send({ code: "x" });
    expect(res.status).toBe(403);
  });
});

describe("visitor self-register validation", () => {
  it("rejects missing/short name", async () => {
    const a = await request(app).post("/api/visitors/self-register").send({});
    expect(a.status).toBe(400);
    const b = await request(app).post("/api/visitors/self-register").send({ nome: "x" });
    expect(b.status).toBe(400);
  });

  it("rejects bogus condominio_id", async () => {
    const res = await request(app)
      .post("/api/visitors/self-register")
      .send({ nome: "Joao Test", condominio_id: 99999 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Condomínio inválido/);
  });

  it("accepts valid name without condominio_id (orphan visitor)", async () => {
    const res = await request(app)
      .post("/api/visitors/self-register")
      .send({ nome: "Maria Test" });
    expect(res.status).toBe(201);
    expect(res.body.nome).toBe("Maria Test");
  });
});
