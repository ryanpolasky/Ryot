import { cpSync, existsSync, mkdirSync, renameSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "src");
const dist = join(root, "dist");

mkdirSync(dist, { recursive: true });
for (const file of ["index.html", "styles.css", "mock-allgamedata.json"]) {
  cpSync(join(src, file), join(dist, file));
}

// Electron loads preload scripts via require(); under "type": "module" a `.js`
// file is ESM and fails with ERR_REQUIRE_ESM, leaving `window.overlay`
// undefined. Electron 28+ loads ESM preloads only when they carry the `.mjs`
// extension, so rename the compiled preload to match (same as apps/desktop).
for (const name of ["preload"]) {
  const jsPath = join(dist, `${name}.js`);
  if (existsSync(jsPath)) renameSync(jsPath, join(dist, `${name}.mjs`));
  const mapPath = join(dist, `${name}.js.map`);
  if (existsSync(mapPath)) renameSync(mapPath, join(dist, `${name}.mjs.map`));
}
console.log("[overlay] copied static assets to dist/");
