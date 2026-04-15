# 功能清单（含已实现 / 未实现）

完成情况定义：
- ✅ 已完成：功能在前后端有完整闭环（页面/接口/算法或数据）且在路由可访问
- 🟡 部分完成：有部分实现或复用实现（例如前端已有但未接入、后端已有但前端未暴露）
- ⬜ 未实现：仅在设计文档/目录占位中出现，代码未落地
- 🧱 占位：存在页面/目录/空文件，但缺少后端接口或未挂载到路由

负责人来源：项目分工见 [PROJECT_OVERVIEW.md](file:///workspace/PROJECT_OVERVIEW.md#L103-L112)。

| 功能域 | 功能（含子功能） | 所属文件位置（入口/接口/实现） | 具体思路（摘要） | 负责人 | 完成情况 | 备注 |
|---|---|---|---|---|---|---|
| 平台基础 | 前端 SPA 基础框架与路由 | [App.jsx](file:///workspace/src/frontend/src/App.jsx) | React Router 组织页面；区分全屏页与标准布局 | 万子豪/缑文轩 | ✅ | `/login` 兼容到 `/auth` |
| 平台基础 | 标准布局（Navbar/Footer） | [Navbar.jsx](file:///workspace/src/frontend/src/components/Navbar.jsx)<br/>[Footer.jsx](file:///workspace/src/frontend/src/components/Footer.jsx) | 统一导航与底部栏，移动端底部导航 | 万子豪/缑文轩 | ✅ |  |
| 平台基础 | 前端 API Client（axios） | [api/index.js](file:///workspace/src/frontend/src/api/index.js) | `baseURL=/api`；按业务域封装函数 | 万子豪/缑文轩 | ✅ | `timeout=8000ms` |
| 平台基础 | Vite 代理 /api → 后端 | [vite.config.js](file:///workspace/src/frontend/vite.config.js) | dev 模式代理避免跨域 | 万子豪 | ✅ | 生产环境需另配反向代理 |
| 平台基础 | 认证/权限（none/guest/user） | [AuthContext.jsx](file:///workspace/src/frontend/src/context/AuthContext.jsx) | localStorage 记忆身份；`can(permission)` 权限门控 | 缑文轩 | ✅ | 后端是 mock-token，不做真实鉴权 |
| 平台基础 | 后端服务框架与路由挂载 | [backend index.js](file:///workspace/src/backend/src/index.js) | Express + CORS + JSON；挂载 4 组路由 | 戴鸿/李佳坤 | ✅ | 端口 3001 |
| 平台基础 | 健康检查 | [backend index.js](file:///workspace/src/backend/src/index.js#L21-L24) | `GET /api/health` 返回 ok | 戴鸿/李佳坤 | ✅ |  |
| 平台基础 | Repository 抽象（数据访问层） | [spotRepository.js](file:///workspace/src/backend/src/repositories/spotRepository.js)<br/>[diaryRepository.js](file:///workspace/src/backend/src/repositories/diaryRepository.js)<br/>[userRepository.js](file:///workspace/src/backend/src/repositories/userRepository.js) | 路由层只依赖 repo；未来可替换为 DB 查询 | 戴鸿 | ✅ | 当前实现为内存数据 |
| 平台基础 | 数据种子（景点/用户/日记/路网） | [spots.js](file:///workspace/src/backend/src/data/spots.js)<br/>[users.js](file:///workspace/src/backend/src/data/users.js)<br/>[diaries.js](file:///workspace/src/backend/src/data/diaries.js)<br/>[graph.js](file:///workspace/src/backend/src/data/graph.js) | 课程验收所需数量级数据；路网用边表 | 戴鸿 | ✅ | graph 边数 ≥ 200 |
| 景点/地点 | 景点列表（过滤+分页） | 后端：`GET /api/spots` → [spots.js](file:///workspace/src/backend/src/routes/spots.js#L16-L21)<br/>前端：[Spots.jsx](file:///workspace/src/frontend/src/pages/Spots.jsx) | repo 过滤 + slice；前端支持 load more 与筛选 | 李佳坤/万子豪 | ✅ |  |
| 景点/地点 | 景点详情 | 后端：`GET /api/spots/:id` → [spots.js](file:///workspace/src/backend/src/routes/spots.js#L73-L78)<br/>前端：[SpotDetail.jsx](file:///workspace/src/frontend/src/pages/SpotDetail.jsx) | 详情卡片展示评分/门票/开放时间/坐标等 | 万子豪 | ✅ |  |
| 景点/地点 | TopK 推荐（按评分） | 后端：`GET /api/spots/topk` → [spots.js](file:///workspace/src/backend/src/routes/spots.js#L23-L31)<br/>算法：[topK](file:///workspace/src/backend/src/algorithms/heap.js#L64-L80) | 小顶堆维护 TopK，复杂度 `O(n log k)` | 戴鸿 | ✅ | Explore 页会用到 |
| 景点/地点 | 综合推荐（city/tags/type + TopK） | 后端：`GET /api/spots/recommend` → [spots.js](file:///workspace/src/backend/src/routes/spots.js#L60-L71) | 先按条件过滤 pool，再跑 TopK | 李佳坤 | ✅ |  |
| 搜索 | 景点搜索（前缀/全文/模糊） | 后端：`GET /api/spots/search` → [spots.js](file:///workspace/src/backend/src/routes/spots.js#L33-L48)<br/>算法：[trie.js](file:///workspace/src/backend/src/algorithms/trie.js) | Trie 前缀；倒排索引全文（AND）；编辑距离模糊 | 李佳坤 | ✅ | 前端 AlgoDemo 直接演示 |
| 搜索 | 自动补全 | 后端：`GET /api/spots/autocomplete` → [spots.js](file:///workspace/src/backend/src/routes/spots.js#L50-L58)<br/>前端：[SearchOverlay.jsx](file:///workspace/src/frontend/src/components/SearchOverlay.jsx) | Trie 前缀取 items（限制条数） | 李佳坤/万子豪 | ✅ | Explore 入口弹层搜索 |
| 路线规划 | 单点最短路（距离/时间） | 后端：`POST /api/routes/shortest` → [routes.js](file:///workspace/src/backend/src/routes/routes.js#L7-L27)<br/>算法：[dijkstra.js](file:///workspace/src/backend/src/algorithms/dijkstra.js#L8-L93)<br/>前端：[RoutePlanner.jsx](file:///workspace/src/frontend/src/pages/RoutePlanner.jsx) | Dijkstra + 小顶堆；mode 切换边权 `dist/time` | 戴鸿/万子豪 | ✅ |  |
| 路线规划 | 多点路线（NearestNeighbor + 2-opt） | 后端：`POST /api/routes/multi` → [routes.js](file:///workspace/src/backend/src/routes/routes.js#L29-L48)<br/>算法：[multiPointPath](file:///workspace/src/backend/src/algorithms/dijkstra.js#L95-L144) | 预计算两两最短路矩阵；最近邻得初解；2-opt 局部优化 | 李佳坤/万子豪 | ✅ |  |
| 场所查询 | 附近场所（道路距离排序） | 后端：`GET /api/routes/nearby` → [routes.js](file:///workspace/src/backend/src/routes/routes.js#L50-L77)<br/>前端：[SpotDetail.jsx](file:///workspace/src/frontend/src/pages/SpotDetail.jsx) | 单源 Dijkstra 得 dist；筛选 maxDist 内节点；按 roadDist 排序 | 戴鸿/万子豪 | ✅ | type 实际复用 spots.type（restaurant/toilet 等） |
| 图数据 | 图统计（nodes/edges/spots） | 后端：`GET /api/routes/graph-stats` → [routes.js](file:///workspace/src/backend/src/routes/routes.js#L79-L91)<br/>前端：[AlgoDemo.jsx](file:///workspace/src/frontend/src/pages/AlgoDemo.jsx#L12-L39) | 统计 edges 与 nodeSet 大小 | 戴鸿/万子豪 | ✅ | AlgoDemo 用于验收演示 |
| 日记 | 日记列表（过滤/排序/分页） | 后端：`GET /api/diaries` → [diaries.js](file:///workspace/src/backend/src/routes/diaries.js#L11-L29)<br/>前端：[Diary.jsx](file:///workspace/src/frontend/src/pages/Diary.jsx) | 过滤后按 likes/views/createdAt 排序；分页 slice | 缑文轩 | ✅ |  |
| 日记 | 日记搜索（KMP / 倒排索引） | 后端：`GET /api/diaries/search` → [diaries.js](file:///workspace/src/backend/src/routes/diaries.js#L31-L43)<br/>算法：[kmp.js](file:///workspace/src/backend/src/algorithms/kmp.js)、[FullTextIndex](file:///workspace/src/backend/src/algorithms/trie.js#L118-L165)<br/>前端：[Diary.jsx](file:///workspace/src/frontend/src/pages/Diary.jsx) | KMP 多字段匹配并高亮；或倒排索引 AND 查询 | 李佳坤/缑文轩 | ✅ | 前端用 `dangerouslySetInnerHTML` 渲染高亮 |
| 日记 | 发布日记 | 后端：`POST /api/diaries` → [diaries.js](file:///workspace/src/backend/src/routes/diaries.js#L52-L60)<br/>前端：[Diary.jsx](file:///workspace/src/frontend/src/pages/Diary.jsx) | repo.create；并将新文档写入全文索引 | 缑文轩 | ✅ | 仅前端做权限门控 |
| 日记 | 点赞/评论 | 后端：`POST /api/diaries/:id/like`、`POST /api/diaries/:id/comment` → [diaries.js](file:///workspace/src/backend/src/routes/diaries.js#L62-L76)<br/>前端：[Diary.jsx](file:///workspace/src/frontend/src/pages/Diary.jsx) | repo.like / repo.addComment | 缑文轩 | ✅ |  |
| 用户 | 用户列表/详情（含 TA 的日记） | 后端：`GET /api/users`、`GET /api/users/:id` → [users.js](file:///workspace/src/backend/src/routes/users.js)<br/>前端：[Profile.jsx](file:///workspace/src/frontend/src/pages/Profile.jsx) | 用户详情中聚合 diaryRepo.findAll(userId) | 缑文轩 | ✅ |  |
| 用户 | 登录/注册（模拟） | 后端：`POST /api/users/login`、`POST /api/users` → [users.js](file:///workspace/src/backend/src/routes/users.js)<br/>前端：[Auth.jsx](file:///workspace/src/frontend/src/pages/Auth.jsx) | 仅 username；注册做唯一性校验；返回 mock token | 缑文轩/李佳坤 | ✅ | 无密码学与真实鉴权 |
| 探索入口 | Explore 聚合页（热门景点/日记入口） | [Explore.jsx](file:///workspace/src/frontend/src/pages/Explore.jsx) | 聚合 TopK、日记等入口；弹层搜索 | 万子豪 | ✅ |  |
| 交互视觉 | 交互地球（Canvas 2D） | [InteractiveGlobe.jsx](file:///workspace/src/frontend/src/components/InteractiveGlobe.jsx) | Canvas 绘制 + 待机状态机；Phase 2/3 预留升级 | 万子豪 | ✅ | Phase 1 实现 |
| 社区 | 动态广场（Plaza） | [Plaza.jsx](file:///workspace/src/frontend/src/pages/Plaza.jsx) | 当前复用 diaries 数据做“动态流” | 缑文轩 | 🟡 | 设计里 moments 独立模型未落地 |
| 演示 | 算法演示中心 | [AlgoDemo.jsx](file:///workspace/src/frontend/src/pages/AlgoDemo.jsx) | 用前端交互直接调用后端算法接口 | 缑文轩 | ✅ | “核心算法数=6”为展示口径 |
| 管理后台 | Admin 管理后台页面 | [Admin.jsx](file:///workspace/src/frontend/src/pages/Admin.jsx) | UI + Tab；预期支持删除日记/景点 | 缑文轩 | 🧱 | 未挂载到路由；`deleteDiary/deleteSpot` API 不存在 |
| 美食推荐 | Foods 美食推荐页面 | [Foods.jsx](file:///workspace/src/frontend/src/pages/Foods.jsx) | 预期按城市/菜系过滤 + TopK | 万子豪 | 🧱 | 前端调用 `getFoods`，但 [api/index.js](file:///workspace/src/frontend/src/api/index.js) 与后端均无 foods 接口 |
| 规划代理 | tour-planner（占位） | [agents/tour-planner](file:///workspace/agents/tour-planner) | 规划语义：行程规划代理 | 待定 | ⬜ | 仅 `.keep` |
| 规划代理 | route-optimizer（占位） | [agents/route-optimizer](file:///workspace/agents/route-optimizer) | 规划语义：路线优化代理 | 待定 | ⬜ | 仅 `.keep` |
| 规划代理 | diary-writer（占位） | [agents/diary-writer](file:///workspace/agents/diary-writer) | 规划语义：日记生成/润色代理 | 待定 | ⬜ | 仅 `.keep` |
| 规划代理 | conflict-resolver（占位） | [agents/conflict-resolver](file:///workspace/agents/conflict-resolver) | 规划语义：同行人冲突协调代理 | 待定 | ⬜ | 仅 `.keep` |
| MCP | GitHub MCP Server（独立子项目） | [mcp/servers/github-mcp-server](file:///workspace/mcp/servers/github-mcp-server) | stdio transport；需要 `GITHUB_TOKEN` | 待定 | ✅ | 与旅游系统主应用相对独立 |
| 测试 | tests 目录结构 | [tests/](file:///workspace/tests) | 预留单测/集成/e2e 目录 | 全员 | 🧱 | 当前无可运行测试框架配置 |
| 设计对齐 | API 版本化与统一返回体 | [DESIGN.md](file:///workspace/DESIGN.md#L267-L291) | 规划 `/api/v1` + `{ code, message, data, requestId }` | 李佳坤 | ⬜ | 当前实际为 `/api/*` + `{ success, data }` |
| 设计对齐 | 数据库（PostgreSQL/Redis） | [PROJECT_OVERVIEW.md](file:///workspace/PROJECT_OVERVIEW.md#L34-L43) | 规划持久化与缓存/推送 | 戴鸿 | ⬜ | 当前为内存数据 |
| 设计功能 | 交通工具混合/室内导航/地图高亮 | [DESIGN.md](file:///workspace/DESIGN.md#L156-L186) | 多层图或扩展状态；IndoorGraph；前端路径高亮 | 万子豪/戴鸿 | ⬜ | 当前仅“距离/时间”权重切换，无室内/多交通工具 |
| 设计功能 | 多算法对比：A* / Held-Karp / BM / Huffman / LZ / BK-Tree | [PROJECT_OVERVIEW.md](file:///workspace/PROJECT_OVERVIEW.md#L44-L56) | 作为性能对比实现多套方案 | 戴鸿/李佳坤 | ⬜ | 当前只落地 Dijkstra/2-opt/TopK/Trie/KMP/倒排 |
| 设计功能 | 日记扩展：评分/压缩/动画 storyboard | [DESIGN.md](file:///workspace/DESIGN.md#L282-L288) | `rate/compress/animation` API + 前端播放器 | 缑文轩/李佳坤 | ⬜ | 当前无这些端点与页面 |
| 设计功能 | 群组共享/冲突协调/可视化 | [DESIGN.md](file:///workspace/DESIGN.md#L223-L235) | 偏好向量 + 冲突矩阵 + 折中算法 | 缑文轩 | ⬜ | 仅存在 agents/ 占位目录名 |
| 设计功能 | 实时推送（天气/交通）与 AI 行程微调 | [DESIGN.md](file:///workspace/DESIGN.md#L257-L266) | WebSocket + LiveSignal 模拟 + 重排剩余路线 | 戴鸿/万子豪 | ⬜ | 无 WebSocket 代码 |
| 设计功能 | 行李清单 / 红黑榜与解释 | [DESIGN.md](file:///workspace/DESIGN.md#L262-L266) | 规则引擎 + 可解释输出 | 待定 | ⬜ | 未落地 |

