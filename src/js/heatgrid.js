/* ============================================================
   Zevren — live instrument grid (final CTA background)
   A quiet technical grid on deep ink. The visitor's pointer leaves
   a cooling signal-blue trail — the panel is alive and responds,
   like everything Zevren keeps running. Canvas 2D heat-diffusion,
   adapted from 21st.dev easemize/interactive-thermodynamic-grid
   (recolored + restrained for the brand; magma palette removed).
   Paused offscreen; static under reduced motion.
   ============================================================ */

const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;

export class HeatGrid {
  constructor(container, { resolution = 26, cooling = 0.965 } = {}) {
    this.container = container;
    this.res = resolution;
    this.cooling = cooling;
    this.canvas = document.createElement("canvas");
    this.canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;";
    container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext("2d", { alpha: false });
    this.mouse = { x: -1e4, y: -1e4, px: -1e4, py: -1e4, on: false };
    this.running = false;
    this.raf = 0;
    // ambient pulses so the grid is alive even before the pointer arrives
    this.pulseT = 0;

    this.resize = this.resize.bind(this);
    this.frame = this.frame.bind(this);
    addEventListener("resize", this.resize, { passive: true });
    this.resize();

    container.addEventListener("pointermove", (e) => {
      const r = container.getBoundingClientRect();
      this.mouse.x = e.clientX - r.left;
      this.mouse.y = e.clientY - r.top;
      this.mouse.on = true;
    }, { passive: true });
    container.addEventListener("pointerleave", () => { this.mouse.on = false; });

    this.io = new IntersectionObserver(([en]) => {
      en.isIntersecting ? this.start() : this.stop();
    }, { rootMargin: "80px" });
    this.io.observe(container);

    if (REDUCED) { this.renderStatic(); }
  }

  resize() {
    const w = this.container.offsetWidth, h = this.container.offsetHeight;
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.w = w; this.h = h;
    this.cols = Math.ceil(w / this.res);
    this.rows = Math.ceil(h / this.res);
    this.grid = new Float32Array(this.cols * this.rows);
    if (REDUCED) this.renderStatic();
  }

  inject(x, y, amount, radius = 2) {
    const col = Math.floor(x / this.res), row = Math.floor(y / this.res);
    for (let i = -radius; i <= radius; i++) {
      for (let j = -radius; j <= radius; j++) {
        const c = col + i, r = row + j;
        if (c < 0 || c >= this.cols || r < 0 || r >= this.rows) continue;
        const d = Math.hypot(i, j);
        if (d > radius) continue;
        const idx = c + r * this.cols;
        this.grid[idx] = Math.min(1, this.grid[idx] + amount * (1 - d / radius));
      }
    }
  }

  renderStatic() {
    // reduced motion: just the quiet dot lattice, no animation
    const { ctx } = this;
    ctx.fillStyle = "#070B12";
    ctx.fillRect(0, 0, this.w, this.h);
    ctx.fillStyle = "rgba(110,140,255,0.13)";
    for (let r = 0; r < this.rows; r += 2) {
      for (let c = 0; c < this.cols; c += 2) {
        ctx.fillRect(c * this.res + this.res / 2 - 1, r * this.res + this.res / 2 - 1, 2, 2);
      }
    }
  }

  frame() {
    if (!this.running) return;
    const { ctx, mouse, res } = this;

    // pointer trail
    if (mouse.on) {
      const dx = mouse.x - mouse.px, dy = mouse.y - mouse.py;
      const steps = Math.ceil(Math.hypot(dx, dy) / (res / 2)) || 1;
      for (let s = 0; s <= steps; s++) {
        this.inject(mouse.px + dx * (s / steps), mouse.py + dy * (s / steps), 0.15, 2);
      }
    }
    mouse.px = mouse.x; mouse.py = mouse.y;

    // no ambient drift — the panel is still until the visitor touches it

    ctx.fillStyle = "#070B12";
    ctx.fillRect(0, 0, this.w, this.h);

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const idx = c + r * this.cols;
        const t = this.grid[idx];
        this.grid[idx] *= this.cooling;
        const x = c * res, y = r * res;
        if (t > 0.04) {
          // signal blue, brightening with heat — never a rainbow
          const a = Math.min(0.85, t * 0.9);
          const size = res * (0.42 + t * 0.5);
          const off = (res - size) / 2;
          ctx.fillStyle = t > 0.5
            ? `rgba(110,140,255,${a})`
            : `rgba(42,79,224,${a})`;
          ctx.beginPath();
          ctx.roundRect(x + off, y + off, size, size, 2);
          ctx.fill();
        } else if (c % 2 === 0 && r % 2 === 0) {
          ctx.fillStyle = "rgba(110,140,255,0.10)";
          ctx.fillRect(x + res / 2 - 1, y + res / 2 - 1, 2, 2);
        }
      }
    }
    this.raf = requestAnimationFrame(this.frame);
  }

  start() {
    if (REDUCED || this.running) return;
    this.running = true;
    this.raf = requestAnimationFrame(this.frame);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }
}
