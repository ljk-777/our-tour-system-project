# Our Tour System Project

一个智能旅游推荐系统。

## 项目结构
- `src/frontend/`：前端 React/Vite 应用
- `src/backend/`：后端 Node.js/Express 服务
- `DESIGN.md`：设计说明

## 本地数据库
项目后端已接入 PostgreSQL，本机当前数据库目录为：

`D:\postgres-data`

当前数据库连接信息：
- 数据库名：`tour_system`
- 用户名：`postgres`
- 端口：`5432`

## 后端启动
1. 进入后端目录并复制环境变量模板：

```powershell
cd src/backend
Copy-Item .env.example .env
```

2. 按需修改 [src/backend/.env](D:/code/our-tour-system-project/src/backend/.env)。

3. 初始化数据库并导入种子数据：

```powershell
node scripts/initDb.js
node scripts/seedDb.js
```

4. 启动后端：

```powershell
npm.cmd run dev
```

## 前端启动
```powershell
cd src/frontend
npm.cmd install
npm.cmd run dev
```
