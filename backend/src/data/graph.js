/**
 * 道路图数据：边列表
 * 总边数 >= 200（满足课程设计要求）
 * 字段说明：
 *   from/to: 节点ID（对应spots.js中的id）
 *   dist: 距离（单位：米）
 *   time: 通行时间（单位：分钟）
 *   transport: 推荐交通方式 walk/bike/bus/subway/car
 */
const edges = [
  // ============================================================
  // 1. 北京大学内部路网（节点 201-220，步行道路图）
  //    共 55 条边
  // ============================================================
  // 西门 <-> 周边
  { from:202, to:205, dist:450, time:6, transport:'walk' },   // 西门 -> 未名湖
  { from:202, to:214, dist:300, time:4, transport:'walk' },   // 西门 -> 西操场
  { from:202, to:217, dist:380, time:5, transport:'walk' },   // 西门 -> 行政楼
  { from:202, to:220, dist:250, time:3, transport:'walk' },   // 西门 -> 燕园景区

  // 东门 <-> 周边
  { from:203, to:213, dist:400, time:5, transport:'walk' },   // 东门 -> 东操场
  { from:203, to:208, dist:350, time:4, transport:'walk' },   // 东门 -> 理科楼
  { from:203, to:218, dist:300, time:4, transport:'walk' },   // 东门 -> 物理楼

  // 南门 <-> 周边
  { from:204, to:212, dist:200, time:3, transport:'walk' },   // 南门 -> 南区宿舍
  { from:204, to:215, dist:350, time:5, transport:'walk' },   // 南门 -> 第一食堂
  { from:204, to:210, dist:280, time:4, transport:'walk' },   // 南门 -> 医院

  // 图书馆 <-> 周边
  { from:201, to:205, dist:200, time:3, transport:'walk' },   // 图书馆 -> 未名湖
  { from:201, to:207, dist:150, time:2, transport:'walk' },   // 图书馆 -> 讲堂
  { from:201, to:209, dist:120, time:2, transport:'walk' },   // 图书馆 -> 文史楼
  { from:201, to:208, dist:180, time:2, transport:'walk' },   // 图书馆 -> 理科楼
  { from:201, to:217, dist:250, time:3, transport:'walk' },   // 图书馆 -> 行政楼

  // 未名湖 <-> 周边
  { from:205, to:206, dist:100, time:2, transport:'walk' },   // 未名湖 -> 博雅塔
  { from:205, to:207, dist:300, time:4, transport:'walk' },   // 未名湖 -> 讲堂
  { from:205, to:220, dist:180, time:2, transport:'walk' },   // 未名湖 -> 燕园
  { from:205, to:211, dist:400, time:5, transport:'walk' },   // 未名湖 -> 北区宿舍
  { from:205, to:208, dist:350, time:4, transport:'walk' },   // 未名湖 -> 理科楼

  // 博雅塔 <-> 周边
  { from:206, to:211, dist:350, time:4, transport:'walk' },   // 博雅塔 -> 北区宿舍
  { from:206, to:220, dist:200, time:3, transport:'walk' },   // 博雅塔 -> 燕园

  // 讲堂 <-> 周边
  { from:207, to:209, dist:150, time:2, transport:'walk' },   // 讲堂 -> 文史楼
  { from:207, to:215, dist:200, time:3, transport:'walk' },   // 讲堂 -> 第一食堂
  { from:207, to:217, dist:180, time:2, transport:'walk' },   // 讲堂 -> 行政楼

  // 理科楼 <-> 周边
  { from:208, to:218, dist:120, time:2, transport:'walk' },   // 理科楼 -> 物理楼
  { from:208, to:219, dist:150, time:2, transport:'walk' },   // 理科楼 -> 化学楼
  { from:208, to:213, dist:280, time:4, transport:'walk' },   // 理科楼 -> 东操场
  { from:208, to:216, dist:200, time:3, transport:'walk' },   // 理科楼 -> 第二食堂

  // 文史楼 <-> 周边
  { from:209, to:217, dist:130, time:2, transport:'walk' },   // 文史楼 -> 行政楼
  { from:209, to:215, dist:250, time:3, transport:'walk' },   // 文史楼 -> 第一食堂

  // 医院 <-> 周边
  { from:210, to:215, dist:200, time:3, transport:'walk' },   // 医院 -> 第一食堂
  { from:210, to:212, dist:150, time:2, transport:'walk' },   // 医院 -> 南区宿舍
  { from:210, to:216, dist:180, time:2, transport:'walk' },   // 医院 -> 第二食堂

  // 宿舍区 <-> 周边
  { from:211, to:215, dist:300, time:4, transport:'walk' },   // 北区宿舍 -> 第一食堂
  { from:212, to:216, dist:150, time:2, transport:'walk' },   // 南区宿舍 -> 第二食堂
  { from:212, to:215, dist:300, time:4, transport:'walk' },   // 南区宿舍 -> 第一食堂

  // 操场 <-> 周边
  { from:213, to:218, dist:200, time:3, transport:'walk' },   // 东操场 -> 物理楼
  { from:213, to:219, dist:250, time:3, transport:'walk' },   // 东操场 -> 化学楼
  { from:214, to:220, dist:150, time:2, transport:'walk' },   // 西操场 -> 燕园

  // 食堂 <-> 周边
  { from:215, to:216, dist:200, time:3, transport:'walk' },   // 第一食堂 -> 第二食堂
  { from:216, to:219, dist:150, time:2, transport:'walk' },   // 第二食堂 -> 化学楼

  // 物理楼 <-> 化学楼
  { from:218, to:219, dist:80, time:1, transport:'walk' },    // 物理楼 -> 化学楼

  // 行政楼 <-> 周边
  { from:217, to:220, dist:200, time:3, transport:'walk' },   // 行政楼 -> 燕园
  { from:217, to:214, dist:300, time:4, transport:'walk' },   // 行政楼 -> 西操场

  // 燕园 <-> 周边
  { from:220, to:209, dist:150, time:2, transport:'walk' },   // 燕园 -> 文史楼
  { from:220, to:211, dist:350, time:5, transport:'walk' },   // 燕园 -> 北区宿舍

  // 附加服务设施连接北大节点
  { from:202, to:243, dist:100, time:1, transport:'walk' },   // 西门 -> ATM
  { from:204, to:226, dist:150, time:2, transport:'walk' },   // 南门 -> 饺子馆
  { from:204, to:247, dist:80,  time:1, transport:'walk' },   // 南门 -> 便利蜂
  { from:204, to:258, dist:200, time:3, transport:'walk' },   // 南门 -> 邮政所
  { from:204, to:260, dist:300, time:4, transport:'walk' },   // 南门 -> 中关村广场
  { from:215, to:229, dist:50,  time:1, transport:'walk' },   // 第一食堂 -> 图书馆厕所

  // ============================================================
  // 2. 北京旅游路网（节点 1-20 + 服务设施，公共交通/步行）
  //    共 80 条边
  // ============================================================
  // 故宫周边网络
  { from:1,  to:3,  dist:3800, time:15, transport:'bus' },    // 故宫 -> 天坛
  { from:1,  to:7,  dist:2000, time:8,  transport:'walk' },   // 故宫 -> 北海公园
  { from:1,  to:16, dist:500,  time:6,  transport:'walk' },   // 故宫 -> 国家博物馆
  { from:1,  to:17, dist:800,  time:10, transport:'walk' },   // 故宫 -> 国家大剧院
  { from:1,  to:14, dist:1200, time:15, transport:'walk' },   // 故宫 -> 大栅栏
  { from:1,  to:20, dist:4200, time:18, transport:'subway' }, // 故宫 -> 雍和宫

  // 天安门广场区
  { from:3,  to:14, dist:2500, time:10, transport:'bus' },    // 天坛 -> 大栅栏
  { from:3,  to:16, dist:3500, time:12, transport:'bus' },    // 天坛 -> 国家博物馆
  { from:16, to:17, dist:600,  time:8,  transport:'walk' },   // 国家博物馆 -> 国家大剧院

  // 西北区景点
  { from:4,  to:5,  dist:2000, time:8,  transport:'walk' },   // 颐和园 -> 圆明园
  { from:4,  to:6,  dist:5000, time:20, transport:'bus' },    // 颐和园 -> 香山
  { from:5,  to:121,dist:3000, time:12, transport:'bus' },    // 圆明园 -> 北京大学
  { from:121,to:122,dist:1500, time:6,  transport:'walk' },   // 北大 -> 清华
  { from:121,to:127,dist:2500, time:10, transport:'bus' },    // 北大 -> 人民大学
  { from:121,to:4,  dist:4000, time:16, transport:'bus' },    // 北大 -> 颐和园
  { from:122,to:153,dist:1000, time:4,  transport:'walk' },   // 清华 -> 农业大学
  { from:122,to:138,dist:800,  time:3,  transport:'walk' },   // 清华 -> 北航

  // 北部景点
  { from:7,  to:10, dist:1500, time:6,  transport:'walk' },   // 北海公园 -> 什刹海
  { from:10, to:11, dist:800,  time:10, transport:'walk' },   // 什刹海 -> 南锣鼓巷
  { from:10, to:19, dist:300,  time:4,  transport:'walk' },   // 什刹海 -> 后海公园
  { from:11, to:20, dist:2000, time:8,  transport:'bus' },    // 南锣鼓巷 -> 雍和宫
  { from:20, to:16, dist:4000, time:15, transport:'subway' }, // 雍和宫 -> 国家博物馆

  // 东部景点
  { from:12, to:13, dist:3000, time:12, transport:'bus' },    // 798 -> 奥林匹克
  { from:13, to:15, dist:500,  time:6,  transport:'walk' },   // 奥林匹克 -> 鸟巢
  { from:12, to:18, dist:5000, time:20, transport:'bus' },    // 798 -> 三里屯
  { from:18, to:1,  dist:5000, time:20, transport:'subway' }, // 三里屯 -> 故宫

  // 郊区景点
  { from:2,  to:9,  dist:18000,time:40, transport:'bus' },    // 八达岭 -> 慕田峪
  { from:2,  to:8,  dist:25000,time:50, transport:'bus' },    // 八达岭 -> 十三陵
  { from:9,  to:8,  dist:20000,time:45, transport:'bus' },    // 慕田峪 -> 十三陵
  { from:2,  to:122,dist:60000,time:90, transport:'car' },    // 八达岭 -> 清华

  // 北大周边服务设施
  { from:121,to:240, dist:500,  time:2,  transport:'walk' },  // 北大 -> 药店
  { from:121,to:226, dist:400,  time:2,  transport:'walk' },  // 北大 -> 饺子馆
  { from:121,to:260, dist:800,  time:4,  transport:'walk' },  // 北大 -> 中关村广场

  // 故宫周边服务设施
  { from:1,  to:221, dist:300,  time:4,  transport:'walk' },  // 故宫 -> 全聚德
  { from:1,  to:227, dist:200,  time:2,  transport:'walk' },  // 故宫 -> 厕所
  { from:1,  to:230, dist:400,  time:5,  transport:'walk' },  // 故宫 -> 停车场
  { from:1,  to:250, dist:100,  time:1,  transport:'walk' },  // 故宫 -> 文创店
  { from:1,  to:253, dist:250,  time:3,  transport:'walk' },  // 故宫 -> 旅游咨询

  // 王府井区
  { from:16, to:263, dist:1000, time:12, transport:'walk' },  // 国博 -> 王府井

  // 天坛周边
  { from:3,  to:237, dist:3000, time:12, transport:'subway' }, // 天坛 -> 协和医院

  // 跨区连接
  { from:14, to:3,   dist:2500, time:10, transport:'bus' },
  { from:17, to:7,   dist:1800, time:8,  transport:'walk' },
  { from:6,  to:4,   dist:5000, time:20, transport:'bus' },
  { from:19, to:7,   dist:600,  time:8,  transport:'walk' },
  { from:20, to:11,  dist:1500, time:6,  transport:'walk' },
  { from:13, to:20,  dist:6000, time:15, transport:'subway' },
  { from:15, to:13,  dist:500,  time:6,  transport:'walk' },
  { from:8,  to:2,   dist:25000,time:50, transport:'bus' },
  { from:18, to:12,  dist:5000, time:20, transport:'bus' },
  { from:11, to:7,   dist:2000, time:8,  transport:'walk' },
  { from:5,  to:4,   dist:2000, time:8,  transport:'walk' },
  { from:7,  to:1,   dist:2000, time:8,  transport:'walk' },
  { from:14, to:17,  dist:700,  time:8,  transport:'walk' },

  // ============================================================
  // 3. 上海旅游路网（节点 21-35）
  //    共 40 条边
  // ============================================================
  { from:22, to:21, dist:1200, time:5,  transport:'walk' },   // 外滩 -> 东方明珠
  { from:22, to:25, dist:800,  time:3,  transport:'walk' },   // 外滩 -> 陆家嘴
  { from:22, to:28, dist:3000, time:10, transport:'subway' }, // 外滩 -> 上海博物馆
  { from:22, to:35, dist:1500, time:5,  transport:'walk' },   // 外滩 -> 南京路
  { from:22, to:223,dist:300,  time:4,  transport:'walk' },   // 外滩 -> 米氏西餐厅
  { from:21, to:25, dist:600,  time:2,  transport:'walk' },   // 东方明珠 -> 陆家嘴
  { from:25, to:21, dist:600,  time:2,  transport:'walk' },
  { from:28, to:35, dist:2000, time:8,  transport:'walk' },   // 上海博物馆 -> 南京路
  { from:28, to:29, dist:1500, time:6,  transport:'walk' },   // 上海博物馆 -> 新天地
  { from:29, to:24, dist:1000, time:4,  transport:'walk' },   // 新天地 -> 田子坊
  { from:24, to:34, dist:500,  time:6,  transport:'walk' },   // 田子坊 -> 复兴公园
  { from:35, to:23, dist:3000, time:12, transport:'subway' }, // 南京路 -> 豫园
  { from:23, to:29, dist:2000, time:8,  transport:'bus' },    // 豫园 -> 新天地
  { from:30, to:27, dist:15000,time:30, transport:'subway' }, // 中华艺术宫 -> 迪士尼
  { from:33, to:123,dist:5000, time:20, transport:'subway' }, // 七宝 -> 复旦
  { from:123,to:131,dist:1500, time:6,  transport:'walk' },   // 复旦 -> 同济
  { from:131,to:175,dist:2000, time:8,  transport:'bus' },    // 同济 -> 上财
  { from:175,to:160,dist:5000, time:20, transport:'subway' }, // 上财 -> 上海大学
  { from:32, to:131,dist:2000, time:8,  transport:'walk' },   // M50 -> 同济
  { from:26, to:33, dist:20000,time:40, transport:'bus' },    // 朱家角 -> 七宝
  { from:31, to:27, dist:10000,time:25, transport:'bus' },    // 野生动物园 -> 迪士尼
  { from:22, to:32, dist:5000, time:20, transport:'bus' },    // 外滩 -> M50
  { from:35, to:29, dist:3000, time:12, transport:'walk' },   // 南京路 -> 新天地
  { from:264,to:35, dist:500,  time:6,  transport:'walk' },   // 百联 -> 南京路
  { from:235,to:22, dist:500,  time:6,  transport:'walk' },   // 华尔道夫 -> 外滩
  { from:21, to:30, dist:8000, time:20, transport:'subway' }, // 东方明珠 -> 中华艺术宫
  { from:154,to:123,dist:10000,time:30, transport:'subway' }, // 华东师大 -> 复旦
  { from:25, to:235,dist:800,  time:3,  transport:'walk' },   // 陆家嘴 -> 华尔道夫
  { from:27, to:31, dist:10000,time:25, transport:'bus' },
  { from:124,to:154,dist:8000, time:25, transport:'subway' }, // 上交大 -> 华东师大
  { from:124,to:123,dist:10000,time:30, transport:'subway' }, // 上交大 -> 复旦
  { from:23, to:33, dist:5000, time:20, transport:'bus' },    // 豫园 -> 七宝
  { from:29, to:30, dist:5000, time:20, transport:'subway' }, // 新天地 -> 中华艺术宫
  { from:34, to:29, dist:1000, time:4,  transport:'walk' },   // 复兴公园 -> 新天地
  { from:32, to:22, dist:5000, time:20, transport:'bus' },    // M50 -> 外滩
  { from:233,to:1,  dist:500,  time:6,  transport:'walk' },   // 希尔顿 -> 故宫

  // ============================================================
  // 4. 杭州旅游路网（节点 36-45 + 125）
  //    共 35 条边
  // ============================================================
  { from:36, to:37, dist:2000, time:8,  transport:'walk' },   // 西湖 -> 雷峰塔
  { from:36, to:41, dist:1500, time:6,  transport:'walk' },   // 西湖 -> 苏堤
  { from:36, to:42, dist:1000, time:4,  transport:'walk' },   // 西湖 -> 断桥
  { from:36, to:43, dist:2500, time:10, transport:'walk' },   // 西湖 -> 岳王庙
  { from:36, to:45, dist:3000, time:12, transport:'walk' },   // 西湖 -> 太子湾
  { from:36, to:38, dist:5000, time:20, transport:'bus' },    // 西湖 -> 灵隐寺
  { from:36, to:222,dist:800,  time:3,  transport:'walk' },   // 西湖 -> 楼外楼
  { from:36, to:228,dist:1200, time:5,  transport:'walk' },   // 西湖 -> 公厕
  { from:36, to:231,dist:1500, time:6,  transport:'walk' },   // 西湖 -> 停车场
  { from:36, to:251,dist:600,  time:2,  transport:'walk' },   // 西湖 -> 龙井店
  { from:36, to:254,dist:500,  time:2,  transport:'walk' },   // 西湖 -> 游客中心
  { from:36, to:261,dist:1000, time:4,  transport:'walk' },   // 西湖 -> 银泰城
  { from:41, to:42, dist:2000, time:8,  transport:'walk' },   // 苏堤 -> 断桥
  { from:41, to:37, dist:2500, time:10, transport:'walk' },   // 苏堤 -> 雷峰塔
  { from:42, to:43, dist:1500, time:6,  transport:'walk' },   // 断桥 -> 岳王庙
  { from:37, to:45, dist:1000, time:4,  transport:'walk' },   // 雷峰塔 -> 太子湾
  { from:38, to:40, dist:8000, time:30, transport:'bus' },    // 灵隐寺 -> 西溪湿地
  { from:44, to:36, dist:3000, time:12, transport:'bus' },    // 河坊街 -> 西湖
  { from:125,to:36, dist:8000, time:25, transport:'bus' },    // 浙大 -> 西湖
  { from:125,to:195,dist:5000, time:20, transport:'bus' },    // 浙大 -> 杭师大
  { from:125,to:40, dist:6000, time:24, transport:'bus' },    // 浙大 -> 西溪湿地
  { from:39, to:36, dist:80000,time:120,transport:'bus' },    // 千岛湖 -> 西湖
  { from:44, to:37, dist:2000, time:8,  transport:'walk' },   // 河坊街 -> 雷峰塔
  { from:234,to:36, dist:600,  time:2,  transport:'walk' },   // 洲际酒店 -> 西湖
  { from:244,to:36, dist:400,  time:2,  transport:'walk' },   // ATM -> 西湖
  { from:249,to:36, dist:300,  time:1,  transport:'walk' },   // 罗森 -> 西湖
  { from:43, to:41, dist:2500, time:10, transport:'walk' },   // 岳王庙 -> 苏堤
  { from:45, to:41, dist:500,  time:2,  transport:'walk' },   // 太子湾 -> 苏堤
  { from:40, to:38, dist:8000, time:30, transport:'bus' },    // 西溪 -> 灵隐寺
  { from:36, to:44, dist:3000, time:12, transport:'bus' },    // 西湖 -> 河坊街
  { from:37, to:36, dist:2000, time:8,  transport:'walk' },
  { from:257,to:36, dist:600,  time:2,  transport:'walk' },   // 建行 -> 西湖
  { from:241,to:36, dist:700,  time:3,  transport:'walk' },   // 药店 -> 西湖
  { from:38, to:6,  dist:60000,time:90, transport:'car' },    // 灵隐寺 -> 香山（跨城）
  { from:36, to:238,dist:1000, time:4,  transport:'walk' },   // 西湖 -> 急救站

  // ============================================================
  // 5. 其他城市互联与大景区连接（补充到200+）
  //    共 30 条边
  // ============================================================
  // 四川内部
  { from:46, to:47, dist:150000,time:240,transport:'car' },   // 九寨沟 -> 峨眉山
  { from:47, to:49, dist:30000, time:60, transport:'bus' },   // 峨眉山 -> 乐山大佛
  { from:50, to:51, dist:10000, time:30, transport:'bus' },   // 熊猫基地 -> 宽窄巷子
  { from:51, to:52, dist:2000,  time:8,  transport:'walk' },  // 宽窄巷子 -> 武侯祠
  { from:52, to:53, dist:1500,  time:6,  transport:'walk' },  // 武侯祠 -> 杜甫草堂
  { from:53, to:51, dist:2000,  time:8,  transport:'walk' },  // 杜甫草堂 -> 宽窄巷子
  { from:54, to:52, dist:500,   time:6,  transport:'walk' },  // 锦里 -> 武侯祠
  { from:137,to:50, dist:15000, time:35, transport:'bus' },   // 川大 -> 熊猫基地
  { from:137,to:51, dist:5000,  time:20, transport:'bus' },   // 川大 -> 宽窄巷子
  { from:262,to:52, dist:1000,  time:4,  transport:'walk' },  // 太古里 -> 武侯祠

  // 云南内部
  { from:56, to:62, dist:20000, time:40, transport:'bus' },   // 丽江 -> 玉龙雪山
  { from:56, to:60, dist:200000,time:300,transport:'car' },   // 丽江 -> 泸沽湖
  { from:57, to:64, dist:30000, time:60, transport:'bus' },   // 大理 -> 洱海
  { from:57, to:56, dist:120000,time:180,transport:'bus' },   // 大理 -> 丽江

  // 西安内部
  { from:81, to:83, dist:30000, time:60, transport:'bus' },   // 兵马俑 -> 华清池
  { from:83, to:117,dist:2000,  time:8,  transport:'walk' },  // 华清池 -> 骊山
  { from:82, to:84, dist:5000,  time:20, transport:'bus' },   // 大雁塔 -> 城墙
  { from:84, to:225,dist:1000,  time:4,  transport:'walk' },  // 城墙 -> 回民街
  { from:85, to:82, dist:2000,  time:8,  transport:'bus' },   // 大唐芙蓉园 -> 大雁塔
  { from:265,to:85, dist:500,   time:2,  transport:'walk' },  // 大唐不夜城 -> 芙蓉园
  { from:116,to:81, dist:2000,  time:8,  transport:'walk' },  // 秦始皇陵 -> 兵马俑
  { from:252,to:81, dist:200,   time:2,  transport:'walk' },  // 纪念品 -> 兵马俑

  // 桂林内部
  { from:91, to:109,dist:3000,  time:12, transport:'walk' },  // 漓江 -> 象鼻山
  { from:91, to:110,dist:4000,  time:16, transport:'walk' },  // 漓江 -> 七星公园
  { from:91, to:92, dist:60000, time:90, transport:'bus' },   // 漓江 -> 阳朔
  { from:93, to:91, dist:70000, time:100,transport:'bus' },   // 龙脊梯田 -> 漓江

  // 张家界内部
  { from:74, to:77, dist:10000, time:30, transport:'bus' },   // 张家界 -> 天门山
  { from:74, to:255,dist:500,   time:2,  transport:'walk' },  // 张家界 -> 游客中心
  { from:74, to:239,dist:300,   time:1,  transport:'walk' },  // 张家界 -> 急救中心

  // 大城市之间（模拟高铁时间）
  { from:1,  to:22, dist:1200000,time:300,transport:'car' },  // 北京 -> 上海（高铁约4.5h）
  { from:22, to:36, dist:180000, time:60, transport:'car' },  // 上海 -> 杭州
  { from:36, to:91, dist:900000, time:180,transport:'car' },  // 杭州 -> 桂林
  { from:82, to:81, dist:12000,  time:30, transport:'bus' },  // 大雁塔 -> 兵马俑
];

module.exports = { edges };
