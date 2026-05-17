// 风林火山·四方乱斗 - 四阵营技能
// ============================================================

// 🔥 火 - 狙击（直线贯穿）
function getFireTarget(pieceId, dcol, drow) {
  const piece = gameState.pieces.find(p => p.id === pieceId);
  if (!piece) return null;
  const pt = pointById[piece.position];
  let col = pt.col + dcol, row = pt.row + drow;
  while (true) {
    const targetPtId = pointMap[`${col},${row}`];
    if (targetPtId === undefined) return null;
    const targetPiece = getPieceAt(targetPtId);
    if (targetPiece) return { pointId: targetPtId, piece: targetPiece };
    col += dcol; row += drow;
  }
}

function executeFireSkill(dcol, drow) {
  if (isDeployPhase()) { showMessage('布阵阶段不可使用技能'); return; }
  const pieceId = gameState.firePieceId;
  if (!pieceId) return;
  const piece = gameState.pieces.find(p => p.id === pieceId);
  if (!piece) return;

  const target = getFireTarget(pieceId, dcol, drow);
  const dirLabel = dcol===0 ? (drow===-1?'上':'下') : (dcol===-1?'左':'右');
  clearArrows();

  if (!target) {
    showMessage(`🎯狙击向${dirLabel}方——弹尽无敌`);
  } else if (target.piece.faction === piece.faction) {
    showMessage(`🎯友军遮挡，狙击中止`);
  } else {
    const damage = calcDamage(piece.faction, target.piece.faction, 2);
    applyDamageToPiece(target.piece, damage);
    drawFireLine(piece.position, target.pointId);
    const ci = getCounterInfo(piece.faction, target.piece.faction);
    showMessage(`🎯狙击${dirLabel}方${FACTIONS[target.piece.faction].emoji}！伤害${damage}${ci}（剩余HP:${target.piece.hp}）`);
  }

  gameState.turnActions.attacked = true;
  gameState.firePieceId = null;
  clearActionMode();
  gameState.selectedPieceId = null;
  updatePieceRender();
  updateActionButtons();
  checkAndNextTurn();
}

// 🌲 林 - 无人机（布置+引爆）
function placeTrap(pointId) {
  if (gameState.traps.length >= 3) { showMessage('无人机已达上限（3架）'); return; }
  const trapId = gameState.traps.length > 0 ? Math.max(...gameState.traps.map(t => t.id)) + 1 : 1;
  gameState.traps.push({ id: trapId, position: pointId });
  flashPoint(pointId, 'flash-wind');
  clearActionMode();
  gameState.selectedPieceId = null;
  gameState.validTargets = [];
  updatePieceRender();
  updateActionButtons();
  showMessage(`🛸无人机部署至路口${pointId}（${gameState.traps.length}/3）`);
  nextTurn();
}

function detonateTrap(trap) {
  if (isDeployPhase()) { showMessage('布阵阶段不可引爆'); return; }
  const neighbors = ADJ[trap.position] || [];
  const affectedPoints = [trap.position, ...neighbors];

  const affected = [];
  for (const ptId of affectedPoints) {
    const piece = getPieceAt(ptId);
    if (piece && piece.faction !== 'forest') affected.push(piece);
  }
  for (const piece of affected) {
    const dmg = calcDamage('forest', piece.faction, 2);
    applyDamageToPiece(piece, dmg);
  }
  for (const ptId of affectedPoints) flashPoint(ptId, 'flash-explosion');
  gameState.traps = gameState.traps.filter(t => t.id !== trap.id);

  gameState.turnActions.attacked = true;
  const msg = affected.length > 0
    ? `💥无人机引爆！命中${affected.length}个目标，各造成2伤害`
    : '💥无人机引爆！范围内无敌人';
  showMessage(msg);
  clearActionMode();
  gameState.selectedPieceId = null;
  gameState.validTargets = [];
  updatePieceRender();
  updateActionButtons();
  checkAndNextTurn();
}

// 💨 风 - 电磁辐射（日字AOE含友伤）
function getWindTargets(pointId, excludePieceId) {
  const pt = pointById[pointId];
  const targets = [];
  for (const [dc, dr] of HORSE_OFFSETS) {
    const tPtId = pointMap[`${pt.col + dc},${pt.row + dr}`];
    if (tPtId !== undefined) {
      const piece = getPieceAt(tPtId);
      if (piece && piece.id !== excludePieceId) targets.push({ pointId: tPtId, piece });
    }
  }
  return targets;
}

function executeWindSkill() {
  if (isDeployPhase()) { showMessage('布阵阶段不可使用技能'); return; }
  const pieceId = gameState.selectedPieceId;
  if (!pieceId) return;
  const piece = gameState.pieces.find(p => p.id === pieceId);
  if (!piece) return;

  const targets = getWindTargets(piece.position, pieceId);
  let hitCount = 0;
  for (const target of targets) {
    const dmg = calcDamage(piece.faction, target.piece.faction, 2);
    applyDamageToPiece(target.piece, dmg);
    hitCount++;
    flashPoint(target.pointId, 'flash-wind');
  }

  const selfHit = targets.filter(t => t.piece.faction === piece.faction).length;
  let msg = `⚡电磁辐射！波及${hitCount}目标，各造成2伤害`;
  if (selfHit > 0) msg += `（含${selfHit}友军）`;
  showMessage(msg);

  gameState.turnActions.attacked = true;
  clearActionMode();
  gameState.selectedPieceId = null;
  gameState.validTargets = [];
  updatePieceRender();
  updateActionButtons();
  checkAndNextTurn();
}

