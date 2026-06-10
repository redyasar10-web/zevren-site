# Zevren — marketing site

Production site for zevren. Vite + vanilla JS + GSAP/ScrollTrigger + Lenis + custom WebGL.

## Run

```bash
npm install
npm run dev        # local dev at http://localhost:5173
npm run build      # production bundle → dist/
npm run preview    # serve the production bundle locally
```

## Deploy

`npm run build`, then host `dist/` anywhere static (Vercel, Netlify, Cloudflare Pages, S3).
No server, no env vars. ~123KB total transfer, FCP < 300ms.

## Before launch (founder checklist)

- [ ] Replace `(330) 000-0000` / `+13300000000` — grep `CONTACT PLACEHOLDER` (nav, hero, showcase, pricing ×2, final CTA, footer, mobile call bar)
- [ ] Confirm final $49/mo inclusions — grep `PRICING —` comment
- [ ] Set real OG image + domain in `index.html` meta tags

## Architecture

- `index.html` — single page, all copy (claim-audited: never says "you own the domain", no invented metrics/testimonials)
- `src/styles/` — `tokens.css` (v4 brand: ink `#0D1422`, paper, signal blue `#2A4FE0`, IBM Plex self-hosted), `base.css`, `site.css`
- `src/js/main.js` — Lenis smooth scroll + GSAP choreography (hero intro, readout unconcealment, manifesto scrub, counters, magnetic CTAs, 3D tilt)
- `src/js/shader.js` — custom WebGL "signal field" (light hero / dark manifesto), pointer-reactive, paused offscreen
- `src/js/heatgrid.js` — interactive instrument grid in the final CTA
- `src/js/scramble.js` — mono text decrypt effect

All motion is gated on `prefers-reduced-motion`. Canvases cap DPR and pause offscreen.
