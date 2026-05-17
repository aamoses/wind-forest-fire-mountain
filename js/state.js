// 风林火山·四方乱斗 - 游戏状态管理
// ============================================================

let gameState = {};
let pointMap = {};      // "col,row" -> pointId
let pointById = {};     // id -> point object

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

function currentFaction() {
  if (gameState.turnIndex >= gameState.turnOrder.length) return null;
  return gameState.turnOrder[gameState.turnIndex];
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

// 计算实际伤害
function calcDamage(attackerFaction, defenderFaction, baseDamage) {
  return Math.floor(baseDamage * counterMultiplier(attackerFaction, defenderFaction));
}

// ============================================================
// 初始化游戏
// ============================================================

function initGame() {
  buildPointLookups();

  // 随机行动顺序
  const order = shuffle(['fire','forest','wind','mountain']);

  gameState = {
    phase: 'init',
    turnOrder: order,
    turnIndex: 0,
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

  // 创建棋子
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
    showMessage(`${FACTIONS[facKey].emoji}${FACTIONS[facKey].name}阵营全军覆没，已被淘汰！`);
  }

  const aliveFactions = ['fire','forest','wind','mountain'].filter(f => !isEliminated(f));
  if (aliveFactions.length <= 1) {
    if (aliveFactions.length === 1) {
      showVictory(aliveFactions[0]);
    }
    return;
  }

  gameState.turnOrder = gameState.turnOrder.filter(f => !isEliminated(f));
  nextTurn();
}

function nextTurn() {
  gameState.turnIndex = (gameState.turnIndex + 1) % gameState.turnOrder.length;
  advanceToAliveFaction();
  updatePieceRender();
  updateActionButtons();
  updateUI();
  const info = getCurrentFactionInfo();
  showMessage(`${info} 的回合`);
}

function advanceToAliveFaction() {
  let safety = 0;
  while (safety < 10 && isEliminated(currentFaction())) {
    gameState.turnIndex = (gameState.turnIndex + 1) % gameState.turnOrder.length;
    safety++;
  }
  if (isEliminated(currentFaction())) {
    gameState.phase = 'victory';
    return;
  }
  updateUI();
}

function getCurrentFactionInfo() {
  const cf = currentFaction();
  if (!cf) return '';
  const fac = FACTIONS[cf];
  return `${fac.emoji}${fac.name}（${fac.slogan}）`;
}
