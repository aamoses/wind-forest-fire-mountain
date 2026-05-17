// 风林火山·四方乱斗 - 用户交互处理
// ============================================================

// ============================================================
// 棋子交互
// ============================================================

function onPieceClick(pieceId) {
  if (gameState.phase !== 'playing') return;

  const piece = gameState.pieces.find(p => p.id === pieceId);
  if (!piece || piece.hp <= 0) return;

  const cf = currentFaction();
  if (!cf) return;

  // 山阵营特殊：已在走打一体模式时
  if (cf === 'mountain' && gameState.actionMode === 'mountain') {
    if (piece.faction !== 'mountain') {
      const mPiece = gameState.pieces.find(p => p.id === gameState.mountainPieceId);
      if (mPiece) {
        const neighbors = ADJ[mPiece.position] || [];
        if (neighbors.includes(piece.position)) {
          handleMountainPointClick(piece.position);
          return;
        }
      }
      showMessage('该棋子不在攻击范围内（需相邻1格）');
      return;
    }
    if (piece.faction === 'mountain') {
      onMountainPieceClick(pieceId);
      return;
    }
    return;
  }

  // 只能操作自己阵营的棋子
  if (piece.faction !== cf) {
    showMessage('这不是你的棋子');
    return;
  }

  // 如果点击的是已选中的棋子
  if (piece.id === gameState.selectedPieceId) {
    if (gameState.actionMode) {
      clearActionMode();
      gameState.actionMode = null;
      gameState.validTargets = [];
      updatePieceRender();
      updateActionButtons();
      showMessage('已取消操作，请选择操作');
      return;
    } else {
      cancelSelection();
      return;
    }
  }

  // 山阵营特殊处理
  if (cf === 'mountain') {
    onMountainPieceClick(pieceId);
    return;
  }

  selectPiece(pieceId);
}

function selectPiece(pieceId) {
  clearActionMode();
  gameState.selectedPieceId = pieceId;
  gameState.actionMode = null;
  gameState.validTargets = [];
  updatePieceRender();
  updateActionButtons();
  showMessage('请选择操作');
}

function onPointClick(pointId) {
  if (gameState.phase !== 'playing') return;

  const cf = currentFaction();
  if (!cf) return;

  const mode = gameState.actionMode;

  if (!mode || mode === null) {
    const piece = getPieceAt(pointId);
    if (piece && piece.faction === cf) {
      onPieceClick(piece.id);
    }
    return;
  }

  switch (mode) {
    case 'move':
      if (gameState.validTargets.includes(pointId)) {
        executeMove(pointId);
      }
      break;
    case 'trap_place':
      if (gameState.validTargets.includes(pointId)) {
        placeTrap(pointId);
      }
      break;
    case 'trap_detonate':
      break;
    case 'mountain':
      handleMountainPointClick(pointId);
      break;
  }
}

function onTrapClick(trapId) {
  if (gameState.actionMode !== 'trap_detonate') return;
  const trap = gameState.traps.find(t => t.id === trapId);
  if (!trap) return;
  detonateTrap(trap);
}

// ============================================================
// 操作按钮
// ============================================================

function updateActionButtons() {
  const cf = currentFaction();
  if (!cf || gameState.phase !== 'playing') {
    dom.actionBar.innerHTML = '';
    return;
  }

  if (!gameState.selectedPieceId || gameState.selectedPieceId === null) {
    dom.actionBar.innerHTML = '<span style="color:#8b7355;font-size:14px;">点击己方棋子开始操作</span>';
    return;
  }

  let html = '';

  if (cf === 'mountain') {
    html += `<button class="chalk-btn" onclick="endMountainTurn()">结束回合</button>`;
    html += `<button class="chalk-btn" onclick="cancelSelection()">换棋子</button>`;
  } else if (cf === 'forest') {
    html += `<button class="chalk-btn${gameState.actionMode==='move'?' active':''}" onclick="enterMoveMode()">移动</button>`;
    html += `<button class="chalk-btn${gameState.actionMode==='trap_place'?' active':''}" onclick="enterTrapPlaceMode()">布陷阱</button>`;
    html += `<button class="chalk-btn${gameState.actionMode==='trap_detonate'?' active':''}" onclick="enterTrapDetonateMode()">引爆</button>`;
    if (gameState.actionMode) {
      html += `<button class="chalk-btn" onclick="cancelActionMode()" style="margin-left:8px;opacity:0.7;">取消</button>`;
    }
  } else {
    html += `<button class="chalk-btn${gameState.actionMode==='move'?' active':''}" onclick="enterMoveMode()">移动</button>`;
    html += `<button class="chalk-btn${gameState.actionMode==='attack'||gameState.actionMode==='fire_dir'?' active':''}" onclick="enterAttackMode()">攻击</button>`;
    if (gameState.actionMode) {
      html += `<button class="chalk-btn" onclick="cancelActionMode()" style="margin-left:8px;opacity:0.7;">取消</button>`;
    }
  }

  dom.actionBar.innerHTML = html;
}

