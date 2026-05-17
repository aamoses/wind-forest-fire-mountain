// 风林火山·四方乱斗 - 棋盘渲染、特效与四方向信息
// ============================================================

// DOM 缓存
let dom = {};
// 粒子系统
let particles = [];
let particleCanvas, particleCtx;
let particleAnimId;
// 移动动画
let _pendingAnimations = [];

function cacheDom() {
  dom.board = document.getElementById('board-container');
  dom.turnIndicator = document.getElementById('turn-indicator');
  dom.svg = document.getElementById('board-svg');
  dom.centerZone = document.getElementById('center-zone');
  dom.pointsLayer = document.getElementById('points-layer');
  dom.piecesLayer = document.getElementById('pieces-layer');
  dom.trapsLayer = document.getElementById('traps-layer');
  dom.effectsLayer = document.getElementById('effects-layer');
  dom.arrowsLayer = document.getElementById('arrows-layer');
  dom.actionBar = document.getElementById('action-bar');
  dom.messageArea = document.getElementById('message-area');
  dom.mountainCounter = document.getElementById('mountain-counter');
  dom.startOverlay = document.getElementById('start-overlay');
  dom.victoryOverlay = document.getElementById('victory-overlay');
  dom.orderDisplay = document.getElementById('order-display');
  dom.victoryEmoji = document.getElementById('victory-emoji');
  dom.victoryMessage = document.getElementById('victory-message');
  // 四方向信息条
  dom.edgeTop = document.getElementById('edge-top');
  dom.edgeBottom = document.getElementById('edge-bottom');
  dom.edgeLeft = document.getElementById('edge-left');
  dom.edgeRight = document.getElementById('edge-right');
  // HP血条
  dom.edgeHpTop = document.getElementById('edge-hp-top');
  dom.edgeHpBottom = document.getElementById('edge-hp-bottom');
  dom.edgeHpLeft = document.getElementById('edge-hp-left');
  dom.edgeHpRight = document.getElementById('edge-hp-right');
  // 粒子画布
  particleCanvas = document.getElementById('particles-canvas');
  if (particleCanvas) {
    particleCtx = particleCanvas.getContext('2d');
  }
}

// ============================================================
// 金色粒子背景动画
// ============================================================

