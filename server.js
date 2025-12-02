const http = require("http");
const https = require("https");
const { URL } = require("url");

const PORT = process.env.PORT || 3000;

// Get token from MPD Checker API
async function getToken(channel) {
  const target = `https://ucdn.starhubgo.com/bpk-tv/${channel}`;
  const apiUrl = `https://mpdchecker.updatesbyrahul.site/output.php?url=${encodeURIComponent(target)}`;
  
  return new Promise((resolve, reject) => {
    const req = https.get(apiUrl, {
      headers: {
        "accept": "*/*",
        "user-agent": "Mozilla/5.0",
        "origin": "https://webiptv.site",
        "referer": "https://webiptv.site/"
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => res.statusCode === 200 ? resolve(data.trim()) : reject());
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  // Set CORS headers
  res.setHeader("access-control-allow-origin", "*");
  res.setHeader("access-control-allow-headers", "*");
  
  // Root path
  if (req.url === "/") {
    res.end("StarHub Proxy - Use: /{channel}/output/manifest.mpd");
    return;
  }
  
  try {
    // Get token URL
    const token = await getToken(req.url.substring(1));
    
    // Proxy to token URL
    const target = new URL(token);
    const proxy = target.protocol === 'https:' ? https : http;
    
    proxy.get(target.href, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    }).on('error', () => {
      res.writeHead(500);
      res.end("Proxy error");
    });
    
  } catch {
    res.writeHead(500);
    res.end("Error getting stream");
  }
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
