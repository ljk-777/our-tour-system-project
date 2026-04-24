const express = require('express');
const cors = require('cors');
const { initSchema } = require('./db/schema');

const spotsRouter = require('./routes/spots');
const routesRouter = require('./routes/routes');
const diariesRouter = require('./routes/diaries');
const usersRouter = require('./routes/users');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.use('/api/spots', spotsRouter);
app.use('/api/routes', routesRouter);
app.use('/api/diaries', diariesRouter);
app.use('/api/users', usersRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: '旅游系统后端运行中', version: '1.0.0' });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({
    success: false,
    message: '服务器内部错误',
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