function initParticles() {
  if (!particleCanvas) return;
  resizeParticleCanvas();
  particles = [];
  const count = 150;
  for (let i = 0; i < count; i++) {
    const tier = Math.random();
    let r, vx, vy, alpha, color;
    if (tier < 0.45) {
      r = Math.random() * 1.4 + 0.3;
      vx = (Math.random() - 0.5) * 0.25;
      vy = (Math.random() - 0.5) * 0.25 - 0.15;
      alpha = Math.random() * 0.3 + 0.06;
      color = [240, 210, 96];
    } else if (tier < 0.7) {
      r = Math.random() * 2 + 0.6;
      vx = (Math.random() - 0.5) * 0.35;
      vy = (Math.random() - 0.5) * 0.35 - 0.28;
      alpha = Math.random() * 0.5 + 0.15;
      color = [255, 100, 40];
    } else if (tier < 0.88) {
      r = Math.random() * 2.5 + 1;
      vx = (Math.random() - 0.5) * 0.2;
      vy = (Math.random() - 0.5) * 0.2 - 0.1;
      alpha = Math.random() * 0.35 + 0.08;
      color = [100, 180, 255];
    } else {
      r = Math.random() * 4 + 2;
      vx = (Math.random() - 0.5) * 0.12;
      vy = (Math.random() - 0.5) * 0.12 - 0.06;
      alpha = Math.random() * 0.25 + 0.04;
      color = [240, 210, 80];
    }
    particles.push({
      x: Math.random() * particleCanvas.width,
      y: Math.random() * particleCanvas.height,
      r, vx, vy, alpha, color,
      pulse: Math.random() * Math.PI * 2,
      pulseSpeed: Math.random() * 0.04 + 0.01,
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
    p.x += p.vx;
    p.y += p.vy;
    p.pulse += p.pulseSpeed;

    if (p.x < -30) p.x = particleCanvas.width + 30;
    if (p.x > particleCanvas.width + 30) p.x = -30;
    if (p.y < -30) p.y = particleCanvas.height + 30;
    if (p.y > particleCanvas.height + 30) p.y = -30;

    const flicker = p.alpha + Math.sin(p.pulse) * (p.alpha * 0.5);
    const [cr, cg, cb] = p.color;
    const glowR = p.r * (p.r > 2.5 ? 3 : 2);

    if (p.r > 1.5) {
      const grad = particleCtx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowR);
      grad.addColorStop(0, `rgba(${cr},${cg},${cb},${Math.min(0.3, flicker * 1.2)})`);
      grad.addColorStop(0.4, `rgba(${cr},${cg},${cb},${Math.min(0.1, flicker * 0.4)})`);
      grad.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
      particleCtx.beginPath();
      particleCtx.arc(p.x, p.y, glowR, 0, Math.PI * 2);
      particleCtx.fillStyle = grad;
      particleCtx.fill();
    }

    particleCtx.beginPath();
    particleCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    particleCtx.fillStyle = `rgba(${cr},${cg},${cb},${Math.max(0.03, Math.min(0.7, flicker))})`;
    particleCtx.fill();
  }

  particleAnimId = requestAnimationFrame(animateParticles);
}

function stopParticles() {
  if (particleAnimId) {
    cancelAnimationFrame(particleAnimId);
    particleAnimId = null;
  }
}

window.addEventListener('resize', resizeParticleCanvas);

// ============================================================
// 四方向信息更新（按边位置而非阵营）
// ============================================================

// 边到DOM元素的映射
const SIDE_EDGES = {
  top:    { edge: 'edgeTop',  hp: 'edgeHpTop' },
  bottom: { edge: 'edgeBottom', hp: 'edgeHpBottom' },
  left:   { edge: 'edgeLeft',  hp: 'edgeHpLeft' },
  right:  { edge: 'edgeRight', hp: 'edgeHpRight' },
};

function updateEdgeInfo() {
  const cs = currentSide();
  if (!cs) { clearEdgeInfo(); return; }
  const cf = currentFaction();

  const selPiece = gameState.selectedPieceId !== null
    ? gameState.pieces.find(p => p.id === gameState.selectedPieceId) : null;

  const deployNote = isDeployPhase() ? ' [布阵期·禁攻]' : '';

  // 更新每条边
  for (const side of SIDES) {
    const entry = SIDE_EDGES[side];
    const el = dom[entry.edge];
    if (!el) continue;

    const factionOnSide = gameState.sideFaction[side];
    const fac = FACTIONS[factionOnSide];
    const isHuman = gameState.humanSides && gameState.humanSides.includes(side);

    // 构建该边的指引文本
    let guideText = '';
    if (side === cs && selPiece && gameState.phase === 'playing') {
      if (cf === 'mountain')     guideText = '跑打一体 | 绿:移动 | 红:射击';
      else if (cf === 'forest')  guideText = '移动 | 近战2 | 部署无人机 | 打击';
      else if (cf === 'fire')    guideText = '移动 | 近战2 | 狙击2(直线)';
      else if (cf === 'wind')    guideText = '移动 | 近战2 | 辐射2(日字AOE)';
    } else if (side === cs) {
      guideText = '点击兵人开始';
    } else {
      guideText = isHuman ? '👤 等待中...' : '🤖 AI思考中';
    }

    const deploySuffix = (side === cs && deployNote) ? deployNote : '';
    const text = guideText + deploySuffix;

    el.style.color = fac.color;
    el.classList.toggle('active-faction', side === cs);
    const eEmoji = el.querySelector('.edge-emoji');
    const eText = el.querySelector('.edge-text');
    if (eEmoji) eEmoji.textContent = fac.emoji;
    if (eText) eText.textContent = text;
  }

  updateEdgeHPBars();
  updateTrapezoid();
}

function updateEdgeHPBars() {
  const colorMap = {
    fire: '#ff5530', forest: '#45f075',
    wind: '#f5d860', mountain: '#55b8ff',
  };
  for (const side of SIDES) {
    const entry = SIDE_EDGES[side];
    const el = dom[entry.hp];
    if (!el) continue;
    const factionOnSide = gameState.sideFaction[side];
    const pieces = getAlivePieces(factionOnSide);
    const totalHP = pieces.reduce((s, p) => s + p.hp, 0);
    const maxHP = 6 * 4;
    const pct = (totalHP / maxHP) * 100;
    el.style.width = pct + '%';
    el.style.background = pct < 25 ? '#ff3020' : (colorMap[factionOnSide] || '#888');
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
    const eText = el.querySelector('.edge-text');
    if (eEmoji) eEmoji.textContent = '';
    if (eText) eText.textContent = '';
  }
  resetTrapezoid();
}

// ============================================================
// 梯形轮廓指示器 — 宽边朝向当前玩家
// ============================================================

function updateTrapezoid() {
  const cs = currentSide();
  if (!cs) { resetTrapezoid(); return; }
  const el = dom.turnIndicator;
  if (!el) return;

  const t = 20;
  const clips = {
    top:    `polygon(${t}% 0%, ${100-t}% 0%, 100% 100%, 0% 100%)`,
    right:  `polygon(0% 0%, 100% ${t}%, 100% ${100-t}%, 0% 100%)`,
    bottom: `polygon(0% 0%, 100% 0%, ${100-t}% 100%, ${t}% 100%)`,
    left:   `polygon(0% ${t}%, 100% 0%, 100% 100%, 0% ${100-t}%)`,
  };

  el.style.transition = 'clip-path 0.55s cubic-bezier(0.4, 0, 0.2, 1)';
  el.style.clipPath = clips[cs];

  // 活动边光扫
  updateGlowSweep(cs);
}

let glowSweepEl = null;

function updateGlowSweep(side) {
  if (!glowSweepEl) {
    glowSweepEl = document.createElement('div');
    glowSweepEl.className = 'edge-glow-sweep';
    if (dom.board) dom.board.appendChild(glowSweepEl);
  }
  if (!glowSweepEl || !dom.board) return;

  const boardW = dom.board.offsetWidth;
  const boardH = dom.board.offsetHeight;
  const sweepW = 180;  // 光扫长度
  const sweepH = 3;    // 光扫厚度

  let top, left, width, height;
  switch (side) {
    case 'top':
      left = (boardW - sweepW) / 2; top = -2; width = sweepW; height = sweepH;
      break;
    case 'bottom':
      left = (boardW - sweepW) / 2; top = boardH - 1; width = sweepW; height = sweepH;
      break;
    case 'left':
      left = -2; top = (boardH - sweepW) / 2; width = sweepH; height = sweepW;
      break;
    case 'right':
      left = boardW - 1; top = (boardH - sweepW) / 2; width = sweepH; height = sweepW;
      break;
  }

  glowSweepEl.style.cssText = `
    left:${left}px; top:${top}px;
    width:${width}px; height:${height}px;
    ${(side==='left'||side==='right') ? 'background:linear-gradient(0deg, transparent, rgba(240,210,80,0.35), transparent);' : 'background:linear-gradient(90deg, transparent, rgba(240,210,80,0.35), transparent);'}
    animation: sweep-light 1.8s ease-in-out infinite;
  `;
}

function resetTrapezoid() {
  if (dom.turnIndicator) {
    dom.turnIndicator.style.clipPath = '';
  }
}

// ============================================================
// 棋盘渲染
// ============================================================

function renderBoard() {
  renderRoads();
  renderBuildings();
  renderCenterZone();
  renderPoints();
  renderAllPieces();
  renderTraps();
  clearHighlights();
}

// 道路渲染（宽街巷+路标线+路面纹理）
function renderRoads() {
  const drawn = new Set();
  let lines = '';
  let glowLines = '';
  for (const [aStr, neighbors] of Object.entries(ADJ)) {
    const a = parseInt(aStr);
    const pa = pointById[a];
    const { x: x1, y: y1 } = pos(pa.col, pa.row);
    for (const b of neighbors) {
      const key = a < b ? `${a}-${b}` : `${b}-${a}`;
      if (drawn.has(key)) continue;
      drawn.add(key);
      const pb = pointById[b];
      const { x: x2, y: y2 } = pos(pb.col, pb.row);
      // 路面底层（宽路基）
      glowLines += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#2a2520" stroke-width="12" stroke-linecap="round"/>`;
      // 路面
      glowLines += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#3d3830" stroke-width="7" stroke-linecap="round"/>`;
      // 路面中央虚线
      glowLines += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="rgba(140,125,100,0.3)" stroke-width="1" stroke-linecap="round" stroke-dasharray="4,8"/>`;
      // 路面高光边
      lines += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="rgba(100,85,65,0.2)" stroke-width="9" stroke-linecap="round"/>`;
    }
  }
  dom.svg.innerHTML = glowLines + lines;
}

// 建筑渲染（巷战房屋/仓库/据点）
function renderBuildings() {
  let html = '';
  for (const b of BUILDINGS) {
    const corners = b.corners.map(id => pointById[id]).filter(Boolean);
    if (corners.length < 4) continue;
    // 计算建筑中心点
    const avgCol = corners.reduce((s, p) => s + p.col, 0) / corners.length;
    const avgRow = corners.reduce((s, p) => s + p.row, 0) / corners.length;
    const { x, y } = pos(avgCol, avgRow);
    // 建筑尺寸 = 角点间距 - 道路宽度
    const minCol = Math.min(...corners.map(p => p.col));
    const maxCol = Math.max(...corners.map(p => p.col));
    const minRow = Math.min(...corners.map(p => p.row));
    const maxRow = Math.max(...corners.map(p => p.row));
    const w = (maxCol - minCol) * CELL - 14;
    const h = (maxRow - minRow) * CELL - 14;
    html += `<div class="building type-${b.type}" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px;">
      <div class="building-roof" style="width:${w}px;height:${h}px;"></div>
      <div class="building-wall" style="width:${w}px;"></div>
    </div>`;
  }
  // 清除旧建筑（保留pieces-layer之前的建筑层）
  let buildingLayer = document.getElementById('buildings-layer');
  if (!buildingLayer) {
    buildingLayer = document.createElement('div');
    buildingLayer.id = 'buildings-layer';
    buildingLayer.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:1;';
    const board = document.getElementById('board-container');
    if (board) {
      const svg = document.getElementById('board-svg');
      if (svg) svg.after(buildingLayer);
      else board.appendChild(buildingLayer);
    }
  }
  buildingLayer.innerHTML = html;
}

function renderCenterZone() {
  const topLeft = pos(2.5, 1.5);
  const w = CELL * 3;
  const h = CELL * 3;
  dom.centerZone.style.cssText = `
    left:${topLeft.x}px; top:${topLeft.y}px;
    width:${w}px; height:${h}px;
    border-radius: 8px;
    background: radial-gradient(ellipse at center, rgba(80,70,55,0.25) 0%, rgba(50,40,30,0.15) 60%, transparent 100%);
  `;
}

function renderPoints() {
  let html = '';
  for (const p of POINTS) {
    const { x, y } = pos(p.col, p.row);
    // 路口标记：小圆形+外环
    html += `<div class="board-point" id="pt-${p.id}"
      style="left:${x}px;top:${y}px"
      data-point="${p.id}"></div>`;
  }
  dom.pointsLayer.innerHTML = html;

  for (const p of POINTS) {
    const el = document.getElementById(`pt-${p.id}`);
    if (el) {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        onPointClick(p.id);
      });
    }
  }
}

