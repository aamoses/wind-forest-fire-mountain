// 风林火山·四方乱斗 - 棋盘渲染、特效与四方向信息
// ============================================================

// DOM 缓存
let dom = {};
// 粒子系统
let particles = [];
let particleCanvas, particleCtx;
let particleAnimId;

function cacheDom() {
  dom.board = document.getElementById('board-container');
  dom.svg = document.getElementById('board-svg');
  dom.centerZone = document.getElementById('center-zone');
  dom.pointsLayer = document.getElementById('points-layer');
  dom.piecesLayer = document.getElementById('pieces-layer');
  dom.trapsLayer = document.getElementById('traps-layer');
  dom.effectsLayer = document.getElementById('effects-layer');
  dom.arrowsLayer = document.getElementById('arrows-layer');
  dom.actionBar = document.getElementById('action-bar');
  dom.messageArea = document.getElementById('message-area');
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
  const count = 60;
  for (let i = 0; i < count; i++) {
    particles.push({
      x: Math.random() * particleCanvas.width,
      y: Math.random() * particleCanvas.height,
      r: Math.random() * 1.8 + 0.4,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3 - 0.15,
      alpha: Math.random() * 0.5 + 0.1,
      pulse: Math.random() * Math.PI * 2,
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
    p.pulse += 0.02;

    // 边界循环
    if (p.x < -10) p.x = particleCanvas.width + 10;
    if (p.x > particleCanvas.width + 10) p.x = -10;
    if (p.y < -10) p.y = particleCanvas.height + 10;
    if (p.y > particleCanvas.height + 10) p.y = -10;

    const flicker = p.alpha + Math.sin(p.pulse) * 0.15;
    particleCtx.beginPath();
    particleCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    particleCtx.fillStyle = `rgba(201,164,75,${Math.max(0.05, Math.min(0.7, flicker))})`;
    particleCtx.fill();

    // 偶尔绘制光晕
    if (Math.sin(p.pulse) > 0.7) {
      particleCtx.beginPath();
      particleCtx.arc(p.x, p.y, p.r * 2.5, 0, Math.PI * 2);
      particleCtx.fillStyle = `rgba(255,200,100,${Math.min(0.15, flicker * 0.3)})`;
      particleCtx.fill();
    }
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
// 四方向信息更新
// ============================================================

function updateEdgeInfo() {
  const cf = currentFaction();
  if (!cf) {
    clearEdgeInfo();
    return;
  }
  const fac = FACTIONS[cf];
  const selPiece = gameState.selectedPieceId !== null
    ? gameState.pieces.find(p => p.id === gameState.selectedPieceId)
    : null;

  // 构建操作指引文字
  let guideText = '';
  if (selPiece && gameState.phase === 'playing') {
    if (cf === 'mountain') {
      guideText = '走打一体 | 绿点:移动(1步) | 红点:攻击';
    } else if (cf === 'forest') {
      guideText = '移动/近战/布陷阱/引爆';
    } else if (cf === 'fire') {
      guideText = '移动/近战/火焰贯穿(直线)';
    } else if (cf === 'wind') {
      guideText = '移动/近战/风刃(日字AOE·伤及友军)';
    }
  } else {
    guideText = '点击己方棋子开始';
  }

  const emoji = fac.emoji;
  const text = `${fac.name} · ${guideText}`;

  // 四个方向都更新
  for (const edge of [dom.edgeTop, dom.edgeBottom, dom.edgeLeft, dom.edgeRight]) {
    if (!edge) continue;
    edge.style.color = fac.color;

    if (cf) {
      edge.classList.add('active-faction');
    } else {
      edge.classList.remove('active-faction');
    }
    const eEmoji = edge.querySelector('.edge-emoji');
    const eText = edge.querySelector('.edge-text');
    if (eEmoji) eEmoji.textContent = emoji;
    if (eText) eText.textContent = text;
  }
}

function clearEdgeInfo() {
  for (const edge of [dom.edgeTop, dom.edgeBottom, dom.edgeLeft, dom.edgeRight]) {
    if (!edge) continue;
    edge.classList.remove('active-faction');
    edge.style.color = '';
    const eEmoji = edge.querySelector('.edge-emoji');
    const eText = edge.querySelector('.edge-text');
    if (eEmoji) eEmoji.textContent = '';
    if (eText) eText.textContent = '';
  }
}

// ============================================================
// 棋盘渲染
// ============================================================

function renderBoard() {
  renderSVGLines();
  renderCenterZone();
  renderPoints();
  renderAllPieces();
  renderTraps();
}

function renderSVGLines() {
  const drawn = new Set();
  let lines = '';
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
      // 金色棋盘线
      lines += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="rgba(201,164,75,0.4)" stroke-width="1.8" stroke-linecap="round"/>`;
    }
  }
  dom.svg.innerHTML = lines;
}

function renderCenterZone() {
  const topLeft = pos(2.5, 1.5);
  const w = CELL * 3;
  const h = CELL * 3;
  dom.centerZone.style.cssText = `
    left:${topLeft.x}px; top:${topLeft.y}px;
    width:${w}px; height:${h}px;
  `;
}

function renderPoints() {
  let html = '';
  for (const p of POINTS) {
    const { x, y } = pos(p.col, p.row);
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
  for (const piece of gameState.pieces) {
    if (piece.hp <= 0) continue;
    const pt = pointById[piece.position];
    const { x, y } = pos(pt.col, pt.row);
    const fac = FACTIONS[piece.faction];
    const selClass = piece.id === gameState.selectedPieceId ? ' selected' : '';
    const curClass = (cf === piece.faction && gameState.phase === 'playing') ? ' current-faction' : '';
    const atkClass = (cf === 'mountain' && gameState._mountainAttacks?.includes(piece.position)) ? ' attackable' : '';
    // HP点数圆点
    let hpDots = '';
    for (let i = 0; i < piece.hp; i++) {
      hpDots += `<span class="piece-hp-dot"></span>`;
    }
    html += `<div class="piece ${piece.faction}${selClass}${curClass}${atkClass}" id="piece-${piece.id}"
      style="left:${x}px;top:${y}px"
      data-piece="${piece.id}">
      <div class="piece-figure">${fac.emoji}</div>
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

  flashPoint(toPointId, 'flash-fire');
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
  let html = '';
  gameState.turnOrder.forEach((f, i) => {
    const fac = FACTIONS[f];
    html += `<span class="order-item">${i+1}. ${fac.emoji}${fac.name}</span>`;
  });
  dom.orderDisplay.innerHTML = html;
  dom.startOverlay.style.display = 'flex';
  dom.victoryOverlay.style.display = 'none';
}

function showVictory(factionKey) {
  gameState.phase = 'victory';
  const fac = FACTIONS[factionKey];
  dom.victoryEmoji.textContent = fac.emoji;
  dom.victoryMessage.textContent = `${fac.emoji}${fac.name}阵营获胜！`;
  dom.victoryMessage.style.color = fac.color;
  dom.victoryOverlay.style.display = 'flex';
  clearEdgeInfo();
}
