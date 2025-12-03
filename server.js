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
  // Enable CORS for all routes
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, Accept, Origin, User-Agent");
  res.setHeader("Access-Control-Expose-Headers", "*");
  res.setHeader("Access-Control-Max-Age", "86400");

  // Handle OPTIONS preflight requests
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  // Handle root path
  if (!req.url || req.url === "/" || req.url === "/favicon.ico") {
    if (req.url === "/favicon.ico") {
      res.writeHead(204);
      res.end();
      return;
    }
    
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end(`Simple CORS Proxy is running on port ${port}.\n\nUsage:\nGET /https://example.com\nPOST /https://api.example.com/data\n\nWith body and headers preserved.\n`);
    return;
  }

  const target = req.url.slice(1); // remove leading "/"

  let targetUrl;
  try {
    targetUrl = new URL(target);
  } catch (e) {
    res.writeHead(400, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ 
      error: "Invalid URL", 
      message: e.message,
      usage: "Example: /https://example.com/api" 
    }));
  }

  // Prepare request options
  const options = {
    hostname: targetUrl.hostname,
    port: targetUrl.port || (targetUrl.protocol === "https:" ? 443 : 80),
    path: targetUrl.pathname + targetUrl.search,
    method: req.method,
    headers: { ...req.headers }
  };

  // Remove proxy-specific headers
  delete options.headers.host;
  delete options.headers["content-length"];
  
  // Add original referer if not present
  if (req.headers.referer && !options.headers.referer) {
    options.headers.referer = req.headers.referer;
  }

  const client = requestClient(targetUrl.href);
  
  const proxyReq = client.request(options, (proxyRes) => {
    // Forward status code
    res.statusCode = proxyRes.statusCode;
    
    // Copy headers and add CORS headers
    const headers = { ...proxyRes.headers };
    headers["access-control-allow-origin"] = "*";
    headers["access-control-allow-methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD";
    headers["access-control-allow-headers"] = "*";
    
    res.writeHead(proxyRes.statusCode, headers);
    
    // Pipe response data (streaming support)
    proxyRes.pipe(res);
  });

  // Handle proxy request errors
  proxyReq.on("error", (err) => {
    console.error("Proxy Request Error:", err.message);
    res.writeHead(502, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ 
      error: "Proxy Error", 
      message: err.message 
    }));
  });

  // Handle client request errors
  req.on("error", (err) => {
    console.error("Client Request Error:", err.message);
    proxyReq.destroy();
  });

  // Forward request body for POST, PUT, PATCH
  if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
    req.pipe(proxyReq);
  } else {
    proxyReq.end();
  }

  // Set timeout
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
  console.log(`🔗 Example: curl -X POST http://localhost:${port}/https://api.example.com/data -d '{"key":"value"}' -H "Content-Type: application/json"`);
});

// Handle server errors
server.on("error", (err) => {
  console.error("Server Error:", err.message);
});
