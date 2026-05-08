# AMAP 接入实施方案

## 1. 目标

本方案用于补齐项目中“真实地图展示、真实地点搜索、真实路线规划、真实天气信息”这几块尚未完成的能力，并且保证不破坏现有课程设计的算法展示结构。

项目最终保留两套模式：

- 算法模式：继续使用本地 PostgreSQL 数据和自研 `Dijkstra / TopK / KMP / Trie`
- 地图模式：接入高德地图，提供真实地图、真实 POI、真实导航和真实地理信息

这样既能满足课程设计答辩，又能明显提升项目的完整度和可用性。

---

## 2. 可行性结论

结论：可行，而且适合当前项目。

原因：

- 后端已经有清晰的路由层和仓储层，方便新增 `amap` 模块
- 前端已经有独立页面，如 [RoutePlanner.jsx](D:/code/our-tour-system-project/src/frontend/src/pages/RoutePlanner.jsx)、[Spots.jsx](D:/code/our-tour-system-project/src/frontend/src/pages/Spots.jsx)、[SpotDetail.jsx](D:/code/our-tour-system-project/src/frontend/src/pages/SpotDetail.jsx)、[Diary.jsx](D:/code/our-tour-system-project/src/frontend/src/pages/Diary.jsx)
- 当前数据库已经搭好，适合加缓存表
- 项目现在缺的不是基础 CRUD，而是“真实地图服务能力”，高德正好补这一层

需要注意：

- 想让用户“看到真实地图”，不能只接 Web 服务 API
- 必须同时接入：
  - 高德 Web 服务 API：负责 POI、地理编码、路线结果、天气
  - 高德 JavaScript API 2.0：负责在前端页面真正显示地图

官方文档入口：

