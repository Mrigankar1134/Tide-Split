import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL is not set"); process.exit(1); }
const sql = neon(url);
const statements = readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8")
  .split(";").map((s) => s.trim()).filter(Boolean);
for (const s of statements) await sql(s);
console.log(`Schema ready (${statements.length} statements).`);
