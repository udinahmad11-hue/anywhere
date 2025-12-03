// service.js

const express = require('express');
const { pipeline } = require('stream');
const app = express();

const PORT = process.env.PORT || 3000;

// Bisa diganti sesuai kebutuhan
const ALLOW_ORIGIN = process.env.ALLOW_ORIGIN || '*';
const ALLOWED_TARGET_HOSTS = []; // kosong = izinkan semua (hati-hati)

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', ALLOW_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Range,Content-Type,Authorization');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Length,Content-Range,Accept-Ranges,Content-Type');

  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

function isAllowedTarget(urlObj) {
  if (!ALLOWED_TARGET_HOSTS.length) return true;
  return ALLOWED_TARGET_HOSTS.includes(urlObj.hostname);
}

app.get('/*', async (req, res) => {
  try {
    const encodedTarget = req.originalUrl.slice(1);
    if (!encodedTarget) return res.status(400).send('No target URL provided.');

    const targetUrl = decodeURIComponent(encodedTarget);
    let url;

    try { url = new URL(targetUrl); }
    catch { return res.status(400).send('Invalid target URL.'); }

    if (!isAllowedTarget(url)) return res.status(403).send('Target host not allowed.');

    const headers = {};
    const rangeHeader = req.headers['range'];
    if (rangeHeader) headers['range'] = rangeHeader;

    headers['user-agent'] = req.headers['user-agent'] || 'koyeb-cors-proxy';

    const upstream = await fetch(targetUrl, { headers });

    res.status(upstream.status);

    upstream.headers.forEach((value, name) => {
      if (['content-type','content-length','content-range','accept-ranges','cache-control','etag','last-modified']
          .includes(name.toLowerCase())) {
        res.setHeader(name, value);
      }
    });

    if (!upstream.body) return res.sendStatus(502);

    pipeline(upstream.body, res, err => {
      if (err) console.error("Stream error:", err);
    });

  } catch (err) {
    console.error("Proxy error:", err);
    res.status(500).send('Proxy error');
  }
});

app.listen(PORT, () => console.log(`Service running on port ${PORT}`));
