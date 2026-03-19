# Our Tour System Project — 课程设计版《完整可落地设计报告》

> 面向“现场演示验收”的实现设计：以**旅游地点推荐、旅游路线规划、旅游场所查询、旅游日记管理与交流**为主线，扩展实现**美食推荐、多人群组共享、实时交通/天气推送、AI 实时行程微调、行李清单、回忆录动画**。每个功能的核心算法必须基于**自主设计的数据结构**独立实现，并对比多种算法的性能。

## 1. 问题描述与阶段目标

- **旅游前**：依据热度、评价和个人兴趣/口味偏好推荐目的地（景点/学校）、美食与玩法
- **旅游中**：在景区/校园内做最优路线规划（单点最短路、多点往返最短路、室内导航），并提供场所查询（设施/厕所）
- **旅游后**：生成/管理/交流旅游日记（图文/视频），并可生成旅游动画（回忆录）

## 2. 创新需求（与传统系统差异）与背景依据

### 2.1 创新点（需要写入验收材料）

- **AI 行程实时微调**：堵车/下雨/排队/临时多停留 → 自动重排当天路线并解释原因（不绕路、不浪费时间）
- **对话式个性化推荐**：支持自然语言偏好约束（如“安静、可充电、不用排队、适合拍照、预算 50 内、忌口”）
- **旅游回忆录动画**：旅行结束后生成“地图动画 + 交通方式 + 照片高光”的可播放回忆录

### 2.2 相关新闻/行业趋势引用（用于“创新需求”佐证）

- 参考：AI 旅行 App 强调个性化推荐、地图+列表、智能规划路线（新浪看点）`http://k.sina.com.cn/article_7879922979_1d5ae152301901oyws.html`
- 参考：对话式 AI 地图助手（Ask Maps）支持自然语言询问与个性化建议（Yahoo）`https://tw.news.yahoo.com/google-maps%E5%8D%81%E5%B9%B4%E6%9C%80%E5%A4%A7%E5%8D%87%E7%B4%9A-gemini-ai%E4%B8%8A%E7%B7%9A-ask-144400873.html`

> 注：实现上可用“规则 + 索引检索 + 约束解析”完成对话式体验，不强制依赖外部大模型。

## 3. 需求与验收硬指标（必须满足）

### 3.1 数据要求（课程硬约束）

1. 景区和校园数量：**≥200**（两者内部信息结构可一致）
2. 建筑物数量：**≥20**
3. 服务设施：类型**≥10 种**，实例总数**≥50**
4. 建立景区/校园内部道路图（包含建筑物、服务设施等节点）
5. 道路图边数：**≥200 条**（尽量贴近真实布局）
6. 系统用户：**≥10 人**

### 3.2 功能实现要求（课程硬约束）

- 所列功能均需完整实现，验收需现场演示全部功能
- 每个功能标注的核心算法必须基于自主设计数据结构**独立编程实现**
- 鼓励对比多种算法性能与效果（时间、空间、更新代价）

## 4. 功能清单（汇总）

### 4.1 核心功能（课程要求）

- **旅游推荐**（景点/学校）
- **旅游路线规划**
  - 单点最短路
  - 多点往返（途经多点最短路径）
  - 策略：最短距离 / 最短时间（拥挤度）/ 多交通工具混合 / 室内导航
- **场所查询**（附近设施，按距离排序；禁止直线距离）
- **旅游日记管理**（管理、热度、评分、推荐）
- **旅游日记交流**（目的地筛选、标题精确查找、全文检索、压缩存储、AIGC 动画）

### 4.2 扩展功能（你新增需求）

- **美食推荐**（Top10 部分排序 + 模糊查找 + 菜系过滤）
- **多人群组共享出行方案**（共享行程、协作编辑、投票/分歧提示）
- **实时交通/天气推送**（可用模拟信号代替真实 API）
- **AI 实时行程微调**（走到哪、改到哪）
- **出行装备/行李智能清单**
- **红黑榜与壁垒解释**（推荐/避雷）
- **回忆录动画**（地图故事板播放器）

