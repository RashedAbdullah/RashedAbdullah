// node scripts/build.mjs                 reads GitHub with GH_TOKEN
// node scripts/build.mjs --data file     draws from a saved data file
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { drawCard } from "./draw.mjs";
import { fetchData } from "./fetch.mjs";
import { makeStats } from "./stats.mjs";

const at = process.argv.indexOf("--data");
const data = at > 0 ? JSON.parse(readFileSync(process.argv[at + 1], "utf8")) : await fetchData();
const stats = makeStats(data);
const out = new URL("../assets/", import.meta.url);
mkdirSync(out, { recursive: true });
for (const [file, options] of [
  ["card-light.svg", { theme: "light" }],
  ["card-dark.svg", { theme: "dark" }],
  ["card-mobile.svg", { theme: "auto", mobile: true }],
])
  writeFileSync(new URL(file, out), drawCard(stats, options));
console.log(`Card drawn for ${stats.today}`);
