// 精准关键词搜索 + 下载景点图片到本地
// 使用方法:
//   1. 前往 https://unsplash.com/developers 注册应用，获取 Access Key
//   2. 在 src/backend/.env 中添加 UNSPLASH_ACCESS_KEY=你的key
//   3. node scripts/download-spot-images.js
//
// Unsplash API 免费额度: 50 次/小时，建议先跑景点再跑餐厅

const fs = require('fs');
const path = require('path');
const https = require('https');

// 手动解析 .env，不依赖 dotenv
const envPath = path.join(__dirname, '../src/backend/.env');
const envLines = fs.readFileSync(envPath, 'utf-8').split('\n');
const env = {};
for (const line of envLines) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx === -1) continue;
  env[trimmed.slice(0, eqIdx).trim()] = trimmed.slice(eqIdx + 1).trim();
}

const ACCESS_KEY = env.UNSPLASH_ACCESS_KEY;
const OUTPUT_DIR = path.join(__dirname, '../src/frontend/public/images/spots');
const SPOTS_FILE = path.join(__dirname, '../src/backend/src/data/spots.js');

// ─── 精准搜索关键词映射 ─────────────────────────────────
// 每个条目: { keywords: [...],  // 按优先级排列，脚本会依次尝试
//             color: '#hex',      // 图片主色调偏好
//             orientation: 'landscape'|'portrait' }
// ──────────────────────────────────────────────────────
const SPOT_KEYWORDS = {

  // === 北京景区 ===
  1:  { kw: ['Forbidden City Beijing palace', '故宫 紫禁城'], color: '#8B0000' },
  2:  { kw: ['Great Wall of China Badaling', '八达岭长城'], color: '#4A6741' },
  3:  { kw: ['Temple of Heaven Beijing', '天坛 北京'], color: '#1a237e' },
  4:  { kw: ['Summer Palace Beijing garden', '颐和园 北京'], color: '#2E7D32' },
  5:  { kw: ['Old Summer Palace Yuanmingyuan Beijing', '圆明园 遗址'], color: '#5D4037' },
  6:  { kw: ['Fragrant Hills Beijing autumn', '香山 红叶'], color: '#C62828' },
  7:  { kw: ['Beihai Park Beijing', '北海公园 北京'], color: '#1565C0' },
  8:  { kw: ['Ming Tombs Beijing', '明十三陵'], color: '#4E342E' },
  9:  { kw: ['Mutianyu Great Wall', '慕田峪长城'], color: '#2E7D32' },
  10: { kw: ['Shichahai Beijing hutong', '什刹海 胡同'], color: '#78909C' },
  11: { kw: ['Nanluoguxiang Beijing hutong', '南锣鼓巷 胡同 美食'], color: '#8D6E63' },
  12: { kw: ['798 Art District Beijing', '798艺术区'], color: '#F4511E' },
  13: { kw: ['Olympic Park Beijing Bird Nest', '奥林匹克公园 鸟巢'], color: '#0277BD' },
  14: { kw: ['Dashilan Beijing old street', '大栅栏 北京'], color: '#6D4C41' },
  15: { kw: ['Beijing National Stadium Bird Nest architecture', '鸟巢 水立方 北京'], color: '#FF8F00' },
  16: { kw: ['National Museum of China Beijing', '国家博物馆 北京'], color: '#BF360C' },
  17: { kw: ['National Centre Performing Arts Beijing', '国家大剧院 北京'], color: '#00BCD4' },
  18: { kw: ['Sanlitun Beijing nightlife', '三里屯 北京'], color: '#E91E63' },
  19: { kw: ['Houhai Beijing lake bar', '后海 北京 酒吧'], color: '#FF5722' },
  20: { kw: ['Yonghe Temple Lama Temple Beijing', '雍和宫 北京'], color: '#B71C1C' },

  // === 上海景区 ===
  21: { kw: ['Oriental Pearl Tower Shanghai', '东方明珠 上海'], color: '#E91E63' },
  22: { kw: ['The Bund Shanghai skyline', '外滩 上海 夜景'], color: '#FFC107' },
  23: { kw: ['Yu Garden Shanghai classical', '豫园 上海'], color: '#2E7D32' },
  24: { kw: ['Tianzifang Shanghai art', '田子坊 上海'], color: '#FF5722' },
  25: { kw: ['Lujiazui Shanghai skyline Pudong', '陆家嘴 上海'], color: '#1565C0' },
  26: { kw: ['Zhujiajiao water town Shanghai', '朱家角古镇 水乡'], color: '#00838F' },
  27: { kw: ['Shanghai Disneyland castle', '上海迪士尼'], color: '#E91E63' },
  28: { kw: ['Shanghai Museum ancient art', '上海博物馆'], color: '#795548' },
  29: { kw: ['Xintiandi Shanghai nightlife', '新天地 上海'], color: '#FF6F00' },
  30: { kw: ['China Art Museum Shanghai Expo', '中华艺术宫 上海'], color: '#D32F2F' },
  31: { kw: ['Shanghai Wild Animal Park', '上海野生动物园'], color: '#388E3C' },
  32: { kw: ['M50 art district Shanghai', 'M50创意园 上海'], color: '#6A1B9A' },
  33: { kw: ['Qibao ancient town Shanghai', '七宝古镇 上海'], color: '#5D4037' },
  34: { kw: ['Fuxing Park Shanghai French', '复兴公园 上海'], color: '#43A047' },
  35: { kw: ['Nanjing Road Shanghai shopping street', '南京路步行街 上海'], color: '#FFD600' },

  // === 杭州 ===
  36: { kw: ['West Lake Hangzhou China', '西湖 杭州'], color: '#00838F' },
  37: { kw: ['Leifeng Pagoda Hangzhou West Lake', '雷峰塔 杭州'], color: '#BF360C' },
  38: { kw: ['Lingyin Temple Hangzhou', '灵隐寺 杭州'], color: '#4E342E' },
  39: { kw: ['Qiandao Lake Thousand Island Lake', '千岛湖'], color: '#0277BD' },
  40: { kw: ['Xixi Wetland Hangzhou', '西溪湿地 杭州'], color: '#2E7D32' },
  41: { kw: ['Su Causeway West Lake Hangzhou', '苏堤 西湖'], color: '#00695C' },
  42: { kw: ['Broken Bridge West Lake Hangzhou', '断桥残雪 西湖'], color: '#90A4AE' },
  43: { kw: ['Yue Fei Temple Hangzhou', '岳王庙 杭州'], color: '#795548' },

  // === 西安 ===
  51: { kw: ['Terracotta Warriors Xi\'an', '兵马俑 西安'], color: '#8D6E63' },
  52: { kw: ['Xi\'an City Wall ancient', '西安城墙'], color: '#6D4C41' },
  53: { kw: ['Big Wild Goose Pagoda Xi\'an', '大雁塔 西安'], color: '#BF360C' },
  54: { kw: ['Bell Tower Xi\'an', '西安钟楼'], color: '#4E342E' },
  55: { kw: ['Huaqing Palace Xi\'an hot spring', '华清池 西安'], color: '#00695C' },
  56: { kw: ['Muslim Quarter Xi\'an street food', '回民街 西安'], color: '#E64A19' },

  // === 桂林 ===
  57: { kw: ['Li River Guilin karst mountain', '桂林漓江 山水'], color: '#2E7D32' },
  58: { kw: ['Yangshuo karst landscape China', '阳朔 桂林'], color: '#388E3C' },
  59: { kw: ['Elephant Trunk Hill Guilin', '象鼻山 桂林'], color: '#1B5E20' },
  60: { kw: ['Li River Guilin scenery China', '漓江 桂林 山水'], color: '#00695C' },
  61: { kw: ['Longji Rice Terraces Guilin', '龙脊梯田 桂林'], color: '#4CAF50' },
  62: { kw: ['Reed Flute Cave Guilin', '芦笛岩 桂林'], color: '#7B1FA2' },

  // === 成都 ===
  46: { kw: ['Jinli Ancient Street Chengdu', '锦里 成都'], color: '#E64A19' },
  47: { kw: ['Wuhou Shrine Chengdu', '武侯祠 成都'], color: '#5D4037' },
  48: { kw: ['Kuanzhai Alley Chengdu', '宽窄巷子 成都'], color: '#795548' },
  49: { kw: ['Chengdu Panda Base giant panda', '大熊猫基地 成都'], color: '#2E7D32' },
  50: { kw: ['Dujiangyan irrigation system Sichuan', '都江堰 成都'], color: '#0277BD' },

  // === 敦煌 ===
  63: { kw: ['Mogao Caves Dunhuang', '敦煌莫高窟'], color: '#D84315' },
  64: { kw: ['Crescent Moon Lake Dunhuang desert', '月牙泉 鸣沙山 敦煌'], color: '#FF8F00' },

  // === 张家界 ===
  88: { kw: ['Zhangjiajie National Forest Park sandstone pillar', '张家界 国家森林公园'], color: '#1B5E20' },
  89: { kw: ['Tianmen Mountain Zhangjiajie', '天门山 张家界'], color: '#4CAF50' },
  90: { kw: ['Zhangjiajie Grand Canyon glass bridge', '张家界大峡谷 玻璃桥'], color: '#00BCD4' },

  // === 黄山 ===
  84: { kw: ['Yellow Mountain Huangshan China', '黄山 云海'], color: '#37474F' },

  // === 西藏 ===
  71: { kw: ['Potala Palace Lhasa Tibet', '布达拉宫 西藏'], color: '#B71C1C' },
  72: { kw: ['Jokhang Temple Lhasa Tibet', '大昭寺 西藏'], color: '#BF360C' },
  73: { kw: ['Namtso Lake Tibet', '纳木错 西藏'], color: '#0277BD' },

  // === 九寨沟 ===
  80: { kw: ['Jiuzhaigou Valley colorful lake', '九寨沟 五彩池'], color: '#00838F' },

  // === 丽江 ===
  75: { kw: ['Lijiang Old Town Yunnan', '丽江古城'], color: '#8D6E63' },
  76: { kw: ['Jade Dragon Snow Mountain Lijiang', '玉龙雪山 丽江'], color: '#ECEFF1' },

  // === 泰山 ===
  96: { kw: ['Mount Tai Shandong sunrise', '泰山 日出'], color: '#FF6F00' },

  // === 华山 ===
  102: { kw: ['Mount Hua Huashan cliff trail', '华山 险峰'], color: '#607D8B' },

  // === 峨眉山 ===
  108: { kw: ['Mount Emei Sichuan temple', '峨眉山 金顶'], color: '#FFD600' },


  // === 补充景区（之前漏掉的） ===
  44: { kw: ['Hefang Street Hangzhou ancient', '河坊街 杭州 老街'], color: '#8D6E63' },
  45: { kw: ['Prince Bay Park Hangzhou tulip', '太子湾公园 杭州 郁金香'], color: '#4CAF50' },
  65: { kw: ['Green Lake Park Kunming Yunnan', '翠湖公园 昆明 红嘴鸥'], color: '#388E3C' },
  66: { kw: ['Chimelong Paradise Guangzhou theme park', '长隆欢乐世界 广州'], color: '#E91E63' },
  67: { kw: ['Canton Tower Guangzhou landmark', '广州塔 小蛮腰'], color: '#1565C0' },
  68: { kw: ['Kaiping Diaolou watchtower Guangdong', '开平碉楼 广东'], color: '#6D4C41' },
  69: { kw: ['Danxia Mountain Guangdong red rock', '丹霞山 广东 红石'], color: '#C62828' },
  70: { kw: ['Happy Valley Shenzhen roller coaster', '欢乐谷 深圳 过山车'], color: '#FF5722' },
  74: { kw: ['Zhangjiajie National Forest Park China', '张家界国家森林公园 袁家界'], color: '#1B5E20' },
  77: { kw: ['Tianmen Mountain glass skywalk', '天门山 玻璃栈道 张家界'], color: '#37474F' },
  78: { kw: ['Dongting Lake Hunan wetland', '洞庭湖 岳阳'], color: '#0277BD' },
  79: { kw: ['Yuelu Mountain Changsha Hunan', '岳麓山 长沙 爱晚亭'], color: '#2E7D32' },
  81: { kw: ['Terracotta Warriors Xian', '兵马俑 秦始皇'], color: '#8D6E63' },
  82: { kw: ['Big Wild Goose Pagoda Xian', '大雁塔 西安'], color: '#BF360C' },
  83: { kw: ['Huaqing Palace Xian hot spring', '华清池 西安 杨贵妃'], color: '#00695C' },
  85: { kw: ['Tang Paradise Xian garden', '大唐芙蓉园 西安'], color: '#C62828' },
  86: { kw: ['Hukou Waterfall Yellow River', '壶口瀑布 延安'], color: '#8D6E63' },
  87: { kw: ['Yungang Grottoes Datong Shanxi', '云冈石窟 大同'], color: '#5D4037' },
  91: { kw: ['Li River Guilin karst', '桂林漓江 竹筏'], color: '#00695C' },
  92: { kw: ['Yangshuo West Street Guilin', '阳朔西街 桂林'], color: '#E64A19' },
  93: { kw: ['Longji Rice Terraces Guangxi', '龙脊梯田 桂林'], color: '#4CAF50' },
  94: { kw: ['Yellow Mountain Huangshan landscape', '黄山 迎客松'], color: '#37474F' },
  95: { kw: ['Xijiang Qianhu Miao Village Guizhou', '西江千户苗寨 黔东南'], color: '#5D4037' },
  97: { kw: ['Mount Fanjing Guizhou temple', '梵净山 金顶 贵州'], color: '#2E7D32' },
  98: { kw: ['Hulunbuir Grassland Inner Mongolia', '呼伦贝尔大草原 内蒙古'], color: '#4CAF50' },
  99: { kw: ['Harbin Ice and Snow World', '哈尔滨冰雪大世界 冰雕'], color: '#0277BD' },
  100: { kw: ['Heaven Lake Changbai Mountain Jilin', '长白山天池 延边'], color: '#1A237E' },
  101: { kw: ['Yalong Bay Sanya Hainan beach', '亚龙湾 三亚 海滩'], color: '#00BCD4' },
  103: { kw: ['Mogao Caves Dunhuang Gansu', '莫高窟 敦煌 壁画'], color: '#D84315' },
  104: { kw: ['Zhangye Rainbow Danxia Gansu', '张掖七彩丹霞 甘肃'], color: '#E91E63' },
  105: { kw: ['Chaka Salt Lake Qinghai sky mirror', '茶卡盐湖 天空之镜'], color: '#00BCD4' },
  106: { kw: ['Potala Palace Lhasa Tibet', '布达拉宫 西藏'], color: '#B71C1C' },
  107: { kw: ['Namtso Lake Tibet holy lake', '纳木错 西藏'], color: '#0277BD' },
  109: { kw: ['Elephant Trunk Hill Guilin', '象鼻山 桂林'], color: '#4CAF50' },
  110: { kw: ['Seven Star Park Guilin', '七星公园 桂林 骆驼山'], color: '#2E7D32' },
  111: { kw: ['Wuzhizhou Island Sanya diving', '蜈支洲岛 三亚 潜水'], color: '#00838F' },
  112: { kw: ['Xiguan Ancient Town Guangzhou', '西关古镇 广州 骑楼'], color: '#6D4C41' },
  113: { kw: ['Nanputuo Temple Xiamen', '南普陀寺 厦门'], color: '#BF360C' },
  114: { kw: ['Gulangyu Piano Museum Xiamen', '鼓浪屿钢琴博物馆 厦门'], color: '#8D6E63' },
  115: { kw: ['Haikou Qilou Old Street Hainan', '海口骑楼老街 海南'], color: '#795548' },
  116: { kw: ['Mausoleum First Qin Emperor Xian', '秦始皇陵 西安'], color: '#5D4037' },
  117: { kw: ['Lishan Mountain Xian', '骊山 西安 华清宫'], color: '#4E342E' },
  118: { kw: ['Former Residence Sun Yat-sen Zhongshan', '中山故居 孙中山'], color: '#795548' },
  119: { kw: ['Meizhou Island Fujian Mazu', '湄洲岛 莆田 妈祖'], color: '#0277BD' },
  120: { kw: ['Jingpo Lake Mudanjiang Heilongjiang', '镜泊湖 牡丹江 瀑布'], color: '#00838F' },
  // === 餐厅（精确到菜系） ===
  // 北京
  221: { kw: ['Peking duck Beijing restaurant', '北京烤鸭 全聚德'], color: '#C62828' },
  222: { kw: ['West Lake fish Hangzhou cuisine', '西湖醋鱼 楼外楼'], color: '#FF8F00' },
  223: { kw: ['Shanghai Bund fine dining', '外滩西餐'], color: '#4A148C' },
  224: { kw: ['Mapo Tofu Sichuan cuisine Chengdu', '麻婆豆腐 成都'], color: '#D84315' },
  225: { kw: ['Xi\'an Muslim Quarter street food', '回民街 西安 小吃'], color: '#E64A19' },
  226: { kw: ['Chinese dumplings Beijing local', '北京饺子 北大'], color: '#FFC107' },
  272: { kw: ['Quanjude Peking duck Beijing', '全聚德烤鸭 北京老字号'], color: '#B71C1C' },
  273: { kw: ['Donglaishun hot pot mutton Beijing', '东来顺 涮羊肉 老北京'], color: '#D84315' },
  274: { kw: ['Siji Minfu Peking duck Beijing', '四季民福烤鸭 故宫'], color: '#C62828' },
  275: { kw: ['Beijing seafood Guijie street', '簋街 麻辣小龙虾 北京'], color: '#E64A19' },
  276: { kw: ['Beijing zhajiang noodles traditional', '北京炸酱面 老北京'], color: '#795548' },

  // 上海
  277: { kw: ['Nanxiang xiaolongbao soup dumpling Shanghai', '南翔小笼包 上海'], color: '#FF8F00' },
  278: { kw: ['Shanghai traditional cuisine Laozhengxing', '老正兴 上海本帮菜'], color: '#D84315' },
  279: { kw: ['Chinese family style restaurant Hangzhou', '外婆家 杭帮菜'], color: '#43A047' },
  280: { kw: ['Shanghai noodles Aniang noodle', '上海面馆 阿娘面'], color: '#FFC107' },

  // 成都
  281: { kw: ['Longchaoshou Sichuan wonton Chengdu', '龙抄手 成都'], color: '#E64A19' },
  282: { kw: ['Lai Tangyuan sweet dumpling Chengdu', '赖汤圆 成都 甜品'], color: '#FF8F00' },
  283: { kw: ['Dalongyi Sichuan hot pot Chengdu', '大龙燚 成都火锅'], color: '#D32F2F' },
  284: { kw: ['Zhong dumplings Sichuan Chengdu', '钟水饺 成都'], color: '#E64A19' },
  285: { kw: ['Sichuan pepper chicken Chengdu', '花椒鸡 成都 天府'], color: '#F57C00' },

  // 西安
  286: { kw: ['Yangrou Paomo lamb soup Xi\'an Muslim', '羊肉泡馍 回民街 西安'], color: '#8D6E63' },
  287: { kw: ['Jiasan soup dumplings Xi\'an', '贾三灌汤包 西安'], color: '#FF8F00' },
  288: { kw: ['Tongshengxiang Paomo Xi\'an Muslim', '同盛祥 羊肉泡馍 西安'], color: '#795548' },
  289: { kw: ['Laomi Paomo Xi\'an halal', '老米家泡馍 西安 清真'], color: '#6D4C41' },

  // 杭州
  269: { kw: ['Zhiweiguan Hangzhou cuisine', '知味观 杭州'], color: '#43A047' },
  290: { kw: ['Louwailou West Lake Hangzhou cuisine', '楼外楼 杭州 西湖'], color: '#2E7D32' },
  291: { kw: ['Xinrongji Hangzhou fine dining', '新荣记 杭州'], color: '#FF6F00' },
  292: { kw: ['West Lake crayfish Hangzhou', '杭州小龙虾'], color: '#D84315' },

  // 桂林
  293: { kw: ['Guilin rice noodles Guangxi', '桂林米粉 广西'], color: '#FF8F00' },
  294: { kw: ['Lijiang fish hot pot Guilin', '漓江啤酒鱼 桂林'], color: '#E64A19' },

  // 云南
  295: { kw: ['Crossing Bridge noodles Yunnan', '过桥米线 云南'], color: '#FFC107' },
  296: { kw: ['Naxi grilled fish Lijiang Yunnan', '纳西烤鱼 丽江'], color: '#F57C00' },

  // 南京
  297: { kw: ['Duck blood soup Nanjing street food', '鸭血粉丝汤 南京'], color: '#795548' },
  298: { kw: ['Nanjing salted duck traditional', '盐水鸭 南京'], color: '#FF8F00' },

  // 重庆
  299: { kw: ['Chongqing spicy noodles street food', '重庆小面 麻辣'], color: '#D84315' },
  300: { kw: ['Chongqing hot pot nine square grid', '九宫格火锅 重庆'], color: '#D32F2F' },
};

