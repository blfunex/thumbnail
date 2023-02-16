const UPLOAD_STAGE = "upload-stage";
const LOADING_STAGE = "loading-stage";
const VIDEO_STAGE = "video-stage";
const THUMBNAIL_STAGE = "thumbnail-stage";

const DROP_ZONE = "upload-drop-zone";
const FILE_INPUT = "upload-file-input";

const VIDEO = "video";
const FILE_NAME = "loading-filename";
const LOADING_PROGRESS = "loading-progress";
const BACK_UPLOAD = "back-to-upload-button";
const VIDEO_SCRUBBER = "video-time-range";
const VIDEO_TIME = "video-time-input";
const VIDEO_DURATION = "video-duration-output";
const GENERATE_BUTTON = "generate-thumbnail";
const THUMBNAIL_IMAGE = "thumbnail-image";
const THUMBNAIL_DOWNLOAD = "thumbnail-download-link";
const RESTART_BUTTON = "thumbnail-new-button";
const BACK_VIDEO = "back-to-video-button";
const UPLOAD_FORM = "upload-form";

const fileDropZone = <HTMLLabelElement>document.getElementById(DROP_ZONE);
const fileUploadInput = <HTMLInputElement>document.getElementById(FILE_INPUT);
const fileNameOutput = <HTMLOutputElement>document.getElementById(FILE_NAME);
const videoPlayer = <HTMLVideoElement>document.getElementById(VIDEO);
const toUpload = <HTMLButtonElement>document.getElementById(BACK_UPLOAD);
const videoRange = <HTMLInputElement>document.getElementById(VIDEO_SCRUBBER);
const videoTime = <HTMLInputElement>document.getElementById(VIDEO_TIME);
const videoDur = <HTMLOutputElement>document.getElementById(VIDEO_DURATION);
const loading = <HTMLProgressElement>document.getElementById(LOADING_PROGRESS);
const generate = <HTMLButtonElement>document.getElementById(GENERATE_BUTTON);
const thumbnail = <HTMLImageElement>document.getElementById(THUMBNAIL_IMAGE);
const download = <HTMLAnchorElement>document.getElementById(THUMBNAIL_DOWNLOAD);
const toVideo = <HTMLButtonElement>document.getElementById(BACK_VIDEO);
const restart = <HTMLButtonElement>document.getElementById(RESTART_BUTTON);
const uploadForm = <HTMLFormElement>document.getElementById(UPLOAD_FORM);
const canvas = document.createElement("canvas");
const ctx = canvas.getContext("2d", {
  alpha: false,
  desynchronized: true,
  colorSpace: "srgb",
  willReadFrequently: true,
})!;

const stages = {
  upload: document.getElementById(UPLOAD_STAGE)!,
  loading: document.getElementById(LOADING_STAGE)!,
  video: document.getElementById(VIDEO_STAGE)!,
  thumbnail: document.getElementById(THUMBNAIL_STAGE)!,
};
const stage = {
  close() {
    for (const element of Object.values<HTMLElement>(stages)) {
      element.hidden = true;
    }
  },
  show(name: Stage) {
    this.close();
    stages[name].hidden = false;
  },
  tansition(from: Stage, to: Stage) {
    if (stages[from].hidden) return;
    stages[from].hidden = true;
    stages[to].hidden = false;
  },
};

type Stage = keyof typeof stages;

stage.show("upload");

fileDropZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  fileDropZone.classList.add("drag-over");
});

fileDropZone.addEventListener("dragleave", (e) => {
  e.preventDefault();
  fileDropZone.classList.remove("drag-over");
});

fileDropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  fileDropZone.classList.remove("drag-over");
  const file = e.dataTransfer?.files[0];
  if (!file) return;
  onFileSelected(file);
});

fileUploadInput.addEventListener("change", (e) => {
  const file = fileUploadInput.files?.[0];

  fileUploadInput.value = "";
  fileUploadInput.blur();
  if (!file) return;
  onFileSelected(file);
});

