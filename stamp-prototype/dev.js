// 로컬 확인용 서버: 정적 파일 + /api/identify (배포는 Vercel이 api/ 폴더를 그대로 씀)
// 실행: node stamp-prototype/dev.js   (키는 공모전 폴더 .env의 GEMINI_API_KEY — 사이트 폴더 밖이라 웹으로 안 나감, 키 없이 화면만 볼 때 STAMP_MOCK=1)
const http = require("http");
const fs = require("fs");
const path = require("path");
try { process.loadEnvFile(path.join(__dirname, "..", ".env")); } catch {} // .env가 없으면 그냥 넘어감
const identify = require("./api/identify.js");

const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css", ".png": "image/png", ".svg": "image/svg+xml" };
const PORT = process.env.PORT || 8766;

http.createServer((req, res) => {
  const url = new URL(req.url, "http://x");
  if (url.pathname === "/api/identify") return identify(req, res);
  const file = path.join(__dirname, url.pathname === "/" ? "index.html" : path.normalize(url.pathname));
  // .env 같은 점 파일과 서버 코드는 내려보내지 않음
  if (!file.startsWith(__dirname) || file.includes(`${path.sep}api${path.sep}`) || path.basename(file).startsWith(".")) { res.statusCode = 404; return res.end(); }
  fs.readFile(file, (err, data) => {
    if (err) { res.statusCode = 404; return res.end(); }
    res.setHeader("Content-Type", TYPES[path.extname(file)] || "application/octet-stream");
    res.end(data);
  });
}).listen(PORT, () => console.log(`STAMP dev: http://localhost:${PORT}`));
