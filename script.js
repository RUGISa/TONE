const STORAGE_KEY = "moodDiaryEntries";

const calendarView = document.getElementById("calendarView");
const diaryView = document.getElementById("diaryView");
const calendarGrid = document.getElementById("calendarGrid");
const monthTitle = document.getElementById("monthTitle");
const prevMonth = document.getElementById("prevMonth");
const nextMonth = document.getElementById("nextMonth");
const todayBtn = document.getElementById("todayBtn");
const backBtn = document.getElementById("backBtn");

const dateTitle = document.getElementById("dateTitle");
const weekdayTitle = document.getElementById("weekdayTitle");
const moodInput = document.getElementById("moodInput");
const titleInput = document.getElementById("titleInput");
const contentInput = document.getElementById("contentInput");
const youtubeInput = document.getElementById("youtubeInput");
const saveBtn = document.getElementById("saveBtn");
const deleteBtn = document.getElementById("deleteBtn");
const playBtn = document.getElementById("playBtn");
const stopBtn = document.getElementById("stopBtn");
const record = document.getElementById("record");
const recordPhoto = document.getElementById("recordPhoto");
const arm = document.getElementById("arm");
const youtubePlayer = document.getElementById("youtubePlayer");
const savedMark = document.getElementById("savedMark");
const playerState = document.getElementById("playerState");

let selectedDate = "";
let currentVideoId = null;
let playTimer = null;
let isPlaying = false;
let shouldPlay = false;
let ytPlayer = null;
let ytReady = false;
let resumeTimer = null;

const now = new Date();
let calendarYear = now.getFullYear();
let calendarMonth = now.getMonth();

function pad(number) {
  return String(number).padStart(2, "0");
}

