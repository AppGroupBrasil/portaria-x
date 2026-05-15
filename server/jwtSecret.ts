const secret = process.env.JWT_SECRET;

if (!secret || secret.length < 32) {
  if (process.env.NODE_ENV === "production") {
    console.error("FATAL: JWT_SECRET must be set to a strong secret (>=32 chars) in production.");
    process.exit(1);
  }
  console.warn("⚠️  JWT_SECRET not set or weak — using ephemeral dev secret. Tokens invalidate on restart.");
}

export const JWT_SECRET: string =
  secret && secret.length >= 32
    ? secret
    : `dev-ephemeral-${Math.random().toString(36).slice(2)}-${Date.now()}`;