## 5. 总体架构（可落地）

- **前端 Web（SPA）**：推荐/搜索、地图导航、路线策略切换、日记社区、回忆录播放器、群组协作
- **后端 API（REST）**：鉴权、数据查询、推荐/排序、路线规划、日记检索与压缩、动画故事板生成
- **实时通道（可选）**：WebSocket（协作/推送）
- **数据层**：PostgreSQL（持久化），Redis（缓存/推送队列/协作状态）
- **异步任务（可选）**：故事板生成、批量通知

## 6. 数据模型与“自主数据结构”映射

> 代码层必须实现：图结构、索引结构、TopK 结构、文本索引/匹配、压缩结构等；数据库负责存储与加载。

### 6.1 基础实体（用于数量验收）

- **User**：id, nickname, created_at
- **UserProfile**：user_id, interests[], budget_level, food_preferences, dietary_restrictions, quiet_preference, photo_preference

- **Place**：id, type(scenic/campus), name, city
- **Building**：id, place_id, name, category
- **FacilityType**：id, code, name（≥10）
- **Facility**：id, place_id, facility_type_id, name

### 6.2 道路图（RoadGraph）

- **RoadNode**：node_id, place_id, node_type(entrance/junction/building/facility), ref_id, position(x,y) 或 geo(lat,lng)
- **RoadEdge**
  - edge_id, place_id, from, to
  - length_m
  - crowd_factor（拥挤度，\(0 < c \le 1\)）
  - ideal_speed_by_mode：walk/bike/shuttle（可用常量）
  - allowed_modes：walk/bike/shuttle

> 真实速度 = crowd_factor × ideal_speed；最短时间权重 = length / speed。

### 6.3 室内图（IndoorGraph）

- 节点：door / elevator / floor_hall / room
- 边：door→elevator、elevator→floor、floor_hall→room（要求覆盖“大门到电梯、楼层间电梯、楼层内到房间”）

### 6.4 行程与日记

- **Itinerary**：id, user_id, place_id, start_node_id, days, strategy, mode_mix, status
- **ItineraryItem**：itinerary_id, day_index, target_node_id, order

- **Diary**：id, user_id, place_id, title, content, views, rating_avg, rating_count, created_at
- **DiaryMedia**：diary_id, url, type(image/video)

### 6.5 群组与推送（扩展）

- **Group**：id, name, owner_user_id
- **GroupMember**：group_id, user_id, role
- **Notification**：id, user_id, type(weather/traffic/replan/collab), payload, created_at, read_at

### 6.6 回忆录动画（故事板）

- **MemoryRecap**：id, user_id, itinerary_id, storyboard_json, created_at
  - storyboard_json：路线段（交通方式）+ 停留段（照片/文字高光）时间轴

## 7. 核心算法设计（逐功能对齐课程要求）

## 7.1 旅游推荐（排序算法 + Top10 无需完全排序）

### 自主数据结构

- **TopK 小顶堆**（K=10）：动态维护前 10
- **倒排索引/哈希索引**：tag/category/name → placeIds

### 算法实现与对比

- **方案 A：小顶堆 TopK（推荐）**：\(O(n \log K)\)，适配数据动态更新
- **方案 B：Quickselect**：平均 \(O(n)\)，适合静态一次性取 TopK，用于对比
- **方案 C：全量排序**：归并/快排，用于性能对比与验收材料

## 7.2 查询（查找 + 排序）

- **查找算法**
  - 精确：HashMap（name → id）
  - 关键词：倒排索引（token → ids）或 Trie（前缀）
- **排序算法**：按热度/评价输出 Top10（仍用 TopK）

## 7.3 路线规划

### （1）单点最短路（最短路径算法）

- **最短距离策略**：边权 = length_m → Dijkstra 或 A*
- **最短时间策略（拥挤度）**：边权 = length_m / (ideal_speed × crowd_factor) → Dijkstra 或 A*

### （2）多点往返（途经多点最短路径）

> 从起点出发访问所有目标并回到起点（TSP 变体）。

