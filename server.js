const host = '0.0.0.0';
const port = process.env.PORT || 8000;

// Increase parallel streams (important for DASH segments)
require('http').globalAgent.maxSockets = 1000;
require('https').globalAgent.maxSockets = 1000;

const cors_proxy = require('./lib/cors-anywhere');

cors_proxy.createServer({
  originWhitelist: [],
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
  
  httpProxyOptions: {
    xfwd: false,
    preserveHeaderKeyCase: true,
    followRedirects: true,
    ignorePath: false,
    changeOrigin: true,
  },
  
  redirectSameOrigin: false,
  
}).listen(port, host, function() {
  console.log('CORS Proxy running on ' + host + ':' + port);
});
