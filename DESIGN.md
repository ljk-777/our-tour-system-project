# Our Tour System Project — 课程设计版《完整可落地设计报告》

> 面向“现场演示验收”的实现设计：以**旅游地点推荐、旅游路线规划、旅游场所查询、旅游日记管理与交流**为主线，扩展实现**美食推荐、多人群组共享、实时交通/天气推送、AI 实时行程微调、行李清单、回忆录动画**。每个功能的核心算法必须基于**自主设计的数据结构**独立实现，并对比多种算法的性能。

## 1. 问题描述与阶段目标

- **旅游前**：依据热度、评价和个人兴趣/口味偏好推荐目的地（景点/学校）、美食与玩法
- **旅游中**：在景区/校园内做最优路线规划（单点最短路、多点往返最短路、室内导航），并提供场所查询（设施/厕所）与景点/建筑信息展示
- **旅游后**：生成/管理/交流旅游日记（图文/视频），并可生成旅游动画（回忆录），同时支持旅行动态分享与社交互动

## 2. 创新需求（与传统系统差异）与背景依据

### 2.1 创新点（需要写入验收材料）

- **AI 行程实时微调**：堵车/下雨/排队/临时多停留 → 自动重排当天路线并解释原因（不绕路、不浪费时间）
- **对话式个性化推荐**：支持自然语言偏好约束（如“安静、可充电、不用排队、适合拍照、预算 50 内、忌口”）
- **旅游回忆录动画**：旅行结束后生成“地图动画 + 交通方式 + 照片高光”的可播放回忆录
- **旅行动态社交表达**：支持在行程中发布旅行动态、图片与短文本感受，形成轻量化的旅行分享流
- **同行人冲突可视化协调**：针对预算、体力、口味、节奏、拍照偏好等分歧进行可视化分析，并给出折中路线与分流重聚建议

### 2.2 相关新闻/行业趋势引用（用于“创新需求”佐证）

- 参考：AI 旅行 App 强调个性化推荐、地图+列表、智能规划路线（新浪看点）`http://k.sina.com.cn/article_7879922979_1d5ae152301901oyws.html`
- 参考：对话式 AI 地图助手（Ask Maps）支持自然语言询问与个性化建议（Yahoo）`https://tw.news.yahoo.com/google-maps%E5%8D%81%E5%B9%B4%E6%9C%80%E5%A4%A7%E5%8D%87%E7%B4%9A-gemini-ai%E4%B8%8A%E7%B7%9A-ask-144400873.html`

> 注：实现上可用“规则 + 索引检索 + 约束解析”完成对话式体验，不强制依赖外部大模型。

## 3. 需求与验收硬指标（必须满足）

### 3.1 数据要求（课程硬约束）

1. 景区和校园数量：**≥200**（两者内部信息结构可一致）
2. 典型演示景区/校园内部建筑物数量：**≥20**
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
  - 多点往返（途经多点最短路径并返回起点）
  - 策略：最短距离 / 最短时间（拥挤度）/ 多交通工具混合 / 室内导航
- **场所查询**（附近设施，按距离排序；禁止直线距离）
- **景点/建筑信息展示**（名称、类别、简介、标签、开放信息、推荐理由）
- **旅游日记管理**（管理、热度、评分、推荐）
- **旅游日记交流**（目的地筛选、标题精确查找、全文检索、压缩存储、AIGC 动画）

### 4.2 扩展功能（你新增需求）

- **美食推荐**（Top10 部分排序 + 模糊查找 + 菜系过滤）
- **多人群组共享出行方案**（共享行程、协作编辑、投票/分歧提示）
- **同行人冲突可视化协调器**（预算、体力、节奏、口味、拍照偏好等冲突分析与折中方案生成）
- **旅行动态社交广场**（发布动态、图片、定位、短评、点赞评论）
- **实时交通/天气推送**（可用模拟信号代替真实 API）
- **AI 实时行程微调**（走到哪、改到哪）
- **出行装备/行李智能清单**
- **红黑榜与壁垒解释**（推荐/避雷）
- **回忆录动画**（地图故事板播放器）

## 5. 总体架构（可落地）

- **前端 Web（SPA）**：推荐/搜索、地图导航、路线策略切换、日记社区、动态广场、回忆录播放器、群组协作
- **后端 API（REST）**：鉴权、数据查询、推荐/排序、路线规划、日记检索与压缩、动态流管理、动画故事板生成
- **实时通道（可选）**：WebSocket（协作/推送/动态互动提醒）
- **数据层**：PostgreSQL（持久化），Redis（缓存/推送队列/协作状态）
- **异步任务（可选）**：故事板生成、批量通知

