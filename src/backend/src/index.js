const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local'), override: true });
const { initSchema } = require('./db/schema');

const spotsRouter = require('./routes/spots');
const routesRouter = require('./routes/routes');
const diariesRouter = require('./routes/diaries');
const usersRouter = require('./routes/users');
const amapRouter = require('./routes/amap');
const groupsRouter = require('./routes/groups');
const compressionRouter = require('./routes/compression');
const foodsRouter = require('./routes/foods');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());
const { auth } = require('./middleware/auth');
app.use(auth);

app.use('/api/spots', spotsRouter);
app.use('/api/routes', routesRouter);
app.use('/api/diaries', diariesRouter);
app.use('/api/users', usersRouter);
app.use('/api/amap', amapRouter);
app.use('/api/groups', groupsRouter);
app.use('/api/compression', compressionRouter);
app.use('/api/foods', foodsRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: '旅游系统后端运行中', version: '1.0.0' });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(Number.isInteger(err?.statusCode) ? err.statusCode : 500).json({
    success: false,
    message: err.message || '服务器内部错误',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

async function start() {
  await initSchema();

  app.listen(PORT, '0.0.0.0', () => {
    console.log('\n========================================');
    console.log(' 旅游系统后端服务器已启动');
    console.log(` 地址: http://localhost:${PORT}`);
    console.log(` 健康检查: http://localhost:${PORT}/api/health`);
    console.log(' PostgreSQL schema ready');
    console.log('========================================\n');
  });
}

start().catch((error) => {
  console.error('Failed to start backend:', error);
  process.exit(1);
});
