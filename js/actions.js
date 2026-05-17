// 风林火山·四方乱斗 - 用户交互与战斗系统
// ============================================================

// ============================================================
// 战斗目标计算
// ============================================================

// 获取相邻敌方棋子（近战攻击目标）
function getMeleeTargets(pointId) {
  const neighbors = ADJ[pointId] || [];
  const cf = currentFaction();
  const targets = [];
  for (const nid of neighbors) {
    const piece = getPieceAt(nid);
    if (piece && piece.faction !== cf) {
      targets.push(nid);
    }
  }
  return targets;
}

// 获取相邻己方棋子占据的位置（用于判断不可移动）
function getOccupiedByAllies(pointId) {
  const neighbors = ADJ[pointId] || [];
  const cf = currentFaction();
  return neighbors.filter(nid => {
    const piece = getPieceAt(nid);
    return piece && piece.faction === cf;
  });
}

// ============================================================
// 棋子交互
// ============================================================

function onPieceClick(pieceId) {
  if (gameState.phase !== 'playing') return;

  const piece = gameState.pieces.find(p => p.id === pieceId);
  if (!piece || piece.hp <= 0) return;

  const cf = currentFaction();
  if (!cf) return;

  // 只有当前回合是人类玩家时才能操作
  if (!gameState.humanFactions || !gameState.humanFactions.includes(cf)) {
    return;
  }

  // 只能操作自己阵营的棋子
  if (piece.faction !== cf) {
    showMessage('这不是你的兵人');
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
      showMessage('已取消操作，请选择行动');
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
  // 自动显示可移动路口
  const piece = gameState.pieces.find(p => p.id === pieceId);
  if (piece) {
    const moves = getValidMoves(piece.position);
    clearHighlights();
    highlightPoints(moves, 'valid-move');
    gameState._autoMoves = moves;
  }
  showMessage('请选择行动：移动 / 交火 / 技能');
}

function onPointClick(pointId) {
  if (gameState.phase !== 'playing') return;

  const cf = currentFaction();
  if (!cf) return;

  // 只有当前回合是人类玩家时才能操作
  if (!gameState.humanFactions || !gameState.humanFactions.includes(cf)) return;

  const mode = gameState.actionMode;

  if (!mode || mode === null) {
    const piece = getPieceAt(pointId);
    if (piece && piece.faction === cf) {
      onPieceClick(piece.id);
    } else if (piece && piece.faction !== cf) {
      // 点击敌方棋子：查找相邻己方棋子，自动准备攻击
      const neighbors = ADJ[pointId] || [];
      const selPiece = gameState.selectedPieceId
        ? gameState.pieces.find(p => p.id === gameState.selectedPieceId && p.hp > 0)
        : null;

      // 如果已选中棋子且在相邻位置，直接攻击
      if (selPiece && selPiece.faction === cf && neighbors.includes(selPiece.position)) {
        gameState.actionMode = 'attack';
        gameState.validTargets = [pointId];
        clearHighlights();
        highlightPoints([pointId], 'valid-attack');
        updateActionButtons();
        executeMeleeAttack(pointId);
        return;
      }

      // 否则查找是否有己方棋子相邻，自动选中并进入交火模式
      for (const nid of neighbors) {
        const allyPiece = getPieceAt(nid);
        if (allyPiece && allyPiece.faction === cf) {
          gameState.selectedPieceId = allyPiece.id;
          gameState.actionMode = 'attack';
          gameState.validTargets = [pointId];
          clearHighlights();
          highlightPoints([pointId], 'valid-attack');
          updatePieceRender();
          updateActionButtons();
          showMessage('点击红色目标确认射击（伤害2）');
          return;
        }
      }
    }
    return;
  }

  switch (mode) {
    case 'move':
      if (gameState.validTargets.includes(pointId)) {
        executeMove(pointId);
      }
      break;
    case 'attack':
      // 近战攻击模式
      if (gameState.validTargets.includes(pointId)) {
        executeMeleeAttack(pointId);
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
// 近战攻击
// ============================================================

function executeMeleeAttack(targetPointId) {
  if (isDeployPhase()) { showMessage("布阵阶段暂不可攻击（第1轮为布阵期）"); return; }
  const piece = gameState.pieces.find(p => p.id === gameState.selectedPieceId);
  if (!piece) return;

  const targetPiece = getPieceAt(targetPointId);
  if (!targetPiece) return;

  const damage = calcDamage(piece.faction, targetPiece.faction, 2);
  const killed = (targetPiece.hp <= damage);
  applyDamageToPiece(targetPiece, damage);

  flashPoint(targetPointId, 'flash-explosion');

  const counterInfo = getCounterInfo(piece.faction, targetPiece.faction);
  if (killed) {
    // 击杀：攻击者占据防御者位置
    const fromPointId = piece.position;
    schedulePieceAnimation(piece.id, fromPointId, targetPointId);
    piece.position = targetPointId;
    showMessage(`${FACTIONS[piece.faction].emoji}近战击杀！对${FACTIONS[targetPiece.faction].emoji}造成${damage}点伤害${counterInfo}，已占据其位`);
  } else {
    showMessage(`${FACTIONS[piece.faction].emoji}近战交火！对${FACTIONS[targetPiece.faction].emoji}造成${damage}点伤害${counterInfo}`);
  }

  clearActionMode();
  gameState.selectedPieceId = null;
  gameState.validTargets = [];
  updatePieceRender();
  updateActionButtons();
  checkAndNextTurn();
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

  const fromPointId = piece.position;
  schedulePieceAnimation(piece.id, fromPointId, toPointId);
  piece.position = toPointId;

  clearActionMode();
  gameState.selectedPieceId = null;
  gameState.validTargets = [];
  updatePieceRender();
  updateActionButtons();
  showMessage(`${FACTIONS[piece.faction].emoji} 行进至路口${toPointId}`);
  nextTurn();
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
    dom.actionBar.innerHTML = '<span style="color:#8b7355;font-size:13px;">点击己方兵人开始行动</span>';
    return;
  }

  let html = '';

  if (cf === 'mountain') {
    html += `<button class="chalk-btn" onclick="endMountainTurn()">结束回合</button>`;
    html += `<button class="chalk-btn" onclick="cancelSelection()">换人</button>`;
  } else if (cf === 'forest') {
    html += `<button class="chalk-btn${gameState.actionMode==='move'?' active':''}" onclick="enterMoveMode()">移动</button>`;
    html += `<button class="chalk-btn${gameState.actionMode==='attack'?' active':''}" onclick="enterAttackMode()">攻击</button>`;
    html += `<button class="chalk-btn${gameState.actionMode==='trap_place'?' active':''}" onclick="enterTrapPlaceMode()">无人机</button>`;
    html += `<button class="chalk-btn${gameState.actionMode==='trap_detonate'?' active':''}" onclick="enterTrapDetonateMode()">打击</button>`;
    if (gameState.actionMode) {
      html += `<button class="chalk-btn" onclick="cancelActionMode()" style="opacity:0.7;">取消</button>`;
    }
  } else {
    // 火、风阵营
    html += `<button class="chalk-btn${gameState.actionMode==='move'?' active':''}" onclick="enterMoveMode()">移动</button>`;
    html += `<button class="chalk-btn${gameState.actionMode==='attack'?' active':''}" onclick="enterAttackMode()">攻击</button>`;
    html += `<button class="chalk-btn${gameState.actionMode==='fire_dir'||gameState.actionMode==='attack_skill'?' active':''}" onclick="enterSkillMode()">技能</button>`;
    if (gameState.actionMode) {
      html += `<button class="chalk-btn" onclick="cancelActionMode()" style="opacity:0.7;">取消</button>`;
    }
  }

  dom.actionBar.innerHTML = html;
}

// ============================================================
// 模式进入
// ============================================================

function enterMoveMode() {
  if (!gameState.selectedPieceId) return;
  const piece = gameState.pieces.find(p => p.id === gameState.selectedPieceId);
  if (!piece) return;

  gameState.actionMode = 'move';
  gameState.validTargets = getValidMoves(piece.position);
  clearHighlights();
  highlightPoints(gameState.validTargets, 'valid-move');
  updateActionButtons();
  showMessage('请点击绿色路口移动');
}

function enterAttackMode() {
  if (isDeployPhase()) { showMessage("布阵阶段暂不可攻击（第1轮为布阵期）"); return; }
  if (!gameState.selectedPieceId) return;
  const piece = gameState.pieces.find(p => p.id === gameState.selectedPieceId);
  if (!piece) return;

  // 近战攻击：显示相邻敌方棋子为红色目标
  const targets = getMeleeTargets(piece.position);
  if (targets.length === 0) {
    showMessage('没有可攻击的相邻敌人，请选择移动或技能');
    return;
  }

  gameState.actionMode = 'attack';
  gameState.validTargets = targets;
  clearHighlights();
  highlightPoints(targets, 'valid-attack');
  updateActionButtons();
  showMessage('点击红色目标进行近战交火（伤害2）');
}

function enterSkillMode() {
  if (isDeployPhase()) { showMessage("布阵阶段暂不可使用技能（第1轮为布阵期）"); return; }
  if (!gameState.selectedPieceId) return;
  const cf = currentFaction();

  if (cf === 'fire') {
    gameState.actionMode = 'fire_dir';
    gameState.firePieceId = gameState.selectedPieceId;
    gameState.validTargets = [];
    clearHighlights();
    renderArrows();
    updateActionButtons();
    showMessage('🎯精确狙击：点击方向箭头，直线射击首个目标（伤害2）');
  } else if (cf === 'wind') {
    gameState.actionMode = 'attack_skill';
    const piece = gameState.pieces.find(p => p.id === gameState.selectedPieceId);
    const targets = getWindTargets(piece.position, piece.id);
    gameState.validTargets = targets.map(t => t.pointId);
    clearHighlights();
    highlightPoints(gameState.validTargets, 'valid-attack');
    updateActionButtons();
    dom.actionBar.innerHTML +=
      `<button class="chalk-btn active" onclick="executeWindSkill()">确认释放风刃</button>`;
    showMessage('☢️电磁辐射：日字型AOE，波及所有单位（含友军），各2伤害');
  } else if (cf === 'mountain') {
    // 山阵营技能就是走打一体，通过棋子选中触发
    showMessage('🔫点击己方兵人进入跑打一体模式');
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
  showMessage('请点击空路口部署无人机');
}

function enterTrapDetonateMode() {
  if (isDeployPhase()) { showMessage("布阵阶段暂不可攻击（第1轮为布阵期）"); return; }
  if (gameState.traps.length === 0) {
    showMessage('没有已部署的无人机');
    return;
  }

  gameState.actionMode = 'trap_detonate';
  gameState.validTargets = [];
  clearHighlights();
  updatePieceRender();
  updateActionButtons();
  showMessage('请点击要打击的无人机');
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
  showMessage('请选择行动：移动 / 交火 / 技能');
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
