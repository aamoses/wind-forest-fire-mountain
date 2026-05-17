// 风林火山·四方乱斗 - 用户交互与战斗
// ============================================================

// ============================================================
// 目标计算
// ============================================================

function getMeleeTargets(pointId) {
  const neighbors = ADJ[pointId] || [];
  const cf = currentFaction();
  return neighbors.filter(nid => {
    const p = getPieceAt(nid);
    return p && p.faction !== cf;
  });
}

function getValidMoves(pointId) {
  const occupied = new Set(
    gameState.pieces.filter(p => p.hp > 0).map(p => p.position)
  );
  return (ADJ[pointId] || []).filter(id => !occupied.has(id));
}

// ============================================================
// 棋子交互
// ============================================================

function onPieceClick(pieceId) {
  if (gameState.phase !== 'playing') return;
  const cf = currentFaction();
  if (!cf) return;
  if (!gameState.humanFactions || !gameState.humanFactions.includes(cf)) return;

  const piece = gameState.pieces.find(p => p.id === pieceId);
  if (!piece || piece.hp <= 0) return;

  // 山阵营特殊
  if (cf === 'mountain') { onMountainPieceClick(pieceId); return; }

  // 点击已选中的棋子 → 取消当前模式或取消选中
  if (piece.id === gameState.selectedPieceId) {
    if (gameState.actionMode) {
      clearActionMode();
      updatePieceRender();
      updateActionButtons();
      showMessage('已取消，请选择行动');
    } else {
      cancelSelection();
    }
    return;
  }

  if (piece.faction !== cf) {
    showMessage('只能操作己方棋子');
    return;
  }

  // 如果本回合已行动过（moved but not attacked），仍可切换到未行动棋子
  // 但如果已完成整个回合则不允许
  selectPiece(pieceId);
}

function selectPiece(pieceId) {
  clearActionMode();
  gameState.selectedPieceId = pieceId;
  gameState.actionMode = null;
  gameState.validTargets = [];
  const piece = gameState.pieces.find(p => p.id === pieceId);
  if (piece) {
    // 自动显示可移动格
    const ta = gameState.turnActions;
    if (!ta.moved || ta.pieceId === pieceId) {
      const moves = getValidMoves(piece.position);
      clearHighlights();
      highlightPoints(moves, 'valid-move');
      gameState._autoMoves = moves;
    } else {
      clearHighlights();
    }
  }
  updatePieceRender();
  updateActionButtons();
  showMessage('请选择行动');
}