- **阶段 1**：对起点+目标点跑多次最短路，得到两两最短路矩阵
- **阶段 2（对比）**
  - 方案 A：最近邻 + 2-opt 改良（可落地、可演示）
  - 方案 B：Held–Karp 动态规划（仅用于目标点较少的对比）

### （3）交通工具混合最短时间

- 校园：walk + bike（bike 仅走 bike 道）
- 景区：walk + shuttle（电瓶车仅走固定专线）
- **建模**：多层图（mode layer）或扩展状态（node, mode），并实现 Dijkstra/A*

### （4）室内导航

- IndoorGraph 上做 A*（或 Dijkstra），输出分段指引：门→电梯→楼层→房间

### 图形界面要求（必须）

- 地图展示模块：道路图节点/边 + 路径高亮
- 路径展示模块：分段指引、总距离/总时间、策略切换（距离/时间/工具/室内）

## 7.4 场所查询（禁止直线距离）

### 需求要点

- 查询某地点附近范围内设施，按距离排序；距离必须沿道路图计算，禁止直线距离

### 自主数据结构与算法

- **候选缩小**：网格索引（grid）或四叉树（可简化自研）
- **距离计算**：单源最短路（Dijkstra）一次得到到各节点距离，再筛选设施节点
- **排序**：Top10 用 TopK 堆；全量排序用于对比

## 7.5 日记管理（排序算法）

- 热度：views；评分：rating
- 推荐：按热度/评分/兴趣排序 Top10（TopK）

## 7.6 日记交流（查找 / 全文检索 / 压缩 / 动画）

- **目的地筛选**：place_id → diaryIds（倒排/HashMap）+ TopK
- **标题精确查询（更新快）**：HashMap（title → id）为主；Trie 作为对比
- **全文检索（文本搜索算法）**
  - 单篇匹配：KMP / Boyer–Moore（对比）
  - 多文档：倒排索引 +（可选）Aho–Corasick（多模式对比）
- **无损压缩存储**
  - Huffman vs LZ77/LZ78（压缩率/耗时对比）
- **AIGC 旅游动画（可落地 MVP）**
  - 生成 storyboard JSON（路线+交通方式+照片/文字高光），前端播放器渲染动画

## 7.7 美食推荐（Top10 + 模糊查找）

- **排序**：热度/评价/距离（距离建议同样走道路图或路网近似）→ TopK
- **模糊查找（核心算法）对比**
  - BK-Tree（编辑距离索引）
  - Trie + 编辑距离阈值筛选

## 8. 扩展能力（多人/实时/微调/行李/红黑榜）

- **多人群组共享**
  - 协作：WebSocket 广播行程修改；角色权限（owner/admin/member）
- **实时交通/天气推送**
  - 可接第三方 API；若无法接入，使用 LiveSignal 模拟（雨/拥堵/排队）
- **AI 实时行程微调**
  - 触发：LiveSignal + 用户延长停留
  - 算法：锁定已完成项 → 对剩余点重新跑“多点最短时间/距离”启发式
- **行李清单**
  - 规则：天气/季节/强度/天数 → PackingList（可勾选）
- **红黑榜/壁垒**
  - 输出 blockers（排队风险、闭馆早、预算不匹配、忌口冲突等），作为推荐解释的一部分

## 9. API 设计（最小可演示）

> 前缀：`/api/v1`，返回：`{ code, message, data, requestId }`

- **用户**：POST `/auth/register` `/auth/login`；GET `/me`；PATCH `/me/profile`
- **地点/设施**：GET `/places` `/places/:id`；GET `/places/:id/buildings`；GET `/places/:id/facilities?type=toilet|food|shop...`
- **道路图/导航**
  - GET `/places/:id/graph`（nodes+edges，边数≥200）
  - GET `/places/:id/route`（fromNodeId,toNodeId,strategy=distance|time, mode=walk|bike|shuttle）
  - POST `/places/:id/route/multi`（targets[], returnToStart, strategy, modeMix）
  - GET `/buildings/:id/indoor-route`（door→elevator→floor→room）
