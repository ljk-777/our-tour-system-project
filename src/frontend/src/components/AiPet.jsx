import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const DS_KEY    = 'sk-513c1deb71594e8ca886d853eb4d2262';
const BSIZ      = 74;   // bubble diameter px
const IDLE_MS   = 8000; // 8s 无操作后逃跑
const PS_IN     = 4;    // pixel size inside bubble → frog 56×64
const PS_OUT    = 5;    // pixel size when escaped → frog 70×80

// ── Colour palette (index 0 = transparent) ─────────────────────
// 14 cols × 16 rows frog  — eyes sit ON TOP of head
const PAL = [
  null,        // 0  transparent
  '#0a3d1a',   // 1  darkest outline
  '#14532d',   // 2  dark outline
  '#15803d',   // 3  mouth-interior shadow
  '#16a34a',   // 4  main body
  '#22c55e',   // 5  unused (reserved)
  '#4ade80',   // 6  eye-socket bright green
  '#bbf7d0',   // 7  belly edge
  '#f0fdf4',   // 8  belly centre (near-white)
  '#ffffff',   // 9  eye white
  '#0f172a',   // 10 pupil
  '#fda4af',   // 11 cheek pink
];

const $ = (r) => r; // identity for readability in frame data

// 14-wide × 16-tall pixel frames
const FRAMES = {
  idle: $([
    [0,0,0,1, 6, 6,1,1, 6, 6,1,0,0,0],  //  0  eye bumps (bright green)
    [0,0,1, 6, 9, 9,6,6, 9, 9,6,1,0,0],  //  1  eye whites
    [0,0,1, 4, 9,10,9,9,10, 9,4,1,0,0],  //  2  pupils
    [0,0,1, 4, 4, 4,4,4, 4, 4,4,1,0,0],  //  3  top of face
    [0,1, 4, 4, 4, 4,4,4, 4, 4,4,4,1,0], //  4  face widens
    [0,1, 4,11, 4, 4,4,4, 4, 4,11,4,1,0],//  5  cheeks (pink)
    [0,1, 4, 4, 1, 4,4,4, 4, 1,4,4,1,0], //  6  wide frog smile
    [0,0,1, 4, 4, 4,4,4, 4, 4,4,1,0,0],  //  7  below mouth
    [0,0,1, 4, 7, 7,7,7, 7, 7,4,1,0,0],  //  8  belly edge
    [0,0,1, 4, 8, 8,8,8, 8, 8,4,1,0,0],  //  9  belly centre
    [0,0,1, 4, 8, 8,8,8, 8, 8,4,1,0,0],  // 10  belly
    [0,0,1, 4, 4, 4,4,4, 4, 4,4,1,0,0],  // 11  lower body
    [1,1,1, 4, 4, 4,4,4, 4, 4,4,1,1,1],  // 12  arms out
    [1,4,4, 1, 4, 4,4,4, 4, 4,1,4,4,1],  // 13  hand detail
    [0,0,1, 4, 4, 0,0,0, 0, 4,4,1,0,0],  // 14  upper legs
    [0,1, 4, 4, 0, 0,0,0, 0, 0,4,4,1,0], // 15  feet spread
  ]),

  sleep: $([
    [0,0,0,0, 0, 0,0,0, 0, 0,0,0,0,0],   //  0  no bumps — sleeping
    [0,0,0,1, 4, 4,4,4, 4, 4,1,0,0,0],   //  1  smooth head top
    [0,0,1, 4, 4, 4,4,4, 4, 4,4,1,0,0],  //  2
    [0,0,1, 4, 1, 1,4,4, 1, 1,4,1,0,0],  //  3  CLOSED eyes (dark bars)
    [0,1, 4, 4, 4, 4,4,4, 4, 4,4,4,1,0], //  4
    [0,1, 4,11, 4, 4,4,4, 4, 4,11,4,1,0],//  5  cheeks
    [0,1, 4, 4, 1, 4,4,4, 4, 1,4,4,1,0], //  6  sleepy smile
    [0,0,1, 4, 4, 4,4,4, 4, 4,4,1,0,0],  //  7
    [0,0,1, 4, 7, 7,7,7, 7, 7,4,1,0,0],  //  8
    [0,0,1, 4, 8, 8,8,8, 8, 8,4,1,0,0],  //  9
    [0,0,1, 4, 8, 8,8,8, 8, 8,4,1,0,0],  // 10
    [0,0,1, 4, 4, 4,4,4, 4, 4,4,1,0,0],  // 11
    [0,0,1, 4, 4, 4,4,4, 4, 4,4,1,0,0],  // 12  arms tucked in
    [0,0,1, 4, 4, 4,4,4, 4, 4,4,1,0,0],  // 13
    [0,0,1, 4, 4, 0,0,0, 0, 4,4,1,0,0],  // 14
    [0,1, 4, 4, 0, 0,0,0, 0, 0,4,4,1,0], // 15
  ]),

  lotus: $([
    [0,0,0,1, 6, 6,1,1, 6, 6,1,0,0,0],   //  0
    [0,0,1, 6, 9, 9,6,6, 9, 9,6,1,0,0],  //  1
    [0,0,1, 4, 9,10,9,9,10, 9,4,1,0,0],  //  2
    [0,0,1, 4, 4, 4,4,4, 4, 4,4,1,0,0],  //  3
    [0,1, 4, 4, 4, 4,4,4, 4, 4,4,4,1,0], //  4
    [0,1, 4,11, 4, 4,4,4, 4, 4,11,4,1,0],//  5
    [0,1, 4, 4, 1, 4,4,4, 4, 1,4,4,1,0], //  6
    [0,0,1, 4, 4, 4,4,4, 4, 4,4,1,0,0],  //  7
    [0,0,1, 4, 7, 7,7,7, 7, 7,4,1,0,0],  //  8
    [0,0,1, 4, 8, 8,8,8, 8, 8,4,1,0,0],  //  9
    [0,0,1, 4, 8, 8,8,8, 8, 8,4,1,0,0],  // 10
    [0,0,1, 4, 4, 4,4,4, 4, 4,4,1,0,0],  // 11
    [1,0,0, 1, 4, 4,4,4, 4, 4,1,0,0,1],  // 12  arms RAISED
    [0,1,0, 0, 1, 4,4,4, 4, 1,0,0,1,0],  // 13
    [0,0,1, 4, 4, 0,0,0, 0, 4,4,1,0,0],  // 14
    [0,1, 4, 4, 0, 0,0,0, 0, 0,4,4,1,0], // 15
  ]),

  jump: $([
    [0,0,0,1, 6, 6,1,1, 6, 6,1,0,0,0],   //  0
    [0,0,1, 6, 9, 9,6,6, 9, 9,6,1,0,0],  //  1
    [0,0,1, 4,10, 9,9,9, 9,10,4,1,0,0],  //  2  pupils at OUTER edge → startled
    [0,0,1, 4, 4, 4,4,4, 4, 4,4,1,0,0],  //  3
    [0,1, 4, 4, 4, 4,4,4, 4, 4,4,4,1,0], //  4
    [0,1, 4,11, 4, 4,4,4, 4, 4,11,4,1,0],//  5
    [0,1, 4, 4, 1, 1,4,4, 1, 1,4,4,1,0], //  6  OPEN mouth (wide)
    [0,0,1, 4, 4, 3,3,3, 3, 4,4,1,0,0],  //  7  mouth interior shadow
    [0,0,1, 4, 7, 7,7,7, 7, 7,4,1,0,0],  //  8
    [0,0,1, 4, 8, 8,8,8, 8, 8,4,1,0,0],  //  9
    [0,0,1, 4, 8, 8,8,8, 8, 8,4,1,0,0],  // 10
    [0,0,1, 4, 4, 4,4,4, 4, 4,4,1,0,0],  // 11
    [1,0,1, 4, 4, 4,4,4, 4, 4,4,1,0,1],  // 12  legs spread WIDE (jumping)
    [0,1,0, 0, 1, 4,4,4, 4, 1,0,0,1,0],  // 13
    [1,0,0, 0, 0, 1,4,4, 1, 0,0,0,0,1],  // 14
    [0,0,0, 0, 0, 0,1,1, 0, 0,0,0,0,0],  // 15
  ]),

  talk: $([
    [0,0,0,1, 6, 6,1,1, 6, 6,1,0,0,0],   //  0
    [0,0,1, 6, 9, 9,6,6, 9, 9,6,1,0,0],  //  1
    [0,0,1, 4, 9,10,9,9,10, 9,4,1,0,0],  //  2
    [0,0,1, 4, 4, 4,4,4, 4, 4,4,1,0,0],  //  3
    [0,1, 4, 4, 4, 4,4,4, 4, 4,4,4,1,0], //  4
    [0,1, 4,11, 4, 4,4,4, 4, 4,11,4,1,0],//  5
    [0,1, 4, 4, 1, 2,2,2, 2, 1,4,4,1,0], //  6  talking mouth (slightly open)
    [0,0,1, 4, 4, 4,4,4, 4, 4,4,1,0,0],  //  7
    [0,0,1, 4, 7, 7,7,7, 7, 7,4,1,0,0],  //  8
    [0,0,1, 4, 8, 8,8,8, 8, 8,4,1,0,0],  //  9
    [0,0,1, 4, 8, 8,8,8, 8, 8,4,1,0,0],  // 10
    [0,0,1, 4, 4, 4,4,4, 4, 4,4,1,0,0],  // 11
    [1,1,1, 4, 4, 4,4,4, 4, 4,4,1,1,1],  // 12
    [1,4,4, 1, 4, 4,4,4, 4, 4,1,4,4,1],  // 13
    [0,0,1, 4, 4, 0,0,0, 0, 4,4,1,0,0],  // 14
    [0,1, 4, 4, 0, 0,0,0, 0, 0,4,4,1,0], // 15
  ]),
};