function onPointClick(pointId) {
  if (gameState.phase !== 'playing') return;
  const cf = currentFaction();
  if (!cf) return;
  if (!gameState.humanFactions || !gameState.humanFactions.includes(cf)) return;

  const mode = gameState.actionMode;

  if (!mode) {
    const piece = getPieceAt(pointId);
    if (piece && piece.faction === cf) {
      onPieceClick(piece.id);
    } else if (piece && piece.faction !== cf && gameState.selectedPieceId) {
      // 点击敌方棋子且有选中己方 → 尝试攻击
      const selPiece = gameState.pieces.find(p => p.id === gameState.selectedPieceId && p.hp > 0);
      if (selPiece && (ADJ[selPiece.position] || []).includes(pointId)) {
        executeMeleeAttack(pointId);
      }
    }
    return;
  }

  switch (mode) {
    case 'move':
      if (gameState.validTargets.includes(pointId)) executeMove(pointId);
      break;
    case 'attack':
      if (gameState.validTargets.includes(pointId)) executeMeleeAttack(pointId);
      break;
    case 'trap_place':
      if (gameState.validTargets.includes(pointId)) placeTrap(pointId);
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
  if (trap) detonateTrap(trap);
}

// ============================================================
// 近战攻击
// ============================================================

function executeMeleeAttack(targetPointId) {
  if (isDeployPhase()) { showMessage('布阵阶段不可攻击'); return; }
  const piece = gameState.pieces.find(p => p.id === gameState.selectedPieceId);
  if (!piece) return;
  const targetPiece = getPieceAt(targetPointId);
  if (!targetPiece) return;

  const damage = calcDamage(piece.faction, targetPiece.faction, 2);
  const killed = targetPiece.hp <= damage;
  applyDamageToPiece(targetPiece, damage);
  flashPoint(targetPointId, 'flash-explosion');

  const ci = getCounterInfo(piece.faction, targetPiece.faction);
  if (killed) {
    const from = piece.position;
    schedulePieceAnimation(piece.id, from, targetPointId);
    piece.position = targetPointId;
    showMessage(`${FACTIONS[piece.faction].emoji}击杀${FACTIONS[targetPiece.faction].emoji}！伤害${damage}${ci}`);
  } else {
    showMessage(`${FACTIONS[piece.faction].emoji}近战${FACTIONS[targetPiece.faction].emoji}，伤害${damage}${ci}（剩余HP:${targetPiece.hp}）`);
  }

  gameState.turnActions.attacked = true;
  clearActionMode();
  gameState.selectedPieceId = null;
  gameState.validTargets = [];
  updatePieceRender();
  updateActionButtons();
  checkAndNextTurn();
}

// ============================================================
// 移动（移动后不结束回合，可继续攻击/技能）
// ============================================================

function executeMove(toPointId) {
  const piece = gameState.pieces.find(p => p.id === gameState.selectedPieceId);
  if (!piece) return;

  const from = piece.position;
  schedulePieceAnimation(piece.id, from, toPointId);
  piece.position = toPointId;

  gameState.turnActions.moved = true;
  gameState.turnActions.pieceId = piece.id;

  clearActionMode();
  gameState.validTargets = [];
  updatePieceRender();

  // 移动后：检查新位置是否有攻击机会，提示用户
  const meleeTargets = getMeleeTargets(toPointId);
  if (meleeTargets.length > 0 && !isDeployPhase()) {
    highlightPoints(meleeTargets, 'valid-attack');
    gameState.validTargets = meleeTargets;
    gameState.actionMode = 'attack';
    showMessage(`${FACTIONS[piece.faction].emoji}移动完毕，可继续攻击（红点）或结束回合`);
  } else {
    showMessage(`${FACTIONS[piece.faction].emoji}移动完毕，可继续行动或结束回合`);
  }
  updateActionButtons();
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

  if (!gameState.selectedPieceId) {
    const deploy = isDeployPhase() ? '<span class="phase-badge">布阵期</span>' : '';
    dom.actionBar.innerHTML = `<span style="color:var(--text-dim);font-size:12px;letter-spacing:1px;">点击己方棋子开始行动</span>${deploy ? ' ' + deploy : ''}`;
    return;
  }

  const ta = gameState.turnActions;
  const piece = gameState.pieces.find(p => p.id === gameState.selectedPieceId);
  const canMove = !ta.moved;
  const canAct = !ta.attacked;
  const inDeploy = isDeployPhase();

  let html = '';

  if (cf === 'mountain') {
    html += `<button class="chalk-btn" onclick="endMountainTurn()">结束回合</button>`;
    html += `<button class="chalk-btn" onclick="cancelSelection()">换人</button>`;
  } else if (cf === 'forest') {
    if (canMove) html += `<button class="chalk-btn${gameState.actionMode==='move'?' active':''}" onclick="enterMoveMode()">移动</button>`;
    if (!inDeploy && canAct) html += `<button class="chalk-btn${gameState.actionMode==='attack'?' active':''}" onclick="enterAttackMode()">近战</button>`;
    html += `<button class="chalk-btn${gameState.actionMode==='trap_place'?' active':''}" onclick="enterTrapPlaceMode()">部署无人机</button>`;
    if (!inDeploy) html += `<button class="chalk-btn${gameState.actionMode==='trap_detonate'?' active':''}" onclick="enterTrapDetonateMode()">引爆</button>`;
    html += `<button class="chalk-btn danger" onclick="endTurnManually()">结束回合</button>`;
  } else {
    if (canMove) html += `<button class="chalk-btn${gameState.actionMode==='move'?' active':''}" onclick="enterMoveMode()">移动</button>`;
    if (!inDeploy && canAct) html += `<button class="chalk-btn${gameState.actionMode==='attack'?' active':''}" onclick="enterAttackMode()">近战</button>`;
    if (!inDeploy && canAct) html += `<button class="chalk-btn${(gameState.actionMode==='fire_dir'||gameState.actionMode==='attack_skill')?' active':''}" onclick="enterSkillMode()">技能</button>`;
    html += `<button class="chalk-btn danger" onclick="endTurnManually()">结束回合</button>`;
  }

  if (gameState.actionMode && gameState.actionMode !== 'attack') {
    html += `<button class="chalk-btn" onclick="cancelActionMode()" style="opacity:0.65;">取消</button>`;
  }

  dom.actionBar.innerHTML = html;
}

// ============================================================
// 手动结束回合
// ============================================================

function endTurnManually() {
  const cf = currentFaction();
  const ta = gameState.turnActions;
  if (!ta.moved && !ta.attacked) {
    // 什么都没做，提示但允许结束
    showMessage('回合结束（未行动）');
  }
  clearActionMode();
  gameState.selectedPieceId = null;
  gameState.validTargets = [];
  updatePieceRender();
  updateActionButtons();
  nextTurn();
}

// ============================================================
// 模式进入
// ============================================================

function enterMoveMode() {
  if (!gameState.selectedPieceId) return;
  const ta = gameState.turnActions;
  if (ta.moved) { showMessage('本回合已移动过'); return; }
  const piece = gameState.pieces.find(p => p.id === gameState.selectedPieceId);
  if (!piece) return;
  gameState.actionMode = 'move';
  gameState.validTargets = getValidMoves(piece.position);
  clearHighlights();
  highlightPoints(gameState.validTargets, 'valid-move');
  updateActionButtons();
  showMessage('点击绿色路口移动');
}

function enterAttackMode() {
  if (isDeployPhase()) { showMessage('布阵阶段不可攻击'); return; }
  if (!gameState.selectedPieceId) return;
  const piece = gameState.pieces.find(p => p.id === gameState.selectedPieceId);
  if (!piece) return;
  const targets = getMeleeTargets(piece.position);
  if (targets.length === 0) { showMessage('附近没有敌人'); return; }
  gameState.actionMode = 'attack';
  gameState.validTargets = targets;
  clearHighlights();
  highlightPoints(targets, 'valid-attack');
  updateActionButtons();
  showMessage('点击红色目标发动近战（伤害2）');
}

function enterSkillMode() {
  if (isDeployPhase()) { showMessage('布阵阶段不可使用技能'); return; }
  if (!gameState.selectedPieceId) return;
  const cf = currentFaction();

  if (cf === 'fire') {
    gameState.actionMode = 'fire_dir';
    gameState.firePieceId = gameState.selectedPieceId;
    gameState.validTargets = [];
    clearHighlights();
    renderArrows();
    updateActionButtons();
    showMessage('🎯狙击：选择方向，直线命中首个目标（伤害2）');
  } else if (cf === 'wind') {
    gameState.actionMode = 'attack_skill';
    const piece = gameState.pieces.find(p => p.id === gameState.selectedPieceId);
    const targets = getWindTargets(piece.position, piece.id);
    gameState.validTargets = targets.map(t => t.pointId);
    clearHighlights();
    highlightPoints(gameState.validTargets, 'valid-attack');
    updateActionButtons();
    // 在按钮栏追加确认按钮
    dom.actionBar.innerHTML += `<button class="chalk-btn active" onclick="executeWindSkill()">确认释放</button>`;
    const friendlyCount = targets.filter(t => t.piece.faction === cf).length;
    const msg = friendlyCount > 0
      ? `⚡电磁辐射：命中${targets.length}目标（含${friendlyCount}友军），确认释放？`
      : `⚡电磁辐射：命中${targets.length}个目标，确认释放？`;
    showMessage(msg);
  }
}

function enterTrapPlaceMode() {
  if (!gameState.selectedPieceId) return;
  if (gameState.traps.length >= 3) { showMessage('无人机已达上限（3架）'); return; }

  const occupied = new Set([
    ...gameState.pieces.filter(p => p.hp > 0).map(p => p.position),
    ...gameState.traps.map(t => t.position),
  ]);
  gameState.validTargets = POINTS.map(p => p.id).filter(id => !occupied.has(id));
  gameState.actionMode = 'trap_place';
  clearHighlights();
  highlightPoints(gameState.validTargets, 'trap-target');
  updateActionButtons();
  showMessage('点击空路口部署无人机（最多3架）');
}

function enterTrapDetonateMode() {
  if (isDeployPhase()) { showMessage('布阵阶段不可引爆'); return; }
  if (gameState.traps.length === 0) { showMessage('没有已部署的无人机'); return; }
  gameState.actionMode = 'trap_detonate';
  gameState.validTargets = [];
  clearHighlights();
  updatePieceRender();
  updateActionButtons();
  showMessage('点击绿色无人机引爆');
}

// ============================================================
// 状态管理
// ============================================================

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
  showMessage('请选择行动');
}

function clearActionMode() {
  gameState.actionMode = null;
  gameState.validTargets = [];
  gameState.firePieceId = null;
  gameState._mountainMoves = null;
  gameState._mountainAttacks = null;
  clearHighlights();
  clearArrows();
  if (dom.effectsLayer) dom.effectsLayer.innerHTML = '';
}
