import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    ignores: [
      ".admin-dist/**",
      ".data-transfer-dist/**",
      ".frontend-test-dist/**",
      ".importer-dist/**",
      ".integration-test-dist/**",
      ".next/**",
      "build/**",
      "dist/**",
      "node_modules/**",
      "out/**"
    ]
  }
];

export default eslintConfig;