// ─── HTTP 请求封装 ─────────────────────────────────────
function httpGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'Authorization': `Client-ID ${ACCESS_KEY}` } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { reject(new Error(`Parse error: ${data.slice(0, 200)}`)); }
      });
    }).on('error', reject);
  });
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400) {
        // 跟随重定向
        https.get(res.headers.location, (r2) => {
          r2.pipe(file);
          file.on('finish', () => { file.close(); resolve(); });
        }).on('error', reject);
      } else {
        res.pipe(file);
        file.on('finish', () => { file.close(); resolve(); });
      }
    }).on('error', reject);
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─── 主流程 ────────────────────────────────────────────
async function main() {
  if (!ACCESS_KEY) {
    console.error('❌ 缺少 UNSPLASH_ACCESS_KEY');
    console.error('   请在 src/backend/.env 中添加: UNSPLASH_ACCESS_KEY=你的key');
    console.error('   获取免费 Key: https://unsplash.com/developers (注册即得, 50次/小时)');
    process.exit(1);
  }

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const ids = Object.keys(SPOT_KEYWORDS).map(Number);
  let downloaded = 0;
  let failed = 0;
  const results = [];

  console.log(`🎯 开始下载 ${ids.length} 个景点的图片...\n`);

  for (const id of ids) {
    const { kw } = SPOT_KEYWORDS[id];
    const destPath = path.join(OUTPUT_DIR, `${id}.jpg`);

    // 如果已存在本地文件，跳过
    if (fs.existsSync(destPath)) {
      console.log(`⏭  id=${id} 已存在，跳过`);
      results.push({ id, status: 'skipped' });
      continue;
    }

    // 依次尝试每个关键词，直到找到结果
    let imageUrl = null;
    for (const keyword of kw) {
      try {
        const searchUrl = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(keyword)}&per_page=3&orientation=landscape`;
        const data = await httpGet(searchUrl);

        if (data.errors) {
          console.error(`  ⚠ API 错误 (${keyword}): ${data.errors.join(', ')}`);
          continue;
        }

        if (data.results && data.results.length > 0) {
          // 取第一张匹配图片的 raw URL，加上尺寸参数
          imageUrl = data.results[0].urls.raw + '&w=1200&q=85&fit=max';
          const desc = data.results[0].alt_description || keyword;
          console.log(`📸 id=${id} 匹配: "${keyword}" → ${desc.slice(0, 60)}`);
          break;
        }
      } catch (err) {
        console.error(`  ⚠ 搜索失败 (${keyword}): ${err.message}`);
      }
      await sleep(300); // 避免触发限速
    }

    if (!imageUrl) {
      console.warn(`❌ id=${id} 未找到匹配图片`);
      results.push({ id, status: 'not_found' });
      failed++;
      continue;
    }

    // 下载图片
    try {
      await downloadFile(imageUrl, destPath);
      console.log(`  ✅ 已保存 → ${destPath}`);
      results.push({ id, status: 'downloaded' });
      downloaded++;
    } catch (err) {
      console.error(`  ❌ 下载失败: ${err.message}`);
      results.push({ id, status: 'download_failed' });
      failed++;
    }

    // Unsplash 免费额度 50次/小时，安全间隔
    await sleep(1200);
  }

  // ─── 更新 spots.js 中的 imageUrl 为本地路径 ───────
  console.log('\n📝 更新 spots.js 中的图片路径...');
  let src = fs.readFileSync(SPOTS_FILE, 'utf-8');

  for (const { id, status } of results) {
    if (status !== 'downloaded' && status !== 'skipped') continue;
    const localPath = `/images/spots/${id}.jpg`;
    // 替换现有的 imageUrl (CDN地址 → 本地路径)
    const regex = new RegExp(
      `(id:\\s*${id}\\b[^}]*?imageUrl:\\s*)'[^']*'`,
      's'
    );
    if (regex.test(src)) {
      src = src.replace(regex, `$1'${localPath}'`);
    }
  }

  fs.writeFileSync(SPOTS_FILE, src, 'utf-8');
  console.log('✅ spots.js 已更新');

  // 汇总
  console.log(`\n${'='.repeat(50)}`);
  console.log(`📊 汇总: 下载 ${downloaded} | 跳过 ${results.filter(r => r.status === 'skipped').length} | 失败 ${failed}`);
  console.log(`📁 图片位置: ${OUTPUT_DIR}`);
  console.log(`\n💡 下一步:`);
  console.log(`   1. 检查图片是否准确 (cd ${OUTPUT_DIR} && open .)`);
  console.log(`   2. 若不满意某张图，可手动替换同路径同名文件`);
  console.log(`   3. 运行 npm run init-db && npm run seed-db 重建数据库`);
}

main().catch(err => { console.error(err); process.exit(1); });
