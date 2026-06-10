/* ============================================================
   Zevren — signal-field WebGL shader (bespoke)
   One engine, two moods:
     mode 0 "clearing"  — light paper hero. A faint structural lattice
       with a soft signal-blue flow field that RESOLVES into clarity
       around a slow-roaming focal point + the visitor's pointer.
       The brand idea (unconcealment) as a living surface.
     mode 1 "instrument" — dark ink panels. The same field inverted:
       the handled machinery humming quietly in the deep, brightening
       where the visitor touches it.
   Engineering: WebGL1, DPR-capped, IntersectionObserver-paused,
   pointer-eased, reduced-motion renders a single static frame.
   Harness pattern studied from 21st.dev (aliimam/neural-noise,
   xordev/atc-shader); the field itself is original.
   ============================================================ */

const VERT = `
precision mediump float;
attribute vec2 a_pos;
varying vec2 vUv;
void main() {
  vUv = 0.5 * (a_pos + 1.0);
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

const FRAG = `
precision mediump float;
varying vec2 vUv;
uniform float u_time;
uniform float u_ratio;
uniform vec2  u_pointer;   /* 0..1, eased */
uniform float u_mode;      /* 0 light · 1 dark */
uniform float u_reveal;    /* 0..1 intro sweep */

vec2 rot(vec2 v, float a) {
  return mat2(cos(a), sin(a), -sin(a), cos(a)) * v;
}

/* iterated-sine flow noise — cheap, organic, no texture fetch */
float flow(vec2 uv, float t, float p) {
  vec2 acc = vec2(0.0);
  float res = 0.0;
  float scale = 5.0;
  for (int i = 0; i < 7; i++) {
    uv = rot(uv, 1.0);
    acc = rot(acc, 1.0);
    vec2 layer = uv * scale + float(i) + acc - t;
    acc += sin(layer) + 1.8 * p;
    res += (0.5 + 0.5 * cos(layer.x + layer.y)) / scale;
    scale *= 1.25;
  }
  return res;
}

void main() {
  vec2 uv = vUv;
  vec2 suv = uv;
  suv.x *= u_ratio;

  /* near-still roaming focal point + visitor pointer — the "lens of clarity" */
  vec2 roam = vec2(
    0.32 + 0.20 * sin(u_time * 0.022),
    0.55 + 0.16 * cos(u_time * 0.018)
  );
  roam.x *= u_ratio;
  vec2 ptr = vec2(u_pointer.x * u_ratio, u_pointer.y);

  float dRoam = length(suv - roam);
  float dPtr  = length(suv - ptr);
  float lens = max(
    0.85 * pow(max(0.0, 1.0 - dRoam * 1.6), 2.0),
    pow(max(0.0, 1.0 - dPtr * 2.0), 2.2)
  );

  float t = u_time * 0.045;
  float n = flow(suv * 0.9, t, lens * 0.45);
  n = pow(n, 2.2);

  /* structural lattice — the technical grid, resolving where the lens is */
  vec2 cell = fract(suv * 22.0);
  float lineX = smoothstep(0.0, 0.045, cell.x) * smoothstep(0.0, 0.045, 1.0 - cell.x);
  float lineY = smoothstep(0.0, 0.045, cell.y) * smoothstep(0.0, 0.045, 1.0 - cell.y);
  float grid = 1.0 - min(lineX, lineY);

  /* intro sweep: the field "unconceals" left to right on load */
  float sweep = smoothstep(uv.x - 0.18, uv.x + 0.02, u_reveal * 1.2);

  vec3 signal = vec3(0.165, 0.310, 0.878);  /* #2A4FE0 */
  vec3 bright = vec3(0.431, 0.549, 1.000);  /* #6E8CFF */

  if (u_mode < 0.5) {
    /* LIGHT — quiet on paper. The type owns the center: the field
       stays at the edges and frames the message, never under it. */
    float fieldA = n * 0.22 + grid * 0.07;
    float a = fieldA * (0.28 + 0.72 * lens) * sweep;
    /* inverted vignette: clear center, presence at the edges */
    float dc = length((uv - vec2(0.5, 0.46)) * vec2(u_ratio * 0.62, 1.0));
    a *= smoothstep(0.18, 0.66, dc);
    a *= smoothstep(1.25, 0.62, dc); /* and fade out at far corners */
    gl_FragColor = vec4(mix(signal, bright, 0.25), a);
  } else {
    /* DARK — the machinery humming in the deep, quietly */
    float glow = n * (0.24 + 0.55 * lens);
    float a = (glow * 0.42 + grid * n * 0.08) * sweep;
    vec3 col = mix(signal, bright, lens * 0.8) * glow * 1.35;
    gl_FragColor = vec4(col, a);
  }
}`;

const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;

export class SignalField {
  constructor(canvas, { mode = 0 } = {}) {
    this.canvas = canvas;
    this.mode = mode;
    this.pointer = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };
    this.reveal = REDUCED ? 1 : 0;
    this.running = false;
    this.raf = 0;
    this.t0 = performance.now();

    const gl = canvas.getContext("webgl", { premultipliedAlpha: true, alpha: true, antialias: false });
    if (!gl) return;
    this.gl = gl;

    const sh = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(s));
        return null;
      }
      return s;
    };
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { this.gl = null; return; }
    gl.useProgram(prog);

    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "a_pos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    this.u = {};
    for (const name of ["u_time", "u_ratio", "u_pointer", "u_mode", "u_reveal"]) {
      this.u[name] = gl.getUniformLocation(prog, name);
    }
    gl.uniform1f(this.u.u_mode, mode);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    this.resize = this.resize.bind(this);
    this.frame = this.frame.bind(this);
    addEventListener("resize", this.resize, { passive: true });
    this.resize();

    this.onMove = (e) => {
      const r = this.canvas.getBoundingClientRect();
      this.pointer.tx = (e.clientX - r.left) / r.width;
      this.pointer.ty = 1 - (e.clientY - r.top) / r.height;
    };
    addEventListener("pointermove", this.onMove, { passive: true });

    // pause offscreen
    this.io = new IntersectionObserver(([en]) => {
      en.isIntersecting ? this.start() : this.stop();
    }, { rootMargin: "120px" });
    this.io.observe(canvas);

    if (REDUCED) { this.resize(); this.draw(0); } // single still frame
  }

  resize() {
    if (!this.gl) return;
    const dpr = Math.min(devicePixelRatio || 1, 1.75);
    const w = Math.floor(this.canvas.clientWidth * dpr);
    const h = Math.floor(this.canvas.clientHeight * dpr);
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
    this.gl.viewport(0, 0, w, h);
    this.gl.uniform1f(this.u.u_ratio, w / Math.max(1, h));
  }

  draw(t) {
    const { gl, u, pointer } = this;
    pointer.x += (pointer.tx - pointer.x) * 0.06;
    pointer.y += (pointer.ty - pointer.y) * 0.06;
    if (this.reveal < 1) this.reveal = Math.min(1, this.reveal + 0.012);
    gl.uniform1f(u.u_time, t / 1000);
    gl.uniform2f(u.u_pointer, pointer.x, pointer.y);
    gl.uniform1f(u.u_reveal, this.reveal);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  frame() {
    if (!this.running) return;
    this.draw(performance.now() - this.t0);
    this.raf = requestAnimationFrame(this.frame);
  }

  start() {
    if (REDUCED || !this.gl || this.running) return;
    this.running = true;
    this.raf = requestAnimationFrame(this.frame);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }
}
