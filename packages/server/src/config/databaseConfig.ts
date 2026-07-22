import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { schema } from "../database/schema";
import { envConfig } from "./envConfig";

export const databaseConfig = {
  get connectionString() {
    return envConfig.databaseUrl;
  },
} as const;

export const pool = new Pool({
  connectionString: databaseConfig.connectionString,
});

export const db = drizzle(pool, { schema });
