# 第十二周项目周报

## 一、本周项目整体进展

本周（5月24日—5月30日）是整个项目迭代速度最快的一周，总提交量超过30个，覆盖前端视觉、AI 宠物助手、个人主页、群组创建、Globe 动效五个方向全面爆发。最显著的产出是：戴鸿独立完成了 AI 青蛙旅游助手（AIPet）的完整实现（含 DeepSeek 接入、像素艺术设计、物理动画、图片上传），以及 Globe 城市点击电影级缩进动效和 Liquid Glass 全局 UI 升级。李佳坤完成景点图片本地化切换，万子豪提交群组功能初版，缑文轩持续推进群组协作和功能概览文档。

KMP 检索演示和对抗基础设施入库依然缺席，已连续六周无进展。

---

## 二、本周各模块进展

### 1. Globe 3D 地球交互升级（`src/frontend/src/components/Earth3D.jsx`）
- Globe 3D 全面重构：Home.jsx Apple 风格重设计，Liquid Glass UI 覆盖全局（戴鸿，commit bca61e2/b7afead）
- DeepSeek AI 接入 Globe 搜索面板，实现自然语言旅游规划
- Globe Phase1：地球刹车减速 + 平滑旋转至聚焦城市（状态机 + ease-out-quint）
- 多轮城市居中精确修复（X+Y 双轴、camera-aware azimuth、移除 X-tilt，共4次迭代）
- 城市点击电影级缩进动效（ease-out-back + OrbitControls 锁定，commit 6146c86）
- Navbar 新增用户头像下拉菜单，日记背景玻璃修复（commit efc12f3）

### 2. AI 旅游青蛙宠物（`src/frontend/src/components/AIPet/`）
- 完整实现：像素艺术青蛙形象、物理跳跃动画、玻璃态气泡、雨天特效（commit fb17464）
- DeepSeek 个性化聊天 + 多变体 FAQ + 图片上传 + 随机推荐景点（commit 049c303）
- 5次 bugfix 迭代：按钮可见性、点击触发跳跃、气泡默认位置、错误提示、动画重构（commits 4b5dbe6-b82bfe4）

### 3. 个人主页（`src/frontend/src/pages/Profile.jsx`）
- 收藏夹 + 足迹地图全栈实现（戴鸿，commit d4ac9e1）
- 橙色主题修复 + joinDate 安全处理 + 内联保存反馈（commit 2cd5ceb）

### 4. 群组功能初版（`src/backend/src/routes/groups.js`）
- 群组创建功能初版提交（万子豪，commit 727d58f，PR #45 合并）
- 群组协作流程增强、功能概览文档更新（缑文轩，commits ada4bd2/f6720cc）

### 5. 景点图片本地化（`src/frontend/public/images/`）
- 切换景点图片为本地存储，消除 Unsplash CDN 依赖（李佳坤，commit 18c7997）

### 6. 全局性能优化
- 减少 backdrop-filter blur/saturate，为高频渲染组件添加 `will-change`/`translateZ`（commit c6e23d7）

---

## 三、本周每位同学工作进展

### 1. 戴鸿（前端·Globe + AIPet + 个人主页）
- Globe 全套动效：Liquid Glass UI、DeepSeek 接入、城市点击缩进、四轮居中精修
- AIPet AI 青蛙从零实现，含全部交互细节和5次 bug 修复
- 个人主页（Profile）收藏夹 + 足迹地图全栈上线

### 2. 李佳坤（前端·图片本地化）
- 景点图片切换本地存储，解决演示环境外链断网风险

### 3. 万子豪（后端·群组功能）
- 群组创建初版功能提交（commit 727d58f）
- 同期修复部分 bug 并完善个人主页初版（commit c21cc60）

### 4. 缑文轩（前端·社区与文档）
- 群组协作流程增强（commit ada4bd2）
- 功能概览文档刷新（commit f6720cc）
- 负责 PR #37/#38/#39/#40/#41/#42/#44/#45 合并管理

---

## 四、当前存在的问题

1. **六周连续滞后：KMP 检索可见化** — 截至本周末，KMP 算法仍未在任何前端页面中以可见形式展示（无高亮、无排序结果），已成为答辩演示的重大风险点。

2. **六周连续滞后：对抗基础设施入库** — `adversarial/`、`mcp/` 相关脚本依然未入主分支。

3. **AIPet 迭代成本高** — AI 青蛙在一天内经历了7次提交（实现+5次修复+重构），说明初版上线前缺乏足够的本地测试，导致高频 hotfix。

4. **群组功能初版仅含创建** — 目前群组只有创建入口，缺少退出、投票、共享景点、路线规划等核心协作功能，后续开发工作量仍较大。

5. **Globe 城市居中经历4次迭代仍不稳定** — 说明相机旋转数学模型需要更系统地推导，而非逐次 hotfix。

---

## 五、下周计划

1. **Globe 弹幕与城市定位最终优化**：补全城市聚焦后屏幕1/3定位、流星弹幕特效，完成 Globe 模块收尾。
2. **群组协作功能深化**：完成退出群组、目的地投票、共享景点、群内 Dijkstra 路线规划四项功能。
3. **景点图片继续扩充**：覆盖更多景点的本地实景图，提升卡片视觉丰富度。
4. **Admin 后台继续完善**：跟进路网数据管理功能。
5. **答辩演示链路梳理**：确认 Dijkstra/KMP/TopK/Trie 四个核心算法在页面中的可见展示路径。
