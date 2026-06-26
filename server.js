const cors_proxy = require("cors-anywhere");

const host = "0.0.0.0";
const port = process.env.PORT || 8000;

cors_proxy
  .createServer({
    originWhitelist: [],
    requireHeader: [],
    removeHeaders: [
      "cookie",
      "cookie2",
      "x-forwarded-for",
      "x-real-ip"
    ],
    setHeaders: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Allow-Methods": "*"
    }
  })
  .listen(port, host, () => {
    console.log(`CORS Anywhere running on ${host}:${port}`);
  });
