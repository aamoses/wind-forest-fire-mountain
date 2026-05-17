// 风林火山·四方乱斗 - 棋盘渲染
// ============================================================

let dom = {};
let particles = [];
let particleCanvas, particleCtx;
let particleAnimId;
let _pendingAnimations = [];

function cacheDom() {
  dom.board          = document.getElementById('board-container');
  dom.turnIndicator  = document.getElementById('turn-indicator');
  dom.svg            = document.getElementById('board-svg');
  dom.centerZone     = document.getElementById('center-zone');
  dom.pointsLayer    = document.getElementById('points-layer');
  dom.piecesLayer    = document.getElementById('pieces-layer');
  dom.trapsLayer     = document.getElementById('traps-layer');
  dom.effectsLayer   = document.getElementById('effects-layer');
  dom.arrowsLayer    = document.getElementById('arrows-layer');
  dom.actionBar      = document.getElementById('action-bar');
  dom.messageArea    = document.getElementById('message-area');
  dom.mountainCounter= document.getElementById('mountain-counter');
  dom.startOverlay   = document.getElementById('start-overlay');
  dom.victoryOverlay = document.getElementById('victory-overlay');
  dom.orderDisplay   = document.getElementById('order-display');
  dom.victoryEmoji   = document.getElementById('victory-emoji');
  dom.victoryMessage = document.getElementById('victory-message');
  dom.edgeTop    = document.getElementById('edge-top');
  dom.edgeBottom = document.getElementById('edge-bottom');
  dom.edgeLeft   = document.getElementById('edge-left');
  dom.edgeRight  = document.getElementById('edge-right');
  dom.edgeHpTop    = document.getElementById('edge-hp-top');
  dom.edgeHpBottom = document.getElementById('edge-hp-bottom');
  dom.edgeHpLeft   = document.getElementById('edge-hp-left');
  dom.edgeHpRight  = document.getElementById('edge-hp-right');
  particleCanvas = document.getElementById('particles-canvas');
  if (particleCanvas) particleCtx = particleCanvas.getContext('2d');
}

// ============================================================
// 粒子背景
// ============================================================

function initParticles() {
  if (!particleCanvas) return;
  resizeParticleCanvas();
  particles = [];
  const count = 80;
  for (let i = 0; i < count; i++) {
    const tier = Math.random();
    let r, vx, vy, alpha, color;
    if (tier < 0.5) {
      r = Math.random() * 1.2 + 0.3;
      vx = (Math.random() - 0.5) * 0.2;
      vy = (Math.random() - 0.5) * 0.2 - 0.1;
      alpha = Math.random() * 0.2 + 0.04;
      color = [212, 175, 55];
    } else if (tier < 0.75) {
      r = Math.random() * 1.8 + 0.5;
      vx = (Math.random() - 0.5) * 0.25;
      vy = (Math.random() - 0.5) * 0.25 - 0.15;
      alpha = Math.random() * 0.3 + 0.08;
      color = [180, 140, 60];
    } else {
      r = Math.random() * 3 + 1;
      vx = (Math.random() - 0.5) * 0.15;
      vy = (Math.random() - 0.5) * 0.15 - 0.06;
      alpha = Math.random() * 0.15 + 0.03;
      color = [100, 80, 200];
    }
    particles.push({
      x: Math.random() * particleCanvas.width,
      y: Math.random() * particleCanvas.height,
      r, vx, vy, alpha, color,
      pulse: Math.random() * Math.PI * 2,
      pulseSpeed: Math.random() * 0.03 + 0.01,
    });
  }
  animateParticles();
}

function resizeParticleCanvas() {
  if (!particleCanvas) return;
  particleCanvas.width = window.innerWidth;
  particleCanvas.height = window.innerHeight;
}

function animateParticles() {
  if (!particleCtx || !particleCanvas) return;
  particleCtx.clearRect(0, 0, particleCanvas.width, particleCanvas.height);
  for (const p of particles) {
    p.x += p.vx; p.y += p.vy; p.pulse += p.pulseSpeed;
    if (p.x < -20) p.x = particleCanvas.width + 20;
    if (p.x > particleCanvas.width + 20) p.x = -20;
    if (p.y < -20) p.y = particleCanvas.height + 20;
    if (p.y > particleCanvas.height + 20) p.y = -20;
    const flicker = p.alpha + Math.sin(p.pulse) * (p.alpha * 0.4);
    const [cr, cg, cb] = p.color;
    particleCtx.beginPath();
    particleCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    particleCtx.fillStyle = `rgba(${cr},${cg},${cb},${Math.max(0.02, Math.min(0.6, flicker))})`;
    particleCtx.fill();
  }
  particleAnimId = requestAnimationFrame(animateParticles);
}