// ── Pixel Frog SVG ───────────────────────────────────────────────
function PixelFrog({ pose = 'idle', ps = PS_OUT, flip = false }) {
  const frame = FRAMES[pose] || FRAMES.idle;
  const cols = frame[0].length;
  const rows = frame.length;
  return (
    <svg
      width={cols * ps} height={rows * ps}
      style={{ imageRendering: 'pixelated', display: 'block', flexShrink: 0,
               transform: flip ? 'scaleX(-1)' : 'none' }}
    >
      {frame.flatMap((row, y) =>
        row.map((v, x) => {
          const fill = PAL[v];
          if (!fill) return null;
          return <rect key={`${x}-${y}`} x={x * ps} y={y * ps} width={ps} height={ps} fill={fill} />;
        })
      )}
    </svg>
  );
}

// ── Lotus leaf  (16 cols × 7 rows, ps=4 = 64×28 px) ─────────────
function LotusLeaf() {
  const lps = 4;
  const leaf = [
    [0,0,0,0,1,2,2,2,2,2,2,2,1,0,0,0],
    [0,0,0,1,2,2,3,3,3,3,2,2,2,1,0,0],
    [0,0,1,2,2,3,4,4,4,3,3,2,2,2,1,0],
    [0,1,2,2,3,4,4,4,4,4,3,3,2,2,1,0],
    [0,0,1,2,2,3,4,4,4,3,3,2,2,1,0,0],
    [0,0,0,1,2,2,3,3,3,3,2,2,1,0,0,0],
    [0,0,0,0,0,0,1,5,5,1,0,0,0,0,0,0],
  ];
  const lp = { 0:null,1:'#166534',2:'#22c55e',3:'#4ade80',4:'#86efac',5:'#92400e' };
  return (
    <svg width={16*lps} height={7*lps} style={{ imageRendering:'pixelated', display:'block' }}>
      {leaf.flatMap((row,y)=>row.map((v,x)=>{
        const fill=lp[v]; if(!fill)return null;
        return <rect key={`${x}-${y}`} x={x*lps} y={y*lps} width={lps} height={lps} fill={fill}/>;
      }))}
    </svg>
  );
}

