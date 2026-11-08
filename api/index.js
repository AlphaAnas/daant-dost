import { createApp } from "../server/app.js";
import { createStore } from "../server/store.js";

const appPromise = createStore({ file: null }).then((store) => createApp({ store }));

export default async function handler(req, res) {
  const app = await appPromise;
  if (!req.url.startsWith("/api")) req.url = `/api${req.url}`;
  return app(req, res);
}
