// 风林火山·四方乱斗 - 四阵营技能
// ============================================================

// 🔥火技能 - 火焰贯穿
// ============================================================

function getFireTarget(pieceId, dcol, drow) {
  const piece = gameState.pieces.find(p => p.id === pieceId);
  if (!piece) return null;

  const pt = pointById[piece.position];
  let col = pt.col + dcol;
  let row = pt.row + drow;

  while (true) {
    const targetPtId = pointMap[`${col},${row}`];
    if (targetPtId === undefined) return null; // 飞出棋盘
    const targetPiece = getPieceAt(targetPtId);
    if (targetPiece) {
      return { pointId: targetPtId, piece: targetPiece };
    }
    col += dcol;
    row += drow;
  }
}

function executeFireSkill(dcol, drow) {
  if (isDeployPhase()) { showMessage("布阵阶段暂不可攻击（前2轮为布阵期）"); return; }
  const pieceId = gameState.firePieceId;
  if (!pieceId) return;

  const piece = gameState.pieces.find(p => p.id === pieceId);
  if (!piece) return;

  const target = getFireTarget(pieceId, dcol, drow);
  const dirLabel = dcol===0 ? (drow===-1?'上':'下') : (dcol===-1?'左':'右');

  clearArrows();

  if (!target) {
    showMessage(`🔥火焰向${dirLabel}方飞出棋盘，未命中任何棋子`);
  } else {
    const damage = calcDamage(piece.faction, target.piece.faction, 2);
    applyDamageToPiece(target.piece, damage);

    drawFireLine(piece.position, target.pointId);

    const counterInfo = getCounterInfo(piece.faction, target.piece.faction);
    showMessage(`🔥火焰贯穿${dirLabel}方！对${FACTIONS[target.piece.faction].emoji}造成${damage}点伤害${counterInfo}`);
  }

  gameState.firePieceId = null;
  clearActionMode();
  gameState.selectedPieceId = null;
  updatePieceRender();
  updateActionButtons();
  checkAndNextTurn();
}

// 🌲林技能 - 布陷阱 / 引爆
// ============================================================

function placeTrap(pointId) {
  const trapId = gameState.traps.length > 0 ? Math.max(...gameState.traps.map(t=>t.id)) + 1 : 1;
  gameState.traps.push({ id: trapId, position: pointId });

  flashPoint(pointId, 'flash-wind');

  clearActionMode();
  gameState.selectedPieceId = null;
  gameState.validTargets = [];
  updatePieceRender();
  updateActionButtons();
  showMessage(`🌲陷阱已埋在位置${pointId}`);
  nextTurn();
}

function detonateTrap(trap) {
  if (isDeployPhase()) { showMessage("布阵阶段暂不可攻击（前2轮为布阵期）"); return; }
  const neighbors = ADJ[trap.position] || [];
  const affectedPoints = [trap.position, ...neighbors];

  const affectedPieces = [];
  for (const ptId of affectedPoints) {
    const piece = getPieceAt(ptId);
    if (piece) affectedPieces.push(piece);
  }

  for (const piece of affectedPieces) {
    if (piece.faction === 'forest') continue;
    const dmg = calcDamage('forest', piece.faction, 2);
    applyDamageToPiece(piece, dmg);
  }

  for (const ptId of affectedPoints) {
    flashPoint(ptId, 'flash-explosion');
  }

  gameState.traps = gameState.traps.filter(t => t.id !== trap.id);

  const hitCount = affectedPieces.filter(p => p.faction !== 'forest').length;
  showMessage(`💥陷阱引爆！炸到${hitCount}个棋子，各造成2点伤害（林阵营免疫）`);

  clearActionMode();
  gameState.selectedPieceId = null;
  gameState.validTargets = [];
  updatePieceRender();
  updateActionButtons();
  checkAndNextTurn();
}

// 🌀风技能 - 风刃AOE（日字形波及所有单位含友军）
// ============================================================

function getWindTargets(pointId) {
  const pt = pointById[pointId];
  const targets = [];
  for (const [dc, dr] of HORSE_OFFSETS) {
    const col = pt.col + dc;
    const row = pt.row + dr;
    const targetPtId = pointMap[`${col},${row}`];
    if (targetPtId !== undefined) {
      const piece = getPieceAt(targetPtId);
      if (piece) {
        targets.push({ pointId: targetPtId, piece: piece });
      }
    }
  }
  return targets;
}

function executeWindSkill() {
  if (isDeployPhase()) { showMessage("布阵阶段暂不可攻击（前2轮为布阵期）"); return; }
  const pieceId = gameState.selectedPieceId;
  if (!pieceId) return;
  const piece = gameState.pieces.find(p => p.id === pieceId);
  if (!piece) return;

  const targets = getWindTargets(piece.position);
  let hitCount = 0;
  const hitPointIds = [];

  for (const target of targets) {
    const damage = calcDamage(piece.faction, target.piece.faction, 2);
    applyDamageToPiece(target.piece, damage);
    hitCount++;
    hitPointIds.push(target.pointId);
  }

  for (const ptId of hitPointIds) {
    flashPoint(ptId, 'flash-wind');
  }

  const selfHit = targets.filter(t => t.piece.faction === piece.faction).length;
  let msg = `🌀风刃释放！命中${hitCount}个棋子，各造成2伤害`;
  if (selfHit > 0) msg += `（含${selfHit}个友军误伤）`;
  showMessage(msg);

  clearActionMode();
  gameState.selectedPieceId = null;
  gameState.validTargets = [];
  updatePieceRender();
  updateActionButtons();
  checkAndNextTurn();
}

