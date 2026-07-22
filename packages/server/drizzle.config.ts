import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  dbCredentials: {
    url:
      process.env.DATABASE_URL ??
      "postgresql://postgres:postgres@localhost:5432/kafil",
  },
  out: "./migrations",
  schema: "./src/database/schema.ts",
  strict: true,
  verbose: true,
});
