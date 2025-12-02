const http = require("http");
const https = require("https");
const { URL } = require("url");

const host = "0.0.0.0";
const port = process.env.PORT || 3000;

// Security: Block private/local IPs
const blockedHosts = [
  "localhost",
  "127.0.0.1",
  "::1",
  "0.0.0.0",
  "192.168.",
  "10.",
  "172.16.",
  "172.17.",
  "172.18.",
  "172.19.",
  "172.20.",
  "172.21.",
  "172.22.",
  "172.23.",
  "172.24.",
  "172.25.",
  "172.26.",
  "172.27.",
  "172.28.",
  "172.29.",
  "172.30.",
  "172.31.",
  "169.254."
];

function isUrlBlocked(url) {
  try {
    const hostname = new URL(url).hostname;
    return blockedHosts.some(blocked => hostname.startsWith(blocked) || hostname.includes(blocked));
  } catch {
    return true;
  }
}

// Helper: choose HTTP or HTTPS client
function requestClient(url) {
  return url.startsWith("https") ? https : http;
}

const server = http.createServer((req, res) => {
  // Enable CORS preflight
  if (req.method === "OPTIONS") {
    res.writeHead(200, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Max-Age": "86400"
    });
    return res.end();
  }

  // Example: /https://google.com
  if (!req.url || req.url === "/") {
    res.writeHead(200, { 
      "Content-Type": "text/plain",
      "Access-Control-Allow-Origin": "*"
    });
    res.end("Simple CORS Proxy is running.\nUsage: /https://example.com");
    return;
  }

  const target = req.url.slice(1); // remove leading "/"

  // Validate URL format
  if (!target.startsWith("http")) {
    res.writeHead(400, { 
      "Content-Type": "text/plain",
      "Access-Control-Allow-Origin": "*"
    });
    return res.end("Invalid URL: URL must start with http:// or https://");
  }

  // Security check
  if (isUrlBlocked(target)) {
    res.writeHead(403, { 
      "Content-Type": "text/plain",
      "Access-Control-Allow-Origin": "*"
    });
    return res.end("Access to local/private resources is blocked");
  }

  let targetUrl;
  try {
    targetUrl = new URL(target);
  } catch (e) {
    res.writeHead(400, { 
      "Content-Type": "text/plain",
      "Access-Control-Allow-Origin": "*"
    });
    return res.end("Invalid URL format");
  }

  // Prepare proxy request options
  const options = {
    hostname: targetUrl.hostname,
    port: targetUrl.port,
    path: targetUrl.pathname + targetUrl.search,
    method: req.method,
    headers: { ...req.headers }
  };

  // Remove proxy-specific headers
  delete options.headers.host;
  delete options.headers.connection;
  
  // Set a reasonable User-Agent if not provided
  if (!options.headers["user-agent"]) {
    options.headers["user-agent"] = "Simple-CORS-Proxy/1.0";
  }

  const proxyReq = requestClient(target).request(options, (proxyRes) => {
    // Copy status + headers
    const headers = {
      ...proxyRes.headers,
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Expose-Headers": "*"
    };

    res.writeHead(proxyRes.statusCode, headers);

    // Handle redirects
    if ([301, 302, 307, 308].includes(proxyRes.statusCode) && proxyRes.headers.location) {
      const location = proxyRes.headers.location;
      if (location.startsWith("/")) {
        // Relative redirect
        proxyRes.headers.location = `/${targetUrl.origin}${location}`;
      }
    }

    // Pipe the data for streaming
    proxyRes.pipe(res);
  });

  // Forward request body for POST, PUT, etc.
  if (req.method !== "GET" && req.method !== "HEAD") {
    req.pipe(proxyReq);
  } else {
    proxyReq.end();
  }

  proxyReq.on("error", (err) => {
    res.writeHead(500, { 
      "Content-Type": "text/plain",
      "Access-Control-Allow-Origin": "*"
    });
    res.end("Proxy error: " + err.message);
  });

  // Timeout handling
  proxyReq.setTimeout(30000, () => {
    proxyReq.destroy();
    if (!res.headersSent) {
      res.writeHead(504, { 
        "Content-Type": "text/plain",
        "Access-Control-Allow-Origin": "*"
      });
      res.end("Gateway Timeout");
    }
  });
});

server.listen(port, host, () => {
  console.log(`CORS Proxy running at http://${host}:${port}`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully");
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});
