const http = require("http");
const https = require("https");
const { URL } = require("url");

const host = "0.0.0.0";
const port = process.env.PORT || 3000;

function requestClient(url) {
  return url.startsWith("https") ? https : http;
}

const server = http.createServer((req, res) => {
  if (!req.url || req.url === "/") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("CORS Proxy aktif.\nContoh: /https://example.com/api");
    return;
  }

  const target = req.url.slice(1);

  let targetUrl;
  try {
    targetUrl = new URL(target);
  } catch (e) {
    res.writeHead(400, { "Content-Type": "text/plain" });
    return res.end("Invalid URL");
  }

  // Tangani preflight CORS
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
      "access-control-allow-headers": req.headers["access-control-request-headers"] || "*",
      "access-control-max-age": "86400"
    });
    return res.end();
  }

  const options = {
    method: req.method,
    headers: {
      ...req.headers,
      host: targetUrl.host
    }
  };

  const proxyReq = requestClient(targetUrl.href).request(targetUrl, options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, {
      ...proxyRes.headers,
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "*",
      "access-control-allow-methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS"
    });

    proxyRes.pipe(res);
  });

  proxyReq.on("error", (err) => {
    res.writeHead(500, { "Content-Type": "text/plain" });
    res.end("Proxy error: " + err.message);
  });

  // Pindahkan body (POST/PUT/PATCH/DELETE)
  req.pipe(proxyReq);
});

server.listen(port, host, () => {
  console.log(`CORS Proxy running at http://${host}:${port}`);
});
