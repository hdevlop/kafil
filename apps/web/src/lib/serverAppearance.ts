import { server } from "@kafil/server";

import { loadAppearanceWith } from "@/lib/appearanceLoader";
import type { PublicAppearance } from "@/types/appearance";

export async function loadServerAppearance(): Promise<PublicAppearance> {
  return loadAppearanceWith(async (path) =>
    server.fetch(new Request(`http://internal${path}`)),
  );
}
