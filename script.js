const STORAGE_KEY = "moodDiaryEntries";
const today = new Date();
const todayKey = formatDate(today);
let currentVideoId = null;

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function dateLabel(date) {
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  return `${date.getFullYear()}. ${String(date.getMonth() + 1).padStart(2, "0")}. ${String(date.getDate()).padStart(2, "0")} ${days[date.getDay()]}`;
}

function getEntries() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
}

function saveEntries(entries) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

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

function escapeHtml(value = "") {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function openPage(name) {
  document.querySelectorAll(".page").forEach(page => page.classList.remove("active"));
  document.querySelectorAll(".nav-link").forEach(button => button.classList.remove("active"));

  document.getElementById(`${name}Page`).classList.add("active");
  document.querySelector(`[data-page="${name}"]`)?.classList.add("active");

  if (name === "archive") renderArchive();
  if (name === "playlist") renderPlaylist();
}

document.querySelectorAll("[data-page]").forEach(button => {
  button.addEventListener("click", event => {
    event.preventDefault();
    openPage(button.dataset.page);
  });
});

function loadToday() {
  const entry = getEntries()[todayKey];
  if (!entry) return;

  document.getElementById("titleInput").value = entry.title || "";
  document.getElementById("contentInput").value = entry.content || "";
  document.getElementById("moodInput").value = entry.mood || "평온";
  document.getElementById("youtubeInput").value = entry.youtube || "";
  setPlayer(entry, todayKey);
}

function setPlayer(entry, dateKey) {
  currentVideoId = entry ? extractYouTubeId(entry.youtube) : null;
  document.getElementById("trackTitle").textContent = entry?.title || "등록된 음악 없음";
  document.getElementById("trackDate").textContent = entry ? `${dateKey} · ${entry.mood}` : "";
  document.getElementById("playBtn").disabled = !currentVideoId;
  document.getElementById("stopBtn").disabled = !currentVideoId;
  stopPlayer();
}

function playPlayer() {
  if (!currentVideoId) return;
  document.getElementById("youtubePlayer").innerHTML = `
    <iframe
      width="1"
      height="1"
      src="https://www.youtube.com/embed/${currentVideoId}?autoplay=1"
      title="YouTube player"
      allow="autoplay; encrypted-media">
    </iframe>`;
  document.getElementById("record").classList.add("playing");
  document.getElementById("arm").classList.add("playing");
}

function stopPlayer() {
  document.getElementById("youtubePlayer").innerHTML = "";
  document.getElementById("record").classList.remove("playing");
  document.getElementById("arm").classList.remove("playing");
}

document.getElementById("playBtn").addEventListener("click", playPlayer);
document.getElementById("stopBtn").addEventListener("click", stopPlayer);

document.getElementById("saveBtn").addEventListener("click", () => {
  const title = document.getElementById("titleInput").value.trim();
  const content = document.getElementById("contentInput").value.trim();
  const mood = document.getElementById("moodInput").value;
  const youtube = document.getElementById("youtubeInput").value.trim();

  if (!title || !content) {
    alert("제목과 일기를 작성해주세요.");
    return;
  }

  const entries = getEntries();
  entries[todayKey] = { title, content, mood, youtube };
  saveEntries(entries);
  setPlayer(entries[todayKey], todayKey);

  const button = document.getElementById("saveBtn");
  const original = button.textContent;
  button.textContent = "저장됨";
  setTimeout(() => button.textContent = original, 900);
});

function renderArchive() {
  const entries = getEntries();
  const items = Object.entries(entries).sort(([a], [b]) => b.localeCompare(a));
  const list = document.getElementById("archiveList");

  if (!items.length) {
    list.innerHTML = `<div class="empty-line">아직 기록이 없습니다.</div>`;
    document.getElementById("archiveDetail").textContent = "";
    return;
  }

  list.innerHTML = items.map(([date, entry]) => `
    <button class="archive-row" data-date="${date}">
      <span>${date}</span>
      <strong>${escapeHtml(entry.title)}</strong>
      <span>${escapeHtml(entry.mood)}</span>
    </button>
  `).join("");

  list.querySelectorAll(".archive-row").forEach(row => {
    row.addEventListener("click", () => showArchiveDetail(row.dataset.date));
  });
}

function showArchiveDetail(date) {
  const entry = getEntries()[date];
  if (!entry) return;
  const videoId = extractYouTubeId(entry.youtube);
  const detail = document.getElementById("archiveDetail");
  detail.classList.remove("empty");
  detail.innerHTML = `
    <span>${date} · ${escapeHtml(entry.mood)}</span>
    <h3>${escapeHtml(entry.title)}</h3>
    <p>${escapeHtml(entry.content)}</p>
    ${videoId ? `<p><a href="https://www.youtube.com/watch?v=${videoId}" target="_blank" rel="noreferrer">음악 듣기</a></p>` : ""}
  `;
}

function renderPlaylist() {
  const entries = getEntries();
  const items = Object.entries(entries)
    .filter(([, entry]) => extractYouTubeId(entry.youtube))
    .sort(([a], [b]) => b.localeCompare(a));
  const list = document.getElementById("playlistList");

  if (!items.length) {
    list.innerHTML = `<div class="empty-line">아직 등록된 음악이 없습니다.</div>`;
    return;
  }

  list.innerHTML = items.map(([date, entry], index) => {
    const videoId = extractYouTubeId(entry.youtube);
    return `
      <div class="playlist-row">
        <span>${String(index + 1).padStart(2, "0")}</span>
        <strong><a href="https://www.youtube.com/watch?v=${videoId}" target="_blank" rel="noreferrer">${escapeHtml(entry.title)}</a></strong>
        <span>${date}</span>
      </div>
    `;
  }).join("");
}

document.getElementById("todayDate").textContent = dateLabel(today);
setPlayer(null, "");
loadToday();
renderArchive();
renderPlaylist();
