import { createApp } from "../server/app.js";
import { createStore } from "../server/store.js";

const appPromise = createStore({ file: null }).then((store) => createApp({ store }));

export default async function handler(req, res) {
  const app = await appPromise;
  const path = Array.isArray(req.query?.path) ? req.query.path.join("/") : String(req.query?.path || "");
  const query = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
  if (path) req.url = `/api/${path}${query}`;
  else if (!req.url.startsWith("/api")) req.url = `/api${req.url}`;
  return app(req, res);
}
