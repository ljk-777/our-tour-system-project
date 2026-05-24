# 项目功能总览

更新时间：2026-05-24  
当前代码基准：`main` 分支，已同步到远端最新版本

本文档用于记录项目当前已经实现的功能、关键文件位置和后续维护方式。后续每次新增或修改功能时，建议同步更新本文档，方便团队总览项目状态。

## 1. 项目定位

本项目是一个旅游系统课程设计项目，围绕“景点发现、路线规划、旅行日记、美食推荐、地图展示、算法演示”展开。

当前项目已经从早期的静态内存数据升级为：

- 前端：`React + Vite`
- 后端：`Node.js + Express`
- 数据库：`PostgreSQL`
- 地图能力：高德 Web 服务 API + 高德 JavaScript API
- 算法能力：`Dijkstra`、多点路径优化、`TopK` 小顶堆、`KMP`、`Trie`、倒排索引

## 2. 前端页面功能

前端入口文件：

- `src/frontend/src/App.jsx`
- `src/frontend/src/api/index.js`

### 2.1 首页

页面文件：

- `src/frontend/src/pages/Home.jsx`

已实现功能：

- 首页视觉展示与导航入口
- 景点推荐区域
- 首页轮播与拖拽/边缘滚动相关交互
- 跳转到景点、路线、日记、广场、地球页等核心模块

### 2.2 景点发现

页面文件：

- `src/frontend/src/pages/Spots.jsx`
- `src/frontend/src/components/SpotCard.jsx`

已实现功能：

- 景点列表展示
- 按城市、类型筛选
- 搜索景点
- 分页/加载更多
- 本地景点图片展示
- 景点卡片使用本地静态图资源，路径主要来自 `src/frontend/public/images/spots`
- 点击卡片进入景点详情页

数据来源：

- 后端 `/api/spots`
- 后端 `/api/spots/search`
- 后端 `/api/spots/topk`
- 后端 `/api/spots/recommend`

### 2.3 景点详情

页面文件：

- `src/frontend/src/pages/SpotDetail.jsx`
- `src/frontend/src/components/AmapMap.jsx`

已实现功能：

- 景点基本信息展示
- 评分、标签、开放时间、门票等信息展示
- 高德地图点位展示
- 逆地理编码地址展示
- 天气信息展示
- 周边 POI 展示
- 一键跳转路线规划

### 2.4 美食推荐

页面文件：

- `src/frontend/src/pages/Foods.jsx`

已实现功能：

- 餐厅/美食列表展示
- 城市筛选
- 标签筛选
- 搜索餐厅
- 美食卡片本地图片展示
- 与景点数据共用 `spots` 数据表，通过 `type = restaurant` 区分

### 2.5 路线规划

页面文件：

- `src/frontend/src/pages/RoutePlanner.jsx`
- `src/frontend/src/components/AmapRouteMap.jsx`

已实现功能：

- 本地算法模式
- 高德真实导航模式
- 单起点到单终点路线规划
- 多点路径规划
- 支持按距离或时间作为权重
- 本地点位搜索与联想
- 高德地点联想
- 高德步行、驾车、骑行、公交路线规划
- 路线距离、预计时间、路径节点展示
- 高德路线地图展示
- 对高德接口错误做了友好提示处理

本地算法：

- `Dijkstra + MinHeap`
- 多点路径使用近邻策略和 `2-opt` 优化

### 2.6 旅行日记

页面文件：

- `src/frontend/src/pages/Diary.jsx`

已实现功能：

- 日记列表展示
- 日记搜索
- 日记排序
- 发布日记
- 上传/压缩封面图片
- 点赞
- 评论
- 标签展示
- 日期格式化
- AI 日记润色/生成草稿
- 生成结果可预览、替换、重新生成

后端支持：

- `/api/diaries`
- `/api/diaries/search`
- `/api/diaries/generate`
- `/api/diaries/:id/like`
- `/api/diaries/:id/comment`

### 2.7 广场

页面文件：

- `src/frontend/src/pages/Plaza.jsx`

已实现功能：

- 旅行内容社区化展示
- 玻璃卡片风格视觉重设计
- 与日记、用户数据联动展示

### 2.8 个人中心

页面文件：

- `src/frontend/src/pages/Profile.jsx`

已实现功能：

- 用户列表/用户详情展示
- 用户基础资料展示
- 用户日记展示
- 用户统计信息展示

数据来源：

- `/api/users`
- `/api/users/:id`

### 2.9 登录与注册

页面文件：

- `src/frontend/src/pages/Auth.jsx`
- `src/frontend/src/context/AuthContext.jsx`
- `src/frontend/src/hooks/useAuth.js`

已实现功能：

- 登录
- 注册
- 访客模式
- 头像选择/图片压缩
- 登录状态本地保存
- 受保护路由基础能力

说明：

- 当前登录仍偏课程设计演示性质，后端返回 mock token。
- 当前用户密码校验不是完整生产级认证。

