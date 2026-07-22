import { resolve } from "node:path";

export const envConfig = {
  get databaseUrl() {
    return process.env.DATABASE_URL;
  },
  auth: {
    get encryptionKey() {
      return process.env.NAJM_ENCRYPTION_KEY;
    },
    get frontendUrl() {
      return process.env.FRONTEND_URL;
    },
    get jwtAccessSecret() {
      return process.env.JWT_ACCESS_SECRET;
    },
    get jwtRefreshSecret() {
      return process.env.JWT_REFRESH_SECRET;
    },
  },
  storage: {
    get basePath() {
      return resolve(
        /* turbopackIgnore: true */ process.cwd(),
        process.env.KAFIL_STORAGE_PATH ?? "../../storage",
      );
    },
  },
} as const;
