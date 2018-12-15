const http = require('http');
const fs = require('fs');
const url = require('url');
const path = require('path');
const etag = require('etag');
const fresh = require('fresh');

const server = http.createServer(function (req, res) {
    let filePath, isHtml, isFresh;
    const pathname = url.parse(req.url, true).pathname;
    //根据请求路径取文件绝对路径
    if (pathname === '/') {
        filePath = path.join(__dirname, '/index.html');
        isHtml = true;
    } else {
        filePath = path.join(__dirname, 'static', pathname);
        isHtml = false;
    }

    // 读取文件描述信息，用于计算etag及设置Last-Modified
    fs.stat(filePath, function (err, stat) {
        if (err) {
            res.writeHead(404, 'not found');
            res.end('<h1>404 Not Found</h1>');
        } else {
            if (isHtml) {
                // html文件使用协商缓存
                const lastModified = stat.mtime.toUTCString();
                const fileEtag = etag(stat);                
                res.setHeader('Cache-Control', 'public, max-age=0');
                res.setHeader('Last-Modified', lastModified);
                res.setHeader('ETag', fileEtag);

                // 根据请求头判断缓存是否是最新的
                isFresh = fresh(req.headers, {
                    'etag': fileEtag,
                    'last-modified': lastModified
                });
            } else {
                // 其他静态资源使用强缓存
                res.setHeader('Cache-Control', 'public, max-age=3600');
            }

            fs.readFile(filePath, 'utf-8', function (err, fileContent) {
                if (err) {
                    res.writeHead(404, 'not found');
                    res.end('<h1>404 Not Found</h1>');
                } else {
                    if (isHtml && isFresh) {
                        //如果缓存是最新的 则返回304状态码
                        //由于其他资源使用了强缓存 所以不会出现304
                        res.writeHead(304, 'Not Modified');
                    } else {
                        res.write(fileContent, 'utf-8');
                    }

                    res.end();
                }
            });
        }
    });
});
server.listen(8080);
console.log('server is running on http://localhost:8080/');