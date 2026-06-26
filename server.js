const cors_proxy=require("cors-anywhere");
const host="0.0.0.0";
const port=process.env.PORT||8000;
cors_proxy.createServer({
  originWhitelist:[],
  requireHeader:[],
  removeHeaders:["cookie","cookie2"]
}).listen(port,host,()=>console.log("Running on",port));
