/* PrioSense — promovideo: speelt zonder geluid af zodra hij in beeld komt,
   pauzeert buiten beeld, en heeft een knop voor geluid. Bij 'minder beweging'
   start hij pas na een klik. */
(function () {
  'use strict';
  const film = document.querySelector('.film');
  if (!film) return;
  const video = film.querySelector('.film-video');
  const play = film.querySelector('.film-play');
  const sound = film.querySelector('.film-sound');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let inView = false, userPaused = reduced;

  const start = () => { const p = video.play(); if (p) p.catch(() => {}); };
  video.addEventListener('play', () => film.classList.add('is-playing'));
  video.addEventListener('pause', () => film.classList.remove('is-playing'));
  // de eerste play() kan afgebroken worden terwijl de video nog laadt: dan opnieuw
  video.addEventListener('canplay', () => { if (inView && !userPaused && video.paused) start(); });

  new IntersectionObserver(([e]) => {
    inView = e.isIntersecting;
    if (inView && !userPaused) start();
    else if (!inView) video.pause();
  }, { threshold: 0.5 }).observe(video);

  const toggle = () => {
    if (video.paused) { userPaused = false; start(); }
    else { userPaused = true; video.pause(); }
  };
  play.addEventListener('click', toggle);
  video.addEventListener('click', toggle);

  sound.addEventListener('click', () => {
    const on = video.muted;
    video.muted = !on;
    // bij de eerste keer geluid aan: vanaf het begin, zodat je het hele verhaal hoort
    if (on && !sound.dataset.used) { video.currentTime = 0; sound.dataset.used = '1'; }
    sound.setAttribute('aria-pressed', String(on));
    sound.textContent = on ? sound.dataset.off : sound.dataset.on;
    if (on) { userPaused = false; start(); }
  });
})();
