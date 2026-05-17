// 风林火山·四方乱斗 - 游戏配置（巷战版）
// ============================================================

const CELL = 64;       // 格子间距
const OFF_X = 42;      // 左偏移
const OFF_Y = 46;      // 上偏移

// 33个路口定义: id, col, row, zone
const POINTS = [
  // 中心广场 (zone: 'center')
  {id:0, col:3, row:2, zone:'center'}, {id:1, col:4, row:2, zone:'center'}, {id:2, col:5, row:2, zone:'center'},
  {id:3, col:3, row:3, zone:'center'}, {id:4, col:4, row:3, zone:'center'}, {id:5, col:5, row:3, zone:'center'},
  {id:6, col:3, row:4, zone:'center'}, {id:7, col:4, row:4, zone:'center'}, {id:8, col:5, row:4, zone:'center'},
  // 上方街区 (zone: 'top') - 狙击手
  {id:9, col:3, row:0, zone:'top'}, {id:10, col:4, row:0, zone:'top'}, {id:11, col:5, row:0, zone:'top'},
  {id:12, col:3, row:1, zone:'top'}, {id:13, col:4, row:1, zone:'top'}, {id:14, col:5, row:1, zone:'top'},
  // 下方街区 (zone: 'bottom') - 机枪手
  {id:15, col:3, row:5, zone:'bottom'}, {id:16, col:4, row:5, zone:'bottom'}, {id:17, col:5, row:5, zone:'bottom'},
  {id:18, col:3, row:6, zone:'bottom'}, {id:19, col:4, row:6, zone:'bottom'}, {id:20, col:5, row:6, zone:'bottom'},
  // 左方街区 (zone: 'left') - 无人机
  {id:21, col:1, row:2, zone:'left'}, {id:22, col:2, row:2, zone:'left'},
  {id:23, col:1, row:3, zone:'left'}, {id:24, col:2, row:3, zone:'left'},
  {id:25, col:1, row:4, zone:'left'}, {id:26, col:2, row:4, zone:'left'},
  // 右方街区 (zone: 'right') - 电磁辐射
  {id:27, col:6, row:2, zone:'right'}, {id:28, col:7, row:2, zone:'right'},
  {id:29, col:6, row:3, zone:'right'}, {id:30, col:7, row:3, zone:'right'},
  {id:31, col:6, row:4, zone:'right'}, {id:32, col:7, row:4, zone:'right'},
];

// 道路连接（52条街巷）
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

// 建筑定义: { corners:[4个路口ID], type:'类型' }
const BUILDINGS = [
  // 中心广场周边
  { corners:[0,1,3,4], type:'warehouse' },
  { corners:[1,2,4,5], type:'command' },
  { corners:[3,4,6,7], type:'house' },
  { corners:[4,5,7,8], type:'armory' },
  // 上方街区（狙击手）
  { corners:[9,10,12,13], type:'sniper_nest' },
  { corners:[10,11,13,14], type:'radar' },
  // 下方街区（机枪手）
  { corners:[15,16,18,19], type:'bunker' },
  { corners:[16,17,19,20], type:'barracks' },
  // 左方街区（无人机）
  { corners:[21,22,23,24], type:'drone_hub' },
  { corners:[23,24,25,26], type:'tech_lab' },
  // 右方街区（电磁辐射）
  { corners:[27,28,29,30], type:'generator' },
  { corners:[29,30,31,32], type:'storage' },
];

// 阵营定义（风林火山 — 现代兵种技能）
const FACTIONS = {
  fire:     { key:'fire',     name:'火', emoji:'火', color:'#e74c3c', slogan:'侵掠如火', zone:'top', skillName:'狙击', skillDesc:'直线贯穿·命中首个目标' },
  forest:   { key:'forest',   name:'林', emoji:'林', color:'#27ae60', slogan:'其徐如林', zone:'left', skillName:'无人机', skillDesc:'部署无人机·引爆AOE' },
  wind:     { key:'wind',     name:'风', emoji:'风', color:'#c0c020', slogan:'其疾如风', zone:'right', skillName:'电磁辐射', skillDesc:'日字AOE·含友伤' },
  mountain: { key:'mountain', name:'山', emoji:'山', color:'#2980b9', slogan:'不动如山', zone:'bottom', skillName:'机枪', skillDesc:'4步移动+射击' },
};

