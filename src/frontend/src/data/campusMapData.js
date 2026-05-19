import fullRoadNetwork from './campus_road_network_full.json';

export const CAMPUS_MAP_SIZE = {
  width: 1280,
  height: 914,
};

const SOURCE_FRAME = {
  x: 56,
  y: 106,
  width: 1168,
  height: 729,
};

const SOURCE_NETWORK_SIZE = fullRoadNetwork.mapInfo.coordinateSystem;

const SCALE_X = SOURCE_FRAME.width / SOURCE_NETWORK_SIZE.width;
const SCALE_Y = SOURCE_FRAME.height / SOURCE_NETWORK_SIZE.height;

const SELECTABLE_NODE_TYPES = new Set(['gate', 'location_access']);

const NON_WALKABLE_EDGE_IDS = new Set([
  'e_lake_bypass_1',
  'e_lake_bypass_2',
  'e_lake_bypass_3',
  'e_lake_bypass_4',
  'e_lake_bypass_5',
  'e_lake_bypass_6',
]);

const LOCATION_LABELS = {
  n_west_gate: '西门',
  n_south_gate: '南门',
  n_express_station_access: '快递站',
  n_construction_office_access: '基建处',
  n_sports_field_access: '运动场',
  n_dorm_yabei_access: '学生公寓（雁北园）',
  n_dorm_yannan_access: '学生公寓（雁南园）',
  n_flavor_cafeteria_access: '风味餐厅',
  n_staff_cafeteria_access: '教工餐厅',
  n_admin_office_access: '综合办公楼',
  n_activity_center_access: '学生活动中心',
  n_medical_room_access: '医务室',
  n_library_access_south: '图书馆南侧入口',
  n_library_access_east: '图书馆东侧入口',
  n_east_support_access: '东配楼',
  n_college_building_access: '学院楼',
  n_netsec_college_access: '网络空间安全学院',
  n_digital_art_college_access: '数字媒体与设计艺术学院',
  n_post_auto_college_access: '现代邮政学院/自动化学院',
  n_public_teaching_access: '公共教学楼',
  n_lab_complex_access: '教学实验综合楼',
  n_report_hall_access: '报告厅',
  n_s1_access: '智慧教学楼 S1',
  n_s2_marx_access: 'S2/马克思主义学院',
  n_humanities_access: '人文学院',
  n_s3_engineering_access: 'S3/工程实验楼',
  n_science_college_access: '理学院',
  n_student_cafeteria_access: '学生餐厅',
  n_long_term_project_access: '远期规划项目',
};

const NODE_COORD_OVERRIDES = {
  n_express_station_access: [102, 366],
  n_construction_office_access: [102, 392],
  n_sports_field_access: [286, 350],
  n_dorm_yabei_access: [420, 224],
  n_dorm_yannan_access: [420, 585],
  n_flavor_cafeteria_access: [560, 194],
  n_staff_cafeteria_access: [560, 314],
  n_admin_office_access: [684, 195],
  n_activity_center_access: [684, 314],
  n_medical_room_access: [682, 124],
  n_library_access_south: [865, 365],
  n_library_access_east: [974, 318],
  n_library_cafe_access: [970, 404],
  n_east_support_access: [975, 198],
  n_college_building_access: [1095, 320],
  n_netsec_college_access: [1095, 210],
  n_digital_art_college_access: [1075, 365],
  n_post_auto_college_access: [1138, 345],
  n_public_teaching_access: [625, 525],
  n_lab_complex_access: [875, 535],
  n_report_hall_access: [900, 520],
  n_s1_access: [1105, 488],
  n_humanities_access: [1138, 620],
  n_s2_marx_access: [1065, 610],
  n_s3_engineering_access: [1090, 670],
  n_science_college_access: [1105, 780],
  n_student_cafeteria_access: [575, 755],
  n_long_term_project_access: [915, 750],
  n_yabei_a_access: [388, 350],
  n_yabei_c_access: [438, 310],
  n_yabei_d1_access: [475, 300],
  n_yabei_d2_access: [475, 172],
  n_yabei_e_access: [420, 172],
  n_yannan_s1_access: [388, 492],
  n_yannan_s2_access: [438, 490],
  n_yannan_s3_access: [438, 570],
  n_yannan_s4_access: [438, 615],
  n_yannan_s5_access: [405, 675],
  n_yannan_s6_access: [438, 790],
  n_yannan_info_building_access: [388, 510],
  n_yannan_big_screen_access: [370, 458],
  n_activity_market_access: [675, 325],
  n_activity_service_hall_access: [705, 325],
  n_activity_bluepost_ai_access: [675, 350],
};

