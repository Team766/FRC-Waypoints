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
    
    var validFiles = ["main.html", "main.js", "main.css", "simplify.js"];
    var file = req.url.slice(1);
    if (req.method == "GET" && validFiles.indexOf(file) != -1) {
        res.writeHead(200, noCacheHeaders);
        var content = fs.readFileSync(file);
        res.end(content); // TODO: use proper MIME type?
    } else {
        console.log("   => 404");
        res.writeHead(404, noCacheHeaders);
        res.end();
    }
}).listen(PORT);

console.log("Listening at localhost:"+PORT+"\n");
require("opn")("http://localhost:5000/main.html");