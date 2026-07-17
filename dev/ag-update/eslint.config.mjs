// @ts-check
import tseslint from "typescript-eslint";

// A deliberately small, type-aware config: no big preset, just correctness rules that catch real
// bugs. Add to the `rules` block below to grow it. Scoped to the TypeScript sources that tsconfig
// includes, so the type-aware project service resolves every file.
export default tseslint.config(
  { ignores: ["test/fixture-tests/**/files/**"] },
  {
    files: ["src/**/*.ts", "test/**/*.ts", "vitest.config.ts"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: { "@typescript-eslint": tseslint.plugin },
    rules: {
      // Unhandled promises — the requested rule; catches missing awaits that swallow errors.
      "@typescript-eslint/no-floating-promises": "error",
      // A promise used where a non-promise is expected (e.g. an async callback passed to a
      // sync API, or a promise in an `if`). The natural companion to no-floating-promises.
      "@typescript-eslint/no-misused-promises": "error",
      // `await` on a value that isn't a thenable — usually a missing call or a real mistake.
      "@typescript-eslint/await-thenable": "error",
      // Dead code: unused vars and imports. Zero current violations.
      "@typescript-eslint/no-unused-vars": "error",
      // `==`/`!=` bugs, while still allowing the intentional `== null` / `!= null` null check.
      eqeqeq: ["error", "smart"],
    },
  },
);
