/**
 * Qywam Services Environment Initializer
 * Runs synchronously in <head> to set correct layout classes before first paint,
 * preventing any flash of unstyled content or layout shifts while respecting CSP.
 */
(function() {
  try {
    var doc = document.documentElement;
    doc.classList.remove('no-js');
    doc.classList.add('js');

    var prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var isMobile = window.innerWidth < 768;

    if (!prefersReduced && !isMobile) {
      doc.classList.add('hz');
      doc.classList.remove('carousel-mode', 'stacked-mode');
    } else if (!prefersReduced && isMobile) {
      doc.classList.add('carousel-mode');
      doc.classList.remove('hz', 'stacked-mode');
    } else {
      doc.classList.add('stacked-mode');
      doc.classList.remove('hz', 'carousel-mode');
    }
  } catch (e) {
    // Graceful fallback to stacked mode
    if (document.documentElement) {
      document.documentElement.classList.add('stacked-mode');
    }
  }
})();
