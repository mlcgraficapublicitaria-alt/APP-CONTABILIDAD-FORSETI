const { existsSync } = require("node:fs");
const { createServer } = require("node:http");
const { spawnSync } = require("node:child_process");
const next = require("next");

const port = Number.parseInt(process.env.PORT || "3000", 10);
const hostname = "0.0.0.0";
const dev = process.env.NODE_ENV === "development";

if (!dev && !existsSync(".next/BUILD_ID")) {
  const result = spawnSync("npx", ["next", "build"], {
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer((req, res) => {
    handle(req, res);
  }).listen(port, hostname, () => {
    console.log(`Ready on http://${hostname}:${port}`);
  });
});
