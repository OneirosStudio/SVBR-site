/* ═══════════════════════════════════════════════════════
   SVBR® — Portfolio V2 · GSAP
   Données : data/projects.json (éditable via /admin — Decap CMS)
   Visuels : project.image (jpg/png/webp) ou project.video (mp4)
   ═══════════════════════════════════════════════════════ */

gsap.registerPlugin(Observer, SplitText, ScrollTrigger);

/* ── DATA (fallback si le JSON ne charge pas) ─ */
let PROJECTS = [
  { title: "SVBR®", cat: "PORTFOLIO — 2026", color: "#0E0D0B", dark: false, accent: "#C4E72E", tagline: "",
    role: "", year: "2026", client: "", deliv: "", desc: "", image: "", video: "" },
];
const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#§/¦≠";
const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const rm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let current = 0;
let projCurrent = 0;
let busy = false;
let activeView = "featured";
let heroGL = null;      // hero WebGL (null = repli CSS)
const isMobile = window.matchMedia("(max-width: 900px)").matches;
const pad2 = (n) => String(n).padStart(2, "0");
const slug = (t) => t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/* charge les projets depuis le CMS/JSON */
async function loadProjects() {
  try {
    const r = await fetch("data/projects.json", { cache: "no-store" });
    const j = await r.json();
    // projets sous NDA : fichier local non versionné (absent en ligne → ignoré)
    try {
      const lr = await fetch("data/projects.local.json", { cache: "no-store" });
      if (lr.ok) j.projects = [...j.projects, ...((await lr.json()).projects || [])];
    } catch { /* pas de projets locaux */ }
    if (j.projects?.length) {
      PROJECTS = j.projects.map((p) => ({
        title: p.title, year: p.year || "",
        status: p.status || "",
        cat: (p.year ? `${p.category} — ${p.year}` : p.category) + (p.status ? ` · ${p.status}` : ""),
        color: p.color || "#3344F0", dark: !!p.darkText,
        role: p.role || "", client: p.client || "", deliv: p.deliverables || "",
        desc: p.description || "", image: p.image || "", video: p.video || "",
        figma: p.figmaUrl || "",
        accent: p.accent || "#C4E72E",
        tagline: p.tagline || "",
        story: Array.isArray(p.story) ? p.story : null,
        gallery: Array.isArray(p.gallery) ? p.gallery.filter(Boolean) : [],
        layout: Array.isArray(p.galleryLayout) ? p.galleryLayout : null,
      }));
    }
  } catch (e) { /* fallback = défauts */ }
  // précharge : le hero du projet affiché d'abord, les autres en différé
  // (tout précharger d'un coup ralentissait le premier affichage)
  const preload = (i) => { const p = PROJECTS[i]; if (p?.image) { const im = new Image(); im.src = p.image; } };
  preload(0);
  setTimeout(() => { for (let k = 1; k < PROJECTS.length; k++) preload(k); }, 1500);
}

/* ── MEDIA : peint un fond (couleur + image/vidéo) ─ */
function paintBg(el, p) {
  el.style.background = p.color;
  el.innerHTML = "";
  if (p.video) {
    const v = document.createElement("video");
    v.src = p.video; v.muted = true; v.loop = true; v.autoplay = true; v.playsInline = true;
    v.className = "bg-media"; el.appendChild(v);
  } else if (p.image) {
    const im = document.createElement("img");
    im.src = p.image; im.alt = p.title; im.className = "bg-media"; el.appendChild(im);
  }
}
const hasMedia = (p) => !!(p.image || p.video);

/* ── CHROME : colonnes de grille ───────────── */
(() => {
  const cols = $("#chromeCols");
  for (let i = 0; i <= 12; i++) cols.appendChild(document.createElement("i"));
  const pg = $(".preloader__grid");
  for (let i = 0; i <= 12; i++) {
    const l = document.createElement("i");
    l.style.cssText = `position:absolute;top:0;bottom:0;width:1px;background:rgba(255,255,255,.07);left:${(100 / 12) * i}%`;
    pg.appendChild(l);
  }
})();

/* ── HORLOGE PARIS ─────────────────────────── */
setInterval(() => {
  $("#clock").textContent = new Date().toLocaleTimeString("fr-FR", { timeZone: "Europe/Paris", hour12: false });
}, 1000);

/* ── SCRAMBLE / DECODE ─────────────────────── */
function scramble(el, finalText = null, dur = 0.6) {
  const target = finalText ?? el.dataset.orig ?? el.textContent;
  el.dataset.orig = el.dataset.orig ?? el.textContent;
  const len = target.length;
  const obj = { p: 0 };
  return gsap.to(obj, {
    p: 1, duration: rm ? 0 : dur, ease: "none",
    onUpdate() {
      const reveal = Math.floor(obj.p * len);
      let out = "";
      for (let i = 0; i < len; i++) {
        out += i < reveal || /\s|[()\[\]→←↗✕·—]/.test(target[i])
          ? target[i]
          : GLYPHS[(Math.random() * GLYPHS.length) | 0];
      }
      el.textContent = out;
    },
    onComplete() { el.textContent = target; },
  });
}
$$("[data-scramble]").forEach((el) =>
  el.addEventListener("mouseenter", () => !el._scr?.isActive() && (el._scr = scramble(el, null, 0.5)))
);

