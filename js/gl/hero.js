/* ═══════════════════════════════════════════════════════
   SVBR® — Hero WebGL
   Plan plein écran en shader : transition « liquide » entre
   projets (déplacement bruité + aberration chromatique),
   profondeur à la souris, grain argentique et vignette.
   ═══════════════════════════════════════════════════════ */
import * as THREE from "three";

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uTex0, uTex1;
  uniform vec2 uSize0, uSize1, uRes, uMouse;
  uniform float uProgress, uDir, uTime, uHover, uVel;
  uniform vec3 uColor0, uColor1;
  uniform float uHas0, uHas1;

  // bruit de valeur + fbm (bords organiques de la transition)
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }
  float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.02; a *= 0.5; } return v; }

  // UV « object-fit: cover »
  vec2 coverUv(vec2 uv, vec2 size) {
    float rs = uRes.x / uRes.y, ri = size.x / max(size.y, 1.0);
    vec2 s = rs > ri ? vec2(1.0, ri / rs) : vec2(rs / ri, 1.0);
    return (uv - 0.5) * s + 0.5;
  }

  vec3 sampleRGB(sampler2D t, vec2 uv, vec2 size, float split, vec2 dir, vec3 fallback, float has) {
    vec2 c = coverUv(uv, size);
    vec3 col = vec3(
      texture2D(t, c + dir * split).r,
      texture2D(t, c).g,
      texture2D(t, c - dir * split).b
    );
    return mix(fallback, col, has);
  }

  void main() {
    vec2 uv = vUv;
    float aspect = uRes.x / uRes.y;
    vec2 m = uMouse; // -1..1

    // profondeur : léger déplacement de perspective + respiration lente
    vec2 centered = uv - 0.5;
    float breath = 1.0 - 0.012 * sin(uTime * 0.25);
    vec2 par = m * 0.012 * (0.6 + length(centered));
    vec2 baseUv = 0.5 + centered * breath * 0.985 + par;

    // lentille douce autour du curseur
    vec2 mp = (m * 0.5 + 0.5);
    vec2 d = (uv - mp) * vec2(aspect, 1.0);
    float lens = exp(-dot(d, d) * 9.0) * uHover;
    baseUv -= d * lens * 0.035;

    // transition : front de vague bruité qui balaie verticalement
    float p = uProgress;
    float n = fbm(vec2(uv.x * 3.0, uv.y * 2.0 + uTime * 0.15));
    float axis = uDir > 0.0 ? 1.0 - uv.y : uv.y;           // le nouveau visuel monte (suivant)
    float edge = smoothstep(p * 1.35 - 0.2, p * 1.35 - 0.2 + 0.18, axis + (n - 0.5) * 0.45);
    float mask = 1.0 - edge;                                // 1 = nouveau visuel
    float band = smoothstep(0.0, 0.5, mask) * smoothstep(1.0, 0.5, mask); // zone du front

    vec2 push = vec2(0.0, uDir) * 0.22;
    vec2 uv0 = baseUv + push * p + vec2((n - 0.5) * 0.04, 0.0) * band;
    vec2 uv1 = 0.5 + (baseUv - 0.5) * (1.0 + 0.18 * (1.0 - p)) - push * (1.0 - p) * 0.6;

    float split = 0.0008 + band * 0.022 + uVel * 0.004;
    vec3 c0 = sampleRGB(uTex0, uv0, uSize0, split, vec2(0.0, 1.0), uColor0, uHas0);
    vec3 c1 = sampleRGB(uTex1, uv1, uSize1, split, vec2(0.0, 1.0), uColor1, uHas1);
    vec3 col = mix(c0, c1, mask);

    // lumière sur le front (reflet « liquide »)
    col += band * 0.18 * vec3(1.0, 0.98, 0.95);

    // vignette + grain
    float vig = smoothstep(1.15, 0.35, length(centered * vec2(aspect * 0.75, 1.0)));
    col *= mix(0.72, 1.0, vig);
    float g = hash(uv * uRes + fract(uTime * 7.0)) - 0.5;
    col += g * 0.045;

    gl_FragColor = vec4(col, 1.0);
  }