// ── Site FAQ — 每条 3 个性格变体，随机抽取 ───────────────────────
const KB = [
  { kw:['景点','发现','找景点','景区','spots','搜景点'],
    ans:[
      '「发现景点」就是我的藏宝图 🗺️ 用 Trie 前缀树算法，打几个字就能找到，还有城市/类型筛选，去挖宝吧！',
      '蛙！找景点去「发现景点」页面～ 搜索贼快（Trie 算法），筛城市、筛类型都行，宝藏景点等你 🔍',
      '想找景点？在「发现景点」输入名字就行，算法比导游还快 ⚡ 还能按城市和景区类型过滤！',
    ], link:'/spots', lt:'去发现景点' },
  { kw:['日记','旅行日记','写日记','游记','攻略'],
    ans:[
      '旅行不记录等于白去！「旅行日记」有 AI 帮你写草稿，KMP 算法全文搜索，还能点赞被别人发现 ✍️',
      '蛙！快把旅行记录下来～ 「旅行日记」AI 生成草稿超方便，搜以前的日记也很快，还有点赞评论！📖',
      '「旅行日记」是你的旅行博客！AI 帮写草稿、关键词全文搜索（KMP 算法），留下每段旅途的足迹 🌿',
    ], link:'/diary', lt:'去写日记' },
  { kw:['美食','吃','餐厅','推荐美食','食物'],
    ans:[
      '蛙！吃货出动！「美食推荐」用 TopK 堆算法精选评分最高的餐厅，按城市筛一筛，准没错 🍜',
      '「美食推荐」帮你找当地最值得去的餐厅～ TopK 堆算法保证推出来的都是高分精选 🍽️',
      '饿了？「美食推荐」按城市筛高分餐厅，算法帮你从几百家里挑出最值得吃的 🍜 快去！',
    ], link:'/foods', lt:'去看美食' },
  { kw:['路线','导航','规划','dijkstra','最短路','怎么走','路径'],
    ans:[
      '「路线规划」用 Dijkstra 最短路算法，帮你在多个景点间找最优路径，还能一键导航 🧭 效率超高！',
      '蛙！这就是数据结构的魔法～ 「路线规划」Dijkstra 算法算最短路，多景点也能规划，高德地图直接导 🗺️',
      '想高效刷景点？「路线规划」帮你算最短路径，连换乘方式都能选，省时省力 🚀',
    ], link:'/route', lt:'去规划路线' },
  { kw:['地球','3d','星球','globe','旅行者','足迹地图','ai路线'],
    ans:[
      '蛙！3D 星球是我最爱的页面 🌍 可以看旅行者足迹、AI 飞机航线，搜城市名地球会自动转过去！',
      '「3D 星球」超酷的！输入城市名地球会平滑旋转过去，还能看其他旅行者走过的路线 ✈️',
      '旋转吧地球！「3D 星球」可以搜景点让地球转到对应位置，还有 AI 规划的飞行路线动画 🌏',
    ], link:'/globe', lt:'去看3D星球' },
  { kw:['收藏','我的收藏','喜欢景点'],
    ans:[
      '在景点详情页右上角点 🤍 就能收藏，「个人主页→我的收藏」随时查看，下次出行直接翻 ❤️',
      '蛙！喜欢的景点要收藏起来！详情页右上角心形按钮点一下，个人主页有专属收藏夹 📌',
      '看到好景点赶紧收藏！点右上角 🤍，之后在个人主页的「我的收藏」就能找回来 ✅',
    ], link:'/profile', lt:'去个人主页' },
  { kw:['足迹','旅行足迹','去过','城市统计','省份'],
    ans:[
      '「个人主页→旅行足迹」会自动算出你探索过的城市和省份，来自你写的旅行日记 🏙️ 越写越多！',
      '蛙！你的足迹都被记录下来了～ 个人主页的「旅行足迹」tab，城市/省份数量一目了然 🗺️',
      '每写一篇日记就多一条足迹记录！「旅行足迹」页面会帮你统计去过几座城、几个省 🌏',
    ], link:'/profile', lt:'看旅行足迹' },
  { kw:['广场','社区','分享','动态','plaza'],
    ans:[
      '「旅行广场」是旅行者们的聚集地 🏖️ 可以看精选攻略和动态，也许能发现下个目的地的灵感！',
      '蛙！去旅行广场逛逛吧～ 有很多人分享旅行故事，说不定就看到你想去的地方了 🌊',
      '「旅行广场」社区分享区，浏览其他旅行者的精选内容，找找旅行灵感 ✨',
    ], link:'/plaza', lt:'去旅行广场' },
  { kw:['登录','注册','账号','密码'],
    ans:[
      '右上角点「登录」，输用户名就行～ 登录后我能认识你、帮你记录旅行、给你个性化推荐 🔑',
      '蛙！登录才能解锁全部功能哦～ 点右上角「登录」，也可以先用访客身份逛一逛 👀',
      '登录超简单！右上角输用户名就搞定，不想登录的话访客模式也能浏览大部分内容 🌐',
    ], link:'/auth', lt:'去登录' },
  { kw:['个人','主页','资料','profile','编辑'],
    ans:[
      '右上角头像点进去就是个人主页 👤 能改昵称/城市/签名，还有成就系统和旅行足迹！',
      '蛙！个人主页藏了好多东西～ 你的旅行足迹、收藏景点、成就徽章都在那里 🏆',
      '「个人主页」是你的旅行档案馆，编辑资料、看足迹地图、解锁成就，一站搞定 ✨',
    ], link:'/profile', lt:'去个人主页' },
  { kw:['成就','勋章','徽章'],
    ans:[
      '成就系统在「个人主页→数据概览」🏆 探访景点、写日记、在站天数都能解锁不同成就，快去挑战！',
      '蛙！你知道写够 5 篇日记能解锁"日记达人"成就吗 ✍️ 个人主页数据概览里有所有成就！',
      '成就是对旅行者的认可～ 个人主页里查看你已解锁和未解锁的成就，全部拿下才是真探险家 🌟',
    ], link:'/profile', lt:'看我的成就' },
  { kw:['算法','kmp','trie','堆','topk','数据结构'],
    ans:[
      '迹刻用了四种自研算法：路线→Dijkstra、推荐→TopK堆、日记搜索→KMP、景点前缀→Trie，都是硬核实现 💻',
      '蛙！这网站藏着不少干货～ Dijkstra 算最短路、TopK 堆选美食、KMP 搜日记、Trie 前缀补全，全自研 ⚙️',
      '算法控看过来！四大核心算法都在后端：Trie 前缀搜索 / KMP 全文检索 / MinHeap-TopK / Dijkstra 多点路径 🔬',
    ], link:null, lt:null },
  { kw:['功能','能做什么','有什么','介绍','帮助'],
    ans:[
      '蛙！迹刻能做的可多了：搜景点、写日记、规划路线、推荐美食、看 3D 地球，还有旅行社区 🌍 问我就行！',
      '我来导游！迹刻六大功能：🗺️发现景点 / 🍜美食推荐 / 🧭路线规划 / ✍️旅行日记 / 🌍3D星球 / 🏖️旅行广场',
      '你来对地方了！迹刻是一站式旅游平台，从找景点到规划路线到写日记全包了，遇到问题问我 🐸',
    ], link:null, lt:null },
];

