// 风林火山·四方乱斗 - 游戏状态管理
// ============================================================

let gameState = {};
let pointMap = {};
let pointById = {};

const SIDES = ['top', 'right', 'bottom', 'left'];

function buildPointLookups() {
  pointMap = {};
  pointById = {};
  for (const p of POINTS) {
    pointMap[`${p.col},${p.row}`] = p.id;
    pointById[p.id] = p;
  }
}

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

function currentSide() {
  if (gameState.sideIndex >= SIDES.length) return null;
  return SIDES[gameState.sideIndex];
}

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

function counterMultiplier(attackerFaction, defenderFaction) {
  if (!COUNTER[attackerFaction]) return 1.0;
  return COUNTER[attackerFaction][defenderFaction] || 1.0;
}

function calcDamage(attackerFaction, defenderFaction, baseDamage) {
  const mult = counterMultiplier(attackerFaction, defenderFaction);
  if (mult > 1) return Math.ceil(baseDamage * mult);
  if (mult < 1) return Math.floor(baseDamage * mult);
  return baseDamage;
}

// ============================================================
// 初始化
// ============================================================

function initGame() {
  buildPointLookups();

  const shuffledFactions = shuffle(['fire','forest','wind','mountain']);
  const sideFaction = {};
  for (let i = 0; i < SIDES.length; i++) {
    sideFaction[SIDES[i]] = shuffledFactions[i];
  }
  const startIndex = Math.floor(Math.random() * 4);

  gameState = {
    phase: 'init',
    sideFaction,
    sideIndex: startIndex,
    totalTurns: 0,
    deployTurns: 4,
    pieces: [],
    traps: [],
    selectedPieceId: null,
    actionMode: null,
    mountainRemaining: 0,
    mountainPieceId: null,
    eliminated: [],
    validTargets: [],
    firePieceId: null,
    // 新：每回合行动追踪
    turnActions: { moved: false, attacked: false, pieceId: null },
  };

  let pieceId = 0;
  for (const [faction, posList] of Object.entries(INIT_POS)) {
    for (const pt of posList) {
      gameState.pieces.push({ id: pieceId++, faction, hp: 4, position: pt });
    }
  }

  renderBoard();
  renderTurnOrder();
  updateUI();
  showMessage('行动顺序已随机决定，点击「开始对战」');
}

// ============================================================
// 伤害系统
// ============================================================

function applyDamageToPiece(piece, damage) {
  piece.hp = Math.max(0, piece.hp - damage);
}

function getCounterInfo(attackerFaction, defenderFaction) {
  const mult = counterMultiplier(attackerFaction, defenderFaction);
  if (mult > 1) return ' ✦克制+';
  if (mult < 1) return ' ✧被克-';
  return '';
}

// ============================================================
// 回合流程
// ============================================================

function isDeployPhase() {
  return gameState.totalTurns < gameState.deployTurns;
}

function resetTurnActions() {
  gameState.turnActions = { moved: false, attacked: false, pieceId: null };
}

function checkAndNextTurn() {
  const newlyEliminated = [];
  for (const facKey of ['fire','forest','wind','mountain']) {
    if (!gameState.eliminated.includes(facKey) && isEliminated(facKey)) {
      newlyEliminated.push(facKey);
      gameState.eliminated.push(facKey);
    }
  }
  for (const facKey of newlyEliminated) {
    showMessage(`${FACTIONS[facKey].name}阵营全军覆没！`);
  }

  const aliveFactions = ['fire','forest','wind','mountain'].filter(f => !isEliminated(f));
  if (aliveFactions.length <= 1) {
    if (aliveFactions.length === 1) showVictory(aliveFactions[0]);
    return;
  }
  nextTurn();
}

function nextTurn() {
  gameState.totalTurns++;
  gameState.sideIndex = (gameState.sideIndex + 1) % SIDES.length;
  advanceToAliveFaction();
  resetTurnActions();
  updatePieceRender();
  updateActionButtons();
  updateUI();
  const info = getCurrentFactionInfo();
  showMessage(`${info} 的回合`);
}

function advanceToAliveFaction() {
  let safety = 0;
  while (safety < 10 && isEliminated(currentFaction())) {
    gameState.sideIndex = (gameState.sideIndex + 1) % SIDES.length;
    safety++;
  }
  if (isEliminated(currentFaction())) gameState.phase = 'victory';
  updateUI();
}

function getCurrentFactionInfo() {
  const cf = currentFaction();
  if (!cf) return '';
  const fac = FACTIONS[cf];
  const side = currentSide();
  const sideNames = { top:'上方', right:'右方', bottom:'下方', left:'左方' };
  return `${fac.emoji}${fac.name}（${sideNames[side]}）`;
}
