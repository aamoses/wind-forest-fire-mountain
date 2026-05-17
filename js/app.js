// 风林火山·四方乱斗 - 应用入口、屏幕管理与模式选择
// ============================================================

function domReady(fn) {
  if (document.readyState !== 'loading') fn();
  else document.addEventListener('DOMContentLoaded', fn);
}

let pendingMode = null;

// ============================================================
// 屏幕管理
// ============================================================

function showScreen(id) {
  for (const el of document.querySelectorAll('.screen, .overlay')) {
    el.classList.remove('active');
  }
  const target = document.getElementById(id);
  if (target) target.classList.add('active');
}

// ============================================================
// 模式选择 → 直接开局（阵营随机分配）
// ============================================================

function selectMode(mode) {
  pendingMode = mode;

  // 不再需要选阵营，直接随机分配
  // 单人: 下方=玩家, 其余3边=AI
  // 双人: 下方+右方=玩家, 其余2边=AI
  // 四人: 四边都是玩家
  let humanSides = [];
  if (mode === 'single') {
    humanSides = ['bottom'];
  } else if (mode === 'dual') {
    humanSides = ['bottom', 'right'];
  } else {
    humanSides = ['top', 'right', 'bottom', 'left'];
  }

  window._pendingMode = mode;
  window._pendingHumanSides = humanSides;
  startGameWithConfig();
}

function startGameWithConfig() {
  showScreen('game-screen');
  cacheDom();
  initParticles();
  initGame();

  // initGame已随机分配阵营到四边，设置人机配置
  const humanSides = window._pendingHumanSides || ['bottom'];
  const mode = window._pendingMode || 'quad';

  gameState.mode = mode;
  gameState.humanSides = humanSides;

  // 计算AI阵营和人类阵营
  gameState.humanFactions = humanSides.map(s => gameState.sideFaction[s]);
  const allSides = ['top', 'right', 'bottom', 'left'];
  gameState.aiFactions = allSides
    .filter(s => !humanSides.includes(s))
    .map(s => gameState.sideFaction[s]);

  // 播放入场动画
  playEntrance(() => {
    dom.startOverlay.style.display = 'flex';
    renderTurnOrder();
    updateUI();
  });
}

function backToMenu() {
  stopParticles();
  clearAllDynamicElements();
  clearEdgeInfo();
  pendingMode = null;
  showScreen('main-menu');
}

// ============================================================
// 游戏流程
// ============================================================

function startBattle() {
  gameState.phase = 'playing';
  gameState.startTime = Date.now();
  advanceToAliveFaction();
  dom.startOverlay.style.display = 'none';
  updateUI();
  showMessage('对战开始！' + getCurrentFactionInfo() + ' 的回合');
  setTimeout(() => AI.checkAndExecute(), 150);
}

// 每回合结束后检查AI
const originalNextTurn = nextTurn;
nextTurn = function() {
  originalNextTurn();
  if (gameState.simulating) return;
  setTimeout(() => AI.checkAndExecute(), 200);
};

const originalCheckAndNextTurn = checkAndNextTurn;
checkAndNextTurn = function() {
  originalCheckAndNextTurn();
};

function restartGame() {
  stopParticles();
  clearAllDynamicElements();
  clearEdgeInfo();
  window._pendingMode = gameState.mode || 'quad';
  window._pendingHumanSides = gameState.humanSides || ['bottom'];
  startGameWithConfig();
}

// ============================================================
// 胜利记录（覆盖board.js的showVictory）
// ============================================================

const originalShowVictory = showVictory;
showVictory = function(factionKey) {
  originalShowVictory(factionKey);

  if (gameState.humanFactions && gameState.humanFactions.includes(factionKey)) {
    for (const hf of gameState.humanFactions) {
      recordGameResult(true, hf);
    }
  } else if (gameState.humanFactions && gameState.humanFactions.length > 0) {
    for (const hf of gameState.humanFactions) {
      recordGameResult(false, hf);
    }
  }
};

// ============================================================
// 入场动画
// ============================================================

let entranceTimer = null;
let entranceCallback = null;

function playEntrance(onDone) {
  const overlay = document.getElementById('entrance-overlay');
  if (!overlay) { onDone(); return; }

  entranceCallback = onDone;
  overlay.classList.remove('hidden');

  // 按四条边填充对应角落卡片
  const sides = ['top', 'right', 'bottom', 'left'];
  for (const side of sides) {
    const f = gameState.sideFaction[side];
    const fac = FACTIONS[f];
    const isHuman = gameState.humanSides && gameState.humanSides.includes(side);
    const card = document.getElementById('ec-' + side);
    if (card) {
      card.className = 'entrance-card ' + side + (isHuman ? ' player' : '');
      card.innerHTML =
        '<div class="ec-svg">' + SOLDIER_SVG[f] + '</div>' +
        '<div class="ec-name" style="color:' + fac.color + '">' + fac.name + '</div>' +
        '<div class="ec-badge ' + (isHuman ? 'human' : 'ai') + '">' + (isHuman ? '👤 玩家' : '🤖 AI') + '</div>';
    }
  }

  entranceTimer = setTimeout(function() { finishEntrance(); }, 3800);
}

