/* PrioSense — hero: een veld van lichtpuntjes in kringen, als een radiosignaal.
   Om en om rolt er een blauwe en een rode puls doorheen, zoals zwaailichten. */
import * as THREE from 'three';

const PS = window.PS || {};
const canvas = document.querySelector('.signal');
const hero = document.querySelector('.hero');
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let renderer = null;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
} catch (e) {
  document.documentElement.classList.add('no-webgl');
}
if (renderer && canvas && hero) init();

function init() {
  renderer.setClearColor(0x050608, 1);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 200);

  /* ── Puntjes op kringen ─────────────────────────────────────────────── */
  const R0 = 1.4, R1 = 46, RINGS = 110;
  const density = window.innerWidth < 700 ? 1.4 : 2.2;
  const radius = [], angle = [], rand = [];
  for (let i = 0; i < RINGS; i++) {
    const r = R0 + (R1 - R0) * Math.pow(i / (RINGS - 1), 1.15);
    const n = Math.floor(2 * Math.PI * r * density);
    const off = Math.random() * Math.PI * 2;
    for (let j = 0; j < n; j++) {
      radius.push(r + (Math.random() - 0.5) * 0.08);
      angle.push(off + (j / n) * Math.PI * 2);
      rand.push(Math.random());
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(radius.length * 3), 3));
  geo.setAttribute('aRadius', new THREE.Float32BufferAttribute(radius, 1));
  geo.setAttribute('aAngle', new THREE.Float32BufferAttribute(angle, 1));
  geo.setAttribute('aRand', new THREE.Float32BufferAttribute(rand, 1));

  const uniforms = {
    uTime: { value: 0 },
    uPixel: { value: 1 },
    uIntro: { value: reduced ? 1 : 0 },
    uFade: { value: 0 },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      uniform float uTime, uPixel, uIntro, uFade;
      attribute float aRadius, aAngle, aRand;
      varying vec3 vColor;
      varying float vAlpha;
      const vec3 BASE = vec3(0.13, 0.24, 0.40);
      const vec3 BLUE = vec3(0.23, 0.63, 1.0);
      const vec3 RED  = vec3(1.0, 0.23, 0.23);
      float pulse(float r, float t) {
        float ph = mod(t, 3.2);
        float d = r - ph * 16.0;
        return exp(-d * d * 0.16) * (1.0 - ph / 3.2);
      }
      void main() {
        float r = aRadius;
        float pb = pulse(r, uTime);
        float pr = pulse(r, uTime + 1.6);
        float wave = sin(r * 0.42 - uTime * 1.3) * 0.22 + sin(aAngle * 6.0 + uTime * 0.5 + r * 0.1) * 0.1;
        vec3 p = vec3(cos(aAngle) * r, wave * smoothstep(1.0, 8.0, r) + (pb + pr) * 1.5, sin(aAngle) * r);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = (1.2 + aRand * 1.6 + (pb + pr) * 5.0) * uPixel * (16.0 / -mv.z);
        vec3 col = BASE * (0.55 + aRand * 0.7);
        col = mix(col, BLUE, clamp(pb * 1.4, 0.0, 1.0));
        col = mix(col, RED, clamp(pr * 1.4, 0.0, 1.0));
        vColor = col;
        float reach = uIntro * 62.0;
        float vis = smoothstep(reach, reach - 8.0, r);
        vAlpha = vis * smoothstep(${R1.toFixed(1)}, ${(R1 * 0.5).toFixed(1)}, r)
               * (0.45 + 0.6 * max(pb, pr) + aRand * 0.2) * (1.0 - uFade);
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        vec2 c = gl_PointCoord - 0.5;
        float d = dot(c, c);
        if (d > 0.25) discard;
        gl_FragColor = vec4(vColor, smoothstep(0.25, 0.0, d) * vAlpha);
      }`,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  scene.add(points);

  /* ── Gloeiende kern: de eenheid die zendt ───────────────────────────── */
  const glowTex = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, 'rgba(255,255,255,1)');
    grd.addColorStop(0.2, 'rgba(255,255,255,0.55)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  })();
  const core = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  core.position.set(0, 0.6, 0);
  scene.add(core);
  const blue = new THREE.Color(0x3aa0ff), red = new THREE.Color(0xff3b3b);

  /* ── Formaat, muis en scroll ────────────────────────────────────────── */
  const resize = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    const dpr = Math.min(1.75, window.devicePixelRatio || 1);
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    uniforms.uPixel.value = dpr;
    camera.aspect = w / h;
    camera.fov = w / h < 0.8 ? 62 : 48;
    camera.updateProjectionMatrix();
  };
  new ResizeObserver(resize).observe(canvas);
  resize();

  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  window.addEventListener('pointermove', (e) => {
    mouse.tx = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.ty = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });

  let introT = reduced ? 1 : 0, introOn = reduced;
  window.addEventListener('ps:intro', () => { introOn = true; });

  function frame(dt) {
    uniforms.uTime.value += dt;
    if (introOn && introT < 1) introT = Math.min(1, introT + dt / 2.4);
    uniforms.uIntro.value = 1 - Math.pow(1 - introT, 3);

    const prog = Math.min(1, window.scrollY / Math.max(1, hero.offsetHeight));
    uniforms.uFade.value = prog * 0.85;

    mouse.x += (mouse.tx - mouse.x) * Math.min(1, dt * 2.5);
    mouse.y += (mouse.ty - mouse.y) * Math.min(1, dt * 2.5);
    camera.position.set(mouse.x * 2.4, 6.5 - mouse.y * 1.2 + prog * 7, 24 - prog * 4);
    camera.lookAt(0, prog * 2, -4);
    points.rotation.y += dt * 0.025;

    const t = uniforms.uTime.value % 3.2;
    const tr = (uniforms.uTime.value + 1.6) % 3.2;
    const kb = Math.exp(-t * 3), kr = Math.exp(-tr * 3);
    core.material.color.copy(blue).multiplyScalar(kb).add(red.clone().multiplyScalar(kr)).addScalar(0.15);
    core.scale.setScalar((2.4 + 3.5 * Math.max(kb, kr)) * uniforms.uIntro.value);
    core.material.opacity = 1 - uniforms.uFade.value;

    renderer.render(scene, camera);
  }

  if (reduced) {
    uniforms.uTime.value = 1.1;
    frame(0);
    new ResizeObserver(() => frame(0)).observe(canvas);
  } else if (PS.visibleLoop) {
    PS.visibleLoop(hero, frame);
  }
}
