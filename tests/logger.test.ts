import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("logger", () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.resetModules();
  });

  afterEach(() => {
    logSpy.mockRestore();
    errSpy.mockRestore();
    delete process.env.LOG_LEVEL;
  });

  it("emits info messages with timestamp prefix", async () => {
    process.env.LOG_LEVEL = "debug";
    const { logger } = await import("../server/logger.js");
    logger.info("hello");
    expect(logSpy).toHaveBeenCalledOnce();
    const arg = logSpy.mock.calls[0][0] as string;
    expect(arg).toMatch(/^\[\d{4}-\d{2}-\d{2}T.*\] \[INFO\]$/);
  });

  it("suppresses debug below info threshold", async () => {
    process.env.LOG_LEVEL = "info";
    const { logger } = await import("../server/logger.js");
    logger.debug("noise");
    logger.info("show");
    expect(logSpy).toHaveBeenCalledOnce();
  });

  it("sends warn and error to stderr", async () => {
    process.env.LOG_LEVEL = "warn";
    const { logger } = await import("../server/logger.js");
    logger.warn("w");
    logger.error("e");
    expect(errSpy).toHaveBeenCalledTimes(2);
  });
});