/* ── CURSOR custom ─────────────────────────── */
(() => {
  if (!window.matchMedia("(hover:hover) and (pointer:fine)").matches || rm) return;
  document.body.classList.add("cursor-on");
  const cur = $("#cursor"), label = $("#cursorLabel");
  const xTo = gsap.quickTo(cur, "x", { duration: 0.35, ease: "power3.out" });
  const yTo = gsap.quickTo(cur, "y", { duration: 0.35, ease: "power3.out" });
  window.addEventListener("pointermove", (e) => { xTo(e.clientX); yTo(e.clientY); });
  const bindCursor = (root = document) => $$("[data-cursor]", root).forEach((el) => {
    el.addEventListener("mouseenter", () => { cur.classList.add("is-hover"); label.textContent = el.dataset.cursor; });
    el.addEventListener("mouseleave", () => { cur.classList.remove("is-hover"); label.textContent = ""; });
  });
  bindCursor();
  window._bindCursor = bindCursor;
})();

/* ── BOUTONS MAGNÉTIQUES ───────────────────── */
$$(".magnetic").forEach((el) => {
  if (rm) return;
  el.addEventListener("mousemove", (e) => {
    const r = el.getBoundingClientRect();
    gsap.to(el, { x: (e.clientX - r.left - r.width / 2) * 0.3, y: (e.clientY - r.top - r.height / 2) * 0.3, duration: 0.6, ease: "power3.out" });
  });
  el.addEventListener("mouseleave", () => gsap.to(el, { x: 0, y: 0, duration: 0.8, ease: "elastic.out(1,0.4)" }));
});

/* ── HERO ──────────────────────────────────── */
const heroTitle = $("#heroTitle");

function applyProject(i, skipTitle = false, skipBg = false) {
  const p = PROJECTS[i];
  $("#heroNum").textContent = `(${pad2(i + 1)})`;
  if (!skipTitle) heroTitle.textContent = p.title;
  $("#heroCat").textContent = p.cat;
  $("#heroTagline").textContent = p.tagline;
  $("#heroIdx").textContent = pad2(i + 1);
  $("#nextName").textContent = `SUIVANT — ${PROJECTS[(i + 1) % PROJECTS.length].title}`;
  // skipBg : pendant la transition, le fond de base ne doit PAS être repeint
  // en plein balayage (l'ancienne image disparaîtrait d'un coup — "saut")
  if (!skipBg && !heroGL) paintBg($("#heroBg"), p);
  // bouton play : uniquement si le projet a une vidéo de fond
  $("#heroPlay").style.display = p.video && !heroGL ? "" : "none";
  const fg = p.dark ? "#0E0D0B" : "#FFFFFF";
  gsap.set("#view-featured", { color: fg, "--accent": p.accent });
  $$(".hero__progress i b").forEach((b, k) => gsap.to(b, { scaleX: k === i ? 1 : 0, duration: 0.6, ease: "power2.out" }));
}

/* intro du titre — suivie globalement pour pouvoir être finalisée
   proprement si l'utilisateur scrolle avant la fin */
let introTween = null, introSplit = null;
function settleIntro() {
  if (introTween) { introTween.kill(); introTween = null; }
  if (introSplit) { introSplit.revert(); introSplit = null; }
}
function titleIn() {
  settleIntro();
  gsap.set(".hero__bottom", { autoAlpha: 1 });
  introSplit = new SplitText(heroTitle, { type: "chars" });
  introTween = gsap.fromTo(introSplit.chars,
    { yPercent: 110, rotate: 4, autoAlpha: 0 },
    { yPercent: 0, rotate: 0, autoAlpha: 1, duration: 0.9, ease: "power4.out",
      stagger: { each: 0.028, from: "start" },
      onComplete: () => { if (introSplit) { introSplit.revert(); introSplit = null; } introTween = null; } });
}
function metaIn() {
  gsap.fromTo(["#heroNum", "#heroCat", "#heroTagline", ".hero__nav", ".hero__legend"],
    { y: 18, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.7, ease: "power3.out", stagger: 0.07 });
}

/* anti-spam : délai obligatoire entre deux switches (molette rapide,
   trackpad à inertie…) pour ne jamais sauter d'étape */
let lastSwitch = 0;
const SWITCH_COOLDOWN = 450; // ms de repos APRÈS la fin de l'animation

