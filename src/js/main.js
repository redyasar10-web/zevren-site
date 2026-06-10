/* ============================================================
   Zevren — motion orchestration (calm precision)
   Rules, in order:
   1. NEVER hijack scroll physics — native scroll only.
   2. Nothing in view moves perpetually. Ambient layers are
      near-still; everything else animates once, then rests.
   3. Scroll-linked motion is 1:1 with the scrollbar (scrub),
      never lagged, never parallax-drifted.
   4. Micro-interactions are user-initiated, small, fast.
   5. prefers-reduced-motion disables everything.
   ============================================================ */
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SignalField } from "./shader.js";
import { HeatGrid } from "./heatgrid.js";
import { scramble } from "./scramble.js";

gsap.registerPlugin(ScrollTrigger);

const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];

/* ---------- anchor scrolling: native, smooth, no library ---------- */
$$('a[href^="#"]').forEach((a) => {
  a.addEventListener("click", (e) => {
    const id = a.getAttribute("href");
    const target = id.length > 1 && $(id);
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: REDUCED ? "auto" : "smooth", block: "start" });
    }
  });
});

/* ---------- scroll progress hairline (1:1 with scrollbar) ---------- */
gsap.to(".progress-rail__bar", {
  scaleX: 1,
  ease: "none",
  scrollTrigger: { start: 0, end: "max", scrub: true },
});

/* ---------- nav ---------- */
const nav = $(".nav");
addEventListener("scroll", () => {
  nav.classList.toggle("is-scrolled", scrollY > 8);
}, { passive: true });
const burger = $(".nav__burger");
const mobileMenu = $(".nav__mobile");
burger?.addEventListener("click", () => {
  const open = mobileMenu.classList.toggle("is-open");
  burger.setAttribute("aria-expanded", open);
  $(".ic-menu", burger).style.display = open ? "none" : "";
  $(".ic-x", burger).style.display = open ? "" : "none";
});
$$(".nav__mobile a").forEach((a) =>
  a.addEventListener("click", () => mobileMenu.classList.remove("is-open"))
);
$$("main section[id]").forEach((sec) => {
  ScrollTrigger.create({
    trigger: sec,
    start: "top 45%",
    end: "bottom 45%",
    onToggle: (self) => {
      if (!self.isActive) return;
      $$(".nav__link").forEach((l) =>
        l.classList.toggle("is-active", l.getAttribute("href") === `#${sec.id}`)
      );
    },
  });
});

/* ---------- hero: one short orchestrated entrance, then stillness ---------- */
const heroCanvas = $(".hero__canvas canvas");
if (heroCanvas) new SignalField(heroCanvas, { mode: 0 });

if (!REDUCED) {
  /* per-word cinematic rise — the studied keynote-title mechanic:
     clipped slots, spring-weight expo rise, blur resolving, 70ms stagger */
  const intro = gsap.timeline();
  intro
    .to(".hero__h1 .wd > span, .hero__h1 .rot > .rot__word", {
      y: 0, filter: "blur(0px)",
      duration: 1.0,
      ease: "expo.out",
      stagger: 0.07,
    }, 0.12)
    .to(".hero__fade", {
      opacity: 1, y: 0,
      duration: 0.6,
      ease: "power2.out",
      stagger: 0.07,
    }, 0.55);
  // the kicker decrypts once — the single "system voice" flourish
  const kickerText = $(".hero__kicker .kicker");
  if (kickerText) setTimeout(() => scramble(kickerText, { duration: 600 }), 200);
  // status dots come online quietly
  $$(".hero__status-item").forEach((item, i) => {
    setTimeout(() => item.classList.add("is-on"), 1050 + i * 120);
  });
  /* scroll-away settle: pure scale+fade, 1:1 with the scrollbar (no parallax) */
  gsap.to(".hero__inner", {
    scale: 0.965, opacity: 0.45,
    ease: "none",
    scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom 35%", scrub: true },
  });
} else {
  gsap.set(".hero__h1 .wd > span, .hero__h1 .rot > .rot__word", { y: 0, filter: "none" });
  gsap.set(".hero__fade", { opacity: 1, y: 0 });
}

/* ---------- generic section reveals: small, quick, once ---------- */
$$("[data-rv]").forEach((el) => {
  const targets = el.dataset.rv === "self" ? [el] : $$(el.dataset.rv, el);
  gsap.set(targets, REDUCED ? {} : { opacity: 0, y: 10, filter: "blur(6px)" });
  ScrollTrigger.create({
    trigger: el,
    start: "top 80%",
    once: true,
    onEnter: () =>
      gsap.to(targets, {
        opacity: 1, y: 0, filter: "blur(0px)",
        duration: REDUCED ? 0 : 0.55,
        stagger: 0.06,
        ease: "power2.out",
        overwrite: "auto",
      }),
  });
});

