/* PrioSense — laadscherm, vloeiend scrollen en alle scroll-animaties. */
(function () {
  'use strict';
  const PS = (window.PS = window.PS || {});
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const gsap = window.gsap;
  const year = document.querySelector('.year');
  if (year) year.textContent = new Date().getFullYear();

  // Zonder GSAP (of met minder beweging): alles meteen tonen, niets animeren.
  if (!gsap || reduced) {
    document.body.classList.remove('is-loading');
    const loader = document.querySelector('.loader');
    if (loader) loader.classList.add('is-done');
    PS.productProgress = 0.15;
    window.dispatchEvent(new Event('ps:intro'));
    return;
  }

  gsap.registerPlugin(ScrollTrigger, SplitText);

  /* ── Vloeiend scrollen ───────────────────────────────────────────────── */
  const lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 0.9 });
  PS.lenis = lenis;
  lenis.stop();
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      const target = id.length > 1 ? document.querySelector(id) : null;
      if (!target && id !== '#top') return;
      e.preventDefault();
      lenis.scrollTo(id === '#top' ? 0 : target, { duration: 1.6 });
    });
  });

  /* ── Navigatie: weg bij naar beneden scrollen, terug bij omhoog ──────── */
  const nav = document.querySelector('.nav');
  let lastY = 0;
  lenis.on('scroll', ({ scroll }) => {
    nav.classList.toggle('is-hidden', scroll > 200 && scroll > lastY);
    lastY = scroll;
  });

  /* ── Hero-tekst opdelen voor de intro ────────────────────────────────── */
  const heroSplit = SplitText.create('.hero-title .line', { type: 'words,chars', mask: 'chars', charsClass: 'ch', wordsClass: 'w' });
  gsap.set(heroSplit.chars, { yPercent: 140 });
  gsap.set(['.hero-tag', '.hero-sub', '.hero-content .pill'], { autoAlpha: 0, y: 24 });

  /* ── Laadscherm ──────────────────────────────────────────────────────── */
  const loader = document.querySelector('.loader');
  const num = loader.querySelector('.loader-num');
  const counter = { v: 0 };
  const ready = Promise.all([
    document.fonts ? document.fonts.ready : Promise.resolve(),
    new Promise((r) => (document.readyState === 'complete' ? r() : window.addEventListener('load', r, { once: true }))),
  ]);
  const count = gsap.timeline()
    .to('.loader-mark path', { strokeDashoffset: 0, duration: 1.2, stagger: 0.15, ease: 'power2.out' }, 0)
    .to(counter, { v: 100, duration: 1.9, ease: 'power2.inOut', onUpdate: () => (num.textContent = Math.round(counter.v)) }, 0);
  Promise.all([ready, count.then()]).then(() => gsap.timeline()
    .to('.loader-inner, .loader-count', { autoAlpha: 0, y: -30, duration: 0.5, ease: 'power2.in' })
    .to(loader, { yPercent: -100, duration: 1.1, ease: 'expo.inOut' }, '-=0.15')
    .add(() => {
      loader.classList.add('is-done');
      document.body.classList.remove('is-loading');
      lenis.start();
      window.dispatchEvent(new Event('ps:intro'));
    }, '-=0.55')
    .to(heroSplit.chars, { yPercent: 0, duration: 1.2, stagger: 0.022, ease: 'expo.out' }, '-=0.6')
    .to(['.hero-tag', '.hero-sub', '.hero-content .pill'], { autoAlpha: 1, y: 0, duration: 1, stagger: 0.1, ease: 'expo.out' }, '-=0.9')
    .set('.scroll-cue', { display: 'block' }));

  /* ── Hero verdwijnt zacht bij wegscrollen ────────────────────────────── */
  gsap.to('.hero-content', {
    yPercent: -18, autoAlpha: 0, ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
  });

  /* ── Lichtkrant: draait mee met je scrolsnelheid ─────────────────────── */
  const track = document.querySelector('.marquee-track');
  const loop = gsap.to(track, { xPercent: -50, duration: 26, ease: 'none', repeat: -1 });
  let dir = 1;
  lenis.on('scroll', ({ velocity, direction }) => {
    if (direction) dir = direction;
    const boost = 1 + Math.min(5, Math.abs(velocity) * 0.12);
    gsap.to(loop, { timeScale: boost * dir, duration: 0.4, overwrite: true });
  });

  /* ── Statement: woord voor woord oplichten ───────────────────────────── */
  const st = SplitText.create('.statement-text', { type: 'words' });
  gsap.fromTo(st.words, { opacity: 0.12 }, {
    opacity: 1, stagger: 0.1, ease: 'none',
    scrollTrigger: { trigger: '.statement', start: 'top 70%', end: 'bottom 55%', scrub: true },
  });

  /* ── Het kastje: voortgang voor de 3D-draai en de drie punten ────────── */
  PS.productProgress = 0;
  const points = gsap.utils.toArray('.product-points li');
  gsap.set(points, { autoAlpha: 0, x: 30 });
  gsap.set('.product-copy', { autoAlpha: 0, y: 40 });
  ScrollTrigger.create({
    trigger: '.product', start: 'top top', end: 'bottom bottom', scrub: true,
    onUpdate: (self) => (PS.productProgress = self.progress),
  });
  gsap.to('.product-copy', {
    autoAlpha: 1, y: 0, ease: 'none',
    scrollTrigger: { trigger: '.product', start: 'top 60%', end: 'top top', scrub: true },
  });
  points.forEach((li, i) => {
    gsap.to(li, {
      autoAlpha: 1, x: 0, ease: 'none',
      scrollTrigger: { trigger: '.product', start: `${18 + i * 18}% top`, end: `${28 + i * 18}% top`, scrub: true },
    });
  });

  /* ── Waarden: woorden schuiven uit een masker ────────────────────────── */
  gsap.utils.toArray('.value').forEach((v) => {
    const w = v.querySelector('.value-word');
    const split = SplitText.create(w, { type: 'chars', mask: 'chars' });
    gsap.from(split.chars, {
      yPercent: 110, stagger: 0.04, ease: 'none',
      scrollTrigger: { trigger: v, start: 'top 88%', end: 'top 50%', scrub: true },
    });
    gsap.from(v.querySelector('p'), {
      autoAlpha: 0, y: 30, ease: 'none',
      scrollTrigger: { trigger: v, start: 'top 75%', end: 'top 45%', scrub: true },
    });
  });

  /* ── Slot ────────────────────────────────────────────────────────────── */
  const ft = SplitText.create('.finale-title', { type: 'words', mask: 'words' });
  gsap.from(ft.words, {
    yPercent: 110, duration: 1.2, stagger: 0.08, ease: 'expo.out',
    scrollTrigger: { trigger: '.finale', start: 'top 60%' },
  });
  gsap.from('.finale-content p, .finale-content .pill', {
    autoAlpha: 0, y: 24, duration: 1, stagger: 0.1, ease: 'expo.out',
    scrollTrigger: { trigger: '.finale', start: 'top 50%' },
  });
  gsap.fromTo('.wordmark', { yPercent: 60 }, {
    yPercent: 18, ease: 'none',
    scrollTrigger: { trigger: '.finale', start: 'top bottom', end: 'bottom bottom', scrub: true },
  });

  /* ── Cursor (alleen met muis) ────────────────────────────────────────── */
  if (window.matchMedia('(pointer: fine)').matches) {
    document.documentElement.classList.add('has-cursor');
    const cur = document.querySelector('.cursor');
    const xTo = gsap.quickTo(cur, 'x', { duration: 0.35, ease: 'power3' });
    const yTo = gsap.quickTo(cur, 'y', { duration: 0.35, ease: 'power3' });
    window.addEventListener('pointermove', (e) => { xTo(e.clientX); yTo(e.clientY); });
    document.querySelectorAll('a, button, .device-canvas').forEach((el) => {
      el.addEventListener('pointerenter', () => cur.classList.add('is-big'));
      el.addEventListener('pointerleave', () => cur.classList.remove('is-big'));
    });
  }

  window.addEventListener('load', () => ScrollTrigger.refresh());
})();
