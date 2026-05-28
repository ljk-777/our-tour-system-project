import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const DS_KEY  = 'sk-513c1deb71594e8ca886d853eb4d2262';
const BSIZ    = 60;    // bubble diameter px (smaller)
const IDLE_MS = 9000;  // 9s quiet → escape
const PS_IN   = 3;     // pixel size inside bubble → frog 42×48
const PS_OUT  = 4;     // pixel size when escaped  → frog 56×64
const HOP_MS  = 380;   // one hop duration ms
const HOP_REST_MS = 2400; // rest between hops (±800ms jitter)
const HOP_DIST  = { min: 90, max: 170 }; // px per hop

// ── Pixel palette ────────────────────────────────────────────────
const PAL = [
  null, '#0a3d1a','#14532d','#15803d','#16a34a',
  '#22c55e','#4ade80','#bbf7d0','#f0fdf4',
  '#ffffff','#0f172a','#fda4af',
];

// 14 cols × 16 rows — eyes on TOP of head
const FRAMES = {
  idle: [
    [0,0,0,1,6,6,1,1,6,6,1,0,0,0],
    [0,0,1,6,9,9,6,6,9,9,6,1,0,0],
    [0,0,1,4,9,10,9,9,10,9,4,1,0,0],
    [0,0,1,4,4,4,4,4,4,4,4,1,0,0],
    [0,1,4,4,4,4,4,4,4,4,4,4,1,0],
    [0,1,4,11,4,4,4,4,4,4,11,4,1,0],
    [0,1,4,4,1,4,4,4,4,1,4,4,1,0],
    [0,0,1,4,4,4,4,4,4,4,4,1,0,0],
    [0,0,1,4,7,7,7,7,7,7,4,1,0,0],
    [0,0,1,4,8,8,8,8,8,8,4,1,0,0],
    [0,0,1,4,8,8,8,8,8,8,4,1,0,0],
    [0,0,1,4,4,4,4,4,4,4,4,1,0,0],
    [1,1,1,4,4,4,4,4,4,4,4,1,1,1],
    [1,4,4,1,4,4,4,4,4,4,1,4,4,1],
    [0,0,1,4,4,0,0,0,0,4,4,1,0,0],
    [0,1,4,4,0,0,0,0,0,0,4,4,1,0],
  ],
  sleep: [
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,1,4,4,4,4,4,4,1,0,0,0],
    [0,0,1,4,4,4,4,4,4,4,4,1,0,0],
    [0,0,1,4,1,1,4,4,1,1,4,1,0,0],
    [0,1,4,4,4,4,4,4,4,4,4,4,1,0],
    [0,1,4,11,4,4,4,4,4,4,11,4,1,0],
    [0,1,4,4,1,4,4,4,4,1,4,4,1,0],
    [0,0,1,4,4,4,4,4,4,4,4,1,0,0],
    [0,0,1,4,7,7,7,7,7,7,4,1,0,0],
    [0,0,1,4,8,8,8,8,8,8,4,1,0,0],
    [0,0,1,4,8,8,8,8,8,8,4,1,0,0],
    [0,0,1,4,4,4,4,4,4,4,4,1,0,0],
    [0,0,1,4,4,4,4,4,4,4,4,1,0,0],
    [0,0,1,4,4,4,4,4,4,4,4,1,0,0],
    [0,0,1,4,4,0,0,0,0,4,4,1,0,0],
    [0,1,4,4,0,0,0,0,0,0,4,4,1,0],
  ],
  lotus: [
    [0,0,0,1,6,6,1,1,6,6,1,0,0,0],
    [0,0,1,6,9,9,6,6,9,9,6,1,0,0],
    [0,0,1,4,9,10,9,9,10,9,4,1,0,0],
    [0,0,1,4,4,4,4,4,4,4,4,1,0,0],
    [0,1,4,4,4,4,4,4,4,4,4,4,1,0],
    [0,1,4,11,4,4,4,4,4,4,11,4,1,0],
    [0,1,4,4,1,4,4,4,4,1,4,4,1,0],
    [0,0,1,4,4,4,4,4,4,4,4,1,0,0],
    [0,0,1,4,7,7,7,7,7,7,4,1,0,0],
    [0,0,1,4,8,8,8,8,8,8,4,1,0,0],
    [0,0,1,4,8,8,8,8,8,8,4,1,0,0],
    [0,0,1,4,4,4,4,4,4,4,4,1,0,0],
    [1,0,0,1,4,4,4,4,4,4,1,0,0,1],
    [0,1,0,0,1,4,4,4,4,1,0,0,1,0],
    [0,0,1,4,4,0,0,0,0,4,4,1,0,0],
    [0,1,4,4,0,0,0,0,0,0,4,4,1,0],
  ],
  jump: [
    [0,0,0,1,6,6,1,1,6,6,1,0,0,0],
    [0,0,1,6,9,9,6,6,9,9,6,1,0,0],
    [0,0,1,4,10,9,9,9,9,10,4,1,0,0],
    [0,0,1,4,4,4,4,4,4,4,4,1,0,0],
    [0,1,4,4,4,4,4,4,4,4,4,4,1,0],
    [0,1,4,11,4,4,4,4,4,4,11,4,1,0],
    [0,1,4,4,1,1,4,4,1,1,4,4,1,0],
    [0,0,1,4,4,3,3,3,3,4,4,1,0,0],
    [0,0,1,4,7,7,7,7,7,7,4,1,0,0],
    [0,0,1,4,8,8,8,8,8,8,4,1,0,0],
    [0,0,1,4,8,8,8,8,8,8,4,1,0,0],
    [0,0,1,4,4,4,4,4,4,4,4,1,0,0],
    [1,0,1,4,4,4,4,4,4,4,4,1,0,1],
    [0,1,0,0,1,4,4,4,4,1,0,0,1,0],
    [1,0,0,0,0,1,4,4,1,0,0,0,0,1],
    [0,0,0,0,0,0,1,1,0,0,0,0,0,0],
  ],
  talk: [
    [0,0,0,1,6,6,1,1,6,6,1,0,0,0],
    [0,0,1,6,9,9,6,6,9,9,6,1,0,0],
    [0,0,1,4,9,10,9,9,10,9,4,1,0,0],
    [0,0,1,4,4,4,4,4,4,4,4,1,0,0],
    [0,1,4,4,4,4,4,4,4,4,4,4,1,0],
    [0,1,4,11,4,4,4,4,4,4,11,4,1,0],
    [0,1,4,4,1,2,2,2,2,1,4,4,1,0],
    [0,0,1,4,4,4,4,4,4,4,4,1,0,0],
    [0,0,1,4,7,7,7,7,7,7,4,1,0,0],
    [0,0,1,4,8,8,8,8,8,8,4,1,0,0],
    [0,0,1,4,8,8,8,8,8,8,4,1,0,0],
    [0,0,1,4,4,4,4,4,4,4,4,1,0,0],
    [1,1,1,4,4,4,4,4,4,4,4,1,1,1],
    [1,4,4,1,4,4,4,4,4,4,1,4,4,1],
    [0,0,1,4,4,0,0,0,0,4,4,1,0,0],
    [0,1,4,4,0,0,0,0,0,0,4,4,1,0],
  ],
};

