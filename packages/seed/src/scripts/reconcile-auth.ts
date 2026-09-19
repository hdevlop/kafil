import { server } from "@kafil/server";
import { pool } from "@kafil/server/database";
import { TokenService } from "najm-auth";

import {
  describeRepair,
  reconcileAuthorizationSeed,
} from "../authorization-reconciliation";

/**
 * Release-time repair of code-managed roles, permissions, and grants. Repaired
 * grants do not rewrite tokens already issued, so every user on a repaired role
 * is signed out through Najm Auth before the repair may commit.
 */
try {
  await server.init();
  const tokens = server.container.get(TokenService);

  const { repair } = await reconcileAuthorizationSeed({
    invalidateUsers: async (userIds) => {
      for (const userId of userIds) {
        await tokens.invalidateUserAccessTokens(userId);
        await tokens.revokeAllForUser(userId);
      }
    },
  });

  console.log(`Auth seed reconciliation passed. ${describeRepair(repair)}.`);
} catch {
  process.exitCode = 1;
  console.error("Auth seed reconciliation failed.");
} finally {
  // Release the Redis connection the invalidation contract opened, or this
  // one-shot deployment container never exits.
  await server.stop().catch(() => undefined);
  await pool.end();
}
