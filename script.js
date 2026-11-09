const $ = (id) => document.getElementById(id);
const STORAGE_KEY = "moodDiaryEntries";
const WEEKDAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

const ui = {
  calendarView: $("calendarView"), diaryView: $("diaryView"), calendarGrid: $("calendarGrid"),
  monthTitle: $("monthTitle"), prevMonth: $("prevMonth"), nextMonth: $("nextMonth"), todayBtn: $("todayBtn"),
  backBtn: $("backBtn"), dateTitle: $("dateTitle"), weekdayTitle: $("weekdayTitle"), mood: $("moodInput"),
  title: $("titleInput"), content: $("contentInput"), youtube: $("youtubeInput"), saveBtn: $("saveBtn"),
  deleteBtn: $("deleteBtn"), playBtn: $("playBtn"), stopBtn: $("stopBtn"), record: $("record"),
  recordPhoto: $("recordPhoto"), arm: $("arm"), savedMark: $("savedMark"), playerState: $("playerState")
};

let entries = loadEntries();
let selectedDate = "";
let videoId = "";
let player = null;
let playerReady = false;
let wantsPlayback = false;
let armTimer = 0;
let artworkToken = 0;

const today = new Date();
let year = today.getFullYear();
let month = today.getMonth();

function pad(n) { return String(n).padStart(2, "0"); }
function dateKey(y, m, d) { return `${y}-${pad(m + 1)}-${pad(d)}`; }
function todayKey() { return dateKey(today.getFullYear(), today.getMonth(), today.getDate()); }

