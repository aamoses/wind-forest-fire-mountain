// 风林火山·四方乱斗 - 游戏配置
// ============================================================

const CELL = 64;       // 格子间距
const OFF_X = 42;      // 左偏移
const OFF_Y = 46;      // 上偏移

// 33个点位定义: id, col, row, zone
const POINTS = [
  // 中心田字格 (zone: 'center')
  {id:0, col:3, row:2, zone:'center'}, {id:1, col:4, row:2, zone:'center'}, {id:2, col:5, row:2, zone:'center'},
  {id:3, col:3, row:3, zone:'center'}, {id:4, col:4, row:3, zone:'center'}, {id:5, col:5, row:3, zone:'center'},
  {id:6, col:3, row:4, zone:'center'}, {id:7, col:4, row:4, zone:'center'}, {id:8, col:5, row:4, zone:'center'},
  // 上方田字格 (zone: 'top') - 火阵营
  {id:9, col:3, row:0, zone:'top'}, {id:10, col:4, row:0, zone:'top'}, {id:11, col:5, row:0, zone:'top'},
  {id:12, col:3, row:1, zone:'top'}, {id:13, col:4, row:1, zone:'top'}, {id:14, col:5, row:1, zone:'top'},
  // 下方田字格 (zone: 'bottom') - 山阵营
  {id:15, col:3, row:5, zone:'bottom'}, {id:16, col:4, row:5, zone:'bottom'}, {id:17, col:5, row:5, zone:'bottom'},
  {id:18, col:3, row:6, zone:'bottom'}, {id:19, col:4, row:6, zone:'bottom'}, {id:20, col:5, row:6, zone:'bottom'},
  // 左方田字格 (zone: 'left') - 林阵营
  {id:21, col:1, row:2, zone:'left'}, {id:22, col:2, row:2, zone:'left'},
  {id:23, col:1, row:3, zone:'left'}, {id:24, col:2, row:3, zone:'left'},
  {id:25, col:1, row:4, zone:'left'}, {id:26, col:2, row:4, zone:'left'},
  // 右方田字格 (zone: 'right') - 风阵营
  {id:27, col:6, row:2, zone:'right'}, {id:28, col:7, row:2, zone:'right'},
  {id:29, col:6, row:3, zone:'right'}, {id:30, col:7, row:3, zone:'right'},
  {id:31, col:6, row:4, zone:'right'}, {id:32, col:7, row:4, zone:'right'},
];

// 相邻关系（52条边）
const ADJ = {
  0:[1,3], 1:[0,2,4], 2:[1,5], 3:[0,4,6], 4:[1,3,5,7], 5:[2,4,8],
  6:[3,7], 7:[4,6,8], 8:[5,7],
  // 上方
  9:[10,12], 10:[9,11,13], 11:[10,14],
  12:[9,13,0], 13:[10,12,14,1], 14:[11,13,2],
  // 下方
  15:[16,18,6], 16:[15,17,19,7], 17:[16,20,8],
  18:[15,19], 19:[16,18,20], 20:[17,19],
  // 左方
  21:[22,23], 22:[21,24,0], 23:[21,24,25], 24:[22,23,26,3], 25:[23,26], 26:[24,25,6],
  // 右方
  27:[28,29,2], 28:[27,30], 29:[27,30,31,5], 30:[28,29,32], 31:[29,32,8], 32:[30,31],
};

// 阵营定义
const FACTIONS = {
  fire:     { key:'fire',     name:'火', emoji:'火', color:'#e74c3c', slogan:'侵掠如火', zone:'top' },
  forest:   { key:'forest',   name:'林', emoji:'林', color:'#27ae60', slogan:'其徐如林', zone:'left' },
  wind:     { key:'wind',     name:'风', emoji:'风', color:'#f1c40f', slogan:'其疾如风', zone:'right' },
  mountain: { key:'mountain', name:'山', emoji:'山', color:'#2980b9', slogan:'不动如山', zone:'bottom' },
};

