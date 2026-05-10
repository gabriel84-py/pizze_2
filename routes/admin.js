const express  = require('express');
const router   = express.Router();
const bcrypt   = require('bcrypt');
const multer   = require('multer');
const sharp    = require('sharp');
const path     = require('path');
const fs       = require('fs');
const db       = require('../db/database');
const { requireAuth } = require('../middleware/auth');

const UPLOADS_DIR = path.join(__dirname, '..', 'public', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// Multer: stockage en mémoire pour traitement sharp
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    if (!file.mimetype.startsWith('image/')) return cb(new Error('Fichier image requis'));
    cb(null, true);
  }
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function getSettings() {
  return Object.fromEntries(db.prepare(`SELECT key, value FROM settings`).all().map(r => [r.key, r.value]));
}

function log(req, action, details = '') {
  db.prepare(`INSERT INTO activity_logs(admin_id,username,action,details) VALUES(?,?,?,?)`)
    .run(req.session.adminId, req.session.adminUsername, action, details);
}

async function processImage(buffer, filename) {
  const name = `${Date.now()}-${filename.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9.-]/g, '')}.webp`;
  const dest = path.join(UPLOADS_DIR, name);
  await sharp(buffer).resize(1400, 1400, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 82 }).toFile(dest);
  return name;
}

// ── Login / Logout ────────────────────────────────────────────────────────────
router.get('/login', (req, res) => {
  if (req.session?.adminId) return res.redirect('/admin');
  res.render('admin/login', { error: null, next: req.query.next || '/admin' });
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const next = req.body.next || '/admin';
  const user = db.prepare(`SELECT * FROM admin_users WHERE username = ?`).get(username);
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.render('admin/login', { error: 'Identifiants incorrects', next });
  }
  req.session.adminId       = user.id;
  req.session.adminUsername = user.username;
  log(req, 'login', `Connexion réussie`);
  res.redirect(next);
});

router.get('/logout', requireAuth, (req, res) => {
  log(req, 'logout', '');
  req.session.destroy(() => res.redirect('/admin/login'));
});

// ── Dashboard ─────────────────────────────────────────────────────────────────
router.get('/', requireAuth, (req, res) => {
  const s     = getSettings();
  const stats = {
    pizzas:   db.prepare(`SELECT COUNT(*) as c FROM menu_items`).get().c,
    photos:   db.prepare(`SELECT COUNT(*) as c FROM gallery`).get().c,
    avis:     db.prepare(`SELECT COUNT(*) as c FROM testimonials WHERE is_visible=1`).get().c,
  };
  const logs = db.prepare(`SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 20`).all();
  res.render('admin/dashboard', { s, stats, logs, admin: req.session.adminUsername });
});

// ── Menu ──────────────────────────────────────────────────────────────────────
router.get('/menu', requireAuth, (req, res) => {
  const s    = getSettings();
  const cats = db.prepare(`SELECT * FROM menu_categories ORDER BY sort_order`).all();
  const items= db.prepare(`SELECT mi.*, mc.name as cat_name FROM menu_items mi JOIN menu_categories mc ON mc.id=mi.category_id ORDER BY mc.sort_order, mi.sort_order`).all();
  res.render('admin/menu', { s, cats, items, admin: req.session.adminUsername });
});

router.post('/menu/item/add', requireAuth, upload.single('photo'), async (req, res) => {
  const { category_id, name, price, description, badge_veggie, badge_piquant, badge_truffe, is_featured, sort_order } = req.body;
  let photo = '';
  if (req.file) photo = await processImage(req.file.buffer, req.file.originalname);
  db.prepare(`INSERT INTO menu_items(category_id,name,price,description,photo,badge_veggie,badge_piquant,badge_truffe,is_featured,sort_order) VALUES(?,?,?,?,?,?,?,?,?,?)`)
    .run(category_id, name, parseFloat(price), description || '', photo, badge_veggie?1:0, badge_piquant?1:0, badge_truffe?1:0, is_featured?1:0, parseInt(sort_order)||0);
  log(req, 'menu_add', `Ajout pizza: ${name}`);
  res.redirect('/admin/menu#cat-' + category_id);
});

router.post('/menu/item/:id/edit', requireAuth, upload.single('photo'), async (req, res) => {
  const { name, price, description, badge_veggie, badge_piquant, badge_truffe, is_featured, is_available, sort_order, category_id } = req.body;
  const item = db.prepare(`SELECT * FROM menu_items WHERE id=?`).get(req.params.id);
  if (!item) return res.redirect('/admin/menu');
  let photo = item.photo;
  if (req.file) {
    if (photo) { try { fs.unlinkSync(path.join(UPLOADS_DIR, photo)); } catch(e){} }
    photo = await processImage(req.file.buffer, req.file.originalname);
  }
  db.prepare(`UPDATE menu_items SET category_id=?,name=?,price=?,description=?,photo=?,badge_veggie=?,badge_piquant=?,badge_truffe=?,is_featured=?,is_available=?,sort_order=? WHERE id=?`)
    .run(category_id, name, parseFloat(price), description||'', photo, badge_veggie?1:0, badge_piquant?1:0, badge_truffe?1:0, is_featured?1:0, is_available?1:0, parseInt(sort_order)||0, req.params.id);
  log(req, 'menu_edit', `Modif pizza: ${name}`);
  res.redirect('/admin/menu');
});