// ⛰️山技能 - 走打一体
// ============================================================

function onMountainPieceClick(pieceId) {
  const piece = gameState.pieces.find(p => p.id === pieceId);
  if (!piece || piece.faction !== 'mountain') return;

  if (gameState.mountainPieceId === pieceId) {
    showMessage(`⛰️已选中此棋子，剩余步数：${gameState.mountainRemaining}`);
    return;
  }

  if (gameState.mountainPieceId !== null && gameState.mountainRemaining < 6) {
    showMessage('已开始行动，请先结束回合再换棋子');
    return;
  }

  gameState.mountainPieceId = pieceId;
  gameState.selectedPieceId = pieceId;
  gameState.mountainRemaining = 6;
  gameState.actionMode = 'mountain';
  updateMountainDisplay();
  showMountainTargets();
  updatePieceRender();
  updateActionButtons();
  showMessage('⛰️走打一体：点击绿色点移动（消耗1步），点击红色点攻击（消耗全部剩余步数）');
}

function showMountainTargets() {
  if (!gameState.mountainPieceId) return;
  const piece = gameState.pieces.find(p => p.id === gameState.mountainPieceId);
  if (!piece) return;

  clearHighlights();

  const neighbors = ADJ[piece.position] || [];
  const occupied = new Set();
  for (const p of gameState.pieces) {
    if (p.hp > 0) occupied.add(p.position);
  }

  const moveTargets = [];
  const attackTargets = [];

  for (const nid of neighbors) {
    if (occupied.has(nid)) {
      const enemyPiece = getPieceAt(nid);
      if (enemyPiece && enemyPiece.faction !== 'mountain') {
        attackTargets.push(nid);
      }
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
  if (gameState._mountainMoves && gameState._mountainMoves.includes(pointId)) {
    const piece = gameState.pieces.find(p => p.id === gameState.mountainPieceId);
    if (!piece) return;
    const fromPointId = piece.position;
    schedulePieceAnimation(piece.id, fromPointId, pointId);
    piece.position = pointId;
    gameState.mountainRemaining--;

    if (gameState.mountainRemaining <= 0) {
      clearActionMode();
      gameState.selectedPieceId = null;
      gameState.mountainPieceId = null;
      gameState.mountainRemaining = 0;
      updatePieceRender();
      updateActionButtons();
      updateMountainDisplay();
      showMessage('步数已用完，回合结束');
      nextTurn();
    } else {
      updateMountainDisplay();
      showMountainTargets();
      updatePieceRender();
      showMessage(`⛰️移动1格，剩余步数：${gameState.mountainRemaining}`);
    }
  } else if (gameState._mountainAttacks && gameState._mountainAttacks.includes(pointId)) {
    executeMountainAttack(pointId);
  }
}

function executeMountainAttack(targetPointId) {
  if (isDeployPhase()) { showMessage("布阵阶段暂不可攻击（前2轮为布阵期）"); return; }
  const piece = gameState.pieces.find(p => p.id === gameState.mountainPieceId);
  if (!piece) return;

  const targetPiece = getPieceAt(targetPointId);
  if (!targetPiece) return;

  const baseDamage = gameState.mountainRemaining;
  const damage = calcDamage('mountain', targetPiece.faction, baseDamage);
  applyDamageToPiece(targetPiece, damage);

  flashPoint(targetPointId, 'flash-mountain');

  const counterInfo = getCounterInfo('mountain', targetPiece.faction);
  showMessage(`⛰️山崩地裂！攻击力${baseDamage}，对${FACTIONS[targetPiece.faction].emoji}造成${damage}点伤害${counterInfo}`);

  clearActionMode();
  gameState.selectedPieceId = null;
  gameState.mountainPieceId = null;
  gameState.mountainRemaining = 0;
  updatePieceRender();
  updateActionButtons();
  updateMountainDisplay();
  checkAndNextTurn();
}

function endMountainTurn() {
  if (gameState.mountainRemaining === 6) {
    const piece = gameState.pieces.find(p => p.id === gameState.mountainPieceId);
    if (piece) {
      const moves = getValidMoves(piece.position);
      const neighbors = ADJ[piece.position] || [];
      const hasAttack = neighbors.some(nid => {
        const ep = getPieceAt(nid);
        return ep && ep.faction !== 'mountain' && ep.hp > 0;
      });
      if (moves.length > 0 || hasAttack) {
        showMessage('请至少移动1步或攻击1次');
        return;
      }
    }
  }
  clearActionMode();
  gameState.selectedPieceId = null;
  gameState.mountainPieceId = null;
  gameState.mountainRemaining = 0;
  updatePieceRender();
  updateActionButtons();
  updateMountainDisplay();
  showMessage('⛰️回合结束');
  nextTurn();
}

function updateMountainDisplay() {
  const cf = currentFaction();
  if (cf === 'mountain' && gameState.mountainPieceId !== null && gameState.mountainRemaining > 0) {
    dom.mountainCounter.style.display = 'block';
    let dots = '';
    for (let i = 0; i < 6; i++) {
      dots += `<span class="step-dot${i >= gameState.mountainRemaining ? ' used' : ''}"></span>`;
    }
    dom.mountainCounter.innerHTML = `剩余步数: ${gameState.mountainRemaining}<span class="step-dots">${dots}</span>`;
  } else {
    dom.mountainCounter.style.display = 'none';
  }
}
