// Dani if you're reading this just know it's for jokes and shit <3

let currentVideo = null;
let database = null;

console.log("extension started");

async function loadDatabase() {
  const res = await fetch(
    "https://raw.githubusercontent.com/pickpocketingapickpocketer/database-thingy/main/jokes.json",
    { cache: "no-store" }
  );

  return res.json();
}

function getVideoId() {
  return new URLSearchParams(window.location.search).get("v");
}

function waitForVideo() {
  return new Promise(resolve => {
    const look = () => {
      const vid = document.querySelector("video");

      if (vid && vid.readyState >= 1) {
        resolve(vid);
        return;
      }

      requestAnimationFrame(look);
    };

    look();
  });
}

async function attachToVideo() {
  const videoId = getVideoId();
  const events = database?.[videoId];

  if (!videoId || !events || !events.length) return;

  const video = await waitForVideo();

  if (video === currentVideo) return;

  if (currentVideo?.__jokeCleanup) {
    currentVideo.__jokeCleanup();
  }

  currentVideo = video;

  if (video.__jokeCleanup) {
    video.__jokeCleanup();
  }

  const audio = new Audio(chrome.runtime.getURL("my_mom.mp3"));
  audio.volume = 0.15;

  const triggered = new Set();

  let lastTime = video.currentTime;
  let isSeeking = false;
  let unmuteTimer = null;

  const onSeeking = () => {
    isSeeking = true;
  };

  const onSeeked = () => {
    lastTime = video.currentTime;
    isSeeking = false;
  };

  const onTimeUpdate = () => {
    const time = video.currentTime;

    if (isSeeking) {
      lastTime = time;
      return;
    }

    for (const event of events) {
      const start = Number(event.start);
      const duration = Number(event.duration) || 0;

      if (time < start - 1) {
        triggered.delete(start);
      }

      if (lastTime < start && time >= start && !triggered.has(start)) {
        triggered.add(start);

        video.muted = true;

        audio.pause();
        audio.currentTime = 0;
        audio.play().catch(() => {});

        clearTimeout(unmuteTimer);
        unmuteTimer = setTimeout(() => {
          video.muted = false;
        }, duration * 1000);
      }
    }

    lastTime = time;
  };

  video.addEventListener("seeking", onSeeking);
  video.addEventListener("seeked", onSeeked);
  video.addEventListener("timeupdate", onTimeUpdate);

  video.__jokeCleanup = () => {
    video.removeEventListener("seeking", onSeeking);
    video.removeEventListener("seeked", onSeeked);
    video.removeEventListener("timeupdate", onTimeUpdate);
    clearTimeout(unmuteTimer);
  };
}

async function init() {
  if (!database) {
    database = await loadDatabase();
  }

  attachToVideo();
}

init();

document.addEventListener("yt-navigate-finish", init);
setInterval(attachToVideo, 1000);