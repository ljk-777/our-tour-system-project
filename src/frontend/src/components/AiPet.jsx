import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

// ── DeepSeek key (same as GlobeOverlay) ─────────────────────────
const DS_KEY = 'sk-513c1deb71594e8ca886d853eb4d2262';
const BUBBLE_SIZE = 88;
const IDLE_MS = 8000; // 8s 无操作后逃跑

// ── Pixel art config ─────────────────────────────────────────────
// PS=6 => frog = 72×84 px  (12 cols × 14 rows)
const PS = 6;

// Palette: index → hex  (0 = transparent)
const PAL = [
  null,
  '#14532d',  // 1  darkest outline
  '#15803d',  // 2  body shadow
  '#16a34a',  // 3  main body
  '#22c55e',  // 4  body highlight
  '#86efac',  // 5  belly edge
  '#f0fdf4',  // 6  belly center
  '#ffffff',  // 7  eye white
  '#0f172a',  // 8  pupil
  '#fda4af',  // 9  cheek pink
];

// Each frame: 14 rows × 12 cols of palette indices
const FRAMES = {
  idle: [
    [0,0,0,1,1,0,0,1,1,0,0,0],
    [0,0,1,4,4,1,1,4,4,1,0,0],
    [0,0,1,3,3,3,3,3,3,3,1,0],
    [0,1,3,7,7,3,3,7,7,3,1,0],
    [0,1,3,7,8,7,3,7,8,7,3,1],
    [0,1,9,3,7,3,3,7,3,9,1,0],  // cheeks (9) flanking eye area
    [0,0,1,3,3,3,3,3,3,3,1,0],
    [0,0,1,3,5,5,5,5,3,1,0,0],
    [0,0,1,3,6,6,6,6,3,1,0,0],
    [0,0,1,3,6,6,6,6,3,1,0,0],
    [0,0,1,3,3,3,3,3,3,1,0,0],
    [1,1,1,3,3,3,3,3,3,1,1,1],
    [1,3,1,1,3,3,3,3,1,1,3,1],
    [0,0,1,3,3,0,0,3,3,1,0,0],
  ],
  sleep: [
    [0,0,0,1,1,0,0,0,0,0,0,0],  // head tilted left (one bump)
    [0,0,1,4,4,1,0,0,0,0,0,0],
    [0,0,1,3,3,3,3,3,3,3,1,0],
    [0,1,3,3,3,3,3,3,3,3,1,0],
    [0,1,3,1,1,3,3,1,1,3,3,1],  // closed eyes = dark bars
    [0,1,9,3,3,3,3,3,3,9,1,0],  // cheeks
    [0,0,1,3,3,3,3,3,3,3,1,0],
    [0,0,1,3,5,5,5,5,3,1,0,0],
    [0,0,1,3,6,6,6,6,3,1,0,0],
    [0,0,1,3,6,6,6,6,3,1,0,0],
    [0,0,1,3,3,3,3,3,3,1,0,0],
    [0,0,1,3,3,3,3,3,3,1,0,0],  // arms tucked
    [0,0,1,3,3,3,3,3,3,1,0,0],
    [0,0,1,3,3,0,0,3,3,1,0,0],
  ],
  lotus: [
    [0,0,0,1,1,0,0,1,1,0,0,0],
    [0,0,1,4,4,1,1,4,4,1,0,0],
    [0,0,1,3,3,3,3,3,3,3,1,0],
    [0,1,3,7,7,3,3,7,7,3,1,0],
    [0,1,3,7,8,7,3,7,8,7,3,1],
    [0,1,9,3,7,3,3,7,3,9,1,0],
    [0,0,1,3,3,3,3,3,3,3,1,0],
    [0,0,1,3,5,5,5,5,3,1,0,0],
    [0,0,1,3,6,6,6,6,3,1,0,0],
    [0,0,1,3,6,6,6,6,3,1,0,0],
    [1,0,1,3,3,3,3,3,3,1,0,1],  // arms raised upward
    [0,1,0,1,3,3,3,3,1,0,1,0],
    [0,0,1,1,3,3,3,3,1,1,0,0],
    [0,0,1,3,3,0,0,3,3,1,0,0],
  ],
  jump: [
    [0,0,0,1,1,0,0,1,1,0,0,0],
    [0,0,1,4,4,1,1,4,4,1,0,0],
    [0,0,1,3,3,3,3,3,3,3,1,0],
    [0,1,3,7,7,3,3,7,7,3,1,0],
    [0,1,3,8,7,8,3,8,7,8,3,1],  // wide surprised eyes
    [0,1,9,3,7,3,3,7,3,9,1,0],
    [0,0,1,3,2,2,2,2,3,3,1,0],  // open "O" mouth
    [0,0,1,3,5,5,5,5,3,1,0,0],
    [0,0,1,3,6,6,6,6,3,1,0,0],
    [0,0,1,3,6,6,6,6,3,1,0,0],
    [1,0,1,3,3,3,3,3,3,1,0,1],  // legs spread wide (jumping)
    [0,1,0,0,1,3,3,1,0,0,1,0],
    [1,0,0,0,0,1,1,0,0,0,0,1],
    [0,0,0,0,0,0,0,0,0,0,0,0],
  ],
  talk: [
    [0,0,0,1,1,0,0,1,1,0,0,0],
    [0,0,1,4,4,1,1,4,4,1,0,0],
    [0,0,1,3,3,3,3,3,3,3,1,0],
    [0,1,3,7,7,3,3,7,7,3,1,0],
    [0,1,3,7,8,7,3,7,8,7,3,1],
    [0,1,9,3,7,3,3,7,3,9,1,0],
    [0,0,1,3,3,1,1,3,3,3,1,0],  // talking mouth (slightly open)
    [0,0,1,3,5,5,5,5,3,1,0,0],
    [0,0,1,3,6,6,6,6,3,1,0,0],
    [0,0,1,3,6,6,6,6,3,1,0,0],
    [0,0,1,3,3,3,3,3,3,1,0,0],
    [1,1,1,3,3,3,3,3,3,1,1,1],
    [1,3,1,1,3,3,3,3,1,1,3,1],
    [0,0,1,3,3,0,0,3,3,1,0,0],
  ],
};

