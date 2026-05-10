const express = require('express');
const router  = express.Router();
const db      = require('../db/database');

// ── Helpers ───────────────────────────────────────────────────────────────────
function getSettings() {
  const rows = db.prepare(`SELECT key, value FROM settings`).all();
  return Object.fromEntries(rows.map(r => [r.key, r.value]));
}

function getHoraires() {
  return db.prepare(`SELECT * FROM horaires ORDER BY CASE day_of_week WHEN 1 THEN 1 WHEN 2 THEN 2 WHEN 3 THEN 3 WHEN 4 THEN 4 WHEN 5 THEN 5 WHEN 6 THEN 6 WHEN 0 THEN 7 END`).all();
}

function getOpenStatus(horaires) {
  const now  = new Date();
  const dow  = now.getDay(); // 0=dim, 1=lun …
  const hhmm = now.getHours() * 100 + now.getMinutes();

  const today = horaires.find(h => h.day_of_week === dow);
  if (!today || today.is_closed) return { open: false, nextOpen: getNextOpen(horaires, dow) };

  const [oh, om] = today.opens.split(':').map(Number);
  const [ch, cm] = today.closes.split(':').map(Number);
  const openMin  = oh * 100 + om;
  const closeMin = ch * 100 + cm;

  if (hhmm >= openMin && hhmm < closeMin) return { open: true, closes: today.closes };
  if (hhmm < openMin) return { open: false, opensAt: today.opens };
  return { open: false, nextOpen: getNextOpen(horaires, dow) };
}

function getNextOpen(horaires, currentDow) {
  for (let i = 1; i <= 7; i++) {
    const d = (currentDow + i) % 7;
    const h = horaires.find(x => x.day_of_week === d);
    if (h && !h.is_closed) return { day: h.day_name_fr, time: h.opens };
  }
  return null;
}

function getMenuByCategories() {
  const cats  = db.prepare(`SELECT * FROM menu_categories WHERE is_active=1 ORDER BY sort_order`).all();
  const items = db.prepare(`SELECT * FROM menu_items WHERE is_available=1 ORDER BY sort_order`).all();
  return cats.map(c => ({ ...c, items: items.filter(i => i.category_id === c.id) }));
}

// ── Routes publiques ──────────────────────────────────────────────────────────
router.get('/', (req, res) => {
  const s        = getSettings();
  const horaires = getHoraires();
  const status   = getOpenStatus(horaires);
  const featured = db.prepare(`SELECT * FROM menu_items WHERE is_featured=1 AND is_available=1 ORDER BY sort_order LIMIT 4`).all();
  const testis   = db.prepare(`SELECT * FROM testimonials WHERE is_visible=1 ORDER BY sort_order LIMIT 6`).all();

  res.render('index', { s, horaires, status, featured, testis, page: 'home' });
});

router.get('/carte', (req, res) => {
  const s       = getSettings();
  const horaires = getHoraires();
  const status  = getOpenStatus(horaires);
  const menu    = getMenuByCategories();
  res.render('carte', { s, menu, status, page: 'carte' });
});

router.get('/notre-histoire', (req, res) => {
  const s      = getSettings();
  const horaires = getHoraires();
  const status = getOpenStatus(horaires);
  res.render('histoire', { s, status, page: 'histoire' });
});

router.get('/avis', (req, res) => {
  const s      = getSettings();
  const horaires = getHoraires();
  const status = getOpenStatus(horaires);
  const testis = db.prepare(`SELECT * FROM testimonials WHERE is_visible=1 ORDER BY sort_order`).all();
  res.render('avis', { s, testis, status, page: 'avis' });
});

router.get('/mentions-legales', (req, res) => {
  const s = getSettings();
  res.render('mentions-legales', { s, page: 'legal' });
});

router.get('/cookies', (req, res) => {
  const s = getSettings();
  res.render('cookies', { s, page: 'cookies' });
});

module.exports = router;
module.exports.getSettings   = getSettings;
module.exports.getHoraires   = getHoraires;
module.exports.getOpenStatus = getOpenStatus;
