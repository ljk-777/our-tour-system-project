const express = require('express');
const cors = require('cors');

const spotsRouter = require('./routes/spots');
const routesRouter = require('./routes/routes');
const diariesRouter = require('./routes/diaries');
const usersRouter = require('./routes/users');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// API 路由
app.use('/api/spots', spotsRouter);
app.use('/api/routes', routesRouter);
app.use('/api/diaries', diariesRouter);
app.use('/api/users', usersRouter);

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: '旅游系统后端运行中', version: '1.0.0' });
});

app.listen(PORT, () => {
  console.log(`\n========================================`);
  console.log(` 旅游系统后端服务器已启动`);
  console.log(` 地址: http://localhost:${PORT}`);
  console.log(` 健康检查: http://localhost:${PORT}/api/health`);
  console.log(`========================================\n`);
});