function PixelFrog({ pose='idle', ps=PS_OUT, flip=false }) {
  const frame = FRAMES[pose] || FRAMES.idle;
  return (
    <svg width={14*ps} height={16*ps}
      style={{ imageRendering:'pixelated', display:'block', flexShrink:0,
               transform: flip ? 'scaleX(-1)' : 'none' }}>
      {frame.flatMap((row,y)=>row.map((v,x)=>{
        const fill=PAL[v]; if(!fill) return null;
        return <rect key={`${x}-${y}`} x={x*ps} y={y*ps} width={ps} height={ps} fill={fill}/>;
      }))}
    </svg>
  );
}

// ── Lotus leaf — circular with notch + veins (18×14, ps=3) ───────
function LotusLeaf() {
  const lps=3;
  // Recognisable round lotus leaf with stem notch and veins
  const leaf=[
    [0,0,0,0,0,1,2,2,2,2,2,2,2,1,0,0,0,0],
    [0,0,0,0,1,2,3,3,3,3,3,3,3,2,1,0,0,0],
    [0,0,0,1,2,3,4,4,5,5,4,4,3,3,2,1,0,0],
    [0,0,1,2,3,4,4,5,5,5,5,4,4,3,2,2,1,0],
    [0,1,2,3,4,5,5,5,5,5,5,5,5,4,3,2,1,0],
    [1,2,3,4,5,5,5,3,3,3,5,5,5,5,4,3,2,1],
    [1,2,3,4,5,5,3,2,2,2,3,5,5,5,4,3,2,1],
    [1,2,3,4,5,5,3,2,2,2,3,5,5,5,4,3,2,1],
    [0,1,2,3,4,5,5,5,3,3,5,5,5,4,3,2,1,0],
    [0,0,1,2,3,4,4,5,5,5,5,4,4,3,2,1,0,0],
    [0,0,0,1,2,3,3,4,4,4,4,3,3,2,1,0,0,0],
    [0,0,0,0,1,2,2,3,3,3,3,2,1,0,0,0,0,0],
    [0,0,0,0,0,0,1,6,7,7,1,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,1,6,1,0,0,0,0,0,0,0,0],
  ];
  const lp={0:null,1:'#166534',2:'#15803d',3:'#22c55e',4:'#4ade80',5:'#86efac',6:'#78350f',7:'#a16207'};
  return (
    <svg width={18*lps} height={14*lps} style={{imageRendering:'pixelated',display:'block'}}>
      {leaf.flatMap((row,y)=>row.map((v,x)=>{
        const fill=lp[v]; if(!fill) return null;
        return <rect key={`${x}-${y}`} x={x*lps} y={y*lps} width={lps} height={lps} fill={fill}/>;
      }))}
    </svg>
  );
}

// ── Pixel raindrop (shows around frog when holding lotus) ─────────
function PixelRain() {
  const drops = [
    {x:-22,delay:0,   dur:0.75},{x:8, delay:0.28,dur:0.82},
    {x:38, delay:0.12,dur:0.70},{x:62, delay:0.45,dur:0.88},
    {x:-8, delay:0.60,dur:0.78},{x:50, delay:0.18,dur:0.72},
    {x:24, delay:0.38,dur:0.85},{x:-36,delay:0.55,dur:0.76},
  ];
  return (
    <div style={{position:'absolute',top:-10,left:-30,width:130,height:90,pointerEvents:'none',overflow:'visible'}}>
      {drops.map((d,i)=>(
        <div key={i} style={{
          position:'absolute', left:d.x+30, top:0,
          width:2, height:5,
          background:'linear-gradient(180deg,#93c5fd,#bfdbfe88)',
          borderRadius:1,
          animation:`_rain ${d.dur}s linear ${d.delay}s infinite`,
        }}/>
      ))}
    </div>
  );
}