function goTo(i, dir = 1) {
  const now = performance.now();
  if (busy || now - lastSwitch < SWITCH_COOLDOWN) return;
  const next = (i + PROJECTS.length) % PROJECTS.length;
  if (rm) { current = next; applyProject(next); heroGL?.show(next); lastSwitch = now; return; }
  busy = true;
  // WebGL : on attend que le visuel entrant soit décodé, puis on lance la transition
  if (heroGL) heroGL.prepare(next).then(() => runSwitch(next, dir), () => { busy = false; });
  else runSwitch(next, dir);
}
function runSwitch(next, dir) {
  const p = PROJECTS[next];

  const bgNext = $("#heroBgNext");
  let mediaIn = null, mediaOut = null;
  if (!heroGL) {
    paintBg(bgNext, p);
    /* balayage vertical accompagnant la cascade du titre :
       dir > 0 (projet suivant) → tout glisse VERS LE HAUT : l'image se révèle
       de bas en haut ; au retour (dir < 0), l'inverse */
    gsap.set(bgNext, { opacity: 1, clipPath: dir > 0 ? "inset(100% 0% 0% 0%)" : "inset(0% 0% 100% 0%)" });
    mediaIn = bgNext.querySelector(".bg-media");
    mediaOut = $("#heroBg").querySelector(".bg-media");
    if (mediaIn) gsap.set(mediaIn, { yPercent: 4 * dir, scale: 1.12 });
  }

  /* ── crossfade en cascade : l'ancien titre MONTE pendant que le
     nouveau arrive (clone superposé) — aucun échange brutal de texte ── */
  settleIntro(); // si l'intro est encore en cours, on la finalise (titre → texte plein, propre)
  const splitOut = new SplitText(heroTitle, { type: "chars" });
  const clone = heroTitle.cloneNode(false);
  clone.textContent = p.title;
  clone.style.cssText = `position:absolute;left:${heroTitle.offsetLeft}px;top:${heroTitle.offsetTop}px;margin:0;white-space:nowrap;`;
  heroTitle.parentNode.appendChild(clone);
  const splitIn = new SplitText(clone, { type: "chars" });
  gsap.set(splitIn.chars, { yPercent: 110 * dir, rotate: 3 * dir, autoAlpha: 0 });

  const tl = gsap.timeline({
    defaults: { ease: "power3.inOut" },
    onComplete() {
      splitOut.revert();               // restaure l'ancien texte…
      heroTitle.textContent = p.title; // …aussitôt remplacé (même frame, aucun flash)
      splitIn.revert();
      clone.remove();
      if (!heroGL) {
        /* bascule atomique : on DÉPLACE le média déjà décodé de next → base
           (aucun re-chargement, aucun flash, une vidéo continue de jouer) */
        const bg = $("#heroBg");
        bg.style.background = p.color;
        bg.innerHTML = "";
        while (bgNext.firstChild) bg.appendChild(bgNext.firstChild);
        gsap.set(bgNext, { opacity: 0 });
      }
      busy = false;
      lastSwitch = performance.now(); // le cooldown démarre à la FIN de l'anim
    },
  });

  tl.to(splitOut.chars, { yPercent: -110 * dir, autoAlpha: 0, duration: 0.55, ease: "power3.in",
        stagger: { each: 0.022, from: dir > 0 ? "start" : "end" } }, 0)
    .to(["#heroNum", "#heroCat", "#heroTagline"], { autoAlpha: 0, y: -12 * dir, duration: 0.3 }, 0)
    .add(() => { current = next; applyProject(next, true, true); }, 0.35) // méta/segments SANS toucher au titre ni au fond
    .to(splitIn.chars, { yPercent: 0, rotate: 0, autoAlpha: 1, duration: 0.8, ease: "power4.out",
        stagger: { each: 0.026, from: dir > 0 ? "start" : "end" } }, 0.4)
    .fromTo(["#heroNum", "#heroCat", "#heroTagline"], { autoAlpha: 0, y: 16 * dir },
        { autoAlpha: 1, y: 0, duration: 0.5, ease: "power3.out", stagger: 0.06 }, 0.55);
  if (heroGL) tl.add(heroGL.transition(next, dir, 1.2), 0.08);
  else tl.to(bgNext, { clipPath: "inset(0% 0% 0% 0%)", duration: 0.9, ease: "power3.inOut" }, 0.2);

  /* travelling léger : l'image entrante glisse et se pose avec la cascade,
     l'ancienne est doucement poussée dans le même sens (profondeur) */
  if (mediaIn) tl.to(mediaIn, { yPercent: 0, scale: 1, duration: 1.1, ease: "power3.out" }, 0.25);
  if (mediaOut) tl.to(mediaOut, { yPercent: -3 * dir, scale: 1.08, duration: 0.9, ease: "power2.inOut" }, 0.2);
}

/* molette / trackpad : scroll vers le bas = projet suivant */
Observer.create({
  target: "#view-featured",
  type: "wheel",
  tolerance: 60,
  preventDefault: true,
  onDown: () => activeView === "featured" && goTo(current + 1, 1),
  onUp: () => activeView === "featured" && goTo(current - 1, -1),
});
/* tactile / drag : Observer mesure le geste du doigt (inverse de la molette) —
   doigt qui glisse vers le HAUT = projet suivant (l'animation monte), et inversement */
Observer.create({
  target: "#view-featured",
  type: "touch,pointer",
  tolerance: 60,
  preventDefault: true,
  onUp: () => activeView === "featured" && goTo(current + 1, 1),
  onDown: () => activeView === "featured" && goTo(current - 1, -1),
  onLeft: () => activeView === "featured" && goTo(current + 1, 1),
  onRight: () => activeView === "featured" && goTo(current - 1, -1),
});
$("#nextBtn").addEventListener("click", () => goTo(current + 1, 1));
$("#prevBtn").addEventListener("click", () => goTo(current - 1, -1));
window.addEventListener("keydown", (e) => {
  if (activeView !== "featured") return;
  if (e.key === "ArrowRight" || e.key === "ArrowDown") goTo(current + 1, 1);
  if (e.key === "ArrowLeft" || e.key === "ArrowUp") goTo(current - 1, -1);
});
$("#heroProject").addEventListener("click", () => openProject(current));

/* ── INDEX + MENU + PROGRESS (dépendent des données) ─ */
function buildDataUI() {
  // segments de progression
  const prog = $("#heroProgress");
  prog.innerHTML = "";
  PROJECTS.forEach(() => { const i = document.createElement("i"); i.appendChild(document.createElement("b")); prog.appendChild(i); });
  $("#heroTotal").textContent = pad2(PROJECTS.length);
  // grille index
  const grid = $("#indexGrid");
  grid.innerHTML = "";
  PROJECTS.forEach((p, i) => {
    const a = document.createElement("a");
    a.className = "icard" + (p.dark ? " icard--dark-text" : "");
    a.href = "#project";
    a.dataset.cursor = "OUVRIR";
    a.innerHTML = `
      <span class="icard__bg" style="background:${p.color}">${p.image ? `<img src="${p.image}" class="bg-media" alt="">` : ""}</span>
      <span class="icard__top mono"><span>(${pad2(i + 1)})</span><span class="icard__arrow">↗</span></span>
      <span><span class="icard__title">${p.title}</span><br/><span class="icard__tag">${p.tagline}</span><span class="icard__cat mono">${p.cat}</span></span>`;
    a.addEventListener("click", (e) => { e.preventDefault(); openProject(i); });
    grid.appendChild(a);
  });
  $("#indexCount").textContent = pad2(PROJECTS.length);
  $("#menuCount").textContent = pad2(PROJECTS.length);
  // liste menu
  const ul = $("#menuProjects");
  ul.innerHTML = "";
  PROJECTS.forEach((p, i) => {
    const li = document.createElement("li");
    li.textContent = `${pad2(i + 1)} — ${p.title}`;
    li.addEventListener("click", () => openProject(i));
    ul.appendChild(li);
  });
  window._bindCursor?.($("#indexGrid"));
}

