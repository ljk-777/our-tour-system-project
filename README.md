# 迹刻 Waylog · 旅游系统课程设计

> 智能旅游推荐与规划系统，融合自研数据结构算法、3D 地球可视化与 AI 辅助规划。

## 当前完成功能

### 核心算法（后端）
| 算法 | 文件 | 用途 |
|------|------|------|
| Dijkstra / 多点路径 | `src/backend/src/algorithms/dijkstra.js` | 景点间最短路线规划 |
| MinHeap / TopK | `src/backend/src/algorithms/heap.js` | 美食/景点 Top-K 推荐 |
| KMP 全文检索 | `src/backend/src/algorithms/kmp.js` | 日记关键词搜索 |
| Trie 前缀查询 | `src/backend/src/algorithms/trie.js` | 景点名称前缀补全 |

### 前端页面
| 页面 | 路由 | 主要功能 |
|------|------|---------|
| 首页 | `/` | 弹簧卡片轮播、热门景点、快捷入口 |
| 3D 星球 | `/globe` | 互动地球、旅行者足迹、AI 路线动画、DeepSeek 景区搜索 |
| 发现景点 | `/spots` | Trie 前缀搜索 + 高德实时 POI、城市/类型筛选 |
| 美食推荐 | `/foods` | TopK 堆算法推荐、城市筛选 |
| 路线规划 | `/route` | Dijkstra 最短路 + 高德地图导航 |
| 旅行日记 | `/diary` | KMP 搜索、AI 草稿生成、点赞评论 |
| 旅行广场 | `/plaza` | 社区动态、精选内容 |
| 旅行者 | `/profile` | 用户排行榜、成就系统、足迹统计 |

### UI 设计语言
- iOS 26 Liquid Glass：固定彩色 blob 背景层 + `backdrop-filter: blur(28px) saturate(2.2)` 玻璃卡片
- Navbar：Apple 风格磨砂透明导航 + GitHub 风格用户下拉菜单（7 个旅行入口）
- 全站橙色主题（`#f59e0b → #f97316`）

### AI 集成
- **DeepSeek API**：Globe 页景区搜索 → 自动生成 250 字旅游资料；AI 路线规划面板
- **高德地图 API**：实时 POI 搜索、路线导航、天气查询

---

## 技术栈

**前端**
- React 18 + Vite
- Three.js + @react-three/fiber + @react-three/drei（3D 地球）
- Framer Motion（动画）
- Tailwind CSS + 自定义 CSS 设计系统
- Zustand（全局状态）

**后端**
- Node.js + Express
- PostgreSQL（主数据库）
- 自研算法模块（无第三方算法库依赖）

---

## 本地启动

### 前置条件
- Node.js 18+
- PostgreSQL 运行在 `localhost:5432`，数据库名 `tour_system`

### 数据库配置
```
数据库名：tour_system
用户名：  postgres
端口：    5432
数据目录：D:\postgres-data（本机）
```

### 启动命令

```powershell
# 启动 PostgreSQL（管理员终端）
net start postgresql-x64-17

# 后端（新终端）
cd src/backend
npm install
npm run dev        # http://localhost:3000

# 前端（新终端）
cd src/frontend
npm install
npm run dev        # http://localhost:5173
```

### 初始化种子数据（首次运行）
```powershell
cd src/backend
node scripts/initDb.js
node scripts/seedDb.js
```

---

## 项目结构

```
src/
├── backend/
│   ├── src/
│   │   ├── algorithms/     # Dijkstra / Heap / KMP / Trie
│   │   ├── db/             # PostgreSQL schema & 连接
│   │   ├── routes/         # REST API 路由
│   │   └── index.js
│   └── scripts/            # 数据库初始化 & 种子数据
└── frontend/
    └── src/
        ├── components/     # Navbar / Earth3D / GlobeOverlay / SpotCard 等
        ├── pages/          # 各页面组件
        ├── data/           # globeData.js（地球标记点 & 城市坐标）
        ├── store/          # useAppStore.js（Zustand 全局状态）
        ├── api/            # 后端 API 调用封装
        └── context/        # AuthContext
```

---

## 环境变量（src/backend/.env）

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=tour_system
DB_USER=postgres
DB_PASSWORD=your_password
AMAP_KEY=your_amap_key
```

---

## 自定义命令

```bash
/seed            # 生成/验证种子数据（≥200景点, ≥200边, ≥10用户）
/algo-bench      # 算法性能对比（TopK vs 全排序, Dijkstra vs A*）
/adversarial-run # 全套对抗测试报告
```