// ── Pixel frog SVG ───────────────────────────────────────────────
function PixelFrog({ pose = 'idle', ps = PS, flip = false }) {
  const frame = FRAMES[pose] || FRAMES.idle;
  const W = 12 * ps;
  const H = 14 * ps;
  return (
    <svg
      width={W} height={H}
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

// ── Lotus leaf (pixel art, 16×6 grid, ps=4) ──────────────────────
function LotusLeaf() {
  const lps = 4;
  const leaf = [
    [0,0,0,0,1,1,1,1,1,1,1,1,0,0,0,0],
    [0,0,0,1,2,2,2,2,2,2,2,2,1,0,0,0],
    [0,0,1,2,2,3,3,3,3,3,2,2,2,1,0,0],
    [0,1,2,2,3,3,4,4,4,3,3,2,2,2,1,0],
    [0,0,1,2,2,3,3,3,3,3,2,2,2,1,0,0],
    [0,0,0,1,2,2,2,2,2,2,2,2,1,0,0,0],
  ];
  const lpal = { 0:null, 1:'#166534', 2:'#16a34a', 3:'#22c55e', 4:'#4ade80' };
  return (
    <svg width={16*lps} height={6*lps} style={{ imageRendering:'pixelated', display:'block' }}>
      {leaf.flatMap((row, y) =>
        row.map((v, x) => {
          const fill = lpal[v];
          if (!fill) return null;
          return <rect key={`${x}-${y}`} x={x*lps} y={y*lps} width={lps} height={lps} fill={fill} />;
        })
      )}
    </svg>
  );
}

// ── Site FAQ knowledge base ──────────────────────────────────────
const KB = [
  { kw:['景点','发现','找景点','景区','spots','搜景点'],
    ans:'「发现景点」支持名称前缀搜索（Trie 算法），还能按城市和类型筛选 🗺️',
    link:'/spots', lt:'去发现景点' },
  { kw:['日记','旅行日记','写日记','游记','攻略'],
    ans:'「旅行日记」可以 AI 生成草稿，全文关键词搜索用的是 KMP 算法，还有点赞评论 ✍️',
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
    ans:'景点详情页右上角点 🤍 按钮收藏，在「个人主页→我的收藏」查看全部 ❤️',
    link:'/profile', lt:'去个人主页' },
  { kw:['足迹','旅行足迹','去过','城市统计','省份'],
    ans:'「个人主页→旅行足迹」自动统计你去过的城市和省份（来自旅行日记的景点数据）🏙️',
    link:'/profile', lt:'看旅行足迹' },
  { kw:['广场','社区','分享','动态','plaza'],
    ans:'「旅行广场」是社区分享区，浏览其他旅行者的精选内容和动态 🏖️',
    link:'/plaza', lt:'去旅行广场' },
  { kw:['登录','注册','账号','密码'],
    ans:'点右上角「登录」，输入用户名即可，也可以访客身份浏览大部分内容 🔑',
    link:'/auth', lt:'去登录' },
  { kw:['个人','主页','资料','profile','编辑'],
    ans:'点右上角头像进入个人主页，可以编辑昵称/城市/签名，还有成就系统 👤',
    link:'/profile', lt:'去个人主页' },
  { kw:['成就','勋章','徽章'],
    ans:'成就系统在「个人主页→数据概览」，探访景点、写日记等都会解锁成就 🏆',
    link:'/profile', lt:'看我的成就' },
  { kw:['算法','kmp','trie','堆','topk','数据结构'],
    ans:'路线→Dijkstra、推荐→TopK堆、日记搜索→KMP、景点前缀→Trie，均为自研实现 💻',
    link:null, lt:null },
  { kw:['功能','能做什么','有什么','介绍','帮助'],
    ans:'我可以帮你搜景点、规划路线、写日记、看 3D 地球、发现美食！导航有问题尽管问我 🐸',
    link:null, lt:null },
];

function matchKB(text) {
  const s = text.toLowerCase();
  return KB.find(r => r.kw.some(k => s.includes(k))) || null;
}

// ── AiPet main component ─────────────────────────────────────────
export default function AiPet() {
  const navigate = useNavigate();

  // state machine: 'bubble' | 'escaped' | 'chatting'
  const [petState, setPetState] = useState('bubble');
  const [pose, setPose]         = useState('idle');
  const [flip, setFlip]         = useState(false);
  const [showZzz, setShowZzz]   = useState(false);
  const [showLeaf, setShowLeaf] = useState(false);

  // bubble position (draggable)
  const [bPos, setBPos] = useState(() => ({
    x: Math.max(10, window.innerWidth - 108),
    y: Math.max(10, window.innerHeight - 108),
  }));

  // escaped pet position
  const [pPos, setPPos] = useState({ x: 0, y: 0 });

  // chat
  const [msgs, setMsgs]     = useState([{
    role: 'assistant',
    content: '嗨！我是迹刻旅行蛙 🐸  有旅游问题或者不知道网站怎么用，都可以问我~',
  }]);
  const [input, setInput]   = useState('');
  const [busy, setBusy]     = useState(false);
  const endRef              = useRef(null);

  // refs
  const petStateRef  = useRef('bubble');
  const isDrag       = useRef(false);
  const hasDragged   = useRef(false);
  const dragOff      = useRef({ x: 0, y: 0 });
  const idleTimer    = useRef(null);
  const wanderTimer  = useRef(null);
  const poseTimer    = useRef(null);
  const petXY        = useRef({ x: 0, y: 0 });
  const targetXY     = useRef({ x: 0, y: 0 });

  useEffect(() => { petStateRef.current = petState; }, [petState]);

  // ── Idle timer (bubble state) ────────────────────────────────
  const kickIdle = useCallback(() => {
    clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      if (petStateRef.current !== 'bubble') return;
      // Frog escapes!
      const startX = bPos.x - 20;
      const startY = bPos.y - 70;
      petXY.current = { x: startX, y: startY };
      setPPos({ x: startX, y: startY });
      setPetState('escaped');
      setPose('idle');
      setShowZzz(false);
      setShowLeaf(false);
    }, IDLE_MS);
  }, [bPos]);

  useEffect(() => {
    if (petState !== 'bubble') return;
    kickIdle();
    const reset = () => kickIdle();
    const events = ['mousemove','click','keydown','touchstart','scroll'];
    events.forEach(e => window.addEventListener(e, reset, { passive: true }));
    return () => {
      clearTimeout(idleTimer.current);
      events.forEach(e => window.removeEventListener(e, reset));
    };
  }, [petState, kickIdle]);

  // ── Wandering + pose cycle (escaped state) ───────────────────
  const pickTarget = useCallback(() => {
    const safeX = (v) => Math.max(20, Math.min(window.innerWidth - 90, v));
    const safeY = (v) => Math.max(60, Math.min(window.innerHeight - 110, v));
    targetXY.current = {
      x: safeX(bPos.x + (Math.random() - 0.5) * 280),
      y: safeY(bPos.y - 80 + (Math.random() - 0.5) * 140),
    };
  }, [bPos]);

  useEffect(() => {
    if (petState !== 'escaped') {
      clearInterval(wanderTimer.current);
      clearTimeout(poseTimer.current);
      return;
    }

    petXY.current = pPos;
    pickTarget();

    // Move toward target
    wanderTimer.current = setInterval(() => {
      const dx = targetXY.current.x - petXY.current.x;
      const dy = targetXY.current.y - petXY.current.y;
      petXY.current = {
        x: petXY.current.x + dx * 0.025,
        y: petXY.current.y + dy * 0.025,
      };
      setFlip(dx < 0);
      setPPos({ x: Math.round(petXY.current.x), y: Math.round(petXY.current.y) });
      if (Math.hypot(dx, dy) < 4) pickTarget();
    }, 50);

    // Pose cycle: idle → sleep → idle → lotus → repeat
    const CYCLE = [
      { p: 'idle',  zzz: false, leaf: false, ms: 3000 },
      { p: 'sleep', zzz: true,  leaf: false, ms: 5000 },
      { p: 'idle',  zzz: false, leaf: false, ms: 2000 },
      { p: 'lotus', zzz: false, leaf: true,  ms: 5000 },
    ];
    let idx = 0;
    const nextPose = () => {
      const { p, zzz, leaf, ms } = CYCLE[idx % CYCLE.length];
      setPose(p); setShowZzz(zzz); setShowLeaf(leaf);
      idx++;
      poseTimer.current = setTimeout(nextPose, ms);
    };
    poseTimer.current = setTimeout(nextPose, 2500);

    return () => {
      clearInterval(wanderTimer.current);
      clearTimeout(poseTimer.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [petState]);

  // Auto-scroll chat
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);

  // ── Bubble drag ──────────────────────────────────────────────
  const onBubbleDown = (e) => {
    if (petState === 'escaped') return;
    e.preventDefault();
    isDrag.current    = true;
    hasDragged.current = false;
    dragOff.current   = { x: e.clientX - bPos.x, y: e.clientY - bPos.y };

    const onMove = (ev) => {
      if (!isDrag.current) return;
      hasDragged.current = true;
      setBPos({
        x: Math.max(0, Math.min(window.innerWidth - BUBBLE_SIZE, ev.clientX - dragOff.current.x)),
        y: Math.max(0, Math.min(window.innerHeight - BUBBLE_SIZE, ev.clientY - dragOff.current.y)),
      });
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      isDrag.current = false;
      if (!hasDragged.current) {
        // Tap on bubble
        if (petStateRef.current === 'bubble') {
          setPetState('chatting');
          setPose('talk');
        } else if (petStateRef.current === 'chatting') {
          setPetState('bubble');
          setPose('idle');
          kickIdle();
        }
      }
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  // ── Pet click (when escaped) ─────────────────────────────────
  const onPetClick = () => {
    if (petState !== 'escaped') return;
    clearInterval(wanderTimer.current);
    clearTimeout(poseTimer.current);
    setShowZzz(false); setShowLeaf(false);
    setPose('jump');
    setTimeout(() => {
      setPetState('bubble');
      setPose('idle');
      kickIdle();
    }, 550);
  };

  // ── Chat send ────────────────────────────────────────────────
  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    setInput('');
    setMsgs(prev => [...prev, { role: 'user', content: text }]);
    setBusy(true);

    // FAQ check first
    const hit = matchKB(text);
    if (hit) {
      await new Promise(r => setTimeout(r, 350));
      setMsgs(prev => [...prev, { role: 'assistant', content: hit.ans, link: hit.link, lt: hit.lt }]);
      setBusy(false);
      return;
    }

    // DeepSeek
    try {
      const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${DS_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: '你是"迹刻旅游网"的旅行助手小蛙🐸，专注旅游领域。回答简洁友好，1-3句话，可加 emoji。不确定时请如实说。' },
            ...msgs.slice(-6).map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content: text },
          ],
          max_tokens: 220,
        }),
      });
      const data = await res.json();
      const reply = data.choices?.[0]?.message?.content || '呱！这个我不太清楚，你可以多逛逛网站或者换个问法试试 🐸';
      setMsgs(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch {
      setMsgs(prev => [...prev, { role: 'assistant', content: '呱！网络好像断了，稍后再试吧 🐸' }]);
    } finally {
      setBusy(false);
    }
  };

  // ── Compute chat panel position ──────────────────────────────
  const chatRight  = Math.max(8, window.innerWidth - bPos.x - BUBBLE_SIZE);
  const chatBottom = Math.max(8, window.innerHeight - bPos.y + 6);

  // ── Render ───────────────────────────────────────────────────
  return (
    <>
      {/* ── Global CSS animations ── */}
      <style>{`
        @keyframes _frog_float {
          0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}
        }
        @keyframes _frog_jump {
          0%{transform:translateY(0) scale(1)}
          30%{transform:translateY(-26px) scale(1.15,.88)}
          65%{transform:translateY(-8px) scale(.9,1.1)}
          100%{transform:translateY(0) scale(1)}
        }
        @keyframes _leaf_sway {
          0%,100%{transform:rotate(-12deg) translateX(-3px)}
          50%{transform:rotate(12deg) translateX(3px)}
        }
        @keyframes _zzz_a {
          0%{opacity:0;transform:translate(0,0) scale(.5)}
          25%{opacity:1}
          100%{opacity:0;transform:translate(14px,-36px) scale(1)}
        }
        @keyframes _zzz_b {
          0%{opacity:0;transform:translate(0,0) scale(.5)}
          25%{opacity:1}
          100%{opacity:0;transform:translate(20px,-30px) scale(1.1)}
        }
        @keyframes _bubble_glow {
          0%,100%{box-shadow:0 8px 32px rgba(0,0,0,.12),inset 0 1px 0 rgba(255,255,255,.8)}
          50%{box-shadow:0 12px 40px rgba(22,163,74,.18),inset 0 1px 0 rgba(255,255,255,.9)}
        }
        @keyframes _chat_in {
          from{opacity:0;transform:translateY(12px) scale(.96)}
          to{opacity:1;transform:none}
        }
        @keyframes _dot {
          0%,80%,100%{transform:scale(0)}
          40%{transform:scale(1)}
        }
        ._frog_float{animation:_frog_float 2.6s ease-in-out infinite}
        ._frog_jump{animation:_frog_jump .56s cubic-bezier(.36,.07,.19,.97) both}
        ._leaf_sway{animation:_leaf_sway 2.4s ease-in-out infinite}
        ._zzz_a{animation:_zzz_a 1.8s ease-out infinite}
        ._zzz_b{animation:_zzz_b 1.8s ease-out .9s infinite}
        ._bubble_glow{animation:_bubble_glow 3s ease-in-out infinite}
        ._chat_in{animation:_chat_in .22s ease-out both}
      `}</style>

      {/* ── Glass bubble ── */}
      <div
        onPointerDown={onBubbleDown}
        className="_bubble_glow"
        style={{
          position: 'fixed',
          left: bPos.x, top: bPos.y,
          width: BUBBLE_SIZE, height: BUBBLE_SIZE,
          borderRadius: '50%',
          background: 'radial-gradient(circle at 36% 30%, rgba(255,255,255,.46), rgba(255,255,255,.08))',
          backdropFilter: 'blur(18px) saturate(1.8)',
          border: '1.5px solid rgba(255,255,255,.65)',
          cursor: petState === 'escaped' ? 'default' : 'grab',
          zIndex: 9998,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          userSelect: 'none',
          touchAction: 'none',
        }}
      >
        {/* glass glare highlight */}
        <div style={{
          position:'absolute', top:'11%', left:'17%',
          width:'38%', height:'26%',
          background:'rgba(255,255,255,.55)',
          borderRadius:'50%',
          filter:'blur(3px)',
          pointerEvents:'none',
        }}/>
        {/* secondary bottom glare */}
        <div style={{
          position:'absolute', bottom:'14%', right:'18%',
          width:'20%', height:'14%',
          background:'rgba(255,255,255,.28)',
          borderRadius:'50%',
          filter:'blur(2px)',
          pointerEvents:'none',
        }}/>
        {petState !== 'escaped' && (
          <div className="_frog_float" style={{ marginTop: 6 }}>
            <PixelFrog pose={petState === 'chatting' ? 'talk' : 'idle'} />
          </div>
        )}
      </div>

      {/* ── Escaped frog ── */}
      {petState === 'escaped' && (
        <div
          onClick={onPetClick}
          style={{
            position:'fixed', left: pPos.x, top: pPos.y,
            zIndex:9997, cursor:'pointer', userSelect:'none',
          }}
        >
          {/* lotus leaf above */}
          {showLeaf && (
            <div className="_leaf_sway" style={{
              position:'absolute', top:-32, left:-6, pointerEvents:'none',
            }}>
              <LotusLeaf />
            </div>
          )}
          {/* ZZZ */}
          {showZzz && <>
            <span className="_zzz_a" style={{
              position:'absolute', top:-22, right:-12,
              fontSize:13, fontWeight:900, color:'#94a3b8',
              fontFamily:'monospace', pointerEvents:'none',
            }}>z</span>
            <span className="_zzz_b" style={{
              position:'absolute', top:-12, right:-22,
              fontSize:17, fontWeight:900, color:'#64748b',
              fontFamily:'monospace', pointerEvents:'none',
            }}>Z</span>
          </>}
          <div className={pose === 'jump' ? '_frog_jump' : '_frog_float'}>
            <PixelFrog pose={pose} flip={flip} />
          </div>
        </div>
      )}

      {/* ── Chat panel ── */}
      {petState === 'chatting' && (
        <div
          className="_chat_in"
          style={{
            position:'fixed',
            bottom: chatBottom,
            right: chatRight,
            width: 294,
            maxHeight: 430,
            zIndex: 9999,
            display:'flex', flexDirection:'column',
            background:'rgba(255,255,255,.88)',
            backdropFilter:'blur(28px) saturate(2.1)',
            border:'1px solid rgba(255,255,255,.78)',
            borderRadius: 20,
            boxShadow:'0 16px 48px rgba(0,0,0,.14)',
            overflow:'hidden',
          }}
        >
          {/* header */}
          <div style={{
            padding:'10px 14px',
            borderBottom:'1px solid rgba(0,0,0,.06)',
            display:'flex', alignItems:'center', gap:8,
            background:'linear-gradient(135deg,rgba(22,163,74,.08),rgba(34,197,94,.03))',
            flexShrink:0,
          }}>
            <div style={{ width:36, height:36, borderRadius:'50%',
              background:'linear-gradient(135deg,#22c55e,#15803d)',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:20, flexShrink:0 }}>🐸</div>
            <div>
              <div style={{ fontWeight:700, fontSize:13, color:'#14532d', lineHeight:1.2 }}>旅行小蛙</div>
              <div style={{ fontSize:11, color:'#64748b' }}>随时帮你探索旅途</div>
            </div>
            <button
              onClick={() => { setPetState('bubble'); setPose('idle'); kickIdle(); }}
              style={{ marginLeft:'auto', border:'none', background:'none',
                cursor:'pointer', color:'#94a3b8', fontSize:20,
                lineHeight:1, padding:'0 4px', borderRadius:6 }}
            >×</button>
          </div>

          {/* messages */}
          <div style={{
            flex:1, overflowY:'auto', padding:'10px 10px 4px',
            display:'flex', flexDirection:'column', gap:8,
          }}>
            {msgs.map((m, i) => (
              <div key={i} style={{
                display:'flex',
                justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
                gap:6, alignItems:'flex-end',
              }}>
                {m.role === 'assistant' && (
                  <div style={{ width:22, height:22, borderRadius:'50%',
                    background:'linear-gradient(135deg,#22c55e,#15803d)',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:13, flexShrink:0, marginBottom:2 }}>🐸</div>
                )}
                <div style={{
                  maxWidth:'80%',
                  padding:'7px 11px',
                  borderRadius: m.role==='user'
                    ? '14px 14px 4px 14px' : '4px 14px 14px 14px',
                  background: m.role==='user'
                    ? 'linear-gradient(135deg,#f59e0b,#f97316)'
                    : 'rgba(255,255,255,.85)',
                  color: m.role==='user' ? '#fff' : '#1e293b',
                  fontSize:13, lineHeight:1.55,
                  border: m.role==='assistant' ? '1px solid rgba(0,0,0,.06)' : 'none',
                  boxShadow:'0 2px 8px rgba(0,0,0,.05)',
                }}>
                  {m.content}
                  {m.link && (
                    <button
                      onClick={() => { navigate(m.link); setPetState('bubble'); setPose('idle'); kickIdle(); }}
                      style={{
                        display:'block', marginTop:6,
                        background:'linear-gradient(135deg,#16a34a,#22c55e)',
                        color:'#fff', border:'none', borderRadius:8,
                        padding:'4px 10px', fontSize:11, cursor:'pointer',
                        fontWeight:600, letterSpacing:.3,
                      }}
                    >{m.lt} →</button>
                  )}
                </div>
              </div>
            ))}
            {busy && (
              <div style={{ display:'flex', gap:6, alignItems:'flex-end' }}>
                <div style={{ width:22,height:22,borderRadius:'50%',
                  background:'linear-gradient(135deg,#22c55e,#15803d)',
                  display:'flex',alignItems:'center',justifyContent:'center',
                  fontSize:13,flexShrink:0 }}>🐸</div>
                <div style={{ background:'rgba(255,255,255,.85)',
                  border:'1px solid rgba(0,0,0,.06)',
                  borderRadius:'4px 14px 14px 14px',
                  padding:'10px 14px', display:'flex', gap:4, alignItems:'center' }}>
                  {[0,1,2].map(i=>(
                    <div key={i} style={{
                      width:6,height:6,borderRadius:'50%',background:'#22c55e',
                      animation:`_dot 1.4s ease-in-out ${i*.16}s infinite`,
                    }}/>
                  ))}
                </div>
              </div>
            )}
            <div ref={endRef}/>
          </div>

          {/* quick replies */}
          <div style={{
            padding:'4px 10px', display:'flex', gap:5, flexWrap:'wrap', flexShrink:0,
          }}>
            {['景点在哪搜？','怎么规划路线？','有什么功能？'].map(q=>(
              <button key={q} onClick={()=>setInput(q)} style={{
                fontSize:11, padding:'3px 8px', borderRadius:99,
                background:'rgba(22,163,74,.1)', color:'#15803d',
                border:'1px solid rgba(22,163,74,.2)', cursor:'pointer',
              }}>{q}</button>
            ))}
          </div>

          {/* input */}
          <div style={{
            padding:'8px 10px',
            borderTop:'1px solid rgba(0,0,0,.06)',
            display:'flex', gap:6, flexShrink:0,
          }}>
            <input
              value={input}
              onChange={e=>setInput(e.target.value)}
              onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&send()}
              placeholder="问小蛙任何旅游问题..."
              style={{
                flex:1, border:'1px solid rgba(0,0,0,.1)',
                borderRadius:12, padding:'7px 11px',
                fontSize:13, outline:'none',
                background:'rgba(255,255,255,.9)', color:'#1e293b',
              }}
            />
            <button
              onClick={send}
              disabled={busy||!input.trim()}
              style={{
                width:36,height:36,borderRadius:12,
                background:'linear-gradient(135deg,#22c55e,#15803d)',
                color:'#fff',border:'none',cursor:'pointer',
                fontSize:18,display:'flex',alignItems:'center',justifyContent:'center',
                flexShrink:0, opacity:(busy||!input.trim())?.5:1,
                transition:'opacity .15s',
              }}
            >↑</button>
          </div>
        </div>
      )}
    </>
  );
}