function loadEntries() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); }
  catch { return {}; }
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function escapeHtml(value = "") {
  return value.replace(/[&<>'"]/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  }[char]));
}

function youtubeId(value) {
  try {
    const url = new URL(value.trim());
    const host = url.hostname.replace(/^www\./, "");
    if (host === "youtu.be") return url.pathname.split("/")[1] || "";
    if (!host.endsWith("youtube.com")) return "";
    if (url.pathname === "/watch") return url.searchParams.get("v") || "";
    const [type, id] = url.pathname.split("/").filter(Boolean);
    return ["embed", "shorts", "live"].includes(type) ? (id || "") : "";
  } catch { return ""; }
}

function renderCalendar() {
  const first = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const weeks = Math.ceil((first + days) / 7);
  const cells = [];

  ui.monthTitle.textContent = `${year}. ${pad(month + 1)}`;
  ui.calendarGrid.style.setProperty("--weeks", weeks);

  for (let i = 0; i < first; i++) cells.push('<div class="calendar-blank"></div>');

  for (let day = 1; day <= days; day++) {
    const key = dateKey(year, month, day);
    const entry = entries[key];
    const preview = entry ? `
      <div class="entry-preview">
        <strong>${escapeHtml(entry.title || "기록")}</strong>
        <span>${escapeHtml(entry.mood || "")}</span>
      </div>${entry.youtube ? '<span class="song-dot"></span>' : ""}` : "";

    cells.push(`
      <button class="calendar-day${key === todayKey() ? " today" : ""}" type="button" data-date="${key}">
        <span class="day-number">${day}</span>${preview}
      </button>`);
  }

  while (cells.length < weeks * 7) cells.push('<div class="calendar-blank"></div>');
  ui.calendarGrid.innerHTML = cells.join("");
}

function openDiary(key) {
  selectedDate = key;
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  ui.dateTitle.textContent = `${y}. ${pad(m)}. ${pad(d)}`;
  ui.weekdayTitle.textContent = WEEKDAYS[date.getDay()];

  stopMusic(true);
  const entry = entries[key] || {};
  ui.mood.value = entry.mood || "평온";
  ui.title.value = entry.title || "";
  ui.content.value = entry.content || "";
  ui.youtube.value = entry.youtube || "";
  ui.savedMark.textContent = entries[key] ? "saved" : "";
  updateTrack();

  ui.calendarView.hidden = true;
  ui.diaryView.hidden = false;
}

function showCalendar() {
  stopMusic(true);
  ui.diaryView.hidden = true;
  ui.calendarView.hidden = false;
  renderCalendar();
}

function saveEntry() {
  const entry = {
    mood: ui.mood.value,
    title: ui.title.value.trim(),
    content: ui.content.value.trim(),
    youtube: ui.youtube.value.trim()
  };

  if (!entry.title && !entry.content && !entry.youtube) return;
  entries[selectedDate] = entry;
  persist();
  ui.savedMark.textContent = "saved";
}

function deleteEntry() {
  delete entries[selectedDate];
  persist();
  ui.mood.value = "평온";
  ui.title.value = ui.content.value = ui.youtube.value = "";
  ui.savedMark.textContent = "";
  updateTrack();
}

function setArtwork(id) {
  const token = ++artworkToken;
  ui.recordPhoto.style.backgroundImage = "none";
  if (!id) return;

  const urls = ["maxresdefault.jpg", "hq720.jpg", "sddefault.jpg", "mqdefault.jpg"]
    .map((name) => `https://i.ytimg.com/vi/${id}/${name}`);

  const tryImage = (index) => {
    if (token !== artworkToken || index >= urls.length) return;
    const img = new Image();
    img.onload = () => {
      if (token !== artworkToken) return;
      if (img.naturalWidth > 200 && img.naturalHeight > 120) ui.recordPhoto.style.backgroundImage = `url("${urls[index]}")`;
      else tryImage(index + 1);
    };
    img.onerror = () => tryImage(index + 1);
    img.src = urls[index];
  };
  tryImage(0);
}

function updateButtons() {
  ui.playBtn.disabled = !videoId || !playerReady || wantsPlayback;
  ui.stopBtn.disabled = !wantsPlayback;
}

function updateTrack() {
  stopMusic(true);
  videoId = youtubeId(ui.youtube.value);
  setArtwork(videoId);
  ui.playerState.textContent = videoId ? (playerReady ? "READY" : "LOADING") : "NO TRACK";
  updateButtons();
}

function initPlayer() {
  if (player || !window.YT?.Player) return;

  player = new YT.Player("youtubePlayer", {
    width: "1",
    height: "1",
    playerVars: { controls: 0, playsinline: 1, rel: 0, origin: location.origin },
    events: {
      onReady(event) {
        playerReady = true;
        event.target.setVolume(100);
        updateButtons();
        if (videoId) ui.playerState.textContent = "READY";
      },
      onStateChange(event) {
        if (!window.YT) return;
        const state = event.data;

        if (state === YT.PlayerState.PLAYING && wantsPlayback) {
          ui.record.classList.add("playing");
          ui.playerState.textContent = "PLAYING";
        } else if (state === YT.PlayerState.BUFFERING && wantsPlayback) {
          ui.playerState.textContent = "BUFFERING";
        } else if (state === YT.PlayerState.ENDED && wantsPlayback) {
          player.seekTo(0, true);
          player.playVideo();
        }
      },
      onError() {
        stopMusic(true);
        ui.playerState.textContent = "PLAY ERROR";
      }
    }
  });
}

window.onYouTubeIframeAPIReady = initPlayer;
if (window.YT?.Player) initPlayer();

function playMusic() {
  if (!videoId || !playerReady || wantsPlayback) return;

  wantsPlayback = true;
  ui.arm.classList.add("cueing");
  ui.playerState.textContent = "CUEING";
  updateButtons();

  // 재생은 클릭 순간 바로 시작해 브라우저 자동재생 제한을 피한다.
  player.mute();
  player.loadVideoById(videoId);
  player.playVideo();

  clearTimeout(armTimer);
  armTimer = setTimeout(() => {
    if (!wantsPlayback) return;
    ui.arm.classList.remove("cueing");
    ui.arm.classList.add("playing");
    player.unMute();
    player.setVolume(100);
  }, 620);
}

function stopMusic(immediate = false) {
  wantsPlayback = false;
  clearTimeout(armTimer);
  armTimer = 0;

  if (playerReady && player) {
    try { player.stopVideo(); } catch {}
  }

  ui.record.classList.remove("playing");
  ui.arm.classList.remove("cueing");

  if (immediate) {
    ui.arm.classList.remove("playing");
  } else {
    ui.playerState.textContent = "LIFTING";
    setTimeout(() => ui.arm.classList.remove("playing"), 150);
  }

  ui.playerState.textContent = videoId ? (immediate ? "READY" : "STOPPED") : "NO TRACK";
  updateButtons();
}

// 간단한 재생 감시: 네트워크 버퍼링은 건드리지 않고, 의도치 않은 PAUSED만 복구한다.
setInterval(() => {
  if (!wantsPlayback || !playerReady || !player || !window.YT) return;
  const state = player.getPlayerState();
  if (state === YT.PlayerState.PAUSED || state === YT.PlayerState.CUED) {
    try { player.playVideo(); } catch {}
  }
}, 2500);

ui.calendarGrid.addEventListener("click", (event) => {
  const day = event.target.closest("[data-date]");
  if (day) openDiary(day.dataset.date);
});

ui.prevMonth.addEventListener("click", () => {
  month--;
  if (month < 0) { month = 11; year--; }
  renderCalendar();
});

ui.nextMonth.addEventListener("click", () => {
  month++;
  if (month > 11) { month = 0; year++; }
  renderCalendar();
});

ui.todayBtn.addEventListener("click", () => {
  const now = new Date();
  year = now.getFullYear();
  month = now.getMonth();
  renderCalendar();
});

ui.backBtn.addEventListener("click", showCalendar);
ui.saveBtn.addEventListener("click", saveEntry);
ui.deleteBtn.addEventListener("click", deleteEntry);
ui.playBtn.addEventListener("click", playMusic);
ui.stopBtn.addEventListener("click", () => stopMusic(false));
ui.youtube.addEventListener("change", updateTrack);

[ui.title, ui.content, ui.mood, ui.youtube].forEach((element) => {
  element.addEventListener("input", () => { ui.savedMark.textContent = ""; });
});

renderCalendar();
