import { defineConfig } from "drizzle-kit";

// drizzle-kit needs a direct (unpooled) connection: PgBouncer in transaction
// mode breaks the session-level statements migrations rely on.
const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL_UNPOOLED (ou DATABASE_URL) não definida");
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url },
  strict: true,
  verbose: true,
});
