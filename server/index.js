import "dotenv/config";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { aiEnabled, MODEL } from "./ai.js";
import { createApp } from "./app.js";
import { createStore } from "./store.js";

const store = await createStore();
const app = createApp({ store });

// In production the same server hands out the built web app.
const dist = join(dirname(fileURLToPath(import.meta.url)), "..", "dist");
if (existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^(?!\/api).*/, (req, res) => res.sendFile(join(dist, "index.html")));
}

const port = Number(process.env.PORT) || 3001;
app.listen(port, () => {
  console.log(`DaantDost API on http://localhost:${port} · store: ${store.kind} · AI: ${aiEnabled() ? MODEL : "off (scripted fallback)"}`);
});