router.post('/menu/item/:id/delete', requireAuth, (req, res) => {
  const item = db.prepare(`SELECT * FROM menu_items WHERE id=?`).get(req.params.id);
  if (item?.photo) { try { fs.unlinkSync(path.join(UPLOADS_DIR, item.photo)); } catch(e){} }
  db.prepare(`DELETE FROM menu_items WHERE id=?`).run(req.params.id);
  log(req, 'menu_delete', `Suppression pizza: ${item?.name}`);
  res.redirect('/admin/menu');
});

router.post('/menu/category/add', requireAuth, (req, res) => {
  const { name, slug, sort_order } = req.body;
  db.prepare(`INSERT OR IGNORE INTO menu_categories(name,slug,sort_order) VALUES(?,?,?)`).run(name, slug, parseInt(sort_order)||99);
  log(req, 'cat_add', `Catégorie: ${name}`);
  res.redirect('/admin/menu');
});

router.post('/menu/category/:id/edit', requireAuth, (req, res) => {
  const { name, sort_order, is_active } = req.body;
  db.prepare(`UPDATE menu_categories SET name=?,sort_order=?,is_active=? WHERE id=?`)
    .run(name, parseInt(sort_order)||0, is_active?1:0, req.params.id);
  log(req, 'cat_edit', `Catégorie modifiée: ${name}`);
  res.redirect('/admin/menu');
});

// ── Horaires ──────────────────────────────────────────────────────────────────
router.get('/horaires', requireAuth, (req, res) => {
  const s        = getSettings();
  const horaires = db.prepare(`SELECT * FROM horaires ORDER BY CASE day_of_week WHEN 1 THEN 1 WHEN 2 THEN 2 WHEN 3 THEN 3 WHEN 4 THEN 4 WHEN 5 THEN 5 WHEN 6 THEN 6 WHEN 0 THEN 7 END`).all();
  res.render('admin/horaires', { s, horaires, admin: req.session.adminUsername, saved: !!req.query.saved });
});

router.post('/horaires', requireAuth, (req, res) => {
  const upd = db.prepare(`UPDATE horaires SET opens=?,closes=?,is_closed=? WHERE day_of_week=?`);
  const txn = db.transaction(() => {
    for (let dow = 0; dow <= 6; dow++) {
      const closed = req.body[`closed_${dow}`] ? 1 : 0;
      const opens  = req.body[`opens_${dow}`]  || null;
      const closes = req.body[`closes_${dow}`] || null;
      upd.run(closed ? null : opens, closed ? null : closes, closed, dow);
    }
  });
  txn();
  log(req, 'horaires_edit', 'Horaires mis à jour');
  res.redirect('/admin/horaires?saved=1');
});

// ── Galerie ───────────────────────────────────────────────────────────────────
router.get('/galerie', requireAuth, (req, res) => {
  const s      = getSettings();
  const photos = db.prepare(`SELECT * FROM gallery ORDER BY sort_order, id`).all();
  res.render('admin/galerie', { s, photos, admin: req.session.adminUsername });
});

router.post('/galerie/upload', requireAuth, upload.array('photos', 20), async (req, res) => {
  if (!req.files?.length) return res.redirect('/admin/galerie');
  for (const file of req.files) {
    const name = await processImage(file.buffer, file.originalname);
    const maxOrder = db.prepare(`SELECT COALESCE(MAX(sort_order),0) as m FROM gallery`).get().m;
    db.prepare(`INSERT INTO gallery(filename,caption,sort_order) VALUES(?,?,?)`).run(name, '', maxOrder + 1);
  }
  log(req, 'gallery_upload', `${req.files.length} photo(s) ajoutée(s)`);
  res.redirect('/admin/galerie');
});

router.post('/galerie/:id/caption', requireAuth, (req, res) => {
  db.prepare(`UPDATE gallery SET caption=? WHERE id=?`).run(req.body.caption || '', req.params.id);
  res.json({ ok: true });
});

router.post('/galerie/:id/order', requireAuth, (req, res) => {
  db.prepare(`UPDATE gallery SET sort_order=? WHERE id=?`).run(parseInt(req.body.order)||0, req.params.id);
  res.json({ ok: true });
});

