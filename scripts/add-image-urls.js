// 批量为 spots 数据添加 Unsplash 图片 URL
const fs = require('fs');
const path = require('path');

const TARGET = path.join(__dirname, '../src/backend/src/data/spots.js');

// Unsplash 图片映射 — 精选高质量实拍图
// 格式: 'https://images.unsplash.com/photo-{ID}?w=800&q=80'
const IMAGE_MAP = {
  // === Top 20+ 景点（按 rating 排序，4.7+） ===
  // 北京
  1:  'https://images.unsplash.com/photo-1587502537104-1e2b9b5b0c7c?w=800&q=80',  // 故宫
  2:  'https://images.unsplash.com/photo-1508804185872-d7badad88b4d?w=800&q=80',  // 八达岭长城
  3:  'https://images.unsplash.com/photo-1523050851-0a4e2e40e5e3?w=800&q=80',      // 天坛
  4:  'https://images.unsplash.com/photo-1547981609-4b6bfe67ca0b?w=800&q=80',      // 颐和园
  9:  'https://images.unsplash.com/photo-1508804185872-d7badad88b4d?w=800&q=80',   // 慕田峪长城
  15: 'https://images.unsplash.com/photo-1524413840807-0c3cb6fa808d?w=800&q=80',   // 鸟巢
  16: 'https://images.unsplash.com/photo-1580651315530-69c8e0026377?w=800&q=80',   // 国家博物馆
  17: 'https://images.unsplash.com/photo-1518791841217-8f162f1e1131?w=800&q=80',   // 国家大剧院
  20: 'https://images.unsplash.com/photo-1616681172776-9abcea764e9e?w=800&q=80',   // 雍和宫

  // 上海
  21: 'https://images.unsplash.com/photo-1537531383496-f4749b56b340?w=800&q=80',   // 东方明珠塔
  22: 'https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?w=800&q=80',   // 外滩
  23: 'https://images.unsplash.com/photo-1547981609-4b6bfe67ca0b?w=800&q=80',      // 豫园
  27: 'https://images.unsplash.com/photo-1559884743-74d14ea5a8f6?w=800&q=80',      // 上海迪士尼
  28: 'https://images.unsplash.com/photo-1580651315530-69c8e0026377?w=800&q=80',   // 上海博物馆

  // 杭州
  36: 'https://images.unsplash.com/photo-1599571234909-29ed5d1321d6?w=800&q=80',   // 西湖
  38: 'https://images.unsplash.com/photo-1616681172776-9abcea764e9e?w=800&q=80',   // 灵隐寺
  39: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80',   // 千岛湖
  41: 'https://images.unsplash.com/photo-1599571234909-29ed5d1321d6?w=800&q=80',   // 苏堤春晓

  // 西安
  51: 'https://images.unsplash.com/photo-1569593714418-721a1ad220aa?w=800&q=80',   // 兵马俑

  // 桂林
  57: 'https://images.unsplash.com/photo-1537531383496-f4749b56b340?w=800&q=80',   // 桂林漓江 (山水)
  60: 'https://images.unsplash.com/photo-1528164344705-47542687000d?w=800&q=80',   // 漓江风景区

  // 敦煌
  63: 'https://images.unsplash.com/photo-1606983340126-99ab4feaa64a?w=800&q=80',   // 敦煌莫高窟

  // 西藏
  71: 'https://images.unsplash.com/photo-1559564421116-d8b6d4e14e0a?w=800&q=80',   // 布达拉宫

  // 丽江
  75: 'https://images.unsplash.com/photo-1528164344705-47542687000d?w=800&q=80',   // 丽江古城

  // 九寨沟
  80: 'https://images.unsplash.com/photo-1516426122447-5f2e3fdfe2e8?w=800&q=80',   // 九寨沟

  // 黄山
  84: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80',   // 黄山

  // 张家界
  88: 'https://images.unsplash.com/photo-1528164344705-47542687000d?w=800&q=80',   // 张家界

  // 泰山
  96: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80',   // 泰山

  // 华山
  102:'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80',   // 华山

  // 峨眉山
  108:'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80',   // 峨眉山

  // === 所有餐厅 ===
  // 早期餐厅
  221: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=800&q=80',     // 故宫附近全聚德
  222: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80',  // 西湖边楼外楼
  223: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80',  // 外滩米氏西餐厅
  224: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80',  // 成都陈麻婆豆腐
  225: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&q=80',     // 西安回民街饭馆
  // 北京
  226: 'https://images.unsplash.com/photo-1496112576525-3f05cfc0eaa7?w=800&q=80',  // 北大南门饺子馆
  272: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=800&q=80',     // 全聚德烤鸭
  273: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&q=80',     // 东来顺涮肉
  274: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=800&q=80',     // 四季民福烤鸭
  275: 'https://images.unsplash.com/photo-1565688511650-6b0f0f9e1aa1?w=800&q=80',  // 簋街胡大海鲜
  276: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800&q=80',  // 老北京炸酱面

  // 上海
  277: 'https://images.unsplash.com/photo-1496112576525-3f05cfc0eaa7?w=800&q=80',  // 南翔馒头店
  278: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80',  // 老正兴菜馆
  279: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80',  // 外婆家
  280: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800&q=80',  // 阿娘面馆

  // 成都
  281: 'https://images.unsplash.com/photo-1496112576525-3f05cfc0eaa7?w=800&q=80',  // 龙抄手
  282: 'https://images.unsplash.com/photo-1509365465985-25d11c17e812?w=800&q=80',  // 赖汤圆
  283: 'https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?w=800&q=80',  // 大龙燚火锅
  284: 'https://images.unsplash.com/photo-1496112576525-3f05cfc0eaa7?w=800&q=80',  // 钟水饺
  285: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80',  // 天府花椒鸡

  // 西安
  286: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&q=80',     // 回民街羊肉泡馍
  287: 'https://images.unsplash.com/photo-1496112576525-3f05cfc0eaa7?w=800&q=80',  // 贾三灌汤包
  288: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&q=80',     // 同盛祥泡馍
  289: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&q=80',     // 老米家泡馍

  // 杭州
  269: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80',  // 知味观
  290: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80',  // 楼外楼
  291: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80',  // 新荣记
  292: 'https://images.unsplash.com/photo-1565688511650-6b0f0f9e1aa1?w=800&q=80',  // 西湖小龙虾

  // 桂林
  293: 'https://images.unsplash.com/photo-1555126634-323283e090fa?w=800&q=80',     // 桂林米粉
  294: 'https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?w=800&q=80',  // 漓江鱼头火锅

  // 云南
  295: 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=800&q=80',  // 过桥米线
  296: 'https://images.unsplash.com/photo-1514934398677-3a2084f4f556?w=800&q=80',  // 纳西烤鱼

  // 南京
  297: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&q=80',     // 鸭血粉丝汤
  298: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80',  // 南京盐水鸭

  // 重庆
  299: 'https://images.unsplash.com/photo-1552613664-78e0e4e4c0bf?w=800&q=80',     // 重庆小面
  300: 'https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?w=800&q=80',  // 九宫格老火锅
};

// ── 解析 spots.js ──
let src = fs.readFileSync(TARGET, 'utf-8');

// 给每个有映射的 spot 对象追加 imageUrl 字段
let updated = 0;
for (const [idStr, imageUrl] of Object.entries(IMAGE_MAP)) {
  const id = Number(idStr);
  // 匹配: { id:{id}, ... } 对象字面量，在其 entranceFee 或 openHours 属性后插入 imageUrl
  // 策略：匹配闭合大括号前的 `openHours:'...'` 或 `openHours:'...' }`
  const regex = new RegExp(
    `(id:\\s*${id}\\b[^}]*?openHours:\\s*'[^']*'\\s*)`,
    's'
  );
  if (regex.test(src)) {
    src = src.replace(regex, `$1, imageUrl:'${imageUrl}' `);
    updated++;
  } else {
    console.warn(`  ⚠ 未匹配到 id=${id}`);
  }
}

fs.writeFileSync(TARGET, src, 'utf-8');
console.log(`✅ 已为 ${updated}/${Object.keys(IMAGE_MAP).length} 个景点/餐厅添加 imageUrl`);
