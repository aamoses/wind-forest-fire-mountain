// 风林火山·四方乱斗 - AI 引擎
// ============================================================

const AI = {
  delay: { min: 400, max: 900 }, // 思考延迟（ms）

  // 入场：判断当前是否AI回合
  checkAndExecute() {
    const cf = currentFaction();
    if (!cf || gameState.phase !== 'playing') return;
    if (!gameState.aiFactions.includes(cf)) return;

    const delay = AI.delay.min + Math.random() * (AI.delay.max - AI.delay.min);
    showMessage(`${FACTIONS[cf].emoji}${FACTIONS[cf].name}思考中...`);

    setTimeout(() => {
      if (gameState.phase !== 'playing') return;
      if (currentFaction() !== cf) return;
      AI.executeTurn(cf);
    }, delay);
  },

  // 执行AI回合
  executeTurn(faction) {
    const actions = AI.generateAllActions(faction);
    if (actions.length === 0) {
      // 无可用操作，跳过回合
      showMessage(`${FACTIONS[faction].emoji}${FACTIONS[faction].name}无可用操作，跳过回合`);
      nextTurn();
      return;
    }

    const best = AI.pickBest(actions, faction);
    AI.executeAction(best, faction);
  },

  // 生成所有可用操作
  generateAllActions(faction) {
    const actions = [];
    const pieces = getAlivePieces(faction);
    if (pieces.length === 0) return actions;

    for (const piece of pieces) {
      const pos = piece.position;

      // 移动操作
      const moves = getValidMoves(pos);
      for (const m of moves) {
        actions.push({ type: 'move', pieceId: piece.id, from: pos, to: m, score: 0 });
      }

      // 近战攻击
      const meleeTargets = getMeleeTargets(pos);
      for (const t of meleeTargets) {
        const target = getPieceAt(t);
        if (target) {
          const dmg = calcDamage(faction, target.faction, 2);
          actions.push({ type: 'melee', pieceId: piece.id, from: pos, to: t, targetPiece: target, damage: dmg, score: 0 });
        }
      }

      // 阵营技能
      if (faction === 'fire') {
        for (const [dc, dr] of DIRECTIONS) {
          const target = getFireTarget(piece.id, dc, dr);
          if (target) {
            const dmg = calcDamage(faction, target.piece.faction, 2);
            actions.push({ type: 'fire_skill', pieceId: piece.id, dcol: dc, drow: dr, target: target.pointId, targetPiece: target.piece, damage: dmg, score: 0 });
          }
        }
      } else if (faction === 'wind') {
        const windTargets = getWindTargets(pos);
        if (windTargets.length > 0) {
          let totalDmg = 0; let friendlyHits = 0;
          for (const t of windTargets) {
            totalDmg += calcDamage(faction, t.piece.faction, 2);
            if (t.piece.faction === faction) friendlyHits++;
          }
          actions.push({ type: 'wind_skill', pieceId: piece.id, targets: windTargets, totalDmg, friendlyHits, score: 0 });
        }
      } else if (faction === 'forest') {
        // 布陷阱：找最有价值的空位
        const occupied = new Set();
        for (const p of gameState.pieces) { if (p.hp > 0) occupied.add(p.position); }
        for (const t of gameState.traps) { occupied.add(t.position); }
        const empty = POINTS.map(p => p.id).filter(id => !occupied.has(id));

        // 选靠近敌方路径的空位
        const enemies = gameState.pieces.filter(p => p.faction !== 'forest' && p.hp > 0);
        for (const eid of empty) {
          let nearEnemy = 0;
          for (const enemy of enemies) {
            const dist = AI.pointDist(eid, enemy.position);
            if (dist <= 2) nearEnemy++;
          }
          if (nearEnemy > 0) {
            actions.push({ type: 'trap_place', pieceId: piece.id, pointId: eid, nearEnemy, score: 0 });
          }
        }

        // 引爆：检查每个陷阱能炸到多少敌人
        for (const trap of gameState.traps) {
          const neighbors = ADJ[trap.position] || [];
          const affected = [...neighbors, trap.position];
          let enemyHits = 0;
          for (const pid of affected) {
            const ep = getPieceAt(pid);
            if (ep && ep.faction !== 'forest') enemyHits++;
          }
          if (enemyHits > 0) {
            actions.push({ type: 'trap_detonate', trapId: trap.id, enemyHits, score: 0 });
          }
        }
      } else if (faction === 'mountain') {
        // 山阵营：简单搜索移动+攻击路径
        actions.push(...AI.generateMountainActions(piece));
      }
    }

    return actions;
  },

  // 山阵营专用动作生成
  generateMountainActions(piece) {
    const actions = [];
    const maxSteps = 6;
    // 搜索1步移动 + 攻击
    const moves = getValidMoves(piece.position);
    for (const m of moves) {
      // 移动到m后，检查相邻可攻击目标
      const neighbors = ADJ[m] || [];
      for (const n of neighbors) {
        const target = getPieceAt(n);
        if (target && target.faction !== 'mountain') {
          const remaining = maxSteps - 1;
          const dmg = calcDamage('mountain', target.faction, remaining);
          actions.push({ type: 'mountain_move_attack', pieceId: piece.id, moveTo: m, attackTarget: n, remaining, damage: dmg, score: 0 });
        }
      }
      // 纯移动2-3步也考虑
      const moves2 = getValidMoves(m);
      for (const m2 of moves2) {
        const neighbors2 = ADJ[m2] || [];
        for (const n2 of neighbors2) {
          const target2 = getPieceAt(n2);
          if (target2 && target2.faction !== 'mountain') {
            const remaining = maxSteps - 2;
            const dmg = calcDamage('mountain', target2.faction, remaining);
            actions.push({ type: 'mountain_move_attack', pieceId: piece.id, moveTo: m, moveTo2: m2, attackTarget: n2, remaining, damage: dmg, score: 0 });
          }
        }
      }
    }
    return actions;
  },

  // 评分并选最优
  pickBest(actions, faction) {
    for (const a of actions) {
      a.score = AI.scoreAction(a, faction);
    }
    actions.sort((a, b) => b.score - a.score);

    // 有一定随机性（70%选最优，30%在top3中随机）
    if (actions.length > 1 && Math.random() < 0.3) {
      const topN = Math.min(3, actions.length);
      return actions[Math.floor(Math.random() * topN)];
    }
    return actions[0];
  },

  // 单项操作评分
  scoreAction(action, faction) {
    let score = 5; // 基线

    if (action.type === 'move') {
      // 向中心靠近加分
      const pt = pointById[action.to];
      const distToCenter = Math.abs(pt.col - 4) + Math.abs(pt.row - 3);
      score += (6 - distToCenter) * 1.5;
      // 向敌方领地靠近加分
      score += AI.zoneScore(action.to, faction) * 2;
    } else if (action.type === 'melee') {
      score += action.damage * 8;
      // 消灭敌人额外加分
      if (action.targetPiece && action.targetPiece.hp <= action.damage) {
        score += 30;
      }
      // 克制加分
      const mult = counterMultiplier(faction, action.targetPiece.faction);
      if (mult > 1) score += 10;
      if (mult < 1) score -= 5;
    } else if (action.type === 'fire_skill') {
      score += action.damage * 7;
      if (action.targetPiece && action.targetPiece.hp <= action.damage) score += 25;
      const mult = counterMultiplier(faction, action.targetPiece.faction);
      if (mult > 1) score += 8;
    } else if (action.type === 'wind_skill') {
      score += action.totalDmg * 5;
      score -= action.friendlyHits * 10;
      if (action.targets.length >= 2) score += 8;
    } else if (action.type === 'trap_place') {
      score += action.nearEnemy * 8;
    } else if (action.type === 'trap_detonate') {
      score += action.enemyHits * 12;
    } else if (action.type === 'mountain_move_attack') {
      score += action.damage * 7;
      if (action.remaining >= 3) score += 5;
      const target = getPieceAt(action.attackTarget);
      if (target && target.hp <= action.damage) score += 25;
    }

    return score;
  },

  // 执行选中的操作
  executeAction(action, faction) {
    // 先选中棋子
    const piece = gameState.pieces.find(p => p.id === action.pieceId);
    if (!piece) { nextTurn(); return; }

    if (action.type === 'move') {
      gameState.selectedPieceId = action.pieceId;
      schedulePieceAnimation(piece.id, action.from, action.to);
      piece.position = action.to;
      clearActionMode();
      gameState.selectedPieceId = null;
      gameState.validTargets = [];
      updatePieceRender();
      updateActionButtons();
      showMessage(`${FACTIONS[faction].emoji}${FACTIONS[faction].name}移动棋子`);
      nextTurn();
    } else if (action.type === 'melee') {
      gameState.selectedPieceId = action.pieceId;
      const target = getPieceAt(action.to);
      if (target) {
        const dmg = calcDamage(faction, target.faction, 2);
        applyDamageToPiece(target, dmg);
        schedulePieceAnimation(piece.id, action.from, action.to);
        piece.position = action.to;
        flashPoint(action.to, 'flash-explosion');
      }
      clearActionMode();
      gameState.selectedPieceId = null;
      gameState.validTargets = [];
      updatePieceRender();
      updateActionButtons();
      showMessage(`${FACTIONS[faction].emoji}${FACTIONS[faction].name}发动近战攻击`);
      checkAndNextTurn();
    } else if (action.type === 'fire_skill') {
      gameState.firePieceId = action.pieceId;
      gameState.selectedPieceId = action.pieceId;
      // 直接调用执行函数
      const __firePieceId = gameState.firePieceId;
      gameState.firePieceId = action.pieceId;
      gameState.selectedPieceId = action.pieceId;
      executeFireSkillAI(action.dcol, action.drow, action.pieceId);
    } else if (action.type === 'wind_skill') {
      gameState.selectedPieceId = action.pieceId;
      executeWindSkill();
    } else if (action.type === 'trap_place') {
      gameState.selectedPieceId = action.pieceId;
      placeTrap(action.pointId);
    } else if (action.type === 'trap_detonate') {
      const trap = gameState.traps.find(t => t.id === action.trapId);
      if (trap) detonateTrap(trap);
      else nextTurn();
    } else if (action.type === 'mountain_move_attack') {
      gameState.mountainPieceId = action.pieceId;
      gameState.selectedPieceId = action.pieceId;
      gameState.mountainRemaining = 6;
      gameState.actionMode = 'mountain';
      // 简单执行：移动到目标位置，然后攻击
      const mPiece = gameState.pieces.find(p => p.id === action.pieceId);
      if (mPiece) {
        const from1 = mPiece.position;
        schedulePieceAnimation(mPiece.id, from1, action.moveTo);
        mPiece.position = action.moveTo;
        if (action.moveTo2) {
          schedulePieceAnimation(mPiece.id, action.moveTo, action.moveTo2);
          mPiece.position = action.moveTo2;
        }
      }
      if (action.attackTarget) {
        const target = getPieceAt(action.attackTarget);
        if (target) {
          const dmg = calcDamage('mountain', target.faction, action.remaining || 5);
          applyDamageToPiece(target, dmg);
          flashPoint(action.attackTarget, 'flash-mountain');
        }
      }
      clearActionMode();
      gameState.selectedPieceId = null;
      gameState.mountainPieceId = null;
      gameState.mountainRemaining = 0;
      updatePieceRender();
      updateActionButtons();
      updateMountainDisplay();
      showMessage(`⛰️${FACTIONS[faction].name}发动山崩攻击`);
      checkAndNextTurn();
    }
  },

  // 两点间的网格距离
  pointDist(aId, bId) {
    const a = pointById[aId];
    const b = pointById[bId];
    if (!a || !b) return 99;
    return Math.abs(a.col - b.col) + Math.abs(a.row - b.row);
  },

  // zone评分：进入敌方领地加分
  zoneScore(pointId, faction) {
    const pt = pointById[pointId];
    const factionZone = FACTIONS[faction].zone;
    // 进入中心加分
    if (pt.zone === 'center') return 3;
    // 进入敌方领地加更多分
    const enemyZones = Object.values(FACTIONS)
      .filter(f => f.key !== faction)
      .map(f => f.zone);
    if (enemyZones.includes(pt.zone)) return 5;
    // 自己领地不加分
    if (pt.zone === factionZone) return -1;
    return 0;
  },
};

// 火技能AI版本（直接执行，不经过UI箭头流程）
function executeFireSkillAI(dcol, drow, pieceIdOverride) {
  const pieceId = pieceIdOverride || gameState.firePieceId;
  if (!pieceId) return;

  const piece = gameState.pieces.find(p => p.id === pieceId);
  if (!piece) return;

  const target = getFireTarget(pieceId, dcol, drow);

  if (target) {
    const damage = calcDamage(piece.faction, target.piece.faction, 2);
    applyDamageToPiece(target.piece, damage);
    drawFireLine(piece.position, target.pointId);
    const counterInfo = getCounterInfo(piece.faction, target.piece.faction);
    showMessage(`🔥火焰贯穿！对${FACTIONS[target.piece.faction].emoji}造成${damage}点伤害${counterInfo}`);
  }

  gameState.firePieceId = null;
  clearActionMode();
  gameState.selectedPieceId = null;
  updatePieceRender();
  updateActionButtons();
  checkAndNextTurn();
}
