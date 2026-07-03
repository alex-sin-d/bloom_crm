// Installs the integration resolve hook (maps `@/` -> compiled output, stubs `next/headers`)
// before the test modules are imported.
import { register } from "node:module";

register("./resolve.mjs", import.meta.url);