function renderAllPieces() {
  let html = '';
  const cf = currentFaction();

  // 阵营→边的反向映射（用于棋子旋转）
  const factionSide = {};
  if (gameState.sideFaction) {
    for (const [side, f] of Object.entries(gameState.sideFaction)) {
      factionSide[f] = side;
    }
  }
  const sideRotation = { top: 0, right: 270, bottom: 180, left: 90 };

  for (const piece of gameState.pieces) {
    if (piece.hp <= 0) continue;
    const pt = pointById[piece.position];
    const { x, y } = pos(pt.col, pt.row);
    const fac = FACTIONS[piece.faction];
    const selClass = piece.id === gameState.selectedPieceId ? ' selected' : '';
    const curClass = (cf === piece.faction && gameState.phase === 'playing') ? ' current-faction' : '';
    const atkClass = (cf === 'mountain' && gameState._mountainAttacks?.includes(piece.position)) ? ' attackable' : '';
    const rot = sideRotation[factionSide[piece.faction]] || 0;
    let hpDots = '';
    for (let i = 0; i < piece.hp; i++) {
      hpDots += `<span class="piece-hp-dot"></span>`;
    }
    html += `<div class="piece ${piece.faction}${selClass}${curClass}${atkClass}" id="piece-${piece.id}"
      style="left:${x}px;top:${y}px"
      data-piece="${piece.id}">
      <div class="piece-figure" style="transform:rotate(${rot}deg);">${SOLDIER_SVG[piece.faction]}</div>
      <div class="piece-hp">${hpDots}</div>
      <div class="piece-base"></div>
    </div>`;
  }
  dom.piecesLayer.innerHTML = html;

  for (const piece of gameState.pieces) {
    if (piece.hp <= 0) continue;
    const el = document.getElementById(`piece-${piece.id}`);
    if (el) {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        onPieceClick(piece.id);
      });
    }
  }

  // 应用移动动画
  applyPendingAnimations();
}