function enterMoveMode() {
  if (!gameState.selectedPieceId) return;
  const piece = gameState.pieces.find(p => p.id === gameState.selectedPieceId);
  if (!piece) return;

  gameState.actionMode = 'move';
  gameState.validTargets = getValidMoves(piece.position);
  clearHighlights();
  highlightPoints(gameState.validTargets, 'valid-move');
  updateActionButtons();
  showMessage('请点击绿色目标点移动');
}

function enterAttackMode() {
  if (!gameState.selectedPieceId) return;
  const cf = currentFaction();

  if (cf === 'fire') {
    gameState.actionMode = 'fire_dir';
    gameState.firePieceId = gameState.selectedPieceId;
    gameState.validTargets = [];
    clearHighlights();
    renderArrows();
    updateActionButtons();
    showMessage('请点击方向箭头释放火焰');
  } else if (cf === 'wind') {
    gameState.actionMode = 'attack';
    const piece = gameState.pieces.find(p => p.id === gameState.selectedPieceId);
    const targets = getWindTargets(piece.position);
    gameState.validTargets = targets.map(t => t.pointId);
    clearHighlights();
    highlightPoints(gameState.validTargets, 'valid-attack');
    updateActionButtons();
    dom.actionBar.innerHTML +=
      `<button class="chalk-btn active" onclick="executeWindSkill()">确认释放风刃</button>`;
    showMessage('日字型范围已显示，点击确认释放');
  }
}

function enterTrapPlaceMode() {
  if (!gameState.selectedPieceId) return;

  const occupied = new Set();
  for (const piece of gameState.pieces) {
    if (piece.hp > 0) occupied.add(piece.position);
  }
  for (const trap of gameState.traps) {
    occupied.add(trap.position);
  }

  const allPoints = POINTS.map(p => p.id);
  gameState.validTargets = allPoints.filter(id => !occupied.has(id));

  gameState.actionMode = 'trap_place';
  clearHighlights();
  highlightPoints(gameState.validTargets, 'trap-target');
  updateActionButtons();
  showMessage('请点击空位放置陷阱');
}

function enterTrapDetonateMode() {
  if (gameState.traps.length === 0) {
    showMessage('没有已埋的陷阱');
    return;
  }

  gameState.actionMode = 'trap_detonate';
  gameState.validTargets = [];
  clearHighlights();
  updatePieceRender();
  updateActionButtons();
  showMessage('请点击要引爆的陷阱');
}

function cancelSelection() {
  clearActionMode();
  gameState.selectedPieceId = null;
  gameState.mountainPieceId = null;
  gameState.mountainRemaining = 0;
  updatePieceRender();
  updateActionButtons();
  updateMountainDisplay();
  showMessage('已取消选择');
}

function cancelActionMode() {
  clearActionMode();
  gameState.actionMode = null;
  gameState.validTargets = [];
  updatePieceRender();
  updateActionButtons();
  showMessage('请选择操作');
}

function clearActionMode() {
  gameState.actionMode = null;
  gameState.validTargets = [];
  gameState.firePieceId = null;
  gameState._mountainMoves = null;
  gameState._mountainAttacks = null;
  clearHighlights();
  clearArrows();
  dom.effectsLayer.innerHTML = '';
}

// ============================================================
// 移动逻辑
// ============================================================

function getValidMoves(pointId) {
  const neighbors = ADJ[pointId] || [];
  const occupied = new Set();
  for (const piece of gameState.pieces) {
    if (piece.hp > 0) occupied.add(piece.position);
  }
  return neighbors.filter(id => !occupied.has(id));
}

function executeMove(toPointId) {
  const piece = gameState.pieces.find(p => p.id === gameState.selectedPieceId);
  if (!piece) return;

  piece.position = toPointId;

  clearActionMode();
  gameState.selectedPieceId = null;
  gameState.validTargets = [];
  updatePieceRender();
  updateActionButtons();
  showMessage(`${FACTIONS[piece.faction].emoji} 移动到位置${toPointId}`);
  nextTurn();
}
