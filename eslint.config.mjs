import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import tseslint from "typescript-eslint";

const webFiles = ["apps/web/**/*.{js,jsx,mjs,ts,tsx}"];
// Workspace packages, plus the repository automation that the root lint covers.
const packageFiles = ["packages/**/*.ts", "scripts/**/*.mjs"];

const webConfig = [...nextVitals, ...nextTs].map((config) => ({
  ...config,
  files: webFiles,
}));

const packageConfig = tseslint.configs.recommended.map((config) => ({
  ...config,
  files: packageFiles,
}));

const eslintConfig = defineConfig([
  ...webConfig,
  ...packageConfig,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
  {
    files: [
      "apps/web/src/components/**/*.{ts,tsx}",
      "apps/web/src/features/**/*.{ts,tsx}",
      "apps/web/src/hooks/**/*.{ts,tsx}",
      "apps/web/src/providers/**/*.{ts,tsx}",
      "apps/web/src/services/**/*.{ts,tsx}",
      "apps/web/src/shared/**/*.{ts,tsx}",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@kafil/server",
              message: "Browser-facing code must not import the server runtime. Shared code comes from @kafil/contracts.",
            },
            {
              name: "@kafil/seed",
              message: "The operational seed package is never a web dependency.",
            },
          ],
          patterns: [
            {
              group: [
                "@kafil/server/*",
                "@kafil/server/config",
                "@kafil/server/database",
                "@kafil/server/database/*",
                "@kafil/server/managed-images",
                "@kafil/server/modules",
                "@kafil/server/modules/*",
                "@kafil/seed/*",
              ],
              message:
                "Browser code imports shared code from @kafil/contracts (./locales, ./phone, ./money/constants), never server or seed exports. scripts/check-workspace-boundaries.mjs checks the full graph.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["packages/server/src/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@kafil/seed", "@kafil/seed/*", "**/apps/web/**", "**/packages/seed/**"],
              message: "The server package cannot depend on app or seed implementation.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["packages/contracts/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@kafil/server", "@kafil/server/*", "@kafil/seed", "@kafil/seed/*", "**/apps/web/**", "**/packages/server/**", "**/packages/seed/**"],
              message: "Contracts are browser-safe shared code and depend on no other workspace package.",
            },
          ],
        },
      ],
    },
  },
  globalIgnores([
    "**/.next/**",
    "**/.next-*/**",
    "**/out/**",
    "**/build/**",
    "**/dist/**",
    "**/next-env.d.ts",
  ]),
]);

export default eslintConfig;
