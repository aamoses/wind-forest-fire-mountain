// 风林火山·四方乱斗 - AI 引擎
// ============================================================

const AI = {
  delay: { min: 300, max: 700 },

  checkAndExecute() {
    const cf = currentFaction();
    if (!cf || gameState.phase !== 'playing') return;
    if (!gameState.aiFactions.includes(cf)) return;

    const delay = AI.delay.min + Math.random() * (AI.delay.max - AI.delay.min);
    showMessage(`${FACTIONS[cf].emoji}${FACTIONS[cf].name} 思考中…`);
    setTimeout(() => {
      if (gameState.phase !== 'playing' || currentFaction() !== cf) return;
      AI.executeTurn(cf);
    }, delay);
  },

  executeTurn(faction) {
    const actions = AI.generateAllActions(faction);
    if (actions.length === 0) {
      showMessage(`${FACTIONS[faction].emoji}${FACTIONS[faction].name} 无可用行动，跳过`);
      nextTurn();
      return;
    }
    const best = AI.pickBest(actions, faction);
    AI.executeAction(best, faction);
  },

  generateAllActions(faction) {
    const actions = [];
    const pieces = getAlivePieces(faction);
    if (pieces.length === 0) return actions;
    const inDeploy = isDeployPhase();

    for (const piece of pieces) {
      const p = piece.position;
      const moves = getValidMoves(p);

      // 移动
      for (const m of moves) {
        actions.push({ type:'move', pieceId:piece.id, from:p, to:m, score:0 });

        // 移动后攻击（AI也支持）
        if (!inDeploy) {
          const meleeAfterMove = getMeleeTargetsAt(m, faction);
          for (const t of meleeAfterMove) {
            const target = getPieceAt(t);
            if (target) {
              const dmg = calcDamage(faction, target.faction, 2);
              actions.push({ type:'move_then_melee', pieceId:piece.id, from:p, moveTo:m, attackAt:t, targetPiece:target, damage:dmg, score:0 });
            }
          }
        }
      }

      if (inDeploy) {
        if (faction === 'forest' && gameState.traps.length < 3) {
          AI.addTrapPlaceActions(actions, piece);
        }
        continue;
      }

      // 近战（原地）
      const meleeTargets = getMeleeTargets(p);
      for (const t of meleeTargets) {
        const target = getPieceAt(t);
        if (target) {
          const dmg = calcDamage(faction, target.faction, 2);
          actions.push({ type:'melee', pieceId:piece.id, from:p, to:t, targetPiece:target, damage:dmg, score:0 });
        }
      }

      // 技能
      if (faction === 'fire') {
        for (const [dc, dr] of DIRECTIONS) {
          const target = getFireTarget(piece.id, dc, dr);
          if (target && target.piece.faction !== faction) {
            const dmg = calcDamage(faction, target.piece.faction, 2);
            actions.push({ type:'fire_skill', pieceId:piece.id, dcol:dc, drow:dr, target:target.pointId, targetPiece:target.piece, damage:dmg, score:0 });
          }
        }
      } else if (faction === 'wind') {
        const windTargets = getWindTargets(p, piece.id);
        if (windTargets.length > 0) {
          let totalDmg = 0, friendlyHits = 0, enemyHits = 0;
          for (const t of windTargets) {
            totalDmg += calcDamage(faction, t.piece.faction, 2);
            if (t.piece.faction === faction) friendlyHits++;
            else enemyHits++;
          }
          if (enemyHits > friendlyHits) {
            actions.push({ type:'wind_skill', pieceId:piece.id, totalDmg, friendlyHits, enemyHits, score:0 });
          }
        }
      } else if (faction === 'forest') {
        AI.addTrapPlaceActions(actions, piece);
        // 引爆
        for (const trap of gameState.traps) {
          const affected = [trap.position, ...(ADJ[trap.position]||[])];
          let enemyHits = 0;
          for (const pid of affected) {
            const ep = getPieceAt(pid);
            if (ep && ep.faction !== 'forest') enemyHits++;
          }
          if (enemyHits > 0) {
            actions.push({ type:'trap_detonate', trapId:trap.id, enemyHits, score:0 });
          }
        }
      } else if (faction === 'mountain') {
        actions.push(...AI.generateMountainActions(piece));
      }
    }
    return actions;
  },

  addTrapPlaceActions(actions, piece) {
    if (gameState.traps.length >= 3) return;
    const occupied = new Set([
      ...gameState.pieces.filter(p => p.hp > 0).map(p => p.position),
      ...gameState.traps.map(t => t.position),
    ]);
    const enemies = gameState.pieces.filter(p => p.faction !== 'forest' && p.hp > 0);
    for (const pt of POINTS) {
      if (occupied.has(pt.id)) continue;
      let nearEnemy = 0;
      for (const e of enemies) {
        if (AI.pointDist(pt.id, e.position) <= 2) nearEnemy++;
      }
      if (nearEnemy > 0) {
        actions.push({ type:'trap_place', pieceId:piece.id, pointId:pt.id, nearEnemy, score:0 });
      }
    }
  },

  generateMountainActions(piece) {
    const actions = [];
    const moves = getValidMoves(piece.position);

    // 直接射击（不移动）
    for (const nid of (ADJ[piece.position]||[])) {
      const target = getPieceAt(nid);
      if (target && target.faction !== 'mountain') {
        const remaining = 4;
        const dmg = calcDamage('mountain', target.faction, remaining);
        actions.push({ type:'mountain_attack_only', pieceId:piece.id, attackTarget:nid, remaining, damage:dmg, score:0 });
      }
    }

    // 移动后射击
    for (const m of moves) {
      for (const nid of (ADJ[m]||[])) {
        const target = getPieceAt(nid);
        if (target && target.faction !== 'mountain') {
          const remaining = 3;
          const dmg = calcDamage('mountain', target.faction, remaining);
          actions.push({ type:'mountain_move_attack', pieceId:piece.id, moveTo:m, attackTarget:nid, remaining, damage:dmg, score:0 });
        }
      }
    }
    return actions;
  },

  pickBest(actions, faction) {
    for (const a of actions) a.score = AI.scoreAction(a, faction);
    actions.sort((a, b) => b.score - a.score);

    // 80% 选最优，20% 在前3名中随机（保留一些不可预测性）
    if (actions.length > 1 && Math.random() < 0.2) {
      return actions[Math.floor(Math.random() * Math.min(3, actions.length))];
    }
    return actions[0];
  },

  scoreAction(action, faction) {
    let score = 5;

    if (action.type === 'move') {
      const pt = pointById[action.to];
      const distCenter = Math.abs(pt.col - 4) + Math.abs(pt.row - 3);
      score += (6 - distCenter) * 1.5;
      score += AI.zoneScore(action.to, faction) * 2;
      // 移动后若能攻击，加额外分
      const afterMelee = getMeleeTargetsAt(action.to, faction);
      if (afterMelee.length > 0) score += afterMelee.length * 5;
    } else if (action.type === 'move_then_melee') {
      score += action.damage * 10;
      if (action.targetPiece.hp <= action.damage) score += 35;
      const mult = counterMultiplier(faction, action.targetPiece.faction);
      if (mult > 1) score += 12;
      if (mult < 1) score -= 8;
      score += 8; // 移动后攻击额外奖励
    } else if (action.type === 'melee') {
      score += action.damage * 10;
      if (action.targetPiece.hp <= action.damage) score += 35;
      const mult = counterMultiplier(faction, action.targetPiece.faction);
      if (mult > 1) score += 12;
      if (mult < 1) score -= 8;
    } else if (action.type === 'fire_skill') {
      score += action.damage * 8;
      if (action.targetPiece.hp <= action.damage) score += 30;
      const mult = counterMultiplier(faction, action.targetPiece.faction);
      if (mult > 1) score += 10;
    } else if (action.type === 'wind_skill') {
      score += action.totalDmg * 6;
      score -= action.friendlyHits * 14;
      if (action.enemyHits >= 2) score += 10;
    } else if (action.type === 'trap_place') {
      score += action.nearEnemy * 9;
    } else if (action.type === 'trap_detonate') {
      score += action.enemyHits * 14;
    } else if (action.type === 'mountain_attack_only') {
      score += action.damage * 10; // 全弹药射击
      if (getPieceAt(action.attackTarget)?.hp <= action.damage) score += 35;
    } else if (action.type === 'mountain_move_attack') {
      score += action.damage * 8;
      if (getPieceAt(action.attackTarget)?.hp <= action.damage) score += 28;
      if (action.remaining >= 3) score += 6;
    }

    return score;
  },

  executeAction(action, faction) {
    const piece = gameState.pieces.find(p => p.id === action.pieceId);
    if (!piece) { nextTurn(); return; }

    const fName = `${FACTIONS[faction].emoji}${FACTIONS[faction].name}`;

    if (action.type === 'move') {
      schedulePieceAnimation(piece.id, action.from, action.to);
      piece.position = action.to;
      clearActionMode();
      gameState.selectedPieceId = null;
      updatePieceRender();
      showMessage(`${fName} 移动`);
      nextTurn();

    } else if (action.type === 'move_then_melee') {
      // 先移动
      schedulePieceAnimation(piece.id, action.from, action.moveTo);
      piece.position = action.moveTo;
      setTimeout(() => {
        const target = getPieceAt(action.attackAt);
        if (target) {
          const dmg = calcDamage(faction, target.faction, 2);
          const killed = target.hp <= dmg;
          applyDamageToPiece(target, dmg);
          if (killed) {
            schedulePieceAnimation(piece.id, action.moveTo, action.attackAt);
            piece.position = action.attackAt;
          }
          flashPoint(action.attackAt, 'flash-explosion');
          const ci = getCounterInfo(faction, target.faction);
          showMessage(`${fName} 移动后攻击${FACTIONS[target.faction].emoji}，伤害${dmg}${ci}`);
        }
        clearActionMode();
        gameState.selectedPieceId = null;
        updatePieceRender();
        checkAndNextTurn();
      }, 500);

    } else if (action.type === 'melee') {
      gameState.selectedPieceId = action.pieceId;
      const target = getPieceAt(action.to);
      if (target) {
        const dmg = calcDamage(faction, target.faction, 2);
        const killed = target.hp <= dmg;
        applyDamageToPiece(target, dmg);
        if (killed) {
          schedulePieceAnimation(piece.id, action.from, action.to);
          piece.position = action.to;
        }
        flashPoint(action.to, 'flash-explosion');
        const ci = getCounterInfo(faction, target.faction);
        showMessage(`${fName} 近战${FACTIONS[target.faction].emoji}，伤害${dmg}${ci}`);
      }
      clearActionMode();
      gameState.selectedPieceId = null;
      updatePieceRender();
      checkAndNextTurn();

    } else if (action.type === 'fire_skill') {
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

    } else if (action.type === 'mountain_attack_only') {
      gameState.mountainPieceId = action.pieceId;
      gameState.selectedPieceId = action.pieceId;
      gameState.mountainRemaining = 4;
      gameState.actionMode = 'mountain';
      const target = getPieceAt(action.attackTarget);
      if (target) {
        const dmg = calcDamage('mountain', target.faction, 4);
        applyDamageToPiece(target, dmg);
        flashPoint(action.attackTarget, 'flash-mountain');
        showMessage(`${fName} 全弹扫射！伤害${dmg}`);
      }
      gameState.selectedPieceId = null;
      gameState.mountainPieceId = null;
      gameState.mountainRemaining = 0;
      clearActionMode();
      updatePieceRender();
      updateMountainDisplay();
      checkAndNextTurn();

    } else if (action.type === 'mountain_move_attack') {
      gameState.mountainPieceId = action.pieceId;
      gameState.selectedPieceId = action.pieceId;
      gameState.mountainRemaining = 4;
      gameState.actionMode = 'mountain';
      const from = piece.position;
      schedulePieceAnimation(piece.id, from, action.moveTo);
      piece.position = action.moveTo;
      setTimeout(() => {
        const target = getPieceAt(action.attackTarget);
        if (target) {
          const dmg = calcDamage('mountain', target.faction, action.remaining);
          applyDamageToPiece(target, dmg);
          flashPoint(action.attackTarget, 'flash-mountain');
          showMessage(`${fName} 冲锋射击！伤害${dmg}`);
        }
        gameState.selectedPieceId = null;
        gameState.mountainPieceId = null;
        gameState.mountainRemaining = 0;
        clearActionMode();
        updatePieceRender();
        updateMountainDisplay();
        checkAndNextTurn();
      }, 500);
    }
  },

  pointDist(aId, bId) {
    const a = pointById[aId], b = pointById[bId];
    if (!a || !b) return 99;
    return Math.abs(a.col - b.col) + Math.abs(a.row - b.row);
  },

  zoneScore(pointId, faction) {
    const pt = pointById[pointId];
    if (pt.zone === 'center') return 3;
    const enemyZones = Object.values(FACTIONS).filter(f => f.key !== faction).map(f => f.zone);
    if (enemyZones.includes(pt.zone)) return 5;
    if (pt.zone === FACTIONS[faction].zone) return -1;
    return 0;
  },
};

// 获取指定位置的近战目标（用于AI）
function getMeleeTargetsAt(pointId, faction) {
  return (ADJ[pointId] || []).filter(nid => {
    const p = getPieceAt(nid);
    return p && p.faction !== faction;
  });
}

// 火技能AI版本
function executeFireSkillAI(dcol, drow, pieceIdOverride) {
  const pieceId = pieceIdOverride || gameState.firePieceId;
  if (!pieceId) return;
  const piece = gameState.pieces.find(p => p.id === pieceId);
  if (!piece) return;

  const target = getFireTarget(pieceId, dcol, drow);
  if (target && target.piece.faction !== piece.faction) {
    const dmg = calcDamage(piece.faction, target.piece.faction, 2);
    applyDamageToPiece(target.piece, dmg);
    drawFireLine(piece.position, target.pointId);
    const ci = getCounterInfo(piece.faction, target.piece.faction);
    showMessage(`${FACTIONS[piece.faction].emoji}AI狙击！伤害${dmg}${ci}`);
  }

  gameState.firePieceId = null;
  clearActionMode();
  gameState.selectedPieceId = null;
  updatePieceRender();
  checkAndNextTurn();
}
