// popup.js
let timer = null;

/* ---------- small storage helpers ---------- */
function getLocal(keys) {
  return new Promise((resolve) => chrome.storage.local.get(keys, resolve));
}
function getSync(keys) {
  return new Promise((resolve) => chrome.storage.sync.get(keys, resolve));
}

/* ---------- init on open ---------- */
document.addEventListener('DOMContentLoaded', async () => {
  // Hook buttons safely (guard for missing elements)
  const startBtn = document.getElementById('startBtn');
  const pauseBtn = document.getElementById('pauseBtn');
  const resetBtn = document.getElementById('resetBtn');
  const dashboardBtn = document.getElementById('dashboardBtn');
  const optionsBtn = document.getElementById('optionsBtn');

  if (startBtn) startBtn.addEventListener('click', startTimer);
  if (pauseBtn) pauseBtn.addEventListener('click', pauseTimer);
  if (resetBtn) resetBtn.addEventListener('click', resetTimer);
  if (dashboardBtn) dashboardBtn.addEventListener('click', openDashboard);
  if (optionsBtn) optionsBtn.addEventListener('click', openOptions);

  // initial render
  await updateDisplay();
  await loadTodayStats();

  // Start interval to update UI every second. Clear any previous timer first.
  if (timer) clearInterval(timer);
  timer = setInterval(async () => {
    await updateDisplay();
  }, 1000);

  // If popup visibility changes, refresh immediately when shown
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      updateDisplay();
      loadTodayStats();
    }
  });
});

/* ---------- update UI ---------- */
async function updateDisplay() {
  const state = await getLocal(['timerState', 'timeRemaining', 'sessionType', 'endTimestamp']);

  // if running and endTimestamp exists, compute remaining from that (more accurate for MV3)
  let remaining = typeof state.timeRemaining === 'number' ? state.timeRemaining : 25 * 60;
  if (state.timerState === 'running' && state.endTimestamp) {
    remaining = Math.max(0, Math.round((state.endTimestamp - Date.now()) / 1000));
  }

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;

  const timerDisplayEl = document.getElementById('timerDisplay');
  if (timerDisplayEl) {
    timerDisplayEl.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  const sessionTypeEl = document.getElementById('sessionType');
  if (sessionTypeEl) {
    sessionTypeEl.textContent = state.sessionType === 'break' ? 'Break Time' : 'Focus Session';
  }

  const isRunning = state.timerState === 'running';
  const startBtn = document.getElementById('startBtn');
  const pauseBtn = document.getElementById('pauseBtn');
  if (startBtn) startBtn.style.display = isRunning ? 'none' : 'inline-block';
  if (pauseBtn) pauseBtn.style.display = isRunning ? 'inline-block' : 'none';

  // Update blocking status (use sync storage setting)
  const settings = await getSync(['blockDuringFocus']);
  const blockingActive = isRunning && state.sessionType !== 'break' && settings.blockDuringFocus !== false;
  const blockingStatusEl = document.getElementById('blockingStatus');
  if (blockingStatusEl) blockingStatusEl.style.display = blockingActive ? 'flex' : 'none';
}

/* ---------- load today's stats ---------- */
async function loadTodayStats() {
  const today = new Date().toDateString();
  const stats = await getLocal(['dailyStats']);
  const todayData = stats.dailyStats?.[today] || { minutes: 0, sessions: 0 };

  const todayMinutesEl = document.getElementById('todayMinutes');
  const todaySessionsEl = document.getElementById('todaySessions');

  if (todayMinutesEl) todayMinutesEl.textContent = `${todayData.minutes}m`;
  if (todaySessionsEl) todaySessionsEl.textContent = todayData.sessions;
}

/* ---------- control actions (send to service worker) ---------- */
async function startTimer() {
  await chrome.runtime.sendMessage({ action: 'startTimer' });
  await updateDisplay();
}

async function pauseTimer() {
  await chrome.runtime.sendMessage({ action: 'pauseTimer' });
  await updateDisplay();
}

async function resetTimer() {
  await chrome.runtime.sendMessage({ action: 'resetTimer' });
  await updateDisplay();
}

/* ---------- navigation ---------- */
function openDashboard() {
  chrome.tabs.create({ url: 'dashboard.html' });
}

function openOptions() {
  chrome.runtime.openOptionsPage();
}

/* ---------- cleanup on close ---------- */
window.addEventListener('unload', () => {
  if (timer) clearInterval(timer);
});