function renderTraps() {
  let html = '';
  const cf = currentFaction();
  const isForest = (cf === 'forest');

  for (const trap of gameState.traps) {
    const pt = pointById[trap.position];
    const { x, y } = pos(pt.col, pt.row);
    const detClass = (isForest && gameState.actionMode === 'trap_detonate') ? ' detonatable' : '';
    const visClass = isForest ? ' forest-visible' : '';
    html += `<div class="trap${detClass}${visClass}" id="trap-${trap.id}"
      style="left:${x}px;top:${y}px;"
      data-trap="${trap.id}" data-point="${trap.position}"></div>`;
  }
  dom.trapsLayer.innerHTML = html;

  if (isForest && gameState.actionMode === 'trap_detonate') {
    for (const trap of gameState.traps) {
      const el = document.getElementById(`trap-${trap.id}`);
      if (el) {
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          onTrapClick(trap.id);
        });
      }
    }
  }
}

function updatePieceRender() {
  renderAllPieces();
  renderTraps();
  renderArrows();
}

function schedulePieceAnimation(pieceId, fromPointId, toPointId) {
  const fromPt = pointById[fromPointId];
  const toPt = pointById[toPointId];
  if (!fromPt || !toPt) return;
  const fromPos = pos(fromPt.col, fromPt.row);
  const toPos = pos(toPt.col, toPt.row);
  _pendingAnimations.push({ pieceId, fromX: fromPos.x, fromY: fromPos.y, toX: toPos.x, toY: toPos.y });
}

