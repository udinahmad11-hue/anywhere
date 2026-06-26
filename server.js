const http = require("http");
const https = require("https");
const { URL } = require("url");

const host = "0.0.0.0";
const port = process.env.PORT || 8000; // ← Ubah ke 8000

function requestClient(url) {
  return url.startsWith("https") ? https : http;
}

const server = http.createServer((req, res) => {
  // Enable CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, Accept, Origin, User-Agent");
  res.setHeader("Access-Control-Expose-Headers", "*");
  res.setHeader("Access-Control-Max-Age", "86400");

  // Handle OPTIONS
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  // ✅ HEALTH CHECK ENDPOINT
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "healthy", timestamp: new Date().toISOString() }));
    return;
  }

  // Handle root & favicon
  if (!req.url || req.url === "/" || req.url === "/favicon.ico") {
    if (req.url === "/favicon.ico") {
      res.writeHead(204);
      res.end();
      return;
    }
    
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end(`Simple CORS Proxy is running on port ${port}.\n\nUsage:\nGET /https://example.com\nPOST /https://api.example.com/data\n`);
    return;
  }

  const target = req.url.slice(1);
  let targetUrl;
  try {
    targetUrl = new URL(target);
  } catch (e) {
    res.writeHead(400, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ 
      error: "Invalid URL", 
      message: e.message 
    }));
  }

  const options = {
    hostname: targetUrl.hostname,
    port: targetUrl.port || (targetUrl.protocol === "https:" ? 443 : 80),
    path: targetUrl.pathname + targetUrl.search,
    method: req.method,
    headers: { ...req.headers }
  };

  // Hapus headers yang bermasalah
  delete options.headers.host;
  // ✅ JANGAN hapus content-length
  // delete options.headers["content-length"];

  const client = requestClient(targetUrl.href);
  
  const proxyReq = client.request(options, (proxyRes) => {
    res.statusCode = proxyRes.statusCode;
    
    const headers = { ...proxyRes.headers };
    headers["access-control-allow-origin"] = "*";
    headers["access-control-allow-methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD";
    headers["access-control-allow-headers"] = "*";
    
    res.writeHead(proxyRes.statusCode, headers);
    proxyRes.pipe(res);
  });

  proxyReq.on("error", (err) => {
    console.error("Proxy Request Error:", err.message);
    if (!res.headersSent) {
      res.writeHead(502, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ 
        error: "Proxy Error", 
        message: err.message 
      }));
    }
  });

  req.on("error", (err) => {
    console.error("Client Request Error:", err.message);
    proxyReq.destroy();
  });

  // Forward body dengan lebih aman
  if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
    req.pipe(proxyReq);
  } else {
    proxyReq.end();
  }

  proxyReq.setTimeout(30000, () => {
    console.error("Proxy Request Timeout");
    proxyReq.destroy();
    if (!res.headersSent) {
      res.writeHead(504, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ 
        error: "Gateway Timeout", 
        message: "Proxy request timed out after 30 seconds" 
      }));
    }
  });
});

server.listen(port, host, () => {
  console.log(`🚀 CORS Proxy running at http://${host}:${port}`);
  console.log(`📡 Supports: GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD`);
});

server.on("error", (err) => {
  console.error("Server Error:", err.message);
  process.exit(1); // ← Exit jika ada error berat
});
