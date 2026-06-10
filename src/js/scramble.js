/* ============================================================
   Zevren — scramble/resolve text (the system voice, decrypting)
   Mono labels resolve from cipher characters into plain truth —
   unconcealment, in type. Sequential reveal, ~28 fps, honest and
   quick (never longer than ~900ms). Pattern studied from 21st.dev
   danielpetho/scramble-hover + deltacomponents/scramble-text,
   rebuilt dependency-free.
   ============================================================ */

const CHARS = "abcdefghijklmnopqrstuvwxyz0123456789·:/_";
const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;

export function scramble(el, { duration = 800, fps = 30 } = {}) {
  const text = el.dataset.text ?? el.textContent;
  el.dataset.text = text;
  if (REDUCED) { el.textContent = text; return Promise.resolve(); }

  const frameMs = 1000 / fps;
  const total = Math.max(1, Math.round(duration / frameMs));
  let frame = 0;

  return new Promise((resolve) => {
    el.classList.add("is-scrambling");
    const tick = () => {
      frame++;
      const progress = frame / total;
      const revealed = Math.floor(progress * text.length);
      let out = "";
      for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (ch === " ") { out += " "; continue; }
        out += i < revealed ? ch : CHARS[(Math.random() * CHARS.length) | 0];
      }
      el.textContent = out;
      if (frame < total) {
        setTimeout(tick, frameMs);
      } else {
        el.textContent = text;
        el.classList.remove("is-scrambling");
        resolve();
      }
    };
    tick();
  });
}
