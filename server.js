const cors_proxy = require('cors-anywhere');
const http = require('http');

const host = '0.0.0.0';
const port = process.env.PORT || 8000;

// Konfigurasi dasar proxy
const proxyServer = cors_proxy.createServer({
    originWhitelist: [], // Izinkan semua origin
    requireHeader: [],   // KOSONGKAN agar tidak wajib mengirim header origin/x-requested-with
    removeHeaders: ['cookie', 'cookie2', 'x-request-user-agent', 'x-cosmetic-meta'],
    redirectSameOrigin: true,
    httpProxyOptions: {
        xfwd: true,
    }
});

// Buat server HTTP penengah untuk memaksa menyuntikkan header jika player mengirim request kosongan
const server = http.createServer((req, res) => {
    if (!req.headers.origin) {
        req.headers.origin = 'https://localhost';
    }
    if (!req.headers['x-requested-with']) {
        req.headers['x-requested-with'] = 'XMLHttpRequest';
    }
    proxyServer.emit('request', req, res);
});

server.listen(port, host, () => {
    console.log('CORS Anywhere bebas header berjalan di ' + host + ':' + port);
});
