const express = require('express');
const cors = require('cors');

const spotsRouter = require('./routes/spots');
const routesRouter = require('./routes/routes');
const diariesRouter = require('./routes/diaries');
const usersRouter = require('./routes/users');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '1mb' }));

// 请求日志中间件
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    const color = status >= 400 ? '\x1b[31m' : status >= 300 ? '\x1b[33m' : '\x1b[32m';
    console.log(`${color}${req.method} ${req.path} ${status} ${duration}ms\x1b[0m`);
  });
  next();
});

// API 路由
app.use('/api/spots', spotsRouter);
app.use('/api/routes', routesRouter);
app.use('/api/diaries', diariesRouter);
app.use('/api/users', usersRouter);

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: '旅游系统后端运行中', version: '1.0.0', uptime: process.uptime() });
});

// 404 处理
app.use('/api/*', (req, res) => {
  res.status(404).json({ success: false, message: `API 端点不存在: ${req.path}` });
});

// 全局错误处理中间件
app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  const statusCode = err.statusCode || 500;
  const message = err.message || '服务器内部错误';
  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

app.listen(PORT, () => {
  console.log(`\n========================================`);
  console.log(` 旅游系统后端服务器已启动`);
  console.log(` 地址: http://localhost:${PORT}`);
  console.log(` 健康检查: http://localhost:${PORT}/api/health`);
  console.log(`========================================\n`);
});