function skipEntrance() {
  if (entranceTimer) { clearTimeout(entranceTimer); entranceTimer = null; }
  finishEntrance();
}

function finishEntrance() {
  const overlay = document.getElementById('entrance-overlay');
  if (overlay) overlay.classList.add('hidden');
  if (entranceTimer) { clearTimeout(entranceTimer); entranceTimer = null; }
  if (entranceCallback) { const cb = entranceCallback; entranceCallback = null; cb(); }
}

// ============================================================
// 首页排行榜 + 段位系统
// ============================================================

function updateHomeLeaderboard() {
  const records = leaderboard.getRecords();
  const stats = leaderboard.getStats();

  let totalGames = records.length;
  let totalWins = 0;
  for (const r of records) {
    if (r.won) totalWins++;
  }
  const winRate = totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0;

  let rankIcon, rankName, progressPct;
  if (totalWins >= 50) {
    rankIcon = '👑'; rankName = '天下霸主'; progressPct = 100;
  } else if (totalWins >= 30) {
    rankIcon = '💎'; rankName = '无双大将'; progressPct = ((totalWins - 30) / 20) * 100;
  } else if (totalWins >= 15) {
    rankIcon = '🥇'; rankName = '百战精英'; progressPct = ((totalWins - 15) / 15) * 100;
  } else if (totalWins >= 5) {
    rankIcon = '🥈'; rankName = '沙场新锐'; progressPct = ((totalWins - 5) / 10) * 100;
  } else {
    rankIcon = '🥉'; rankName = '初入江湖'; progressPct = (totalWins / 5) * 100;
  }

  let bestFaction = '-';
  let bestRate = 0;
  for (const [key, s] of Object.entries(stats)) {
    if (s.total > 0) {
      const rate = s.wins / s.total;
      if (rate > bestRate) { bestRate = rate; bestFaction = (FACTIONS[key]?.emoji||'') + (FACTIONS[key]?.name||key); }
    }
  }

  const ri = document.getElementById('rank-icon');
  const rn = document.getElementById('rank-name');
  const pf = document.getElementById('rank-progress-fill');
  const hsTotal = document.getElementById('hs-total');
  const hsWinrate = document.getElementById('hs-winrate');
  const hsBest = document.getElementById('hs-best');

  if (ri) ri.textContent = rankIcon;
  if (rn) rn.textContent = rankName;
  if (pf) pf.style.width = progressPct + '%';
  if (hsTotal) hsTotal.textContent = totalGames;
  if (hsWinrate) hsWinrate.textContent = totalGames > 0 ? winRate + '%' : '-';
  if (hsBest) hsBest.textContent = bestFaction;
}

// ============================================================
// AI 自动模拟测试
// ============================================================

function runSimulation(speedMs = 200) {
  console.log('=== 风林火山 全流程模拟测试开始 ===');

  window._pendingMode = 'quad';
  window._pendingHumanSides = [];

  showScreen('game-screen');
  cacheDom();
  initParticles();
  initGame();

  gameState.mode = 'quad';
  gameState.humanSides = [];
  gameState.humanFactions = [];
  gameState.aiFactions = ['fire','forest','wind','mountain'];
  gameState.simulating = true;
  gameState.phase = 'playing';
  gameState.startTime = Date.now();
  advanceToAliveFaction();
  dom.startOverlay.style.display = 'none';
  updateUI();

  let turnCount = 0;
  const maxTurns = 200;

  const simInterval = setInterval(() => {
    turnCount++;
    if (gameState.phase === 'victory' || turnCount > maxTurns) {
      clearInterval(simInterval);
      const duration = ((Date.now() - gameState.startTime) / 1000).toFixed(1);
      console.log(`=== 模拟结束 === 总回合: ${turnCount} 用时: ${duration}秒`);
      if (gameState.phase === 'victory') {
        const winner = ['fire','forest','wind','mountain'].find(f => !isEliminated(f));
        console.log(`胜利者: ${FACTIONS[winner]?.emoji}${FACTIONS[winner]?.name}`);
      }
      console.log(`淘汰顺序: ${gameState.eliminated.map(f => FACTIONS[f].name).join(' → ')}`);
      for (const f of ['fire','forest','wind','mountain']) {
        const alive = getAlivePieces(f);
        console.log(`  ${FACTIONS[f].emoji}${FACTIONS[f].name}: ${alive.length}棋 HP=[${alive.map(p=>p.hp).join(',')}]`);
      }
      return;
    }

    const cf = currentFaction();
    if (cf && gameState.aiFactions.includes(cf)) {
      const origDelay = AI.delay;
      AI.delay = { min: 10, max: 30 };
      AI.executeTurn(cf);
      AI.delay = origDelay;
      const alive = getAlivePieces(cf);
      console.log(`回合${turnCount}: ${FACTIONS[cf].emoji}${FACTIONS[cf].name} 行动 (存活${alive.length}棋)`);
    }
  }, speedMs);

  return simInterval;
}

function quickSim() {
  runSimulation(50);
}

domReady(() => {
  showScreen('main-menu');
  initParticles();
  updateHomeLeaderboard();
  console.log('风林火山·四方乱斗 已就绪');
  console.log('控制台输入 quickSim() 运行AI模拟测试');
});