### 2.10 管理员页面

页面文件：

- `src/frontend/src/pages/Admin.jsx`

已实现功能：

- 用户、日记、景点数据总览
- 搜索
- 筛选
- 排序
- 分页
- 统计信息
- CSV 导出
- 数据刷新

### 2.11 3D 地球页面

页面文件：

- `src/frontend/src/pages/Globe.jsx`
- `src/frontend/src/components/Earth3D.jsx`
- `src/frontend/src/components/GlobeOverlay.jsx`
- `src/frontend/src/data/globeData.js`

已实现功能：

- 3D 地球展示
- 城市/旅行点位数据展示
- 鼠标旋转和缩放
- 旅行者排行榜
- AI 旅游规划侧边面板
- 首页与地球页视觉联动

### 2.12 校园地图工作台

页面文件：

- `src/frontend/src/pages/MapWorkspace.jsx`
- `src/frontend/src/data/sh.json`
- `src/frontend/src/data/xtc.json`
- `src/frontend/src/data/campusConfigs.js`
- `src/frontend/src/utils/buildingDetector.js`
- `src/frontend/src/utils/roadDetector.js`

已实现功能：

- 沙河校区/西土城校区地图数据加载
- 地图底图展示
- 节点添加
- 边添加
- 节点拖拽
- 路网编辑
- 路径预览
- 基于节点和边的校园导航
- JSON 数据导入/导出
- 建筑与道路检测辅助工具

## 3. 后端接口功能

后端入口：

- `src/backend/src/index.js`

后端挂载接口：

- `/api/spots`
- `/api/routes`
- `/api/diaries`
- `/api/users`
- `/api/amap`
- `/api/health`

### 3.1 景点接口

文件：

- `src/backend/src/routes/spots.js`
- `src/backend/src/repositories/spotRepository.js`

已实现接口：

- `GET /api/spots`
- `GET /api/spots/topk`
- `GET /api/spots/search`
- `GET /api/spots/autocomplete`
- `GET /api/spots/recommend`
- `GET /api/spots/:id`

支持能力：

- 景点列表
- 景点详情
- 城市/省份/类型筛选
- `TopK` 推荐
- Trie 前缀搜索
- Trie 模糊搜索
- 倒排索引全文搜索
- 本地图片路径字段 `imageUrl`

### 3.2 路线接口

文件：

- `src/backend/src/routes/routes.js`
- `src/backend/src/repositories/routeRepository.js`

已实现接口：

- `POST /api/routes/shortest`
- `POST /api/routes/multi`
- `GET /api/routes/nearby`
- `GET /api/routes/graph-stats`

支持能力：

- 单起点到单终点最短路径
- 多点路径规划
- 附近点位查询
- 路网统计
- 距离/时间权重切换

### 3.3 日记接口

文件：

- `src/backend/src/routes/diaries.js`
- `src/backend/src/repositories/diaryRepository.js`
- `src/backend/src/services/diaryAiService.js`

已实现接口：

- `GET /api/diaries`
- `GET /api/diaries/search`
- `GET /api/diaries/:id`
- `POST /api/diaries`
- `POST /api/diaries/generate`
- `POST /api/diaries/:id/like`
- `POST /api/diaries/:id/comment`

支持能力：

- 日记列表
- 日记详情
- 日记发布
- 日记搜索
- 点赞
- 评论
- AI 草稿生成/润色
- 标签、天气、心情、评分、封面图字段

### 3.4 用户接口

文件：

- `src/backend/src/routes/users.js`
- `src/backend/src/repositories/userRepository.js`

已实现接口：

- `GET /api/users`
- `GET /api/users/:id`
- `POST /api/users/login`
- `POST /api/users`

支持能力：

- 用户列表
- 用户详情
- 用户注册
- 用户登录
- 用户关联日记查询

### 3.5 高德接口代理

文件：

- `src/backend/src/routes/amap.js`
- `src/backend/src/services/amapService.js`
- `src/backend/src/repositories/amapCacheRepository.js`

已实现接口：

- `GET /api/amap/geocode`
- `GET /api/amap/regeo`
- `GET /api/amap/poi/tips`
- `GET /api/amap/poi/search`
- `GET /api/amap/route`
- `GET /api/amap/weather`

支持能力：

- 地址转坐标
- 坐标转地址
- POI 输入提示
- POI 搜索
- 真实路线规划
- 天气查询
- 高德响应解析与错误提示友好化
- POI、路线、天气缓存表支持

## 4. 数据库功能

数据库类型：

- PostgreSQL

核心文件：

- `src/backend/src/db/index.js`
- `src/backend/src/db/schema.js`
- `src/backend/src/db/seed.js`
- `src/backend/scripts/initDb.js`
- `src/backend/scripts/seedDb.js`

已实现表：

- `users`
- `spots`
- `spot_tags`
- `route_edges`
- `diaries`
- `diary_tags`
- `diary_comments`
- `amap_poi_cache`
- `amap_route_cache`
- `amap_weather_cache`

