import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import tseslint from "typescript-eslint";

const webFiles = ["apps/web/**/*.{js,jsx,mjs,ts,tsx}"];
const packageFiles = ["packages/**/*.ts"];

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
