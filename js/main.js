/* ═══════════════════════════════════════════════════════
   SVBR® — Portfolio V2 · GSAP
   Données : data/projects.json (éditable via /admin — Decap CMS)
   Visuels : project.image (jpg/png/webp) ou project.video (mp4)
   ═══════════════════════════════════════════════════════ */

gsap.registerPlugin(Observer, SplitText, ScrollTrigger);

/* ── DATA (fallback si le JSON ne charge pas) ─ */
let PROJECTS = [
  { title: "Neøn Festival", cat: "IDENTITÉ VISUELLE & MOTION — 2025", color: "#3344F0", dark: false,
    role: "DA · Identité · Motion", year: "2025", client: "Neøn Festival", deliv: "Logo, Charte, Habillage",
    desc: "Système d'identité génératif pensé pour le mouvement.", image: "", video: "" },
];
const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#§/¦≠";
const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const rm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let current = 0;
let projCurrent = 0;
let busy = false;
let activeView = "featured";

/* charge les projets depuis le CMS/JSON */
async function loadProjects() {
  try {
    const r = await fetch("data/projects.json", { cache: "no-store" });
    const j = await r.json();
    if (j.projects?.length) {
      PROJECTS = j.projects.map((p) => ({
        title: p.title, year: p.year || "",
        cat: p.year ? `${p.category} — ${p.year}` : p.category,
        color: p.color || "#3344F0", dark: !!p.darkText,
        role: p.role || "", client: p.client || "", deliv: p.deliverables || "",
        desc: p.description || "", image: p.image || "", video: p.video || "",
        figma: p.figmaUrl || "",
        gallery: Array.isArray(p.gallery) ? p.gallery.filter(Boolean) : [],
        layout: Array.isArray(p.galleryLayout) ? p.galleryLayout : null,
      }));
    }
  } catch (e) { /* fallback = défauts */ }
  // précharge les images
  PROJECTS.forEach((p) => { if (p.image) { const i = new Image(); i.src = p.image; } });
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
  $("#heroNum").textContent = `(0${i + 1})`;
  if (!skipTitle) heroTitle.textContent = p.title;
  $("#heroCat").textContent = p.cat;
  $("#heroIdx").textContent = `0${i + 1}`;
  $("#nextName").textContent = `SUIVANT — ${PROJECTS[(i + 1) % PROJECTS.length].title}`;
  // skipBg : pendant la transition, le fond de base ne doit PAS être repeint
  // en plein balayage (l'ancienne image disparaîtrait d'un coup — "saut")
  if (!skipBg) paintBg($("#heroBg"), p);
  $(".hero__note").style.opacity = hasMedia(p) ? 0 : 0.75;
  const fg = p.dark ? "#0E0D0B" : "#FFFFFF";
  gsap.set("#view-featured", { color: fg });
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
  gsap.fromTo(["#heroNum", "#heroCat", ".hero__nav", ".hero__legend"],
    { y: 18, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.7, ease: "power3.out", stagger: 0.07 });
}

/* anti-spam : délai obligatoire entre deux switches (molette rapide,
   trackpad à inertie…) pour ne jamais sauter d'étape */
let lastSwitch = 0;
const SWITCH_COOLDOWN = 800; // ms de repos APRÈS la fin de l'animation

function goTo(i, dir = 1) {
  const now = performance.now();
  if (busy || now - lastSwitch < SWITCH_COOLDOWN) return;
  const next = (i + PROJECTS.length) % PROJECTS.length;
  if (rm) { current = next; applyProject(next); lastSwitch = now; return; }
  busy = true;
  const p = PROJECTS[next];

  const bgNext = $("#heroBgNext");
  paintBg(bgNext, p);
  /* balayage vertical accompagnant la cascade du titre :
     dir > 0 → l'image se révèle de haut en bas (l'inverse au retour) */
  gsap.set(bgNext, { opacity: 1, clipPath: dir > 0 ? "inset(0% 0% 100% 0%)" : "inset(100% 0% 0% 0%)" });
  const mediaIn = bgNext.querySelector(".bg-media");
  const mediaOut = $("#heroBg").querySelector(".bg-media");
  if (mediaIn) gsap.set(mediaIn, { yPercent: -4 * dir, scale: 1.12 });

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
      /* bascule atomique : on DÉPLACE le média déjà décodé de next → base
         (aucun re-chargement, aucun flash, une vidéo continue de jouer) */
      const bg = $("#heroBg");
      bg.style.background = p.color;
      bg.innerHTML = "";
      while (bgNext.firstChild) bg.appendChild(bgNext.firstChild);
      gsap.set(bgNext, { opacity: 0 });
      busy = false;
      lastSwitch = performance.now(); // le cooldown démarre à la FIN de l'anim
    },
  });

  tl.to(splitOut.chars, { yPercent: -110 * dir, autoAlpha: 0, duration: 0.55, ease: "power3.in",
        stagger: { each: 0.022, from: dir > 0 ? "start" : "end" } }, 0)
    .to(["#heroNum", "#heroCat"], { autoAlpha: 0, y: -12 * dir, duration: 0.3 }, 0)
    .to(bgNext, { clipPath: "inset(0% 0% 0% 0%)", duration: 0.9, ease: "power3.inOut" }, 0.2)
    .add(() => { current = next; applyProject(next, true, true); }, 0.35) // méta/segments SANS toucher au titre ni au fond
    .to(splitIn.chars, { yPercent: 0, rotate: 0, autoAlpha: 1, duration: 0.8, ease: "power4.out",
        stagger: { each: 0.026, from: dir > 0 ? "start" : "end" } }, 0.4)
    .fromTo(["#heroNum", "#heroCat"], { autoAlpha: 0, y: 16 * dir },
        { autoAlpha: 1, y: 0, duration: 0.5, ease: "power3.out", stagger: 0.06 }, 0.55);

  /* travelling léger : l'image entrante glisse et se pose avec la cascade,
     l'ancienne est doucement poussée dans le même sens (profondeur) */
  if (mediaIn) tl.to(mediaIn, { yPercent: 0, scale: 1, duration: 1.1, ease: "power3.out" }, 0.25);
  if (mediaOut) tl.to(mediaOut, { yPercent: 3 * dir, scale: 1.08, duration: 0.9, ease: "power2.inOut" }, 0.2);
}

