import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

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

// ── Site FAQ ─────────────────────────────────────────────────────
const KB = [
  { kw:['景点','发现','找景点','景区','spots','搜景点'],
    ans:'「发现景点」支持名称前缀搜索（Trie 算法），还能按城市和类型筛选 🗺️',
    link:'/spots', lt:'去发现景点' },
  { kw:['日记','旅行日记','写日记','游记','攻略'],
    ans:'「旅行日记」可以 AI 生成草稿，全文搜索用的 KMP 算法，还有点赞评论 ✍️',
    link:'/diary', lt:'去写日记' },
  { kw:['美食','吃','餐厅','推荐美食','食物'],
    ans:'「美食推荐」用 TopK 堆算法精选评分最高的餐厅，可以按城市筛选 🍜',
    link:'/foods', lt:'去看美食' },
  { kw:['路线','导航','规划','dijkstra','最短路','怎么走','路径'],
    ans:'「路线规划」用 Dijkstra 算法算最短路径，支持多景点规划 + 高德地图导航 🧭',
    link:'/route', lt:'去规划路线' },
  { kw:['地球','3d','星球','globe','旅行者','足迹地图','ai路线'],
    ans:'「3D 星球」看旅行者足迹和 AI 航线动画，搜城市名会让地球自动旋转过去 🌍',
    link:'/globe', lt:'去看3D星球' },
  { kw:['收藏','我的收藏','喜欢景点'],
    ans:'景点详情页右上角点 🤍 收藏，在「个人主页→我的收藏」查看全部 ❤️',
    link:'/profile', lt:'去个人主页' },
  { kw:['足迹','旅行足迹','去过','城市统计','省份'],
    ans:'「个人主页→旅行足迹」自动统计你去过的城市和省份（来自旅行日记数据）🏙️',
    link:'/profile', lt:'看旅行足迹' },
  { kw:['广场','社区','分享','动态','plaza'],
    ans:'「旅行广场」是社区分享区，浏览其他旅行者的精选内容 🏖️',
    link:'/plaza', lt:'去旅行广场' },
  { kw:['登录','注册','账号','密码'],
    ans:'点右上角「登录」，输入用户名即可，也可以访客身份浏览大部分内容 🔑',
    link:'/auth', lt:'去登录' },
  { kw:['个人','主页','资料','profile','编辑'],
    ans:'点右上角头像进入个人主页，可以编辑昵称/城市/签名，还有成就系统 👤',
    link:'/profile', lt:'去个人主页' },
  { kw:['成就','勋章','徽章'],
    ans:'成就在「个人主页→数据概览」，探访景点、写日记等都会解锁 🏆',
    link:'/profile', lt:'看我的成就' },
  { kw:['算法','kmp','trie','堆','topk','数据结构'],
    ans:'路线→Dijkstra、推荐→TopK堆、日记搜索→KMP、景点前缀→Trie，均自研 💻',
    link:null, lt:null },
  { kw:['功能','能做什么','有什么','介绍','帮助'],
    ans:'我可以帮你搜景点、规划路线、写日记、看 3D 地球、发现美食 🐸 问我就行！',
    link:null, lt:null },
];
const matchKB = (t) => KB.find(r => r.kw.some(k => t.toLowerCase().includes(k))) || null;

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

// ── Main component ────────────────────────────────────────────────
export default function AiPet() {
  const navigate = useNavigate();

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

  const [msgs,  setMsgs]  = useState([{ role:'assistant',
    content:'嗨！我是迹刻旅行蛙 🐸  有旅游问题或者不知道网站怎么用，都问我！' }]);
  const [input, setInput] = useState('');
  const [busy,  setBusy]  = useState(false);
  const endRef = useRef(null);

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

  useEffect(() => { endRef.current?.scrollIntoView({ behavior:'smooth' }); }, [msgs]);

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
            { role:'system', content:'你是"迹刻旅游网"的旅行助手小蛙🐸，专注旅游领域。回答简洁友好，1-3句话，可加emoji。不确定时如实说。' },
            ...msgs.slice(-6).map(m=>({ role:m.role, content:m.content })),
            { role:'user', content:text },
          ],
          max_tokens:220,
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
              <div style={{ fontWeight:700, fontSize:13, color:'#14532d' }}>旅行小蛙</div>
              <div style={{ fontSize:11, color:'#52796f' }}>随时帮你探索旅途</div>
            </div>
            <button onClick={()=>{ setPetState('bubble'); setPose('idle'); kickIdle(); }}
              style={{ marginLeft:'auto', border:'none', background:'none',
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

          {/* quick replies */}
          <div style={{ padding:'4px 10px', display:'flex', gap:5,
            flexWrap:'wrap', flexShrink:0 }}>
            {['景点在哪搜？','怎么规划路线？','有什么功能？'].map(q=>(
              <button key={q} onClick={()=>setInput(q)} style={{
                fontSize:11, padding:'3px 8px', borderRadius:99,
                background:'rgba(22,163,74,.1)', color:'#15803d',
                border:'1px solid rgba(22,163,74,.22)', cursor:'pointer' }}>{q}</button>
            ))}
          </div>

          {/* input */}
          <div style={{ padding:'8px 10px',
            borderTop:'1px solid rgba(255,255,255,.35)',
            display:'flex', gap:6, flexShrink:0 }}>
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
