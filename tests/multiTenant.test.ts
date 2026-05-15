import { describe, it, expect, beforeAll } from "vitest";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";

const TEST_DB_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "portariax-test-mt-"));
process.env.DB_DIR = TEST_DB_DIR;
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "x".repeat(48);
process.env.LOG_LEVEL = "silent";

let resolveAccessibleCondominio: typeof import("../server/middleware.js").resolveAccessibleCondominio;

beforeAll(async () => {
  const mod = await import("../server/middleware.js");
  resolveAccessibleCondominio = mod.resolveAccessibleCondominio;
});

const baseUser = {
  id: 1,
  name: "x",
  email: "x@y.com",
  phone: null,
  cpf: null,
  password: "",
  perfil: null,
  unit: null,
  block: null,
  parent_administradora_id: null,
  avatar_url: null,
  created_at: "",
  updated_at: "",
} as any;

describe("resolveAccessibleCondominio", () => {
  it("user with fixed condominio_id: returns own ID even if body asks otherwise", () => {
    const sindico = { ...baseUser, role: "sindico", condominio_id: 5 };
    expect(resolveAccessibleCondominio(sindico, 999)).toBe(null);
    expect(resolveAccessibleCondominio(sindico, 5)).toBe(5);
    expect(resolveAccessibleCondominio(sindico, null)).toBe(5);
  });

  it("morador cannot pass arbitrary condominio_id", () => {
    const morador = { ...baseUser, role: "morador", condominio_id: 5 };
    expect(resolveAccessibleCondominio(morador, 7)).toBe(null);
  });

  it("master with no condominio_id can pass any ID", () => {
    const master = { ...baseUser, role: "master", condominio_id: null };
    expect(resolveAccessibleCondominio(master, 42)).toBe(42);
  });

  it("master with no requested returns null (must specify)", () => {
    const master = { ...baseUser, role: "master", condominio_id: null };
    expect(resolveAccessibleCondominio(master, null)).toBe(null);
  });

  it("administradora with no condominio_id and no body → null", () => {
    const admin = { ...baseUser, role: "administradora", condominio_id: null };
    expect(resolveAccessibleCondominio(admin, null)).toBe(null);
  });

  it("rejects invalid numeric input (NaN, negative)", () => {
    const master = { ...baseUser, role: "master", condominio_id: null };
    expect(resolveAccessibleCondominio(master, NaN)).toBe(null);
    expect(resolveAccessibleCondominio(master, -1)).toBe(null);
    expect(resolveAccessibleCondominio(master, 0)).toBe(null);
  });
});
