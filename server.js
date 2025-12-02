const http = require("http");
const https = require("https");
const { URL } = require("url");

const host = "0.0.0.0";
const port = process.env.PORT || 3000;

// Helper: choose HTTP or HTTPS client
function requestClient(url) {
  return url.startsWith("https") ? https : http;
}

// Headers untuk request ke MPD Checker API
const MPD_CHECKER_HEADERS = {
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

// Fungsi untuk mendapatkan token dari MPD Checker
async function getMPDToken(channelPath) {
  return new Promise((resolve, reject) => {
    // Build target URL
    const targetUrl = `https://ucdn.starhubgo.com/bpk-tv/${channelPath}`;
    const encodedUrl = encodeURIComponent(targetUrl);
    const apiUrl = `https://mpdchecker.updatesbyrahul.site/output.php?url=${encodedUrl}`;
    
    console.log(`Getting token for: ${channelPath}`);
    console.log(`API URL: ${apiUrl}`);
    
    const req = https.get(apiUrl, { headers: MPD_CHECKER_HEADERS }, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          const tokenUrl = data.trim();
          console.log(`Got token URL: ${tokenUrl}`);
          resolve(tokenUrl);
        } else {
          reject(new Error(`MPD Checker API returned ${res.statusCode}`));
        }
      });
    });
    
    req.on('error', (err) => {
      reject(err);
    });
    
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

const server = http.createServer(async (req, res) => {
  console.log(`\n=== Request: ${req.method} ${req.url} ===`);
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200, {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET, HEAD, OPTIONS',
      'access-control-allow-headers': '*',
      'access-control-max-age': '86400'
    });
    return res.end();
  }
  
  // Home page
  if (req.url === "/" || req.url === "/favicon.ico") {
    res.writeHead(200, { "Content-Type": "text/html" });
    return res.end(`
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
          <li><a href="/HubSports3HDNEW/output/manifest.mpd">HubSports3HDNEW</a></li>
          <li><a href="/SPOTVNEW/output/manifest.mpd">SPOTVNEW</a></li>
          <li><a href="/SPOTV2NEW/output/manifest.mpd">SPOTV2NEW</a></li>
        </ul>
        
        <hr>
        <p><small>Proxy Service running on Koyeb</small></p>
      </body>
      </html>
    `);
  }
  
  try {
    // Extract channel path from URL (remove leading slash)
    const channelPath = req.url.startsWith('/') ? req.url.substring(1) : req.url;
    
    // Validate path format
    if (!channelPath.includes('/output/manifest.mpd')) {
      res.writeHead(400, { "Content-Type": "text/plain" });
      return res.end("ERROR: Path harus mengikuti format: /{channel}/output/manifest.mpd\n\nContoh: /HubPremier1/output/manifest.mpd");
    }
    
    // Step 1: Get token URL from MPD Checker
    let tokenUrl;
    try {
      tokenUrl = await getMPDToken(channelPath);
    } catch (error) {
      console.error(`Error getting token: ${error.message}`);
      res.writeHead(502, { "Content-Type": "text/plain" });
      return res.end(`ERROR: Gagal mengambil token MPD\n${error.message}`);
    }
    
    // Validate token URL
    if (!tokenUrl || !tokenUrl.startsWith('http')) {
      console.error(`Invalid token URL: ${tokenUrl}`);
      res.writeHead(502, { "Content-Type": "text/plain" });
      return res.end(`ERROR: Token URL tidak valid: ${tokenUrl}`);
    }
    
    console.log(`Proxying to token URL: ${tokenUrl}`);
    
    // Step 2: Parse the token URL
    let targetUrl;
    try {
      targetUrl = new URL(tokenUrl);
    } catch (e) {
      console.error(`Invalid URL format: ${tokenUrl}`);
      res.writeHead(500, { "Content-Type": "text/plain" });
      return res.end(`ERROR: Format URL tidak valid\n${tokenUrl}`);
    }
    
    // Step 3: Proxy to the token URL
    const proxyReq = requestClient(targetUrl.href).get(targetUrl.href, (proxyRes) => {
      console.log(`Proxy response: ${proxyRes.statusCode}`);
      
      // Copy headers and add CORS
      const headers = { ...proxyRes.headers };
      
      // Add CORS headers
      headers['access-control-allow-origin'] = '*';
      headers['access-control-allow-headers'] = '*';
      headers['access-control-allow-methods'] = 'GET, HEAD, OPTIONS';
      headers['access-control-expose-headers'] = '*';
      
      // Remove content-length if it exists (let Node.js handle it)
      if (headers['content-length']) {
        delete headers['content-length'];
      }
      
      res.writeHead(proxyRes.statusCode, headers);
      
      // Pipe the response
      proxyRes.pipe(res);
    });
    
    proxyReq.on('error', (err) => {
      console.error(`Proxy error: ${err.message}`);
      res.writeHead(502, { "Content-Type": "text/plain" });
      res.end(`ERROR: Proxy error\n${err.message}`);
    });
    
    // Handle client disconnect
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
  console.log(`Example URLs:`);
  console.log(`  http://${host}:${port}/HubPremier1/output/manifest.mpd`);
  console.log(`  http://${host}:${port}/HubSports3HDNEW/output/manifest.mpd`);
  console.log(`  http://${host}:${port}/SPOTV2NEW/output/manifest.mpd`);
});
