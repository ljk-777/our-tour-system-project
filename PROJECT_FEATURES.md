# PROJECT_FEATURES

更新时间：2026-06-07

项目定位：旅游系统课程设计，覆盖景点发现、路线规划、室内导航、附近设施查询、日记管理、美食推荐、群组协作、地图能力与算法演示。

## 1. 技术栈

- 前端：React + Vite + Tailwind CSS
- 后端：Node.js + Express
- 数据库：PostgreSQL
- 地图服务：高德 Web API + 高德 JavaScript API
- AI 服务：DeepSeek/OpenAI 兼容接口，复用已有日记 AI Key 配置，可用于日记生成、群组建议和路线说明
- 核心算法：Dijkstra、A*、MinHeap/TopK、KMP、Trie、倒排索引、多点路径近似优化、路网距离排序

## 2. 最近更新

### 2026-06-07 路线规划与室内导航增强

- 路线规划页完善四种工作模式：
  - 地图工作台
  - 本地算法模式
  - 室内导航
  - 高德真实导航
- 本地算法模式支持数据库路网图，可演示单点最短路、多点路径、最短距离、最短时间、步行、自行车、电瓶车和混合交通策略。
- 本地算法附近设施查询支持按类别和关键词过滤，并按 Dijkstra 路网距离排序，不使用直线距离。
- 新增教学实验综合楼 1F-5F 室内导航，读取每层手动标注 JSON 与楼层底图。
- 室内导航区分教室/房间、门口、楼梯、电梯、安全出口、卫生间、开水间、走廊节点。
- 室内导航支持跨楼层 Dijkstra 路径、楼梯/电梯换层、地图缩放、输出路径和右侧路线说明。
- 室内导航新增附近设施排序，可查询最近卫生间、开水间等设施，结果按室内路网距离排序。
- 新增 `POST /api/routes/describe` 路线说明接口，优先调用 DeepSeek/OpenAI 兼容 API，失败时使用本地模板兜底。
- 路线说明会携带真实路径方向摘要，例如“先向东，再向北一点”，避免按起终点直线误判方向。

### 2026-05-31 群组协作中枢增强

- 群组聊天支持 `@ai`、`@小迹`、`@助手` 触发 AI 回复。
- AI 回复结合群组行程、成员偏好、最近聊天和高德天气生成旅行建议。
- 新增 AI 操作卡片，可追加行程备注、新增室内休息/补给活动、根据投票结果调整交通活动。
- 新增群组天气协作提醒，调用高德天气接口并写入群聊系统消息。
- 新增群组投票，支持创建、投票、改票、结果统计和行程联动。
- 群组路线升级为智能推荐，结合距离、天气和交通方式自动选择路线策略。
- 群组路线新增高德地图可视化，按分段 polyline 绘制真实道路路径。

### 2026-05-30 群组路线切换为高德 API

- 群组路线不再依赖本地 Dijkstra 图数据生成预览。
- `POST /api/groups/:id/trips/route-preview` 改为调用 `amapService.route()`。
- 支持步行、驾车、骑行、公交四种高德路线模式。
- 支持按活动 `spotId` 或活动名称解析途经点。
- 返回真实路线数据：总距离、预计用时、分段路线、导航步骤、polyline。

### 2026-05-29 群组功能增强

- 新增群组偏好表 `group_preferences`。
- 群组详情页重构为行程、路线、偏好、协调、聊天、成员。
- 新增群组成员管理、群组旅行偏好、冲突分析、AI 行程生成。

### 2026-05-28 大规模功能更新

- 新增群组系统：创建、加入、成员、行程、聊天。
- 新增 Auth 中间件，通过 `x-user-id` 识别当前用户。
- 新增 `user_likes`、`user_favorites`。
- Profile、Plaza、Admin、MapWorkspace、Diary、Auth 等页面增强。

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

- 景点列表、搜索、筛选、分页加载更多
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
- `src/frontend/src/components/LocalAlgorithmPlanner.jsx`
- `src/frontend/src/components/IndoorNavigationPanel.jsx`
- `src/frontend/src/components/AmapRouteMap.jsx`
- `src/frontend/src/api/index.js`
- `src/frontend/src/assets/indoor/teaching-lab-1f-network.json`
- `src/frontend/src/assets/indoor/teaching-lab-2f-network.json`
- `src/frontend/src/assets/indoor/teaching-lab-3f-network.json`
- `src/frontend/src/assets/indoor/teaching-lab-4f-network.json`
- `src/frontend/src/assets/indoor/teaching-lab-5f-network.json`
- `src/frontend/src/assets/indoor/teaching-lab-1f-reference.jpg`
- `src/frontend/src/assets/indoor/teaching-lab-2f-reference.jpg`
- `src/frontend/src/assets/indoor/teaching-lab-3f-reference.jpg`
- `src/frontend/src/assets/indoor/teaching-lab-4f-reference.jpg`
- `src/frontend/src/assets/indoor/teaching-lab-5f-reference.jpg`

