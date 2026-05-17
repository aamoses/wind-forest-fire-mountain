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
  // 三层粒子：尘埃 + 火星 + 光斑
  const count = 120;
  for (let i = 0; i < count; i++) {
    const tier = Math.random();
    let r, vx, vy, alpha;
    if (tier < 0.6) {
      // 微小尘埃
      r = Math.random() * 1.2 + 0.2;
      vx = (Math.random() - 0.5) * 0.2;
      vy = (Math.random() - 0.5) * 0.2 - 0.12;
      alpha = Math.random() * 0.25 + 0.05;
    } else if (tier < 0.88) {
      // 金色火星
      r = Math.random() * 2 + 0.8;
      vx = (Math.random() - 0.5) * 0.35;
      vy = (Math.random() - 0.5) * 0.35 - 0.2;
      alpha = Math.random() * 0.45 + 0.2;
    } else {
      // 大型光斑
      r = Math.random() * 3.5 + 1.5;
      vx = (Math.random() - 0.5) * 0.15;
      vy = (Math.random() - 0.5) * 0.15 - 0.08;
      alpha = Math.random() * 0.3 + 0.05;
    }
    particles.push({
      x: Math.random() * particleCanvas.width,
      y: Math.random() * particleCanvas.height,
      r, vx, vy, alpha,
      pulse: Math.random() * Math.PI * 2,
      pulseSpeed: Math.random() * 0.03 + 0.01,
      tier: tier < 0.6 ? 'dust' : (tier < 0.88 ? 'ember' : 'glow'),
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

    // 边界循环
    if (p.x < -20) p.x = particleCanvas.width + 20;
    if (p.x > particleCanvas.width + 20) p.x = -20;
    if (p.y < -20) p.y = particleCanvas.height + 20;
    if (p.y > particleCanvas.height + 20) p.y = -20;

    const flicker = p.alpha + Math.sin(p.pulse) * (p.alpha * 0.6);

    if (p.tier === 'glow') {
      // 大型光斑 — 内外两层
      const grad = particleCtx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 3);
      grad.addColorStop(0, `rgba(240,210,96,${Math.min(0.25, flicker * 1.2)})`);
      grad.addColorStop(0.3, `rgba(212,175,55,${Math.min(0.12, flicker * 0.6)})`);
      grad.addColorStop(1, 'rgba(212,175,55,0)');
      particleCtx.beginPath();
      particleCtx.arc(p.x, p.y, p.r * 3, 0, Math.PI * 2);
      particleCtx.fillStyle = grad;
      particleCtx.fill();
    }

    if (p.tier === 'ember') {
      // 火星 — 光晕+核心
      const grad = particleCtx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 2.5);
      grad.addColorStop(0, `rgba(255,220,100,${Math.min(0.55, flicker)})`);
      grad.addColorStop(0.5, `rgba(212,175,55,${Math.min(0.25, flicker * 0.5)})`);
      grad.addColorStop(1, 'rgba(180,140,40,0)');
      particleCtx.beginPath();
      particleCtx.arc(p.x, p.y, p.r * 2.5, 0, Math.PI * 2);
      particleCtx.fillStyle = grad;
      particleCtx.fill();
    }

    // 核心点（所有粒子）
    particleCtx.beginPath();
    particleCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    particleCtx.fillStyle = `rgba(240,210,96,${Math.max(0.03, Math.min(0.6, flicker))})`;
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
      if (cf === 'mountain')     guideText = '走打一体 | 绿:移动 | 红:攻击';
      else if (cf === 'forest')  guideText = '移动 | 近战2 | 布陷阱 | 引爆';
      else if (cf === 'fire')    guideText = '移动 | 近战2 | 火焰贯穿2(直线)';
      else if (cf === 'wind')    guideText = '移动 | 近战2 | 风刃2(日字AOE)';
    } else if (side === cs) {
      guideText = '点击棋子开始';
    } else {
      guideText = isHuman ? '等待中...' : '🤖 AI思考中';
    }

    const tag = isHuman ? '👤' : '🤖';
    const text = `${tag}${fac.emoji}${fac.name} · ${guideText}${(side === cs && deployNote) ? deployNote : ''}`;

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
  const board = dom.board;
  if (!board) return;

  // clip-path梯形：宽边=对应边，窄边=对边
  const t = 8; // 缩进百分比
  const clips = {
    top:    `polygon(${t}% 0%, ${100-t}% 0%, 100% 100%, 0% 100%)`,
    right:  `polygon(0% 0%, 100% ${t}%, 100% ${100-t}%, 0% 100%)`,
    bottom: `polygon(0% 0%, 100% 0%, ${100-t}% 100%, ${t}% 100%)`,
    left:   `polygon(0% ${t}%, 100% 0%, 100% 100%, 0% ${100-t}%)`,
  };

  board.style.transition = 'clip-path 0.5s ease';
  board.style.clipPath = clips[cs];
}

function resetTrapezoid() {
  if (dom.board) {
    dom.board.style.clipPath = '';
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
  clearHighlights();
}

function renderSVGLines() {
  const drawn = new Set();
  let lines = '';
  // 发光层
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
      glowLines += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="rgba(212,175,55,0.12)" stroke-width="4" stroke-linecap="round"/>`;
      lines += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="rgba(212,175,55,0.35)" stroke-width="1.5" stroke-linecap="round"/>`;
    }
  }
  dom.svg.innerHTML = glowLines + lines;
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
    // 先跳到旧位置
    el.style.left = anim.fromX + 'px';
    el.style.top = anim.fromY + 'px';
    // 强制回流后跳到新位置（触发CSS过渡）
    el.offsetHeight;
    el.style.left = anim.toX + 'px';
    el.style.top = anim.toY + 'px';
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
    html += `<span class="order-item">${sideNames[side]}·${fac.emoji}${fac.name} ${isHuman ? '👤' : '🤖'}</span>`;
  }
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