// SVG兵人形象（更具体的战士造型 + 可见待机动画）
const SOLDIER_SVG = {
  fire: `<svg viewBox="0 0 48 56" width="48" height="56">
    <defs>
      <radialGradient id="fireGlow"><stop offset="0%" stop-color="#ff6622"/><stop offset="100%" stop-color="transparent"/></radialGradient>
    </defs>
    <ellipse cx="24" cy="50" rx="18" ry="5" fill="rgba(0,0,0,0.5)"/>
    <rect x="19" y="36" width="4" height="14" rx="1.5" fill="#2a1a10"/>
    <rect x="25" y="36" width="4" height="14" rx="1.5" fill="#2a1a10"/>
    <polygon points="24,14 15,38 33,38" fill="#c0392b"/>
    <rect x="16" y="22" width="16" height="16" rx="3" fill="#a33025"/>
    <path d="M18,26 L30,26 L28,34 L20,34 Z" fill="#8b2015"/>
    <circle cx="24" cy="13" r="7" fill="#ffb899"/>
    <polygon points="18,9 30,9 28,7 20,7" fill="#8b4513"/>
    <line x1="24" y1="12" x2="24" y2="3" stroke="#c0392b" stroke-width="2"/>
    <line x1="24" y1="14" x2="16" y2="44" stroke="#8b6914" stroke-width="3" stroke-linecap="round"/>
    <polygon points="14,42 18,46 16,48 12,44" fill="#f5c542"/>
    <circle cx="24" cy="28" r="5" fill="url(#fireGlow)" opacity="0.6">
      <animate attributeName="r" values="4;6;4" dur="1.5s" repeatCount="indefinite"/>
      <animate attributeName="opacity" values="0.6;0.9;0.6" dur="1.5s" repeatCount="indefinite"/>
    </circle>
    <circle cx="15" cy="43" r="3" fill="#ff4422" opacity="0.8">
      <animate attributeName="r" values="2;4;2" dur="0.8s" repeatCount="indefinite"/>
      <animate attributeName="opacity" values="0.8;0.3;0.8" dur="0.8s" repeatCount="indefinite"/>
    </circle>
  </svg>`,
  forest: `<svg viewBox="0 0 48 56" width="48" height="56">
    <defs>
      <radialGradient id="forestGlow"><stop offset="0%" stop-color="#44ee66"/><stop offset="100%" stop-color="transparent"/></radialGradient>
    </defs>
    <ellipse cx="24" cy="50" rx="18" ry="5" fill="rgba(0,0,0,0.5)"/>
    <rect x="19" y="38" width="4" height="12" rx="1.5" fill="#1a2a10"/>
    <rect x="25" y="38" width="4" height="12" rx="1.5" fill="#1a2a10"/>
    <polygon points="24,16 14,38 34,38" fill="#1e6b3b"/>
    <rect x="15" y="22" width="18" height="16" rx="4" fill="#27ae60"/>
    <path d="M16,22 L32,22 L36,14 L12,14 Z" fill="#1a7a3f"/>
    <circle cx="24" cy="13" r="6" fill="#d4c5a0"/>
    <path d="M16,8 Q24,2 32,8" fill="#1e6b3b" stroke="#27ae60" stroke-width="1.5"/>
    <line x1="12" y1="28" x2="36" y2="18" stroke="#6b4e14" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M12,28 Q18,30 24,28 Q30,26 36,18" fill="none" stroke="#8b6914" stroke-width="1.2"/>
    <line x1="34" y1="16" x2="40" y2="12" stroke="#f5c542" stroke-width="1.8" stroke-linecap="round"/>
    <polygon points="38,10 42,12 40,14 36,12" fill="#f5c542"/>
    <circle cx="24" cy="32" r="4" fill="url(#forestGlow)" opacity="0.5">
      <animate attributeName="r" values="3;5;3" dur="2s" repeatCount="indefinite"/>
      <animate attributeName="opacity" values="0.4;0.7;0.4" dur="2s" repeatCount="indefinite"/>
    </circle>
  </svg>`,
  wind: `<svg viewBox="0 0 48 56" width="48" height="56">
    <defs>
      <radialGradient id="windGlow"><stop offset="0%" stop-color="#ffe866"/><stop offset="100%" stop-color="transparent"/></radialGradient>
    </defs>
    <ellipse cx="24" cy="50" rx="18" ry="5" fill="rgba(0,0,0,0.5)"/>
    <rect x="18" y="36" width="4" height="14" rx="1.5" fill="#1a1808"/>
    <rect x="26" y="36" width="4" height="14" rx="1.5" fill="#1a1808"/>
    <polygon points="24,16 13,40 35,40" fill="#b8860b"/>
    <rect x="15" y="22" width="18" height="18" rx="3" fill="#d4a010"/>
    <path d="M17,24 L31,24 L29,34 L19,34 Z" fill="#a07810"/>
    <circle cx="24" cy="13" r="6" fill="#e8d5a0"/>
    <path d="M28,10 L22,8 L24,4 Z" fill="#c0a040"/>
    <path d="M10,30 Q6,20 16,24 Q26,28 36,22" fill="none" stroke="#f5d860" stroke-width="3" opacity="0.7">
      <animate attributeName="d" values="M10,30 Q6,20 16,24 Q26,28 36,22;M10,32 Q6,22 16,26 Q26,30 36,24;M10,30 Q6,20 16,24 Q26,28 36,22" dur="2s" repeatCount="indefinite"/>
    </path>
    <line x1="24" y1="20" x2="36" y2="10" stroke="#f5c542" stroke-width="2.5" stroke-linecap="round"/>
    <polygon points="34,8 38,10 36,14 32,10" fill="#f5c542"/>
    <circle cx="24" cy="30" r="4" fill="url(#windGlow)" opacity="0.5">
      <animate attributeName="r" values="3;5;3" dur="1.3s" repeatCount="indefinite"/>
      <animate attributeName="opacity" values="0.4;0.8;0.4" dur="1.3s" repeatCount="indefinite"/>
    </circle>
  </svg>`,
  mountain: `<svg viewBox="0 0 48 56" width="48" height="56">
    <defs>
      <radialGradient id="mountainGlow"><stop offset="0%" stop-color="#55b8ff"/><stop offset="100%" stop-color="transparent"/></radialGradient>
    </defs>
    <ellipse cx="24" cy="50" rx="18" ry="5" fill="rgba(0,0,0,0.5)"/>
    <rect x="18" y="36" width="5" height="14" rx="2" fill="#081a28"/>
    <rect x="25" y="36" width="5" height="14" rx="2" fill="#081a28"/>
    <rect x="12" y="18" width="24" height="20" rx="4" fill="#1e4d8c"/>
    <rect x="14" y="20" width="20" height="16" rx="3" fill="#2a6ab8"/>
    <circle cx="24" cy="16" r="9" fill="#3a7acc" stroke="#55b8ff" stroke-width="1.5"/>
    <path d="M16,20 L32,20 L28,34 L20,34 Z" fill="#1e5daa"/>
    <circle cx="24" cy="14" r="7" fill="#c0b8a8"/>
    <rect x="18" y="12" width="12" height="4" rx="2" fill="#8a8a80"/>
    <circle cx="24" cy="14" r="8" fill="none" stroke="#55b8ff" stroke-width="1.5" opacity="0.5">
      <animate attributeName="r" values="8;12;8" dur="2.5s" repeatCount="indefinite"/>
      <animate attributeName="opacity" values="0.5;0;0.5" dur="2.5s" repeatCount="indefinite"/>
    </circle>
    <line x1="24" y1="22" x2="24" y2="36" stroke="#55b8ff" stroke-width="1" opacity="0.4"/>
    <line x1="18" y1="26" x2="30" y2="26" stroke="#55b8ff" stroke-width="1" opacity="0.3"/>
  </svg>`,
};

// 克制关系: attacker -> { defender: multiplier }
const COUNTER = {
  fire:     { wind:1.25, mountain:0.75 },
  forest:   { mountain:1.25, wind:0.75 },
  wind:     { forest:1.25, fire:0.75 },
  mountain: { fire:1.25, forest:0.75 },
};

// 初始位置
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