function toImagePoint([x, y]) {
  return {
    x: Math.round(SOURCE_FRAME.x + x * SCALE_X),
    y: Math.round(SOURCE_FRAME.y + y * SCALE_Y),
  };
}

function resolveNodePoint(node) {
  const override = NODE_COORD_OVERRIDES[node.id];
  if (override) return { x: override[0], y: override[1] };
  return toImagePoint(node.coord);
}

function labelForNetworkNode(node) {
  if (LOCATION_LABELS[node.id]) return LOCATION_LABELS[node.id];
  if (node.type === 'gate') return node.id === 'n_west_gate' ? '西门' : '南门';
  if (node.name) return node.name;
  return node.id;
}

export const campusAreas = [
  {
    id: 'planned-north-west',
    label: '规划\n待建\n区域',
    kind: 'planned',
    polygon: [[76, 116], [326, 116], [326, 144], [194, 144], [194, 348], [76, 348]],
  },
  {
    id: 'sports-area',
    label: '运动场',
    kind: 'field',
    polygon: [[194, 157], [323, 157], [323, 351], [194, 351]],
  },
  {
    id: 'planned-south-west',
    label: '规划待建区域',
    kind: 'planned',
    polygon: [[80, 486], [323, 486], [334, 496], [334, 813], [80, 813]],
  },
  {
    id: 'center-water',
    label: '',
    kind: 'water',
    polygon: [[637, 622], [696, 646], [761, 638], [819, 617], [875, 626], [847, 666], [773, 664], [704, 682], [638, 660]],
  },
  {
    id: 'long-term-project',
    label: '远期规划项目',
    kind: 'planned',
    polygon: [[849, 716], [981, 716], [981, 777], [849, 777]],
  },
  { id: 'top-green-west', label: '', kind: 'green', x: 367, y: 116, width: 108, height: 14, rx: 0 },
  { id: 'top-green-mid', label: '', kind: 'green', x: 772, y: 116, width: 432, height: 14, rx: 0 },
  { id: 'west-green-bar', label: '', kind: 'green', x: 76, y: 438, width: 248, height: 36, rx: 0 },
  { id: 'dorm-north-green', label: '', kind: 'green', x: 368, y: 383, width: 108, height: 34, rx: 0 },
  { id: 'canteen-green', label: '', kind: 'green', x: 514, y: 383, width: 94, height: 34, rx: 0 },
  { id: 'activity-green', label: '', kind: 'green', x: 635, y: 383, width: 94, height: 34, rx: 0 },
  { id: 'south-green-west', label: '', kind: 'green', x: 512, y: 625, width: 124, height: 63, rx: 0 },
  { id: 'south-green-mid', label: '', kind: 'green', x: 665, y: 710, width: 70, height: 106, rx: 0 },
  { id: 'south-green-east', label: '', kind: 'green', x: 866, y: 625, width: 124, height: 63, rx: 0 },
  { id: 'smart-green-s1', label: '', kind: 'green', x: 1076, y: 511, width: 60, height: 55, rx: 0 },
  { id: 'smart-green-s2', label: '', kind: 'green', x: 1078, y: 623, width: 58, height: 45, rx: 0 },
];

