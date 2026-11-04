/* ============================================================
   THE LAGOON TRAVEL — main.js
   Navigation, scroll reveal, activity tabs, stats counter
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initScrollReveal();
  initTabs();
  initStatsCounter();
  initStickyNav();
  initTestimonialsCarousel();
});

/* ── Navigation ──────────────────────────────────────── */

function initNav() {
  const hamburger = document.getElementById('navHamburger');
  const overlay   = document.getElementById('navOverlay');
  if (!hamburger || !overlay) return;

  hamburger.addEventListener('click', () => {
    const isOpen = overlay.classList.contains('open');
    overlay.classList.toggle('open', !isOpen);
    hamburger.classList.toggle('active', !isOpen);
    document.body.style.overflow = isOpen ? '' : 'hidden';
    hamburger.setAttribute('aria-expanded', String(!isOpen));
  });

  // Close on X button
  const menuClose = document.querySelector('.menu-close');
  if (menuClose) menuClose.addEventListener('click', closeNav);

  // Close on link click
  overlay.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', closeNav);
  });

  // Close on Escape
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeNav();
  });

  // Submenu toggles
  overlay.querySelectorAll('.nav-menu-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const submenu = btn.nextElementSibling;
      const chevron = btn.querySelector('.nav-chevron');
      const isOpen  = submenu.classList.contains('open');

      // Close all other submenus
      overlay.querySelectorAll('.nav-submenu.open').forEach(sm => sm.classList.remove('open'));
      overlay.querySelectorAll('.nav-menu-btn.open').forEach(b => b.classList.remove('open'));

      if (!isOpen) {
        submenu.classList.add('open');
        btn.classList.add('open');
      }
    });
  });
}

function closeNav() {
  const hamburger = document.getElementById('navHamburger');
  const overlay   = document.getElementById('navOverlay');
  if (!overlay) return;
  overlay.classList.remove('open');
  if (hamburger) hamburger.classList.remove('active');
  document.body.style.overflow = '';
}

/* ── Sticky Nav ──────────────────────────────────────── */

function initStickyNav() {
  const navbar = document.querySelector('.navbar');
  if (!navbar) return;

  let lastScrollY = 0;

  const update = () => {
    const scrollY = window.scrollY;
    navbar.classList.toggle('scrolled', scrollY > 40);
    lastScrollY = scrollY;
  };

  window.addEventListener('scroll', update, { passive: true });
  update();
}

/* ── Scroll Reveal ───────────────────────────────────── */

function initScrollReveal() {
  window.__fadeReady = true; // lu par le filet de sécurité du <head>
  if (!('IntersectionObserver' in window)) {
    // Fallback: make all visible immediately
    document.querySelectorAll('.fade-up, .fade-in, .fade-left, .fade-right').forEach(el => {
      el.classList.add('visible');
    });
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px 160px 0px' }
  );

  document.querySelectorAll('.fade-up, .fade-in, .fade-left, .fade-right').forEach(el => {
    observer.observe(el);
  });
}

/* ── Activity Tabs ───────────────────────────────────── */

function initTabs() {
  const tabBtns   = document.querySelectorAll('.tab-btn');
  const tabPanels = document.querySelectorAll('.tab-panel');
  if (!tabBtns.length) return;

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;

      tabBtns.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      tabPanels.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');

      const panel = document.getElementById(target);
      if (panel) panel.classList.add('active');
    });
  });
}

/* ── Testimonials Carousel (Nos Réalisations) ─────────── */

function initTestimonialsCarousel() {
  const track    = document.getElementById('testimonialsTrack');
  const prevBtn  = document.getElementById('testiArrowLeft');
  const nextBtn  = document.getElementById('testiArrowRight');
  if (!track || !prevBtn || !nextBtn) return;

  const scrollByCard = (dir) => {
    const card = track.querySelector('.testimonial-card');
    const gap  = parseFloat(getComputedStyle(track).columnGap) || 0;
    const amount = card ? card.getBoundingClientRect().width + gap : track.clientWidth;
    const maxScrollLeft = track.scrollWidth - track.clientWidth;

    if (dir > 0 && track.scrollLeft >= maxScrollLeft - 1) {
      track.scrollTo({ left: 0, behavior: 'smooth' });
    } else if (dir < 0 && track.scrollLeft <= 1) {
      track.scrollTo({ left: maxScrollLeft, behavior: 'smooth' });
    } else {
      track.scrollBy({ left: dir * amount, behavior: 'smooth' });
    }
  };

  prevBtn.addEventListener('click', () => scrollByCard(-1));
  nextBtn.addEventListener('click', () => scrollByCard(1));
}

/* ── Stats Counter ───────────────────────────────────── */

function initStatsCounter() {
  const statEls = document.querySelectorAll('[data-count]');
  if (!statEls.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animateCount(entry.target);
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.5 }
  );

  statEls.forEach(el => observer.observe(el));
}

function animateCount(el) {
  const target   = parseInt(el.dataset.count, 10);
  const suffix   = el.dataset.suffix || '';
  const duration = 1800;
  const start    = performance.now();

  const update = (now) => {
    const progress = Math.min((now - start) / duration, 1);
    const eased    = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.floor(eased * target) + suffix;
    if (progress < 1) requestAnimationFrame(update);
  };

  requestAnimationFrame(update);
}

/* ── Active nav link ─────────────────────────────────── */

(function highlightCurrentPage() {
  const path = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-submenu a, .nav-menu > li > a').forEach(link => {
    const href = link.getAttribute('href') || '';
    if (href === path || (path === '' && href === 'index.html')) {
      link.style.color = 'var(--blue-logo)';
    }
  });
})();

/* ── Show toast notification ─────────────────────────── */

function showToast(msg, duration = 3000) {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('show'), duration);
}
