import { describe, it, expect, vi } from "vitest";
import { ERROR_CODES, sendError } from "../server/errorCodes.js";

describe("errorCodes", () => {
  it("exposes a stable set of error codes", () => {
    expect(ERROR_CODES.AUTH_INVALID_CREDENTIALS).toBe("AUTH_INVALID_CREDENTIALS");
    expect(ERROR_CODES.SERVER_INTERNAL_ERROR).toBe("SERVER_INTERNAL_ERROR");
  });

  it("sendError sets status and payload shape", () => {
    const json = vi.fn();
    const status = vi.fn(() => ({ json }));
    const res = { status } as any;
    sendError(res, 401, ERROR_CODES.AUTH_INVALID_CREDENTIALS, "Credenciais inválidas.", { hint: "x" });
    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({
      code: "AUTH_INVALID_CREDENTIALS",
      error: "Credenciais inválidas.",
      hint: "x",
    });
  });
});