已实现能力：

- 自动初始化数据库表结构
- 自动创建索引
- 景点、用户、日记、路线边导入
- 景点图片路径字段 `image_url`
- 标签拆表存储
- 日记评论拆表存储
- 高德接口结果缓存

常用命令：

```powershell
cd D:\code\our-tour-system-project\src\backend
node scripts/initDb.js
npm.cmd run seed-db
```

## 5. 数据与资源

主要数据文件：

- `src/backend/src/data/spots.js`
- `src/backend/src/data/users.js`
- `src/backend/src/data/diaries.js`
- `src/backend/src/data/graph.js`
- `src/frontend/src/data/globeData.js`
- `src/frontend/src/data/sh.json`
- `src/frontend/src/data/xtc.json`

图片资源：

- `src/frontend/public/images/spots`
- `src/frontend/src/assets/bupt-shahe-campus-map.jpg`
- `src/frontend/src/assets/bupt-xitucheng-campus-map.png`

当前图片方案：

- 景点/美食图片已经从远程 Unsplash 链接逐步切换为项目本地静态图片。
- 后端数据中的 `imageUrl` 指向前端可访问的静态图片路径。
- 前端卡片优先显示 `imageUrl`，图片失败时保留兜底展示。

## 6. 核心算法

算法文件：

- `src/backend/src/algorithms/dijkstra.js`
- `src/backend/src/algorithms/heap.js`
- `src/backend/src/algorithms/kmp.js`
- `src/backend/src/algorithms/trie.js`

已实现算法：

- `Dijkstra`：用于路线最短路
- `MinHeap`：用于 `TopK` 推荐
- `KMP`：用于日记关键词检索
- `Trie`：用于景点前缀搜索和模糊搜索
- 倒排索引：用于景点和日记全文搜索
- 多点路径规划：近邻策略 + `2-opt` 优化

前端算法演示页：

- `src/frontend/src/pages/AlgoDemo.jsx`

演示内容：

- Trie
- Dijkstra
- TopK
- KMP
- 2-opt

## 7. 外部服务

### 7.1 高德地图

使用位置：

- 前端地图展示
- 后端高德接口代理
- 路线规划
- 景点详情
- POI 搜索
- 天气查询

相关文件：

- `src/frontend/src/hooks/useAmapLoader.js`
- `src/frontend/src/components/AmapMap.jsx`
- `src/frontend/src/components/AmapRouteMap.jsx`
- `src/backend/src/services/amapService.js`

环境变量：

- `AMAP_WEB_API_KEY`
- `VITE_AMAP_JS_API_KEY`
- `VITE_AMAP_SECURITY_JS_CODE`

### 7.2 日记 AI 服务

使用位置：

- 日记页 AI 草稿生成/润色

相关文件：

- `src/backend/src/services/diaryAiService.js`
- `src/backend/src/routes/diaries.js`

环境变量：

- `DIARY_AI_API_KEY`
- `DIARY_AI_BASE_URL`
- `DIARY_AI_MODEL`

## 8. MCP 与测试

MCP 相关：

- `mcp/servers/tour-data-server/index.js`
- `mcp/config/mcp_config.json`

测试与对抗测试：

- `tests/unit/algorithms/bench.js`
- `adversarial/red-team/route-attack-cases.js`
- `adversarial/red-team/search-attack-cases.js`
- `adversarial/fuzzing/api-fuzzer.js`
- `adversarial/chaos/chaos-scenarios.js`

已覆盖方向：

- 算法性能对比
- 路线攻击用例
- 搜索攻击用例
- API 模糊测试
- 混沌场景测试

## 9. 当前运行方式

后端：

```powershell
cd D:\code\our-tour-system-project\src\backend
npm.cmd run dev
```

前端：

```powershell
cd D:\code\our-tour-system-project\src\frontend
npm.cmd run dev -- --host 0.0.0.0
```

常用访问地址：

- 本机：`http://localhost:5173/`
- 局域网：`http://当前IPv4地址:5173/`
- 后端健康检查：`http://127.0.0.1:3001/api/health`

## 10. 已知说明

- 当前登录是课程设计演示级别，后端返回 mock token，不是完整生产级鉴权。
- PostgreSQL 是当前主要运行时数据源，`src/backend/src/data/*.js` 主要用于种子数据。
- 真实图片当前已本地化到 `public/images/spots`，后续新增景点时建议同步补图片。
- 高德能力依赖 key 和网络，答辩或演示时建议保留本地算法模式作为兜底。
- 仓库中部分旧文档或旧文件可能存在编码显示异常，后续建议逐步替换为 UTF-8 文档。

## 11. 后续更新记录模板

每次新增功能时，可以按下面格式追加：

```markdown
### YYYY-MM-DD 功能名称

改动范围：

- 前端：
- 后端：
- 数据库：
- 数据/资源：

新增功能：

- 

影响页面：

- 

验证方式：

- 

备注：

- 
```

