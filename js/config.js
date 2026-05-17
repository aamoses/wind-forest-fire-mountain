// 风林火山·四方乱斗 - 游戏配置
// ============================================================

const CELL = 60;    // 路口间距
const OFF_X = 50;   // 左偏移
const OFF_Y = 50;   // 上偏移

// 33个路口定义: id, col, row, zone
const POINTS = [
  // 中心广场
  {id:0, col:3, row:2, zone:'center'}, {id:1, col:4, row:2, zone:'center'}, {id:2, col:5, row:2, zone:'center'},
  {id:3, col:3, row:3, zone:'center'}, {id:4, col:4, row:3, zone:'center'}, {id:5, col:5, row:3, zone:'center'},
  {id:6, col:3, row:4, zone:'center'}, {id:7, col:4, row:4, zone:'center'}, {id:8, col:5, row:4, zone:'center'},
  // 上方（火阵营 — 会随机变）
  {id:9, col:3, row:0, zone:'top'}, {id:10, col:4, row:0, zone:'top'}, {id:11, col:5, row:0, zone:'top'},
  {id:12, col:3, row:1, zone:'top'}, {id:13, col:4, row:1, zone:'top'}, {id:14, col:5, row:1, zone:'top'},
  // 下方
  {id:15, col:3, row:5, zone:'bottom'}, {id:16, col:4, row:5, zone:'bottom'}, {id:17, col:5, row:5, zone:'bottom'},
  {id:18, col:3, row:6, zone:'bottom'}, {id:19, col:4, row:6, zone:'bottom'}, {id:20, col:5, row:6, zone:'bottom'},
  // 左方
  {id:21, col:1, row:2, zone:'left'}, {id:22, col:2, row:2, zone:'left'},
  {id:23, col:1, row:3, zone:'left'}, {id:24, col:2, row:3, zone:'left'},
  {id:25, col:1, row:4, zone:'left'}, {id:26, col:2, row:4, zone:'left'},
  // 右方
  {id:27, col:6, row:2, zone:'right'}, {id:28, col:7, row:2, zone:'right'},
  {id:29, col:6, row:3, zone:'right'}, {id:30, col:7, row:3, zone:'right'},
  {id:31, col:6, row:4, zone:'right'}, {id:32, col:7, row:4, zone:'right'},
];

// 道路连接（52条）
const ADJ = {
  0:[1,3], 1:[0,2,4], 2:[1,5], 3:[0,4,6], 4:[1,3,5,7], 5:[2,4,8],
  6:[3,7], 7:[4,6,8], 8:[5,7],
  9:[10,12], 10:[9,11,13], 11:[10,14],
  12:[9,13,0], 13:[10,12,14,1], 14:[11,13,2],
  15:[16,18,6], 16:[15,17,19,7], 17:[16,20,8],
  18:[15,19], 19:[16,18,20], 20:[17,19],
  21:[22,23], 22:[21,24,0], 23:[21,24,25], 24:[22,23,26,3], 25:[23,26], 26:[24,25,6],
  27:[28,29,2], 28:[27,30], 29:[27,30,31,5], 30:[28,29,32], 31:[29,32,8], 32:[30,31],
};

// 阵营定义
const FACTIONS = {
  fire:     { key:'fire',     name:'火', emoji:'🔥', icon:'🔥', color:'#ff4a2a', slogan:'侵掠如火', zone:'top',
              skillName:'狙击', skillDesc:'直线贯穿，命中首个目标，伤害2' },
  forest:   { key:'forest',   name:'林', emoji:'🌲', icon:'🌲', color:'#2ecc71', slogan:'其徐如林', zone:'left',
              skillName:'无人机', skillDesc:'部署/引爆无人机，AOE范围伤害2' },
  wind:     { key:'wind',     name:'风', emoji:'💨', icon:'💨', color:'#f0c030', slogan:'其疾如风', zone:'right',
              skillName:'电磁辐射', skillDesc:'日字形AOE，含友伤，伤害2' },
  mountain: { key:'mountain', name:'山', emoji:'⛰️', icon:'⛰️', color:'#4a9eff', slogan:'不动如山', zone:'bottom',
              skillName:'机枪扫射', skillDesc:'移动+射击，蓄弹越多伤害越高' },
};

// 克制: attacker -> { defender: multiplier }
const COUNTER = {
  fire:     { wind:1.5, mountain:0.67 },
  forest:   { mountain:1.5, wind:0.67 },
  wind:     { forest:1.5, fire:0.67 },
  mountain: { fire:1.5, forest:0.67 },
};

// 初始部署位置（与区域对应）
const INIT_POS = {
  fire:     [9,10,11,12,13,14],
  forest:   [21,22,23,24,25,26],
  wind:     [27,28,29,30,31,32],
  mountain: [15,16,17,18,19,20],
};

// 风技能-马走日8个偏移
const HORSE_OFFSETS = [
  [-1,-2],[1,-2],[-2,-1],[2,-1],
  [-2,1],[2,1],[-1,2],[1,2],
];

// 方向定义: [dcol, drow, label]
const DIRECTIONS = [
  [0,-1,'↑'],[0,1,'↓'],[-1,0,'←'],[1,0,'→'],
];
