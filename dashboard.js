// dashboard.js
document.addEventListener("DOMContentLoaded", async () => {
  await loadDashboard();

  const clearBtn = document.getElementById("clearDataBtn");
  const exportBtn = document.getElementById("exportBtn");

  if (clearBtn) clearBtn.addEventListener("click", clearData);
  if (exportBtn) exportBtn.addEventListener("click", exportData);

  // Optional: re-render every time the popup becomes visible (useful for MV3 popups)
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") loadDashboard();
  });
});

/* ---------- storage helpers ---------- */
function getLocal(keys) {
  return new Promise((resolve) => chrome.storage.local.get(keys, resolve));
}
function setLocal(obj) {
  return new Promise((resolve) => chrome.storage.local.set(obj, resolve));
}
function removeLocal(keys) {
  return new Promise((resolve) => chrome.storage.local.remove(keys, resolve));
}

/* ---------- main loader ---------- */
async function loadDashboard() {
  const stats = await getLocal(["dailyStats"]);
  const dailyStats = stats.dailyStats || {};

  // Today's stats
  const today = new Date().toDateString();
  const todayData = dailyStats[today] || { minutes: 0, sessions: 0 };

  const elTodayMinutes = document.getElementById("todayMinutes");
  const elTodaySessions = document.getElementById("todaySessions");
  if (elTodayMinutes) elTodayMinutes.textContent = todayData.minutes;
  if (elTodaySessions) elTodaySessions.textContent = todayData.sessions;

  // Week minutes
  const weekMinutes = calculateWeekMinutes(dailyStats);
  const elWeekMinutes = document.getElementById("weekMinutes");
  if (elWeekMinutes) elWeekMinutes.textContent = weekMinutes;

  // Streak
  const streak = calculateStreak(dailyStats);
  const elStreak = document.getElementById("streak");
  if (elStreak) elStreak.textContent = streak;

  // Chart & session history
  renderChart(dailyStats);
  renderSessionHistory(dailyStats);
}

/* ---------- stats calculators ---------- */
function calculateWeekMinutes(dailyStats) {
  let total = 0;
  const now = new Date();

  for (let i = 0; i < 7; i++) {
    const date = new Date(now);
    date.setDate(now.getDate() - i); // use now to avoid DST issues
    const dateStr = date.toDateString();

    if (dailyStats[dateStr]) total += dailyStats[dateStr].minutes || 0;
  }

  return total;
}

function calculateStreak(dailyStats) {
  let streak = 0;
  const now = new Date();

  for (let i = 0; i < 365; i++) {
    const date = new Date(now);
    date.setDate(now.getDate() - i);
    const dateStr = date.toDateString();

    if (dailyStats[dateStr] && (dailyStats[dateStr].sessions || 0) > 0) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

/* ---------- chart renderer (canvas) ---------- */
function renderChart(dailyStats) {
  const canvas = document.getElementById("weekChart");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Make canvas crisp on high-DPI screens
  const style = getComputedStyle(canvas);
  const cssWidth = parseInt(style.width, 10) || canvas.clientWidth || 300;
  const cssHeight = parseInt(style.height, 10) || canvas.clientHeight || 150;
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.floor(cssWidth * ratio));
  canvas.height = Math.max(1, Math.floor(cssHeight * ratio));
  canvas.style.width = `${cssWidth}px`;
  canvas.style.height = `${cssHeight}px`;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0); // scale drawing to CSS pixels

  // Last 7 days
  const labels = [];
  const data = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(now.getDate() - i);
    const dateStr = date.toDateString();
    labels.push(date.toLocaleDateString(undefined, { weekday: "short" }));
    data.push(dailyStats[dateStr]?.minutes || 0);
  }

  // layout
  const padding = 20;
  const chartWidth = cssWidth - padding * 2;
  const chartHeight = cssHeight - padding * 2 - 20; // room for labels
  const maxValue = Math.max(...data, 1);
  const barCount = data.length;
  const gap = Math.max(6, chartWidth * 0.03);
  const totalGap = gap * (barCount - 1);
  const barWidth = (chartWidth - totalGap) / barCount;

  // background clear
  ctx.clearRect(0, 0, cssWidth, cssHeight);

  // draw bars
  const barBaseY = padding + chartHeight;
  for (let i = 0; i < barCount; i++) {
    const value = data[i];
    const normalized = value / maxValue;
    const barHeight = normalized * chartHeight;
    const x = padding + i * (barWidth + gap);
    const y = barBaseY - barHeight;

    // bar
    ctx.fillStyle = "#6366f1"; // purple bar (kept explicit for styling)
    ctx.fillRect(x, y, barWidth, barHeight);

    // value label (above bar)
    if (value > 0) {
      ctx.fillStyle = "#0f172a";
      ctx.font = "12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`${value}m`, x + barWidth / 2, y - 6);
    }

    // x-axis label
    ctx.fillStyle = "#64748b";
    ctx.font = "12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(labels[i], x + barWidth / 2, barBaseY + 14);
  }
}

/* ---------- session history ---------- */
function renderSessionHistory(dailyStats) {
  const container = document.getElementById("sessionHistory");
  if (!container) return;

  container.innerHTML = "";

  const dates = Object.keys(dailyStats)
    .sort((a, b) => new Date(b) - new Date(a))
    .slice(0, 10);

  if (dates.length === 0) {
    container.innerHTML =
      '<p class="empty-state">No sessions recorded yet. Start a focus session to begin tracking!</p>';
    return;
  }

  dates.forEach((dateStr) => {
    const data = dailyStats[dateStr] || { minutes: 0, sessions: 0 };
    const date = new Date(dateStr);

    const sessionItem = document.createElement("div");
    sessionItem.className = "session-item";
    sessionItem.innerHTML = `
      <div class="session-date">
        <strong>${date.toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric",
        })}</strong>
        <span>${date.toLocaleDateString(undefined, { weekday: "long" })}</span>
      </div>
      <div class="session-stats">
        <span class="session-time">${data.minutes} minutes</span>
        <span class="session-count">${data.sessions} ${
      data.sessions === 1 ? "session" : "sessions"
    }</span>
      </div>
    `;

    container.appendChild(sessionItem);
  });
}

/* ---------- clear / export ---------- */
async function clearData() {
  if (
    !confirm(
      "Are you sure you want to clear all your focus data? This cannot be undone."
    )
  )
    return;
  await removeLocal(["dailyStats"]);
  await loadDashboard();
}

async function exportData() {
  const stats = await getLocal(["dailyStats"]);
  const data = stats.dailyStats || {};
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });

  const filename = `focus-master-data-${
    new Date().toISOString().split("T")[0]
  }.json`; // template literal
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a); // required for Firefox
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
}
