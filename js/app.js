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
  // initGame覆盖了gameState，之后设置模式配置
  gameState.mode = window._pendingMode || 'quad';
  gameState.aiFactions = window._pendingAiFactions || [];
  gameState.humanFactions = window._pendingHumanFactions || ['fire','forest','wind','mountain'];
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
  // 如果是AI回合，触发AI
  setTimeout(() => AI.checkAndExecute(), 500);
};

const originalCheckAndNextTurn = checkAndNextTurn;
checkAndNextTurn = function() {
  originalCheckAndNextTurn();
  // 如果是AI回合，触发AI
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
// 启动
// ============================================================

domReady(() => {
  showScreen('main-menu');
  initParticles();
});