router.post('/galerie/:id/delete', requireAuth, (req, res) => {
  const photo = db.prepare(`SELECT * FROM gallery WHERE id=?`).get(req.params.id);
  if (photo) {
    try { fs.unlinkSync(path.join(UPLOADS_DIR, photo.filename)); } catch(e){}
    db.prepare(`DELETE FROM gallery WHERE id=?`).run(req.params.id);
    log(req, 'gallery_delete', photo.filename);
  }
  res.redirect('/admin/galerie');
});

// ── Avis ──────────────────────────────────────────────────────────────────────
router.get('/avis', requireAuth, (req, res) => {
  const s    = getSettings();
  const avis = db.prepare(`SELECT * FROM testimonials ORDER BY sort_order`).all();
  res.render('admin/avis', { s, avis, admin: req.session.adminUsername });
});

router.post('/avis/add', requireAuth, (req, res) => {
  const { author, rating, content, date_str, source } = req.body;
  const maxOrder = db.prepare(`SELECT COALESCE(MAX(sort_order),0) as m FROM testimonials`).get().m;
  db.prepare(`INSERT INTO testimonials(author,rating,content,date_str,source,is_visible,sort_order) VALUES(?,?,?,?,?,1,?)`)
    .run(author, parseInt(rating)||5, content, date_str||'', source||'Google', maxOrder+1);
  log(req, 'avis_add', `Avis de ${author}`);
  res.redirect('/admin/avis');
});

router.post('/avis/:id/toggle', requireAuth, (req, res) => {
  const a = db.prepare(`SELECT * FROM testimonials WHERE id=?`).get(req.params.id);
  if (!a) return res.json({ ok: false });
  db.prepare(`UPDATE testimonials SET is_visible=? WHERE id=?`).run(a.is_visible ? 0 : 1, req.params.id);
  res.json({ ok: true, visible: !a.is_visible });
});

router.post('/avis/:id/delete', requireAuth, (req, res) => {
  db.prepare(`DELETE FROM testimonials WHERE id=?`).run(req.params.id);
  log(req, 'avis_delete', `Suppression avis #${req.params.id}`);
  res.redirect('/admin/avis');
});

// ── Contenu général ───────────────────────────────────────────────────────────
router.get('/contenu', requireAuth, (req, res) => {
  const s = getSettings();
  res.render('admin/contenu', {
    s,
    admin:    req.session.adminUsername,
    saved:    !!req.query.saved,
    pwdsaved: !!req.query.pwdsaved,
    pwderror: req.query.pwderror || null,
  });
});

router.post('/contenu', requireAuth, upload.fields([
  { name: 'hero_photo',   maxCount: 1 },
  { name: 'about_photo_1', maxCount: 1 },
  { name: 'about_photo_2', maxCount: 1 },
]), async (req, res) => {
  const s = getSettings();
  const textFields = [
    'site_name','phone','phone_display','email','address_street','address_city','address_zip',
    'hero_title','hero_tagline','about_title','about_text',
    'facebook_url','instagram_url','uber_eats_url','uber_eats_active',
    'announcement','announcement_active',
    'meta_description','meta_keywords','google_maps_url',
    'hebergeur'
  ];
  const upsert = db.prepare(`INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value`);
  const txn = db.transaction(async () => {
    for (const field of textFields) {
      if (req.body[field] !== undefined) upsert.run(field, req.body[field]);
    }
  });
  txn();

  // Photos
  for (const [field, files] of Object.entries(req.files || {})) {
    if (!files[0]) continue;
    if (s[field]) { try { fs.unlinkSync(path.join(UPLOADS_DIR, s[field])); } catch(e){} }
    const name = await processImage(files[0].buffer, files[0].originalname);
    db.prepare(`INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value`).run(field, name);
  }

  log(req, 'contenu_edit', 'Contenu général mis à jour');
  res.redirect('/admin/contenu?saved=1');
});

// ── Mot de passe ──────────────────────────────────────────────────────────────
router.post('/password', requireAuth, async (req, res) => {
  const { current, newpw, confirm } = req.body;
  const user = db.prepare(`SELECT * FROM admin_users WHERE id=?`).get(req.session.adminId);
  if (!user || !(await bcrypt.compare(current, user.password_hash))) {
    return res.redirect('/admin/contenu?pwderror=1');
  }
  if (newpw !== confirm || newpw.length < 8) {
    return res.redirect('/admin/contenu?pwderror=2');
  }
  const hash = await bcrypt.hash(newpw, 12);
  db.prepare(`UPDATE admin_users SET password_hash=? WHERE id=?`).run(hash, user.id);
  log(req, 'password_change', 'Mot de passe modifié');
  res.redirect('/admin/contenu?pwdsaved=1');
});

// ── Logs ──────────────────────────────────────────────────────────────────────
router.get('/logs', requireAuth, (req, res) => {
  const s    = getSettings();
  const logs = db.prepare(`SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 200`).all();
  res.render('admin/logs', { s, logs, admin: req.session.adminUsername });
});

module.exports = router;
