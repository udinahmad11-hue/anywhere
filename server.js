const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 8080;

// Enable CORS
app.use(cors());

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        service: 'CORS Proxy',
        timestamp: new Date().toISOString() 
    });
});

// Simple home page with JSON response
app.get('/', (req, res) => {
    res.json({
        service: 'CORS Proxy for Koyeb',
        endpoints: {
            health: 'GET /health',
            proxy: 'GET /proxy?url=ENCODED_URL',
            direct: 'GET /ENCODED_URL'
        },
        example: {
            proxy: '/proxy?url=' + encodeURIComponent('https://example.com/api/data'),
            direct: '/' + encodeURIComponent('https://example.com/api/data')
        }
    });
});

// Proxy endpoint with query parameter
app.use('/proxy', createProxyMiddleware({
    router: (req) => {
        const targetUrl = req.query.url;
        if (!targetUrl) {
            throw new Error('URL parameter is required: /proxy?url=ENCODED_URL');
        }
        return new URL(targetUrl).origin;
    },
    pathRewrite: (path, req) => {
        const targetUrl = req.query.url;
        const urlObj = new URL(targetUrl);
        return urlObj.pathname + urlObj.search;
    },
    changeOrigin: true,
    onProxyReq: (proxyReq, req, res) => {
        // Add CORS headers
        proxyReq.setHeader('Origin', req.headers.origin || '*');
    },
    onProxyRes: (proxyRes, req, res) => {
        proxyRes.headers['Access-Control-Allow-Origin'] = '*';
        proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
    }
}));

// Direct proxy endpoint
app.use('/:encodedUrl', (req, res, next) => {
    try {
        const encodedUrl = req.params.encodedUrl;
        const targetUrl = decodeURIComponent(encodedUrl);
        
        return createProxyMiddleware({
            target: targetUrl,
            changeOrigin: true,
            pathRewrite: (path, req) => {
                const urlObj = new URL(targetUrl);
                return urlObj.pathname + urlObj.search;
            },
            onProxyRes: (proxyRes, req, res) => {
                proxyRes.headers['Access-Control-Allow-Origin'] = '*';
            }
        })(req, res, next);
    } catch (error) {
        res.status(400).json({ error: 'Invalid URL', message: error.message });
    }
});

// Error handling
app.use((err, req, res, next) => {
    console.error('Error:', err.message);
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Not Found', path: req.path });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 CORS Proxy running on port ${PORT}`);
    console.log(`📡 Health check: http://localhost:${PORT}/health`);
});
