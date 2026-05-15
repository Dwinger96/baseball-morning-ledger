const http = require("http");
const fs = require("fs");
const path = require("path");

const port = 4173;
const root = __dirname;

const server = http.createServer((req, res) => {
  const requestPath = decodeURIComponent((req.url || "/").split("?")[0]);
  const normalized = path.normalize(requestPath === "/" ? "/index.html" : requestPath);
  const filePath = path.join(root, normalized);

  if (!filePath.startsWith(root)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }

    res.writeHead(200, {
      "Content-Type": filePath.endsWith(".html")
        ? "text/html; charset=utf-8"
        : "text/plain; charset=utf-8",
    });
    res.end(data);
  });
});

server.listen(port, "127.0.0.1");