/* ---------- hero product card: the ContainerScroll mechanic ----------
   rotateX 20° → 0 · scale 1.05 → 1, driven 1:1 by the scrollbar.
   Constants lifted from the studied aceternity component. */
const heroCard = $(".hero__card");
if (heroCard) {
  if (REDUCED) {
    gsap.set(heroCard, { rotateX: 0, scale: 1 });
  } else {
    const isMobile = matchMedia("(max-width: 768px)").matches;
    gsap.fromTo(heroCard,
      { rotateX: 20, scale: isMobile ? 0.94 : 1.05 },
      {
        rotateX: 0, scale: 1,
        ease: "none",
        scrollTrigger: {
          trigger: ".hero__cardwrap",
          start: "top 96%",
          end: "top 28%",
          scrub: true,
        },
      });
    // pointer tilt once flattened — user-initiated only, modest range
    const qrx = gsap.quickTo(heroCard, "rotationY", { duration: 0.5, ease: "power2.out" });
    const qry = gsap.quickTo(heroCard, "rotationX", { duration: 0.5, ease: "power2.out" });
    let tiltOn = false;
    ScrollTrigger.create({
      trigger: ".hero__cardwrap", start: "top 35%",
      onEnter: () => { tiltOn = true; }, onLeaveBack: () => { tiltOn = false; qrx(0); qry(0); },
    });
    heroCard.addEventListener("pointermove", (e) => {
      if (!tiltOn) return;
      const r = heroCard.getBoundingClientRect();
      qrx(((e.clientX - r.left) / r.width - 0.5) * 7);
      qry(-((e.clientY - r.top) / r.height - 0.5) * 5);
    });
    heroCard.addEventListener("pointerleave", () => { qrx(0); qry(0); });
    // the phone settles into place as the card flattens
    const phone = $(".demo-phone");
    if (phone) {
      gsap.fromTo(phone, { y: 64, rotation: 11, opacity: 0 },
        { y: 0, rotation: 4, opacity: 1, ease: "none",
          scrollTrigger: { trigger: ".hero__cardwrap", start: "top 80%", end: "top 30%", scrub: true } });
    }
    // after it flattens, keep scrolling: the site scrolls inside its screen
    gsap.to(".demo__site", {
      y: -34, ease: "none",
      scrollTrigger: { trigger: ".hero__cardwrap", start: "top 28%", end: "top -30%", scrub: true },
    });
    // the statement recedes gently as the product arrives (their Header translate)
    gsap.to(".hero__head", {
      y: -60, opacity: 0.55,
      ease: "none",
      scrollTrigger: { trigger: ".hero__cardwrap", start: "top 90%", end: "top 30%", scrub: true },
    });
  }
}

/* ---------- rotating business word: the TextRotate mechanic ----------
   per-char clipped rise (y in, -120% out, 18-25ms stagger). */
const rot = $("#heroRot");
if (rot && !REDUCED) {
  const WORDS = ["business.", "salon.", "caf\u00e9.", "clinic.", "shop.", "firm."];
  let wi = 0;
  const swap = () => {
    const out = $(".rot__word", rot);
    if (!out) return;
    const chars = [...out.textContent].map((c) => {
      const s = document.createElement("span");
      s.style.display = "inline-block";
      s.textContent = c;
      return s;
    });
    out.textContent = "";
    chars.forEach((c) => out.appendChild(c));
    gsap.to(chars, {
      yPercent: -120, opacity: 0,
      duration: 0.22, stagger: 0.011, ease: "power2.in",
      onComplete: () => {
        wi = (wi + 1) % WORDS.length;
        out.textContent = "";
        const ncs = [...WORDS[wi]].map((c) => {
          const s = document.createElement("span");
          s.style.display = "inline-block";
          s.style.transform = "translateY(112%)";
          s.textContent = c;
          return s;
        });
        ncs.forEach((c) => out.appendChild(c));
        gsap.to(ncs, { y: 0, duration: 0.42, stagger: 0.018, ease: "power3.out" });
      },
    });
  };
  let rotTimer = null;
  const startRot = () => { if (!rotTimer) rotTimer = setInterval(swap, 2000); };
  const stopRot = () => { clearInterval(rotTimer); rotTimer = null; };
  setTimeout(startRot, 1700);
  document.addEventListener("visibilitychange", () =>
    document.hidden ? stopRot() : startRot());
  // rest = calm: stop rotating once the product card is the focus
  ScrollTrigger.create({
    trigger: ".hero__cardwrap", start: "top 60%",
    onEnter: stopRot, onLeaveBack: startRot,
  });
}

