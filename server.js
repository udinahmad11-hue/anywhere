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

// Konfigurasi dasar proxy
const proxyServer = cors_proxy.createServer({
    originWhitelist: [], 
    requireHeader: [],   
    removeHeaders: [
        'cookie', 
        'cookie2', 
        'x-request-user-agent', 
        'x-cosmetic-meta',
        'user-agent', // Kita hapus header bawaan player agar diganti dengan tiruan browser di bawah
        'referer',
        'origin'
    ],
    redirectSameOrigin: true,
    httpProxyOptions: {
        xfwd: false, // Dimatikan agar tidak menimpa header buatan kita
    }
});

// Server HTTP penengah untuk memanipulasi total header request ke target
const server = http.createServer((req, res) => {
    // 1. Definisikan IP Singtel Singapore
    const singtelIP = '218.186.0.1';

    // 2. Suntik/Override semua header sesuai permintaan (Meniru Browser + Singtel)
    req.headers['x-forwarded-for'] = singtelIP;
    req.headers['x-real-ip'] = singtelIP;
    req.headers['client-ip'] = singtelIP;
    
    req.headers['user-agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    req.headers['accept'] = '*/*';
    req.headers['referer'] = 'https://www.starhub.com/';
    req.headers['origin'] = 'https://www.starhub.com';
    req.headers['accept-language'] = 'en-US,en;q=0.9';
    req.headers['connection'] = 'keep-alive';

    // Tambahan wajib internal cors-anywhere agar tidak memicu error missing header
    req.headers['x-requested-with'] = 'XMLHttpRequest';

    // Oper ke instance cors-anywhere
    proxyServer.emit('request', req, res);
});

server.listen(port, host, () => {
    console.log('CORS Proxy Singtel SG + StarHub Headers Aktif di ' + host + ':' + port);
});
