/* ── Navigation scroll ─────────────────────────────────────────────────── */
const header = document.getElementById('site-header');
if (header) {
  const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 20);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

/* ── Burger menu ────────────────────────────────────────────────────────── */
const burger    = document.getElementById('burger-btn');
const mobileNav = document.getElementById('mobile-nav');
if (burger && mobileNav) {
  burger.addEventListener('click', () => {
    const open = mobileNav.classList.toggle('open');
    burger.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', open);
  });
  document.addEventListener('click', e => {
    if (!header.contains(e.target)) {
      mobileNav.classList.remove('open');
      burger.classList.remove('open');
      burger.setAttribute('aria-expanded', false);
    }
  });
}

/* ── Reveal on scroll ───────────────────────────────────────────────────── */
const revealSelectors = '.reveal, .reveal-left, .reveal-right, .reveal-scale';
const reveals = document.querySelectorAll(revealSelectors);
if (reveals.length) {
  const io = new IntersectionObserver(
    (entries) => entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); }
    }),
    { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
  );
  reveals.forEach(el => io.observe(el));
}

/* ── Menu tabs ──────────────────────────────────────────────────────────── */
const tabs   = document.querySelectorAll('.menu-tab-btn');
const panels = document.querySelectorAll('.menu-panel');
tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    tabs.forEach(t => { t.classList.remove('active'); t.setAttribute('aria-selected', false); });
    panels.forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    tab.setAttribute('aria-selected', true);
    const target = document.getElementById(tab.dataset.panel);
    if (target) target.classList.add('active');
  });
});

/* ── Smooth anchor scroll ───────────────────────────────────────────────── */
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const target = document.querySelector(a.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    const offset = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-h')) || 76;
    window.scrollTo({ top: target.offsetTop - offset - 16, behavior: 'smooth' });
  });
});
