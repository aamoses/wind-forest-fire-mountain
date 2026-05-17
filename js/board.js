// 风林火山·四方乱斗 - 棋盘渲染与特效
// ============================================================

// DOM引用缓存
let dom = {};

function cacheDom() {
  dom.board = document.getElementById('board-container');
  dom.svg = document.getElementById('board-svg');
  dom.centerZone = document.getElementById('center-zone');
  dom.pointsLayer = document.getElementById('points-layer');
  dom.piecesLayer = document.getElementById('pieces-layer');
  dom.trapsLayer = document.getElementById('traps-layer');
  dom.effectsLayer = document.getElementById('effects-layer');
  dom.arrowsLayer = document.getElementById('arrows-layer');
  dom.turnIndicator = document.getElementById('turn-indicator');
  dom.mountainCounter = document.getElementById('mountain-counter');
  dom.actionBar = document.getElementById('action-bar');
  dom.messageArea = document.getElementById('message-area');
  dom.startOverlay = document.getElementById('start-overlay');
  dom.victoryOverlay = document.getElementById('victory-overlay');
  dom.orderDisplay = document.getElementById('order-display');
  dom.victoryEmoji = document.getElementById('victory-emoji');
  dom.victoryMessage = document.getElementById('victory-message');
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
      lines += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="rgba(200,165,100,0.5)" stroke-width="2" stroke-linecap="round"/>`;
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
    document.getElementById(`pt-${p.id}`).addEventListener('click', (e) => {
      e.stopPropagation();
      onPointClick(p.id);
    });
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
    html += `<div class="piece ${piece.faction}${selClass}${curClass}${atkClass}" id="piece-${piece.id}"
      style="left:${x}px;top:${y}px;--piece-color:${fac.color}"
      data-piece="${piece.id}">
      ${fac.emoji}<span class="hp">${piece.hp}</span>
    </div>`;
  }
  dom.piecesLayer.innerHTML = html;

  for (const piece of gameState.pieces) {
    if (piece.hp <= 0) continue;
    document.getElementById(`piece-${piece.id}`).addEventListener('click', (e) => {
      e.stopPropagation();
      onPieceClick(piece.id);
    });
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
// 特效系统
// ============================================================

function clearHighlights() {
  for (const p of POINTS) {
    const el = document.getElementById(`pt-${p.id}`);
    if (el) {
      el.classList.remove('valid-move', 'valid-attack', 'trap-target');
    }
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
    border-radius:50%;
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
    background:rgba(231,76,60,0.8);
    transform-origin:left center;
    height:4px; border-radius:2px;
    left:${fromPos.x}px; top:${fromPos.y}px;
    width:${Math.hypot(toPos.x-fromPos.x, toPos.y-fromPos.y)}px;
    transform:rotate(${Math.atan2(toPos.y-fromPos.y, toPos.x-fromPos.x)}rad);
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
  const dist = 34;

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