- [高德 Web 服务 API 概述](https://lbs.amap.com/api/webservice/summary)
- [高德 JavaScript API 2.0 概述](https://lbs.amap.com/api/javascript-api-v2/summary)

---

## 3. 当前项目现状

### 3.1 已有能力

- 后端已有景点、路线、日记、用户四类接口
- 运行时数据已切到 PostgreSQL
- 前端已有景点页、景点详情页、路线规划页、日记页
- 本地算法能力已经完整：
  - 路线：`Dijkstra / 多点路径`
  - 推荐：`TopK / MinHeap`
  - 搜索：`KMP / Trie / 倒排索引`

### 3.2 当前缺口

- 用户目前看不到真实地图底图
- 搜索结果主要来自本地种子数据
- 路线规划页只有课程算法模式，没有真实导航模式
- 景点详情页只有经纬度文本，没有地图可视化
- 日记发布时只能手填地点名，不能绑定真实 POI

---

## 4. 总体设计

### 4.1 双模式并存

建议保留两个入口：

- `算法模式`
  - 继续调用现有 `/api/routes/*`
  - 用于展示课程算法能力

- `高德地图模式`
  - 调用新增 `/api/amap/*`
  - 前端嵌入高德 JS 地图
  - 用于展示真实地图产品能力

### 4.2 前后端职责

前端：

- 显示高德地图
- 展示点位、路线、多边形、Marker
- 提供输入联想和地图交互

后端：

- 代理高德 Web 服务 API
- 隐藏 Key
- 统一参数格式
- 做缓存和错误处理

数据库：

- 缓存常用 POI、路线、天气结果
- 降低额度消耗
- 网络不好时作为兜底

---

## 5. 接口设计概述

后端新增统一前缀：

- `/api/amap/*`

建议新增文件：

- `src/backend/src/routes/amap.js`
- `src/backend/src/services/amapService.js`
- `src/backend/src/repositories/amapCacheRepository.js`

并在 [src/backend/src/index.js](D:/code/our-tour-system-project/src/backend/src/index.js) 中挂载：

```js
app.use('/api/amap', amapRouter);
```

---

## 6. 具体接口与实现功能

### 6.1 `GET /api/amap/geocode`

功能：

- 将地点名称或地址转换成经纬度
- 解决“用户输入地点但系统无法定位”的问题

请求参数：

- `address`：地点名称或详细地址，必填
- `city`：城市名，可选

返回数据建议：

```json
{
  "success": true,
  "data": {
    "name": "西湖",
    "location": {
      "lng": 120.1481,
      "lat": 30.2423
    },
    "province": "浙江省",
    "city": "杭州市",
    "district": "西湖区"
  }
}
```

实际用途：

- 路线规划页把“起点/终点文字”转成坐标
- 日记发布时把地点名绑定为标准坐标

### 6.2 `GET /api/amap/regeo`

功能：

- 将经纬度转换成真实地址
- 补充行政区、道路、附近地标

请求参数：

- `lng`
- `lat`

实际用途：

- 景点详情页显示真实地址
- 地图点击选点后显示地点描述

### 6.3 `GET /api/amap/poi/tips`

功能：

- 为搜索框提供输入联想

请求参数：

- `keywords`
- `city`

实际用途：

- 首页搜索框联想
- 景点搜索页联想
- 路线页起终点输入联想
- 日记发布地点联想

### 6.4 `GET /api/amap/poi/search`

功能：

- 查询真实 POI
- 可搜景点、餐饮、酒店、医院、商场、地铁站等

请求参数：

- `keywords`
- `city`
- `types`
- `page`
- `pageSize`

返回数据建议：

```json
{
  "success": true,
  "data": [
    {
      "id": "B0FF...",
      "name": "西湖风景名胜区",
      "address": "杭州市西湖区",
      "city": "杭州",
      "type": "风景名胜",
      "location": {
        "lng": 120.1481,
        "lat": 30.2423
      }
    }
  ]
}
```

实际用途：

- `Spots` 页补真实地点搜索
- `SpotDetail` 页补“周边美食/酒店/医院”
- 日记发布时选择真实地点

### 6.5 `GET /api/amap/route`

功能：

- 返回真实步行、驾车、骑行、公交路径规划结果

请求参数：

- `originLng`
- `originLat`
- `destLng`
- `destLat`
- `mode`

`mode` 建议值：

- `walking`
- `driving`
- `cycling`
- `transit`

返回数据建议：

```json
{
  "success": true,
  "data": {
    "mode": "walking",
    "distance": 3200,
    "duration": 2700,
    "polyline": [
      [120.1481, 30.2423],
      [120.1502, 30.2441]
    ],
    "steps": [
      {
        "instruction": "沿某路步行 300 米",
        "distance": 300,
        "duration": 240
      }
    ]
  }
}
```

实际用途：

- `RoutePlanner` 页增加“真实地图模式”
- `SpotDetail` 页增加“怎么去”

### 6.6 `GET /api/amap/weather`

功能：

- 查询城市实时天气或预报

请求参数：

- `city`

实际用途：

- `SpotDetail` 页显示天气
- 首页推荐区加“今日适合出行”

---

## 7. 前端页面改造方案

### 7.1 `RoutePlanner` 页

对应文件：

- [src/frontend/src/pages/RoutePlanner.jsx](D:/code/our-tour-system-project/src/frontend/src/pages/RoutePlanner.jsx)

当前状态：

- 已有单点最短路、多点最短路
- 已有起点终点搜索建议，但建议来自本地景点接口

改造目标：

- 增加模式切换：
  - `算法模式`
  - `高德地图模式`
- 新增地图容器，显示真实地图
- 在高德模式下支持：
  - 输入联想
  - 起终点打点
  - 真实路径绘制
  - 步行/驾车/骑行/公交切换

具体实现：

- 保留现有算法模式逻辑不动
- 新增高德模式状态：
  - `mapMode`
  - `travelMode`
  - `originPoi`
  - `destinationPoi`
- 在前端通过高德 JS API 绘制 `Marker` 和 `Polyline`
- 数据来源改为调用 `/api/amap/poi/tips`、`/api/amap/geocode`、`/api/amap/route`

实现价值：

- 这是最能体现“真实地图能力”的页面
- 建议作为第一优先级实现

### 7.2 `Spots` 页

对应文件：

- [src/frontend/src/pages/Spots.jsx](D:/code/our-tour-system-project/src/frontend/src/pages/Spots.jsx)

当前状态：

- 页面数据来自 `getSpots` 和 `searchSpots`
- 搜索只针对本地景点库

改造目标：

- 增加数据源切换：
  - `本地景点`
  - `高德实时`
- 在高德模式下搜索真实 POI
- 可选增加小地图预览

具体实现：

- 保留现有本地搜索和筛选
- 新增按钮组切换搜索来源
- 新增高德结果卡片数据结构适配
- 调用 `/api/amap/poi/search`

实现价值：

- 最容易快速出效果
- 适合作为第二优先级

### 7.3 `SpotDetail` 页

对应文件：

- [src/frontend/src/pages/SpotDetail.jsx](D:/code/our-tour-system-project/src/frontend/src/pages/SpotDetail.jsx)

当前状态：

- 已展示景点信息、周边本地节点、相关日记
- 已有经纬度文本，但没有真实地图

改造目标：

- 在“位置信息”区域增加真实地图
- 显示真实地址和行政区
- 增加天气信息
- 增加“周边美食/酒店/医院”真实 POI

具体实现：

- 页面加载时调用：
  - `/api/amap/regeo`
  - `/api/amap/weather`
  - `/api/amap/poi/search`
- 用高德 JS API 在详情页渲染小型地图
- 保留现有本地“周边场所”Tab，不覆盖算法结果
- 新增一块“真实地图服务”区域，区分本地算法结果和高德结果

实现价值：

- 能把数据库里的景点和真实地图结合起来
- 展示效果很强

### 7.4 `Diary` 页

对应文件：

- [src/frontend/src/pages/Diary.jsx](D:/code/our-tour-system-project/src/frontend/src/pages/Diary.jsx)

当前状态：

- 发布日记时可以手动输入 `spotName`
- 目前没有标准地点绑定

改造目标：

- 写日记时支持地点联想
- 用户从联想结果中选中真实 POI
- 保存标准地点名、地址、经纬度、POI ID

具体实现：

- 保留现有 `spotName` 字段输入框
- 增加联想下拉列表，调用 `/api/amap/poi/tips`
- 选中后在提交体中新增：
  - `amapPoiId`
  - `amapAddress`
  - `lng`
  - `lat`
- 后端日记表未来可加字段支持地理绑定

实现价值：

- 把日记从“纯文本记录”升级成“可定位的旅行记录”

---

## 8. 地图显示实现方案

### 8.1 为什么要接高德 JS API 2.0

因为 Web 服务 API 只能返回数据，不能直接把真实地图画到页面里。

想让用户看到：

- 地图底图
- 点位 Marker
- 实时路径线
- 地图缩放和平移

必须接入高德 JavaScript API 2.0。

### 8.2 建议新增前端组件

- `src/frontend/src/components/AmapMap.jsx`
- `src/frontend/src/components/AmapRouteMap.jsx`
- `src/frontend/src/hooks/useAmapLoader.js`

职责建议：

- `useAmapLoader.js`
  - 动态加载高德 JS SDK
  - 处理加载状态和报错

- `AmapMap.jsx`
  - 通用地图容器
  - 接收点位数组并绘制 Marker

- `AmapRouteMap.jsx`
  - 专用于路线页
  - 接收起终点和路径线并渲染

### 8.3 前端接入方式

建议用动态脚本加载，不要把脚本写死在 HTML。

优点：

- 只在需要地图的页面加载
- 便于统一管理 key 和插件列表
- 失败时能优雅降级

---

## 9. 后端具体实现方案

### 9.1 新增服务层

文件：

- `src/backend/src/services/amapService.js`

职责：

- 封装所有高德 HTTP 请求
- 统一把高德返回结果转换成前端需要的格式
- 隔离第三方字段变化

建议方法：

- `geocode(address, city)`
- `reverseGeocode(lng, lat)`
- `searchPoi(params)`
- `tips(params)`
- `route(params)`
- `weather(city)`

### 9.2 新增缓存仓储层

文件：

- `src/backend/src/repositories/amapCacheRepository.js`

职责：

- 查缓存
- 存缓存
- 处理过期时间

### 9.3 新增路由层

文件：

- `src/backend/src/routes/amap.js`

职责：

- 参数校验
- 调用 service
- 返回统一 JSON 格式

### 9.4 环境变量

建议在后端 `.env` 中新增：

```env
AMAP_WEB_API_KEY=your_web_service_key
AMAP_JS_API_KEY=your_javascript_api_key
```

注意：

- `AMAP_WEB_API_KEY` 给后端用
- `AMAP_JS_API_KEY` 给前端加载 JS SDK 用
- 不要把后端 Web 服务 key 直接写到前端业务代码中

---

## 10. 数据库缓存设计

建议新增三张缓存表。

### 10.1 `amap_poi_cache`

字段建议：

- `id`
- `keyword`
- `city`
- `types`
- `result_json`
- `updated_at`

用途：

- 缓存 POI 搜索和输入提示

### 10.2 `amap_route_cache`

字段建议：

- `id`
- `origin`
- `destination`
- `mode`
- `result_json`
- `updated_at`

用途：

- 缓存高频路线结果

### 10.3 `amap_weather_cache`

字段建议：

- `id`
- `city`
- `result_json`
- `updated_at`

用途：

- 缓存天气

### 10.4 过期策略

- `tips`：1 天
- `poi search`：3 到 7 天
- `route`：1 天
- `weather`：1 到 3 小时

---

## 11. 与现有 API 的关系

当前前端 API 文件是：

- [src/frontend/src/api/index.js](D:/code/our-tour-system-project/src/frontend/src/api/index.js)

建议新增这些方法：

```js
export const amapGeocode = (params) => api.get('/amap/geocode', { params });
export const amapReverseGeocode = (params) => api.get('/amap/regeo', { params });
export const amapPoiTips = (params) => api.get('/amap/poi/tips', { params });
export const amapPoiSearch = (params) => api.get('/amap/poi/search', { params });
export const amapRoute = (params) => api.get('/amap/route', { params });
export const amapWeather = (params) => api.get('/amap/weather', { params });
```

这样前端能继续沿用现有 API 风格，不会破坏已有调用方式。

---

## 12. 实施顺序

### 第一阶段：最小可用版本

目标：

- 快速做出“看得见的真实地图能力”

建议完成：

1. 接入高德 JS API 2.0
2. 新增通用地图组件
3. `SpotDetail` 页显示真实地图
4. `Spots` 页支持真实 POI 搜索

这是最稳的一阶段，因为：

- 页面变化明显
- 风险低
- 不需要先改太多数据库结构

### 第二阶段：路线增强

目标：

- 完成真实导航模式

建议完成：

1. `/api/amap/route`
2. `RoutePlanner` 页模式切换
3. 高德路径绘制
4. 步行/驾车/骑行/公交切换

### 第三阶段：内容增强

目标：

- 让地图能力和日记、详情页联动

建议完成：

1. 天气查询
2. 逆地理编码
3. 日记地点联想与绑定
4. 景点周边真实 POI

---

## 13. 风险与兜底

### 13.1 网络依赖

风险：

- 答辩或演示现场网络不好时，高德接口可能失败

兜底：

- 保留本地算法模式
- 页面上提示“真实地图服务暂不可用，已切换为本地模式”

### 13.2 配额限制

风险：

- 免费额度不够

兜底：

- 加数据库缓存
- 对联想接口做节流和防抖

### 13.3 Key 泄露

风险：

- 直接在前端硬编码 key

兜底：

- Web 服务 key 只放后端
- 前端地图 key 用环境变量加载

### 13.4 第三方字段不稳定

风险：

- 高德接口字段与本地数据结构不一致

兜底：

- 所有第三方结果先在 `amapService` 中做统一映射

---

## 14. 推荐任务拆分

可以按下面顺序推进：

1. 后端先补 `amap` 路由、service、缓存仓储
2. 前端先补 `useAmapLoader` 和通用地图组件
3. 先改 `SpotDetail`，最容易验证地图是否接通
4. 再改 `Spots` 页，补真实 POI 搜索
5. 最后改 `RoutePlanner`，完成真实导航模式
6. `Diary` 页放在最后做联动增强

---

## 15. 最终结论

这套方案是切实可行的，适合当前项目直接落地。

它的核心价值不是“用高德替换现有系统”，而是：

- 保留课程算法模式
- 增加真实地图模式
- 用较小改动补上项目最缺的“地图可视化和真实世界数据能力”

如果按优先级排序，建议先做：

1. `SpotDetail` 真实地图
2. `Spots` 真实 POI 搜索
3. `RoutePlanner` 真实导航模式
4. `Diary` 地点联想与绑定

这样投入最小，展示效果最好，也最符合当前项目结构。
