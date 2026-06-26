const host = '0.0.0.0';
const port = process.env.PORT || 8000; // Koyeb default port 8000

// Increase parallel streams (important for DASH segments)
require('http').globalAgent.maxSockets = 1000;
require('https').globalAgent.maxSockets = 1000;

const cors_proxy = require('./lib/cors-anywhere');

cors_proxy.createServer({
  originWhitelist: [], // Allow all origins
  requireHeader: [],
  
  removeHeaders: [
    'cookie',
    'cookie2',
    'x-request-start',
    'x-request-id',
    'via',
    'connect-time',
    'total-route-time'
  ],
  
  // DASH optimization: Enable raw streaming, preserve Range requests
  httpProxyOptions: {
    xfwd: false,
    preserveHeaderKeyCase: true,
    followRedirects: true,
    ignorePath: false,
    changeOrigin: true,
  },
  
  // DASH requires redirect support for MPD
  redirectSameOrigin: false,
  
  // Optional: Set timeout untuk Koyeb
  timeout: 60000, // 60 seconds timeout
  
}).listen(port, host, function() {
  console.log('DASH-Optimized CORS Anywhere running on ' + host + ':' + port);
  console.log('Server is ready for Koyeb deployment');
});