function formatDate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function makeDateString(year, month, day) {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

function getEntries() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveEntries(entries) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function extractYouTubeId(rawUrl) {
  if (!rawUrl) return null;

  try {
    const url = new URL(rawUrl.trim());
    const host = url.hostname.replace(/^www\./, "");

    if (host === "youtu.be") return url.pathname.split("/").filter(Boolean)[0] || null;
    if (host.endsWith("youtube.com")) {
      if (url.pathname === "/watch") return url.searchParams.get("v");
      const parts = url.pathname.split("/").filter(Boolean);
      if (["embed", "shorts", "live"].includes(parts[0])) return parts[1] || null;
    }
  } catch {
    return null;
  }

  return null;
}

function renderCalendar() {
  const entries = getEntries();
  const firstDayIndex = new Date(calendarYear, calendarMonth, 1).getDay();
  const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
  const totalCells = firstDayIndex + daysInMonth;
  const weekCount = Math.ceil(totalCells / 7);
  const todayString = formatDate(new Date());

  monthTitle.textContent = `${calendarYear}. ${pad(calendarMonth + 1)}`;
  calendarGrid.innerHTML = "";
  calendarGrid.style.setProperty("--weeks", weekCount);

  for (let i = 0; i < firstDayIndex; i++) {
    const blank = document.createElement("div");
    blank.className = "calendar-blank";
    calendarGrid.appendChild(blank);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateString = makeDateString(calendarYear, calendarMonth, day);
    const entry = entries[dateString];
    const button = document.createElement("button");
    button.type = "button";
    button.className = "calendar-day";
    if (dateString === todayString) button.classList.add("today");

    const number = document.createElement("span");
    number.className = "day-number";
    number.textContent = day;
    button.appendChild(number);

    if (entry) {
      const preview = document.createElement("div");
      preview.className = "entry-preview";

      const title = document.createElement("strong");
      title.textContent = entry.title || "기록";

      const mood = document.createElement("span");
      mood.textContent = entry.mood || "";

      preview.append(title, mood);
      button.appendChild(preview);

      if (entry.youtube) {
        const dot = document.createElement("span");
        dot.className = "song-dot";
        button.appendChild(dot);
      }
    }

    button.addEventListener("click", () => openDiary(dateString));
    calendarGrid.appendChild(button);
  }

  const usedCells = firstDayIndex + daysInMonth;
  const blankEnd = weekCount * 7 - usedCells;
  for (let i = 0; i < blankEnd; i++) {
    const blank = document.createElement("div");
    blank.className = "calendar-blank";
    calendarGrid.appendChild(blank);
  }
}

function setDiaryDate(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  const weekday = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"][date.getDay()];
  dateTitle.textContent = `${year}. ${pad(month)}. ${pad(day)}`;
  weekdayTitle.textContent = weekday;
}

function openDiary(dateString) {
  selectedDate = dateString;
  setDiaryDate(dateString);
  loadEntry();
  calendarView.hidden = true;
  diaryView.hidden = false;
}

function showCalendar() {
  stopMusic(true);
  diaryView.hidden = true;
  calendarView.hidden = false;
  renderCalendar();
}

function clearForm() {
  moodInput.value = "평온";
  titleInput.value = "";
  contentInput.value = "";
  youtubeInput.value = "";
  savedMark.textContent = "";
  updateMusic();
}

function loadEntry() {
  stopMusic(true);
  const entry = getEntries()[selectedDate];

  if (!entry) {
    clearForm();
    return;
  }

  moodInput.value = entry.mood || "평온";
  titleInput.value = entry.title || "";
  contentInput.value = entry.content || "";
  youtubeInput.value = entry.youtube || "";
  savedMark.textContent = "saved";
  updateMusic();
}

function saveEntry() {
  if (!selectedDate) return;

  const title = titleInput.value.trim();
  const content = contentInput.value.trim();
  const youtube = youtubeInput.value.trim();

  if (!title && !content && !youtube) return;

  const entries = getEntries();
  entries[selectedDate] = {
    mood: moodInput.value,
    title,
    content,
    youtube
  };

  saveEntries(entries);
  savedMark.textContent = "saved";
}

function deleteEntry() {
  if (!selectedDate) return;
  const entries = getEntries();
  delete entries[selectedDate];
  saveEntries(entries);
  clearForm();
}

function setRecordArtwork(videoId) {
  if (!videoId) {
    recordPhoto.style.backgroundImage = "none";
    return;
  }

  const candidates = [
    `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
    `https://i.ytimg.com/vi/${videoId}/hq720.jpg`,
    `https://i.ytimg.com/vi/${videoId}/sddefault.jpg`,
    `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`
  ];

  const tryNext = (index) => {
    if (index >= candidates.length) {
      recordPhoto.style.backgroundImage = "none";
      return;
    }

    const img = new Image();
    img.onload = () => {
      if (img.naturalWidth > 200 && img.naturalHeight > 120) {
        recordPhoto.style.backgroundImage = `url("${candidates[index]}")`;
      } else {
        tryNext(index + 1);
      }
    };
    img.onerror = () => tryNext(index + 1);
    img.src = candidates[index];
  };

  tryNext(0);
}

function destroyResumeTimer() {
  if (resumeTimer) {
    clearTimeout(resumeTimer);
    resumeTimer = null;
  }
}

function ensureYouTubePlayer() {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const waitForApi = () => {
      if (window.YT && window.YT.Player) {
        if (ytPlayer && ytReady) return resolve(ytPlayer);
        if (!ytPlayer) {
          ytPlayer = new YT.Player("youtubePlayer", {
            width: "1",
            height: "1",
            playerVars: {
              autoplay: 0,
              controls: 0,
              playsinline: 1,
              rel: 0,
              origin: window.location.origin
            },
            events: {
              onReady: (event) => {
                ytReady = true;
                try { event.target.setVolume(100); } catch {}
                resolve(event.target);
              },
              onStateChange: onYouTubeStateChange,
              onError: onYouTubeError
            }
          });
        } else {
          setTimeout(waitForApi, 40);
        }
        return;
      }
      if (Date.now() - started > 8000) return reject(new Error("YouTube API timeout"));
      setTimeout(waitForApi, 50);
    };
    waitForApi();
  });
}

