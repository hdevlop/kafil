import { sql } from "drizzle-orm";
import { usersTable } from "najm-auth/pg";

// Family readers receive the first name followed by a fixed mask, regardless
// of how many other names follow it. No part of the surname reaches the client.
export const familyVisibleSponsorFirstName = sql<string>`(regexp_split_to_array(btrim(${usersTable.name}), '[[:space:]]+'))[1]`;
export const familyVisibleSponsorName = sql<string>`coalesce(nullif(${familyVisibleSponsorFirstName}, '') || ' ***', '')`;
