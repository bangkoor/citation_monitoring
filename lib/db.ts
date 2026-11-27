import postgres from "postgres";

export function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  // Neon requires TLS; a local Postgres (for testing) does not.
  const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url) || url.includes("host=/");
  return postgres(url, { ssl: local ? false : "require", max: 5, onnotice: () => {} });
}

// One shared pool for the web app (reused across hot reloads and requests).
const g = globalThis as unknown as { __sql?: ReturnType<typeof getSql> };
export function db() {
  if (!g.__sql) g.__sql = getSql();
  return g.__sql;
}
