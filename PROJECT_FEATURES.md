# PROJECT_FEATURES

更新时间：2026-05-30  
项目定位：旅游系统课程设计，覆盖景点发现、路线规划、日记管理、美食推荐、群组协作、地图能力与算法演示。

## 1. 技术栈

- 前端：React + Vite + Tailwind CSS
- 后端：Node.js + Express
- 数据库：PostgreSQL
- 地图服务：高德 Web API + 高德 JavaScript API
- AI 服务：复用已有日记 AI Key 配置，支持日记生成与群组智能建议
- 核心算法：Dijkstra、MinHeap/TopK、KMP、Trie、倒排索引、多点路径近似优化

## 2. 最近更新

### 2026-05-30 群组路线切换为高德 API

- 群组路线不再依赖本地 Dijkstra 图数据生成预览。
- `POST /api/groups/:id/trips/route-preview` 改为调用 `amapService.route()`。
- 支持步行、驾车、骑行、公交四种高德路线模式。
- 支持两种途经点来源：
  - 活动填写了 `spotId`：优先使用数据库景点经纬度。
  - 活动没有 `spotId`：按活动名称调用高德地理编码解析坐标。
- 返回真实路线数据：总距离、预计用时、分段路线、导航步骤、polyline。
- 前端群组路线页增加出行方式选择和高德结果展示。
- 群组路线请求超时放宽到 30 秒，避免多点高德请求过早超时。

### 2026-05-29 群组功能增强

- 新增群组偏好表 `group_preferences`。
- 群组详情页重构为：行程、路线、偏好、协调、聊天、成员。
- 新增群组成员管理：退出群组、移除成员、修改角色。
- 新增群组旅行偏好填写与概览。
- 新增群组冲突分析：规则分析 + 可选 AI 折中建议。
- 新增群组 AI 行程生成，复用已有 AI API Key。
- 群组详情页 UI 收紧为更紧凑的工作台布局。
- 偏好保存增加成功/失败反馈，并在后端增加偏好表惰性创建兜底。

### 2026-05-28 大规模功能更新

- 新增群组系统：创建、加入、成员、行程、聊天。
- 新增 Auth 中间件，通过 `x-user-id` 识别当前用户。
- 新增 `user_likes`、`user_favorites`。
- Profile、Plaza、Admin、MapWorkspace、Diary、Auth 等页面增强。
- 登录重定向、点赞同步、注册昵称、头像跳转等体验修复。

## 3. 前端页面

### 首页

文件：

- `src/frontend/src/pages/Home.jsx`

功能：

- 项目入口与核心模块导航
- 景点推荐展示
- 跳转景点、路线、日记、广场、地球、群组等模块

### 景点发现

文件：

- `src/frontend/src/pages/Spots.jsx`
- `src/frontend/src/components/SpotCard.jsx`

功能：

- 景点列表、搜索、筛选、分页/加载更多
- 按城市、类型筛选
- TopK 推荐与全文检索
- 景点卡片本地图片展示
- 点击进入景点详情

### 景点详情

文件：

- `src/frontend/src/pages/SpotDetail.jsx`
- `src/frontend/src/components/AmapMap.jsx`

功能：

- 景点基础信息、评分、标签、门票、开放时间
- 高德地图点位展示
- 逆地理编码、天气、周边 POI
- 一键跳转路线规划

### 美食推荐

文件：

- `src/frontend/src/pages/Foods.jsx`

功能：

- 美食/餐厅列表
- 城市、标签、关键词筛选
- 使用 `spots` 数据表，通过 `type = restaurant` 区分餐厅

### 路线规划

文件：

- `src/frontend/src/pages/RoutePlanner.jsx`
- `src/frontend/src/components/AmapRouteMap.jsx`

功能：

- 本地算法路线规划
- 高德真实导航模式
- 单起点到终点路线
- 多点路径规划
- 按距离或时间作为本地算法权重
- 高德步行、驾车、骑行、公交路线
- 距离、时间、路径节点与地图展示

### 旅行日记

文件：

- `src/frontend/src/pages/Diary.jsx`
- `src/frontend/src/utils/likeSync.js`

功能：

- 日记列表、搜索、排序
- 发布日记、上传/压缩封面图
- 点赞、取消点赞、评论
- AI 日记草稿生成/润色
- 登录守卫保护写操作

### 广场

文件：