功能：

- 地图工作台：校园路网编辑、节点/边可视化、JSON 导入导出。
- 本地算法模式：基于数据库路网图执行课程设计算法演示。
- 高德真实导航：使用高德真实路线能力展示出行路线。
- 室内导航：教学实验综合楼 1F-5F 室内路网与跨楼层路径规划。
- 单点最短路：从当前位置到目标地点的最优路线。
- 多点路径：从当前位置出发参观多个地点并返回当前位置。
- 最短距离策略：以道路距离为权重。
- 最短时间策略：结合道路拥挤度与理想速度计算真实通行时间。
- 交通工具策略：支持步行、自行车、电瓶车和混合交通；自行车道路默认也允许步行，少量通道仅步行。
- 附近设施查询：按路网距离查找附近超市、卫生间、开水间、食堂、咖啡馆等服务设施，可按类别和关键词过滤。
- 路线说明：调用后端 AI 接口生成自然语言导航描述，失败时使用本地模板。

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
- 群组 `@ai` 智能协作聊天
- 群组 AI 操作卡片，可确认后真实修改行程
- 群组投票、投票统计和投票结果联动操作卡片
- 群组天气协作提醒和系统消息
- 高德群组路线生成与真实地图 polyline 展示

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

能力：

- 景点列表、详情、搜索、筛选
- 景点标签、图片、评分
- 收藏、点赞、足迹相关数据

### 路线接口

文件：

- `src/backend/src/routes/routes.js`
- `src/backend/src/services/routeDescriptionService.js`

接口：

- `GET /api/routes/edges`
- `POST /api/routes/shortest`
- `POST /api/routes/multi-point`
- `GET /api/routes/local-graphs`
- `POST /api/routes/local-graphs/:graphId/shortest`
- `POST /api/routes/local-graphs/:graphId/multi-point`
- `GET /api/routes/nearby`
- `POST /api/routes/describe`

能力：

- 本地 Dijkstra 最短路径
- 多点路径近似规划
- 数据库路网图读取与算法计算
- 按最短距离、最短时间、交通工具策略计算权重
- 附近设施按路网距离排序
- AI 路线说明生成与模板兜底

### 日记接口

文件：

- `src/backend/src/routes/diaries.js`

能力：

- 日记 CRUD
- 图片上传
- KMP/倒排索引搜索
- AI 日记草稿生成
- 点赞与评论

### 用户接口

文件：

- `src/backend/src/routes/users.js`

能力：

- 用户资料
- 登录态辅助
- 点赞、收藏、足迹
- 用户公开主页

### 高德代理接口

文件：

- `src/backend/src/routes/amap.js`
- `src/backend/src/services/amapService.js`

能力：

- POI 搜索
- 逆地理编码
- 天气查询
- 真实路线规划
- 缓存高德 POI、路线和天气结果

### 群组接口

文件：

- `src/backend/src/routes/groups.js`

接口：

- `GET /api/groups`
- `POST /api/groups`
- `GET /api/groups/:id`
- `POST /api/groups/:id/join`
- `GET /api/groups/:id/messages`
- `POST /api/groups/:id/messages`
- `POST /api/groups/:id/messages/ai`
- `GET /api/groups/:id/trips`
- `POST /api/groups/:id/trips`
- `POST /api/groups/:id/trips/ai-generate`
- `POST /api/groups/:id/trips/route-preview`
- `GET /api/groups/:id/preferences`
- `POST /api/groups/:id/preferences/me`
- `GET /api/groups/:id/conflict-analysis`
- `GET /api/groups/:id/weather-advisory`

能力：

- 群组 CRUD
- 成员权限管理
- 群组聊天
- 群聊系统消息
- `@ai` 智能回复
- AI 操作卡片确认应用
- 群组行程
- AI 行程生成
- 成员偏好
- 冲突协调分析
- 高德天气提醒
- 高德智能路线生成
- 投票创建、投票/改票、投票结果联动行程修改

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
- `group_polls`
- `group_poll_votes`
- `amap_poi_cache`
- `amap_route_cache`
- 本地路线图相关表，用于保存校园/景区路网、节点、边、服务设施和交通属性

