const STORAGE_KEY = "moodDiaryEntries";

const dateInput = document.getElementById("dateInput");
const moodInput = document.getElementById("moodInput");
const titleInput = document.getElementById("titleInput");
const contentInput = document.getElementById("contentInput");
const youtubeInput = document.getElementById("youtubeInput");
const saveBtn = document.getElementById("saveBtn");
const playBtn = document.getElementById("playBtn");
const stopBtn = document.getElementById("stopBtn");
const record = document.getElementById("record");
const arm = document.getElementById("arm");
const youtubePlayer = document.getElementById("youtubePlayer");
const savedMark = document.getElementById("savedMark");
const entryCount = document.getElementById("entryCount");

let currentVideoId = null;

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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
}

function updateCount() {
  const count = Object.keys(getEntries()).length;
  entryCount.textContent = count ? `${count} days` : "";
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
  updateMusic();
  updateCount();
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

saveBtn.addEventListener("click", saveEntry);
dateInput.addEventListener("change", loadEntry);
youtubeInput.addEventListener("change", updateMusic);
playBtn.addEventListener("click", playMusic);
stopBtn.addEventListener("click", stopMusic);

[titleInput, contentInput, moodInput, youtubeInput].forEach(element => {
  element.addEventListener("input", () => {
    savedMark.textContent = "";
  });
});

dateInput.value = formatDate(new Date());
loadEntry();
updateCount();
