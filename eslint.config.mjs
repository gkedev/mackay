import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";

export default defineConfig([
  globalIgnores([
    ".next/**",
    "out/**",
    "dist/**",
    "next-env.d.ts",
    ".cloudroom/**",
  ]),
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    // TypeScript checks undefined names, including type-only names.
    rules: { "no-undef": "off" },
  },
  { ...reactHooks.configs.flat.recommended, files: ["**/*.tsx"] },
]);
