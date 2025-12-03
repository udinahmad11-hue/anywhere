const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { createProxyMiddleware } = require('http-proxy-middleware');
const nocache = require('nocache');

const app = express();
const PORT = process.env.PORT || 8080;

// Konfigurasi Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 menit
    max: 100, // maksimal 100 request per windowMs
    message: 'Terlalu banyak request dari IP ini, coba lagi nanti.',
    standardHeaders: true,
    legacyHeaders: false,
});

// Middleware keamanan
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
}));
app.use(nocache());
app.use(cors());
app.use(limiter);

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        service: 'CORS Anywhere Proxy',
        timestamp: new Date().toISOString()
    });
});

// Main proxy endpoint
app.use('/', createProxyMiddleware({
    target: 'http://example.com',
    changeOrigin: true,
    pathRewrite: {
        '^/proxy/': '/'
    },
    onProxyReq: (proxyReq, req, res) => {
        // Tambahkan header CORS
        proxyReq.setHeader('Origin', req.headers.origin || '');
        proxyReq.setHeader('Referer', req.headers.referer || '');
        
        // Log request untuk debugging
        console.log(`[${new Date().toISOString()}] Proxying: ${req.method} ${req.url}`);
    },
    onProxyRes: (proxyRes, req, res) => {
        // Tambahkan header CORS untuk response
        proxyRes.headers['Access-Control-Allow-Origin'] = '*';
        proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
        proxyRes.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With';
        
        // Cache control
        proxyRes.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
        proxyRes.headers['Pragma'] = 'no-cache';
        proxyRes.headers['Expires'] = '0';
    },
    onError: (err, req, res) => {
        console.error(`[${new Date().toISOString()}] Proxy Error:`, err.message);
        res.status(500).json({
            error: 'Proxy Error',
            message: err.message
        });
    },
    router: (req) => {
        // Ekstrak URL target dari query parameter
        const targetUrl = req.query.url || req.headers['x-target-url'];
        
        if (!targetUrl) {
            throw new Error('URL target diperlukan. Gunakan parameter ?url= atau header X-Target-URL');
        }
        
        // Validasi URL
        try {
            const url = new URL(targetUrl);
            return url.origin;
        } catch (error) {
            throw new Error('URL tidak valid');
        }
    },
    pathFilter: (pathname, req) => {
        // Filter path untuk memastikan hanya path tertentu yang diproses
        return pathname === '/';
    },
    selfHandleResponse: false,
    logLevel: 'warn'
}));

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(`[${new Date().toISOString()}] Error:`, err.message);
    
    res.status(err.status || 500).json({
        error: err.name || 'Internal Server Error',
        message: err.message,
        timestamp: new Date().toISOString()
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: 'Endpoint tidak ditemukan',
        timestamp: new Date().toISOString()
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`CORS Anywhere Proxy berjalan di port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
});

module.exports = app;
