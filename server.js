// WAJIB DI PALING ATAS: Eksekusi instalasi otomatis sebelum require lain berjalan
const { execSync } = require('child_process');

try {
    require.resolve('cors-anywhere');
} catch (e) {
    console.log('Mengunduh dependensi cors-anywhere langsung di runtime...');
    execSync('npm install cors-anywhere@^0.4.4 --no-audit --no-fund --prefer-online', { stdio: 'inherit' });
    console.log('Dependensi berhasil diinstal!');
}

const cors_proxy = require('cors-anywhere');
const http = require('http');

const host = '0.0.0.0';
const port = process.env.PORT || 8000;

// Konfigurasi murni CORS Anywhere
const proxyServer = cors_proxy.createServer({
    originWhitelist: [], // Izinkan semua origin
    requireHeader: [],   // Kosongkan agar player IPTV kosongan tidak terblokir
    removeHeaders: ['cookie', 'cookie2', 'x-request-user-agent', 'x-cosmetic-meta'],
    redirectSameOrigin: true,
    httpProxyOptions: {
        xfwd: true, // Setel ke true agar performa routing bawaan server stabil dan cepat
    }
});

// Server HTTP penengah untuk bypass validasi origin kosong pada player/aplikasi
const server = http.createServer((req, res) => {
    if (!req.headers.origin) {
        req.headers.origin = 'https://localhost';
    }
    if (!req.headers['x-requested-with']) {
        req.headers['x-requested-with'] = 'XMLHttpRequest';
    }

    // Oper langsung ke instansi cors-anywhere tanpa modifikasi header eksternal
    proxyServer.emit('request', req, res);
});

server.listen(port, host, () => {
    console.log('CORS Anywhere murni berjalan bebas di ' + host + ':' + port);
});