/* ---------- handled: pinned scroll chapter ----------
   The readout resolves line-by-line as you scroll through the chapter,
   then the clean front builds. 1:1 scrubbed — the scrollbar is the clock. */
const readout = $(".readout");
const chapter = $(".handled-chapter");
if (readout && chapter) {
  const rows = $$(".readout__row", readout);
  const skels = $$(".browserframe__body > *");
  const caption = $(".handled__front-caption");
  if (REDUCED) {
    rows.forEach((r) => { r.style.opacity = 1; r.style.transform = "none"; r.style.filter = "none"; r.classList.add("is-on"); });
    gsap.set(skels, { scaleX: 1 });
  } else {
    gsap.set(skels, { scaleX: 0, transformOrigin: "0 50%" });
    if (caption) gsap.set(caption, { opacity: 0 });
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: chapter,
        start: "top top",
        end: "bottom bottom",
        scrub: true,
      },
    });
    rows.forEach((row, i) => {
      const dot = $(".readout__dot", row);
      tl.to(row, { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.6, ease: "none" }, i * 0.75);
      if (dot) tl.to(dot, { backgroundColor: "#2A4FE0", duration: 0.2, ease: "none" }, i * 0.75 + 0.45);
    });
    tl.to(skels, { scaleX: 1, duration: 0.55, stagger: 0.18, ease: "none" }, rows.length * 0.75 + 0.2);
    if (caption) tl.to(caption, { opacity: 1, duration: 0.4, ease: "none" }, ">-0.2");
    const stamp = $(".handled__stamp");
    if (stamp) tl.to(stamp, { opacity: 1, duration: 0.4, ease: "none" }, ">");
  }
}

/* connector pulses — slow, few, peripheral */
const flow = $(".handled__flow svg");
if (flow && !REDUCED) {
  $$("path", flow).forEach((p, i) => {
    const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    c.setAttribute("r", "2.4");
    c.setAttribute("class", "pulse");
    const m = document.createElementNS("http://www.w3.org/2000/svg", "animateMotion");
    m.setAttribute("dur", "5.2s");
    m.setAttribute("repeatCount", "indefinite");
    m.setAttribute("begin", `${i * 1.7}s`);
    const mp = document.createElementNS("http://www.w3.org/2000/svg", "mpath");
    mp.setAttributeNS("http://www.w3.org/1999/xlink", "href", `#${p.id}`);
    m.appendChild(mp);
    c.appendChild(m);
    flow.appendChild(c);
  });
}

/* ---------- manifesto: the chores get crossed off (scrubbed 1:1) ---------- */
const manifesto = $(".manifesto");
if (manifesto) {
  const mCanvas = $(".manifesto__canvas canvas");
  if (mCanvas) new SignalField(mCanvas, { mode: 1 });
  const chores = $$(".chore", manifesto);
  if (!REDUCED && chores.length) {
    const mtl = gsap.timeline({
      scrollTrigger: {
        trigger: manifesto,
        start: "top top",
        end: "bottom bottom",
        scrub: true,
      },
    });
    chores.forEach((c, i) => {
      mtl.to($(".chore__strike", c), { scaleX: 1, duration: 0.55, ease: "none" }, i * 0.62);
      mtl.to($(".chore__word", c), { opacity: 0.4, duration: 0.3, ease: "none" }, i * 0.62 + 0.3);
    });
    const after = chores.length * 0.62 + 0.35;
    mtl.to(".manifesto__never", { opacity: 1, y: 0, duration: 0.5, ease: "none" }, after);
    mtl.to(".manifesto__brand", { opacity: 1, y: 0, duration: 0.6, ease: "none" }, after + 0.45);
    mtl.to(".manifesto__bar", { scaleX: 1, duration: 0.6, ease: "none" }, after + 0.85);
    mtl.to(".manifesto__tail", { opacity: 1, duration: 0.4, ease: "none" }, after + 1.2);
    mtl.to(".manifesto__brand", { backgroundPosition: "-60% 0", duration: 0.9, ease: "none" }, after + 1.25);
    mtl.to({}, { duration: 0.5 }); // resting beat at the end of the chapter
  }
}

