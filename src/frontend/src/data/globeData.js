export const GLOBE_MARKERS = [
  { id:'1', title:'北京',  subtitle:'中国首都',   description:'千年古都，故宫、长城、天坛，历史与现代交织。', lat:39.9042, lng:116.4074, type:'destination', date:'2024-05-01' },
  { id:'2', title:'上海',  subtitle:'东方明珠',   description:'国际化大都市，外滩夜景与陆家嘴天际线。',         lat:31.2304, lng:121.4737, type:'destination', date:'2024-04-15' },
  { id:'3', title:'成都',  subtitle:'天府之国',   description:'大熊猫的故乡，九寨沟与峨眉山的门户。',           lat:30.5728, lng:104.0668, type:'memory',      date:'2023-10-08' },
  { id:'4', title:'西安',  subtitle:'丝绸之路起点', description:'十三朝古都，兵马俑与大雁塔。',                  lat:34.3416, lng:108.9398, type:'destination', date:'2023-08-20' },
  { id:'5', title:'桂林',  subtitle:'山水甲天下', description:'漓江山水如诗如画，喀斯特地貌。',                 lat:25.2736, lng:110.2907, type:'destination', date:'2024-03-12' },
  { id:'6', title:'丽江',  subtitle:'云南秘境',   description:'纳西族古城，玉龙雪山倒映。',                     lat:26.8721, lng:100.2299, type:'memory',      date:'2023-07-05' },
];

export const GLOBE_ROUTES = [
  { id:'r1', name:'京沪快线',   color:'#fb923c', points:[{lat:39.9042,lng:116.4074},{lat:31.2304,lng:121.4737}] },
  { id:'r2', name:'西南环线',   color:'#a78bfa', points:[{lat:30.5728,lng:104.0668},{lat:26.8721,lng:100.2299},{lat:25.2736,lng:110.2907}] },
  { id:'r3', name:'丝绸之路',   color:'#fbbf24', points:[{lat:34.3416,lng:108.9398},{lat:39.9042,lng:116.4074}] },
];

/* ── Top5 旅行者（基于日记数据统计）──────────────────── */
export const TOP_TRAVELERS = [
  {
    id: 1, name: '摄影师刘四', avatar: '📸', color: '#f97316',
    score: 5, badge: '探索之王',
    spots: [
      { name:'西湖',     lat:30.2442, lng:120.1478 },
      { name:'九寨沟',   lat:33.2600, lng:103.9200 },
      { name:'黄山',     lat:30.1400, lng:118.1600 },
      { name:'茶卡盐湖', lat:36.7910, lng:99.0960  },
    ],
  },
  {
    id: 2, name: '穷游周八', avatar: '💰', color: '#6366f1',
    score: 4, badge: '穷游达人',
    spots: [
      { name:'丽江古城', lat:26.8721, lng:100.2299 },
      { name:'大理古城', lat:25.6068, lng:100.2700 },
      { name:'香格里拉', lat:27.8293, lng:99.7068  },
      { name:'西湖',     lat:30.2442, lng:120.1478 },
    ],
  },
  {
    id: 3, name: '美食旅行家张三', avatar: '🍜', color: '#10b981',
    score: 4, badge: '美食侦探',
    spots: [
      { name:'宽窄巷子', lat:30.6668, lng:104.0554 },
      { name:'回民街',   lat:34.2621, lng:108.9395 },
      { name:'南京夫子庙', lat:32.0226, lng:118.7947 },
      { name:'外滩',     lat:31.2339, lng:121.4857 },
    ],
  },
  {
    id: 4, name: '探险家小李', avatar: '🧭', color: '#f59e0b',
    score: 3, badge: '勇敢先锋',
    spots: [
      { name:'故宫',     lat:39.9163, lng:116.3972 },
      { name:'天涯海角', lat:18.2285, lng:109.2168 },
      { name:'布达拉宫', lat:29.6588, lng:91.1172  },
    ],
  },
  {
    id: 5, name: '徒步达人陈五', avatar: '🏔️', color: '#ec4899',
    score: 3, badge: '山野行者',
    spots: [
      { name:'张家界', lat:29.1170, lng:110.4790 },
      { name:'黄山',   lat:30.1400, lng:118.1600 },
      { name:'九寨沟', lat:33.2600, lng:103.9200 },
    ],
  },
];

/* ── 城市坐标表（AI 规划用）──────────────────────────── */
export const CITY_COORDS = {
  '北京':   { lat:39.9042, lng:116.4074 },
  '上海':   { lat:31.2304, lng:121.4737 },
  '成都':   { lat:30.5728, lng:104.0668 },
  '西安':   { lat:34.3416, lng:108.9398 },
  '桂林':   { lat:25.2736, lng:110.2907 },
  '丽江':   { lat:26.8721, lng:100.2299 },
  '杭州':   { lat:30.2588, lng:120.1554 },
  '重庆':   { lat:29.5630, lng:106.5516 },
  '昆明':   { lat:25.0389, lng:102.7183 },
  '拉萨':   { lat:29.6595, lng:91.1322  },
  '哈尔滨': { lat:45.8038, lng:126.5350 },
  '南京':   { lat:32.0603, lng:118.7969 },
  '黄山':   { lat:30.1400, lng:118.1600 },
  '三亚':   { lat:18.2528, lng:109.5119 },
  '西宁':   { lat:36.6171, lng:101.7782 },
  '乌鲁木齐': { lat:43.8256, lng:87.6168 },
};
