const STORAGE_KEY = "moodDiaryEntries";

const calendarView = document.getElementById("calendarView");
const diaryView = document.getElementById("diaryView");
const calendarGrid = document.getElementById("calendarGrid");
const monthTitle = document.getElementById("monthTitle");
const prevMonth = document.getElementById("prevMonth");
const nextMonth = document.getElementById("nextMonth");
const todayBtn = document.getElementById("todayBtn");
const backBtn = document.getElementById("backBtn");

const dateInput = document.getElementById("dateInput");
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

let currentVideoId = null;
const now = new Date();
let calendarYear = now.getFullYear();
let calendarMonth = now.getMonth();

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function makeDateString(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
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

function showCalendar() {
  stopMusic();
  diaryView.classList.add("hidden");
  calendarView.classList.remove("hidden");
  renderCalendar();
}

function openDiary(dateString) {
  dateInput.value = dateString;
  calendarView.classList.add("hidden");
  diaryView.classList.remove("hidden");
  loadEntry();
}

function renderCalendar() {
  const entries = getEntries();
  const firstDay = new Date(calendarYear, calendarMonth, 1).getDay();
  const lastDate = new Date(calendarYear, calendarMonth + 1, 0).getDate();
  const todayString = formatDate(new Date());

  monthTitle.textContent = `${calendarYear}. ${String(calendarMonth + 1).padStart(2, "0")}`;
  calendarGrid.innerHTML = "";

  for (let i = 0; i < firstDay; i++) {
    const empty = document.createElement("div");
    empty.className = "day empty";
    calendarGrid.appendChild(empty);
  }

  for (let day = 1; day <= lastDate; day++) {
    const dateString = makeDateString(calendarYear, calendarMonth, day);
    const entry = entries[dateString];
    const button = document.createElement("button");
    button.type = "button";
    button.className = "day";
    if (dateString === todayString) button.classList.add("today");

    const number = document.createElement("span");
    number.className = "day-number";
    number.textContent = day;
    button.appendChild(number);

    if (entry) {
      const title = document.createElement("span");
      title.className = "entry-title";
      title.textContent = entry.title || entry.mood || "record";
      button.appendChild(title);

      const mark = document.createElement("span");
      mark.className = "entry-mark";
      button.appendChild(mark);
    }

    button.addEventListener("click", () => openDiary(dateString));
    calendarGrid.appendChild(button);
  }
}

function stopMusic() {
  youtubePlayer.innerHTML = "";
  record.classList.remove("playing");
  arm.classList.remove("playing");
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
  const entry = getEntries()[dateInput.value];

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
  const date = dateInput.value;
  const title = titleInput.value.trim();
  const content = contentInput.value.trim();
  const youtube = youtubeInput.value.trim();

  if (!date || (!title && !content && !youtube)) return;

  const entries = getEntries();
  entries[date] = {
    mood: moodInput.value,
    title,
    content,
    youtube
  };

  saveEntries(entries);
  savedMark.textContent = "saved";
}

function deleteEntry() {
  const entries = getEntries();
  if (!entries[dateInput.value]) return;

  delete entries[dateInput.value];
  saveEntries(entries);
  clearForm();
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
dateInput.addEventListener("change", loadEntry);
youtubeInput.addEventListener("input", updateMusic);
playBtn.addEventListener("click", playMusic);
stopBtn.addEventListener("click", stopMusic);

[titleInput, contentInput, moodInput].forEach(element => {
  element.addEventListener("input", () => {
    savedMark.textContent = "";
  });
});

youtubeInput.addEventListener("input", () => {
  savedMark.textContent = "";
});

renderCalendar();
