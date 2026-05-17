// 风林火山·四方乱斗 - 入口与生命周期
// ============================================================

function domReady(fn) {
  if (document.readyState !== 'loading') fn();
  else document.addEventListener('DOMContentLoaded', fn);
}

// ============================================================
// 游戏流程控制
// ============================================================

function startGame() {
  gameState.phase = 'playing';
  advanceToAliveFaction();
  dom.startOverlay.style.display = 'none';
  updateUI();
  showMessage('对战开始！' + getCurrentFactionInfo() + '的回合');
}

function restartGame() {
  stopParticles();
  clearAllDynamicElements();
  clearEdgeInfo();
  initGame();
}

// ============================================================
// 启动
// ============================================================

domReady(() => {
  cacheDom();
  initParticles();
  initGame();
});
