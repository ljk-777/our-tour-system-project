export const GLOBE_MARKERS = [
  {
    id: '1',
    title: '北京',
    subtitle: '中国首都',
    description: '千年古都，故宫、长城、天坛，历史与现代交织的政治文化中心。',
    lat: 39.9042, lng: 116.4074,
    type: 'destination',
    date: '2024-05-01',
  },
  {
    id: '2',
    title: '上海',
    subtitle: '东方明珠',
    description: '国际化大都市，外滩夜景与陆家嘴天际线，东西方文化交汇之地。',
    lat: 31.2304, lng: 121.4737,
    type: 'destination',
    date: '2024-04-15',
  },
  {
    id: '3',
    title: '成都',
    subtitle: '天府之国',
    description: '大熊猫的故乡，九寨沟与峨眉山的门户，火锅与慢生活的代名词。',
    lat: 30.5728, lng: 104.0668,
    type: 'memory',
    date: '2023-10-08',
  },
  {
    id: '4',
    title: '西安',
    subtitle: '古丝绸之路起点',
    description: '十三朝古都，兵马俑与大雁塔，丝绸之路的历史起点。',
    lat: 34.3416, lng: 108.9398,
    type: 'destination',
    date: '2023-08-20',
  },
  {
    id: '5',
    title: '桂林',
    subtitle: '山水甲天下',
    description: '漓江山水如诗如画，喀斯特地貌造就了世界上最美的自然风光之一。',
    lat: 25.2736, lng: 110.2907,
    type: 'destination',
    date: '2024-03-12',
  },
  {
    id: '6',
    title: '丽江',
    subtitle: '云南秘境',
    description: '纳西族古城，玉龙雪山倒映，古朴的木质建筑与石板街巷。',
    lat: 26.8721, lng: 100.2299,
    type: 'memory',
    date: '2023-07-05',
  },
];

export const GLOBE_ROUTES = [
  {
    id: 'r1',
    name: '京沪快线',
    color: '#38bdf8',
    points: [
      { lat: 39.9042, lng: 116.4074 },
      { lat: 31.2304, lng: 121.4737 },
    ],
  },
  {
    id: 'r2',
    name: '西南环线',
    color: '#a78bfa',
    points: [
      { lat: 30.5728, lng: 104.0668 },
      { lat: 26.8721, lng: 100.2299 },
      { lat: 25.2736, lng: 110.2907 },
    ],
  },
  {
    id: 'r3',
    name: '丝绸之路',
    color: '#fbbf24',
    points: [
      { lat: 34.3416, lng: 108.9398 },
      { lat: 39.9042, lng: 116.4074 },
    ],
  },
];