/* ── PROJECT VIEW (étude de cas scrollable, réf simonholm.studio/work) ── */
let galleryST = []; // ScrollTriggers de la galerie (tués à chaque changement de projet)
const SHADES = ["#2230CF", "#5233D6", "#141311", "#12B8C6", "#FF5C39", "#7B52F5"];
const shadeFor = (p, k) => SHADES.filter((c) => c.toLowerCase() !== p.color.toLowerCase())[k % 5];

function buildGallery(p) {
  const wrap = $("#pGallery");
  wrap.innerHTML = "";
  // images du CMS, sinon 5 placeholders colorés
  const items = p.gallery && p.gallery.length ? p.gallery : [null, null, null, null, null];
  // disposition explicite ("full"/"half" par visuel, cf. Figma) sinon motif alterné
  const layout = Array.isArray(p.layout) && p.layout.length === items.length ? p.layout : null;
  let k = 0, rowIdx = 0;
  while (k < items.length) {
    // kind : "full" (pleine largeur, hauteur fixe), "half" (2-up),
    // "auto" (pleine largeur, l'image impose sa hauteur — zéro crop)
    let kind, count;
    if (layout) {
      kind = layout[k] === "half" ? "half" : layout[k] === "auto" ? "auto" : "full";
      count = kind === "half" ? (layout[k + 1] === "half" ? 2 : 1) : 1;
    } else {
      kind = rowIdx % 2 === 0 ? "full" : "half"; // motif : pleine largeur, puis 2-up, etc.
      count = kind === "full" ? 1 : Math.min(2, items.length - k);
    }
    const isFull = kind === "full";
    const row = document.createElement("div");
    row.className = "pg-row pg-row--" + kind;
    for (let c = 0; c < count; c++) {
      const src = items[k];
      const it = document.createElement("figure");
      it.className = "pg-item";
      it.style.background = src ? "#141311" : shadeFor(p, k);
      if (src) {
        if (/\.(mp4|webm)$/i.test(src)) {
          const v = document.createElement("video");
          v.src = src; v.muted = true; v.loop = true; v.autoplay = true; v.playsInline = true;
          v.className = "bg-media"; it.appendChild(v);
        } else {
          const im = document.createElement("img");
          im.src = src; im.alt = p.title; im.loading = "lazy"; im.decoding = "async"; im.className = "bg-media";
          // visuel portrait dans une rangée pleine largeur → affichage entier
          // (object-fit: contain) au lieu d'un recadrage brutal
          if (isFull) {
            const markPortrait = () => { if (im.naturalHeight > im.naturalWidth * 1.05) it.classList.add("pg-item--contain"); };
            im.complete && im.naturalWidth ? markPortrait() : im.addEventListener("load", markPortrait, { once: true });
          }
          it.appendChild(im);
        }
      }
      const cap = document.createElement("span");
      cap.className = "pg-item__cap mono";
      cap.textContent = src ? `${p.title} — ${String(k + 1).padStart(2, "0")}`
        : p.status ? `◼ STATUS : ${p.status}`
        : `◼ IMAGE ${String(k + 1).padStart(2, "0")} — à remplacer (CMS)`;
      it.appendChild(cap);
      row.appendChild(it);
      k++;
    }
    wrap.appendChild(row);
    rowIdx++;
  }
}

/* ── RÉCIT : chapitres, médias et scène 3D (data.story) ── */
const isVideo = (src) => /\.(mp4|webm)$/i.test(src);
function mediaEl(src, alt) {
  if (isVideo(src)) {
    const v = document.createElement("video");
    Object.assign(v, { muted: true, loop: true, playsInline: true, preload: "none" });
    v.setAttribute("muted", ""); v.className = "bg-media"; v.dataset.lazyplay = ""; v.dataset.src = src;
    return v;
  }
  // chargement maison (voir galleryReveals) : fiable dans le conteneur scrollable
  const im = document.createElement("img");
  Object.assign(im, { alt, decoding: "async", className: "bg-media" });
  im.dataset.src = src;
  return im;
}
const esc = (t = "") => t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

