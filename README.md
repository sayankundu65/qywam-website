# Qywam &mdash; AI-Native Creative Website

This repository contains the website for **Qywam**, an AI-native advertising and creative company.

---

## 🎨 Our Services Architecture & Blob Choreography

The `/services` route (`services.html`) features a pinned horizontal track powered by **Lenis** smooth scroll and **GSAP ScrollTrigger**, layered with Qywam's signature 3D liquid-glass WebGL blobs.

### Keyframe Blob Choreography Table

| Panel Index | Section Name | Dominant Hue | Visual Formation & Blob Dynamics | Pill Accent |
| :--- | :--- | :--- | :--- | :--- |
| **01** | Generative Advertising | Gold (`uColorOffset: 0.0`) | Loosely gathered cluster right of center, buoyant floating | `.pill-gold` |
| **02** | Creative Development | Orange (`uColorOffset: 0.25`) | Orbiting ring constellation, curious orbital rotation | `.pill-orange` |
| **03** | Limitless Production | Pink (`uColorOffset: 0.50`) | Expanded wide spread, larger scales, breaking boundaries | `.pill-pink` |
| **04** | Story-led Video | Blue (`uColorOffset: 0.75`) | Horizontal stream wave, directional motion-blur stretch | `.pill-blue` |
| **05** | Campaign-scale Assets | Multi / Iridescent (`1.0`) | Structured 4x2 matrix grid with modular spacing | `.pill-multi` |
| **06** | Connected Channels | Violet / Purple (`0.62`) | Blobs split to outer viewport edges then re-converge | `.pill-purple` |
| **07** | Why Qywam (Visual) | Calm Brand Emblem (`0.0`) | Settles into a serene, unified sculptural logo cluster | `.pill-calm` |

---

### 🎛️ Tuning Knobs

All parameters are centralized in `assets/services.js` under the `CONFIG` object:

```javascript
const CITY = 'LOCAL'; // e.g. 'LOCAL', 'London', 'New York', 'Dubai', 'Tokyo'

const CONFIG = {
  lerp: 0.088,             // Lenis smooth scroll inertia (0.08 - 0.1)
  runwayMultiplier: 0.92,  // Pinned runway length per panel (0.9 * vh)
  inactiveOpacity: 0.42,   // Opacity of inactive off-center panels (0.4 - 0.5)
  maxDpr: 2.0,             // Cap DPR for performance on desktop
  mobileDpr: 1.25,         // Lower DPR on mobile for battery / GPU savings
  settleVelocityThreshold: 0.06 // Velocity threshold below which auto-settle triggers
};
```

- **Peek Width & Panel Size**: In `assets/services.css`, edit `--panel-w: 85vw;` and `--gutter: 8px;`. Adjusting `--panel-w` changes how much of neighboring panels peek in at the edges.
- **Runway Length**: Edit `CONFIG.runwayMultiplier`. Lower values speed up scroll scrub; higher values make scrubbing more expansive.
- **Blob States**: In `assets/services.js`, edit `STATES` array to customize blob target coordinates `(x, y, z)`, scales `(sx, sy)`, rotations `rot`, and `colorOffset`.

---

### ✍️ How to Edit Services Copy

All copy is semantic HTML inside `services.html` (fully crawlable by search engines without JavaScript):
1. **Headings**: Inside each `<article class="panel-card fg-card" id="...">`:
   ```html
   <h2 class="panel-heading">
     <span class="h-first">FirstWord</span>
     <span class="pill pill-gold">PillWord</span>
   </h2>
   ```
2. **Lead & Paragraphs**:
   - `<p class="panel-lead">` — bold summary statement
   - `<p class="panel-desc">` — short detailed descriptive paragraphs
3. **Related Services**:
   - Inside `<ul class="related-list">`, edit `<li><span class="marker">&mdash;</span> Service name</li>`.
4. **Why Qywam Sequence**:
   - Edit the three column cards inside `<article class="panel-card fg-card panel-why-columns">`.

---

## 🚀 Deploying to Vercel

This project is fully configured for seamless zero-config deployment on **[Vercel](https://vercel.com)**.

### Method 1: Deploy with GitHub & Vercel Dashboard (Recommended)

1. Commit and push your project to GitHub:
   ```bash
   git add -A
   git commit -m "Add Our Services interactive page"
   git push origin main
   ```
2. Vercel automatically deploys when `main` is updated.
3. Clean URLs are configured in `vercel.json` (`/services` maps to `services.html`).

### Method 2: Deploy directly via Vercel CLI

```powershell
npx vercel --prod
```

---

## 📁 Project Structure

- `index.html` — Homepage with 3D liquid logo scroll animation.
- `services.html` — Our Services page with pinned horizontal scroll track and blob choreography.
- `contact.html` — Contact form page with serverless API delivery.
- `privacy.html` — Privacy policy detailing data practices and consent-gated GA4.
- `404.html` — Custom branded 404 page.
- `assets/blob-engine.js` — Shared WebGL liquid-glass blob shaders and geometry engine.
- `assets/services.js` — Lenis + GSAP ScrollTrigger controller and blob keyframe animator.
- `assets/services.css` — Styling for the horizontal track, liquid-glass pills, and clock.
- `assets/services-env.js` — Synchronous head script for zero-layout-shift environment detection.
- `assets/vendor/` — Pinned vendor libraries (`lenis-1.1.13`, `gsap-3.12.5`, `ScrollTrigger-3.12.5`).
- `assets/three.min.js` — Self-hosted Three.js r128.
- `vercel.json` — Edge routing, clean URLs, redirects, security headers, and asset caching.
