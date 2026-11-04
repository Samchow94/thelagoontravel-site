/* ============================================================
   THE LAGOON TRAVEL — blog.js
   Blog listing with category filters
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  initBlogFilters();
});

function initBlogFilters() {
  const filterBtns = document.querySelectorAll('.blog-filter-btn');
  const cards       = document.querySelectorAll('.blog-card-wrap');
  if (!filterBtns.length) return;

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const cat = btn.dataset.filter;

      cards.forEach(card => {
        const match = cat === 'all' || card.dataset.category === cat;
        card.style.display  = match ? 'block' : 'none';
        card.style.opacity  = match ? '1' : '0';
      });
    });
  });
}