// SVG兵人形象（现代军事风格 · 巷战版）
const SOLDIER_SVG = {
  // 狙击手 — 匍匐姿态+长狙+瞄准镜反光
  fire: `<svg viewBox="0 0 48 56" width="48" height="56">
    <defs>
      <radialGradient id="fireGlow"><stop offset="0%" stop-color="#ff5530"/><stop offset="100%" stop-color="transparent"/></radialGradient>
    </defs>
    <ellipse cx="24" cy="50" rx="20" ry="5" fill="rgba(0,0,0,0.5)"/>
    <!-- 匍匐身体 -->
    <rect x="10" y="36" width="28" height="10" rx="5" fill="#5c2a1a"/>
    <rect x="12" y="34" width="24" height="8" rx="4" fill="#8b3a25"/>
    <!-- 头盔 -->
    <circle cx="30" cy="32" r="7" fill="#4a6a3a"/>
    <rect x="26" y="28" width="8" height="5" rx="2" fill="#5a7a4a"/>
    <!-- 狙击步枪 -->
    <line x1="44" y1="38" x2="14" y2="44" stroke="#2a2a2a" stroke-width="3.5" stroke-linecap="round"/>
    <rect x="40" y="35" width="8" height="5" rx="2" fill="#1a1a1a"/>
    <!-- 瞄准镜 -->
    <circle cx="36" cy="39" r="2" fill="#88ccff" opacity="0.9">
      <animate attributeName="opacity" values="0.9;0.3;0.9" dur="1.5s" repeatCount="indefinite"/>
    </circle>
    <!-- 双脚 -->
    <rect x="8" y="42" width="5" height="6" rx="2" fill="#3a2010"/>
    <rect x="14" y="44" width="5" height="6" rx="2" fill="#3a2010"/>
    <circle cx="24" cy="38" r="5" fill="url(#fireGlow)" opacity="0.5">
      <animate attributeName="r" values="4;6;4" dur="1.5s" repeatCount="indefinite"/>
      <animate attributeName="opacity" values="0.4;0.7;0.4" dur="1.5s" repeatCount="indefinite"/>
    </circle>
  </svg>`,

  // 无人机操作员 — 站立+平板控制器+头顶无人机
  forest: `<svg viewBox="0 0 48 56" width="48" height="56">
    <defs>
      <radialGradient id="forestGlow"><stop offset="0%" stop-color="#44ee66"/><stop offset="100%" stop-color="transparent"/></radialGradient>
    </defs>
    <ellipse cx="24" cy="50" rx="18" ry="5" fill="rgba(0,0,0,0.5)"/>
    <!-- 双腿 -->
    <rect x="18" y="38" width="5" height="12" rx="2" fill="#1a2a10"/>
    <rect x="25" y="38" width="5" height="12" rx="2" fill="#1a2a10"/>
    <!-- 躯干 -->
    <rect x="15" y="22" width="18" height="18" rx="4" fill="#1e6b3b"/>
    <rect x="17" y="24" width="14" height="12" rx="3" fill="#27ae60"/>
    <!-- 头盔+护目镜 -->
    <circle cx="24" cy="16" r="7" fill="#b8a890"/>
    <rect x="17" y="13" width="14" height="6" rx="3" fill="#2a4a1a"/>
    <rect x="19" y="15" width="10" height="3" rx="1.5" fill="#88ccff" opacity="0.7"/>
    <!-- 平板控制器 -->
    <rect x="8" y="30" width="8" height="10" rx="1.5" fill="#3a3a3a"/>
    <rect x="9" y="31" width="6" height="7" rx="1" fill="#4488cc" opacity="0.8">
      <animate attributeName="opacity" values="0.6;1;0.6" dur="2s" repeatCount="indefinite"/>
    </rect>
    <!-- 无人机（头顶） -->
    <rect x="18" y="2" width="12" height="4" rx="2" fill="#555"/>
    <circle cx="20" cy="3" r="3" fill="#444"/>
    <circle cx="28" cy="3" r="3" fill="#444"/>
    <circle cx="24" cy="6" r="2" fill="#f5c542" opacity="0.8">
      <animate attributeName="r" values="2;3;2" dur="0.6s" repeatCount="indefinite"/>
    </circle>
    <circle cx="24" cy="32" r="4" fill="url(#forestGlow)" opacity="0.5">
      <animate attributeName="r" values="3;5;3" dur="2s" repeatCount="indefinite"/>
    </circle>
  </svg>`,

  // 电磁辐射兵 — 防护服+发射器背包+辐射标志
  wind: `<svg viewBox="0 0 48 56" width="48" height="56">
    <defs>
      <radialGradient id="windGlow"><stop offset="0%" stop-color="#ddee44"/><stop offset="100%" stop-color="transparent"/></radialGradient>
    </defs>
    <ellipse cx="24" cy="50" rx="18" ry="5" fill="rgba(0,0,0,0.5)"/>
    <!-- 双腿 -->
    <rect x="18" y="36" width="5" height="14" rx="2" fill="#3a3010"/>
    <rect x="25" y="36" width="5" height="14" rx="2" fill="#3a3010"/>
    <!-- 防护服躯干 -->
    <rect x="14" y="20" width="20" height="18" rx="4" fill="#8a7a20"/>
    <rect x="16" y="22" width="16" height="13" rx="3" fill="#c0b030"/>
    <!-- 防毒面具 -->
    <circle cx="24" cy="14" r="7" fill="#5a5a40"/>
    <rect x="19" y="17" width="10" height="4" rx="2" fill="#3a3a20"/>
    <circle cx="21" cy="13" r="2.5" fill="#88ee44" opacity="0.8">
      <animate attributeName="opacity" values="0.8;0.2;0.8" dur="1s" repeatCount="indefinite"/>
    </circle>
    <circle cx="27" cy="13" r="2.5" fill="#88ee44" opacity="0.8">
      <animate attributeName="opacity" values="0.2;0.8;0.2" dur="1s" repeatCount="indefinite"/>
    </circle>
    <!-- 发射器背包 -->
    <rect x="8" y="18" width="8" height="12" rx="3" fill="#4a4a20"/>
    <line x1="5" y1="14" x2="5" y2="8" stroke="#6a6a30" stroke-width="2"/>
    <circle cx="5" cy="7" r="2.5" fill="#ddee44">
      <animate attributeName="r" values="2;3.5;2" dur="1s" repeatCount="indefinite"/>
    </circle>
    <!-- 辐射标志 -->
    <circle cx="24" cy="28" r="6" fill="none" stroke="#ddee44" stroke-width="1.2" opacity="0.7">
      <animate attributeName="opacity" values="0.7;0.3;0.7" dur="0.8s" repeatCount="indefinite"/>
    </circle>
    <circle cx="24" cy="28" r="2" fill="#ddee44" opacity="0.9"/>
    <circle cx="24" cy="30" r="5" fill="url(#windGlow)" opacity="0.5">
      <animate attributeName="r" values="4;7;4" dur="1s" repeatCount="indefinite"/>
      <animate attributeName="opacity" values="0.3;0.6;0.3" dur="1s" repeatCount="indefinite"/>
    </circle>
  </svg>`,

  // 机枪手 — 重装+双脚架机枪+弹链
  mountain: `<svg viewBox="0 0 48 56" width="48" height="56">
    <defs>
      <radialGradient id="mountainGlow"><stop offset="0%" stop-color="#55b8ff"/><stop offset="100%" stop-color="transparent"/></radialGradient>
    </defs>
    <ellipse cx="24" cy="50" rx="20" ry="5" fill="rgba(0,0,0,0.5)"/>
    <!-- 双腿（马步） -->
    <rect x="14" y="38" width="6" height="12" rx="2" fill="#1a2830"/>
    <rect x="28" y="38" width="6" height="12" rx="2" fill="#1a2830"/>
    <!-- 重甲躯干 -->
    <rect x="12" y="20" width="24" height="20" rx="5" fill="#1e4d8c"/>
    <rect x="14" y="22" width="20" height="15" rx="4" fill="#2a6ab8"/>
    <rect x="16" y="22" width="16" height="4" rx="2" fill="#3a7acc"/>
    <!-- 头盔 -->
    <circle cx="24" cy="14" r="8" fill="#3a4a50"/>
    <rect x="16" y="16" width="16" height="3" rx="1.5" fill="#4a5a60"/>
    <!-- 机关枪 -->
    <line x1="44" y1="28" x2="24" y2="34" stroke="#2a2a2a" stroke-width="4" stroke-linecap="round"/>
    <rect x="38" y="25" width="10" height="5" rx="2" fill="#1a1a1a"/>
    <!-- 双脚架 -->
    <line x1="28" y1="36" x2="34" y2="42" stroke="#555" stroke-width="1.5"/>
    <line x1="32" y1="34" x2="36" y2="42" stroke="#555" stroke-width="1.5"/>
    <!-- 弹链 -->
    <path d="M30,42 Q34,38 36,30" fill="none" stroke="#f5c542" stroke-width="1.5" stroke-dasharray="2,2" opacity="0.7"/>
    <!-- 枪口火焰 -->
    <circle cx="46" cy="27" r="3" fill="#ffaa00" opacity="0.7">
      <animate attributeName="r" values="2;5;2" dur="0.3s" repeatCount="indefinite"/>
      <animate attributeName="opacity" values="0.7;0;0.7" dur="0.3s" repeatCount="indefinite"/>
    </circle>
    <circle cx="24" cy="28" r="5" fill="url(#mountainGlow)" opacity="0.5">
      <animate attributeName="r" values="4;6;4" dur="1.5s" repeatCount="indefinite"/>
      <animate attributeName="opacity" values="0.4;0.7;0.4" dur="1.5s" repeatCount="indefinite"/>
    </circle>
  </svg>`,
};

// 克制关系: attacker -> { defender: multiplier }
const COUNTER = {
  fire:     { wind:1.25, mountain:0.75 },
  forest:   { mountain:1.25, wind:0.75 },
  wind:     { forest:1.25, fire:0.75 },
  mountain: { fire:1.25, forest:0.75 },
};

// 初始部署位置
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
