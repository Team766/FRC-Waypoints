const http = require("http");
const fs = require("fs");

const PORT = 5000;
const noCacheHeaders = {
    "Cache-Control": "no-cache, no-store, must-revalidate", // HTTP 1.1
    "Pragma": "no-cache", // HTTP 1.0
    "Expires": "0" // Proxies
};
http.createServer(function (req, res) {
    console.log("Request: "+req.method+" "+req.url);
    if (req.connection.remoteAddress != "::1") {
        console.log("FOREIGN CONNECTION: "+req.connection.remoteAddress);
        res.writeHead(403, "Fuck off.", noCacheHeaders);
        res.end();
        return;
    }
    
    var body = () => new Promise((resolve, reject) => {
        var bodyStr = "";
        req.on("data", chunk => {bodyStr += chunk});
        req.on("end", () => {
            resolve(bodyStr);
        });
    });
    var formData = () => new Promise((resolve, reject) => {
        body().then(bodyStr => {
            var data = {};
            var decode = str => decodeURIComponent(str.replace(/\+/g, " "));
            bodyStr.split("&").map(s => s.split("=")).forEach(pair => data[pair[0]] = decode(pair[1]));
            resolve(data);
        });
    });
    var jsonData = () => new Promise((resolve, reject) => {
        body().then(bodyStr => {
            resolve(JSON.parse(bodyStr));
        }).catch(err => {
            reject(err);
        });
    });
    
    if (req.method == "GET" && /^\/main.(html|js|css)$/.test(req.url)) {
        res.writeHead(200, noCacheHeaders);
        var content = fs.readFileSync(req.url.slice(1));
        res.end(content); // TODO: use proper MIME type?
    } else {
        console.log("   => 404");
        res.writeHead(404, noCacheHeaders);
        res.end();
    }
}).listen(PORT);

console.log("Listening at localhost:"+PORT+"\n");
require("opn")("http://localhost:5000/main.html");