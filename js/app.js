// 风林火山·四方乱斗 - 应用入口、屏幕管理与模式选择
// ============================================================

function domReady(fn) {
  if (document.readyState !== 'loading') fn();
  else document.addEventListener('DOMContentLoaded', fn);
}

// 当前选中的模式和人族阵营
let pendingMode = null;
let selectedHumanFactions = [];
let dualSelectStep = 0; // 双人模式选阵营的步骤

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
// 模式选择
// ============================================================

function selectMode(mode) {
  pendingMode = mode;
  selectedHumanFactions = [];
  dualSelectStep = 0;

  if (mode === 'quad') {
    // 四方会战：4真人，直接开始
    startQuadGame();
  } else if (mode === 'single') {
    // 单人：选1个阵营
    showFactionSelect('single', 1);
  } else if (mode === 'dual') {
    // 双人：选2个阵营
    showFactionSelect('dual', 2);
  }
}

function showFactionSelect(mode, count) {
  showScreen('faction-select');

  const desc = document.getElementById('select-desc');
  const choices = document.getElementById('faction-choices');
  const confirmBtn = document.getElementById('confirm-faction-btn');
  const info = document.getElementById('select-info');

  if (mode === 'single') {
    desc.textContent = '选择你的阵营，其余3个由AI控制';
  } else {
    desc.textContent = `请选择第 ${dualSelectStep + 1} 个玩家阵营（共选${count}个，其余由AI控制）`;
  }

  let html = '';
  const rulesMap = {
    fire:     '<span>技能</span> 火焰贯穿：直线首个目标 · 伤害2',
    forest:   '<span>技能</span> 埋布陷阱：引爆3×3范围 · 伤害2 · 林免疫',
    wind:     '<span>技能</span> 风刃乱舞：日字AOE波及全场 · 伤害2',
    mountain: '<span>技能</span> 走打一体：6步预算 · 剩余步数=攻击力',
  };
  for (const [key, fac] of Object.entries(FACTIONS)) {
    const selected = selectedHumanFactions.includes(key);
    const disabled = selectedHumanFactions.length >= count && !selected;
    html += `<button class="faction-card ${selected ? 'selected' : ''} ${disabled ? 'disabled' : ''}"
      data-faction="${key}"
      onclick="pickFaction('${key}', ${count})"
      ${disabled ? 'disabled' : ''}>
      <span class="fc-emoji">${fac.emoji}</span>
      <span class="fc-name">${fac.name}</span>
      <span class="fc-slogan">${fac.slogan}</span>
      <span class="fc-rules">${rulesMap[key] || ''}</span>
    </button>`;
  }
  choices.innerHTML = html;

  confirmBtn.style.display = selectedHumanFactions.length >= count ? 'inline-block' : 'none';
  if (selectedHumanFactions.length >= count) {
    confirmBtn.querySelector('.btn-text').textContent = '确认并开始';
  }

  updateSelectInfo();
}

function pickFaction(faction, totalCount) {
  const idx = selectedHumanFactions.indexOf(faction);
  if (idx >= 0) {
    selectedHumanFactions.splice(idx, 1);
  } else if (selectedHumanFactions.length < totalCount) {
    selectedHumanFactions.push(faction);
  }

  // 更新按钮状态
  const cards = document.querySelectorAll('.faction-card');
  for (const card of cards) {
    const f = card.dataset.faction;
    card.classList.toggle('selected', selectedHumanFactions.includes(f));
    card.classList.toggle('disabled', selectedHumanFactions.length >= totalCount && !selectedHumanFactions.includes(f));
    if (selectedHumanFactions.length >= totalCount && !selectedHumanFactions.includes(f)) {
      card.setAttribute('disabled', '');
    } else {
      card.removeAttribute('disabled');
    }
  }

  document.getElementById('confirm-faction-btn').style.display =
    selectedHumanFactions.length >= totalCount ? 'inline-block' : 'none';

  updateSelectInfo();
}

function updateSelectInfo() {
  const info = document.getElementById('select-info');
  if (!info) return;
  if (selectedHumanFactions.length === 0) {
    info.innerHTML = '<span class="ai-tag">其余阵营将由 🤖 AI 控制</span>';
  } else {
    const selectedNames = selectedHumanFactions.map(f => FACTIONS[f].emoji + FACTIONS[f].name).join('、');
    const allFactions = ['fire','forest','wind','mountain'];
    const aiFactions = allFactions.filter(f => !selectedHumanFactions.includes(f));
    const aiNames = aiFactions.map(f => FACTIONS[f].emoji + FACTIONS[f].name).join(' ');
    info.innerHTML = `<div>你的阵营：${selectedNames}</div><div class="ai-tag">🤖 AI方：${aiNames}</div>`;
  }
}

function confirmFactionSelection() {
  const total = pendingMode === 'single' ? 1 : 2;
  if (selectedHumanFactions.length < total) return;

  const allFactions = ['fire', 'forest', 'wind', 'mountain'];
  const aiFactions = allFactions.filter(f => !selectedHumanFactions.includes(f));

  // 暂存配置（initGame会重置gameState）
  window._pendingMode = pendingMode;
  window._pendingAiFactions = aiFactions;
  window._pendingHumanFactions = selectedHumanFactions;

  startGameWithConfig();
}

function startQuadGame() {
  window._pendingMode = 'quad';
  window._pendingAiFactions = [];
  window._pendingHumanFactions = ['fire', 'forest', 'wind', 'mountain'];
  startGameWithConfig();
}