// 随机抽取一个变体
const matchKB = (t) => {
  const hit = KB.find(r => r.kw.some(k => t.toLowerCase().includes(k)));
  if (!hit) return null;
  const variants = Array.isArray(hit.ans) ? hit.ans : [hit.ans];
  return { ...hit, ans: variants[Math.floor(Math.random() * variants.length)] };
};

// ── iOS 26 Liquid Glass CSS helper ───────────────────────────────
const glassStyle = (extra = {}) => ({
  background: [
    'radial-gradient(ellipse 54% 36% at 28% 22%, rgba(255,255,255,.72) 0%, transparent 100%)',
    'radial-gradient(circle 22% at 40% 13%, rgba(255,255,255,.9) 0%, transparent 100%)',
    'radial-gradient(ellipse 68% 48% at 52% 88%, rgba(120,220,160,.16) 0%, transparent 100%)',
    'rgba(255,255,255,.05)',
  ].join(','),
  backdropFilter: 'blur(26px) saturate(2.4) brightness(1.07)',
  WebkitBackdropFilter: 'blur(26px) saturate(2.4) brightness(1.07)',
  boxShadow: [
    '0 8px 28px rgba(0,0,0,.13)',
    '0 2px 8px rgba(0,0,0,.07)',
    '0 0 0 1px rgba(255,255,255,.68)',
    'inset 0 1.5px 0 rgba(255,255,255,.96)',
    'inset 1.5px 0 0 rgba(255,255,255,.5)',
    'inset 0 -1px 0 rgba(255,255,255,.28)',
    'inset 0 0 22px rgba(255,255,255,.1)',
  ].join(','),
  ...extra,
});

// ── Personalised system prompt ────────────────────────────────────
const buildSysPrompt = (user) => {
  let p = '你是"迹刻旅游网"的旅行蛙🐸，性格活泼热情，对旅行充满激情。'
    + '说话简洁生动，1-3句话，善用旅行比喻，偶尔说"蛙！"表示惊喜或兴奋。'
    + '熟悉迹刻所有功能。不确定时如实说。';
  if (user) {
    const name   = user.nickname || user.username || '探险家';
    const city   = user.city   || '神秘之地';
    const level  = user.level  || '旅行新手';
    const diaries = user.totalDiaries || 0;
    const spots   = user.totalSpots   || 0;
    p += `\n\n当前用户：${name}（等级：${level}，来自${city}，已写${diaries}篇日记、探访${spots}处景点）。`
      + `请根据用户的旅行经历给个性化回答，称呼对方为"${name}"或"探险家"，`
      + `${diaries === 0 ? '鼓励他写第一篇日记' : diaries < 5 ? '称赞他已开始记录旅行' : '称赞他是资深旅行达人'}。`
      + `${spots > 20 ? '他是经验丰富的旅行者，可以推荐更小众的景点。' : ''}`;
  } else {
    p += '\n称呼用户为"旅行者"或"探险家"，鼓励登录以解锁更多个性化功能。';
  }
  return p;
};

const STORAGE_KEY = 'aipet_chat_msgs';
const INIT_MSG = { role:'assistant',
  content:'嗨！我是迹刻旅行蛙 🐸  问旅游问题、网站功能或者上传旅行照片，都可以！' };

