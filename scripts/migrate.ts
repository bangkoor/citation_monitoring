import { readFileSync } from "node:fs";
import { getSql } from "../lib/db.ts";

const sql = getSql();
const schema = readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8");
await sql.unsafe(schema);
console.log("Schema applied.");
await sql.end();
