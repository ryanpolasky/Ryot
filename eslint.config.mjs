import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

/**
 * Flat ESLint config for the non-Next packages (server, shared, overlay,
 * desktop) plus the root test/config files. The web app keeps its own Next.js
 * lint setup, run separately via `pnpm lint:web`.
 *
 * Rules are deliberately pragmatic: the JS "recommended" set catches genuine
 * bugs as errors, while the noisier TypeScript stylistic rules are warnings so
 * they guide without blocking CI.
 */
export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/.next/**",
      "**/build/**",
      "**/out/**",
      "**/node_modules/**",
      "**/release/**",
      "**/dist-electron/**",
      "apps/web/**", // linted by `next lint`
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
    },
    rules: {
      // TS already flags undefined identifiers; the core rule false-positives on types.
      "no-undef": "off",
      // Best-effort fallbacks legitimately swallow errors in this codebase.
      "no-empty": ["error", { allowEmptyCatch: true }],
      // Underscore-prefixed args/vars are intentional throwaways.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrors: "none",
        },
      ],
      // Riot / u.gg / Data Dragon payloads are loosely typed; `any` is sometimes pragmatic.
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
);
