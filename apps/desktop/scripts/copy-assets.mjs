import { cpSync, mkdirSync, renameSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "src");
const dist = join(root, "dist");

mkdirSync(dist, { recursive: true });
for (const file of [
  "overlay.html",
  "overlay.css",
  "settings.html",
  "settings.css",
  "loading.html",
  "pregame.html",
  "pregame.css",
  "mock-allgamedata.json",
  "mock-champselectsession.json",
]) {
  cpSync(join(src, file), join(dist, file));
}

// Electron loads preload scripts via require(); under "type": "module" a `.js`
// file is ESM and fails with ERR_REQUIRE_ESM. Electron 28+ loads ESM preloads
// only when they carry the `.mjs` extension, so rename the compiled preloads.
for (const name of [
  "main-preload",
  "overlay-preload",
  "settings-preload",
  "pregame-preload",
]) {
  const jsPath = join(dist, `${name}.js`);
  if (existsSync(jsPath)) renameSync(jsPath, join(dist, `${name}.mjs`));
  const mapPath = join(dist, `${name}.js.map`);
  if (existsSync(mapPath)) renameSync(mapPath, join(dist, `${name}.mjs.map`));
}
console.log("[desktop] copied static assets to dist/");
