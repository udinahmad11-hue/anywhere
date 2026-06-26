const { execSync } = require('child_process');

// Trik memaksa instalasi modul secara langsung saat runtime sebelum server menyala
try {
    require.resolve('cors-anywhere');
} catch (e) {
    console.log('Mengunduh dependensi cors-anywhere langsung di runtime...');
    execSync('npm install cors-anywhere@^0.4.4 --no-audit --no-fund', { stdio: 'inherit' });
    console.log('Dependensi berhasil diinstal!');
}

const cors_proxy = require('cors-anywhere');
const http = require('http');

const host = '0.0.0.0';
const port = process.env.PORT || 8000;

// Konfigurasi dasar proxy
const proxyServer = cors_proxy.createServer({
    originWhitelist: [], 
    requireHeader: [],   // Tetap kosong agar player IPTV tidak kena blokir header
    removeHeaders: ['cookie', 'cookie2', 'x-request-user-agent', 'x-cosmetic-meta'],
    redirectSameOrigin: true,
    httpProxyOptions: {
        xfwd: true, // Kembalikan ke true agar jalur data diteruskan secara normal dan cepat
    }
});

// Server HTTP penengah untuk bypass validasi origin kosong pada player
const server = http.createServer((req, res) => {
    if (!req.headers.origin) {
        req.headers.origin = 'https://localhost';
    }
    if (!req.headers['x-requested-with']) {
        req.headers['x-requested-with'] = 'XMLHttpRequest';
    }

    // Oper langsung ke cors-anywhere tanpa modifikasi IP
    proxyServer.emit('request', req, res);
});

server.listen(port, host, () => {
    console.log('CORS Anywhere murni berjalan di ' + host + ':' + port);
});