export const campusBuildings = [
  { id: 'student-dorm-north', label: '学生公寓\n雁北园', kind: 'dorm', polygon: [[367, 134], [486, 134], [486, 383], [367, 383]] },
  { id: 'student-dorm-south', label: '学生公寓\n雁南园', kind: 'dorm', polygon: [[361, 455], [476, 455], [476, 824], [361, 824]] },
  { id: 'flavor-canteen', label: '风味\n餐厅', kind: 'food', x: 515, y: 153, width: 91, height: 83 },
  { id: 'teacher-canteen', label: '教工\n餐厅', kind: 'food', x: 515, y: 271, width: 91, height: 83 },
  { id: 'student-canteen', label: '学生餐厅', kind: 'food', x: 512, y: 716, width: 130, height: 78 },
  { id: 'express-station-building', label: '快递站', kind: 'service', x: 70, y: 356, width: 56, height: 24 },
  { id: 'base-office-building', label: '基建处', kind: 'service', x: 70, y: 382, width: 56, height: 24 },
  { id: 'big-screen-room', label: '大屏幕', kind: 'service', x: 356, y: 438, width: 24, height: 45 },
  { id: 'information-building', label: '信息楼', kind: 'service', x: 356, y: 485, width: 24, height: 45 },
  { id: 'office-building', label: '综合\n办公楼', kind: 'office', x: 638, y: 151, width: 90, height: 84 },
  { id: 'activity-center', label: '学生\n活动\n中心', kind: 'service', x: 635, y: 271, width: 94, height: 84 },
  { id: 'medical-room-shape', label: '医务室', kind: 'service', x: 642, y: 116, width: 70, height: 20 },
  {
    id: 'library',
    label: '图书馆',
    kind: 'study',
    polygon: [[772, 203], [805, 178], [862, 167], [904, 177], [948, 188], [975, 224], [977, 270], [977, 384], [785, 384], [765, 334], [754, 249]],
  },
  {
    id: 'network-security',
    label: '网络空间安全学院',
    kind: 'college',
    polygon: [[1031, 157], [1199, 157], [1199, 244], [1160, 244], [1160, 193], [1066, 193], [1066, 222], [1031, 210]],
  },
  {
    id: 'academy-building-north',
    label: '学院楼',
    kind: 'college',
    polygon: [[1042, 252], [1110, 268], [1110, 308], [1042, 327]],
  },
  {
    id: 'digital-media',
    label: '数字媒体与\n设计艺术学院',
    kind: 'college',
    polygon: [[1042, 335], [1115, 335], [1115, 388], [1042, 388]],
  },
  {
    id: 'modern-post',
    label: '现代邮政学院',
    kind: 'college',
    polygon: [[1124, 310], [1199, 310], [1199, 386], [1124, 386]],
  },
  {
    id: 'public-teaching',
    label: '公共教学楼\n在建',
    kind: 'teaching',
    polygon: [[531, 457], [709, 457], [715, 565], [667, 590], [531, 590]],
  },
  {
    id: 'lab-building',
    label: '教学实验\n综合楼',
    kind: 'lab',
    polygon: [[789, 447], [963, 447], [963, 588], [789, 588], [789, 548], [889, 548], [889, 491], [789, 491]],
  },
  {
    id: 'report-hall',
    label: '报告厅',
    kind: 'lab',
    polygon: [[854, 493], [916, 493], [916, 548], [854, 548]],
  },
  {
    id: 'smart-teaching-s1-shape',
    label: '智慧教学楼\nS1',
    kind: 'teaching',
    polygon: [[1043, 448], [1170, 448], [1170, 493], [1076, 493], [1076, 509], [1043, 509]],
  },
  {
    id: 'smart-teaching-green',
    label: '',
    kind: 'green-building-yard',
    polygon: [[1076, 511], [1136, 511], [1136, 566], [1076, 566]],
  },
  {
    id: 'smart-teaching-s2-shape',
    label: '',
    kind: 'college',
    polygon: [[1042, 568], [1098, 568], [1098, 623], [1042, 623]],
  },
  {
    id: 'smart-teaching-s3-shape',
    label: 'S3\n工程实验楼',
    kind: 'lab',
    polygon: [[1043, 640], [1170, 640], [1170, 690], [1043, 690]],
  },
  {
    id: 'humanities-college',
    label: '人文\n学院',
    kind: 'college',
    polygon: [[1138, 526], [1170, 526], [1170, 640], [1138, 640]],
  },
  {
    id: 'marx-college',
    label: '马克思主义\n学院',
    kind: 'college',
    polygon: [[1042, 568], [1078, 568], [1078, 623], [1042, 623]],
  },
  {
    id: 'science-school',
    label: '理学院',
    kind: 'college',
    polygon: [[1041, 719], [1074, 719], [1074, 761], [1139, 761], [1139, 719], [1172, 719], [1172, 798], [1041, 798]],
  },
];