- `src/frontend/src/pages/Plaza.jsx`

功能：

- 社区内容展示
- 旅行者排行榜
- 用户头像/昵称跳转个人主页
- 与日记、用户数据联动

### 个人中心

文件：

- `src/frontend/src/pages/Profile.jsx`

功能：

- 当前用户资料展示与编辑
- `/profile/:id` 查看他人资料
- 用户日记、收藏、足迹、统计信息

### 登录与注册

文件：

- `src/frontend/src/pages/Auth.jsx`
- `src/frontend/src/context/AuthContext.jsx`

功能：

- 登录、注册、游客模式
- 昵称、头像、资料保存
- 登录状态本地保存
- `?redirect=` 登录后回跳
- 点赞状态自动获取与同步

### 管理后台

文件：

- `src/frontend/src/pages/Admin.jsx`

功能：

- 用户、景点、日记数据总览
- 搜索、筛选、排序、分页
- CSV 导出
- 数据刷新和统计展示

### 3D 地球

文件：

- `src/frontend/src/pages/Globe.jsx`
- `src/frontend/src/components/Earth3D.jsx`
- `src/frontend/src/components/GlobeOverlay.jsx`

功能：

- 3D 地球展示
- 城市与旅行点位展示
- 鼠标旋转缩放
- AI 旅游规划侧边栏

### 校园地图工作台

文件：

- `src/frontend/src/pages/MapWorkspace.jsx`
- `src/frontend/src/data/sh.json`
- `src/frontend/src/data/xtc.json`

功能：

- 沙河/西土城校区地图数据加载
- 节点、边、路网编辑
- 节点拖拽、重命名、删除边
- JSON 导入导出
- 路径预览与校园导航

### 群组

文件：

- `src/frontend/src/pages/GroupsPage.jsx`
- `src/frontend/src/pages/GroupDetail.jsx`

功能：

- 群组创建、加入、列表展示
- 群组详情与成员管理
- 群组行程编辑
- AI 群组行程生成
- 群组偏好填写与概览
- 群组冲突协调分析
- 群组聊天
- 高德群组路线生成：
  - 按活动名称或 `spotId` 解析途经点
  - 支持步行、驾车、骑行、公交
  - 展示真实距离、时间、分段导航

## 4. 后端接口

入口：

- `src/backend/src/index.js`

挂载接口：

- `/api/spots`
- `/api/routes`
- `/api/diaries`
- `/api/users`
- `/api/amap`
- `/api/groups`
- `/api/health`

### 景点接口

文件：

- `src/backend/src/routes/spots.js`
- `src/backend/src/repositories/spotRepository.js`

接口：

- `GET /api/spots`
- `GET /api/spots/topk`
- `GET /api/spots/search`
- `GET /api/spots/autocomplete`
- `GET /api/spots/recommend`
- `GET /api/spots/:id`

### 路线接口

文件：

- `src/backend/src/routes/routes.js`
- `src/backend/src/repositories/routeRepository.js`

接口：

- `POST /api/routes/shortest`
- `POST /api/routes/multi`
- `GET /api/routes/nearby`
- `GET /api/routes/graph-stats`

说明：

- 该模块保留本地算法路线能力。
- 群组路线已经改为走高德 API。

### 日记接口

文件：

- `src/backend/src/routes/diaries.js`
- `src/backend/src/repositories/diaryRepository.js`
- `src/backend/src/services/diaryAiService.js`

接口：

- `GET /api/diaries`
- `GET /api/diaries/search`
- `GET /api/diaries/:id`
- `POST /api/diaries`
- `POST /api/diaries/generate`
- `POST /api/diaries/:id/like`
- `POST /api/diaries/:id/unlike`
- `POST /api/diaries/:id/comment`

### 用户接口

文件：

- `src/backend/src/routes/users.js`
- `src/backend/src/repositories/userRepository.js`

接口：

- `GET /api/users`
- `GET /api/users/:id`
- `POST /api/users/login`
- `POST /api/users`
- `GET /api/users/me/favorite-ids`
- `GET /api/users/me/liked-diaries`

### 高德代理接口

文件：

- `src/backend/src/routes/amap.js`
- `src/backend/src/services/amapService.js`
- `src/backend/src/repositories/amapCacheRepository.js`

接口：

