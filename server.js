const http = require("http");
const https = require("https");
const { URL } = require("url");

const host = "0.0.0.0";
const port = process.env.PORT || 3000;

// Helper: choose HTTP or HTTPS client
function requestClient(url) {
  return url.startsWith("https") ? https : http;
}

const server = http.createServer((req, res) => {
  // Example: /https://google.com
  if (!req.url || req.url === "/") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("Simple CORS Proxy is running.\nUsage: /https://example.com");
    return;
  }

  const target = req.url.slice(1); // remove leading "/"

  let targetUrl;
  try {
    targetUrl = new URL(target);
  } catch (e) {
    res.writeHead(400, { "Content-Type": "text/plain" });
    return res.end("Invalid URL");
  }

  const proxyReq = requestClient(targetUrl.href).get(targetUrl.href, (proxyRes) => {
    // Copy status + headers
    res.writeHead(proxyRes.statusCode, {
      ...proxyRes.headers,
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "*"
    });

    // Pipe the data for streaming
    proxyRes.pipe(res);
  });

  proxyReq.on("error", (err) => {
    res.writeHead(500, { "Content-Type": "text/plain" });
    res.end("Proxy error: " + err.message);
  });
});

server.listen(port, host, () => {
  console.log(`CORS Proxy running at http://${host}:${port}`);
});
