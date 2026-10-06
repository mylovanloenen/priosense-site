/* PrioSense — het kastje in 3D (maten van case v4), draait mee met scrollen
   en is met de muis, je vinger of de pijltjestoetsen rond te draaien. */
import * as THREE from 'three';
import { RoomEnvironment } from './vendor/RoomEnvironment.js';

const PS = window.PS || {};
const pin = document.querySelector('.product-pin');
const canvas = document.querySelector('.device-canvas');
const hint = document.querySelector('.drag-hint');


/* ── Vormhulpjes ──────────────────────────────────────────────────────── */
function rr(path, w, h, r, cx = 0, cy = 0) {
  const x = cx - w / 2, y = cy - h / 2;
  path.moveTo(x + r, y);
  path.lineTo(x + w - r, y); path.quadraticCurveTo(x + w, y, x + w, y + r);
  path.lineTo(x + w, y + h - r); path.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  path.lineTo(x + r, y + h); path.quadraticCurveTo(x, y + h, x, y + h - r);
  path.lineTo(x, y + r); path.quadraticCurveTo(x, y, x + r, y);
  return path;
}
function extrude(shape, depth, bevel) {
  const g = new THREE.ExtrudeGeometry(shape, {
    depth, curveSegments: 14, bevelEnabled: bevel > 0,
    bevelThickness: bevel, bevelSize: bevel, bevelSegments: 4,
  });
  g.rotateX(-Math.PI / 2);   // extrusie langs +y (plat liggend, scherm boven)
  return g;
}
function box(w, h, d, mat, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  return m;
}

/* ── Het kastje (1 eenheid = 10 mm, plat opgebouwd: y omhoog) ─────────── */
function buildDevice(screenTex, logoTex) {
  const W = 9.62, D = 6.24, R = 0.34, BODY = 3.4, TOP = 0.64;
  const M = {
    shell: new THREE.MeshStandardMaterial({ color: 0x1b1e23, roughness: 0.58, metalness: 0.05 }),
    inset: new THREE.MeshStandardMaterial({ color: 0x07080a, roughness: 0.9 }),
    glass: new THREE.MeshStandardMaterial({ color: 0x030405, roughness: 0.08, metalness: 0.4 }),
    steel: new THREE.MeshStandardMaterial({ color: 0xc3c9d0, roughness: 0.28, metalness: 0.95 }),
    gold: new THREE.MeshStandardMaterial({ color: 0xd9b45c, roughness: 0.25, metalness: 1.0 }),
    blueTab: new THREE.MeshStandardMaterial({ color: 0x2b6fd6, roughness: 0.5 }),
    blackTab: new THREE.MeshStandardMaterial({ color: 0x111215, roughness: 0.6 }),
    cable: new THREE.MeshStandardMaterial({ color: 0x121316, roughness: 0.7 }),
    screen: new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: false }),
    logo: new THREE.MeshBasicMaterial({ map: logoTex, transparent: true, toneMapped: false }),
  };
  const g = new THREE.Group();

  // Onderste deel (dicht) en bovenrand met het schermvenster.
  g.add(new THREE.Mesh(extrude(rr(new THREE.Shape(), W, D, R), BODY, 0.06), M.shell));
  const frame = rr(new THREE.Shape(), W, D, R);
  frame.holes.push(rr(new THREE.Path(), 7.68, 5.24, 0.1, 0.31, 0));
  const top = new THREE.Mesh(extrude(frame, TOP, 0.06), M.shell);
  top.position.y = BODY;
  g.add(top);

  // Het scherm ligt iets verzonken in het venster.
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(7.68, 5.24).rotateX(-Math.PI / 2), M.glass);
  glass.position.set(0.31, BODY + 0.075, 0);
  g.add(glass);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(7.404, 4.956).rotateX(-Math.PI / 2), M.screen);
  scr.position.set(0.31, BODY + 0.085, 0);
  g.add(scr);

  // Poortenvenster rechts: USB 2, USB 3 en Ethernet.
  const xR = W / 2 + 0.065;
  g.add(box(0.02, 1.72, 5.4, M.inset, xR, 2.63, 0));
  for (const [z, tab] of [[1.85, M.blackTab], [0.1, M.blueTab]]) {
    for (const y of [2.22, 3.02]) {
      g.add(box(0.03, 0.6, 1.34, M.steel, xR + 0.01, y, z));
      g.add(box(0.035, 0.42, 1.18, M.inset, xR + 0.02, y, z));
      g.add(box(0.04, 0.12, 1.0, tab, xR + 0.025, y + 0.06, z));
    }
  }
  g.add(box(0.03, 1.3, 1.55, M.steel, xR + 0.01, 2.6, -1.85));
  g.add(box(0.035, 0.85, 1.2, M.inset, xR + 0.02, 2.5, -1.85));

  // Antenne-aansluiting (SMA) links, met een coaxkabel.
  const xL = -W / 2 - 0.065;
  const nut = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.2, 6), M.gold);
  nut.rotation.z = Math.PI / 2; nut.position.set(xL - 0.1, 0.76, 0);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.9, 28), M.gold);
  barrel.rotation.z = Math.PI / 2; barrel.position.set(xL - 0.6, 0.76, 0);
  g.add(nut, barrel);
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(xL - 1.0, 0.76, 0), new THREE.Vector3(xL - 1.9, 0.76, 0.15),
    new THREE.Vector3(xL - 2.9, 0.6, 1.4), new THREE.Vector3(xL - 3.7, 0.3, 4.0),
    new THREE.Vector3(xL - 4.2, 0.0, 9.0), new THREE.Vector3(xL - 4.4, -0.2, 18.0),
  ]);
  g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 120, 0.13, 12), M.cable));

  // Ventilatiesleuven en schroefjes op de lange zijden.
  for (const zs of [1, -1]) {
    const z = zs * (D / 2 + 0.065);
    for (const x of [-3.25, -1.45, -0.55, 1.25]) g.add(box(0.4, 0.7, 0.02, M.inset, x, 0.81, z));
    for (const x of [-2.25, 0.45]) {
      const s = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.04, 20), M.steel);
      s.rotation.x = Math.PI / 2; s.position.set(x, 0.66, z);
      g.add(s);
    }
  }
  // USB-C-gleuf (voeding) op de voorkant.
  g.add(box(1.1, 0.7, 0.02, M.inset, -3.13, 2.12, D / 2 + 0.065));

  // Logo en ventilatiegaatjes op de achterkant.
  const logo = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 2.3).rotateX(Math.PI / 2), M.logo);
  logo.position.set(0, -0.075, -0.4);
  g.add(logo);
  for (const x of [-1.9, -0.9, 0.1, 1.1]) {
    for (const z of [1.55, 2.25]) {
      const h = new THREE.Mesh(new THREE.CircleGeometry(0.2, 20).rotateX(Math.PI / 2), M.inset);
      h.position.set(x, -0.075, z);
      g.add(h);
    }
  }

  // Rechtop zetten: het scherm kijkt naar de camera.
  g.position.y = -(BODY + TOP) / 2;
  const standing = new THREE.Group();
  standing.add(g);
  standing.rotation.x = Math.PI / 2;
  return { object: standing, screen: scr };
}

