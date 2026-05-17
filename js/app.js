// 风林火山·四方乱斗 - 应用入口
// ============================================================

function domReady(fn) {
  if (document.readyState !== 'loading') fn();
  else document.addEventListener('DOMContentLoaded', fn);
}

let pendingMode = null;

function showScreen(id) {
  for (const el of document.querySelectorAll('.screen')) {
    el.classList.remove('active');
  }
  const target = document.getElementById(id);
  if (target) target.classList.add('active');
}

// ============================================================
// 模式选择
// ============================================================

function selectMode(mode) {
  pendingMode = mode;
  let humanSides = [];
  if (mode === 'single')     humanSides = ['bottom'];
  else if (mode === 'dual')  humanSides = ['bottom', 'right'];
  else                       humanSides = ['top', 'right', 'bottom', 'left'];

  window._pendingMode = mode;
  window._pendingHumanSides = humanSides;
  startGameWithConfig();
}

function startGameWithConfig() {
  showScreen('game-screen');
  cacheDom();
  initParticles();
  initGame();

  const humanSides = window._pendingHumanSides || ['bottom'];
  const mode = window._pendingMode || 'quad';

  gameState.mode = mode;
  gameState.humanSides = humanSides;
  gameState.humanFactions = humanSides.map(s => gameState.sideFaction[s]);

  const allSides = ['top', 'right', 'bottom', 'left'];
  gameState.aiFactions = allSides
    .filter(s => !humanSides.includes(s))
    .map(s => gameState.sideFaction[s]);

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
  showMessage('对战开始！' + getCurrentFactionInfo() + ' 先手');
  setTimeout(() => AI.checkAndExecute(), 200);
}

const originalNextTurn = nextTurn;
nextTurn = function() {
  originalNextTurn();
  if (gameState.simulating) return;
  setTimeout(() => AI.checkAndExecute(), 250);
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
// 胜利记录
// ============================================================

const originalShowVictory = showVictory;
showVictory = function(factionKey) {
  originalShowVictory(factionKey);
  if (gameState.humanFactions && gameState.humanFactions.includes(factionKey)) {
    for (const hf of gameState.humanFactions) recordGameResult(true, hf);
  } else if (gameState.humanFactions && gameState.humanFactions.length > 0) {
    for (const hf of gameState.humanFactions) recordGameResult(false, hf);
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

  for (const side of SIDES) {
    const f = gameState.sideFaction[side];
    const fac = FACTIONS[f];
    const isHuman = gameState.humanSides && gameState.humanSides.includes(side);
    const card = document.getElementById('ec-' + side);
    if (card) {
      card.className = `entrance-card ${side}${isHuman ? ' player' : ''}`;
      card.innerHTML = `
        <div class="ec-svg" style="font-size:36px;text-align:center;">${fac.icon}</div>
        <div class="ec-name" style="color:${fac.color}">${fac.name}</div>
        <div class="ec-slogan" style="font-size:10px;color:${fac.color};opacity:0.7;letter-spacing:2px;">${fac.slogan}</div>
        <div class="ec-badge ${isHuman ? 'human' : 'ai'}">${isHuman ? '👤 玩家' : '🤖 AI'}</div>
      `;
    }
  }
  entranceTimer = setTimeout(finishEntrance, 3500);
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
// 首页排行榜
// ============================================================

function updateHomeLeaderboard() {
  const records = leaderboard.getRecords();
  const stats = leaderboard.getStats();
  const totalWins = records.filter(r => r.won).length;
  const totalGames = records.length;
  const winRate = totalGames > 0 ? Math.round(totalWins / totalGames * 100) : 0;

  let rankIcon, rankName, progressPct;
  if (totalWins >= 50)      { rankIcon = '👑'; rankName = '天下霸主';   progressPct = 100; }
  else if (totalWins >= 30) { rankIcon = '💎'; rankName = '无双大将';   progressPct = (totalWins - 30) / 20 * 100; }
  else if (totalWins >= 15) { rankIcon = '🥇'; rankName = '百战精英';   progressPct = (totalWins - 15) / 15 * 100; }
  else if (totalWins >= 5)  { rankIcon = '🥈'; rankName = '沙场新锐';   progressPct = (totalWins - 5) / 10 * 100; }
  else                      { rankIcon = '🥉'; rankName = '初入江湖';   progressPct = totalWins / 5 * 100; }

  let bestFaction = '-', bestRate = 0;
  for (const [key, s] of Object.entries(stats)) {
    if (s.total > 0) {
      const rate = s.wins / s.total;
      if (rate > bestRate) { bestRate = rate; bestFaction = FACTIONS[key]?.name || key; }
    }
  }

  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set('rank-icon', rankIcon); set('rank-name', rankName);
  set('hs-total', totalGames);
  set('hs-winrate', totalGames > 0 ? winRate + '%' : '-');
  set('hs-best', bestFaction);
  const pf = document.getElementById('rank-progress-fill');
  if (pf) pf.style.width = progressPct + '%';
}

// ============================================================
// AI 模拟测试（控制台）
// ============================================================

function runSimulation(speedMs = 100) {
  console.log('=== 风林火山 AI模拟测试 ===');
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
  const maxTurns = 300;
  const interval = setInterval(() => {
    turnCount++;
    if (gameState.phase === 'victory' || turnCount > maxTurns) {
      clearInterval(interval);
      const dur = ((Date.now() - gameState.startTime) / 1000).toFixed(1);
      const winner = ['fire','forest','wind','mountain'].find(f => !isEliminated(f));
      console.log(`=== 结束 === 回合:${turnCount} 用时:${dur}s 胜者:${FACTIONS[winner]?.name||'无'}`);
      return;
    }
    const cf = currentFaction();
    if (cf) {
      const origDelay = AI.delay;
      AI.delay = { min:5, max:10 };
      AI.executeTurn(cf);
      AI.delay = origDelay;
    }
  }, speedMs);
  return interval;
}

function quickSim() { runSimulation(50); }

domReady(() => {
  showScreen('main-menu');
  initParticles();
  updateHomeLeaderboard();
  console.log('风林火山·四方乱斗 就绪');
  console.log('quickSim() 运行AI模拟');
});
