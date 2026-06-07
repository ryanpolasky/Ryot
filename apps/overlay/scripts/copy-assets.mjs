import { cpSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "src");
const dist = join(root, "dist");

mkdirSync(dist, { recursive: true });
for (const file of ["index.html", "styles.css", "mock-allgamedata.json"]) {
  cpSync(join(src, file), join(dist, file));
}
console.log("[overlay] copied static assets to dist/");