/* Logo voor de achterkant: de signaalbogen en het woordmerk. */
function logoTexture() {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 512;
  const x = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const paint = () => {
    x.clearRect(0, 0, 1024, 512);
    x.save();
    x.translate(512, 250); x.scale(-1, -1);   // 180° gedraaid: het vlak ligt ondersteboven op de achterkant
    x.lineCap = 'round';
    [[30, 12, 1], [56, 9, 0.75], [82, 7, 0.5]].forEach(([r, w, a]) => {
      x.strokeStyle = `rgba(58,160,255,${a})`; x.lineWidth = w;
      x.beginPath(); x.arc(0, -40, r, Math.PI * 1.2, Math.PI * 1.8); x.stroke();
    });
    x.fillStyle = '#3aa0ff'; x.beginPath(); x.arc(0, -40, 9, 0, Math.PI * 2); x.fill();
    x.fillStyle = 'rgba(244,245,247,0.55)';
    x.font = '700 86px "Archivo", sans-serif'; x.textAlign = 'center';
    x.fillText('priosense', 0, 110);
    x.restore();
    tex.needsUpdate = true;
  };
  paint();
  if (document.fonts) document.fonts.ready.then(paint);
  return tex;
}

/* Zachte schaduw onder het kastje. */
function shadowMesh() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const x = c.getContext('2d');
  const grd = x.createRadialGradient(128, 128, 0, 128, 128, 128);
  grd.addColorStop(0, 'rgba(0,0,0,0.65)');
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = grd; x.fillRect(0, 0, 256, 256);
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(13, 4).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }),
  );
  m.position.y = -4.1;
  return m;
}

/* ── Zelf ronddraaien ─────────────────────────────────────────────────── */
class Spin {
  constructor(el) {
    this.yaw = 0; this.pitch = 0; this.vel = 0; this.drag = false; this.used = false;
    const clampP = (p) => Math.max(-0.5, Math.min(0.6, p));
    el.addEventListener('pointerdown', (e) => {
      this.drag = true; this.type = e.pointerType; this.x = e.clientX; this.y = e.clientY; this.moved = 0;
      el.setPointerCapture(e.pointerId); el.classList.add('is-dragging'); this.touched();
    });
    el.addEventListener('pointermove', (e) => {
      if (!this.drag) return;
      const dx = e.clientX - this.x, dy = e.clientY - this.y;
      this.x = e.clientX; this.y = e.clientY; this.moved += Math.abs(dx) + Math.abs(dy);
      this.yaw += dx * 0.01; this.vel = dx * 0.6;
      if (this.type !== 'touch') this.pitch = clampP(this.pitch + dy * 0.006);
    });
    const end = () => { this.drag = false; el.classList.remove('is-dragging'); };
    el.addEventListener('pointerup', (e) => {
      const tap = this.drag && this.moved < 6;
      end();
      if (tap && this.onTap) { this.vel = 0; this.onTap(e); }
    });
    el.addEventListener('pointercancel', end);
    el.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { this.vel = e.key === 'ArrowLeft' ? -2.5 : 2.5; }
      else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { this.pitch = clampP(this.pitch + (e.key === 'ArrowUp' ? -0.08 : 0.08)); }
      else if ((e.key === 'Enter' || e.key === ' ') && this.onKeyToggle) { this.onKeyToggle(); }
      else return;
      e.preventDefault(); this.touched();
    });
  }
  touched() { if (!this.used) { this.used = true; if (hint) hint.classList.add('is-gone'); } }
  update(dt) {
    if (this.drag) return;
    this.yaw += this.vel * dt;
    this.vel *= Math.pow(0.03, dt);
  }
}

