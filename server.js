const cors_proxy = require("cors-anywhere");

const host = "0.0.0.0";
const port = process.env.PORT || 8080;

cors_proxy.createServer({
  originWhitelist: [], // Izinkan semua origin
  requireHeader: [],
  removeHeaders: [
    "cookie",
    "cookie2",
    "x-forwarded-for",
    "x-real-ip"
  ],
  setHeaders: {
    "X-Powered-By": "Koyeb CORS Anywhere"
  }
}).listen(port, host, () => {
  console.log(`Running CORS Anywhere on ${host}:${port}`);
});
