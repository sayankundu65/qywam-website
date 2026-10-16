/**
 * Qywam Services Page Controller
 * - Lenis + GSAP ScrollTrigger pinned horizontal scroll
 * - The homepage 8-blob liquid-glass cluster (shared QywamBlobs engine) + faint wireframe grid
 * - The cluster rides along with the horizontal scroll inside the active card's empty
 *   visual area (.panel-visual) and is clamped to it, so it never sits over the text.
 */
(function () {
  'use strict';

  const stage = document.getElementById('services-stage');
  const strip = document.getElementById('horizontal-strip');
  const cv = document.getElementById('c');
  const slots = Array.from(document.querySelectorAll('.panel-visual'));
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ==========================================================================
  // 1. SCENE: homepage blob cluster + wireframe sheet
  // ==========================================================================
  function initScene() {
    if (!cv || typeof THREE === 'undefined' || !window.QywamBlobs) {
      document.documentElement.classList.add('no-webgl');
      return;
    }
    const { L, S, CX, CY, PAL, cl, createLensGeometry, createBlobMeshes } = window.QywamBlobs;

    let R;
    try {
      R = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true });
    } catch (e) {
      document.documentElement.classList.add('no-webgl');
      return;
    }
    R.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    R.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    scene.add(cam);
    const GS = 0.95;
    const grp = new THREE.Group();
    grp.scale.setScalar(GS);
    scene.add(grp);

    // ---- wireframe wave sheet (same as homepage)
    const W = 15, H = 9, NX = 130, NY = 80, pos = [];
    for (let j = 0; j <= NY; j++) for (let i = 0; i <= NX; i++) {
      const x = (i / NX - 0.5) * W * 2, y = (j / NY - 0.5) * H * 2;
      if (i < NX) pos.push(x, y, 0, x + W * 2 / NX, y, 0);
      if (j < NY) pos.push(x, y, 0, x, y + H * 2 / NY, 0);
    }
    const lg = new THREE.BufferGeometry();
    lg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    const dUni = L.map(() => new THREE.Vector3(99, 99, 1));
    const lu = { uT: { value: 0 }, uD: { value: dUni }, uM: { value: new THREE.Vector2(99, 99) }, uMs: { value: 0 }, uF: { value: 0 } };
    const lm = new THREE.ShaderMaterial({
      uniforms: lu, transparent: true, depthWrite: false,
      vertexShader: `uniform float uT,uMs;uniform vec3 uD[8];uniform vec2 uM;varying float vH,vG;varying vec2 vP;
void main(){vec2 p=position.xy;float h=sin(p.x*.32+uT*.9)*1.1+sin(p.y*.48-uT*.75+p.x*.1)*.8+sin((p.x-p.y)*.22+uT*.5)*1.1+sin(p.x*.7-p.y*.4+uT*1.2)*.25;float g=0.;
for(int i=0;i<8;i++){float d=length(p-uD[i].xy)/uD[i].z;h-=1.5*exp(-d*d*.7);g+=exp(-d*d*.5);}
float dm=length(p-uM);h+=uMs*.7*exp(-dm*dm*.3)*sin(dm*3.-uT*3.);
vH=h;vG=g;vP=p;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,h,1.);}`,
      fragmentShader: `precision highp float;uniform float uT,uF;varying float vH,vG;varying vec2 vP;${PAL}
void main(){vec3 c=vec3(.42);float e=1.-smoothstep(5.,15.,length(vP*vec2(.7,1.15)));
float a=(.05+.15*clamp(vG,0.,1.))*(.3+.7*e)*uF;gl_FragColor=vec4(c,a);}`
    });
    const sheet = new THREE.LineSegments(lg, lm);
    sheet.frustumCulled = false;
    grp.add(sheet);

    // ---- the 8 liquid-glass lenses (shared engine, identical material to the homepage)
    const lenses = createBlobMeshes(scene, lu.uT, createLensGeometry(96, 64));
    const BL = L.map(l => ({ x: (l[0] - CX) * S, y: -(l[1] - CY) * S, a: l[2] * S, b: l[3] * S, ang: l[4] * Math.PI / 180 }));
    const RANK = [7, 6, 5, 4, 2, 1, 3, 0];
    lenses.forEach(m => { m.userData.ox = 0; m.userData.oy = 0; m.userData.qL = new THREE.Quaternion(); });

    // one gentle formation per service card (rotation of the whole logo), with its bounding box
    const ROTS = [0, 0.32, -0.28, 0.55, -0.5, 0.2];
    const FORMS = ROTS.map(rot => {
      const c = Math.cos(rot), s = Math.sin(rot);
      let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
      BL.forEach(b => {
        const x = b.x * c - b.y * s, y = b.x * s + b.y * c, a = b.ang + rot;
        const ex = Math.hypot(b.a * Math.cos(a), b.b * Math.sin(a));
        const ey = Math.hypot(b.a * Math.sin(a), b.b * Math.cos(a));
        x0 = Math.min(x0, x - ex); x1 = Math.max(x1, x + ex);
        y0 = Math.min(y0, y - ey); y1 = Math.max(y1, y + ey);
      });
      return { rot, c, s, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, w: x1 - x0, h: y1 - y0 };
    });

    // ---- interaction
    const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(9, 9), hit = new THREE.Vector3();
    const plane0 = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    let mx = 0, my = 0, tmx = 0, tmy = 0, lastMove = 0;
    addEventListener('pointermove', e => {
      ndc.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
      tmx = ndc.x; tmy = ndc.y; lastMove = performance.now();
    }, { passive: true });

    function resize() {
      const w = innerWidth, h = innerHeight;
      R.setSize(w, h, false);
      cam.aspect = w / h;
      cam.updateProjectionMatrix();
    }
    addEventListener('resize', resize);
    resize();

    // ---- state
    const DD = 11, TAN = Math.tan(20 * Math.PI / 180), HEADER = 72, MIN_W = 200, KMAX = 1.6;
    const clock = new THREE.Clock();
    const Z = new THREE.Vector3(0, 0, 1);
    const tgt = new THREE.Vector3(), vT = new THREE.Vector3(), dir = new THREE.Vector3();
    const qZ = new THREE.Quaternion(), qE = new THREE.Quaternion(), qW = new THREE.Quaternion(), qI = new THREE.Quaternion();
    const eu = new THREE.Euler();
    let T = 0, anchor = -1, shown = -1, bornT = 0, snap = false, pcx = null, pcy = null, avx = 0, avy = 0, moveAmt = 0;

    function frame() {
      requestAnimationFrame(frame);
      const dt = Math.min(clock.getDelta(), 0.05);
      T += dt * (reduce ? 0.3 : 1);
      lu.uT.value = T;
      mx += (tmx - mx) * 0.04; my += (tmy - my) * 0.04;
      cam.position.set(mx * 0.9, -4.6 + my * 0.5, 9);
      cam.lookAt(0, 0.2, 0);
      cam.updateMatrixWorld();
      lu.uF.value = Math.min(1, T) * 0.9;

      const vw = innerWidth, vh = innerHeight, hH = DD * TAN, hW = hH * cam.aspect, wpp = 2 * hH / vh;
      const toX = px => (px / vw * 2 - 1) * hW;
      const toY = py => -(py / vh * 2 - 1) * hH;

      // visible part of each card's empty visual area
      const vis = slots.map(s => {
        const r = s.getBoundingClientRect();
        const l = Math.max(r.left, 0), rr = Math.min(r.right, vw);
        const t = Math.max(r.top, HEADER), b = Math.min(r.bottom, vh);
        return { l, r: rr, t, b, w: Math.max(0, rr - l), h: Math.max(0, b - t) };
      });

      // which card owns the cluster (largest visible free area, with hysteresis)
      let best = -1, bw = 0;
      vis.forEach((v, i) => { if (v.h > 160 && v.w > bw) { bw = v.w; best = i; } });
      if (bw < MIN_W) best = -1;
      if (anchor >= 0 && best >= 0 && best !== anchor && vis[anchor].h > 160 && vis[anchor].w > vis[best].w - 60) best = anchor;
      anchor = best;

      // hand-over: shrink away in the old card, re-form in the new one (never slide across text)
      let leaving = false;
      if (shown !== anchor) {
        leaving = true;
        let maxS = 0;
        lenses.forEach(m => { maxS = Math.max(maxS, m.userData.s.x, m.userData.s.y); });
        if (shown < 0 || maxS < 0.03 || vis[shown].w <= 0) {
          shown = anchor; leaving = false;
          if (shown >= 0) { snap = true; bornT = T; pcx = null; }
        }
      }

      // cluster fit + centre (camera space)
      let k = 0, ccx = 0, ccy = 0, F = FORMS[0], v = null;
      if (shown >= 0) {
        v = vis[shown]; F = FORMS[shown % FORMS.length];
        if (v.w > 0 && v.h > 0) {
          k = Math.min(v.w * wpp * 0.8 / F.w, v.h * wpp * 0.74 / F.h, KMAX);
          ccx = toX((v.l + v.r) / 2); ccy = toY((v.t + v.b) / 2);
        }
      }
      // anchor velocity -> spring feed-forward so the cluster keeps pace with the scroll
      if (pcx === null) { pcx = ccx; pcy = ccy; avx = 0; avy = 0; }
      avx += ((ccx - pcx) / Math.max(dt, 0.001) - avx) * 0.3;
      avy += ((ccy - pcy) / Math.max(dt, 0.001) - avy) * 0.3;
      pcx = ccx; pcy = ccy;

      // cursor (camera space) + ripple on the sheet
      const mcx = ndc.x * hW, mcy = ndc.y * hH;
      const moving = performance.now() - lastMove < 120;
      moveAmt += ((moving ? 1 : 0) - moveAmt) * 0.06;
      lu.uMs.value = moveAmt;
      ray.setFromCamera(ndc, cam);
      if (ray.ray.intersectPlane(plane0, hit)) lu.uM.value.set(hit.x / GS, hit.y / GS);

      const h3 = dt / 3, qk = 1 - Math.exp(-dt * 5);
      lenses.forEach((m, i) => {
        const st = m.userData, U = m.material.uniforms, b = BL[i], ph = i * 1.3;
        // pose inside the logo formation
        const lx = (b.x * F.c - b.y * F.s - F.cx) * k, ly = (b.x * F.s + b.y * F.c - F.cy) * k;
        let tx = ccx + lx + Math.sin(T * 0.45 + ph) * 0.06 * k;
        let ty = ccy + ly + Math.cos(T * 0.38 + ph * 1.4) * 0.05 * k;
        // gentle push away from the cursor
        const dx = tx - mcx, dy = ty - mcy, d = Math.hypot(dx, dy) + 0.001;
        const f = Math.exp(-d * d * 0.35) * 0.3 * k * (0.3 + 0.7 * moveAmt);
        st.ox += (dx / d * f - st.ox) * 0.08; st.oy += (dy / d * f - st.oy) * 0.08;
        tx += st.ox; ty += st.oy;

        const on = shown >= 0 && !leaving && k > 0 && T > bornT + RANK[i] * 0.07;
        const br = 1 + 0.025 * Math.sin(T * 1.1 + ph);
        const tsx = on ? b.a * k * br : 0, tsy = on ? b.b * k * br : 0;
        const om = st.om * 1.6, ze = 0.62, lead = 2 * ze / om, so = st.om * 1.35;
        tgt.set(tx + avx * lead, ty + avy * lead, -DD);

        if (snap) { st.p.copy(tgt); st.v.set(0, 0, 0); st.s.set(0, 0, 0); st.sv.set(0, 0, 0); st.init = true; }
        vT.set(tsx, tsy, 0.32 * Math.min(tsx, tsy));
        for (let n = 0; n < 3; n++) {
          st.v.x += (tgt.x - st.p.x) * om * om * h3; st.v.y += (tgt.y - st.p.y) * om * om * h3; st.v.z += (tgt.z - st.p.z) * om * om * h3;
          st.v.multiplyScalar(1 - 2 * ze * om * h3);
          st.p.addScaledVector(st.v, h3);
          st.sv.x += (vT.x - st.s.x) * so * so * h3; st.sv.y += (vT.y - st.s.y) * so * so * h3; st.sv.z += (vT.z - st.s.z) * so * so * h3;
          st.sv.multiplyScalar(1 - 2 * 0.5 * so * h3);
          st.s.addScaledVector(st.sv, h3);
        }
        st.s.set(Math.max(0, st.s.x), Math.max(0, st.s.y), Math.max(0, st.s.z));

        // hard clamp to the card's empty area so a blob can never cover the copy
        if (v && v.w > 0 && v.h > 0) {
          const a = b.ang + F.rot, ca = Math.cos(a), sa = Math.sin(a);
          const ex = Math.hypot(st.s.x * ca, st.s.y * sa), ey = Math.hypot(st.s.x * sa, st.s.y * ca);
          const x0 = toX(v.l) + ex, x1 = toX(v.r) - ex, y0 = toY(v.b) + ey, y1 = toY(v.t) - ey;
          if (x0 > x1) st.p.x = (x0 + x1) / 2;
          else if (st.p.x < x0) { st.p.x = x0; if (st.v.x < 0) st.v.x *= -0.25; }
          else if (st.p.x > x1) { st.p.x = x1; if (st.v.x > 0) st.v.x *= -0.25; }
          if (y0 > y1) st.p.y = (y0 + y1) / 2;
          else if (st.p.y < y0) { st.p.y = y0; if (st.v.y < 0) st.v.y *= -0.25; }
          else if (st.p.y > y1) { st.p.y = y1; if (st.v.y > 0) st.v.y *= -0.25; }
        } else {
          st.s.multiplyScalar(0.6); st.sv.set(0, 0, 0);
        }

        // orientation: faces the camera, slow tilt with cursor + idle sway
        eu.set(-my * 0.15 + Math.sin(T * 0.43 + ph) * 0.06, mx * 0.2 + Math.cos(T * 0.37 + ph) * 0.07, 0);
        st.qL.setFromEuler(eu).multiply(qZ.setFromAxisAngle(Z, b.ang + F.rot + Math.sin(T * 0.4 + ph) * 0.05));
        qW.copy(cam.quaternion).multiply(st.qL);
        if (snap) m.quaternion.copy(qW); else m.quaternion.slerp(qW, qk);

        m.position.copy(st.p).applyMatrix4(cam.matrixWorld);
        m.scale.set(Math.max(0.001, st.s.x), Math.max(0.001, st.s.y), Math.max(0.001, st.s.z));
        m.visible = st.s.x > 0.004;

        // jelly: the blob's own velocity, in its local space, stretches it like a drop
        vT.copy(st.v).multiplyScalar(0.045);
        const ml = 0.45 * Math.max(m.scale.x, m.scale.y);
        if (vT.length() > ml) vT.setLength(ml);
        vT.applyQuaternion(qI.copy(st.qL).invert());
        vT.set(
          cl((vT.x / m.scale.x + 0.7) / 1.4) * 1.4 - 0.7,
          cl((vT.y / m.scale.y + 0.7) / 1.4) * 1.4 - 0.7,
          cl((vT.z / m.scale.z + 0.7) / 1.4) * 1.4 - 0.7
        );
        U.uVel.value.lerp(vT, 0.25);
        st.w += ((0.028 + 0.05 * Math.min(1, st.v.length() * 0.3)) - st.w) * 0.06;
        U.uWob.value = st.w;
        U.uAl.value = 1; U.uHi.value = 0; U.uFog.value = 0;

        // dents in the grid under each blob
        if (m.visible) {
          dir.subVectors(m.position, cam.position);
          if (dir.z < -1e-4) {
            const t = -cam.position.z / dir.z;
            hit.copy(cam.position).addScaledVector(dir, t);
            dUni[i].set(hit.x / GS, hit.y / GS, Math.max(0.05, (st.s.x + st.s.y) / 2 * t * 1.1 / GS));
          } else dUni[i].set(99, 99, 1);
        } else dUni[i].set(99, 99, 1);
      });
      snap = false;

      R.render(scene, cam);
    }
    requestAnimationFrame(frame);
  }

  // ==========================================================================
  // 2. LENIS & GSAP SCROLLTRIGGER PINNED HORIZONTAL SCROLL
  // ==========================================================================
  function initScroll() {
    if (typeof Lenis === 'undefined' || typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
    gsap.registerPlugin(ScrollTrigger);

    const lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 1.0, touchMultiplier: 1.5, infinite: false });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(time => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);

    if (stage && strip) {
      const amount = () => strip.scrollWidth - window.innerWidth;
      gsap.to(strip, {
        x: () => -amount(),
        ease: 'none',
        scrollTrigger: {
          trigger: stage,
          pin: true,
          scrub: 1,
          start: 'top top',
          end: () => `+=${amount()}`,
          invalidateOnRefresh: true
        }
      });
    }
    addEventListener('resize', () => ScrollTrigger.refresh());
  }

  function init() {
    initScene();
    initScroll();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
