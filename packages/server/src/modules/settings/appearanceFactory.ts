import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import type { NajmDesignConfig } from "najm-kit";

import { parseAppearanceDesignConfig } from "./appearanceValidator";

let cachedFactoryDesign: NajmDesignConfig | undefined;

export function getFactoryDesignConfig(): NajmDesignConfig {
  cachedFactoryDesign ??= parseAppearanceDesignConfig(readFactoryTheme());
  return structuredClone(cachedFactoryDesign);
}

function readFactoryTheme(): unknown {
  const path = [
    resolve(process.cwd(), "theme.json"),
    resolve(process.cwd(), "../../theme.json"),
  ].find((candidate) => existsSync(candidate));

  if (!path) {
    throw new Error("Kafil factory theme.json was not found");
  }

  return JSON.parse(readFileSync(path, "utf8")) as unknown;
}
