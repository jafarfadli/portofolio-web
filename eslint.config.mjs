import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Plain <img> on purpose: sharp writes 480/960/1600 WebP variants at upload and components pass srcSet, so
    // next/image's on-demand optimiser (and its disk cache on the Mac mini) is not needed.
    rules: { "@next/next/no-img-element": "off" },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Static HTML mockup and design tooling are not app source.
    "mockup/**",
    ".impeccable/**",
  ]),
]);

export default eslintConfig;
