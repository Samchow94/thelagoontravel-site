/* ============================================================
   THE LAGOON TRAVEL — galerie.js
   GLightbox integration
   ============================================================ */

// GLightbox est chargé en async : l'init se fait quand le DOM ET la bibliothèque sont prêts (dans n'importe quel ordre).
let lightboxReady = false;

document.addEventListener('DOMContentLoaded', () => {
  lightboxReady = true;
  initLightbox();
});

window.initLightbox = initLightbox;

function initLightbox() {
  if (!lightboxReady || typeof GLightbox === 'undefined' || window.__lightbox) return;

  window.__lightbox = GLightbox({
    selector: '.glightbox',
    touchNavigation: true,
    loop: false,
    autoplayVideos: false,
    slideEffect: 'slide',
    closeButton: true,
    openEffect: 'fade',
    closeEffect: 'fade'
  });
}
