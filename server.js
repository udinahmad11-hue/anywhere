const cors_proxy = require('cors-anywhere');

// Koyeb akan menyediakan PORT secara otomatis lewat environment variable
const host = '0.0.0.0';
const port = process.env.PORT || 8000;

cors_proxy.createServer({
    // Kamu bisa mengizinkan origin tertentu di sini jika ingin privat.
    // Jika dikosongkan (enpty array), semua website bisa menembak proxy ini.
    originWhitelist: [], 
    
    requireHeader: ['origin', 'x-requested-with'],
    removeHeaders: [
        'cookie',
        'cookie2',
        'x-request-user-agent',
        'x-cosmetic-meta',
    ],
    redirectSameOrigin: true,
    httpProxyOptions: {
        xfwd: true, // Menambahkan header X-Forwarded-For
    }
}).listen(port, host, () => {
    console.log('CORS Anywhere proxy berjalan di ' + host + ':' + port);
});
