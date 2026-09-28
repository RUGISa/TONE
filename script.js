const STORAGE_KEY = "moodDiaryEntries";
const navButtons = document.querySelectorAll(".nav-btn");
const views = document.querySelectorAll(".view");
const goButtons = document.querySelectorAll("[data-go]");

const today = new Date();
let calendarDate = new Date(today.getFullYear(), today.getMonth(), 1);
let currentVideoId = null;

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function koreanDate(date) {
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
}

function getEntries() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
}

function saveEntries(entries) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function showView(name) {
  views.forEach(view => view.classList.remove("active"));
  navButtons.forEach(btn => btn.classList.remove("active"));

  document.getElementById(`${name}View`).classList.add("active");
  document.querySelector(`[data-view="${name}"]`)?.classList.add("active");

  if (name === "home") renderHome();
  if (name === "calendar") renderCalendar();
  if (name === "playlist") renderPlaylist();
}

navButtons.forEach(btn => {
  btn.addEventListener("click", () => showView(btn.dataset.view));
});

goButtons.forEach(btn => {
  btn.addEventListener("click", () => showView(btn.dataset.go));
});

function extractYouTubeId(url) {
  if (!url) return null;
  const patterns = [
    /youtu\.be\/([^?&]+)/,
    /youtube\.com\/watch\?v=([^?&]+)/,
    /youtube\.com\/embed\/([^?&]+)/,
    /youtube\.com\/shorts\/([^?&]+)/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function setPlayer(entry, dateKey) {
  const playerTrack = document.getElementById("playerTrack");
  const playerDate = document.getElementById("playerDate");
  const playBtn = document.getElementById("playBtn");
  const stopBtn = document.getElementById("stopBtn");
  const label = document.getElementById("recordLabel");

  currentVideoId = entry ? extractYouTubeId(entry.youtube) : null;
  playerTrack.textContent = entry?.title || "저장된 음악이 없습니다.";
  playerDate.textContent = entry ? `${dateKey} · ${entry.mood}` : "일기를 먼저 작성해보세요.";
  label.textContent = entry?.mood || "MOOD";

  playBtn.disabled = !currentVideoId;
  stopBtn.disabled = !currentVideoId;

  stopPlayer();
}

function playPlayer() {
  if (!currentVideoId) return;
  const wrap = document.getElementById("youtubePlayer");
  wrap.innerHTML = `<iframe width="1" height="1" src="https://www.youtube.com/embed/${currentVideoId}?autoplay=1" title="YouTube player" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
  document.getElementById("record").classList.add("playing");
  document.getElementById("tonearm").classList.add("playing");
  document.getElementById("playerStatus").textContent = "PLAYING";
}

function stopPlayer() {
  document.getElementById("youtubePlayer").innerHTML = "";
  document.getElementById("record").classList.remove("playing");
  document.getElementById("tonearm").classList.remove("playing");
  document.getElementById("playerStatus").textContent = "STOPPED";
}

document.getElementById("playBtn").addEventListener("click", playPlayer);
document.getElementById("stopBtn").addEventListener("click", stopPlayer);

function renderHome() {
  const entries = getEntries();
  const keys = Object.keys(entries).sort().reverse();
  const latestKey = keys[0];
  const latest = latestKey ? entries[latestKey] : null;

  document.getElementById("recentDate").textContent = latestKey || "아직 기록이 없습니다.";
  document.getElementById("recentMood").textContent = latest ? latest.mood : "";
  document.getElementById("recentTitle").textContent = latest?.title || "첫 번째 일기를 남겨보세요.";
  document.getElementById("recentContent").textContent = latest?.content || "오늘의 감정과 함께 듣고 싶은 노래를 기록할 수 있어요.";

  setPlayer(latest, latestKey);
}

const form = document.getElementById("diaryForm");
form.addEventListener("submit", event => {
  event.preventDefault();

  const dateKey = formatDate(today);
  const title = document.getElementById("titleInput").value.trim();
  const content = document.getElementById("contentInput").value.trim();
  const youtube = document.getElementById("youtubeInput").value.trim();
  const mood = document.querySelector('input[name="mood"]:checked').value;

  if (!title || !content) return;

  const entries = getEntries();
  entries[dateKey] = { title, mood, content, youtube };
  saveEntries(entries);

  alert("오늘의 기록을 저장했습니다.");
  renderHome();
  renderCalendar();
  renderPlaylist();
  showView("home");
});

function loadTodayEntry() {
  const entry = getEntries()[formatDate(today)];
  if (!entry) {
    alert("오늘 저장된 기록이 없습니다.");
    return;
  }

  document.getElementById("titleInput").value = entry.title;
  document.getElementById("contentInput").value = entry.content;
  document.getElementById("youtubeInput").value = entry.youtube || "";
  const moodRadio = document.querySelector(`input[name="mood"][value="${entry.mood}"]`);
  if (moodRadio) moodRadio.checked = true;
}

document.getElementById("loadTodayBtn").addEventListener("click", loadTodayEntry);

function renderCalendar() {
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  const entries = getEntries();

  document.getElementById("calendarTitle").textContent = `${year}. ${String(month + 1).padStart(2, "0")}`;

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();
  const grid = document.getElementById("calendarGrid");
  grid.innerHTML = "";

  for (let i = 0; i < 42; i++) {
    let dayNumber;
    let cellDate;
    let muted = false;

    if (i < firstDay) {
      dayNumber = prevMonthDays - firstDay + i + 1;
      cellDate = new Date(year, month - 1, dayNumber);
      muted = true;
    } else if (i >= firstDay + daysInMonth) {
      dayNumber = i - (firstDay + daysInMonth) + 1;
      cellDate = new Date(year, month + 1, dayNumber);
      muted = true;
    } else {
      dayNumber = i - firstDay + 1;
      cellDate = new Date(year, month, dayNumber);
    }

    const key = formatDate(cellDate);
    const button = document.createElement("button");
    button.className = "day";
    if (muted) button.classList.add("muted");
    if (entries[key]) button.classList.add("has-entry");
    if (key === formatDate(today)) button.classList.add("today");
    button.textContent = dayNumber;
    button.addEventListener("click", () => renderPreview(key));
    grid.appendChild(button);
  }
}

function renderPreview(dateKey) {
  const entry = getEntries()[dateKey];
  const preview = document.getElementById("calendarPreview");

  if (!entry) {
    preview.innerHTML = `
      <span class="eyebrow">${dateKey}</span>
      <h3>기록이 없는 날입니다.</h3>
      <p>이 날짜에는 아직 저장된 일기가 없습니다.</p>
    `;
    return;
  }

  const videoId = extractYouTubeId(entry.youtube);
  preview.innerHTML = `
    <span class="eyebrow">${dateKey}</span>
    <h3>${escapeHtml(entry.title)}</h3>
    <span class="preview-mood">오늘의 기분 · ${escapeHtml(entry.mood)}</span>
    <p>${escapeHtml(entry.content)}</p>
    <div class="preview-music">
      <strong>오늘의 음악</strong><br>
      ${videoId ? `<a href="https://www.youtube.com/watch?v=${videoId}" target="_blank" rel="noreferrer">YouTube에서 듣기 ↗</a>` : "등록된 음악이 없습니다."}
    </div>
  `;
}

function renderPlaylist() {
  const entries = getEntries();
  const items = Object.entries(entries)
    .filter(([, entry]) => extractYouTubeId(entry.youtube))
    .sort(([a], [b]) => b.localeCompare(a));

  const list = document.getElementById("playlistList");

  if (!items.length) {
    list.innerHTML = `<div class="empty-state">아직 저장된 음악이 없습니다. 일기를 쓸 때 유튜브 링크를 함께 등록해보세요.</div>`;
    return;
  }

  list.innerHTML = items.map(([date, entry], index) => {
    const videoId = extractYouTubeId(entry.youtube);
    return `
      <article class="playlist-item">
        <div class="playlist-index">${String(index + 1).padStart(2, "0")}</div>
        <div class="playlist-main">
          <strong>${escapeHtml(entry.title)}</strong>
          <span>${escapeHtml(entry.mood)} · <a href="https://www.youtube.com/watch?v=${videoId}" target="_blank" rel="noreferrer">YouTube에서 듣기</a></span>
        </div>
        <div class="playlist-date">${date}</div>
      </article>
    `;
  }).join("");
}

function escapeHtml(value = "") {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

document.getElementById("prevMonth").addEventListener("click", () => {
  calendarDate = new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1);
  renderCalendar();
});

document.getElementById("nextMonth").addEventListener("click", () => {
  calendarDate = new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1);
  renderCalendar();
});

const weekdayNames = ["일", "월", "화", "수", "목", "금", "토"];
document.getElementById("todayLabel").textContent = `${koreanDate(today)} ${weekdayNames[today.getDay()]}요일`;
document.getElementById("todayTitle").textContent = `${today.getMonth() + 1}월 ${today.getDate()}일의 기록`;
document.getElementById("writeDateLabel").textContent = koreanDate(today);

renderHome();
renderCalendar();
renderPlaylist();