function buildStory(p) {
  const wrap = $("#pGallery");
  wrap.innerHTML = "";
  wrap.classList.add("pstory");
  let chap = 0, fig = 0;
  p.story.forEach((b) => {
    if (b.type === "chapter") {
      chap++;
      const el = document.createElement("div");
      el.className = "pchap";
      el.innerHTML = `
        <span class="pchap__num mono">${pad2(chap)} —</span>
        <h3 class="pchap__title">${esc(b.title)}</h3>
        ${b.text ? `<p class="pchap__text">${esc(b.text)}</p>` : ""}`;
      wrap.appendChild(el);
    } else if (b.type === "media") {
      const layout = ["half", "auto", "full"].includes(b.layout) ? b.layout : "full";
      const row = document.createElement("div");
      row.className = "pg-row pg-row--" + layout;
      (b.items || []).forEach((src) => {
        fig++;
        const it = document.createElement("figure");
        it.className = "pg-item";
        it.appendChild(mediaEl(src, p.title));
        const cap = document.createElement("span");
        cap.className = "pg-item__cap mono";
        cap.textContent = `FIG. ${pad2(fig)}${b.caption && b.items.length === 1 ? " — " + b.caption.toUpperCase() : ""}`;
        it.appendChild(cap);
        if (layout === "full" && !isVideo(src)) {
          const im = it.querySelector("img");
          const mark = () => { if (im.naturalHeight > im.naturalWidth * 1.05) it.classList.add("pg-item--contain"); };
          im.complete && im.naturalWidth ? mark() : im.addEventListener("load", mark, { once: true });
        }
        row.appendChild(it);
      });
      if (b.caption && b.items.length > 1) row.dataset.caption = b.caption;
      wrap.appendChild(row);
    } else if (b.type === "board") {
      const st = document.createElement("section");
      st.className = "pboard";
      st.dataset.src = b.src;
      st.style.setProperty("--stage-accent", p.accent);
      st.innerHTML = `
        <div class="pboard__sticky">
          <div class="pboard__head">
            <span class="mono pboard__label">◼ PRÉSENTATION — DÉFILER</span>
            <h3 class="pboard__title">${esc(b.title || "")}</h3>
            <span class="pboard__bar"><b></b></span>
          </div>
          <div class="pboard__stage"><div class="pboard__frame"></div></div>
        </div>`;
      wrap.appendChild(st);
    }
  });
}

/* ── PLANCHES : la présentation de branding se construit pièce par pièce au scroll ── */
async function buildBoard(st) {
  const src = st.dataset.src;
  let meta;
  try { meta = await (await fetch(`${src}/meta.json`)).json(); } catch { return null; }
  const frame = $(".pboard__frame", st), stage = $(".pboard__stage", st);
  const ar = meta.w / meta.h;
  const img = (s) => { const i = new Image(); i.alt = ""; i.decoding = "async"; i.src = s; return i; };
  const bg = img(`${src}/bg.jpg`); bg.className = "pboard__bg";
  frame.appendChild(bg);
  const pieces = meta.pieces.map((pc, i) => {
    const el = document.createElement("div");
    el.className = `pboard__piece pboard__piece--${pc.kind}`;
    const [x, y, w, h] = pc.box;
    Object.assign(el.style, { left: `${x * 100}%`, top: `${y * 100}%`, width: `${w * 100}%`, height: `${h * 100}%` });
    const im = img(`${src}/p${i}.jpg`); el.appendChild(im);
    frame.appendChild(el);
    return { el, im, kind: pc.kind };
  });
  // la planche entière tient toujours à l'écran (contain), centrée sous le titre
  const layout = () => {
    const vw = stage.clientWidth, vh = stage.clientHeight;
    if (!vw || !vh) return;
    const w = Math.min(vw, vh * ar), h = w / ar;
    Object.assign(frame.style, { width: `${w}px`, height: `${h}px`, left: `${(vw - w) / 2}px`, top: `${(vh - h) / 2}px` });
  };
  layout();
  const ro = new ResizeObserver(layout); ro.observe(stage);
  const all = [bg, ...pieces.map((p) => p.im)];
  await Promise.all(all.map((i) => (i.complete ? null : new Promise((r) => { i.onload = i.onerror = r; }))));
  st.classList.add("is-live");
  return { pieces, frame, ro };
}

