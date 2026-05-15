import { describe, it, expect, beforeEach, vi } from "vitest";

describe("jwtSecret", () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.JWT_SECRET;
    delete process.env.NODE_ENV;
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("uses provided secret when strong (>=32 chars)", async () => {
    const strong = "a".repeat(48);
    process.env.JWT_SECRET = strong;
    const { JWT_SECRET } = await import("../server/jwtSecret.js");
    expect(JWT_SECRET).toBe(strong);
  });

  it("falls back to ephemeral secret in development when missing", async () => {
    process.env.NODE_ENV = "development";
    const { JWT_SECRET } = await import("../server/jwtSecret.js");
    expect(JWT_SECRET).toMatch(/^dev-ephemeral-/);
    expect(JWT_SECRET.length).toBeGreaterThan(20);
  });

  it("rejects weak (<32 char) secret in dev (falls back to ephemeral)", async () => {
    process.env.NODE_ENV = "development";
    process.env.JWT_SECRET = "too-short";
    const { JWT_SECRET } = await import("../server/jwtSecret.js");
    expect(JWT_SECRET).toMatch(/^dev-ephemeral-/);
  });

  it("exits process if missing/weak in production", async () => {
    process.env.NODE_ENV = "production";
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(((code?: number) => {
      throw new Error(`process.exit(${code})`);
    }) as never);
    await expect(import("../server/jwtSecret.js")).rejects.toThrow(/process\.exit/);
    exitSpy.mockRestore();
  });
});