数据说明：

- 北邮校园可视化导航图仍保留原有校区路网。
- 本地算法模式的景区/校园路网图注入数据库后，不再把大规模模拟节点硬编码在前端代码文件中。
- 室内导航使用每层独立 JSON 与参考底图，作为教学实验综合楼的室内建模数据源。

## 6. 算法能力

文件：

- `src/backend/src/algorithms/dijkstra.js`
- `src/backend/src/algorithms/heap.js`
- `src/backend/src/algorithms/kmp.js`
- `src/backend/src/algorithms/trie.js`
- `src/frontend/src/components/LocalAlgorithmPlanner.jsx`
- `src/frontend/src/components/IndoorNavigationPanel.jsx`

能力：

- Dijkstra：单源最短路，用于本地路线、室内导航和附近设施路网距离排序。
- 多点路径：最邻近启发式 + 2-opt，用于参观多个目标点并返回起点。
- 最短距离策略：以边长度为权重。
- 最短时间策略：真实速度 = 拥挤度 * 理想速度，以通行时间为权重。
- 交通工具策略：步行、自行车、电瓶车、混合交通分别过滤可通行道路并计算最短时间。
- 设施查找和排序：先按类别/关键词查找候选服务设施，再按 Dijkstra 路网距离排序。
- MinHeap：TopK 推荐。
- KMP：日记关键词检索。
- Trie：景点前缀搜索与模糊搜索。
- 倒排索引：景点和日记全文检索。

说明：

- 本地算法用于课程设计核心算法展示与验收。
- 高德真实路线用于外部真实导航体验。
- 室内导航采用前端本地 Dijkstra，数据来自手动标注室内路网 JSON。

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

- `ROUTE_AI_API_KEY`
- `ROUTE_AI_BASE_URL`
- `ROUTE_AI_MODEL`
- `DEEPSEEK_API_KEY`
- `OPENAI_API_KEY`
- `DIARY_AI_API_KEY`
- `DIARY_AI_BASE_URL`
- `DIARY_AI_MODEL`

使用位置：

- 日记草稿生成/润色
- 群组智能建议
- 群组行程生成
- 群组聊天 `@ai`
- 路线说明生成
- 室内导航自然语言讲解

说明：

- 路线说明接口优先读取 `ROUTE_AI_API_KEY`。
- 若未配置路线专用 Key，会依次回退到 `DEEPSEEK_API_KEY`、`OPENAI_API_KEY`、`DIARY_AI_API_KEY`。
- AI 服务不可用时返回本地模板路线说明，不影响核心路径规划。

## 8. 启动命令

后端：

```bash
cd src/backend
npm install
npm run dev
```

前端：

```bash
cd src/frontend
npm install
npm run dev
```

MCP 服务器：

```bash
cd mcp/servers/tour-data-server
npm install
node index.js
```

测试：

```bash
npm test --prefix tests
node adversarial/red-team/route-attack-cases.js
node adversarial/fuzzing/api-fuzzer.js
```

## 9. 测试与验证

已验证：

- 前端 `npm.cmd run build` 通过。
- 后端 `routeDescriptionService` 可正常加载。
- `POST /api/routes/describe` 可返回 API 生成的路线说明，并在无 API 时具备模板兜底。
- 室内导航 1F-5F 可加载独立楼层 JSON 和参考图片。
- 室内导航可计算跨楼层路线，并输出距离、时间、节点和路线说明。
- 附近设施查询按路网距离排序，不按直线距离排序。

建议补充：

- 为 `src/backend/src/algorithms/dijkstra.js` 增加更多不可达、多边权、多交通工具对抗测试。
- 为本地路线图数据库注入脚本增加节点数、边数、设施类型数量校验。
- 为室内导航增加楼层切换、设施排序、跨楼层路径的前端回归测试。

## 10. 已知说明

- 北邮校园图保留当前可视化导航结构，不在本轮室内导航改动中调整。
- 景区/校园大规模模拟路网用于课程设计验收，真实导航以高德路线或后续真实采集数据为准。
- 室内导航目前以教学实验综合楼手动标注网络为准，后续可继续增加更多建筑楼层。
- 路线说明属于辅助表达能力，核心评分算法仍以 Dijkstra、多点路径、查找和排序为主。