function applyPendingAnimations() {
  for (const anim of _pendingAnimations) {
    const el = document.getElementById(`piece-${anim.pieceId}`);
    if (!el) continue;

    // 创建移动轨迹光效
    const trail = document.createElement('div');
    trail.className = 'move-trail';
    const midX = (anim.fromX + anim.toX) / 2;
    const midY = (anim.fromY + anim.toY) / 2;
    const dx = anim.toX - anim.fromX;
    const dy = anim.toY - anim.fromY;
    const len = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
    trail.style.cssText = `
      left:${midX}px; top:${midY}px;
      width:${len}px; height:3px;
      transform:translate(-50%,-50%) rotate(${angle}deg);
    `;
    dom.effectsLayer.appendChild(trail);
    setTimeout(() => { if (trail.parentNode) trail.remove(); }, 600);

    // 旧位置光点残留
    const ghost = document.createElement('div');
    ghost.className = 'move-ghost';
    ghost.style.cssText = `left:${anim.fromX}px; top:${anim.fromY}px;`;
    dom.effectsLayer.appendChild(ghost);
    setTimeout(() => { if (ghost.parentNode) ghost.remove(); }, 500);

    // 执行平滑移动
    el.style.left = anim.fromX + 'px';
    el.style.top = anim.fromY + 'px';
    el.offsetHeight;
    el.style.left = anim.toX + 'px';
    el.style.top = anim.toY + 'px';

    // 目标点落子闪光
    setTimeout(() => {
      const landingFlash = document.createElement('div');
      landingFlash.className = 'move-landing';
      landingFlash.style.cssText = `left:${anim.toX}px; top:${anim.toY}px;`;
      dom.effectsLayer.appendChild(landingFlash);
      setTimeout(() => { if (landingFlash.parentNode) landingFlash.remove(); }, 400);
    }, 500);
  }
  _pendingAnimations = [];
}

// ============================================================
// UI 状态更新
// ============================================================

function updateUI() {
  const cf = currentFaction();
  if (!cf) return;

  updateEdgeInfo();
  updateMountainDisplay();
}

function showMessage(msg) {
  if (dom.messageArea) dom.messageArea.textContent = msg;
}

// ============================================================
// 特效系统
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

function flashPoint(pointId, className) {
  const pt = pointById[pointId];
  if (!pt) return;
  const { x, y } = pos(pt.col, pt.row);
  const flash = document.createElement('div');
  flash.style.cssText = `
    position:absolute; z-index:12; pointer-events:none;
    left:${x}px; top:${y}px;
    width:${CELL*1.1}px; height:${CELL*1.1}px;
    transform:translate(-50%,-50%);
    border-radius:4px;
  `;
  flash.className = className;
  dom.effectsLayer.appendChild(flash);
  setTimeout(() => flash.remove(), 550);
}

