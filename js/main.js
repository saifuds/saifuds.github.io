const nav = document.getElementById("nav");
const navLogo = document.getElementById("nav-logo");
const navToggle = document.getElementById("nav-toggle");
const navLinks = document.getElementById("nav-links");

function updateNavigation() {
  const isScrolled = window.scrollY > 80;

  nav.classList.toggle("is-scrolled", isScrolled);
  navLogo.classList.toggle("is-scrolled", isScrolled);
}

window.addEventListener("scroll", updateNavigation, { passive: true });
updateNavigation();

navToggle.addEventListener("click", () => {
  const isOpen = navLinks.classList.toggle("is-open");
  navToggle.setAttribute("aria-expanded", String(isOpen));
});

navLinks.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    navLinks.classList.remove("is-open");
    navToggle.setAttribute("aria-expanded", "false");
  });
});


// SUMOBOT VIDEO

const sumobotVideo = document.getElementById("sumobot-video");
const sumobotEndState = document.getElementById("sumobot-end-state");
const sumobotReplay = document.getElementById("sumobot-replay");

if (sumobotVideo && sumobotEndState && sumobotReplay) {
  sumobotVideo.addEventListener("ended", () => {
    sumobotEndState.hidden = false;
  });

  sumobotReplay.addEventListener("click", () => {
    sumobotEndState.hidden = true;
    sumobotVideo.currentTime = 0;
    sumobotVideo.play();
  });
}


// SNAKE GAME VIDEO

const snakeVideo = document.getElementById("snake-video");
const snakeEndState = document.getElementById("snake-end-state");
const snakeReplay = document.getElementById("snake-replay");

if (snakeVideo && snakeEndState && snakeReplay) {
  snakeVideo.addEventListener("ended", () => {
    snakeEndState.hidden = false;
  });

  snakeReplay.addEventListener("click", () => {
    snakeEndState.hidden = true;
    snakeVideo.currentTime = 0;
    snakeVideo.play();
  });
}


// THEME TOGGLE

const themeToggle = document.getElementById("theme-toggle");
const themeIcon = document.getElementById("theme-icon");

function setTheme(isDark) {
  document.body.classList.toggle("dark", isDark);
  document.body.classList.toggle("light", !isDark);

  themeIcon.textContent = isDark ? "☀︎" : "☾";

  themeToggle.setAttribute(
    "aria-label",
    isDark ? "Switch to light mode" : "Switch to dark mode"
  );
}

const savedTheme = localStorage.getItem("theme");
const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");

if (savedTheme === "dark" || savedTheme === "light") {
  setTheme(savedTheme === "dark");
} else {
  setTheme(systemTheme.matches);
}

// Follow system changes only until the visitor manually chooses a theme.
systemTheme.addEventListener("change", (event) => {
  if (!localStorage.getItem("theme")) {
    setTheme(event.matches);
  }
});

themeToggle.addEventListener("click", () => {
  const nextIsDark = !document.body.classList.contains("dark");

  setTheme(nextIsDark);

  localStorage.setItem(
    "theme",
    nextIsDark ? "dark" : "light"
  );
});


// PROJECT INFO POPUPS

const projectInfoItems = document.querySelectorAll(".project-info");
const mobileProjectDetails = window.matchMedia("(max-width: 760px)");

projectInfoItems.forEach((item) => {
  const trigger = item.querySelector(".project-info-trigger");

  if (!trigger) return;

  trigger.setAttribute("role", "button");
  trigger.setAttribute("aria-expanded", "false");

  trigger.addEventListener("click", (event) => {
    if (!mobileProjectDetails.matches) return;

    event.preventDefault();
    event.stopPropagation();

    const shouldOpen = !item.classList.contains("is-open");

    projectInfoItems.forEach((otherItem) => {
      otherItem.classList.remove("is-open");

      const otherTrigger =
        otherItem.querySelector(".project-info-trigger");

      if (otherTrigger) {
        otherTrigger.setAttribute("aria-expanded", "false");
      }
    });

    item.classList.toggle("is-open", shouldOpen);

    trigger.setAttribute(
      "aria-expanded",
      String(shouldOpen)
    );
  });

  trigger.addEventListener("keydown", (event) => {
    if (!mobileProjectDetails.matches) return;

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      trigger.click();
    }
  });
});

document.addEventListener("click", () => {
  if (!mobileProjectDetails.matches) return;

  projectInfoItems.forEach((item) => {
    item.classList.remove("is-open");

    const trigger =
      item.querySelector(".project-info-trigger");

    if (trigger) {
      trigger.setAttribute("aria-expanded", "false");
    }
  });
});

mobileProjectDetails.addEventListener("change", () => {
  projectInfoItems.forEach((item) => {
    item.classList.remove("is-open");

    const trigger =
      item.querySelector(".project-info-trigger");

    if (trigger) {
      trigger.setAttribute("aria-expanded", "false");
    }
  });
});


// PROJECT VIDEO AUTOPLAY

// Autoplay project videos silently when they enter the viewport.
// Browsers permit autoplay when video is muted and playsinline.

const projectVideos = document.querySelectorAll("video");

projectVideos.forEach((video) => {
  video.muted = true;
  video.defaultMuted = true;
  video.playsInline = true;
});

const videoObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      const video = entry.target;

      if (
        entry.isIntersecting &&
        entry.intersectionRatio >= 0.45
      ) {
        // Do not restart the SumoBot after its custom end-state appears.
        if (
          video.id === "sumobot-video" &&
          sumobotEndState &&
          !sumobotEndState.hidden
        ) {
          return;
        }

        video.play().catch(() => {});
      } else {
        video.pause();
      }
    });
  },
  {
    threshold: [0, 0.45, 1]
  }
);

projectVideos.forEach((video) => {
  videoObserver.observe(video);
});