const http = require("http");
const https = require("https");
const { URL } = require("url");

const port = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  // ====== CORS FIX ======
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "*");

  if (req.method === "OPTIONS") {
    res.writeHead(200);
    return res.end();
  }

  // ====== ROOT PATH ======
  if (!req.url || req.url === "/") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    return res.end(
      "CORS Proxy Running\nUsage:\nhttps://yourapp.koyeb.app/https://example.com/file.mpd"
    );
  }

  // ====== AMBIL TARGET URL ======
  const targetClean = req.url.slice(1); // remove leading "/"
  let targetUrl;

  try {
    targetUrl = new URL(targetClean);
  } catch (err) {
    res.writeHead(400, { "Content-Type": "text/plain" });
    return res.end("Invalid target URL");
  }

  // ====== PILIH http / https ======
  const client = targetUrl.protocol === "https:" ? https : http;

  // ====== BUILD REQUEST OPTIONS BENAR ======
  const options = {
    protocol: targetUrl.protocol,
    hostname: targetUrl.hostname,
    port:
      targetUrl.port ||
      (targetUrl.protocol === "https:" ? 443 : 80),
    path: targetUrl.pathname + targetUrl.search,
    method: "GET",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
      "Accept": "*/*",
      "Host": targetUrl.hostname,
      "Referer": targetUrl.origin
    }
  };

  console.log("Proxy →", options);

  // ====== KIRIM REQUEST ======
  const proxyReq = client.request(options, (proxyRes) => {
    // Forward headers dari server target
    res.writeHead(proxyRes.statusCode, {
      ...proxyRes.headers,
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*"
    });

    // forward data stream
    proxyRes.pipe(res);
  });

  proxyReq.on("error", (err) => {
    res.writeHead(500, { "Content-Type": "text/plain" });
    res.end("Proxy error: " + err.message);
  });

  proxyReq.end();
});

server.listen(port, () => {
  console.log("Proxy server running on port " + port);
});