## 6. 数据模型与“自主数据结构”映射

> 代码层必须实现：图结构、索引结构、TopK 结构、文本索引/匹配、压缩结构等；数据库负责存储与加载。

### 6.1 基础实体（用于数量验收）

- **User**：id, nickname, created_at
- **UserProfile**：user_id, interests[], budget_level, food_preferences, dietary_restrictions, quiet_preference, photo_preference

- **Place**：id, type(scenic/campus), name, city, intro, tags[], open_info
- **Building**：id, place_id, name, category, intro, tags[]
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

### 6.5 群组、动态与推送（扩展）

- **Group**：id, name, owner_user_id
- **GroupMember**：group_id, user_id, role
- **GroupPreference**：group_id, user_id, budget_level, walk_tolerance, food_preferences, photo_preference, pace_preference
- **ConflictAnalysis**：group_id, itinerary_id, conflict_vector_json, compromise_plan_json, created_at
- **MomentPost**：id, user_id, place_id, content, visibility, likes_count, comments_count, created_at
- **MomentMedia**：post_id, url, type(image/video)
- **MomentComment**：id, post_id, user_id, content, created_at
- **Notification**：id, user_id, type(weather/traffic/replan/collab/social), payload, created_at, read_at

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

- 查询某地点附近一定范围内设施，按距离排序；距离必须沿道路图计算，禁止直线距离

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

## 7.8 同行人冲突可视化协调

- **冲突维度建模**
  - 预算冲突、体力冲突、口味冲突、节奏冲突、拍照偏好冲突
- **自主数据结构**
  - GroupPreference 哈希映射：user_id → 偏好向量
  - ConflictMatrix：记录成员两两差异与全组分歧强度
- **协调算法**
  - 方案 A：加权满意度评分 + 贪心折中路线生成
  - 方案 B：约束优先级过滤 + 分流后重聚节点规划
- **输出形式**
  - 冲突热力图、分歧来源解释、推荐折中方案、局部分流与重聚建议

## 7.9 旅行动态社交广场

- **内容组织**
  - 旅行动态支持文字、图片、短视频、定位标签与关联地点
- **自主数据结构**
  - 倒排索引：place/tag/user → postIds
  - 时间线链表或优先队列：按发布时间组织动态流
- **查找与排序**
  - 按地点、标签、作者查询
  - 按时间热度混合排序展示
- **互动能力**
  - 点赞、评论、收藏、引用到日记或回忆录故事板

## 8. 扩展能力（多人/实时/微调/行李/红黑榜）

- **多人群组共享**
  - 协作：WebSocket 广播行程修改；角色权限（owner/admin/member）
- **同行人冲突可视化协调**
  - 对群组成员偏好进行冲突检测，输出可解释的折中路线、分流方案与重聚节点建议
- **旅行动态社交广场**
  - 支持旅行中即时发布动态，形成地点关联的分享流与互动流
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
  - GET `/search`（q,type=place|food|diary|post，模糊/关键词）
- **日记**
  - POST `/diaries`；GET `/diaries`
  - GET `/diaries/search`（目的地筛选/标题精确/全文检索）
  - POST `/diaries/:id/rate`
  - POST `/diaries/:id/compress`
  - POST `/diaries/:id/animation`（生成 storyboard）
- **动态社交**
  - POST `/moments`
  - GET `/moments`
  - POST `/moments/:id/like`
  - POST `/moments/:id/comments`
- **群组（可选）**
  - POST `/groups`
  - POST `/groups/:id/members`
  - POST `/itineraries/:id/share`
  - POST `/groups/:id/conflict-analysis`

## 10. 种子数据（Seed）与道路图构建（必须）

- Users ≥10（画像覆盖不同偏好）
- Places ≥200（scenic+campus，结构一致）
- 典型演示景区/校园内部 Buildings ≥20
- FacilityType ≥10；Facilities ≥50（厕所类型必须存在）
- 道路图边数 ≥200（建议至少 1–3 个 place 使用“接近真实”布局，其余可程序生成）

## 11. 测试、性能对比与验收清单

### 11.1 数据自检（必须自动化）

- Place≥200；典型演示景区/校园内部 Building≥20；FacilityType≥10；Facility≥50；User≥10
- RoadEdge 总数≥200
- 至少 5 个 place：随机 10 对节点最短路可输出路径（距离/时间）
- 地点详情页可正常展示景点/建筑简介、标签与开放信息

### 11.2 算法对比（必须产出）

