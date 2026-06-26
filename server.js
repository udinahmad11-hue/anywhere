// WAJIB DI PALING ATAS: Eksekusi instalasi otomatis sebelum require lain berjalan
const { execSync } = require('child_process');

try {
    require.resolve('cors-anywhere');
} catch (e) {
    console.log('Mengunduh dependensi cors-anywhere langsung di runtime...');
    // Menambahkan bendera prefer-online dan legacy-peer-deps agar instalasi lebih andal
    execSync('npm install cors-anywhere@^0.4.4 --no-audit --no-fund --prefer-online', { stdio: 'inherit' });
    console.log('Dependensi berhasil diinstal!');
}

// Setelah dipastikan terinstal, baru panggil modulnya
const cors_proxy = require('cors-anywhere');
const http = require('http');

const host = '0.0.0.0';
const port = process.env.PORT || 8000;

// Konfigurasi dasar proxy
const proxyServer = cors_proxy.createServer({
    originWhitelist: [], 
    requireHeader: [],   // Kosongkan agar player IPTV kosongan tidak terblokir
    removeHeaders: ['cookie', 'cookie2', 'x-request-user-agent', 'x-cosmetic-meta'],
    redirectSameOrigin: true,
    httpProxyOptions: {
        xfwd: false, // Dimatikan agar tidak merusak spoofing IP Singapore di bawah
    }
});

// Server HTTP penengah untuk menyuntikkan header bypass dan lokasi IP Singapore
const server = http.createServer((req, res) => {
    // 1. Suntik header origin jika player mengirim request kosong
    if (!req.headers.origin) {
        req.headers.origin = 'https://localhost';
    }
    if (!req.headers['x-requested-with']) {
        req.headers['x-requested-with'] = 'XMLHttpRequest';
    }

    // 2. Suntik IP Publik Singapore (Leaseweb Asia Pacific)
    const singaporeIP = '203.117.96.175'; 
    req.headers['x-forwarded-for'] = singaporeIP;
    req.headers['x-real-ip'] = singaporeIP;
    req.headers['client-ip'] = singaporeIP;

    // Teruskan request ke instance cors-anywhere
    proxyServer.emit('request', req, res);
});

server.listen(port, host, () => {
    console.log('CORS Anywhere + IP Singapore Aktif di ' + host + ':' + port);
});
