const http = require("http");
const next = require("next");

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();
const port = parseInt(process.env.PORT || "3000", 10);

app.prepare().then(() => {
  http.createServer((req, res) => handle(req, res)).listen(port, "0.0.0.0", () => {
    console.log(`Ready on port ${port}`);
  });
});