// ── FAQ knowledge base — 3 variants each ─────────────────────────
const KB=[
  {kw:['景点','发现','找景点','景区','spots','搜景点'],
   ans:['「发现景点」就是我的藏宝图 🗺️ Trie 前缀搜索，打几个字就找到，还有城市/类型筛选！',
        '蛙！找景点去「发现景点」～ 搜索贼快，还有城市筛选，宝藏景点等你挖 🔍',
        '想找景点？直接输入名字，Trie 算法比导游还快 ⚡ 还能按城市和类型过滤！'],
   link:'/spots',lt:'去发现景点'},
  {kw:['日记','旅行日记','写日记','游记','攻略'],
   ans:['旅行不记录等于白去！「旅行日记」AI 帮写草稿，KMP 全文搜索，还能点赞 ✍️',
        '蛙！快把旅途记录下来～ AI 生成草稿超方便，搜以前日记也很快 📖',
        '「旅行日记」是你的旅行博客！AI 草稿 + KMP 搜索，留下每段旅途的足迹 🌿'],
   link:'/diary',lt:'去写日记'},
  {kw:['美食','吃','餐厅','推荐美食','食物'],
   ans:['蛙！吃货出动！TopK 堆算法精选高分餐厅，按城市筛准没错 🍜',
        '「美食推荐」帮你找最值得去的餐厅～ TopK 堆算法保证推出来的都是精选 🍽️',
        '饿了？TopK 算法从几百家里帮你挑最高分的，按城市筛更准 🍜'],
   link:'/foods',lt:'去看美食'},
  {kw:['路线','导航','规划','dijkstra','最短路','怎么走','路径'],
   ans:['「路线规划」Dijkstra 最短路算法，多景点也能规划，一键高德导航 🧭',
        '蛙！数据结构的魔法！Dijkstra 算最短路，直接高德地图导过去 🗺️',
        '想高效刷景点？最短路算法帮你算，连换乘都能选，省时省力 🚀'],
   link:'/route',lt:'去规划路线'},
  {kw:['地球','3d','星球','globe','旅行者','足迹','ai路线'],
   ans:['蛙！3D 星球是我最爱的页面 🌍 搜城市名地球会自动转过去，还有 AI 航线！',
        '「3D 星球」超酷！输入城市地球平滑旋转，还能看旅行者足迹 ✈️',
        '旋转吧地球！搜景点地球转到那里，还有 AI 规划的飞行路线动画 🌏'],
   link:'/globe',lt:'去看3D星球'},
  {kw:['收藏','我的收藏','喜欢景点'],
   ans:['景点详情右上角点 🤍 收藏，「个人主页→我的收藏」随时查看 ❤️',
        '蛙！喜欢就收藏！详情页右上角心形按钮，个人主页有专属收藏夹 📌',
        '看到好景点赶紧收藏！点 🤍 后个人主页「我的收藏」能找回来 ✅'],
   link:'/profile',lt:'去个人主页'},
  {kw:['广场','社区','分享','动态','plaza'],
   ans:['「旅行广场」是旅行者的聚集地 🏖️ 精选攻略和动态，找找下个目的地的灵感！',
        '蛙！去旅行广场逛逛～ 很多人分享故事，说不定就看到你想去的地方了 🌊',
        '「旅行广场」社区分享区，浏览精选内容，找找旅行灵感 ✨'],
   link:'/plaza',lt:'去旅行广场'},
  {kw:['登录','注册','账号','密码'],
   ans:['右上角点「登录」，输用户名就行～ 登录后我能叫你名字给你个性化推荐 🔑',
        '蛙！登录才能解锁全部功能哦～ 点右上角「登录」，访客也能逛 👀',
        '登录超简单！右上角输用户名，不想登录的话访客模式也行 🌐'],
   link:'/auth',lt:'去登录'},
  {kw:['个人','主页','资料','profile','编辑'],
   ans:['右上角头像点进去就是个人主页 👤 改昵称/城市/签名，成就和足迹都在那！',
        '蛙！个人主页藏了好多～ 旅行足迹、收藏景点、成就徽章都在 🏆',
        '「个人主页」是你的旅行档案馆，编辑资料、看足迹、解锁成就 ✨'],
   link:'/profile',lt:'去个人主页'},
  {kw:['算法','kmp','trie','堆','topk','数据结构'],
   ans:['四大自研算法：路线→Dijkstra、推荐→TopK堆、日记搜索→KMP、景点前缀→Trie 💻',
        '蛙！Dijkstra/TopK堆/KMP/Trie 全自研，这才是旅游网站的硬核 ⚙️',
        '算法控看过来！Trie前缀 / KMP全文 / MinHeap-TopK / Dijkstra多点路径，均自研 🔬'],
   link:null,lt:null},
  {kw:['功能','能做什么','有什么','介绍','帮助'],
   ans:['蛙！迹刻能做的多了：搜景点/写日记/规划路线/推荐美食/看3D地球 🌍 问我就行！',
        '六大功能：🗺️发现景点/🍜美食推荐/🧭路线规划/✍️旅行日记/🌍3D星球/🏖️旅行广场',
        '我来导游！从找景点到规划路线到写日记全包，遇到问题问我 🐸'],
   link:null,lt:null},
];
const matchKB=(t)=>{
  const hit=KB.find(r=>r.kw.some(k=>t.toLowerCase().includes(k)));
  if(!hit)return null;
  return{...hit,ans:hit.ans[Math.floor(Math.random()*hit.ans.length)]};
};

// ── iOS 26 Liquid Glass — improved transparency + silkiness ──────
const glass=(extra={})=>({
  background:[
    'radial-gradient(ellipse 58% 40% at 30% 20%,rgba(255,255,255,.55) 0%,transparent 100%)',
    'radial-gradient(circle 25% at 42% 12%,rgba(255,255,255,.82) 0%,transparent 100%)',
    'radial-gradient(ellipse 70% 55% at 55% 92%,rgba(100,200,140,.12) 0%,transparent 100%)',
    'rgba(255,255,255,.14)',
  ].join(','),
  backdropFilter:'blur(36px) saturate(2.8) brightness(1.06)',
  WebkitBackdropFilter:'blur(36px) saturate(2.8) brightness(1.06)',
  boxShadow:[
    '0 6px 24px rgba(0,0,0,.1)',
    '0 1px 6px rgba(0,0,0,.06)',
    '0 0 0 1px rgba(255,255,255,.6)',
    'inset 0 1.5px 0 rgba(255,255,255,.95)',
    'inset 1px 0 0 rgba(255,255,255,.45)',
    'inset 0 -1px 0 rgba(255,255,255,.22)',
    'inset 0 0 28px rgba(255,255,255,.08)',
  ].join(','),
  ...extra,
});

