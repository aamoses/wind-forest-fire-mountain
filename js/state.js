// 风林火山·四方乱斗 - 游戏状态管理
// ============================================================

let gameState = {};
let pointMap = {};      // "col,row" -> pointId
let pointById = {};     // id -> point object

// 四条边（顺时针方向）
const SIDES = ['top', 'right', 'bottom', 'left'];

function buildPointLookups() {
  pointMap = {};
  pointById = {};
  for (const p of POINTS) {
    pointMap[`${p.col},${p.row}`] = p.id;
    pointById[p.id] = p;
  }
}

// ============================================================
// 工具函数
// ============================================================

function pos(col, row) {
  return { x: col * CELL + OFF_X, y: row * CELL + OFF_Y };
}

function getPieceAt(pointId) {
  return gameState.pieces.find(p => p.position === pointId && p.hp > 0);
}

function getTrapAt(pointId) {
  return gameState.traps.find(t => t.position === pointId);
}

function getAlivePieces(faction) {
  return gameState.pieces.filter(p => p.faction === faction && p.hp > 0);
}

function isEliminated(faction) {
  return getAlivePieces(faction).length === 0;
}

// 当前边
function currentSide() {
  if (gameState.sideIndex >= SIDES.length) return null;
  return SIDES[gameState.sideIndex];
}

// 当前阵营
function currentFaction() {
  const side = currentSide();
  if (!side) return null;
  return gameState.sideFaction[side];
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// 克制系数
function counterMultiplier(attackerFaction, defenderFaction) {
  if (!COUNTER[attackerFaction]) return 1.0;
  return COUNTER[attackerFaction][defenderFaction] || 1.0;
}

// 计算实际伤害（克制向上取整，被克向下取整）
function calcDamage(attackerFaction, defenderFaction, baseDamage) {
  const mult = counterMultiplier(attackerFaction, defenderFaction);
  if (mult > 1) return Math.ceil(baseDamage * mult);
  if (mult < 1) return Math.floor(baseDamage * mult);
  return baseDamage;
}

// ============================================================
// 初始化游戏
// ============================================================

function initGame() {
  buildPointLookups();

  // 随机分配四个阵营到四条边
  const shuffledFactions = shuffle(['fire','forest','wind','mountain']);
  const sideFaction = {};
  for (let i = 0; i < SIDES.length; i++) {
    sideFaction[SIDES[i]] = shuffledFactions[i];
  }

  // 随机起始边（顺时针第一人）
  const startIndex = Math.floor(Math.random() * 4);

  gameState = {
    phase: 'init',
    sideFaction: sideFaction,
    sideIndex: startIndex,
    totalTurns: 0,
    deployTurns: 4,   // 布阵阶段：1轮完整循环（每人行动一次）
    pieces: [],
    traps: [],
    selectedPieceId: null,
    actionMode: null,
    mountainRemaining: 0,
    mountainPieceId: null,
    eliminated: [],
    validTargets: [],
    firePieceId: null,
  };

  // 创建棋子（初始位置不变，按阵营分配）
  let pieceId = 0;
  for (const [faction, posList] of Object.entries(INIT_POS)) {
    for (const pt of posList) {
      gameState.pieces.push({
        id: pieceId++,
        faction: faction,
        hp: 4,
        position: pt,
      });
    }
  }

  renderBoard();
  renderTurnOrder();
  updateUI();
  showMessage('行动顺序已随机决定，点击"开始对战"');
}

// ============================================================
// 伤害系统
// ============================================================

function applyDamageToPiece(piece, damage) {
  piece.hp = Math.max(0, piece.hp - damage);
}

function getCounterInfo(attackerFaction, defenderFaction) {
  const mult = counterMultiplier(attackerFaction, defenderFaction);
  if (mult > 1) return '(克制！+25%)';
  if (mult < 1) return '(被克制，-25%)';
  return '';
}

// ============================================================
// 淘汰与胜利检查
// ============================================================

function checkAndNextTurn() {
  const newlyEliminated = [];
  for (const facKey of ['fire','forest','wind','mountain']) {
    if (!gameState.eliminated.includes(facKey) && isEliminated(facKey)) {
      newlyEliminated.push(facKey);
      gameState.eliminated.push(facKey);
    }
  }

  for (const facKey of newlyEliminated) {
    showMessage(`${FACTIONS[facKey].name}阵营全军覆没，已被淘汰！`);
  }

  const aliveFactions = ['fire','forest','wind','mountain'].filter(f => !isEliminated(f));
  if (aliveFactions.length <= 1) {
    if (aliveFactions.length === 1) {
      showVictory(aliveFactions[0]);
    }
    return;
  }

  nextTurn();
}

function nextTurn() {
  gameState.totalTurns++;
  // 顺时针走：移到下一条边
  gameState.sideIndex = (gameState.sideIndex + 1) % SIDES.length;
  advanceToAliveFaction();
  updatePieceRender();
  updateActionButtons();
  updateUI();
  const info = getCurrentFactionInfo();
  showMessage(`${info}  的回合`);
}

function advanceToAliveFaction() {
  let safety = 0;
  while (safety < 10 && isEliminated(currentFaction())) {
    gameState.sideIndex = (gameState.sideIndex + 1) % SIDES.length;
    safety++;
  }
  if (isEliminated(currentFaction())) {
    gameState.phase = 'victory';
    return;
  }
  updateUI();
}

function isDeployPhase() {
  return gameState.totalTurns < gameState.deployTurns;
}

function getCurrentFactionInfo() {
  const cf = currentFaction();
  if (!cf) return '';
  const fac = FACTIONS[cf];
  const side = currentSide();
  const sideNames = { top:'上方', right:'右方', bottom:'下方', left:'左方' };
  return `${fac.name}（${sideNames[side]}·${fac.slogan}）`;
}
