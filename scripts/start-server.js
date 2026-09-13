const { spawn } = require('child_process');
const path = require('path');
const http = require('http');
const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');

// Cổng của các microservices nội bộ
const AUTH_PORT = 3000;
const USERS_PORT = 3001;
const FILES_PORT = 3002;
const CHAT_PORT = 3003;
const GRPC_PORT = 5000;

// Cổng công khai của Render (Render tự động truyền biến PORT)
const PUBLIC_PORT = process.env.PORT || 10000;

console.log('🚀 Đang khởi động các dịch vụ Backend...');

function runService(name, scriptPath, env = {}) {
  const child = spawn(process.execPath, ['--max-old-space-size=120', scriptPath], {
    env: { ...process.env, ...env },
    stdio: 'inherit',
  });

  console.log(`[${name}] Đang chạy trên tiến trình PID: ${child.pid}`);

  child.on('error', (err) => {
    console.error(`[${name}] Gặp lỗi khi chạy:`, err.message);
  });

  child.on('exit', (code, signal) => {
    console.warn(`[${name}] Đã dừng (code: ${code}, signal: ${signal})`);
  });

  return child;
}

// 1. Khởi chạy 4 microservices với các cổng nội bộ riêng biệt
runService('USERS', path.join(__dirname, '../apps/users/dist/main.js'), {
  USERS_PORT: String(USERS_PORT),
});

runService('AUTH', path.join(__dirname, '../apps/auth/dist/main.js'), {
  PORT: String(AUTH_PORT),
  USERS_GRPC_URL: `127.0.0.1:${GRPC_PORT}`,
});

runService('FILES', path.join(__dirname, '../apps/files/dist/main.js'), {
  PORT: String(FILES_PORT),
});

runService('CHAT', path.join(__dirname, '../apps/chat/dist/main.js'), {
  PORT: String(CHAT_PORT),
});

// 2. Khởi chạy Gateway Server để gom toàn bộ API và WebSocket về 1 domain Render
const app = express();

// Cấu hình CORS ở cấp độ Gateway (Cho phép Vercel, localhost và mọi origin với credentials)
const corsOptions = {
  origin: (origin, callback) => {
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'Cookie',
  ],
  exposedHeaders: ['Set-Cookie'],
};

// Bật CORS middleware
app.use(cors(corsOptions));

// Tự động xử lý ngay lập tức các preflight request OPTIONS với 204 No Content
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

// Health check endpoint cho Render
app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Helper tạo proxy middleware an toàn có gắn kèm CORS header
function createServiceProxy(target) {
  return createProxyMiddleware({
    target,
    changeOrigin: true,
    onProxyRes: (proxyRes, req) => {
      const origin = req.headers.origin;
      if (origin) {
        proxyRes.headers['access-control-allow-origin'] = origin;
        proxyRes.headers['access-control-allow-credentials'] = 'true';
      }
    },
    onError: (err, req, res) => {
      console.error(`[Proxy Error] ${req.url}:`, err.message);
      if (!res.headersSent) {
        res.writeHead(502, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': req.headers.origin || '*',
          'Access-Control-Allow-Credentials': 'true',
        });
        res.end(
          JSON.stringify({
            message: 'Dịch vụ đang khởi động, vui lòng thử lại sau vài giây',
          })
        );
      }
    },
  });
}

// Phân luồng API chính xác đến từng microservice
app.use('/api/auth', createServiceProxy(`http://localhost:${AUTH_PORT}`));
app.use('/api/users', createServiceProxy(`http://localhost:${USERS_PORT}`));
app.use('/api/files', createServiceProxy(`http://localhost:${FILES_PORT}`));
app.use('/api', createServiceProxy(`http://localhost:${CHAT_PORT}`));

const server = http.createServer(app);

// WebSocket Proxy cho Socket.IO
const wsProxy = createProxyMiddleware({
  target: `http://localhost:${CHAT_PORT}`,
  changeOrigin: true,
  ws: true,
  onProxyRes: (proxyRes, req) => {
    const origin = req.headers.origin;
    if (origin) {
      proxyRes.headers['access-control-allow-origin'] = origin;
      proxyRes.headers['access-control-allow-credentials'] = 'true';
    }
  },
  onError: (err, req, res) => {
    console.error(`[WebSocket Proxy Error]`, err.message);
  },
});

app.use('/socket.io', wsProxy);
server.on('upgrade', wsProxy.upgrade);

server.listen(PUBLIC_PORT, () => {
  console.log(`🌟 Gateway đã sẵn sàng hoạt động tại cổng ${PUBLIC_PORT}`);
});
