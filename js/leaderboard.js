// 风林火山·四方乱斗 - 本地战绩记录
// ============================================================

const STORAGE_KEY = 'ffsm_leaderboard';

function Leaderboard() {
  return {
    getRecords() {
      try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
      } catch (e) {
        return [];
      }
    },

    addRecord(record) {
      const records = this.getRecords();
      records.unshift(record);
      // 最多保留50条
      if (records.length > 50) records.length = 50;
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
      } catch (e) {
        // storage full, ignore
      }
    },

    getStats() {
      const records = this.getRecords();
      const stats = {};
      for (const r of records) {
        const key = r.faction;
        if (!stats[key]) stats[key] = { wins: 0, total: 0, name: r.factionName || key };
        stats[key].total++;
        if (r.won) stats[key].wins++;
      }
      return stats;
    },

    formatTime(seconds) {
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      return `${m}分${s}秒`;
    },
  };
}

const leaderboard = Leaderboard();

function recordGameResult(won, playerFaction) {
  if (!gameState.startTime) return;
  const duration = Math.floor((Date.now() - gameState.startTime) / 1000);
  const fac = FACTIONS[playerFaction];
  leaderboard.addRecord({
    date: new Date().toISOString().slice(0, 19).replace('T', ' '),
    mode: gameState.mode || 'quad',
    faction: playerFaction,
    factionName: fac ? fac.emoji + fac.name : playerFaction,
    won: won,
    duration: duration,
  });
}

function showLeaderboard() {
  const overlay = document.getElementById('leaderboard-overlay');
  const list = document.getElementById('leaderboard-list');
  if (!overlay || !list) return;

  const records = leaderboard.getRecords();
  const stats = leaderboard.getStats();

  let html = '<div class="lb-section"><h3>阵营统计</h3>';
  const facOrder = ['fire', 'forest', 'wind', 'mountain'];
  for (const f of facOrder) {
    const s = stats[f];
    const fac = FACTIONS[f];
    if (s) {
      const rate = Math.round((s.wins / s.total) * 100);
      html += `<div class="lb-stat">${fac.emoji} ${fac.name}: ${s.wins}胜/${s.total}场 (${rate}%)</div>`;
    } else {
      html += `<div class="lb-stat">${fac.emoji} ${fac.name}: 暂无记录</div>`;
    }
  }
  html += '</div>';

  html += '<div class="lb-section"><h3>最近对局</h3>';
  if (records.length === 0) {
    html += '<div class="lb-stat">暂无战绩记录</div>';
  } else {
    for (const r of records.slice(0, 10)) {
      const icon = r.won ? '🏆' : '💀';
      html += `<div class="lb-row">${icon} ${r.date} | ${r.factionName} | ${r.mode} | ${leaderboard.formatTime(r.duration)}</div>`;
    }
  }
  html += '</div>';

  list.innerHTML = html;
  overlay.style.display = 'flex';
}

function hideLeaderboard() {
  const overlay = document.getElementById('leaderboard-overlay');
  if (overlay) overlay.style.display = 'none';
}
