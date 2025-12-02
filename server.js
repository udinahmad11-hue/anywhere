const http = require("http");
const https = require("https");
const { URL } = require("url");
const querystring = require("querystring");

const host = "0.0.0.0";
const port = process.env.PORT || 3000;

// Helper: choose HTTP or HTTPS client
function requestClient(url) {
  return url.startsWith("https") ? https : http;
}

// Headers untuk request ke API MPD Checker
const mpdCheckerHeaders = {
  "accept": "*/*",
  "accept-language": "en-US,en;q=0.9,id;q=0.8",
  "origin": "https://webiptv.site",
  "priority": "u=1, i",
  "referer": "https://webiptv.site/",
  "sec-ch-ua": '"Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"Windows"',
  "sec-fetch-dest": "empty",
  "sec-fetch-mode": "cors",
  "sec-fetch-site": "cross-site",
  "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36"
};

// Fungsi untuk mengambil token dari MPD Checker
function getMPDToken(channelPath) {
  return new Promise((resolve, reject) => {
    const baseUrl = "https://ucdn.starhubgo.com/bpk-tv/";
    const targetUrl = baseUrl + channelPath;
    const encodedUrl = encodeURIComponent(targetUrl);
    const apiUrl = `https://mpdchecker.updatesbyrahul.site/output.php?url=${encodedUrl}`;

    console.log(`Requesting token for: ${channelPath}`);
    console.log(`API URL: ${apiUrl}`);

    const req = https.get(apiUrl, { headers: mpdCheckerHeaders }, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          const token = data.trim();
          console.log(`Got token: ${token.substring(0, 50)}...`);
          resolve(token);
        } else {
          reject(new Error(`API returned status ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

const server = http.createServer(async (req, res) => {
  console.log(`\n=== New Request ===`);
  console.log(`Method: ${req.method}`);
  console.log(`URL: ${req.url}`);

  // Handle OPTIONS for CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200, {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET, HEAD, OPTIONS',
      'access-control-allow-headers': '*',
      'access-control-max-age': '86400'
    });
    return res.end();
  }

  // Handle root path
  if (!req.url || req.url === "/" || req.url === "/favicon.ico") {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>StarHub MPD Proxy</title>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
          .example { background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0; }
          code { background: #eee; padding: 2px 5px; border-radius: 3px; }
        </style>
      </head>
      <body>
        <h1>StarHub MPD Proxy</h1>
        <p>Proxy untuk mengakses MPD stream StarHub.</p>
        
        <h2>Cara Penggunaan:</h2>
        <div class="example">
          <code>https://${req.headers.host}/HubPremier1/output/manifest.mpd</code>
        </div>
        
        <h3>Format URL:</h3>
        <ul>
          <li><code>/{channel_name}/output/manifest.mpd</code></li>
        </ul>
        
        <h3>Contoh Channel:</h3>
        <ul>
          <li><a href="/HubPremier1/output/manifest.mpd">HubPremier1</a></li>
          <li><a href="/HubPremier2/output/manifest.mpd">HubPremier2</a></li>
          <li><a href="/SPOTVNEW/output/manifest.mpd">SPOTVNEW</a></li>
          <li><a href="/SPOTV2NEW/output/manifest.mpd">SPOTV2NEW</a></li>
        </ul>
        
        <hr>
        <p><small>Proxy Service running on Koyeb</small></p>
      </body>
      </html>
    `);
    return;
  }

  try {
    // Ekstrak channel path dari URL
    // Contoh: /HubPremier1/output/manifest.mpd
    const channelPath = req.url.startsWith('/') ? req.url.substring(1) : req.url;
    
    console.log(`Channel path: ${channelPath}`);
    
    // Validasi format path
    if (!channelPath) {
      res.writeHead(400, { "Content-Type": "text/plain" });
      return res.end("ERROR: Path tidak ditemukan");
    }

    // Dapatkan token dari MPD Checker
    let token;
    try {
      token = await getMPDToken(channelPath);
    } catch (error) {
      console.error(`Error getting MPD token: ${error.message}`);
      res.writeHead(502, { "Content-Type": "text/plain" });
      return res.end(`ERROR: Gagal mengambil token MPD.\n${error.message}`);
    }

    // Bangun URL final untuk streaming
    // Token dari API sudah berupa URL lengkap, jadi kita bisa langsung gunakan
    const finalUrl = token;
    
    console.log(`Final streaming URL: ${finalUrl}`);
    
    // Parse URL untuk proxy
    let targetUrl;
    try {
      targetUrl = new URL(finalUrl);
    } catch (e) {
      console.error(`Invalid final URL: ${finalUrl}`);
      res.writeHead(500, { "Content-Type": "text/plain" });
      return res.end(`ERROR: URL final tidak valid: ${finalUrl}`);
    }

    // Proxy ke URL final
    const proxyReq = requestClient(targetUrl.href).get(targetUrl.href, { 
      headers: {
        ...req.headers,
        host: targetUrl.host,
        origin: targetUrl.origin,
        referer: targetUrl.origin
      }
    }, (proxyRes) => {
      // Set CORS headers
      const headers = {
        ...proxyRes.headers,
        "access-control-allow-origin": "*",
        "access-control-allow-headers": "*",
        "access-control-allow-methods": "GET, HEAD, OPTIONS",
        "access-control-expose-headers": "*"
      };

      res.writeHead(proxyRes.statusCode, headers);
      proxyRes.pipe(res);
    });

    proxyReq.on('error', (err) => {
      console.error(`Proxy error: ${err.message}`);
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end("Proxy error: " + err.message);
    });

    req.on('close', () => {
      proxyReq.destroy();
    });

  } catch (error) {
    console.error(`Server error: ${error.message}`);
    console.error(error.stack);
    
    res.writeHead(500, { "Content-Type": "text/plain" });
    res.end(`ERROR: Internal server error\n${error.message}`);
  }
});

// Error handling untuk server
server.on('error', (error) => {
  console.error(`Server error: ${error.message}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

server.listen(port, host, () => {
  console.log(`StarHub MPD Proxy running at http://${host}:${port}`);
  console.log(`Example: http://${host}:${port}/HubPremier1/output/manifest.mpd`);
});
