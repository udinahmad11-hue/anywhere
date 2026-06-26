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
        xfwd: false, // Kita matikan xfwd bawaan agar tidak menimpa IP Singapore buatan kita
    }
});

// Buat server HTTP penengah untuk memaksa menyuntikkan header jika player mengirim request kosongan
const server = http.createServer((req, res) => {
    // 1. Bypass validasi header bawaan cors-anywhere
    if (!req.headers.origin) {
        req.headers.origin = 'https://localhost';
    }
    if (!req.headers['x-requested-with']) {
        req.headers['x-requested-with'] = 'XMLHttpRequest';
    }

    // 2. Suntik IP Singapore (Contoh: IP Leaseweb / Singtel Singapore)
    const singaporeIP = '128.199.64.12'; // Kamu bisa ganti dengan IP SG operasional lainnya jika mau
    req.headers['x-forwarded-for'] = singaporeIP;
    req.headers['x-real-ip'] = singaporeIP;
    req.headers['client-ip'] = singaporeIP;

    // Oper ke cors-anywhere
    proxyServer.emit('request', req, res);
});

server.listen(port, host, () => {
    console.log('CORS Anywhere + Spoofing IP Singapore berjalan di ' + host + ':' + port);
});