// ── Personalised system prompt ────────────────────────────────────
const buildSys=(user)=>{
  let p='你是"迹刻旅游网"的旅行蛙🐸，活泼热情，爱旅行。1-3句话，简洁生动，爱用旅行比喻，偶尔说"蛙！"表示惊喜。熟悉迹刻所有功能。不确定时如实说。';
  if(user){
    const name=user.nickname||user.username||'探险家';
    p+=`\n用户：${name}（${user.level||'旅行新手'}，${user.city||'神秘之地'}），已写${user.totalDiaries||0}篇日记、探访${user.totalSpots||0}处景点。称呼"${name}"，给个性化回答。`;
  }else p+='\n称呼"旅行者"，鼓励登录。';
  return p;
};

const SK='aipet_msgs';
const SK_SZ='aipet_chat_size';
const INIT={role:'assistant',content:'嗨！我是迹刻旅行蛙 🐸  问旅游问题、网站功能，或者上传旅行照片都可以！'};

// ── Main component ────────────────────────────────────────────────
export default function AiPet(){
  const navigate=useNavigate();
  const {user}=useAuth();

  const [petState,setPetState]=useState('bubble');
  const [pose,setPose]=useState('idle');
  const [flip,setFlip]=useState(false);
  const [showZzz,setShowZzz]=useState(false);
  const [showLeaf,setShowLeaf]=useState(false);
  const [isHopping,setIsHopping]=useState(false);

  const [bPos,setBPos]=useState(()=>({
    x:Math.max(10,window.innerWidth-90),
    y:Math.max(10,window.innerHeight-90),
  }));
  const [pPos,setPPos]=useState({x:0,y:0});

  const [msgs,setMsgs]=useState(()=>{
    try{const s=localStorage.getItem(SK);if(s)return JSON.parse(s);}catch{}
    return[INIT];
  });
  const [input,setInput]=useState('');
  const [busy,setBusy]=useState(false);

  // Resizable chat panel
  const [chatSz,setChatSz]=useState(()=>{
    try{const s=localStorage.getItem(SK_SZ);if(s)return JSON.parse(s);}catch{}
    return{w:296,h:430};
  });
  const resizing=useRef(false);
  const resizeStart=useRef({x:0,y:0,w:0,h:0});

  const endRef=useRef(null);
  const imgRef=useRef(null);
  const petStateRef=useRef('bubble');
  const isDrag=useRef(false);
  const hasDragged=useRef(false);
  const dragOff=useRef({x:0,y:0});
  const idleTimer=useRef(null);
  const hopAnim=useRef(null);
  const hopTimer=useRef(null);
  const poseTimer=useRef(null);
  const curXY=useRef({x:0,y:0});
  const bRef=useRef(bPos);
  const petEl=useRef(null);  // direct DOM ref for smooth rAF updates

  useEffect(()=>{petStateRef.current=petState;},[petState]);
  useEffect(()=>{bRef.current=bPos;},[bPos]);

  // ── persist ────────────────────────────────────────────────────
  useEffect(()=>{
    try{localStorage.setItem(SK,JSON.stringify(msgs.slice(-40)));}catch{}
    endRef.current?.scrollIntoView({behavior:'smooth'});
  },[msgs]);
  useEffect(()=>{
    try{localStorage.setItem(SK_SZ,JSON.stringify(chatSz));}catch{}
  },[chatSz]);

  // ── helpers ────────────────────────────────────────────────────
  const safeX=v=>Math.max(30,Math.min(window.innerWidth-80,v));
  const safeY=v=>Math.max(60,Math.min(window.innerHeight-90,v));

  const stopHop=()=>{
    if(hopAnim.current)cancelAnimationFrame(hopAnim.current);
    clearTimeout(hopTimer.current);
    clearTimeout(poseTimer.current);
  };

  const openChat=()=>{
    clearTimeout(idleTimer.current);
    setPetState('chatting');setPose('talk');
    setShowZzz(false);setShowLeaf(false);
  };

  const returnBubble=()=>{
    stopHop();
    setPetState('bubble');setPose('idle');
    setShowZzz(false);setShowLeaf(false);
    setIsHopping(false);
  };

  // ── Idle timer ─────────────────────────────────────────────────
  const kickIdle=()=>{
    clearTimeout(idleTimer.current);
    idleTimer.current=setTimeout(()=>{
      if(petStateRef.current!=='bubble')return;
      const dest={x:safeX(bRef.current.x+(Math.random()-0.5)*300),
                  y:safeY(bRef.current.y-80+(Math.random()-0.5)*150)};
      curXY.current=dest;
      setPPos(dest);
      setPetState('escaped');setPose('idle');
      setShowZzz(false);setShowLeaf(false);
    },IDLE_MS);
  };

  useEffect(()=>{
    if(petState!=='bubble')return;
    kickIdle();
    const reset=()=>kickIdle();
    const evts=['mousemove','click','keydown','touchstart'];
    evts.forEach(e=>window.addEventListener(e,reset,{passive:true}));
    return()=>{
      clearTimeout(idleTimer.current);
      evts.forEach(e=>window.removeEventListener(e,reset));
    };
  // eslint-disable-next-line
  },[petState]);

  // ── Hop cycle (escaped state) ─────────────────────────────────
  useEffect(()=>{
    if(petState!=='escaped'){stopHop();return;}

    const POSES=[
      {p:'idle', zzz:false,leaf:false,ms:2600},
      {p:'sleep',zzz:true, leaf:false,ms:5000},
      {p:'idle', zzz:false,leaf:false,ms:1800},
      {p:'lotus',zzz:false,leaf:true, ms:5000},
    ];
    let poseIdx=0;
    const cyclePose=()=>{
      const{p,zzz,leaf,ms}=POSES[poseIdx%POSES.length];
      setPose(p);setShowZzz(zzz);setShowLeaf(leaf);
      poseIdx++;
      poseTimer.current=setTimeout(cyclePose,ms);
    };
    poseTimer.current=setTimeout(cyclePose,2000);

    // Parabolic hop animation
    const doHop=()=>{
      const sx=curXY.current.x, sy=curXY.current.y;
      const angle=(Math.random()-0.5)*Math.PI*1.6;
      const dist=HOP_DIST.min+Math.random()*(HOP_DIST.max-HOP_DIST.min);
      const tx=safeX(sx+Math.cos(angle)*dist);
      const ty=safeY(sy+Math.sin(angle)*dist*0.55);
      const arcH=32+Math.random()*18;

      setFlip(tx<sx);
      setIsHopping(true);
      setPose('jump');

      const t0=performance.now();
      const step=(now)=>{
        const t=Math.min((now-t0)/HOP_MS,1);
        // smooth ease-in-out
        const ease=t<0.5?2*t*t:-1+(4-2*t)*t;
        const x=sx+(tx-sx)*ease;
        const y=sy+(ty-sy)*ease-arcH*Math.sin(t*Math.PI);

        curXY.current={x,y};
        // Direct DOM update — no React re-render per frame
        if(petEl.current){
          petEl.current.style.left=`${Math.round(x)}px`;
          petEl.current.style.top=`${Math.round(y)}px`;
        }

        if(t<1){
          hopAnim.current=requestAnimationFrame(step);
        }else{
          curXY.current={x:tx,y:ty};
          setPPos({x:tx,y:ty});
          setIsHopping(false);
          setPose('idle');
          // Rest before next hop
          hopTimer.current=setTimeout(doHop,HOP_REST_MS+(Math.random()-0.5)*800);
        }
      };
      hopAnim.current=requestAnimationFrame(step);
    };
    hopTimer.current=setTimeout(doHop,1200);

    return()=>stopHop();
  // eslint-disable-next-line
  },[petState]);

  // ── Bubble drag + tap ──────────────────────────────────────────
  const onBubbleDown=(e)=>{
    e.preventDefault();
    isDrag.current=true;hasDragged.current=false;
    dragOff.current={x:e.clientX-bPos.x,y:e.clientY-bPos.y};
    const onMove=(ev)=>{
      if(!isDrag.current)return;
      hasDragged.current=true;
      setBPos({
        x:Math.max(0,Math.min(window.innerWidth-BSIZ,ev.clientX-dragOff.current.x)),
        y:Math.max(0,Math.min(window.innerHeight-BSIZ,ev.clientY-dragOff.current.y)),
      });
    };
    const onUp=()=>{
      window.removeEventListener('pointermove',onMove);
      window.removeEventListener('pointerup',onUp);
      isDrag.current=false;
      if(hasDragged.current)return;
      const s=petStateRef.current;
      if(s==='bubble')openChat();
      else if(s==='chatting'){setPetState('bubble');setPose('idle');kickIdle();}
      else if(s==='escaped'){
        stopHop();setPose('jump');setIsHopping(true);
        setTimeout(()=>{returnBubble();kickIdle();},450);
      }
    };
    window.addEventListener('pointermove',onMove);
    window.addEventListener('pointerup',onUp);
  };

  // ── Click escaped frog → jumps to NEW random position ─────────
  const onPetClick=(e)=>{
    e.stopPropagation();
    if(petState!=='escaped'||isHopping)return;
    // cancel current rest, force a new hop immediately
    clearTimeout(hopTimer.current);
    hopTimer.current=setTimeout(()=>{
      // trigger hop via the useEffect's doHop — just schedule immediately
    },0);
    // Quick visual response
    setPose('jump');setIsHopping(true);
    setTimeout(()=>{setIsHopping(false);setPose('idle');},HOP_MS);
  };

  // ── Image upload ───────────────────────────────────────────────
  const onImgSelect=(e)=>{
    const file=e.target.files?.[0];
    if(!file||!file.type.startsWith('image/'))return;
    const reader=new FileReader();
    reader.onload=(ev)=>{
      const src=ev.target.result;
      const name=user?.nickname||user?.username||'探险家';
      const resps=[
        `蛙！好漂亮的旅行照片 📸 ${name}，这是在哪里拍的？告诉我地点帮你查周边！`,
        `哇这张照片太有感觉了 ✨ ${name}，这是哪里呀？快告诉我帮你找周边景点攻略！`,
        `📸 收到！看起来风景超棒～ ${name} 这是在哪拍的？告诉我来帮你安排周边行程！`,
      ];
      setMsgs(prev=>[...prev,
        {role:'user',content:'📸 分享了一张旅行照片',image:src},
        {role:'assistant',content:resps[Math.floor(Math.random()*resps.length)]},
      ]);
    };
    reader.readAsDataURL(file);
    e.target.value='';
  };

  // ── Random spot recommendation ─────────────────────────────────
  const recommendRandom=async()=>{
    setMsgs(prev=>[...prev,{role:'user',content:'🎲 给我随机推荐一个景点！'}]);
    setBusy(true);
    try{
      const res=await fetch('/api/spots/topk?k=12');
      if(!res.ok) throw new Error(`HTTP ${res.status}`);
      const data=await res.json();
      const pool=(data.data||[]).filter(s=>s?.name);
      if(pool.length>0){
        const s=pool[Math.floor(Math.random()*pool.length)];
        const intros=[
          `蛙！今天就去 ${s.name} 怎么样 🌟 📍${s.city}，评分 ⭐${s.rating}`,
          `随机命中宝藏！✨ ${s.name}（${s.city}），评分 ${s.rating}，绝对值得去！`,
          `🎯 命运之选：${s.name}！📍${s.city}，⭐${s.rating}${s.entranceFee===0?'，还是免费的！':''}`,
        ];
        setMsgs(prev=>[...prev,{
          role:'assistant',
          content:intros[Math.floor(Math.random()*intros.length)]+
            (s.description?'\n'+s.description.slice(0,55)+'…':''),
          link:`/spots/${s.id}`,lt:'查看详情',
        }]);
      }else{
        setMsgs(prev=>[...prev,{role:'assistant',
          content:'呱！景点数据库是空的，需要先运行后端种子数据 🐸\n可以先问我其他旅游问题！'}]);
      }
    }catch(err){
      const isNetwork=err.message==='Failed to fetch'||err.name==='TypeError';
      setMsgs(prev=>[...prev,{role:'assistant',
        content: isNetwork
          ? '呱！连不上后端服务 🐸 请先在终端启动后端：\ncd src/backend && npm run dev'
          : '呱！景点接口出错了，稍后再试吧 🐸'}]);
    }finally{setBusy(false);}
  };

  const clearHistory=()=>{setMsgs([INIT]);try{localStorage.removeItem(SK);}catch{}};

  // ── Chat send ──────────────────────────────────────────────────
  const send=async()=>{
    const text=input.trim();
    if(!text||busy)return;
    setInput('');
    setMsgs(prev=>[...prev,{role:'user',content:text}]);
    setBusy(true);
    const hit=matchKB(text);
    if(hit){
      await new Promise(r=>setTimeout(r,320));
      setMsgs(prev=>[...prev,{role:'assistant',content:hit.ans,link:hit.link,lt:hit.lt}]);
      setBusy(false);return;
    }
    try{
      const res=await fetch('https://api.deepseek.com/v1/chat/completions',{
        method:'POST',
        headers:{'Authorization':`Bearer ${DS_KEY}`,'Content-Type':'application/json'},
        body:JSON.stringify({
          model:'deepseek-chat',
          messages:[
            {role:'system',content:buildSys(user)},
            ...msgs.slice(-8).filter(m=>!m.image).map(m=>({role:m.role,content:m.content})),
            {role:'user',content:text},
          ],
          max_tokens:240,
        }),
      });
      const data=await res.json();
      setMsgs(prev=>[...prev,{role:'assistant',
        content:data.choices?.[0]?.message?.content||'呱！这个我不太清楚，换个问法试试 🐸'}]);
    }catch{
      setMsgs(prev=>[...prev,{role:'assistant',content:'呱！网络出了点问题，稍后再试 🐸'}]);
    }finally{setBusy(false);}
  };

  // ── Chat resize handlers ───────────────────────────────────────
  const onResizeDown=(e)=>{
    e.preventDefault();
    resizing.current=true;
    resizeStart.current={x:e.clientX,y:e.clientY,w:chatSz.w,h:chatSz.h};
    const onMove=(ev)=>{
      if(!resizing.current)return;
      const dx=resizeStart.current.x-ev.clientX; // right-anchored: drag left = wider
      const dy=resizeStart.current.y-ev.clientY; // bottom-anchored: drag up = taller
      setChatSz({
        w:Math.max(240,Math.min(480,resizeStart.current.w+dx)),
        h:Math.max(300,Math.min(600,resizeStart.current.h+dy)),
      });
    };
    const onUp=()=>{
      resizing.current=false;
      window.removeEventListener('pointermove',onMove);
      window.removeEventListener('pointerup',onUp);
    };
    window.addEventListener('pointermove',onMove);
    window.addEventListener('pointerup',onUp);
  };

  // Chat panel position
  const chatR=Math.max(8,window.innerWidth-bPos.x-BSIZ);
  const chatB=Math.max(8,window.innerHeight-bPos.y+6);

  // ── Render ─────────────────────────────────────────────────────
  return(
    <>
      <style>{`
        @keyframes _flt{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
        @keyframes _hop{
          0%{transform:scaleX(1)scaleY(1)}
          8%{transform:scaleX(1.38)scaleY(0.6)}
          28%{transform:scaleX(0.78)scaleY(1.3)}
          50%{transform:scaleX(0.82)scaleY(1.2)}
          72%{transform:scaleX(0.78)scaleY(1.28)}
          90%{transform:scaleX(1.32)scaleY(0.65)}
          100%{transform:scaleX(1)scaleY(1)}
        }
        @keyframes _ls{0%,100%{transform:rotate(-14deg)translateX(-3px)}50%{transform:rotate(14deg)translateX(3px)}}
        @keyframes _za{0%{opacity:0;transform:translate(0,0)scale(.5)}22%{opacity:1}100%{opacity:0;transform:translate(12px,-36px)scale(1)}}
        @keyframes _zb{0%{opacity:0;transform:translate(0,0)scale(.5)}22%{opacity:1}100%{opacity:0;transform:translate(18px,-28px)scale(1.1)}}
        @keyframes _rain{from{transform:translateY(-8px);opacity:1}to{transform:translateY(90px);opacity:0}}
        @keyframes _ci{from{opacity:0;transform:translateY(8px)scale(.97)}to{opacity:1;transform:none}}
        @keyframes _dt{0%,80%,100%{transform:scale(0)}40%{transform:scale(1)}}
        @keyframes _bg{0%,100%{opacity:1}50%{opacity:.9}}
        ._flt{animation:_flt 2.8s ease-in-out infinite}
        ._hop{animation:_hop ${HOP_MS}ms cubic-bezier(.36,.07,.19,.97) both}
        ._ls{animation:_ls 2.4s ease-in-out infinite}
        ._za{animation:_za 1.9s ease-out infinite}
        ._zb{animation:_zb 1.9s ease-out .95s infinite}
        ._ci{animation:_ci .18s ease-out both}
        ._bg{animation:_bg 3.6s ease-in-out infinite}
      `}</style>

      {/* ── Glass bubble ── */}
      <div onPointerDown={onBubbleDown} className="_bg"
        style={{
          position:'fixed',left:bPos.x,top:bPos.y,
          width:BSIZ,height:BSIZ,borderRadius:'50%',
          cursor:petState==='escaped'?'pointer':'grab',
          zIndex:9998,overflow:'hidden',
          display:'flex',alignItems:'center',justifyContent:'center',
          userSelect:'none',touchAction:'none',
          ...glass({borderRadius:'50%'}),
        }}>
        <div style={{position:'absolute',top:'8%',left:'10%',width:'54%',height:'34%',
          background:'rgba(255,255,255,.58)',borderRadius:'50%',
          filter:'blur(3.5px)',transform:'rotate(-26deg)',pointerEvents:'none'}}/>
        <div style={{position:'absolute',top:'12%',left:'19%',width:'26%',height:'16%',
          background:'rgba(255,255,255,.9)',borderRadius:'50%',
          filter:'blur(1.5px)',pointerEvents:'none'}}/>
        <div style={{position:'absolute',bottom:'9%',right:'11%',width:'28%',height:'18%',
          background:'rgba(160,240,190,.32)',borderRadius:'50%',
          filter:'blur(4px)',pointerEvents:'none'}}/>
        {petState!=='escaped'&&(
          <div className="_flt" style={{marginTop:4}}>
            <PixelFrog pose={petState==='chatting'?'talk':'idle'} ps={PS_IN}/>
          </div>
        )}
      </div>

      {/* ── Escaped frog (rAF-driven position) ── */}
      {petState==='escaped'&&(
        <div ref={petEl} onClick={onPetClick}
          style={{
            position:'fixed',left:pPos.x,top:pPos.y,
            zIndex:9997,cursor:'pointer',userSelect:'none',
          }}>
          {showLeaf&&(
            <>
              <div className="_ls" style={{position:'absolute',top:-34,left:-6,pointerEvents:'none'}}>
                <LotusLeaf/>
              </div>
              <PixelRain/>
            </>
          )}
          {showZzz&&<>
            <span className="_za" style={{position:'absolute',top:-24,right:-14,
              fontSize:13,fontWeight:900,color:'#94a3b8',fontFamily:'monospace',pointerEvents:'none'}}>z</span>
            <span className="_zb" style={{position:'absolute',top:-12,right:-24,
              fontSize:17,fontWeight:900,color:'#64748b',fontFamily:'monospace',pointerEvents:'none'}}>Z</span>
          </>}
          {/* Sleep: rotate to look flat on screen */}
          <div className={isHopping?'_hop':''} style={{
            transform: pose==='sleep' ? 'rotate(-90deg) scaleX(0.78)' : 'none',
            transition: pose==='sleep' ? 'transform 0.6s ease' : 'transform 0.25s ease',
          }}>
            <PixelFrog pose={pose} flip={flip} ps={PS_OUT}/>
          </div>
        </div>
      )}

      {/* ── Chat panel — resizable iOS26 glass ── */}
      {petState==='chatting'&&(
        <div className="_ci" style={{
          position:'fixed',bottom:chatB,right:chatR,
          width:chatSz.w,height:chatSz.h,
          zIndex:9999,borderRadius:22,overflow:'hidden',
          display:'flex',flexDirection:'column',
          ...glass({borderRadius:22}),
        }}>
          {/* Resize grip (top-left corner) */}
          <div onPointerDown={onResizeDown} style={{
            position:'absolute',top:0,left:0,width:20,height:20,
            cursor:'nw-resize',zIndex:10,
            background:'linear-gradient(135deg,rgba(255,255,255,.3) 45%,transparent 55%)',
            borderRadius:'22px 0 0 0',
          }}/>

          {/* header */}
          <div style={{padding:'10px 14px',flexShrink:0,
            borderBottom:'1px solid rgba(255,255,255,.28)',
            display:'flex',alignItems:'center',gap:8,
            background:'rgba(22,163,74,.06)'}}>
            <div style={{width:32,height:32,borderRadius:'50%',
              background:'linear-gradient(135deg,#22c55e,#15803d)',
              display:'flex',alignItems:'center',justifyContent:'center',
              fontSize:18,flexShrink:0}}>🐸</div>
            <div>
              <div style={{fontWeight:700,fontSize:13,color:'#14532d'}}>
                旅行小蛙{user?` · ${user.nickname||user.username}`:''}
              </div>
              <div style={{fontSize:11,color:'#52796f'}}>
                {user?`${user.level||'旅行新手'} · ${user.city||''}`:'登录后获得个性化回答'}
              </div>
            </div>
            <button onClick={clearHistory} title="清空"
              style={{marginLeft:'auto',border:'none',background:'rgba(0,0,0,.05)',
                cursor:'pointer',color:'rgba(0,0,0,.3)',fontSize:11,
                padding:'3px 7px',borderRadius:8}}>清空</button>
            <button onClick={()=>{setPetState('bubble');setPose('idle');kickIdle();}}
              style={{border:'none',background:'none',cursor:'pointer',
                color:'rgba(0,0,0,.3)',fontSize:20,lineHeight:1,padding:'0 4px',borderRadius:6}}>×</button>
          </div>

          {/* messages */}
          <div style={{flex:1,overflowY:'auto',padding:'10px 10px 4px',
            display:'flex',flexDirection:'column',gap:8}}>
            {msgs.map((m,i)=>(
              <div key={i} style={{display:'flex',
                justifyContent:m.role==='user'?'flex-end':'flex-start',
                gap:6,alignItems:'flex-end'}}>
                {m.role==='assistant'&&(
                  <div style={{width:22,height:22,borderRadius:'50%',
                    background:'linear-gradient(135deg,#22c55e,#15803d)',
                    display:'flex',alignItems:'center',justifyContent:'center',
                    fontSize:13,flexShrink:0,marginBottom:2}}>🐸</div>
                )}
                <div style={{
                  maxWidth:'80%',padding:'7px 11px',
                  borderRadius:m.role==='user'?'14px 14px 4px 14px':'4px 14px 14px 14px',
                  background:m.role==='user'
                    ?'linear-gradient(135deg,#f59e0b,#f97316)'
                    :'rgba(255,255,255,.65)',
                  backdropFilter:m.role==='assistant'?'blur(10px)':'none',
                  WebkitBackdropFilter:m.role==='assistant'?'blur(10px)':'none',
                  color:m.role==='user'?'#fff':'#1e293b',
                  fontSize:13,lineHeight:1.55,
                  border:m.role==='assistant'?'1px solid rgba(255,255,255,.55)':'none',
                  boxShadow:'0 2px 8px rgba(0,0,0,.05)',
                }}>
                  {m.image&&<img src={m.image} alt="旅行照片" style={{
                    display:'block',maxWidth:'100%',borderRadius:8,
                    marginBottom:m.content?6:0,maxHeight:140,objectFit:'cover'}}/>}
                  {m.content}
                  {m.link&&<button onClick={()=>{navigate(m.link);setPetState('bubble');setPose('idle');kickIdle();}}
                    style={{display:'block',marginTop:6,
                      background:'linear-gradient(135deg,#16a34a,#22c55e)',
                      color:'#fff',border:'none',borderRadius:8,
                      padding:'4px 10px',fontSize:11,cursor:'pointer',fontWeight:600}}>
                    {m.lt} →</button>}
                </div>
              </div>
            ))}
            {busy&&(
              <div style={{display:'flex',gap:6,alignItems:'flex-end'}}>
                <div style={{width:22,height:22,borderRadius:'50%',
                  background:'linear-gradient(135deg,#22c55e,#15803d)',
                  display:'flex',alignItems:'center',justifyContent:'center',
                  fontSize:13,flexShrink:0}}>🐸</div>
                <div style={{background:'rgba(255,255,255,.65)',backdropFilter:'blur(10px)',
                  border:'1px solid rgba(255,255,255,.55)',
                  borderRadius:'4px 14px 14px 14px',padding:'10px 14px',
                  display:'flex',gap:4,alignItems:'center'}}>
                  {[0,1,2].map(i=><div key={i} style={{width:6,height:6,borderRadius:'50%',
                    background:'#22c55e',animation:`_dt 1.4s ease-in-out ${i*.16}s infinite`}}/>)}
                </div>
              </div>
            )}
            <div ref={endRef}/>
          </div>

          {/* quick actions */}
          <div style={{padding:'4px 10px 2px',display:'flex',gap:5,flexWrap:'wrap',flexShrink:0}}>
            <button onClick={recommendRandom} disabled={busy} style={{
              fontSize:11,padding:'3px 8px',borderRadius:99,
              background:'rgba(249,115,22,.1)',color:'#ea580c',
              border:'1px solid rgba(249,115,22,.22)',cursor:'pointer'}}>🎲 随机推荐</button>
            <button onClick={()=>imgRef.current?.click()} style={{
              fontSize:11,padding:'3px 8px',borderRadius:99,
              background:'rgba(99,102,241,.1)',color:'#4f46e5',
              border:'1px solid rgba(99,102,241,.22)',cursor:'pointer'}}>📸 上传照片</button>
            {['去哪玩好？','怎么找美食？','有什么功能？'].map(q=>(
              <button key={q} onClick={()=>setInput(q)} style={{
                fontSize:11,padding:'3px 8px',borderRadius:99,
                background:'rgba(22,163,74,.1)',color:'#15803d',
                border:'1px solid rgba(22,163,74,.2)',cursor:'pointer'}}>{q}</button>
            ))}
          </div>

          {/* input */}
          <div style={{padding:'8px 10px',borderTop:'1px solid rgba(255,255,255,.28)',
            display:'flex',gap:6,flexShrink:0,alignItems:'center'}}>
            <input ref={imgRef} type="file" accept="image/*" onChange={onImgSelect} style={{display:'none'}}/>
            <input value={input} onChange={e=>setInput(e.target.value)}
              onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&send()}
              placeholder="问小蛙任何旅游问题..."
              style={{flex:1,border:'1px solid rgba(255,255,255,.45)',
                borderRadius:12,padding:'7px 11px',fontSize:13,outline:'none',
                background:'rgba(255,255,255,.45)',backdropFilter:'blur(10px)',
                WebkitBackdropFilter:'blur(10px)',color:'#1e293b'}}/>
            <button onClick={send} disabled={busy||!input.trim()} style={{
              width:36,height:36,borderRadius:12,
              background:'linear-gradient(135deg,#22c55e,#15803d)',
              color:'#fff',border:'none',cursor:'pointer',
              fontSize:18,display:'flex',alignItems:'center',justifyContent:'center',
              flexShrink:0,opacity:(busy||!input.trim())?.5:1,transition:'opacity .15s'}}>↑</button>
          </div>
        </div>
      )}
    </>
  );
}