/* ── Opstarten ────────────────────────────────────────────────────────── */
function start() {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch (e) {
    document.documentElement.classList.add('no-webgl');
    return;
  }
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.45;
  const key = new THREE.DirectionalLight(0xffffff, 2.0); key.position.set(4, 6, 9);
  const rimBlue = new THREE.DirectionalLight(0x3aa0ff, 1.6); rimBlue.position.set(-9, 3, -7);
  const rimRed = new THREE.DirectionalLight(0xff3b3b, 1.3); rimRed.position.set(9, -1, -7);
  scene.add(key, rimBlue, rimRed);

  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 200);

  // Live scherm: een eenheid die steeds dichterbij komt en weer wegrijdt.
  const painter = new PS.ScreenPainter(document.documentElement.lang);
  const det = new PS.Detector('stad');
  const em = new PS.Emitter({ freq: 382.875, power: 66, gap: [0.8, 2.6], talk: [0.5, 2] });
  const em2 = new PS.Emitter({ freq: 381.6, power: 64, gap: [3, 8], talk: [0.4, 1.5] });
  const screenTex = new THREE.CanvasTexture(painter.canvas);
  screenTex.colorSpace = THREE.SRGBColorSpace;
  screenTex.anisotropy = renderer.capabilities.getMaxAnisotropy();

  const pivot = new THREE.Group();
  const device = buildDevice(screenTex, logoTexture());
  pivot.add(device.object);
  scene.add(pivot, shadowMesh());

  const spin = new Spin(canvas);

  // De modusschakelaar op het scherm: klik erop, of gebruik Enter / spatie.
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const modeUnder = (e) => {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObject(device.screen, false)[0];
    return hit && hit.uv ? painter.modeAt(hit.uv.x * 480, (1 - hit.uv.y) * 320) : null;
  };
  const baseLabel = canvas.getAttribute('aria-label');
  const setMode = (key) => {
    det.setMode(key);
    canvas.setAttribute('aria-label', baseLabel + ' ' + painter.labels[key] + '.');
  };
  setMode('stad');
  spin.onTap = (e) => { const k = modeUnder(e); if (k) setMode(k); };
  spin.onKeyToggle = () => setMode(det.mode.key === 'stad' ? 'snelweg' : 'stad');
  canvas.addEventListener('pointermove', (e) => {
    if (spin.drag) return;
    painter.hover = modeUnder(e);
    canvas.style.cursor = painter.hover ? 'pointer' : '';
  });
  canvas.addEventListener('pointerleave', () => { painter.hover = null; });

  const resize = () => {
    const w = pin.clientWidth, h = pin.clientHeight;
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const fit = (camera.aspect < 1 ? 16 : 13) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect);
    camera.position.set(0, 0.6, Math.max(25, fit));
    camera.lookAt(0, camera.aspect < 1 ? 1.2 : 0, 0);   // smal scherm: kastje iets lager, onder de kop
  };
  new ResizeObserver(resize).observe(pin);
  resize();

  let simT = 0, paintAcc = 1;
  function frame(dt) {
    simT += dt;
    em.update(simT); em2.update(simT);
    const d1 = 30 + 800 * (0.5 + 0.5 * Math.cos((2 * Math.PI * simT) / 14));
    const inputs = [];
    if (em.on) inputs.push({ freq: em.freq, level: em.level(d1) });
    if (em2.on) inputs.push({ freq: em2.freq, level: em2.level(450) });
    det.step(dt, inputs);
    paintAcc += dt;
    if (paintAcc > 1 / 30) { painter.paint(det); paintAcc = 0; screenTex.needsUpdate = true; }

    spin.update(dt);
    const p = PS.productProgress || 0;
    pivot.rotation.set(0.16 - p * 0.12 + spin.pitch, -0.65 + p * 5.4 + spin.yaw, 0);
    pivot.scale.setScalar(0.84 + 0.2 * Math.sin(Math.min(1, p * 1.5) * Math.PI / 2));
    const wide = camera.aspect > 1.15;   // breed scherm: kastje rechts, tekst links
    pivot.position.set(wide ? 2.6 : 0, wide ? -0.5 : 0, 0);
    renderer.render(scene, camera);
  }

  if (PS.visibleLoop) PS.visibleLoop(pin, frame);
  else frame(0);
}

if (pin && canvas && PS.ScreenPainter) start();

export { buildDevice, logoTexture };