// ⛰️ 山 - 走打一体
function onMountainPieceClick(pieceId) {
  const piece = gameState.pieces.find(p => p.id === pieceId);
  if (!piece || piece.faction !== 'mountain') return;

  if (gameState.mountainPieceId === pieceId) {
    showMessage(`🔫已选中，剩余弹药：${gameState.mountainRemaining}`);
    return;
  }
  if (gameState.mountainPieceId !== null && gameState.mountainRemaining < 4) {
    showMessage('当前兵已行动，请先结束回合');
    return;
  }

  gameState.mountainPieceId = pieceId;
  gameState.selectedPieceId = pieceId;
  gameState.mountainRemaining = 4;
  gameState.actionMode = 'mountain';
  updateMountainDisplay();
  showMountainTargets();
  updatePieceRender();
  updateActionButtons();
  showMessage('🔫跑打一体：绿点=移动(耗1弹)，红点=射击(耗全部剩余弹药，越多越强)');
}

function showMountainTargets() {
  if (!gameState.mountainPieceId) return;
  const piece = gameState.pieces.find(p => p.id === gameState.mountainPieceId);
  if (!piece) return;
  clearHighlights();

  const occupied = new Set(gameState.pieces.filter(p => p.hp > 0).map(p => p.position));
  const moveTargets = [], attackTargets = [];

  for (const nid of (ADJ[piece.position] || [])) {
    if (occupied.has(nid)) {
      const enemy = getPieceAt(nid);
      if (enemy && enemy.faction !== 'mountain') attackTargets.push(nid);
    } else {
      moveTargets.push(nid);
    }
  }
  highlightPoints(moveTargets, 'valid-move');
  highlightPoints(attackTargets, 'valid-attack');
  gameState._mountainMoves = moveTargets;
  gameState._mountainAttacks = attackTargets;
}

function handleMountainPointClick(pointId) {
  if (gameState._mountainMoves?.includes(pointId)) {
    const piece = gameState.pieces.find(p => p.id === gameState.mountainPieceId);
    if (!piece) return;
    const from = piece.position;
    schedulePieceAnimation(piece.id, from, pointId);
    piece.position = pointId;
    gameState.mountainRemaining--;

    if (gameState.mountainRemaining <= 0) {
      _endMountainTurn(false);
      showMessage('弹药耗尽，回合结束');
    } else {
      updateMountainDisplay();
      showMountainTargets();
      updatePieceRender();
      showMessage(`🔫移动1格，剩余弹药：${gameState.mountainRemaining}（剩余越多伤害越高）`);
    }
  } else if (gameState._mountainAttacks?.includes(pointId)) {
    executeMountainAttack(pointId);
  }
}

function executeMountainAttack(targetPointId) {
  if (isDeployPhase()) { showMessage('布阵阶段不可攻击'); return; }
  const piece = gameState.pieces.find(p => p.id === gameState.mountainPieceId);
  if (!piece) return;
  const targetPiece = getPieceAt(targetPointId);
  if (!targetPiece) return;

  const baseDamage = gameState.mountainRemaining;
  const dmg = calcDamage('mountain', targetPiece.faction, baseDamage);
  applyDamageToPiece(targetPiece, dmg);
  flashPoint(targetPointId, 'flash-mountain');

  const ci = getCounterInfo('mountain', targetPiece.faction);
  showMessage(`🔫扫射！蓄弹${baseDamage}→伤害${dmg}${ci}（${FACTIONS[targetPiece.faction].emoji}剩余HP:${targetPiece.hp}）`);

  _endMountainTurn(true);
  checkAndNextTurn();
}

function _endMountainTurn(didAttack) {
  clearActionMode();
  gameState.selectedPieceId = null;
  gameState.mountainPieceId = null;
  gameState.mountainRemaining = 0;
  if (didAttack) gameState.turnActions.attacked = true;
  updatePieceRender();
  updateActionButtons();
  updateMountainDisplay();
}

function endMountainTurn() {
  if (gameState.mountainRemaining === 4) {
    const piece = gameState.pieces.find(p => p.id === gameState.mountainPieceId);
    if (piece) {
      const hasMove   = getValidMoves(piece.position).length > 0;
      const hasAttack = (ADJ[piece.position] || []).some(nid => {
        const ep = getPieceAt(nid);
        return ep && ep.faction !== 'mountain';
      });
      if ((hasMove || hasAttack) && !isDeployPhase()) {
        showMessage('请至少行动一次再结束回合');
        return;
      }
    }
  }
  _endMountainTurn(false);
  showMessage('🔫回合结束');
  nextTurn();
}

function updateMountainDisplay() {
  const cf = currentFaction();
  if (cf === 'mountain' && gameState.mountainPieceId !== null && gameState.mountainRemaining > 0) {
    dom.mountainCounter.style.display = 'block';
    let dots = '';
    for (let i = 0; i < 4; i++) {
      dots += `<span class="step-dot${i >= gameState.mountainRemaining ? ' used' : ''}"></span>`;
    }
    dom.mountainCounter.innerHTML = `🔫 剩余弹药 ${gameState.mountainRemaining}<span class="step-dots">${dots}</span>（射击伤害=${gameState.mountainRemaining}）`;
  } else {
    dom.mountainCounter.style.display = 'none';
  }
}