- **推荐/美食/搜索**
  - GET `/recommendations/places`（sortBy=hot|rating|interest，Top10）
  - GET `/recommendations/foods`（sortBy=hot|rating|distance，cuisine，Top10）
  - GET `/search`（q,type=place|food|diary，模糊/关键词）
- **日记**
  - POST `/diaries`；GET `/diaries`
  - GET `/diaries/search`（目的地筛选/标题精确/全文检索）
  - POST `/diaries/:id/rate`
  - POST `/diaries/:id/compress`
  - POST `/diaries/:id/animation`（生成 storyboard）
- **群组（可选）**
  - POST `/groups`；POST `/groups/:id/members`；POST `/itineraries/:id/share`

## 10. 种子数据（Seed）与道路图构建（必须）

- Users ≥10（画像覆盖不同偏好）
- Places ≥200（scenic+campus，结构一致）
- Buildings ≥20
- FacilityType ≥10；Facilities ≥50（厕所类型必须存在）
- 道路图边数 ≥200（建议至少 1–3 个 place 使用“接近真实”布局，其余可程序生成）

## 11. 测试、性能对比与验收清单

### 11.1 数据自检（必须自动化）

- Place≥200；Building≥20；FacilityType≥10；Facility≥50；User≥10
- RoadEdge 总数≥200
- 至少 5 个 place：随机 10 对节点最短路可输出路径（距离/时间）

### 11.2 算法对比（必须产出）

- Top10：TopK 堆 vs 全量排序（耗时/内存/更新代价）
- 最短路：Dijkstra vs A*（距离/时间策略）
- 多点路径：最近邻+2-opt vs（小规模）Held–Karp
- 文本检索：KMP/BM vs 倒排（可选 Aho）
- 压缩：Huffman vs LZ（压缩率/耗时）
- 模糊查找：BK-Tree vs Trie+编辑距离

### 11.3 现场演示串联（建议）

- 推荐/查询（Top10）→ 路线规划（策略切换/工具混合/室内）→ 场所查询（道路距离）→ 日记发布/检索/压缩 → 动画故事板播放 →（可选）群组共享与实时推送/微调

## 12. 前端设计构想（新增模块）

### 12.1 页面结构

- **首页/发现**：目的地推荐（红黑榜）、隐藏玩法、美食推荐
- **搜索**：景点/学校、设施、日记、美食（统一搜索框 + Tab）
- **地点详情（景区/校园）**：地图 + 建筑/设施列表（厕所置顶）+ 一键导航
- **导航/路线规划**：目标点多选与拖拽排序 + 策略切换 + 路径高亮 + 分段指引
- **日记社区**：瀑布流 + 目的地筛选 + 排序（热度/评分）+ 全文检索高亮
- **我的旅行**：行程动态时间线 + 媒体管理 + 回忆录故事板播放器
- **群组（可选）**：成员与共享行程列表 + 实时变更提示

### 12.2 地图与可视化交互

- 显示道路图节点/边、路径高亮、交通方式图标（walk/bike/shuttle）
- 室内导航：楼层切换（F1/F2/…）+ 电梯节点分段高亮
- 设施查询：列表按道路距离排序；点选列表联动地图 marker

### 12.3 核心组件（建议）

- `TopKSorter`（排序方式/Top10）
- `RouteStrategyPanel`（距离/时间/工具混合/室内）
- `GraphLayer`（节点/边可视化与调试）
- `DiarySearch`（标题精确/全文检索）
- `StoryboardPlayer`（回忆录动画播放器）

## 13. 里程碑（建议 6 周）

- 第 1 周：数据模型 + seed（200/20/10/50/边≥200/用户≥10）+ 自检
- 第 2 周：推荐/查询（TopK）+ 美食模糊查找
- 第 3 周：最短路（距离/时间）+ 场所查询（道路距离）
- 第 4 周：多点路线 + 工具混合 + 室内导航 + UI
- 第 5 周：日记管理/交流 + 全文检索 + 压缩存储
- 第 6 周：动画故事板 + 播放器 + 性能对比报告 + 演示串联