// ── Main component ────────────────────────────────────────────────
export default function AiPet() {
  const navigate = useNavigate();
  const { user }  = useAuth();

  const [petState, setPetState] = useState('bubble'); // 'bubble'|'escaped'|'chatting'
  const [pose,     setPose]     = useState('idle');
  const [flip,     setFlip]     = useState(false);
  const [showZzz,  setShowZzz]  = useState(false);
  const [showLeaf, setShowLeaf] = useState(false);

  const [bPos, setBPos] = useState(() => ({
    x: Math.max(10, window.innerWidth  - 94),
    y: Math.max(10, window.innerHeight - 94),
  }));
  const [pPos, setPPos] = useState({ x: 0, y: 0 });

  // Load from localStorage (persist across refreshes)
  const [msgs,  setMsgs]  = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [INIT_MSG];
  });
  const [input, setInput] = useState('');
  const [busy,  setBusy]  = useState(false);
  const endRef    = useRef(null);
  const imgRef    = useRef(null);

  const petStateRef = useRef('bubble');
  const isDrag      = useRef(false);
  const hasDragged  = useRef(false);
  const dragOff     = useRef({ x:0, y:0 });
  const idleTimer   = useRef(null);
  const wanderTimer = useRef(null);
  const poseTimer   = useRef(null);
  const curXY       = useRef({ x:0, y:0 });
  const tgtXY       = useRef({ x:0, y:0 });
  const bPosRef     = useRef(bPos);

  useEffect(() => { petStateRef.current = petState; }, [petState]);
  useEffect(() => { bPosRef.current = bPos; }, [bPos]);

  // ── helpers ────────────────────────────────────────────────────
  const safeX = v => Math.max(30, Math.min(window.innerWidth  - 90, v));
  const safeY = v => Math.max(60, Math.min(window.innerHeight - 100, v));

  // Truly random point on screen (not just nearby bubble)
  const randomScreenPos = () => ({
    x: safeX(Math.random() * (window.innerWidth  - 140) + 30),
    y: safeY(Math.random() * (window.innerHeight - 160) + 60),
  });

  const openChat = useCallback(() => {
    clearTimeout(idleTimer.current);
    setPetState('chatting');
    setPose('talk');
    setShowZzz(false);
    setShowLeaf(false);
  }, []);

  const returnToBubble = useCallback(() => {
    clearInterval(wanderTimer.current);
    clearTimeout(poseTimer.current);
    clearTimeout(idleTimer.current);
    setPetState('bubble');
    setPose('idle');
    setShowZzz(false);
    setShowLeaf(false);
  }, []);

  // ── Idle timer ────────────────────────────────────────────────
  const kickIdle = useCallback(() => {
    clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      if (petStateRef.current !== 'bubble') return;
      // Escape to truly random screen position
      const dest = randomScreenPos();
      curXY.current = { x: bPosRef.current.x - 20, y: bPosRef.current.y - 70 };
      tgtXY.current = dest;
      setPPos({ ...curXY.current });
      setPetState('escaped');
      setPose('idle');
      setShowZzz(false);
      setShowLeaf(false);
    }, IDLE_MS);
  }, []); // eslint-disable-line

  useEffect(() => {
    if (petState !== 'bubble') return;
    kickIdle();
    const reset = () => kickIdle();
    const evts = ['mousemove','click','keydown','touchstart'];
    evts.forEach(e => window.addEventListener(e, reset, { passive:true }));
    return () => {
      clearTimeout(idleTimer.current);
      evts.forEach(e => window.removeEventListener(e, reset));
    };
  }, [petState, kickIdle]);

  // ── Wandering + pose cycle ────────────────────────────────────
  useEffect(() => {
    if (petState !== 'escaped') {
      clearInterval(wanderTimer.current);
      clearTimeout(poseTimer.current);
      return;
    }

    // Continuous wandering — pick new random targets periodically
    wanderTimer.current = setInterval(() => {
      const dx = tgtXY.current.x - curXY.current.x;
      const dy = tgtXY.current.y - curXY.current.y;
      curXY.current = { x: curXY.current.x + dx * 0.022, y: curXY.current.y + dy * 0.022 };
      setFlip(dx < 0);
      setPPos({ x: Math.round(curXY.current.x), y: Math.round(curXY.current.y) });
      if (Math.hypot(dx, dy) < 5) tgtXY.current = randomScreenPos();
    }, 50);

    // Pose cycle
    const CYCLE = [
      { p:'idle',  zzz:false, leaf:false, ms:3000 },
      { p:'sleep', zzz:true,  leaf:false, ms:5500 },
      { p:'idle',  zzz:false, leaf:false, ms:2000 },
      { p:'lotus', zzz:false, leaf:true,  ms:5500 },
    ];
    let idx = 0;
    const next = () => {
      const { p, zzz, leaf, ms } = CYCLE[idx % CYCLE.length];
      setPose(p); setShowZzz(zzz); setShowLeaf(leaf); idx++;
      poseTimer.current = setTimeout(next, ms);
    };
    poseTimer.current = setTimeout(next, 2500);

    return () => { clearInterval(wanderTimer.current); clearTimeout(poseTimer.current); };
  }, [petState]); // eslint-disable-line

  // Persist chat to localStorage (trim to last 40 messages to avoid bloat)
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(msgs.slice(-40))); } catch {}
    endRef.current?.scrollIntoView({ behavior:'smooth' });
  }, [msgs]);

  // ── Bubble drag + tap ────────────────────────────────────────
  const onBubbleDown = (e) => {
    e.preventDefault();
    isDrag.current    = true;
    hasDragged.current = false;
    dragOff.current   = { x: e.clientX - bPos.x, y: e.clientY - bPos.y };

    const onMove = (ev) => {
      if (!isDrag.current) return;
      hasDragged.current = true;
      setBPos({
        x: Math.max(0, Math.min(window.innerWidth  - BSIZ, ev.clientX - dragOff.current.x)),
        y: Math.max(0, Math.min(window.innerHeight - BSIZ, ev.clientY - dragOff.current.y)),
      });
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup',   onUp);
      isDrag.current = false;
      if (hasDragged.current) return;
      // Tap
      const s = petStateRef.current;
      if (s === 'bubble') {
        openChat();
      } else if (s === 'chatting') {
        setPetState('bubble'); setPose('idle'); kickIdle();
      } else if (s === 'escaped') {
        // Click bubble while frog is escaped → frog jumps back
        clearInterval(wanderTimer.current); clearTimeout(poseTimer.current);
        setPose('jump');
        setTimeout(() => { returnToBubble(); kickIdle(); }, 500);
      }
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup',   onUp);
  };

  // ── Click escaped frog → randomly jump to new position ──────
  const onPetClick = (e) => {
    e.stopPropagation();
    if (petState !== 'escaped') return;
    clearTimeout(poseTimer.current);
    setShowZzz(false); setShowLeaf(false);
    setPose('jump');
    // Jump to a NEW random spot (not back to bubble)
    const dest = randomScreenPos();
    setTimeout(() => {
      tgtXY.current = dest;
      setPose('idle');
      // Resume pose cycle
      const CYCLE = [
        { p:'idle',  zzz:false, leaf:false, ms:3000 },
        { p:'sleep', zzz:true,  leaf:false, ms:5500 },
        { p:'idle',  zzz:false, leaf:false, ms:2000 },
        { p:'lotus', zzz:false, leaf:true,  ms:5500 },
      ];
      let idx = 0;
      const next = () => {
        const { p, zzz, leaf, ms } = CYCLE[idx % CYCLE.length];
        setPose(p); setShowZzz(zzz); setShowLeaf(leaf); idx++;
        poseTimer.current = setTimeout(next, ms);
      };
      poseTimer.current = setTimeout(next, 2000);
    }, 420);
  };

  // ── Image upload ─────────────────────────────────────────────
  const onImgSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target.result;
      const name = user?.nickname || user?.username || '探险家';
      const greetings = [
        `蛙！好漂亮的旅行照片 📸 这是在哪里拍的，${name}？告诉我地点，我帮你查查周边好玩的！`,
        `哇这张照片太有感觉了！✨ ${name}，这是哪个地方呀？快告诉我，我帮你找找周边景点和攻略！`,
        `📸 收到旅行照片！看起来风景超棒～ ${name} 这是在哪儿拍的？告诉我我来帮你安排周边行程！`,
      ];
      setMsgs(prev => [...prev,
        { role:'user', content:'📸 分享了一张旅行照片', image:src },
        { role:'assistant', content: greetings[Math.floor(Math.random()*greetings.length)] },
      ]);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // ── Random spot recommendation ───────────────────────────────
  const recommendRandom = async () => {
    setMsgs(prev=>[...prev,{ role:'user', content:'🎲 给我随机推荐一个景点！' }]);
    setBusy(true);
    try {
      const res  = await fetch('/api/spots/topk?k=10&type=scenic');
      const data = await res.json();
      const pool = data.data || [];
      if (pool.length > 0) {
        const s = pool[Math.floor(Math.random()*pool.length)];
        const intros = [
          `蛙！今天就去 ${s.name} 怎么样 🌟 📍${s.city}，评分 ⭐${s.rating}`,
          `随机命中宝藏！✨ ${s.name}（${s.city}）评分 ${s.rating}，绝对值得一去！`,
          `🎯 命运之选：${s.name}！📍${s.city}，⭐${s.rating}，${s.entranceFee===0?'还是免费的！':''}`,
        ];
        setMsgs(prev=>[...prev,{
          role:'assistant',
          content: intros[Math.floor(Math.random()*intros.length)]
            + (s.description ? '\n' + s.description.slice(0,60) + '...' : ''),
          link:`/spots/${s.id}`, lt:'查看详情',
        }]);
      } else {
        setMsgs(prev=>[...prev,{ role:'assistant', content:'呱！景点正在加载，稍等再试吧 🐸' }]);
      }
    } catch {
      setMsgs(prev=>[...prev,{ role:'assistant', content:'呱！随机失败了，换个问法试试 🐸' }]);
    } finally { setBusy(false); }
  };

  // ── Clear history ────────────────────────────────────────────
  const clearHistory = () => {
    setMsgs([INIT_MSG]);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  };

  // ── Chat ──────────────────────────────────────────────────────
  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    setInput('');
    setMsgs(prev => [...prev, { role:'user', content:text }]);
    setBusy(true);
    const hit = matchKB(text);
    if (hit) {
      await new Promise(r => setTimeout(r, 340));
      setMsgs(prev => [...prev, { role:'assistant', content:hit.ans, link:hit.link, lt:hit.lt }]);
      setBusy(false); return;
    }
    try {
      const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method:'POST',
        headers:{ 'Authorization':`Bearer ${DS_KEY}`, 'Content-Type':'application/json' },
        body: JSON.stringify({
          model:'deepseek-chat',
          messages:[
            { role:'system', content: buildSysPrompt(user) },
            ...msgs.slice(-8).filter(m=>!m.image).map(m=>({ role:m.role, content:m.content })),
            { role:'user', content:text },
          ],
          max_tokens:240,
        }),
      });
      const data = await res.json();
      setMsgs(prev=>[...prev,{ role:'assistant',
        content: data.choices?.[0]?.message?.content || '呱！这个我不太清楚，换个问法试试 🐸' }]);
    } catch {
      setMsgs(prev=>[...prev,{ role:'assistant', content:'呱！网络出了点问题，稍后再试吧 🐸' }]);
    } finally { setBusy(false); }
  };

  // Chat panel position (always above-left of bubble, clamped to screen)
  const chatR = Math.max(8, window.innerWidth  - bPos.x - BSIZ);
  const chatB = Math.max(8, window.innerHeight - bPos.y + 6);

  // ── Render ────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @keyframes _ff{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
        @keyframes _fj{0%{transform:translateY(0)scale(1)}32%{transform:translateY(-28px)scale(1.18,.85)}
          67%{transform:translateY(-6px)scale(.88,1.12)}100%{transform:translateY(0)scale(1)}}
        @keyframes _ls{0%,100%{transform:rotate(-13deg)translateX(-3px)}50%{transform:rotate(13deg)translateX(3px)}}
        @keyframes _za{0%{opacity:0;transform:translate(0,0)scale(.5)}22%{opacity:1}
          100%{opacity:0;transform:translate(13px,-38px)scale(1)}}
        @keyframes _zb{0%{opacity:0;transform:translate(0,0)scale(.5)}22%{opacity:1}
          100%{opacity:0;transform:translate(20px,-30px)scale(1.12)}}
        @keyframes _bg{0%,100%{opacity:1}50%{opacity:.88}}
        @keyframes _ci{from{opacity:0;transform:translateY(10px)scale(.97)}to{opacity:1;transform:none}}
        @keyframes _dt{0%,80%,100%{transform:scale(0)}40%{transform:scale(1)}}
        ._ff{animation:_ff 2.6s ease-in-out infinite}
        ._fj{animation:_fj .56s cubic-bezier(.36,.07,.19,.97) both}
        ._ls{animation:_ls 2.4s ease-in-out infinite}
        ._za{animation:_za 1.8s ease-out infinite}
        ._zb{animation:_zb 1.8s ease-out .9s infinite}
        ._bg{animation:_bg 3.4s ease-in-out infinite}
        ._ci{animation:_ci .2s ease-out both}
      `}</style>

      {/* ── Glass bubble ── */}
      <div
        onPointerDown={onBubbleDown}
        className="_bg"
        style={{
          position:'fixed', left:bPos.x, top:bPos.y,
          width:BSIZ, height:BSIZ, borderRadius:'50%',
          cursor: petState==='escaped' ? 'pointer' : 'grab',
          zIndex:9998, overflow:'hidden',
          display:'flex', alignItems:'center', justifyContent:'center',
          userSelect:'none', touchAction:'none',
          ...glassStyle({ borderRadius:'50%' }),
        }}
      >
        {/* glare highlights */}
        <div style={{ position:'absolute', top:'9%', left:'11%',
          width:'52%', height:'33%', background:'rgba(255,255,255,.62)',
          borderRadius:'50%', filter:'blur(4px)', transform:'rotate(-28deg)',
          pointerEvents:'none' }}/>
        <div style={{ position:'absolute', top:'13%', left:'20%',
          width:'24%', height:'15%', background:'rgba(255,255,255,.92)',
          borderRadius:'50%', filter:'blur(1.5px)', pointerEvents:'none' }}/>
        <div style={{ position:'absolute', bottom:'10%', right:'12%',
          width:'26%', height:'17%', background:'rgba(170,240,200,.36)',
          borderRadius:'50%', filter:'blur(4px)', pointerEvents:'none' }}/>

        {petState !== 'escaped' && (
          <div className="_ff" style={{ marginTop:5 }}>
            <PixelFrog pose={petState==='chatting' ? 'talk' : 'idle'} ps={PS_IN} />
          </div>
        )}
      </div>

      {/* ── Escaped frog ── */}
      {petState === 'escaped' && (
        <div onClick={onPetClick} style={{
          position:'fixed', left:pPos.x, top:pPos.y,
          zIndex:9997, cursor:'pointer', userSelect:'none',
        }}>
          {showLeaf && (
            <div className="_ls" style={{
              position:'absolute', top:-30, left:-8, pointerEvents:'none' }}>
              <LotusLeaf />
            </div>
          )}
          {showZzz && <>
            <span className="_za" style={{ position:'absolute', top:-24, right:-14,
              fontSize:14, fontWeight:900, color:'#94a3b8',
              fontFamily:'monospace', pointerEvents:'none' }}>z</span>
            <span className="_zb" style={{ position:'absolute', top:-12, right:-24,
              fontSize:18, fontWeight:900, color:'#64748b',
              fontFamily:'monospace', pointerEvents:'none' }}>Z</span>
          </>}
          <div className={pose==='jump' ? '_fj' : '_ff'}>
            <PixelFrog pose={pose} flip={flip} ps={PS_OUT} />
          </div>
        </div>
      )}

      {/* ── Chat panel — iOS 26 glass ── */}
      {petState === 'chatting' && (
        <div className="_ci" style={{
          position:'fixed', bottom:chatB, right:chatR,
          width:292, maxHeight:428, zIndex:9999,
          borderRadius:22, overflow:'hidden',
          display:'flex', flexDirection:'column',
          ...glassStyle({ borderRadius:22 }),
        }}>
          {/* header */}
          <div style={{
            padding:'10px 14px', flexShrink:0,
            borderBottom:'1px solid rgba(255,255,255,.35)',
            display:'flex', alignItems:'center', gap:8,
            background:'rgba(22,163,74,.07)',
          }}>
            <div style={{ width:34, height:34, borderRadius:'50%',
              background:'linear-gradient(135deg,#22c55e,#15803d)',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:20, flexShrink:0 }}>🐸</div>
            <div>
              <div style={{ fontWeight:700, fontSize:13, color:'#14532d' }}>
                旅行小蛙{user ? ` · ${user.nickname||user.username}` : ''}
              </div>
              <div style={{ fontSize:11, color:'#52796f' }}>
                {user ? `${user.level||'旅行新手'} · ${user.city||''}` : '登录后获得个性化回答'}
              </div>
            </div>
            <button onClick={clearHistory} title="清空记录"
              style={{ marginLeft:'auto', border:'none', background:'rgba(0,0,0,.05)',
                cursor:'pointer', color:'rgba(0,0,0,.35)', fontSize:12,
                padding:'3px 7px', borderRadius:8 }}>清空</button>
            <button onClick={()=>{ setPetState('bubble'); setPose('idle'); kickIdle(); }}
              style={{ border:'none', background:'none',
                cursor:'pointer', color:'rgba(0,0,0,.35)', fontSize:20,
                lineHeight:1, padding:'0 4px', borderRadius:6 }}>×</button>
          </div>

          {/* messages */}
          <div style={{ flex:1, overflowY:'auto', padding:'10px 10px 4px',
            display:'flex', flexDirection:'column', gap:8 }}>
            {msgs.map((m,i)=>(
              <div key={i} style={{ display:'flex',
                justifyContent: m.role==='user' ? 'flex-end' : 'flex-start',
                gap:6, alignItems:'flex-end' }}>
                {m.role==='assistant' && (
                  <div style={{ width:22, height:22, borderRadius:'50%',
                    background:'linear-gradient(135deg,#22c55e,#15803d)',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:13, flexShrink:0, marginBottom:2 }}>🐸</div>
                )}
                <div style={{
                  maxWidth:'80%', padding:'7px 11px',
                  borderRadius: m.role==='user' ? '14px 14px 4px 14px' : '4px 14px 14px 14px',
                  background: m.role==='user'
                    ? 'linear-gradient(135deg,#f59e0b,#f97316)'
                    : 'rgba(255,255,255,.72)',
                  backdropFilter: m.role==='assistant' ? 'blur(8px)' : 'none',
                  color: m.role==='user' ? '#fff' : '#1e293b',
                  fontSize:13, lineHeight:1.55,
                  border: m.role==='assistant' ? '1px solid rgba(255,255,255,.6)' : 'none',
                  boxShadow:'0 2px 8px rgba(0,0,0,.06)',
                }}>
                  {m.image && (
                    <img src={m.image} alt="旅行照片"
                      style={{ display:'block', maxWidth:'100%', borderRadius:8,
                        marginBottom: m.content ? 6 : 0, maxHeight:140, objectFit:'cover' }} />
                  )}
                  {m.content}
                  {m.link && (
                    <button onClick={()=>{ navigate(m.link); setPetState('bubble'); setPose('idle'); kickIdle(); }}
                      style={{ display:'block', marginTop:6,
                        background:'linear-gradient(135deg,#16a34a,#22c55e)',
                        color:'#fff', border:'none', borderRadius:8,
                        padding:'4px 10px', fontSize:11, cursor:'pointer', fontWeight:600 }}>
                      {m.lt} →</button>
                  )}
                </div>
              </div>
            ))}
            {busy && (
              <div style={{ display:'flex', gap:6, alignItems:'flex-end' }}>
                <div style={{ width:22, height:22, borderRadius:'50%',
                  background:'linear-gradient(135deg,#22c55e,#15803d)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:13, flexShrink:0 }}>🐸</div>
                <div style={{ background:'rgba(255,255,255,.72)', backdropFilter:'blur(8px)',
                  border:'1px solid rgba(255,255,255,.6)',
                  borderRadius:'4px 14px 14px 14px', padding:'10px 14px',
                  display:'flex', gap:4, alignItems:'center' }}>
                  {[0,1,2].map(i=>(
                    <div key={i} style={{ width:6, height:6, borderRadius:'50%',
                      background:'#22c55e',
                      animation:`_dt 1.4s ease-in-out ${i*.16}s infinite` }}/>
                  ))}
                </div>
              </div>
            )}
            <div ref={endRef}/>
          </div>

          {/* quick actions */}
          <div style={{ padding:'4px 10px 2px', display:'flex', gap:5,
            flexWrap:'wrap', flexShrink:0 }}>
            <button onClick={recommendRandom} disabled={busy} style={{
              fontSize:11, padding:'3px 8px', borderRadius:99,
              background:'rgba(249,115,22,.1)', color:'#ea580c',
              border:'1px solid rgba(249,115,22,.25)', cursor:'pointer' }}>🎲 随机推荐</button>
            <button onClick={()=>imgRef.current?.click()} style={{
              fontSize:11, padding:'3px 8px', borderRadius:99,
              background:'rgba(99,102,241,.1)', color:'#4f46e5',
              border:'1px solid rgba(99,102,241,.25)', cursor:'pointer' }}>📸 上传照片</button>
            {['去哪玩好？','怎么找美食？','有什么功能？'].map(q=>(
              <button key={q} onClick={()=>setInput(q)} style={{
                fontSize:11, padding:'3px 8px', borderRadius:99,
                background:'rgba(22,163,74,.1)', color:'#15803d',
                border:'1px solid rgba(22,163,74,.22)', cursor:'pointer' }}>{q}</button>
            ))}
          </div>

          {/* input */}
          <div style={{ padding:'8px 10px',
            borderTop:'1px solid rgba(255,255,255,.35)',
            display:'flex', gap:6, flexShrink:0, alignItems:'center' }}>
            <input ref={imgRef} type="file" accept="image/*"
              onChange={onImgSelect} style={{ display:'none' }}/>
            <input value={input} onChange={e=>setInput(e.target.value)}
              onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&send()}
              placeholder="问小蛙任何旅游问题..."
              style={{ flex:1, border:'1px solid rgba(255,255,255,.55)',
                borderRadius:12, padding:'7px 11px', fontSize:13, outline:'none',
                background:'rgba(255,255,255,.55)',
                backdropFilter:'blur(8px)', color:'#1e293b' }}/>
            <button onClick={send} disabled={busy||!input.trim()} style={{
              width:36, height:36, borderRadius:12,
              background:'linear-gradient(135deg,#22c55e,#15803d)',
              color:'#fff', border:'none', cursor:'pointer',
              fontSize:18, display:'flex', alignItems:'center', justifyContent:'center',
              flexShrink:0, opacity:(busy||!input.trim())?.5:1,
              transition:'opacity .15s' }}>↑</button>
          </div>
        </div>
      )}
    </>
  );
}