function onYouTubeStateChange(event) {
  const state = event.data;
  if (!window.YT) return;

  if (state === YT.PlayerState.PLAYING) {
    destroyResumeTimer();
    isPlaying = true;
    record.classList.add("playing");
    arm.classList.remove("cueing");
    arm.classList.add("playing");
    playerState.textContent = "PLAYING";
    playBtn.disabled = true;
    stopBtn.disabled = false;
    return;
  }

  if (state === YT.PlayerState.ENDED && shouldPlay) {
    try {
      ytPlayer.seekTo(0, true);
      ytPlayer.playVideo();
    } catch {}
    return;
  }

  if (state === YT.PlayerState.PAUSED && shouldPlay) {
    destroyResumeTimer();
    resumeTimer = setTimeout(() => {
      if (!shouldPlay || !ytPlayer) return;
      try { ytPlayer.playVideo(); } catch {}
    }, 350);
    return;
  }

  if (state === YT.PlayerState.BUFFERING && shouldPlay) {
    playerState.textContent = "BUFFERING";
    return;
  }

  if (state === YT.PlayerState.CUED && shouldPlay) {
    try { ytPlayer.playVideo(); } catch {}
  }
}

function onYouTubeError() {
  shouldPlay = false;
  isPlaying = false;
  destroyResumeTimer();
  record.classList.remove("playing");
  arm.classList.remove("cueing", "playing");
  playerState.textContent = "PLAY ERROR";
  playBtn.disabled = !currentVideoId;
  stopBtn.disabled = true;
}

function updateMusic() {
  currentVideoId = extractYouTubeId(youtubeInput.value.trim());
  stopMusic(true);
  setRecordArtwork(currentVideoId);
  playBtn.disabled = !currentVideoId;
  stopBtn.disabled = true;
  playerState.textContent = currentVideoId ? "READY" : "NO TRACK";
}

async function playMusic() {
  if (!currentVideoId || shouldPlay || playTimer) return;

  shouldPlay = true;
  destroyResumeTimer();
  arm.classList.remove("playing");
  arm.classList.add("cueing");
  playerState.textContent = "CUEING";
  playBtn.disabled = true;
  stopBtn.disabled = false;

  try {
    const player = await ensureYouTubePlayer();
    if (!shouldPlay) return;
    player.cueVideoById(currentVideoId);

    playTimer = setTimeout(() => {
      playTimer = null;
      if (!shouldPlay) return;
      arm.classList.remove("cueing");
      arm.classList.add("playing");
      playerState.textContent = "LOWERING";

      setTimeout(() => {
        if (!shouldPlay) return;
        try { player.playVideo(); } catch { onYouTubeError(); }
      }, 170);
    }, 520);
  } catch {
    onYouTubeError();
  }
}

function stopMusic(immediate = false) {
  shouldPlay = false;
  destroyResumeTimer();

  if (playTimer) {
    clearTimeout(playTimer);
    playTimer = null;
  }

  if (ytPlayer && ytReady) {
    try { ytPlayer.stopVideo(); } catch {}
  }

  record.classList.remove("playing");
  isPlaying = false;
  arm.classList.remove("cueing");

  if (immediate) {
    arm.classList.remove("playing");
  } else {
    playerState.textContent = "LIFTING";
    setTimeout(() => arm.classList.remove("playing"), 140);
  }

  if (currentVideoId) {
    playBtn.disabled = false;
    stopBtn.disabled = true;
    if (immediate) playerState.textContent = "READY";
    else setTimeout(() => {
      if (!shouldPlay) playerState.textContent = "STOPPED";
    }, 520);
  } else {
    playBtn.disabled = true;
    stopBtn.disabled = true;
    playerState.textContent = "NO TRACK";
  }
}

prevMonth.addEventListener("click", () => {
  calendarMonth--;
  if (calendarMonth < 0) {
    calendarMonth = 11;
    calendarYear--;
  }
  renderCalendar();
});

nextMonth.addEventListener("click", () => {
  calendarMonth++;
  if (calendarMonth > 11) {
    calendarMonth = 0;
    calendarYear++;
  }
  renderCalendar();
});

todayBtn.addEventListener("click", () => {
  const today = new Date();
  calendarYear = today.getFullYear();
  calendarMonth = today.getMonth();
  renderCalendar();
});

backBtn.addEventListener("click", showCalendar);
saveBtn.addEventListener("click", saveEntry);
deleteBtn.addEventListener("click", deleteEntry);
playBtn.addEventListener("click", playMusic);
stopBtn.addEventListener("click", () => stopMusic(false));
youtubeInput.addEventListener("input", updateMusic);

[titleInput, contentInput, moodInput, youtubeInput].forEach((element) => {
  element.addEventListener("input", () => {
    savedMark.textContent = "";
  });
});

renderCalendar();