- `GET /api/amap/geocode`
- `GET /api/amap/regeo`
- `GET /api/amap/poi/tips`
- `GET /api/amap/poi/search`
- `GET /api/amap/route`
- `GET /api/amap/weather`

能力：

- 地址转坐标
- 坐标转地址
- POI 搜索与输入提示
- 真实路线规划
- 天气查询
- POI、路线、天气缓存

### 群组接口

文件：

- `src/backend/src/routes/groups.js`
- `src/backend/src/repositories/groupRepository.js`

接口：

- `GET /api/groups`
- `GET /api/groups/:id`
- `POST /api/groups`
- `POST /api/groups/join`
- `DELETE /api/groups/:id`
- `POST /api/groups/:id/leave`
- `DELETE /api/groups/:id/members/:userId`
- `PATCH /api/groups/:id/members/:userId/role`
- `GET /api/groups/:id/messages`
- `POST /api/groups/:id/messages`
- `GET /api/groups/:id/trips`
- `POST /api/groups/:id/trips`
- `POST /api/groups/:id/trips/ai-generate`
- `POST /api/groups/:id/trips/route-preview`
- `GET /api/groups/:id/preferences`
- `POST /api/groups/:id/preferences/me`
- `GET /api/groups/:id/conflict-analysis`

能力：

- 群组 CRUD
- 成员权限管理
- 群组聊天
- 群组行程
- AI 行程生成
- 成员偏好
- 冲突协调分析
- 高德路线生成

## 5. 数据库

数据库：PostgreSQL

核心文件：

- `src/backend/src/db/index.js`
- `src/backend/src/db/schema.js`
- `src/backend/scripts/initDb.js`
- `src/backend/scripts/seedDb.js`

主要表：

- `users`
- `spots`
- `spot_tags`
- `route_edges`
- `diaries`
- `diary_tags`
- `diary_comments`
- `user_likes`
- `user_favorites`
- `groups`
- `group_members`
- `group_trips`
- `group_messages`
- `group_preferences`
- `amap_poi_cache`
- `amap_route_cache`
- `amap_weather_cache`

## 6. 算法能力

文件：

- `src/backend/src/algorithms/dijkstra.js`
- `src/backend/src/algorithms/heap.js`
- `src/backend/src/algorithms/kmp.js`
- `src/backend/src/algorithms/trie.js`

能力：

- Dijkstra：最短路
- MinHeap：TopK 推荐
- KMP：日记关键词检索
- Trie：景点前缀搜索与模糊搜索
- 倒排索引：景点和日记全文检索
- 多点路径：最近邻 + 2-opt

说明：

- 本地算法仍用于课程设计展示与 `/api/routes`。
- 群组路线当前优先使用高德真实路线。

## 7. 外部服务配置

### 高德地图

环境变量：

- `AMAP_WEB_API_KEY`
- `VITE_AMAP_JS_API_KEY`
- `VITE_AMAP_SECURITY_JS_CODE`

使用位置：

- 景点详情地图
- 路线规划地图
- 高德 POI 搜索
- 高德路线
- 群组路线
- 天气查询

### AI 服务

环境变量：

- `DIARY_AI_API_KEY`
- `DIARY_AI_BASE_URL`
- `DIARY_AI_MODEL`

使用位置：

- 日记草稿生成/润色
- 群组 AI 行程生成
- 群组冲突协调建议

## 8. 启动命令

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

常用地址：

- 前端：`http://localhost:5173/`
- 后端健康检查：`http://127.0.0.1:3001/api/health`

## 9. 测试与验证

已验证：

- `npm.cmd run build` 前端构建通过
- `node --check src/backend/src/routes/groups.js` 语法检查通过
- 高德路线后端链路可用，例如“北京邮电大学 -> 故宫博物院”返回真实距离与用时

已有测试入口：

- `tests/unit/algorithms/bench.js`
- `adversarial/red-team/route-attack-cases.js`
- `adversarial/red-team/search-attack-cases.js`
- `adversarial/fuzzing/api-fuzzer.js`
- `adversarial/chaos/chaos-scenarios.js`

## 10. 已知说明

- 当前登录是课程设计演示级，依赖 `x-user-id`，不是生产级 JWT 鉴权。
- 高德能力依赖 API Key、网络和调用额度。
- 本地算法路线仍保留，可作为高德不可用时的课程设计展示能力。
- 部分旧文件曾出现编码异常，本文档已整理为 UTF-8 Markdown。