Observer.create({
  target: "#view-featured",
  type: "wheel,touch,pointer",
  tolerance: 60,
  preventDefault: true,
  onDown: () => activeView === "featured" && goTo(current + 1, 1),
  onUp: () => activeView === "featured" && goTo(current - 1, -1),
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
  $("#heroTotal").textContent = `0${PROJECTS.length}`;
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
      <span class="icard__top mono"><span>(0${i + 1})</span><span class="icard__arrow">↗</span></span>
      <span><span class="icard__title">${p.title}</span><br/><span class="icard__cat mono">${p.cat}</span></span>`;
    a.addEventListener("click", (e) => { e.preventDefault(); openProject(i); });
    grid.appendChild(a);
  });
  $("#indexCount").textContent = `0${PROJECTS.length}`;
  // liste menu
  const ul = $("#menuProjects");
  ul.innerHTML = "";
  PROJECTS.forEach((p, i) => {
    const li = document.createElement("li");
    li.textContent = `0${i + 1} — ${p.title}`;
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
  galleryST.forEach((st) => st && st.kill());
  galleryST = [];
  // images du CMS, sinon 5 placeholders colorés
  const items = p.gallery && p.gallery.length ? p.gallery : [null, null, null, null, null];
  // disposition explicite ("full"/"half" par visuel, cf. Figma) sinon motif alterné
  const layout = Array.isArray(p.layout) && p.layout.length === items.length ? p.layout : null;
  let k = 0, rowIdx = 0;
  while (k < items.length) {
    let isFull, count;
    if (layout) {
      isFull = layout[k] !== "half";
      count = isFull ? 1 : (layout[k + 1] === "half" ? 2 : 1);
    } else {
      isFull = rowIdx % 2 === 0; // motif : pleine largeur, puis 2-up, etc.
      count = isFull ? 1 : Math.min(2, items.length - k);
    }
    const row = document.createElement("div");
    row.className = "pg-row " + (isFull ? "pg-row--full" : "pg-row--half");
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
          im.src = src; im.alt = p.title; im.loading = "lazy"; im.className = "bg-media";
          it.appendChild(im);
        }
      }
      const cap = document.createElement("span");
      cap.className = "pg-item__cap mono";
      cap.textContent = src ? `${p.title} — ${String(k + 1).padStart(2, "0")}` : `◼ IMAGE ${String(k + 1).padStart(2, "0")} — à remplacer (CMS)`;
      it.appendChild(cap);
      row.appendChild(it);
      k++;
    }
    wrap.appendChild(row);
    rowIdx++;
  }
}

function galleryReveals() {
  if (rm) return;
  const scroller = $("#projectScroll");
  // révélation des visuels au scroll (clip + montée)
  $$(".pg-item").forEach((it) => {
    const tw = gsap.fromTo(it,
      { clipPath: "inset(10% 5% 10% 5%)", y: 60, autoAlpha: 0.4 },
      { clipPath: "inset(0% 0% 0% 0%)", y: 0, autoAlpha: 1, duration: 1, ease: "power3.out",
        scrollTrigger: { trigger: it, scroller, start: "top 88%" } });
    galleryST.push(tw.scrollTrigger);
    // parallax léger sur le média
    const media = it.querySelector(".bg-media");
    if (media) {
      const par = gsap.fromTo(media, { yPercent: -6 }, { yPercent: 6, ease: "none",
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
  galleryST.push(lead.scrollTrigger, meta.scrollTrigger, nxt.scrollTrigger);
}

function populateProject(i) {
  const p = PROJECTS[i];
  projCurrent = i;
  paintBg($("#projectBg"), p);
  $("#projectCounter").textContent = `PROJET N°0${i + 1} / 0${PROJECTS.length}`;
  $("#pbNum").textContent = `(0${i + 1})`;
  $("#pcTitle").textContent = p.title;
  $("#pcCat").textContent = p.cat;
  $("#pcDesc").textContent = p.desc;
  // lien Figma du projet : visible seulement si une URL est renseignée
  const fig = $("#pcFigma");
  if (p.figma) { fig.href = p.figma; fig.style.display = ""; }
  else { fig.style.display = "none"; }
  $("#pcRole").textContent = p.role;
  $("#pcYear").textContent = p.year;
  $("#pcClient").textContent = p.client;
  $("#pcDeliv").textContent = p.deliv;
  $$("#view-project .hero__note").forEach((n) => (n.style.opacity = hasMedia(p) ? 0 : 0.75));
  gsap.set(".phero", { color: p.dark ? "#0E0D0B" : "#FFFFFF" });
  // footer "projet suivant" (couleur du prochain projet)
  const np = PROJECTS[(i + 1) % PROJECTS.length];
  const nf = $("#pNextFooter");
  nf.style.background = np.color;
  nf.style.color = np.dark ? "#0E0D0B" : "#FFFFFF";
  $("#pNextTitle").textContent = np.title;
  $("#pNextCat").textContent = `${np.cat}  →`;
  buildGallery(p);
  $("#projectScroll").scrollTop = 0;
  galleryReveals();
}
function projectIntro() {
  const split = new SplitText("#pcTitle", { type: "chars" });
  gsap.fromTo(split.chars, { yPercent: 110, autoAlpha: 0 },
    { yPercent: 0, autoAlpha: 1, duration: 0.8, ease: "power4.out", stagger: 0.025, onComplete: () => split.revert() });
  gsap.fromTo([".phero__top", ".phero__bottom"], { y: 14, autoAlpha: 0 },
    { y: 0, autoAlpha: 1, duration: 0.6, ease: "power3.out", stagger: 0.08 });
  ScrollTrigger.refresh();
}
function openProject(i) { populateProject(i); switchView("project"); }
$("#pPrev").addEventListener("click", () => { populateProject((projCurrent - 1 + PROJECTS.length) % PROJECTS.length); projectIntro(); });
$("#pNextFooter").addEventListener("click", (e) => { e.preventDefault(); populateProject((projCurrent + 1) % PROJECTS.length); projectIntro(); });
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
function switchView(view) {
  if (view === activeView) { closeMenu(); return; }
  const curtain = $("#curtain"), label = $("#curtainLabel");
  label.textContent = VIEW_LABELS[view];
  closeMenu(true);
  const tl = gsap.timeline();
  tl.set(curtain, { visibility: "visible", transformOrigin: "bottom" })
    .to(curtain, { scaleY: 1, duration: rm ? 0 : 0.55, ease: "power4.inOut" })
    .fromTo(label, { autoAlpha: 0, letterSpacing: "0.6em" }, { autoAlpha: 1, letterSpacing: "0.35em", duration: 0.3 }, "<+=0.2")
    .add(() => {
      $$(".view").forEach((v) => v.classList.remove("is-active"));
      $(`#view-${view}`).classList.add("is-active");
      document.body.dataset.view = view;
      activeView = view;
      $("#viewTag").textContent = VIEW_LABELS[view];
      $$(".header__nav a").forEach((a) => a.classList.toggle("is-active", a.dataset.viewLink === view));
    })
    .to(label, { autoAlpha: 0, duration: 0.2 }, "+=0.1")
    .set(curtain, { transformOrigin: "top" })
    .to(curtain, { scaleY: 0, duration: rm ? 0 : 0.55, ease: "power4.inOut" })
    .set(curtain, { visibility: "hidden" })
    .add(() => introFor(view), "-=0.35");
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
$("#cform").addEventListener("submit", (e) => {
  e.preventDefault();
  const btn = $(".cform__send");
  scramble(btn, "ENVOYÉ ✓", 0.5);
  gsap.fromTo(btn, { scale: 0.96 }, { scale: 1, duration: 0.5, ease: "back.out(2)" });
});

/* ── PRELOADER → intro ─────────────────────── */
/* .hero__bottom caché aussi → la 1re cascade du titre reste bien visible */
gsap.set([".hero__center", ".header", ".hero__bottom"], { autoAlpha: 0 });

window.addEventListener("load", async () => {
  await loadProjects();
  buildDataUI();
  applyProject(0);

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
    .fromTo(".hero__center", { scale: 0.92, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.8, ease: "power3.out" }, "-=0.5");
});
