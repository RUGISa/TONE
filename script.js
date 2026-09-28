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

let selectedDate = "";
let currentVideoId = null;

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

function renderCalendar() {
  const entries = getEntries();
  const firstDay = new Date(calendarYear, calendarMonth, 1);
  const start = new Date(calendarYear, calendarMonth, 1 - firstDay.getDay());
  const todayString = formatDate(new Date());

  monthTitle.textContent = `${calendarYear}. ${pad(calendarMonth + 1)}`;
  calendarGrid.innerHTML = "";

  for (let i = 0; i < 42; i++) {
    const cellDate = new Date(start);
    cellDate.setDate(start.getDate() + i);

    const dateString = formatDate(cellDate);
    const entry = entries[dateString];
    const isCurrentMonth = cellDate.getMonth() === calendarMonth;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "calendar-day";

    if (!isCurrentMonth) button.classList.add("other-month");
    if (dateString === todayString) button.classList.add("today");

    const number = document.createElement("span");
    number.className = "day-number";
    number.textContent = cellDate.getDate();
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

    button.addEventListener("click", () => {
      calendarYear = cellDate.getFullYear();
      calendarMonth = cellDate.getMonth();
      openDiary(dateString);
    });

    calendarGrid.appendChild(button);
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
  window.scrollTo(0, 0);
}

function showCalendar() {
  stopMusic();
  diaryView.hidden = true;
  calendarView.hidden = false;
  renderCalendar();
  window.scrollTo(0, 0);
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
  stopMusic();
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

function updateMusic() {
  currentVideoId = extractYouTubeId(youtubeInput.value.trim());
  playBtn.disabled = !currentVideoId;
  stopBtn.disabled = !currentVideoId;
  stopMusic();

  if (currentVideoId) {
    recordPhoto.style.backgroundImage = `url("https://img.youtube.com/vi/${currentVideoId}/hqdefault.jpg")`;
  } else {
    recordPhoto.style.backgroundImage = "none";
  }
}

function playMusic() {
  if (!currentVideoId) return;

  youtubePlayer.innerHTML = `
    <iframe
      width="1"
      height="1"
      src="https://www.youtube.com/embed/${currentVideoId}?autoplay=1"
      title="YouTube player"
      allow="autoplay; encrypted-media">
    </iframe>`;

  record.classList.add("playing");
  arm.classList.add("playing");
}

function stopMusic() {
  youtubePlayer.innerHTML = "";
  record.classList.remove("playing");
  arm.classList.remove("playing");
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
stopBtn.addEventListener("click", stopMusic);
youtubeInput.addEventListener("input", updateMusic);

[titleInput, contentInput, moodInput, youtubeInput].forEach(element => {
  element.addEventListener("input", () => {
    savedMark.textContent = "";
  });
});

renderCalendar();
