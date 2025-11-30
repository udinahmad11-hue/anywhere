const http = require("http");
const https = require("https");
const { URL } = require("url");

const port = process.env.PORT || 3000;

function client(url) {
  return url.startsWith("https") ? https : http;
}

const server = http.createServer((req, res) => {
  // === CORS ===
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "*");

  if (req.method === "OPTIONS") {
    res.writeHead(200);
    return res.end();
  }

  if (!req.url || req.url === "/") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    return res.end("Streaming Proxy Active");
  }

  const target = req.url.slice(1);
  let targetUrl;

  try {
    targetUrl = new URL(target);
  } catch (err) {
    res.writeHead(400, { "Content-Type": "text/plain" });
    return res.end("Invalid URL");
  }

  // === FIX utama untuk streaming ===
  const headers = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Safari/537.36",
    "Referer": "https://www.starhubgo.com/",
    "Origin": "https://www.starhubgo.com",
    "Accept": "*/*",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "identity", // wajib untuk streaming
    "Host": targetUrl.hostname,
  };

  const options = {
    method: "GET",
    headers,
  };

  const proxy = client(targetUrl.href).request(targetUrl, options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });

  proxy.on("error", (err) => {
    res.writeHead(500, { "Content-Type": "text/plain" });
    res.end("Proxy error: " + err.message);
  });

  proxy.end();
});

server.listen(port, () => {
  console.log("Streaming proxy running on port " + port);
});