function startGameWithConfig() {
  showScreen('game-screen');
  cacheDom();
  initParticles();
  initGame();
  gameState.mode = window._pendingMode || 'quad';
  gameState.aiFactions = window._pendingAiFactions || [];
  gameState.humanFactions = window._pendingHumanFactions || ['fire','forest','wind','mountain'];

  // 播放入场动画
  playEntrance(() => {
    updateUI();
    showMessage('行动顺序已随机决定，点击"开始对战"');
  });
}

function backToMenu() {
  stopParticles();
  clearAllDynamicElements();
  clearEdgeInfo();
  pendingMode = null;
  selectedHumanFactions = [];
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
  showMessage('对战开始！' + getCurrentFactionInfo() + '的回合');

  // 检查是否需要AI行动
  setTimeout(() => AI.checkAndExecute(), 300);
}

// 每回合结束后检查AI
const originalNextTurn = nextTurn;
nextTurn = function() {
  originalNextTurn();
  if (gameState.simulating) return;
  setTimeout(() => AI.checkAndExecute(), 500);
};

const originalCheckAndNextTurn = checkAndNextTurn;
checkAndNextTurn = function() {
  originalCheckAndNextTurn();
  if (gameState.simulating) return;
  setTimeout(() => AI.checkAndExecute(), 500);
};

function restartGame() {
  stopParticles();
  clearAllDynamicElements();
  clearEdgeInfo();
  // 保存模式配置
  window._pendingMode = gameState.mode || 'quad';
  window._pendingAiFactions = gameState.aiFactions || [];
  window._pendingHumanFactions = gameState.humanFactions || [];
  startGameWithConfig();
}

// ============================================================
// 胜利记录（覆盖board.js的showVictory）
// ============================================================

const originalShowVictory = showVictory;
showVictory = function(factionKey) {
  originalShowVictory(factionKey);

  // 记录战绩
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
  const factionsEl = document.getElementById('entrance-factions');
  const vsEl = document.getElementById('entrance-vs');
  if (!overlay || !factionsEl) { onDone(); return; }

  entranceCallback = onDone;
  overlay.classList.remove('hidden');

  // 构建阵营卡片
  const allFactions = ['fire', 'forest', 'wind', 'mountain'];
  let html = '';
  for (const f of allFactions) {
    const fac = FACTIONS[f];
    html += `<div class="entrance-faction" style="color:${fac.color}">
      <span class="ef-icon">${fac.emoji}</span>
      <span class="ef-name" style="font-size:18px;font-weight:700;letter-spacing:2px;">${fac.name}</span>
    </div>`;
  }
  factionsEl.innerHTML = html;

  // 2秒后显示VS
  vsEl.style.display = 'none';
  setTimeout(() => {
    vsEl.style.display = 'block';
  }, 2000);

  // 3.8秒后自动结束
  entranceTimer = setTimeout(() => {
    finishEntrance();
  }, 3800);
}

function skipEntrance() {
  if (entranceTimer) {
    clearTimeout(entranceTimer);
    entranceTimer = null;
  }
  finishEntrance();
}

function finishEntrance() {
  const overlay = document.getElementById('entrance-overlay');
  if (overlay) overlay.classList.add('hidden');
  if (entranceTimer) {
    clearTimeout(entranceTimer);
    entranceTimer = null;
  }
  if (entranceCallback) {
    const cb = entranceCallback;
    entranceCallback = null;
    cb();
  }
}

// ============================================================
// 首页排行榜 + 段位系统
// ============================================================

function updateHomeLeaderboard() {
  const records = leaderboard.getRecords();
  const stats = leaderboard.getStats();

  // 计算总战绩
  let totalGames = records.length;
  let totalWins = 0;
  for (const r of records) {
    if (r.won) totalWins++;
  }
  const winRate = totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0;

  // 段位计算
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

  // 最佳阵营
  let bestFaction = '-';
  let bestRate = 0;
  for (const [key, s] of Object.entries(stats)) {
    if (s.total > 0) {
      const rate = s.wins / s.total;
      if (rate > bestRate) {
        bestRate = rate;
        bestFaction = (FACTIONS[key]?.emoji || '') + (FACTIONS[key]?.name || key);
      }
    }
  }

  // 更新DOM
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
// AI 自动模拟测试（控制台调用: runSimulation()）
// ============================================================

function runSimulation(speedMs = 200) {
  console.log('=== 风林火山 全流程模拟测试开始 ===');

  // 设置AI-only模式
  window._pendingMode = 'quad';
  window._pendingAiFactions = ['fire', 'forest', 'wind', 'mountain'];
  window._pendingHumanFactions = [];

  showScreen('game-screen');
  cacheDom();
  initParticles();
  initGame();

  gameState.mode = 'quad';
  gameState.aiFactions = ['fire', 'forest', 'wind', 'mountain'];
  gameState.humanFactions = [];
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
      console.log(`=== 模拟结束 ===`);
      console.log(`总回合数: ${turnCount}`);
      console.log(`用时: ${duration}秒`);
      if (gameState.phase === 'victory') {
        const winner = ['fire','forest','wind','mountain'].find(f => !isEliminated(f));
        console.log(`胜利者: ${FACTIONS[winner]?.emoji}${FACTIONS[winner]?.name}`);
      }
      console.log(`淘汰顺序: ${gameState.eliminated.map(f => FACTIONS[f].name).join(' → ')}`);
      console.log(`最终存活棋子:`);
      for (const f of ['fire','forest','wind','mountain']) {
        const alive = getAlivePieces(f);
        console.log(`  ${FACTIONS[f].emoji}${FACTIONS[f].name}: ${alive.length}颗棋子 HP=[${alive.map(p=>p.hp).join(',')}]`);
      }
      return;
    }

    const cf = currentFaction();
    if (cf && gameState.aiFactions.includes(cf)) {
      // 减少延迟加速模拟
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

// 快速模拟
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