document.addEventListener("paste", (e) => {
  const file = e.clipboardData?.files?.[0];
  if (!file || file.type.startsWith("video/")) return;
  onFileSelected(file);
});

function goBackToUpload() {
  videoPlayer.srcObject = null;
  uploadForm.reset();
  stage.show("upload");
}

function onFileSelected(file: File) {
  fileNameOutput.value = file.name;
  videoPlayer.src = URL.createObjectURL(file);
  loading.value = 0;
  videoRange.value = "0";
  videoTime.value = "00:00";
  download.download = removeExt(file.name);
  stage.show("loading");
}

function onVideoProgress() {
  const end = videoPlayer.buffered.end(0);
  loading.value = (end / videoPlayer.duration) * 100;
}

videoPlayer.addEventListener("loadedmetadata", () => {
  videoPlayer.addEventListener("progress", onVideoProgress);
  videoDur.value = getDurationString(videoPlayer.duration);
});

function getDurationString(duration: number) {
  duration = Math.ceil(duration);
  const seconds = duration % 60;
  const minutes = Math.floor(duration / 60);
  const ss = pad(seconds);
  const mm = pad(minutes);
  return `${mm}:${ss}`;
}

videoPlayer.addEventListener("canplaythrough", () => {
  videoPlayer.removeEventListener("progress", onVideoProgress);
  stage.tansition("loading", "video");
  videoPlayer.loop = true;
});

toUpload.addEventListener("click", goBackToUpload);
toVideo.addEventListener("click", () => stage.show("video"));
restart.addEventListener("click", goBackToUpload);

videoPlayer.addEventListener("timeupdate", () => {
  updateTimeRange();
  updateTimeInput();
});

function pad(seconds: number) {
  return seconds.toString().padStart(2, "0");
}

function onVideoTimeChange() {
  videoPlayer.pause();
  const value = videoRange.valueAsNumber;
  const percent = value / 100;
  videoPlayer.currentTime = videoPlayer.duration * percent;
  updateTimeInput();
}

function updateTimeInput() {
  videoTime.value = getDurationString(videoPlayer.currentTime);
}

function updateTimeRange() {
  const progress = videoPlayer.currentTime / videoPlayer.duration;
  videoRange.value = `${progress * 100}`;
}

const trottledOnVideoTimeChange = trottle(onVideoTimeChange, 5);

function onVideoTimeMouseMove() {
  if (document.activeElement !== videoRange) return;
  trottledOnVideoTimeChange();
}

function onVideoTimeSelect() {
  selectVideoTime();
}

function selectVideoTimeSide(selectMinutes: boolean) {
  const value = videoTime.value;
  const start = 0;
  const colon = value.indexOf(":");
  const end = value.length;
  if (selectMinutes) {
    videoTime.setSelectionRange(start, colon);
  } else {
    videoTime.setSelectionRange(colon + 1, end);
  }
}

function selectVideoTime() {
  const value = videoTime.value;
  const colon = value.indexOf(":") + 1;
  const selStart = videoTime.selectionStart;
  selectVideoTimeSide(selStart === null || selStart < colon);
}

function clampVideoTime() {
  const selStart = videoTime.selectionStart;
  const selEnd = videoTime.selectionEnd;
  const [mm, ss] = videoTime.value.split(":").map(parseFloat);
  const seconds = mm * 60 + ss;
  const duration = videoPlayer.duration;
  const clamped = clamp(0, duration, seconds);
  videoTime.value = getDurationString(clamped);
  videoTime.setSelectionRange(selStart, selEnd);
}

function clamp(min, max, value) {
  return Math.min(Math.max(value, min), max);
}

function removeExt(filname) {
  return filname.replace(/\.[^/.]+$/, "");
}