- Top10：TopK 堆 vs 全量排序（耗时/内存/更新代价）
- 最短路：Dijkstra vs A*（距离/时间策略）
- 多点路径：最近邻+2-opt vs（小规模）Held–Karp
- 文本检索：KMP/BM vs 倒排（可选 Aho）
- 压缩：Huffman vs LZ（压缩率/耗时）
- 模糊查找：BK-Tree vs Trie+编辑距离
- 冲突协调：加权满意度贪心方案 vs 约束过滤分流方案

### 11.3 现场演示串联（建议）

- 推荐/查询（Top10）→ 景点/建筑信息展示 → 路线规划（策略切换/工具混合/室内）→ 场所查询（道路距离）→ 群组协作与冲突协调展示 → 动态发布与互动 → 日记发布/检索/压缩 → 动画故事板播放 →（可选）实时推送与微调

## 12. 前端设计构想（新增模块）

### 12.1 页面结构

- **登录/注册页**：沉浸式交互入口，采用动态角色与场景反馈的登录方式，强化首次进入系统的探索感与记忆点
- **首页/发现**：目的地推荐（红黑榜）、隐藏玩法、美食推荐
- **搜索**：景点/学校、设施、日记、美食、动态（统一搜索框 + Tab）
- **地点详情（景区/校园）**：地图 + 景点/建筑介绍 + 建筑/设施列表（厕所置顶）+ 一键导航
- **导航/路线规划**：目标点多选与拖拽排序 + 策略切换 + 路径高亮 + 分段指引
- **日记社区**：瀑布流 + 目的地筛选 + 排序（热度/评分）+ 全文检索高亮
- **动态广场**：旅行动态流、地点关联卡片、点赞评论入口、同行互动记录
- **我的旅行**：行程动态时间线 + 媒体管理 + 回忆录故事板播放器
- **群组（可选）**：成员、共享行程列表、冲突热力图、折中路线建议与实时变更提示

### 12.2 整体视觉与交互风格

- 系统主界面采用**三维地球可视化首页**作为全局空间背景，承担目的地发现、路径预览、回忆录回放等统一视觉入口
- 地球视图支持缩放、旋转与视角过渡，重点区域叠加地点标记、路线高亮与卡片式信息浮层
- 控件风格以**轻盈、通透、连续过渡**为原则，按钮、筛选器、弹层与信息卡片保持圆角、层次阴影与细腻动效，保证操作反馈自然顺滑
- 搜索、推荐、导航、日记、动态等核心模块保持统一的视觉语言，减少界面跳转割裂感
- 重点信息采用“地图主视图 + 浮层卡片 + 分段详情”的组织形式，兼顾展示效果与演示可读性

### 12.3 地图与可视化交互

- 显示道路图节点/边、路径高亮、交通方式图标（walk/bike/shuttle）
- 室内导航：楼层切换（F1/F2/…）+ 电梯节点分段高亮
- 设施查询：列表按道路距离排序；点选列表联动地图 marker
- 三维地球视图与二维路线视图联动：全局查看目的地分布，局部切换到具体景区/校园道路图
- 地图底座采用可替换的地图服务接入层，便于后续接入不同厂商的地图数据、底图样式与地理编码能力
- 回忆录动画支持在地球视图上回放路线轨迹、停留节点与照片高光，形成“从全局到局部”的旅行故事线
- 群组页面支持冲突热力图、成员偏好雷达图与折中路线可视化切换
- 动态广场中的地点卡片可与地球视图联动，点击后高亮对应区域与旅行轨迹

### 12.4 核心组件（建议）

- `TopKSorter`（排序方式/Top10）
- `RouteStrategyPanel`（距离/时间/工具混合/室内）
- `GraphLayer`（节点/边可视化与调试）
- `DiarySearch`（标题精确/全文检索）
- `GlobeScene`（三维地球场景、地点标记与路线预览）
- `AuthInteractivePanel`（动态登录交互面板）
- `ConflictBoard`（群组冲突热力图、偏好对比与折中方案展示）
- `MomentFeed`（旅行动态流与互动面板）
- `StoryboardPlayer`（回忆录动画播放器）

## 13. 里程碑（建议 6 周）

- 第 1 周：数据模型 + seed（200/20/10/50/边≥200/用户≥10）+ 自检
- 第 2 周：推荐/查询（TopK）+ 美食模糊查找
- 第 3 周：最短路（距离/时间）+ 场所查询（道路距离）
- 第 4 周：多点路线 + 工具混合 + 室内导航 + UI
- 第 5 周：日记管理/交流 + 动态广场 + 全文检索 + 压缩存储
- 第 6 周：动画故事板 + 冲突协调展示 + 性能对比报告 + 演示串联