const legacyCampusNodes = [
  { id: 'west-gate', name: '西门', type: '校门', x: 62, y: 414 },
  { id: 'south-gate', name: '南门', type: '校门', x: 750, y: 830 },
  { id: 'medical-room', name: '医务室', type: '服务', x: 682, y: 124 },
  { id: 'express-station', name: '快递站', type: '服务', x: 100, y: 365 },
  { id: 'sports-field', name: '运动场', type: '运动', x: 326, y: 340 },
  { id: 'student-dorm-north', name: '学生公寓（雁北园）', type: '宿舍', x: 362, y: 258 },
  { id: 'student-dorm-south', name: '学生公寓（雁南园）', type: '宿舍', x: 476, y: 612 },
  { id: 'flavor-canteen', name: '风味餐厅', type: '餐饮', x: 512, y: 245 },
  { id: 'teacher-canteen', name: '教工餐厅', type: '餐饮', x: 512, y: 374 },
  { id: 'student-canteen', name: '学生餐厅', type: '餐饮', x: 642, y: 756 },
  { id: 'office-building', name: '综合办公楼', type: '办公', x: 682, y: 244 },
  { id: 'activity-center', name: '学生活动中心', type: '服务', x: 682, y: 374 },
  { id: 'library', name: '图书馆', type: '学习', x: 776, y: 342 },
  { id: 'public-teaching', name: '公共教学楼（在建）', type: '教学', x: 528, y: 525 },
  { id: 'lab-building', name: '教学实验综合楼', type: '实验', x: 790, y: 520 },
  { id: 'smart-teaching-s1', name: '智慧教学楼 S1', type: '教学', x: 1040, y: 510 },
  { id: 'smart-teaching-s2', name: '智慧教学楼 S2', type: '教学', x: 1040, y: 605 },
  { id: 'engineering-lab', name: '工程实验楼 S3', type: '实验', x: 1040, y: 682 },
  { id: 'network-security', name: '网络空间安全学院', type: '学院', x: 1030, y: 250 },
  { id: 'science-school', name: '理学院', type: '学院', x: 1040, y: 792 },

  { id: 'r-west-main', name: '西门路口', type: '道路', x: 76, y: 414, routingOnly: true },
  { id: 'r-main-1', name: '鸿雁路西段', type: '道路', x: 340, y: 414, routingOnly: true },
  { id: 'r-main-2', name: '宿舍路口', type: '道路', x: 488, y: 414, routingOnly: true },
  { id: 'r-main-2b', name: '食堂办公分隔路口', type: '道路', x: 626, y: 414, routingOnly: true },
  { id: 'r-main-3', name: '中心路口', type: '道路', x: 750, y: 414, routingOnly: true },
  { id: 'r-main-4', name: '图书馆东路口', type: '道路', x: 996, y: 414, routingOnly: true },
  { id: 'r-main-5', name: '学院主路口', type: '道路', x: 1215, y: 414, routingOnly: true },
  { id: 'r-north-1', name: '雁北园北路口', type: '道路', x: 340, y: 136, routingOnly: true },
  { id: 'r-north-2', name: '餐厅北路口', type: '道路', x: 488, y: 136, routingOnly: true },
  { id: 'r-north-2b', name: '食堂办公分隔路北口', type: '道路', x: 626, y: 136, routingOnly: true },
  { id: 'r-north-3', name: '办公楼北路口', type: '道路', x: 750, y: 136, routingOnly: true },
  { id: 'r-north-4', name: '图书馆北路口', type: '道路', x: 996, y: 136, routingOnly: true },
  { id: 'r-north-5', name: '学院北路口', type: '道路', x: 1215, y: 136, routingOnly: true },
  { id: 'r-south-1', name: '雁南园南路口', type: '道路', x: 488, y: 704, routingOnly: true },
  { id: 'r-south-2', name: '湖西路口', type: '道路', x: 750, y: 704, routingOnly: true },
  { id: 'r-south-3', name: '实验楼南路口', type: '道路', x: 996, y: 704, routingOnly: true },
  { id: 'r-south-4', name: '理学院南路口', type: '道路', x: 1215, y: 704, routingOnly: true },
  { id: 'r-gate-1', name: '南门中路口', type: '道路', x: 750, y: 830, routingOnly: true },
  { id: 'r-gate-2', name: '南三街东路口', type: '道路', x: 996, y: 830, routingOnly: true },
  { id: 'r-gate-3', name: '南三街学院路口', type: '道路', x: 1215, y: 830, routingOnly: true },
  { id: 'r-dorm-n-1', name: '雁北园入口', type: '道路', x: 362, y: 258, routingOnly: true },
  { id: 'r-dorm-n-inner-top', name: '雁北园内部北路', type: '道路', x: 448, y: 228, routingOnly: true },
  { id: 'r-dorm-n-inner-mid', name: '雁北园内部中路', type: '道路', x: 448, y: 322, routingOnly: true },
  { id: 'r-dorm-n-inner-south', name: '雁北园内部南路', type: '道路', x: 448, y: 414, routingOnly: true },
  { id: 'r-food-front-north', name: '风味餐厅门前路', type: '道路', x: 512, y: 246, routingOnly: true },
  { id: 'r-food-front-south', name: '教工餐厅门前路', type: '道路', x: 512, y: 374, routingOnly: true },
  { id: 'r-dorm-s-1', name: '雁南园入口', type: '道路', x: 476, y: 612, routingOnly: true },
  { id: 'r-library-south', name: '图书馆南门', type: '道路', x: 776, y: 390, routingOnly: true },
  { id: 'r-library-north-west', name: '图书馆北侧西口', type: '道路', x: 772, y: 136, routingOnly: true },
  { id: 'r-library-north-east', name: '图书馆北侧东口', type: '道路', x: 996, y: 136, routingOnly: true },
  { id: 'r-library-east', name: '图书馆东侧路', type: '道路', x: 996, y: 350, routingOnly: true },
  { id: 'r-public-west', name: '公教西门', type: '道路', x: 528, y: 525, routingOnly: true },
  { id: 'r-public-east', name: '公教东门', type: '道路', x: 750, y: 525, routingOnly: true },
  { id: 'r-east-1', name: 'S1 路口', type: '道路', x: 996, y: 510, routingOnly: true },
  { id: 'r-east-2', name: 'S2 路口', type: '道路', x: 996, y: 605, routingOnly: true },
  { id: 'r-east-3', name: 'S3 路口', type: '道路', x: 996, y: 682, routingOnly: true },
];