function fixVideoTime() {
  const isValid = /^\d{0,3}:\d{0,2}$/.test(videoTime.value);

  if (isValid) return clampVideoTime();

  const selStart = videoTime.selectionStart;
  const selEnd = videoTime.selectionEnd;

  const isValidStart = /^\d{0,3}:[^:]*$/.test(videoTime.value);
  const isValidEnd = /^[^:]*:\d{0,2}$/.test(videoTime.value);

  const value = videoTime.value;
  const [mm, ss] = getDurationString(videoPlayer.currentTime).split(":");

  const start = isValidStart ? value.split(":")[0] : mm;
  const end = isValidEnd ? value.split(":")[1] : ss;

  videoTime.value = `${start}:${end}`;

  videoTime.setSelectionRange(selStart, selEnd);

  clampVideoTime();
}

function selectVideoTimeDone() {
  const isDone = /^\d{2,}:\d{2}$/.test(videoTime.value);
  if (!isDone) return;
  selectVideoTime();
}

videoRange.addEventListener("mousemove", onVideoTimeMouseMove);
videoTime.addEventListener("select", onVideoTimeSelect);
videoTime.addEventListener("focus", onVideoTimeSelect);
videoTime.addEventListener("click", onVideoTimeSelect);
videoTime.addEventListener("blur", fixVideoTime);
videoTime.addEventListener("keypress", (e) => {
  if (!numbers.includes(e.key)) return;
  e.preventDefault();
  fixVideoTime();
});

const numbers = "0123456789".split("");
const arrows = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"];

videoTime.addEventListener("keydown", (e) => {
  if (!arrows.includes(e.key)) return;
  e.preventDefault();

  const selStart = videoTime.selectionStart;

  const value = videoTime.value;

  const colon = value.indexOf(":");
  const minutesSelected = selStart === null || selStart < colon;

  const [mm, ss] = value.split(":").map(parseFloat);
  const [mmMax, ssMax] = getDurationString(videoPlayer.duration)
    .split(":")
    .map(parseFloat);

  switch (e.key) {
    case "ArrowLeft":
      selectVideoTimeSide(true);
      break;
    case "ArrowRight":
      selectVideoTimeSide(false);
      break;
    case "ArrowUp":
      if (minutesSelected) {
        if (mm === mmMax) return;
        videoTime.value = `${pad(mm + 1)}:${pad(ss)}`;
        selectVideoTimeSide(true);
      } else {
        if (ss === 59) {
          videoTime.value = `${pad(mm + 1)}:00`;
        } else {
          if (mm === mmMax && ss === ssMax) return;
          videoTime.value = `${pad(mm)}:${pad(ss + 1)}`;
        }
        selectVideoTimeSide(false);
      }
      break;
    case "ArrowDown":
      if (minutesSelected) {
        if (mm === 0) return;
        videoTime.value = `${pad(mm - 1)}:${pad(ss)}`;
        selectVideoTimeSide(true);
      } else {
        if (ss === 0) {
          if (mm === 0) return;
          videoTime.value = `${pad(mm - 1)}:59`;
        } else {
          videoTime.value = `${pad(mm)}:${pad(ss - 1)}`;
        }
        selectVideoTimeSide(false);
      }
      break;
  }

  trottledOnVideoTimeInputChange();
});

function onVideoTimeInputChange() {
  const value = videoTime.value;
  const [mm, ss] = value.split(":").map(parseFloat);
  const seconds = mm * 60 + ss;
  const duration = videoPlayer.duration;
  const clamped = clamp(0, duration, seconds);
  videoPlayer.currentTime = clamped;
}

const trottledOnVideoTimeInputChange = trottle(onVideoTimeInputChange, 5);

function trottle(fn: () => void, ms: number) {
  let timeout: number;
  return () => {
    clearTimeout(timeout);
    timeout = setTimeout(fn, ms);
  };
}

function onGenerateClick() {
  canvas.width = videoPlayer.videoWidth;
  canvas.height = videoPlayer.videoHeight;
  ctx.drawImage(videoPlayer, 0, 0);
  canvas.toBlob(onThumbnailGenerated);
}

function onThumbnailGenerated(blob: Blob | null) {
  if (!blob) return;

  const url = URL.createObjectURL(blob);
  thumbnail.src = url;
  download.href = url;

  stage.show("thumbnail");
}

generate.addEventListener("click", onGenerateClick);
