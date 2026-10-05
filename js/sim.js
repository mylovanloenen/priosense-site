/* PrioSense — gedeelde simulatie: dezelfde detectieregels als het apparaat
   (tetra_monitor.py): drempels per rijmodus, 4 s vasthouden, 12 dB/s wegzakken,
   en een negeerlijst voor kanalen die langer dan 20 s onafgebroken actief zijn. */
(function () {
  'use strict';
  const PS = (window.PS = window.PS || {});

  PS.MODES = {
    stad: { key: 'stad', name: 'Stad', soft: 30, hard: 45 },
    snelweg: { key: 'snelweg', name: 'Snelweg', soft: 25, hard: 35 },
  };
  PS.HANG_S = 4;
  PS.RELEASE_DB_S = 12;
  PS.BLACKLIST_S = 20;
  PS.UNBLACKLIST_S = 15;
  PS.BAR_MAX_DB = 60;

  PS.reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  PS.rand = (a, b) => a + Math.random() * (b - a);
  PS.gauss = () => {
    let u = 0, v = 0;
    while (!u) u = Math.random();
    while (!v) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  PS.clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  PS.fmtFreq = (mhz) => mhz.toFixed(3).replace('.', ',');

  /* Signaalsterkte (dB boven de ruis) op afstand d meter van een zender. */
  PS.levelAt = (power, d, noise = 1.3) =>
    power - 22 * Math.log10(Math.max(d, 15) / 15) + PS.gauss() * noise;

  /* ── Detector ─────────────────────────────────────────────────────────── */
  class Detector {
    constructor(modeKey) {
      this.setMode(modeKey || 'stad');
      this.channels = new Map();
      this.t = 0;
    }
    setMode(key) { this.mode = PS.MODES[key] || PS.MODES.stad; }
    reset() { this.channels.clear(); this.t = 0; }

    /* inputs: [{ freq, level }] — momentane niveaus van kanalen met signaal. */
    step(dt, inputs) {
      this.t += dt;
      const t = this.t, m = this.mode;
      const now = new Map();
      for (const s of inputs) now.set(s.freq, Math.max(now.get(s.freq) || 0, s.level));
      for (const f of now.keys()) {
        if (!this.channels.has(f)) {
          this.channels.set(f, { freq: f, level: 0, hangUntil: 0, activeSince: 0, quietSince: t, blacklisted: false });
        }
      }
      for (const ch of this.channels.values()) {
        const level = now.get(ch.freq) || 0;
        let contact = false;
        if (level > m.soft) {
          if (!ch.activeSince) ch.activeSince = t;
          ch.quietSince = 0;
          if (!ch.blacklisted && t - ch.activeSince > PS.BLACKLIST_S) ch.blacklisted = true;
          contact = !ch.blacklisted;
        } else {
          ch.activeSince = 0;
          if (!ch.quietSince) ch.quietSince = t;
          if (ch.blacklisted && t - ch.quietSince > PS.UNBLACKLIST_S) ch.blacklisted = false;
        }
        if (contact) {
          if (level > ch.level) ch.level = level;          // aanval: naar de piek
          ch.hangUntil = t + PS.HANG_S;                     // vasthouden
        } else if (ch.blacklisted) {
          ch.level = 0;
        } else if (t > ch.hangUntil && ch.level > 0) {
          ch.level = Math.max(0, ch.level - PS.RELEASE_DB_S * dt);   // wegzakken
        }
      }
      for (const [f, ch] of this.channels) {
        if (!ch.level && !ch.blacklisted && !now.has(f) && t > ch.hangUntil + 1) this.channels.delete(f);
      }
    }

    active() { return [...this.channels.values()].filter((c) => c.level > 0); }
    anyBlacklisted() { for (const c of this.channels.values()) if (c.blacklisted) return true; return false; }

    /* Alarm volgt de staande balken: rood vanaf de harde drempel, oranje vanaf de zachte. */
    alarm() {
      let best = null;
      for (const c of this.channels.values()) if (c.level > 0 && (!best || c.level > best.level)) best = c;
      if (!best) return { level: 0, freq: 0, db: 0 };
      const lvl = best.level >= this.mode.hard ? 2 : best.level >= this.mode.soft ? 1 : 0;
      return { level: lvl, freq: best.freq, db: best.level };
    }
  }
  PS.Detector = Detector;

  /* ── Zender (eenheid die af en toe zendt, of continu) ─────────────────── */
  class Emitter {
    constructor(o) {
      Object.assign(this, {
        freq: 382.125, power: 66, constant: false, noise: 1.3,
        gap: [2, 6], talk: [0.5, 2.6], blip: 0.3,
        on: false, until: 0, next: PS.rand(0.2, 1.5),
      }, o);
    }
    update(t) {
      if (this.constant) { this.on = true; return; }
      if (this.on && t >= this.until) {
        this.on = false;
        this.next = t + PS.rand(this.gap[0], this.gap[1]);
      } else if (!this.on && t >= this.next) {
        this.on = true;
        const short = Math.random() < this.blip;   // korte aanmeldpuls of een gesprek
        this.until = t + (short ? PS.rand(0.06, 0.2) : PS.rand(this.talk[0], this.talk[1]));
      }
    }
    level(d) { return PS.levelAt(this.power, d, this.noise); }
    reset() { this.on = false; this.until = 0; this.next = PS.rand(0.2, 1.5); }
  }
  PS.Emitter = Emitter;

  /* Vaste plekken: een kanaal houdt zijn balk zolang hij staat (geen springen). */
  PS.assignSlots = function (prevSlots, det) {
    const active = det.active().sort((a, b) => b.level - a.level);
    const live = new Set(active.map((c) => c.freq));
    const slots = prevSlots.map((f) => (f !== null && live.has(f) ? f : null));
    for (const c of active) {
      if (slots.includes(c.freq)) continue;
      const empty = slots.indexOf(null);
      if (empty >= 0) { slots[empty] = c.freq; continue; }
      let weakest = -1, wl = Infinity;
      slots.forEach((f, i) => { const l = det.channels.get(f).level; if (l < wl) { wl = l; weakest = i; } });
      if (c.level > wl + 3) slots[weakest] = c.freq;
    }
    return slots;
  };

  const MODE_LABELS = {
    nl: { stad: 'Stad', snelweg: 'Snelweg' },
    en: { stad: 'City', snelweg: 'Highway' },
  };

  /* ── Het scherm als tekening (480 × 320, de echte resolutie) ──────────── */
  /* Alleen drie balken en onderin één schakelaar voor de rijmodus. */
  class ScreenPainter {
    constructor(lang) {
      this.canvas = document.createElement('canvas');
      this.canvas.width = 480;
      this.canvas.height = 320;
      this.ctx = this.canvas.getContext('2d');
      this.slots = [null, null, null];
      this.labels = MODE_LABELS[lang] || MODE_LABELS.nl;
      this.toggle = { x: 90, y: 254, w: 300, h: 48 };
      this.hover = null;
    }
    /* Welke modus zit er onder dit punt op het scherm (of null)? */
    modeAt(x, y) {
      const t = this.toggle;
      if (x < t.x || x > t.x + t.w || y < t.y || y > t.y + t.h) return null;
      return x < t.x + t.w / 2 ? 'stad' : 'snelweg';
    }
    rr(x, y, w, h, r, fill) {
      const c = this.ctx;
      c.beginPath(); c.roundRect(x, y, w, h, r);
      c.fillStyle = fill; c.fill();
    }
    paint(det) {
      const c = this.ctx, m = det.mode;
      this.slots = PS.assignSlots(this.slots, det);
      c.fillStyle = '#0f1216'; c.fillRect(0, 0, 480, 320);

      const top = 22, bot = 234, h = bot - top, bw = 132, gap = 18, x0 = (480 - 3 * bw - 2 * gap) / 2;
      this.slots.forEach((f, i) => {
        const x = x0 + i * (bw + gap);
        const ch = f !== null ? det.channels.get(f) : null;
        const lvl = ch ? ch.level : 0;
        this.rr(x, top, bw, h, 14, '#171b21');
        if (lvl > 0) {
          const fh = Math.max(14, h * PS.clamp(lvl / PS.BAR_MAX_DB, 0, 1));
          this.rr(x, bot - fh, bw, fh, 14, lvl >= m.hard ? '#ff4d4d' : lvl >= m.soft ? '#ff9933' : '#3aa0ff');
        }
      });

      const t = this.toggle, half = t.w / 2;
      this.rr(t.x, t.y, t.w, t.h, t.h / 2, '#1d2128');
      const onLeft = m.key === 'stad';
      if (this.hover && this.hover !== m.key) {
        this.rr(this.hover === 'stad' ? t.x + 4 : t.x + half + 4, t.y + 4, half - 8, t.h - 8, (t.h - 8) / 2, '#262b33');
      }
      this.rr(onLeft ? t.x + 4 : t.x + half + 4, t.y + 4, half - 8, t.h - 8, (t.h - 8) / 2, '#3aa0ff');
      c.font = '600 19px "Archivo", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillStyle = onLeft ? '#04121f' : '#8a92a0';
      c.fillText(this.labels.stad, t.x + half / 2, t.y + t.h / 2 + 1);
      c.fillStyle = onLeft ? '#8a92a0' : '#04121f';
      c.fillText(this.labels.snelweg, t.x + half * 1.5, t.y + t.h / 2 + 1);
    }
  }
  PS.ScreenPainter = ScreenPainter;

  /* ── Animatielus die alleen draait als het element in beeld is ────────── */
  PS.visibleLoop = function (el, frame) {
    let raf = 0, last = 0, visible = false, t = 0;
    const tick = (now) => {
      const dt = Math.min(0.1, (now - last) / 1000 || 0);
      last = now; t += dt;
      frame(dt, t);
      raf = requestAnimationFrame(tick);
    };
    const start = () => { if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); } };
    const stop = () => { cancelAnimationFrame(raf); raf = 0; };
    const sync = () => (visible && !document.hidden ? start() : stop());
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; sync(); }, { rootMargin: '120px' }).observe(el);
    document.addEventListener('visibilitychange', sync);
    return { start, stop };
  };

})();
