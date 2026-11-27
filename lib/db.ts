import postgres from "postgres";

export function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  // Neon requires TLS; a local Postgres (for testing) does not.
  const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url) || url.includes("host=/");
  return postgres(url, { ssl: local ? false : "require", max: 5, onnotice: () => {} });
}