$$("[data-count]").forEach((el) => {
  const target = parseInt(el.dataset.count, 10);
  ScrollTrigger.create({
    trigger: el,
    start: "top 84%",
    once: true,
    onEnter: () => {
      if (REDUCED) { el.textContent = "$" + target; return; }
      const o = { v: 0 };
      gsap.fromTo(el, { filter: "blur(6px)", opacity: 0.5 },
        { filter: "blur(0px)", opacity: 1, duration: 0.7, ease: "power2.out" });
      gsap.to(o, {
        v: target,
        duration: 0.9,
        ease: "power2.out",
        onUpdate: () => { el.textContent = "$" + Math.round(o.v); },
      });
    },
  });
});

$$(".plan__group").forEach((list) => {
  const items = $$(".plan__item", list);
  if (!REDUCED) gsap.set(items, { opacity: 0 });
  ScrollTrigger.create({
    trigger: list,
    start: "top 86%",
    once: true,
    onEnter: () =>
      gsap.to(items, {
        opacity: 1,
        duration: REDUCED ? 0 : 0.4,
        stagger: 0.05, ease: "power1.out",
      }),
  });
});

/* pointer-tracked border glow — user-initiated only */
const sigCard = null; // spotlight retired — the single plan card carries the beam
if (sigCard && !REDUCED) {
  sigCard.addEventListener("pointermove", (e) => {
    const r = sigCard.getBoundingClientRect();
    sigCard.style.setProperty("--gx", `${((e.clientX - r.left) / r.width) * 100}%`);
    sigCard.style.setProperty("--gy", `${((e.clientY - r.top) / r.height) * 100}%`);
  });
}

/* ---------- compare: one quiet pass ---------- */
const compare = $(".compare table");
if (compare) {
  const rows = $$("tbody tr", compare);
  if (!REDUCED) gsap.set(rows, { opacity: 0 });
  ScrollTrigger.create({
    trigger: compare,
    start: "top 82%",
    once: true,
    onEnter: () => {
      gsap.to(rows, {
        opacity: 1,
        duration: REDUCED ? 0 : 0.45,
        stagger: 0.06, ease: "power1.out",
      });
      if (!REDUCED) {
        $$(".draw-check path", compare).forEach((p, i) => {
          const len = p.getTotalLength();
          gsap.fromTo(p,
            { strokeDasharray: len, strokeDashoffset: len },
            { strokeDashoffset: 0, duration: 0.4, delay: 0.2 + i * 0.05, ease: "power2.out" });
        });
      }
    },
  });
}

/* ---------- FAQ ---------- */
$$(".faq__item").forEach((item) => {
  const q = $(".faq__q", item);
  q.addEventListener("click", () => {
    const isOpen = item.classList.contains("is-open");
    $$(".faq__item.is-open").forEach((o) => {
      o.classList.remove("is-open");
      $(".faq__q", o).setAttribute("aria-expanded", "false");
    });
    if (!isOpen) {
      item.classList.add("is-open");
      q.setAttribute("aria-expanded", "true");
    }
  });
});

/* ---------- final CTA: responds only to YOUR touch ---------- */
const ctaGrid = $(".finalcta__canvas");
if (ctaGrid) new HeatGrid(ctaGrid);

/* ---------- mobile call bar ---------- */
const callbar = $(".callbar");
if (callbar) {
  ScrollTrigger.create({
    trigger: ".hero",
    start: "bottom 70%",
    onEnter: () => callbar.classList.add("is-visible"),
    onLeaveBack: () => callbar.classList.remove("is-visible"),
  });
}

/* ---------- status strip: comes online once, then still ---------- */
const strip = $(".statusstrip");
if (strip && !REDUCED) {
  const dots = $$(".statusstrip__grid .dot", strip);
  const states = $$(".statusstrip__grid .state", strip);
  gsap.set(dots, { backgroundColor: "#3A4663" });
  gsap.set(states, { opacity: 0.4 });
  ScrollTrigger.create({
    trigger: strip,
    start: "top 88%",
    once: true,
    onEnter: () => {
      gsap.to(dots, { backgroundColor: "#6E8CFF", duration: 0.3, stagger: 0.14, ease: "none" });
      gsap.to(states, { opacity: 1, duration: 0.3, stagger: 0.14, ease: "none" });
    },
  });
}

/* ---------- footer: local time (Wooster, OH — instrument detail) ---------- */
const clock = $("#footClock");
if (clock) {
  const tick = () => {
    clock.textContent = new Date().toLocaleTimeString("en-US", {
      hour: "numeric", minute: "2-digit", timeZone: "America/New_York",
    }).toLowerCase();
  };
  tick();
  setInterval(tick, 60000);
}