function stopParticles() {
  if (particleAnimId) { cancelAnimationFrame(particleAnimId); particleAnimId = null; }
}

window.addEventListener('resize', resizeParticleCanvas);

// ============================================================
// 四方向信息条
// ============================================================

const SIDE_EDGES = {
  top:    { edge:'edgeTop',    hp:'edgeHpTop' },
  bottom: { edge:'edgeBottom', hp:'edgeHpBottom' },
  left:   { edge:'edgeLeft',   hp:'edgeHpLeft' },
  right:  { edge:'edgeRight',  hp:'edgeHpRight' },
};

const FACTION_COLORS = {
  fire:'#ff4a2a', forest:'#2ecc71', wind:'#f0c030', mountain:'#4a9eff',
};

function updateEdgeInfo() {
  const cs = currentSide();
  if (!cs) { clearEdgeInfo(); return; }

  for (const side of SIDES) {
    const entry = SIDE_EDGES[side];
    const el = dom[entry.edge];
    if (!el) continue;

    const faction = gameState.sideFaction[side];
    const fac = FACTIONS[faction];
    const isHuman = gameState.humanSides && gameState.humanSides.includes(side);
    const isActive = (side === cs);

    let guideText = '';
    if (isActive && gameState.phase === 'playing') {
      if (isDeployPhase()) guideText = '布阵中 · 可移动/部署';
      else guideText = isHuman ? '你的回合' : 'AI行动中';
    } else {
      guideText = isHuman ? '等待中' : 'AI';
    }

    el.className = `edge-info edge-${side}` + (isActive ? ` active-faction faction-${faction}` : '');
    const eEmoji = el.querySelector('.edge-emoji');
    const eText  = el.querySelector('.edge-text');
    if (eEmoji) eEmoji.textContent = fac.emoji;
    if (eText)  eText.textContent  = guideText;
    el.style.color = isActive ? FACTION_COLORS[faction] : '';
  }

  updateEdgeHPBars();
  updateTurnIndicator();
}

function updateEdgeHPBars() {
  for (const side of SIDES) {
    const entry = SIDE_EDGES[side];
    const el = dom[entry.hp];
    if (!el) continue;
    const faction = gameState.sideFaction[side];
    const pieces = getAlivePieces(faction);
    const totalHP = pieces.reduce((s, p) => s + p.hp, 0);
    const maxHP = 6 * 4;
    const pct = (totalHP / maxHP) * 100;
    el.style.width = el.classList.contains('vertical') ? '100%' : pct + '%';
    el.style.height = (side === 'left' || side === 'right')
      ? pct + '%' : '';
    el.style.background = pct < 25 ? '#ff3020' : (FACTION_COLORS[faction] || '#888');
  }
}

function clearEdgeInfo() {
  for (const side of SIDES) {
    const entry = SIDE_EDGES[side];
    const el = dom[entry.edge];
    if (!el) continue;
    el.classList.remove('active-faction');
    el.style.color = '';
    const eEmoji = el.querySelector('.edge-emoji');
    const eText  = el.querySelector('.edge-text');
    if (eEmoji) eEmoji.textContent = '';
    if (eText)  eText.textContent  = '';
  }
}

// ============================================================
// 回合指示器（边框高亮）
// ============================================================

function updateTurnIndicator() {
  const el = dom.turnIndicator;
  if (!el) return;
  const cs = currentSide();
  const faction = cs ? gameState.sideFaction[cs] : null;
  el.className = cs ? `side-${cs}` : '';

  if (faction && FACTION_COLORS[faction]) {
    const col = FACTION_COLORS[faction];
    el.style.setProperty('--indicator-color', col);
    el.style.setProperty('--indicator-glow', col.replace(')', ',0.3)').replace('rgb', 'rgba'));
  }
}

