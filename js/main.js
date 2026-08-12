(function () {
  const nav = document.getElementById('nav');
  const toggle = document.getElementById('nav-toggle');
  const links = document.getElementById('nav-links');

  window.addEventListener('scroll', function () {
    nav.classList.toggle('scrolled', window.scrollY > 40);
  });

  toggle.addEventListener('click', function () {
    toggle.classList.toggle('active');
    links.classList.toggle('open');
  });

  links.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', function () {
      toggle.classList.remove('active');
      links.classList.remove('open');
    });
  });

  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
        }
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
  );

  document.querySelectorAll('.project-card, .highlight, .skill-group, .experience-card, .education-card').forEach(function (el) {
    el.style.opacity = '0';
    el.style.transform = 'translateY(24px)';
    el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    observer.observe(el);
  });

const navLogo = document.getElementById("nav-logo");

function updateNavLogo() {
  if (!navLogo) return;

  navLogo.classList.toggle("is-scrolled", window.scrollY > 80);
}

window.addEventListener("scroll", updateNavLogo, { passive: true });
updateNavLogo();

const sumobotVideo = document.getElementById("sumobot-video");
const sumobotEndState = document.getElementById("sumobot-end-state");
const sumobotReplay = document.getElementById("sumobot-replay");

if (sumobotVideo && sumobotEndState && sumobotReplay) {

  sumobotVideo.addEventListener("ended", function () {
    sumobotEndState.hidden = false;
  });

  sumobotReplay.addEventListener("click", function () {
    sumobotEndState.hidden = true;
    sumobotVideo.currentTime = 0;
    sumobotVideo.play();
  });
}

})();
