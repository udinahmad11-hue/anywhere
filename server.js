const { execSync } = require('child_process');

// Trik memaksa instalasi modul secara langsung saat runtime sebelum server menyala
try {
    require.resolve('cors-anywhere');
} catch (e) {
    console.log('Mengunduh dependensi cors-anywhere langsung di runtime...');
    execSync('npm install cors-anywhere@^0.4.4 --no-audit --no-fund', { stdio: 'inherit' });
    console.log('Dependensi berhasil diinstal!');
}

// Jalankan server seperti biasa setelah modul terpasang
const cors_proxy = require('cors-anywhere');

const host = '0.0.0.0';
const port = process.env.PORT || 8000;

cors_proxy.createServer({
    originWhitelist: [], // Mengizinkan semua domain
    
    // --- PERUBAHAN UTAMA DI SINI ---
    requireHeader: [], // DIKOSONGKAN agar tidak wajib mengirim header origin/x-requested-with
    // -------------------------------

    removeHeaders: [
        'cookie',
        'cookie2',
        'x-request-user-agent',
        'x-cosmetic-meta',
    ],
    redirectSameOrigin: true,
    httpProxyOptions: {
        xfwd: true,
    }
}).listen(port, host, () => {
    console.log('CORS Anywhere proxy berjalan bebas di ' + host + ':' + port);
});