`;

const loader = new THREE.TextureLoader();
loader.setCrossOrigin("anonymous");

function mediaTexture(p) {
  return new Promise((resolve) => {
    if (p.video) {
      const v = document.createElement("video");
      Object.assign(v, { src: p.video, muted: true, loop: true, playsInline: true, autoplay: true, crossOrigin: "anonymous" });
      v.addEventListener("loadeddata", () => {
        v.play().catch(() => {});
        const t = new THREE.VideoTexture(v);
        t.colorSpace = THREE.SRGBColorSpace;
        resolve({ tex: t, size: new THREE.Vector2(v.videoWidth, v.videoHeight) });
      }, { once: true });
      v.addEventListener("error", () => resolve(null), { once: true });
    } else if (p.image) {
      loader.load(p.image, (t) => {
        t.colorSpace = THREE.SRGBColorSpace;
        t.minFilter = THREE.LinearFilter;
        t.generateMipmaps = false;
        resolve({ tex: t, size: new THREE.Vector2(t.image.width, t.image.height) });
      }, undefined, () => resolve(null));
    } else resolve(null);
  });
}

export function createHero(container, projects, gsap) {
  const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.className = "hero__gl";
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.Camera();
  const blank = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
  blank.needsUpdate = true;

  const uniforms = {
    uTex0: { value: blank }, uTex1: { value: blank },
    uSize0: { value: new THREE.Vector2(1, 1) }, uSize1: { value: new THREE.Vector2(1, 1) },
    uHas0: { value: 0 }, uHas1: { value: 0 },
    uColor0: { value: new THREE.Color("#111") }, uColor1: { value: new THREE.Color("#111") },
    uRes: { value: new THREE.Vector2(1, 1) },
    uMouse: { value: new THREE.Vector2(0, 0) },
    uProgress: { value: 0 }, uDir: { value: 1 }, uTime: { value: 0 }, uHover: { value: 0 }, uVel: { value: 0 },
  };
  const mat = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms, depthTest: false });
  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat));

  // cache des textures (une par projet, chargées à la demande)
  const cache = new Map();
  const getMedia = (i) => {
    if (!cache.has(i)) cache.set(i, mediaTexture(projects[i]));
    return cache.get(i);
  };

  const setSlot = (slot, media, color) => {
    uniforms[`uTex${slot}`].value = media ? media.tex : blank;
    uniforms[`uSize${slot}`].value = media ? media.size : new THREE.Vector2(1, 1);
    uniforms[`uHas${slot}`].value = media ? 1 : 0;
    uniforms[`uColor${slot}`].value.set(color);
  };

  const resize = () => {
    const w = container.clientWidth, h = container.clientHeight;
    renderer.setSize(w, h, false);
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    uniforms.uRes.value.set(w, h);
  };
  resize();
  window.addEventListener("resize", resize);

  // souris : position lissée + vitesse (alimente l'aberration)
  const target = new THREE.Vector2(), last = new THREE.Vector2();
  let hoverTarget = 0;
  container.addEventListener("pointermove", (e) => {
    const r = container.getBoundingClientRect();
    target.set(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1));
    hoverTarget = e.pointerType === "mouse" ? 1 : 0;
  });
  container.addEventListener("pointerleave", () => { hoverTarget = 0; target.set(0, 0); });

  let running = true;
  const clock = new THREE.Clock();
  const tick = () => {
    if (!running) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    uniforms.uTime.value += dt;
    const m = uniforms.uMouse.value;
    last.copy(m);
    m.lerp(target, 1 - Math.pow(0.001, dt));
    const vel = last.distanceTo(m) / Math.max(dt, 1e-3);
    uniforms.uVel.value += (Math.min(vel * 0.6, 1) - uniforms.uVel.value) * 0.1;
    uniforms.uHover.value += (hoverTarget - uniforms.uHover.value) * 0.05;
    renderer.render(scene, camera);
  };
  renderer.setAnimationLoop(tick);

  let current = -1;
  const api = {
    ready: false,
    async show(i) {
      const media = await getMedia(i);
      setSlot(0, media, projects[i].color);
      uniforms.uProgress.value = 0;
      current = i;
      api.ready = true;
      // précharge le voisinage
      getMedia((i + 1) % projects.length);
      getMedia((i - 1 + projects.length) % projects.length);
      return media;
    },
    /* charge le visuel entrant AVANT la transition (jamais de fondu vers du noir) */
    async prepare(next) {
      const media = await Promise.race([getMedia(next), new Promise((r) => setTimeout(() => r(null), 2500))]);
      setSlot(1, media, projects[next].color);
    },
    /* renvoie une timeline GSAP à insérer dans celle du titre (appeler prepare() avant) */
    transition(next, dir, duration = 1.15) {
      const tl = gsap.timeline();
      tl.call(() => { uniforms.uDir.value = dir; uniforms.uProgress.value = 0; }, null, 0);
      tl.to(uniforms.uProgress, { value: 1, duration, ease: "power2.inOut" }, 0.02);
      tl.call(() => {
        // le visuel entrant devient le visuel de base
        uniforms.uTex0.value = uniforms.uTex1.value;
        uniforms.uSize0.value = uniforms.uSize1.value;
        uniforms.uHas0.value = uniforms.uHas1.value;
        uniforms.uColor0.value.copy(uniforms.uColor1.value);
        uniforms.uProgress.value = 0;
        current = next;
        getMedia((next + dir + projects.length) % projects.length);
      });
      return tl;
    },
    pause() { running = false; renderer.setAnimationLoop(null); },
    resume() { if (running) return; running = true; clock.getDelta(); renderer.setAnimationLoop(tick); },
    get current() { return current; },
  };
  return api;
}