function boardTimeline(s) {
  const tl = gsap.timeline({ paused: true, defaults: { ease: "power3.out" } });
  const n = s.pieces.length, span = 0.78, step = span / n;
  tl.fromTo(s.frame, { scale: 1.04 }, { scale: 1, duration: 1, ease: "none" }, 0);
  s.pieces.forEach((pc, i) => {
    const at = 0.04 + i * step, dur = step * 1.6;
    if (pc.kind === "swatch") {
      tl.fromTo(pc.el, { clipPath: "inset(0% 100% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: dur, immediateRender: true }, at);
    } else if (pc.kind === "float") {
      tl.fromTo(pc.el, { autoAlpha: 0, yPercent: 10, scale: 0.96 }, { autoAlpha: 1, yPercent: 0, scale: 1, duration: dur, immediateRender: true }, at);
    } else {
      tl.fromTo(pc.el, { clipPath: "inset(0% 0% 100% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: dur, immediateRender: true }, at)
        .fromTo(pc.im, { scale: 1.18 }, { scale: 1, duration: dur * 1.3, immediateRender: true }, at);
    }
  });
  tl.to({}, { duration: 0.12 }); // temps de pose : la planche complète reste à l'écran
  return tl;
}

let boards = [];
function disposeBoards() {
  boards.forEach((x) => { x.tl && x.tl.kill(); x.ro && x.ro.disconnect(); });
  boards = [];
}

function galleryReveals() {
  const scroller = $("#projectScroll");
  // vidéos : ne jouent que visibles (économie batterie)
  const vio = new IntersectionObserver((ents) => ents.forEach((en) => {
    const v = en.target;
    if (en.isIntersecting) v.play().catch(() => {}); else v.pause();
  }), { root: scroller, threshold: 0.15 });
  $$("video[data-lazyplay]", scroller).forEach((v) => vio.observe(v));
  // médias : chargés 1,5 écran avant d'apparaître (le lazy natif est peu fiable
  // dans une vue cachée / un conteneur à scroll interne) + recalcul des déclencheurs
  let rf;
  const relayout = () => { clearTimeout(rf); rf = setTimeout(() => ScrollTrigger.refresh(), 200); };
  const lio = new IntersectionObserver((ents) => ents.forEach((en) => {
    if (!en.isIntersecting) return;
    const el = en.target;
    lio.unobserve(el);
    el.addEventListener(el.tagName === "VIDEO" ? "loadeddata" : "load", relayout, { once: true });
    el.src = el.dataset.src;
    if (el.tagName === "VIDEO") { el.preload = "auto"; el.load(); }
  }), { root: scroller, rootMargin: "150% 0px" });
  $$("[data-src]", scroller).forEach((el) => lio.observe(el));
  galleryST.push({ kill: () => { vio.disconnect(); lio.disconnect(); } });

  // planches : se construisent au fil du scroll (section « collante »)
  $$(".pboard", scroller).forEach((st) => {
    const bar = $(".pboard__bar b", st);
    const rec = { tl: null, p: 0 };
    boards.push(rec);
    buildBoard(st).then((s) => {
      if (!s || !st.isConnected) return;
      rec.tl = boardTimeline(s); rec.ro = s.ro;
      rec.tl.progress(rm ? 1 : rec.p);
    });
    const t = ScrollTrigger.create({
      trigger: st, scroller, start: "top top", end: "bottom bottom", scrub: rm ? false : 0.5,
      onUpdate(self) {
        rec.p = self.progress;
        if (rec.tl) rec.tl.progress(rm ? 1 : self.progress);
        bar.style.transform = `scaleX(${self.progress})`;
      },
    });
    galleryST.push(t);
  });
  if (rm) return;

  // chapitres : numéro qui se décode, titre ligne à ligne, texte qui monte
  $$(".pchap", scroller).forEach((ch) => {
    const title = $(".pchap__title", ch);
    const outer = new SplitText(title, { type: "lines", linesClass: "split-line" });
    const inner = new SplitText(outer.lines, { type: "lines" });
    const tl = gsap.timeline({ scrollTrigger: { trigger: ch, scroller, start: "top 82%" } });
    tl.add(() => scramble($(".pchap__num", ch), null, 0.7))
      .fromTo(inner.lines, { yPercent: 110 }, { yPercent: 0, duration: 1, ease: "power4.out", stagger: 0.09 }, 0)
      .fromTo($(".pchap__text", ch), { y: 28, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.9, ease: "power3.out" }, 0.2);
    galleryST.push(tl.scrollTrigger);
  });

  // visuels : rideau qui s'ouvre + zoom arrière, puis parallaxe
  $$(".pg-item", scroller).forEach((it) => {
    const media = it.querySelector(".bg-media");
    const tw = gsap.timeline({ scrollTrigger: { trigger: it, scroller, start: "top 90%" } });
    tw.fromTo(it, { clipPath: "inset(14% 8% 14% 8%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.3, ease: "expo.out" });
    if (media) tw.fromTo(media, { scale: 1.25 }, { scale: 1, duration: 1.6, ease: "expo.out" }, 0);
    tw.fromTo($(".pg-item__cap", it), { autoAlpha: 0, y: 10 }, { autoAlpha: 0.75, y: 0, duration: 0.6 }, 0.5);
    galleryST.push(tw.scrollTrigger);
    const auto = it.closest(".pg-row--auto");
    if (media && !auto) {
      const par = gsap.fromTo(media, { yPercent: -5 }, { yPercent: 5, ease: "none", immediateRender: false,
        scrollTrigger: { trigger: it, scroller, scrub: true, start: "top bottom", end: "bottom top" } });
      galleryST.push(par.scrollTrigger);
    }
  });

  // infos + footer suivant
  const lead = gsap.fromTo([".pinfo__lead", ".pinfo__figma"], { y: 34, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.9, stagger: 0.1, ease: "power3.out",
    scrollTrigger: { trigger: ".pinfo", scroller, start: "top 82%" } });
  const meta = gsap.fromTo(".pinfo__meta div", { y: 18, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.6, stagger: 0.08, ease: "power3.out",
    scrollTrigger: { trigger: ".pinfo", scroller, start: "top 78%" } });
  const nxt = gsap.fromTo(".pnext__title", { x: -40, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 0.8, ease: "power3.out",
    scrollTrigger: { trigger: ".pnext", scroller, start: "top 85%" } });
  // le visuel du hero recule et s'assombrit quand on entre dans le récit
  const ph = gsap.to("#projectBg", { yPercent: 18, scale: 1.08, filter: "brightness(0.45)", ease: "none",
    scrollTrigger: { trigger: ".phero", scroller, start: "top top", end: "bottom top", scrub: true } });
  galleryST.push(lead.scrollTrigger, meta.scrollTrigger, nxt.scrollTrigger, ph.scrollTrigger);
  // barre de lecture
  const rd = ScrollTrigger.create({ scroller, start: 0, end: "max", onUpdate: (s) => gsap.set("#readBar", { scaleX: s.progress }) });
  galleryST.push(rd);
}

function populateProject(i) {
  const p = PROJECTS[i];
  projCurrent = i;
  try { history.replaceState(null, "", `#projet-${slug(p.title)}`); } catch {}
  galleryST.forEach((st) => st && st.kill());
  galleryST = [];
  disposeBoards();
  paintBg($("#projectBg"), p);
  gsap.set("#projectBg", { clearProps: "transform,filter" });
  $("#view-project").style.setProperty("--accent", p.accent);
  $("#projectCounter").textContent = `PROJET N°${pad2(i + 1)} / ${pad2(PROJECTS.length)}`;
  $("#pbNum").textContent = `(${pad2(i + 1)})`;
  $("#pcTitle").textContent = p.title;
  $("#pcCat").textContent = p.cat;
  $("#pcTagline").textContent = p.tagline;
  $("#pcDesc").textContent = p.desc;
  // lien Figma du projet : visible seulement si une URL est renseignée
  const fig = $("#pcFigma");
  if (p.figma) { fig.href = p.figma; fig.style.display = ""; }
  else { fig.style.display = "none"; }
  $("#pcRole").textContent = p.role;
  $("#pcYear").textContent = p.year;
  $("#pcClient").textContent = p.client;
  $("#pcDeliv").textContent = p.deliv;
  $$("#view-project .play").forEach((b) => (b.style.display = p.video ? "" : "none"));
  gsap.set(".phero", { color: p.dark ? "#0E0D0B" : "#FFFFFF" });
  // footer "projet suivant" (visuel + couleur du prochain projet)
  const np = PROJECTS[(i + 1) % PROJECTS.length];
  const nf = $("#pNextFooter");
  nf.style.background = np.color;
  nf.style.color = np.dark ? "#0E0D0B" : "#FFFFFF";
  $("#pNextBg").style.backgroundImage = np.image ? `url("${np.image}")` : "none";
  $("#pNextTitle").textContent = np.title;
  $("#pNextCat").textContent = `${np.cat}  →`;
  if (p.story && p.story.length) buildStory(p);
  else { $("#pGallery").classList.remove("pstory"); buildGallery(p); }
  $("#projectScroll").scrollTop = 0;
  window._bindCursor?.($("#pGallery"));
  // images lazy : leur chargement décale la page → on recalcule les déclencheurs
  galleryReveals();
  ScrollTrigger.refresh();
}
function projectIntro() {
  const split = new SplitText("#pcTitle", { type: "chars" });
  gsap.fromTo(split.chars, { yPercent: 110, autoAlpha: 0 },
    { yPercent: 0, autoAlpha: 1, duration: 0.8, ease: "power4.out", stagger: 0.025, onComplete: () => split.revert() });
  gsap.fromTo([".phero__top", ".phero__bottom"], { y: 14, autoAlpha: 0 },
    { y: 0, autoAlpha: 1, duration: 0.6, ease: "power3.out", stagger: 0.08 });
  gsap.fromTo("#projectBg", { scale: 1.18 }, { scale: 1, duration: 1.8, ease: "expo.out" });
  ScrollTrigger.refresh();
}
function openProject(i) {
  const p = PROJECTS[i];
  if (activeView === "project") return curtainTo(() => { populateProject(i); }, p, () => projectIntro());
  populateProject(i);
  switchView("project", p);
}
$("#pPrev").addEventListener("click", () => openProject((projCurrent - 1 + PROJECTS.length) % PROJECTS.length));
$("#pNextFooter").addEventListener("click", (e) => { e.preventDefault(); openProject((projCurrent + 1) % PROJECTS.length); });
$("#backTop").addEventListener("click", () => $("#projectScroll").scrollTo({ top: 0, behavior: rm ? "auto" : "smooth" }));

/* ── VIEW MANAGER ──────────────────────────── */
const VIEW_LABELS = { featured: "FEATURED", index: "INDEX", project: "PROJET", about: "ABOUT", contact: "CONTACT" };
function introFor(view) {
  if (view === "featured") { titleIn(); metaIn(); }
  if (view === "index") gsap.fromTo(".icard", { y: 40, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.7, ease: "power3.out", stagger: { each: 0.07, from: "start" } });
  if (view === "project") projectIntro();
  if (view === "about") {
    const split = new SplitText("#aboutStmt", { type: "lines", linesClass: "split-line" });
    const inner = new SplitText("#aboutStmt", { type: "lines" });
    gsap.fromTo(inner.lines, { yPercent: 110 }, { yPercent: 0, duration: 1, ease: "power4.out", stagger: 0.1, onComplete: () => { inner.revert(); split.revert(); } });
    gsap.fromTo(".pcard--about", { x: 40, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 0.8, ease: "power3.out", delay: 0.25 });
  }
  if (view === "contact") {
    const split = new SplitText("#contactTitle", { type: "lines", linesClass: "split-line" });
    const inner = new SplitText("#contactTitle", { type: "lines" });
    gsap.fromTo(inner.lines, { yPercent: 110 }, { yPercent: 0, duration: 1, ease: "power4.out", stagger: 0.1, onComplete: () => { inner.revert(); split.revert(); } });
    gsap.fromTo([".contact__mail", ".contact__socials", ".cform"], { y: 26, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.7, ease: "power3.out", stagger: 0.09, delay: 0.2 });
  }
}
/* rideau de transition : couleur + libellé du projet ciblé si fourni */
let curtainBusy = false;
function curtainTo(swap, proj, after) {
  if (curtainBusy) return;
  curtainBusy = true;
  clearTimeout(curtainTo._guard);
  curtainTo._guard = setTimeout(() => (curtainBusy = false), 3000);
  const curtain = $("#curtain"), label = $("#curtainLabel");
  curtain.style.background = proj ? proj.color : "";
  curtain.style.color = proj ? (proj.dark ? "#0E0D0B" : "#FFFFFF") : "";
  closeMenu(true);
  const tl = gsap.timeline({ onComplete: () => (curtainBusy = false) });
  tl.set(curtain, { visibility: "visible", transformOrigin: "bottom" })
    .to(curtain, { scaleY: 1, duration: rm ? 0 : 0.6, ease: "power4.inOut" })
    .fromTo(label, { autoAlpha: 0, letterSpacing: "0.6em" }, { autoAlpha: 1, letterSpacing: "0.35em", duration: 0.3 }, "<+=0.2")
    .add(swap)
    .to(label, { autoAlpha: 0, duration: 0.2 }, "+=0.15")
    .set(curtain, { transformOrigin: "top" })
    .to(curtain, { scaleY: 0, duration: rm ? 0 : 0.6, ease: "power4.inOut" })
    .set(curtain, { visibility: "hidden" })
    .add(() => after && after(), "-=0.4");
  label.textContent = proj ? proj.title.toUpperCase() : label.textContent;
}
function switchView(view, proj = null) {
  if (view === activeView) { closeMenu(); return; }
  $("#curtainLabel").textContent = VIEW_LABELS[view];
  curtainTo(() => {
    const leaving = activeView;
    $$(".view").forEach((v) => v.classList.remove("is-active"));
    $(`#view-${view}`).classList.add("is-active");
    document.body.dataset.view = view;
    activeView = view;
    $("#viewTag").textContent = VIEW_LABELS[view];
    $$(".header__nav a").forEach((a) => a.classList.toggle("is-active", a.dataset.viewLink === view));
    // GPU : le hero ne tourne que visible, la scène 3D n'existe que dans l'étude de cas
    if (heroGL) view === "featured" ? heroGL.resume() : heroGL.pause();
    if (leaving === "project") disposeBoards();
    if (view !== "project") try { history.replaceState(null, "", `#${view}`); } catch {}
    if (view === "project") ScrollTrigger.refresh();
  }, proj, () => introFor(view));
}
$$("[data-view-link]").forEach((el) =>
  el.addEventListener("click", (e) => { e.preventDefault(); switchView(el.dataset.viewLink); })
);

/* ── MENU OVERLAY ──────────────────────────── */
const menu = $("#menu");
let menuOpen = false;
function openMenu() {
  if (menuOpen) return;
  menuOpen = true;
  gsap.timeline()
    .set(menu, { visibility: "visible" })
    .to(menu, { clipPath: "inset(0 0 0% 0)", duration: rm ? 0 : 0.7, ease: "power4.inOut" })
    .fromTo(".menu__item", { y: 60, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.7, ease: "power3.out", stagger: 0.07 }, "-=0.25")
    .fromTo([".menu__info > div", ".menu__foot"], { y: 20, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.5, ease: "power3.out", stagger: 0.06 }, "-=0.5");
}
function closeMenu(instant = false) {
  if (!menuOpen) return;
  menuOpen = false;
  gsap.timeline()
    .to(menu, { clipPath: "inset(0 0 100% 0)", duration: instant || rm ? 0 : 0.55, ease: "power4.inOut" })
    .set(menu, { visibility: "hidden" });
}
$("#burger").addEventListener("click", openMenu);
$("#menuClose").addEventListener("click", () => closeMenu());
window.addEventListener("keydown", (e) => e.key === "Escape" && closeMenu());

/* ── MARQUEE ───────────────────────────────── */
(() => {
  const track = $("#aboutMarquee");
  track.innerHTML = track.innerHTML.repeat(4);
  if (!rm) gsap.to(track, { xPercent: -50, duration: 20, ease: "none", repeat: -1 });
})();

/* ── FORM ──────────────────────────────────── */
$("#cform").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.target;
  const btn = $(".cform__send");
  try {
    // envoi réel via Netlify Forms (les messages arrivent dans Netlify → Forms)
    await fetch("/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(new FormData(form)).toString(),
    });
    scramble(btn, "ENVOYÉ ✓", 0.5);
    form.reset();
  } catch {
    scramble(btn, "ERREUR — RÉESSAYER", 0.5);
  }
  gsap.fromTo(btn, { scale: 0.96 }, { scale: 1, duration: 0.5, ease: "back.out(2)" });
});

/* ── PRELOADER → intro ─────────────────────── */
/* .hero__bottom caché aussi → la 1re cascade du titre reste bien visible */
gsap.set([".hero__center", ".header", ".hero__bottom"], { autoAlpha: 0 });

window.addEventListener("load", async () => {
  await loadProjects();
  // hero WebGL (repli CSS automatique si WebGL / module indisponible)
  if (window.SVBR_GL) {
    try {
      const gl = window.SVBR_GL.createHero($("#view-featured"), PROJECTS, gsap);
      await Promise.race([gl.show(0), new Promise((r) => setTimeout(r, 4000))]);
      heroGL = gl;
      document.body.classList.add("gl-on");
    } catch (e) { console.warn("Hero WebGL indisponible", e); }
  }
  buildDataUI();
  applyProject(0);
  // lien direct vers un projet : #projet-2gzr
  const deep = location.hash.match(/^#projet-(.+)$/);

  const count = { v: 0 };
  const pre = $("#preloader");
  const tl = gsap.timeline();
  scramble($("#preScramble"), "CHARGEMENT — SVBR®", 1.1);
  tl.to(count, {
      v: 100, duration: rm ? 0 : 1.4, ease: "power2.inOut",
      onUpdate: () => ($("#preCount").textContent = String(Math.round(count.v)).padStart(3, "0")),
    })
    .to(pre, { yPercent: -100, duration: rm ? 0 : 0.8, ease: "power4.inOut" }, "+=0.15")
    .set(pre, { display: "none" })
    .add(() => { titleIn(); metaIn(); }, "-=0.25")
    .fromTo(".header", { y: -24, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.7, ease: "power3.out" }, "-=0.3")
    .fromTo(".hero__center", { scale: 0.92, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.8, ease: "power3.out" }, "-=0.5")
    .add(() => {
      if (!deep) return;
      const i = PROJECTS.findIndex((p) => slug(p.title) === deep[1]);
      if (i >= 0) openProject(i);
    });
});
