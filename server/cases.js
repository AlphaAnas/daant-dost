import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const DIR = join(dirname(fileURLToPath(import.meta.url)), "cases");

// Case cards, loaded once. The hidden answers stay on the server.
export const CASES = readdirSync(DIR)
  .filter((f) => f.endsWith(".json"))
  .sort()
  .map((f) => JSON.parse(readFileSync(join(DIR, f), "utf8")));

const BY_ID = new Map(CASES.map((c) => [c.id, c]));
export const caseById = (id) => BY_ID.get(id);
