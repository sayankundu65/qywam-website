/**
 * Qywam Services Page Controller
 * Lenis + GSAP ScrollTrigger horizontal scrub & WebGL hero blob choreography
 * EXACTLY 1 BLOB PER SERVICE SECTION matching mantis.works interaction model
 */
(function() {
  'use strict';

  // DOM Elements
  const stage = document.getElementById('services-stage');
  const strip = document.getElementById('horizontal-strip');
  const canvas = document.getElementById('c');
  const visualSlots = Array.from(document.querySelectorAll('.panel-visual'));

  // Three.js and animation variables
  let renderer = null, scene = null, camera = null;
  let heroBlobMeshes = [];
  let lenis = null;
  let scrollTriggerInstance = null;
  let mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
  let clock = null;

  // ==========================================================================
  // 2. WEBGL HERO BLOB SCENE (EXACTLY 1 BLOB PER SERVICE SECTION)
  // ==========================================================================
  const BLOB_CONFIGS = [
    { name: 'Generative Advertising', colorOffset: 0.00, wobble: 0.042, seed: 0.5, speed: 1.00 },
    { name: 'Creative Development',   colorOffset: 0.22, wobble: 0.050, seed: 2.1, speed: 1.15 },
    { name: 'Limitless Production',   colorOffset: 0.48, wobble: 0.056, seed: 3.8, speed: 0.95 },
    { name: 'Story-led Video',        colorOffset: 0.72, wobble: 0.046, seed: 5.4, speed: 1.05 },
    { name: 'Campaign-scale Assets',  colorOffset: 0.95, wobble: 0.060, seed: 7.1, speed: 1.20 },
    { name: 'Connected Channels',     colorOffset: 1.22, wobble: 0.048, seed: 8.7, speed: 0.92 }
  ];

  function initWebGL() {
    if (!canvas || typeof THREE === 'undefined') return;

    // Check WebGL availability
    try {
      renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance'
      });
    } catch (e) {
      document.documentElement.classList.add('no-webgl');
      return;
    }

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.z = 10;

    clock = new THREE.Clock();

    // Reusable geometry for high-detail liquid fluid blob
    const geometry = new THREE.SphereGeometry(1.65, 80, 80);

    // Create exactly 1 hero blob mesh per service section
    heroBlobMeshes = BLOB_CONFIGS.map((cfg, idx) => {
      const mat = new THREE.ShaderMaterial({
        uniforms: {
          uT: { value: 0 },
          uSeed: { value: cfg.seed },
          uHi: { value: 0 },
          uAl: { value: 1.0 },
          uFog: { value: 0 },
          uWob: { value: cfg.wobble },
          uColorOffset: { value: cfg.colorOffset },
          uVel: { value: new THREE.Vector3() }
        },
        vertexShader: window.QywamBlobs ? window.QywamBlobs.lensVS : '',
        fragmentShader: window.QywamBlobs ? window.QywamBlobs.lensFS : '',
        transparent: true
      });

      const mesh = new THREE.Mesh(geometry, mat);
      mesh.frustumCulled = false;
      mesh.visible = (idx === 0);
      mesh.userData = {
        config: cfg,
        index: idx,
        baseRotationY: 0,
        baseRotationX: 0
      };

      scene.add(mesh);
      return mesh;
    });

    // Resize handler
    window.addEventListener('resize', onResize);
    window.addEventListener('mousemove', onMouseMove);

    // Start render loop
    requestAnimationFrame(render);
  }

  function onResize() {
    if (!renderer || !camera) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    if (ScrollTrigger) {
      ScrollTrigger.refresh();
    }
  }

  function onMouseMove(e) {
    mouse.targetX = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.targetY = -(e.clientY / window.innerHeight) * 2 + 1;
  }

  function render() {
    requestAnimationFrame(render);

    const delta = clock ? clock.getDelta() : 0.016;
    const elapsedTime = clock ? clock.getElapsedTime() : 0;

    // Smooth mouse lerp
    mouse.x += (mouse.targetX - mouse.x) * 0.08;
    mouse.y += (mouse.targetY - mouse.y) * 0.08;

    if (!camera || !renderer || !scene) return;

    // Compute visible camera frustum dimensions at z = 0
    const vFov = (camera.fov * Math.PI) / 180;
    const frustumHeight = 2 * Math.tan(vFov / 2) * camera.position.z;
    const frustumWidth = frustumHeight * camera.aspect;

    // Track each hero blob to its respective card's .panel-visual slot
    visualSlots.forEach((slot, idx) => {
      const mesh = heroBlobMeshes[idx];
      if (!mesh) return;

      const rect = slot.getBoundingClientRect();

      // Culling: If slot is far offscreen, hide mesh completely
      if (rect.right < -200 || rect.left > window.innerWidth + 200) {
        mesh.visible = false;
        return;
      }

      mesh.visible = true;

      // Center of slot in screen coords
      const slotCenterX = rect.left + rect.width * 0.5;
      const slotCenterY = rect.top + rect.height * 0.5;

      // Normalized Device Coordinates (-1 to 1)
      const ndcX = (slotCenterX / window.innerWidth) * 2 - 1;
      const ndcY = -(slotCenterY / window.innerHeight) * 2 + 1;

      // World coordinates at z = 0
      const targetWorldX = ndcX * (frustumWidth * 0.5);
      const targetWorldY = ndcY * (frustumHeight * 0.5);

      // Mouse influence when hovering over or near this card
      const distToMouse = Math.hypot(ndcX - mouse.x, ndcY - mouse.y);
      const mouseAttract = Math.max(0, 1 - distToMouse * 0.75);

      mesh.position.x = targetWorldX + (mouse.x * 0.25 * mouseAttract);
      mesh.position.y = targetWorldY + (mouse.y * 0.25 * mouseAttract);
      mesh.position.z = 0;

      // Responsive scale based on slot size
      const minDim = Math.min(rect.width, rect.height);
      const responsiveScale = (minDim / window.innerHeight) * 1.55;
      mesh.scale.set(responsiveScale, responsiveScale, responsiveScale);

      // Continuous fluid animation & slow rotation
      const cfg = mesh.userData.config;
      mesh.rotation.y += 0.007 * cfg.speed;
      mesh.rotation.x = Math.sin(elapsedTime * 0.7 * cfg.speed + idx) * 0.14;
      mesh.rotation.z = Math.cos(elapsedTime * 0.5 * cfg.speed + idx) * 0.08;

      // Update shader uniforms
      if (mesh.material && mesh.material.uniforms) {
        mesh.material.uniforms.uT.value = elapsedTime * cfg.speed;
        mesh.material.uniforms.uVel.value.set(
          (mouse.targetX - mouse.x) * 0.3 * mouseAttract,
          (mouse.targetY - mouse.y) * 0.3 * mouseAttract,
          0
        );
      }
    });

    renderer.render(scene, camera);
  }

  // ==========================================================================
  // 3. LENIS & GSAP SCROLLTRIGGER PINNED HORIZONTAL SCRUB
  // ==========================================================================
  function initScroll() {
    if (typeof Lenis === 'undefined' || typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    // Initialize smooth scrolling with Lenis
    lenis = new Lenis({
      lerp: 0.085,
      wheelMultiplier: 1.0,
      touchMultiplier: 1.5,
      infinite: false
    });

    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(time => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);

    // Pin the horizontal stage and scrub horizontal-strip
    if (stage && strip) {
      function getScrollAmount() {
        return strip.scrollWidth - window.innerWidth;
      }

      scrollTriggerInstance = gsap.to(strip, {
        x: () => -getScrollAmount(),
        ease: 'none',
        scrollTrigger: {
          trigger: stage,
          pin: true,
          scrub: 1,
          start: 'top top',
          end: () => `+=${getScrollAmount()}`,
          invalidateOnRefresh: true
        }
      });
    }
  }

  // ==========================================================================
  // 4. BOOTSTRAP
  // ==========================================================================
  function init() {
    initWebGL();
    initScroll();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