const legacyCampusEdges = [
  ['west-gate', 'r-west-main'], ['express-station', 'r-west-main'],
  ['r-west-main', 'r-main-1'], ['r-main-1', 'r-main-2'], ['r-main-2', 'r-main-2b'], ['r-main-2b', 'r-main-3'],
  ['r-main-3', 'r-main-4'], ['r-main-4', 'r-main-5'],
  ['r-north-1', 'r-north-2'], ['r-north-2', 'r-north-2b'], ['r-north-2b', 'r-north-3'], ['r-north-3', 'r-north-4'], ['r-north-4', 'r-north-5'],
  ['r-south-1', 'r-south-2'], ['r-south-2', 'r-south-3'], ['r-south-3', 'r-south-4'],
  ['r-gate-1', 'r-gate-2'], ['r-gate-2', 'r-gate-3'],
  ['r-north-1', 'r-main-1'], ['r-north-2', 'r-main-2'], ['r-north-2b', 'r-main-2b'], ['r-main-2', 'r-south-1'],
  ['r-north-3', 'r-main-3'], ['r-main-3', 'r-south-2'], ['r-south-2', 'r-gate-1'],
  ['r-north-4', 'r-main-4'], ['r-main-4', 'r-south-3'], ['r-south-3', 'r-gate-2'],
  ['r-north-5', 'r-main-5'], ['r-main-5', 'r-south-4'], ['r-south-4', 'r-gate-3'],
  ['south-gate', 'r-gate-1'],
  ['sports-field', 'r-main-1'], ['student-dorm-north', 'r-dorm-n-1'], ['r-dorm-n-1', 'r-main-1'],
  ['r-dorm-n-1', 'r-dorm-n-inner-top'], ['r-dorm-n-inner-top', 'r-dorm-n-inner-mid'], ['r-dorm-n-inner-mid', 'r-dorm-n-inner-south'],
  ['r-dorm-n-inner-south', 'r-main-2'], ['r-dorm-n-inner-top', 'r-food-front-north'], ['r-dorm-n-inner-mid', 'r-food-front-south'],
  ['student-dorm-south', 'r-dorm-s-1'], ['r-dorm-s-1', 'r-main-2'], ['r-dorm-s-1', 'r-south-1'],
  ['flavor-canteen', 'r-food-front-north'], ['teacher-canteen', 'r-food-front-south'], ['student-canteen', 'r-south-2'],
  ['office-building', 'r-north-2b'], ['activity-center', 'r-main-2b'], ['medical-room', 'r-north-2b'],
  ['library', 'r-library-south'], ['library', 'r-library-north-west'], ['library', 'r-library-east'],
  ['r-library-north-west', 'r-library-north-east'], ['r-library-north-east', 'r-north-4'], ['r-north-4', 'r-library-east'], ['r-library-east', 'r-main-4'],
  ['r-library-south', 'r-main-3'], ['r-library-south', 'r-main-4'],
  ['public-teaching', 'r-public-west'], ['public-teaching', 'r-public-east'],
  ['r-public-west', 'r-main-2'], ['r-public-west', 'r-south-1'], ['r-public-east', 'r-main-3'], ['r-public-east', 'r-south-2'],
  ['lab-building', 'r-east-1'], ['r-east-1', 'r-main-4'], ['r-east-1', 'r-south-3'],
  ['smart-teaching-s1', 'r-east-1'], ['smart-teaching-s2', 'r-east-2'], ['engineering-lab', 'r-east-3'],
  ['r-east-1', 'r-east-2'], ['r-east-2', 'r-east-3'], ['r-east-2', 'r-south-3'], ['r-east-3', 'r-gate-2'],
  ['network-security', 'r-north-4'], ['network-security', 'r-main-4'], ['science-school', 'r-gate-2'],
];

export const campusNodes = fullRoadNetwork.nodes.map((node) => {
  const point = resolveNodePoint(node);
  const selectable = SELECTABLE_NODE_TYPES.has(node.type);

  return {
    id: node.id,
    name: labelForNetworkNode(node),
    type: node.type === 'gate' ? '校门' : node.type === 'location_access' ? '地点接入点' : '道路',
    x: point.x,
    y: point.y,
    routingOnly: !selectable,
    roadType: node.type,
  };
});

export const campusEdges = fullRoadNetwork.edges
  .filter((edge) => edge.walkable !== false && !NON_WALKABLE_EDGE_IDS.has(edge.id))
  .map((edge) => [edge.from, edge.to, edge.type]);

export const campusRoadEdgeTypes = Object.fromEntries(
  fullRoadNetwork.edges
    .filter((edge) => edge.walkable !== false && !NON_WALKABLE_EDGE_IDS.has(edge.id))
    .map((edge) => [`${edge.from}->${edge.to}`, edge.type])
);

export const legacyCampusGraph = {
  nodes: legacyCampusNodes,
  edges: legacyCampusEdges,
};
