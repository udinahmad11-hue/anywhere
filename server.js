// index.js
// Requires: node 18+ (native fetch) OR node <18 dengan node-fetch installed
// Run: npm install express
// Then: node index.js

const express = require('express');
const { pipeline } = require('stream');
const app = express();

const PORT = process.env.PORT || 3000;

// Configure allowed origin(s).
// For testing keep '*' ; for production replace with specific origin like 'https://example.com'
const ALLOW_ORIGIN = process.env.ALLOW_ORIGIN || '*';

// Optional: simple allowlist to avoid open proxy. Set ALLOWED_TARGET_HOSTS="ottb.live.cf.ww.aiv-cdn.net,example.com"
const allowedHostsEnv = process.env.ALLOWED_TARGET_HOSTS || ''; 
const ALLOWED_TARGET_HOSTS = allowedHostsEnv.split(',').map(s => s.trim()).filter(Boolean);

// CORS preflight & headers middleware
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', ALLOW_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Range,Content-Type,Authorization');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Length,Content-Range,Accept-Ranges,Content-Type');
  // Optional: prevent caching of proxied URL by browsers if desired
  // res.setHeader('Cache-Control', 'no-cache');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

// Helper to validate target URL
function isAllowedTarget(urlObj) {
  if (!ALLOWED_TARGET_HOSTS.length) return true; // if none configured, allow all (BE CAREFUL)
  return ALLOWED_TARGET_HOSTS.includes(urlObj.hostname);
}

app.get('/*', async (req, res) => {
  try {
    // originalUrl includes path + querystring. We strip the leading '/' used in user's pattern.
    const encodedTarget = req.originalUrl.slice(1); // removes leading '/'
    if (!encodedTarget) return res.status(400).send('No target URL provided.');

    // decode in case the client encoded it
    const targetUrl = decodeURIComponent(encodedTarget);

    let url;
    try {
      url = new URL(targetUrl);
    } catch (err) {
      return res.status(400).send('Invalid target URL.');
    }

    // optional host allowlist check
    if (!isAllowedTarget(url)) {
      return res.status(403).send('Target host not allowed.');
    }

    // Build headers to forward. Forward Range and Accept headers if present.
    const forwardHeaders = {};
    const range = req.header('range') || req.header('Range');
    if (range) forwardHeaders['range'] = range;
    // Forward user-agent? you can set one or forward original
    forwardHeaders['user-agent'] = req.header('user-agent') || 'koyeb-cors-proxy';

    // If upstream requires special headers (Referer, Origin), you can forward them conditionally.
    const upstreamResponse = await fetch(targetUrl, { headers: forwardHeaders, method: 'GET' });

    // Copy status
    res.status(upstreamResponse.status);

    // Copy select headers from upstream to client (expose them via CORS above)
    const hopByHop = new Set([
      'connection','keep-alive','proxy-authenticate','proxy-authorization',
      'te','trailers','transfer-encoding','upgrade'
    ]);

    upstreamResponse.headers.forEach((value, name) => {
      if (hopByHop.has(name.toLowerCase())) return;
      // Some headers we definitely want to forward:
      if (['content-type','content-length','content-range','accept-ranges','cache-control','last-modified','etag'].includes(name.toLowerCase())) {
        res.setHeader(name, value);
      }
    });

    // Stream body through to client
    if (!upstreamResponse.body) {
      return res.sendStatus(502);
    }

    pipeline(upstreamResponse.body, res, (err) => {
      if (err) {
        console.error('Pipeline error:', err);
      }
    });

  } catch (err) {
    console.error('Proxy error:', err);
    res.status(500).send('Proxy error');
  }
});

app.listen(PORT, () => {
  console.log(`CORS proxy listening on port ${PORT}`);
});
