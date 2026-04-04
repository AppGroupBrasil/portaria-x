export const APP_ERROR_CODES = {
  DEMO_INVALID_ROLE: "DEMO_INVALID_ROLE",
  DEMO_INIT_FAILED: "DEMO_INIT_FAILED",
  DEMO_START_FAILED: "DEMO_START_FAILED",
  CONDO_CNPJ_REQUIRED: "CONDO_CNPJ_REQUIRED",
  CONDO_CNPJ_INVALID: "CONDO_CNPJ_INVALID",
  CONDO_NOT_FOUND: "CONDO_NOT_FOUND",
  AUTH_REQUIRED_FIELDS: "AUTH_REQUIRED_FIELDS",
  AUTH_INVALID_PASSWORD_FORMAT: "AUTH_INVALID_PASSWORD_FORMAT",
  AUTH_EMAIL_ALREADY_EXISTS: "AUTH_EMAIL_ALREADY_EXISTS",
  AUTH_CNPJ_ALREADY_EXISTS: "AUTH_CNPJ_ALREADY_EXISTS",
  AUTH_INVALID_CREDENTIALS: "AUTH_INVALID_CREDENTIALS",
  AUTH_USER_BLOCKED: "AUTH_USER_BLOCKED",
  AUTH_PENDING_APPROVAL: "AUTH_PENDING_APPROVAL",
  AUTH_NOT_AUTHENTICATED: "AUTH_NOT_AUTHENTICATED",
  AUTH_USER_NOT_FOUND: "AUTH_USER_NOT_FOUND",
  AUTH_SESSION_INVALID: "AUTH_SESSION_INVALID",
  ACCOUNT_NAME_REQUIRED: "ACCOUNT_NAME_REQUIRED",
  ACCOUNT_EMAIL_IN_USE: "ACCOUNT_EMAIL_IN_USE",
  PASSWORD_REQUIRED_FIELDS: "PASSWORD_REQUIRED_FIELDS",
  PASSWORD_TOO_SHORT: "PASSWORD_TOO_SHORT",
  PASSWORD_CURRENT_INVALID: "PASSWORD_CURRENT_INVALID",
  ACCOUNT_DELETE_FORBIDDEN: "ACCOUNT_DELETE_FORBIDDEN",
  NETWORK_CONNECTION_FAILED: "NETWORK_CONNECTION_FAILED",
  SERVER_INTERNAL_ERROR: "SERVER_INTERNAL_ERROR",
} as const;

export type AppErrorCode = (typeof APP_ERROR_CODES)[keyof typeof APP_ERROR_CODES];

export class AppError extends Error {
  code?: AppErrorCode;
  status?: number;

  constructor(message: string, code?: AppErrorCode, status?: number) {
    super(code ? `[${code}] ${message}` : message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
  }
}

export async function readErrorResponse(response: Response, fallbackMessage: string, fallbackCode?: AppErrorCode) {
  try {
    const body = await response.json();
    return new AppError(body.error || fallbackMessage, body.code || fallbackCode, response.status);
  } catch {
    return new AppError(fallbackMessage, fallbackCode, response.status);
  }
}

export function toAppError(error: unknown, fallbackMessage: string, fallbackCode?: AppErrorCode) {
  if (error instanceof AppError) return error;
  if (error instanceof Error) return new AppError(error.message || fallbackMessage, fallbackCode);
  return new AppError(fallbackMessage, fallbackCode);
}