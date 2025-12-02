const http = require("http");
const https = require("https");
const { URL } = require("url");

const host = "0.0.0.0";
const port = process.env.PORT || 3000;

// Helper: choose HTTP or HTTPS client
function requestClient(url) {
  return url.startsWith("https") ? https : http;
}

// Headers untuk MPD Checker API
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

// Fungsi ambil token dari MPD Checker
function getMPDToken(channelPath) {
  return new Promise((resolve, reject) => {
    const targetUrl = `https://ucdn.starhubgo.com/bpk-tv/${channelPath}`;
    const encodedUrl = encodeURIComponent(targetUrl);
    const apiUrl = `https://mpdchecker.updatesbyrahul.site/output.php?url=${encodedUrl}`;
    
    console.log(`[API] Getting token for: ${channelPath}`);
    
    const req = https.get(apiUrl, { headers: MPD_CHECKER_HEADERS }, (res) => {
      let data = '';
      
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          const tokenUrl = data.trim();
          console.log(`[API] Got token: ${tokenUrl.substring(0, 80)}...`);
          resolve(tokenUrl);
        } else {
          reject(new Error(`API error ${res.statusCode}`));
        }
      });
    });
    
    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('API timeout'));
    });
  });
}

const server = http.createServer(async (req, res) => {
  console.log(`[REQ] ${req.method} ${req.url}`);
  
  // CORS headers untuk semua response
  res.setHeader("access-control-allow-origin", "*");
  res.setHeader("access-control-allow-headers", "*");
  res.setHeader("access-control-allow-methods", "GET, HEAD, OPTIONS");
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    return res.end();
  }
  
  // Jika root path, kasih info singkat
  if (req.url === "/" || req.url === "/favicon.ico") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    return res.end("StarHub MPD Proxy\n\nUsage: /{channel}/output/manifest.mpd\nExample: /HubPremier1/output/manifest.mpd");
  }
  
  try {
    // Ambil channel path (hilangkan slash awal)
    const channelPath = req.url.startsWith('/') ? req.url.substring(1) : req.url;
    
    // Validasi minimal
    if (!channelPath || channelPath.length < 5) {
      res.writeHead(400, { "Content-Type": "text/plain" });
      return res.end("ERROR: Invalid path format. Example: /HubPremier1/output/manifest.mpd");
    }
    
    // 1. Ambil token URL dari API
    const tokenUrl = await getMPDToken(channelPath);
    
    // Validasi token URL
    if (!tokenUrl || !tokenUrl.startsWith('http')) {
      throw new Error(`Invalid token URL: ${tokenUrl}`);
    }
    
    console.log(`[PROXY] Forwarding to: ${tokenUrl}`);
    
    // 2. Parse URL
    const targetUrl = new URL(tokenUrl);
    
    // 3. Proxy request ke token URL
    const proxyReq = requestClient(targetUrl.href).get(targetUrl.href, (proxyRes) => {
      console.log(`[PROXY] Response: ${proxyRes.statusCode}`);
      
      // Salin semua headers dari response asli
      const headers = { ...proxyRes.headers };
      
      // Hapus content-length (biarkan Node.js hitung ulang)
      delete headers['content-length'];
      
      // Tambahkan CORS headers ke response
      headers['access-control-allow-origin'] = '*';
      headers['access-control-allow-headers'] = '*';
      headers['access-control-allow-methods'] = 'GET, HEAD, OPTIONS';
      
      res.writeHead(proxyRes.statusCode, headers);
      proxyRes.pipe(res);
    });
    
    proxyReq.on('error', (err) => {
      console.error(`[PROXY] Error: ${err.message}`);
      res.writeHead(502, { "Content-Type": "text/plain" });
      res.end(`Proxy error: ${err.message}`);
    });
    
    req.on('close', () => {
      proxyReq.destroy();
    });
    
  } catch (error) {
    console.error(`[ERROR] ${error.message}`);
    
    if (error.code === 'ERR_INVALID_URL') {
      res.writeHead(400, { "Content-Type": "text/plain" });
      res.end(`ERROR: Invalid URL format\n${error.message}`);
    } else {
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end(`ERROR: ${error.message}`);
    }
  }
});

server.listen(port, host, () => {
  console.log(`StarHub MPD Proxy running on port ${port}`);
  console.log(`Test URL: http://localhost:${port}/HubPremier1/output/manifest.mpd`);
});
