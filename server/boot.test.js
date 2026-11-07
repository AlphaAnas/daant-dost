// @vitest-environment node
import { execFileSync } from "node:child_process";
import { expect, test } from "vitest";

// Vitest resolves imports that plain Node cannot (missing .js extensions),
// so load the server the way `npm start` does.
test("the server loads in plain Node", () => {
  const out = execFileSync(process.execPath, ["-e", "import('./server/app.js').then(() => console.log('ok'))"], {
    encoding: "utf8",
  });
  expect(out.trim()).toBe("ok");
});
