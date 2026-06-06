# 第十三周项目周报

## 一、本周项目整体进展

本周（5月31日—6月6日）项目进入收尾冲刺阶段，主线工作分两路推进：戴鸿持续打磨 Globe 3D 地球的流星弹幕特效和城市定位精度，共提交7次迭代（含性能优化 patch）；缑文轩完成群组协作中枢的大规模升级，后端群组路由、前端 GroupDetail 页面均有显著增量；李佳坤完成景点图片本地化最终版（128张实景图）；万子豪完成 Admin 后台更新。

第十二周计划中"群组四项功能"仅部分完成（已有基础群聊/行程，但退出群组、投票、共享景点、Dijkstra 路线规划四项新功能尚未落地），Globe 弹幕已上线但仍有卡顿和定位问题，KMP 检索依然缺席。

---

## 二、本周各模块进展

### 1. Globe 流星弹幕系统（`src/frontend/src/components/GlobeOverlay.jsx`、`Earth3D.jsx`）
- 城市聚焦后屏幕竖向1/3定位实现（ctrl.target.y 动画驱动）
- 流星弹幕 DanmuLayer 初版上线：Canvas rAF 绘制、30条旅行主题消息、8通道、头部光晕（commit 7f95d94）
- 密集版重写：22颗初始爆发、粒子拖尾系统、渐变彗星尾迹、双层头部光晕（commit 4450fdc）
- 性能优化：彻底移除 shadowBlur，改用双层渐变线+fillRect，帧率大幅提升（commit 5946ffa）
- Globe 旋转停顿修复：brake 衰减加速 + ease-in-out-cubic 替换 ease-out-quint（commit 6656e59）
- 后处理：city framing 动画移入 zoomIn 阶段同步执行，消除二次镜头跳动（commit 878b567）
- 相机旋转数学公式彻底重写：正确3D向量推导，处理垂直相机边界情况（commit a0f8c9f）

### 2. 群组协作功能升级（`src/backend/src/routes/groups.js`、`src/frontend/src/pages/GroupDetail.jsx`）
- 群组协作流程增强（缑文轩，commit ada4bd2 延续 + 76f0203）
- GroupDetail 页面大规模重写，新增地图路线、AI 服务对接（PR #47 合并）
- `groupRepository.js` 大幅扩展，新增多项数据库操作
- `index.css` 新增 `.glass-input`、`.glass-btn`、`.glass-panel` 等组件样式类

### 3. 景点图片本地化（`src/frontend/public/images/spots/`、`src/backend/src/data/spots.js`）
- 景点图片本地化最终版：128张实景图下载入库，补全 BrandIcon 品牌回退逻辑（李佳坤，commit 68901a9）
- 新增 `scripts/` 目录：`add-image-urls.js`、`add-local-paths.js`、`download-spot-images.js`

### 4. Admin 后台更新（`src/frontend/src/pages/Admin.jsx`）
- Admin 页面后台更新（万子豪，commit 933cc86）

---

## 三、本周每位同学工作进展

### 1. 戴鸿（前端·Globe 动效）
- Globe 弹幕系统从初版到性能优化版，共7次提交迭代
- 城市定位精度修复（二次镜头跳动消除、相机旋转公式重写）
- 同步 main 两次，保持分支最新

### 2. 李佳坤（后端·数据与图片）
- 景点图片本地化最终版：128张实景图 + BrandIcon 回退 + 下载脚本工具化

### 3. 万子豪（前端·Admin 后台）
- Admin 后台更新（commit 933cc86）

### 4. 缑文轩（前端·社区与群组）
- 群组协作中枢大规模升级：GroupDetail 重写、后端群组路由扩展、新 CSS 组件类
- 负责 PR #47/#48/#49/#50 合并管理

---

## 四、当前存在的问题

1. **七周连续滞后：KMP 检索可见化** — 从第七周至今，KMP 算法在前端页面上始终不可见，这是答辩前最高优先级的遗留缺口。现有日记搜索未展示 KMP 高亮，路线搜索未展示 Trie 前缀联想，算法价值无法被评委感知。

2. **群组四项新功能仍未落地** — 退出群组（基础功能缺失）、目的地投票、共享景点、Dijkstra 群内路线规划均未实现，群组目前仅有基础群聊与行程框架。

3. **Globe 弹幕卡顿已修复，但城市定位仍有问题** — ctrl.target.y 方案已被正确的3D向量公式替代，但用户反映某些刁钻角度仍有旋转异常，需最终验证。

4. **对抗基础设施入库（连续七周滞后）** — `adversarial/`、`mcp/`、`bench.js` 从未进入主分支，review-agent 从未真实运行。

5. **答辩演示链路未梳理** — 距答辩只剩最后一到两周，Dijkstra/KMP/TopK/Trie 四个核心算法在页面中的演示路径尚未确认，风险较高。

---

## 五、下周计划

1. **【最高优先级】群组四项功能落地**：退出群组（后端接口 + 前端按钮）、目的地投票（发起/投票/结果展示）、共享景点到群、群内 Dijkstra 一键路线规划。
2. **答辩演示链路固化**：走通 Dijkstra（路线规划页）、KMP（日记/景点搜索高亮）、TopK（美食推荐）、Trie（搜索联想）四条算法演示路径，截图留存。
3. **Globe 最终稳定性验证**：多角度点击城市验证旋转正确性，确认弹幕无卡顿。
4. **系统整体功能回归测试**：走一遍注册→登录→景点浏览→路线规划→日记→群组的完整用户路径。