function drawFireLine(fromPointId, toPointId) {
  const fromPt = pointById[fromPointId];
  const toPt = pointById[toPointId];
  const fromPos = pos(fromPt.col, fromPt.row);
  const toPos = pos(toPt.col, toPt.row);

  const line = document.createElement('div');
  line.style.cssText = `
    position:absolute; z-index:15; pointer-events:none;
    background:rgba(231,76,60,0.85);
    transform-origin:left center;
    height:4px; border-radius:2px;
    left:${fromPos.x}px; top:${fromPos.y}px;
    width:${Math.hypot(toPos.x-fromPos.x, toPos.y-fromPos.y)}px;
    transform:rotate(${Math.atan2(toPos.y-fromPos.y, toPos.x-fromPos.x)}rad);
    box-shadow: 0 0 8px rgba(255,60,30,0.6);
    animation:flash-fire-anim 0.35s ease-out forwards;
  `;
  dom.effectsLayer.appendChild(line);
  setTimeout(() => line.remove(), 400);

  // 精确目标环
  const ring = document.createElement('div');
  ring.style.cssText = `
    position:absolute; z-index:16; pointer-events:none;
    left:${toPos.x}px; top:${toPos.y}px;
    width:36px; height:36px;
    transform:translate(-50%,-50%);
    border-radius:50%;
    border:3px solid rgba(255,50,15,0.9);
    box-shadow: 0 0 14px rgba(255,30,10,0.7), 0 0 30px rgba(255,60,20,0.35);
    animation: fire-target-ring 0.45s ease-out forwards;
  `;
  dom.effectsLayer.appendChild(ring);
  setTimeout(() => ring.remove(), 500);

  // 紧凑闪光
  const flash = document.createElement('div');
  flash.style.cssText = `
    position:absolute; z-index:12; pointer-events:none;
    left:${toPos.x}px; top:${toPos.y}px;
    width:28px; height:28px;
    transform:translate(-50%,-50%);
    border-radius:50%;
    background:rgba(255,60,20,0.75);
    box-shadow: 0 0 18px rgba(255,30,10,0.6);
    animation: flash-fire-anim 0.35s ease-out forwards;
  `;
  dom.effectsLayer.appendChild(flash);
  setTimeout(() => flash.remove(), 400);
}

function clearAllDynamicElements() {
  dom.pointsLayer.innerHTML = '';
  dom.piecesLayer.innerHTML = '';
  dom.trapsLayer.innerHTML = '';
  dom.effectsLayer.innerHTML = '';
  dom.arrowsLayer.innerHTML = '';
  dom.actionBar.innerHTML = '';
}

// ============================================================
// 方向箭头（火技能）
// ============================================================

function renderArrows() {
  dom.arrowsLayer.innerHTML = '';
  if (gameState.actionMode !== 'fire_dir' || !gameState.firePieceId) return;

  const piece = gameState.pieces.find(p => p.id === gameState.firePieceId);
  if (!piece) return;

  const pt = pointById[piece.position];
  const { x, y } = pos(pt.col, pt.row);
  const dist = 36;

  for (const [dc, dr, label] of DIRECTIONS) {
    const ax = x + dc * dist;
    const ay = y + dr * dist;
    const arrow = document.createElement('div');
    arrow.className = 'dir-arrow';
    arrow.style.cssText = `left:${ax}px;top:${ay}px;transform:translate(-50%,-50%);`;
    arrow.textContent = label;
    arrow.addEventListener('click', (e) => {
      e.stopPropagation();
      executeFireSkill(dc, dr);
    });
    dom.arrowsLayer.appendChild(arrow);
  }
}

function clearArrows() {
  dom.arrowsLayer.innerHTML = '';
}

// ============================================================
// 行动顺序与胜利弹窗
// ============================================================

function renderTurnOrder() {
  const sideNames = { top: '上', right: '右', bottom: '下', left: '左' };
  const humanSides = gameState.humanSides || [];
  let html = '';
  for (const side of SIDES) {
    const f = gameState.sideFaction[side];
    const fac = FACTIONS[f];
    const isHuman = humanSides.includes(side);
    html += `<span class="order-item">${sideNames[side]}·${fac.name} ${isHuman ? '👤' : '🤖'}</span>`;
  }
  dom.orderDisplay.innerHTML = html;
  dom.startOverlay.style.display = 'flex';
  dom.victoryOverlay.style.display = 'none';
}

function showVictory(factionKey) {
  gameState.phase = 'victory';
  const fac = FACTIONS[factionKey];
  dom.victoryEmoji.textContent = fac.emoji;
  dom.victoryMessage.textContent = `${fac.name}小队胜利！`;
  dom.victoryMessage.style.color = fac.color;
  dom.victoryOverlay.style.display = 'flex';
  clearEdgeInfo();
}