// ============================================================
// 棋盘渲染
// ============================================================

function renderBoard() {
  renderRoads();
  renderCenterZone();
  renderPoints();
  renderAllPieces();
  renderTraps();
  clearHighlights();
}

function renderRoads() {
  const drawn = new Set();
  let svg = '';
  for (const [aStr, neighbors] of Object.entries(ADJ)) {
    const a = parseInt(aStr);
    const pa = pointById[a];
    const {x:x1, y:y1} = pos(pa.col, pa.row);
    for (const b of neighbors) {
      const key = a < b ? `${a}-${b}` : `${b}-${a}`;
      if (drawn.has(key)) continue;
      drawn.add(key);
      const pb = pointById[b];
      const {x:x2, y:y2} = pos(pb.col, pb.row);
      // 外层：深色阴影
      svg += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="rgba(8,6,18,0.9)" stroke-width="10" stroke-linecap="round"/>`;
      // 中层：路面
      svg += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="rgba(38,32,60,0.85)" stroke-width="6" stroke-linecap="round"/>`;
      // 内层：微高光
      svg += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="rgba(80,70,110,0.3)" stroke-width="2" stroke-linecap="round"/>`;
    }
  }
  dom.svg.innerHTML = svg;
}

function renderCenterZone() {
  const tl = pos(2.5, 1.5);
  const w = CELL * 3;
  const h = CELL * 3;
  dom.centerZone.style.cssText = `
    left:${tl.x}px; top:${tl.y}px;
    width:${w}px; height:${h}px;
    border-radius:8px;
    background: radial-gradient(ellipse at center, rgba(212,175,55,0.05) 0%, transparent 70%);
    border: 1px solid rgba(212,175,55,0.07);
  `;
}

function renderPoints() {
  let html = '';
  for (const p of POINTS) {
    const {x, y} = pos(p.col, p.row);
    html += `<div class="board-point" id="pt-${p.id}" style="left:${x}px;top:${y}px" data-point="${p.id}"></div>`;
  }
  dom.pointsLayer.innerHTML = html;
  for (const p of POINTS) {
    const el = document.getElementById(`pt-${p.id}`);
    if (el) el.addEventListener('click', e => { e.stopPropagation(); onPointClick(p.id); });
  }
}

function renderAllPieces() {
  let html = '';
  const cf = currentFaction();

  for (const piece of gameState.pieces) {
    if (piece.hp <= 0) continue;
    const pt = pointById[piece.position];
    const {x, y} = pos(pt.col, pt.row);
    const fac = FACTIONS[piece.faction];

    const isSel     = piece.id === gameState.selectedPieceId;
    const isCurrent = (cf === piece.faction && gameState.phase === 'playing');
    const isAtk     = (cf === 'mountain' && gameState._mountainAttacks?.includes(piece.position));

    let cls = `piece ${piece.faction}`;
    if (isSel)     cls += ' selected';
    if (isCurrent) cls += ' current-faction';
    if (isAtk)     cls += ' attackable';

    let hpDots = '';
    for (let i = 0; i < 4; i++) {
      if (i < piece.hp) hpDots += `<span class="piece-hp-dot"></span>`;
    }

    html += `<div class="${cls}" id="piece-${piece.id}" style="left:${x}px;top:${y}px" data-piece="${piece.id}">
      <div class="piece-icon">${fac.icon}</div>
      <div class="piece-hp">${hpDots}</div>
    </div>`;
  }
  dom.piecesLayer.innerHTML = html;

  for (const piece of gameState.pieces) {
    if (piece.hp <= 0) continue;
    const el = document.getElementById(`piece-${piece.id}`);
    if (el) el.addEventListener('click', e => { e.stopPropagation(); onPieceClick(piece.id); });
  }
  applyPendingAnimations();
}

function renderTraps() {
  let html = '';
  const cf = currentFaction();
  const isForest = cf === 'forest';

  for (const trap of gameState.traps) {
    const pt = pointById[trap.position];
    const {x, y} = pos(pt.col, pt.row);
    const detClass = (isForest && gameState.actionMode === 'trap_detonate') ? ' detonatable' : '';
    const visClass = isForest ? ' forest-visible' : '';
    html += `<div class="trap${detClass}${visClass}" id="trap-${trap.id}" style="left:${x}px;top:${y}px" data-trap="${trap.id}"></div>`;
  }
  dom.trapsLayer.innerHTML = html;

  if (isForest && gameState.actionMode === 'trap_detonate') {
    for (const trap of gameState.traps) {
      const el = document.getElementById(`trap-${trap.id}`);
      if (el) el.addEventListener('click', e => { e.stopPropagation(); onTrapClick(trap.id); });
    }
  }
}

function updatePieceRender() {
  renderAllPieces();
  renderTraps();
  renderArrows();
}

// ============================================================
// 动画
// ============================================================

function schedulePieceAnimation(pieceId, fromPointId, toPointId) {
  const fromPt = pointById[fromPointId];
  const toPt   = pointById[toPointId];
  if (!fromPt || !toPt) return;
  _pendingAnimations.push({
    pieceId,
    fromX: pos(fromPt.col, fromPt.row).x,
    fromY: pos(fromPt.col, fromPt.row).y,
    toX:   pos(toPt.col, toPt.row).x,
    toY:   pos(toPt.col, toPt.row).y,
  });
}

function applyPendingAnimations() {
  for (const anim of _pendingAnimations) {
    const el = document.getElementById(`piece-${anim.pieceId}`);
    if (!el) continue;

    // 轨迹
    const trail = document.createElement('div');
    trail.className = 'move-trail';
    const dx = anim.toX - anim.fromX;
    const dy = anim.toY - anim.fromY;
    const len = Math.sqrt(dx*dx + dy*dy);
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
    trail.style.cssText = `
      left:${(anim.fromX+anim.toX)/2}px; top:${(anim.fromY+anim.toY)/2}px;
      width:${len}px; height:3px;
      transform:translate(-50%,-50%) rotate(${angle}deg);
    `;
    dom.effectsLayer.appendChild(trail);
    setTimeout(() => trail.remove(), 550);

    // 出发点残影
    const ghost = document.createElement('div');
    ghost.className = 'move-ghost';
    ghost.style.cssText = `left:${anim.fromX}px; top:${anim.fromY}px;`;
    dom.effectsLayer.appendChild(ghost);
    setTimeout(() => ghost.remove(), 500);

    // 移动
    el.style.left = anim.fromX + 'px';
    el.style.top  = anim.fromY + 'px';
    el.offsetHeight; // reflow
    el.style.left = anim.toX + 'px';
    el.style.top  = anim.toY + 'px';

    // 落点闪光
    setTimeout(() => {
      const land = document.createElement('div');
      land.className = 'move-landing';
      land.style.cssText = `left:${anim.toX}px; top:${anim.toY}px;`;
      dom.effectsLayer.appendChild(land);
      setTimeout(() => land.remove(), 400);
    }, 400);
  }
  _pendingAnimations = [];
}

// ============================================================
// UI 更新
// ============================================================

function updateUI() {
  updateEdgeInfo();
  updateMountainDisplay();
}

function showMessage(msg) {
  if (dom.messageArea) dom.messageArea.textContent = msg;
}

// ============================================================
// 高亮
// ============================================================

function clearHighlights() {
  for (const p of POINTS) {
    const el = document.getElementById(`pt-${p.id}`);
    if (el) el.classList.remove('valid-move', 'valid-attack', 'trap-target');
  }
}

function highlightPoints(pointIds, className) {
  for (const id of pointIds) {
    const el = document.getElementById(`pt-${id}`);
    if (el) el.classList.add(className);
  }
}

// ============================================================
// 特效
// ============================================================

function flashPoint(pointId, className) {
  const pt = pointById[pointId];
  if (!pt) return;
  const {x, y} = pos(pt.col, pt.row);
  const flash = document.createElement('div');
  flash.style.cssText = `
    position:absolute; z-index:12; pointer-events:none;
    left:${x}px; top:${y}px;
    width:${CELL*0.9}px; height:${CELL*0.9}px;
    transform:translate(-50%,-50%);
    border-radius:50%;
  `;
  flash.className = className;
  dom.effectsLayer.appendChild(flash);
  setTimeout(() => flash.remove(), 600);
}

function drawFireLine(fromPointId, toPointId) {
  const fromPt = pointById[fromPointId];
  const toPt   = pointById[toPointId];
  const {x:x1, y:y1} = pos(fromPt.col, fromPt.row);
  const {x:x2, y:y2} = pos(toPt.col, toPt.row);

  const line = document.createElement('div');
  line.style.cssText = `
    position:absolute; z-index:15; pointer-events:none;
    background:linear-gradient(90deg, rgba(255,80,30,0.9), rgba(255,200,80,0.8));
    transform-origin:left center;
    height:3px; border-radius:2px;
    left:${x1}px; top:${y1}px;
    width:${Math.hypot(x2-x1, y2-y1)}px;
    transform:rotate(${Math.atan2(y2-y1, x2-x1)}rad);
    box-shadow: 0 0 10px rgba(255,80,30,0.7);
    animation: trail-fade 0.4s ease-out forwards;
  `;
  dom.effectsLayer.appendChild(line);
  setTimeout(() => line.remove(), 450);

  const ring = document.createElement('div');
  ring.style.cssText = `
    position:absolute; z-index:16; pointer-events:none;
    left:${x2}px; top:${y2}px;
    width:34px; height:34px;
    transform:translate(-50%,-50%);
    border-radius:50%;
    border:3px solid rgba(255,80,30,0.9);
    box-shadow: 0 0 16px rgba(255,60,20,0.8);
    animation: fire-target-ring 0.4s ease-out forwards;
  `;
  dom.effectsLayer.appendChild(ring);
  setTimeout(() => ring.remove(), 450);
}

function clearAllDynamicElements() {
  if (dom.pointsLayer)   dom.pointsLayer.innerHTML = '';
  if (dom.piecesLayer)   dom.piecesLayer.innerHTML = '';
  if (dom.trapsLayer)    dom.trapsLayer.innerHTML = '';
  if (dom.effectsLayer)  dom.effectsLayer.innerHTML = '';
  if (dom.arrowsLayer)   dom.arrowsLayer.innerHTML = '';
  if (dom.actionBar)     dom.actionBar.innerHTML = '';
}

// ============================================================
// 方向箭头（火技能）
// ============================================================

function renderArrows() {
  if (!dom.arrowsLayer) return;
  dom.arrowsLayer.innerHTML = '';
  if (gameState.actionMode !== 'fire_dir' || !gameState.firePieceId) return;

  const piece = gameState.pieces.find(p => p.id === gameState.firePieceId);
  if (!piece) return;
  const pt = pointById[piece.position];
  const {x, y} = pos(pt.col, pt.row);
  const dist = 38;

  for (const [dc, dr, label] of DIRECTIONS) {
    const ax = x + dc * dist;
    const ay = y + dr * dist;
    const arrow = document.createElement('div');
    arrow.className = 'dir-arrow';
    arrow.style.cssText = `left:${ax}px; top:${ay}px; transform:translate(-50%,-50%);`;
    arrow.textContent = label;
    arrow.addEventListener('click', e => { e.stopPropagation(); executeFireSkill(dc, dr); });
    dom.arrowsLayer.appendChild(arrow);
  }
}

function clearArrows() {
  if (dom.arrowsLayer) dom.arrowsLayer.innerHTML = '';
}

// ============================================================
// 行动顺序弹窗
// ============================================================

function renderTurnOrder() {
  const sideNames = { top:'上', right:'右', bottom:'下', left:'左' };
  const humanSides = gameState.humanSides || [];
  let html = '';
  for (const side of SIDES) {
    const f = gameState.sideFaction[side];
    const fac = FACTIONS[f];
    const isHuman = humanSides.includes(side);
    html += `<span class="order-item" style="color:${fac.color}">${sideNames[side]}·${fac.emoji}${fac.name} ${isHuman ? '👤' : '🤖'}</span>`;
  }
  dom.orderDisplay.innerHTML = html;
  dom.startOverlay.style.display = 'flex';
  dom.victoryOverlay.style.display = 'none';
}

function showVictory(factionKey) {
  gameState.phase = 'victory';
  const fac = FACTIONS[factionKey];
  dom.victoryEmoji.textContent = fac.emoji;
  dom.victoryMessage.textContent = `${fac.name}阵营胜利！`;
  dom.victoryMessage.style.color = fac.color;
  dom.victoryOverlay.style.display = 'flex';
  clearEdgeInfo();
}
