require('dotenv').config();
const express      = require('express');
const path         = require('path');
const session      = require('express-session');
const SQLiteStore  = require('connect-sqlite3')(session);
const i18n         = require('./middleware/i18n');
const publicRouter = require('./routes/public');
const adminRouter  = require('./routes/admin');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── View engine ───────────────────────────────────────────────────────────────
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ── Static ────────────────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

// ── Body parsers ──────────────────────────────────────────────────────────────
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ── Sessions ──────────────────────────────────────────────────────────────────
app.use(session({
  store: new SQLiteStore({ db: 'sessions.db', dir: path.join(__dirname, 'db') }),
  secret:            process.env.SESSION_SECRET || 'parigina_secret_key_change_me',
  resave:            false,
  saveUninitialized: false,
  cookie: {
    maxAge:   7 * 24 * 3600 * 1000,
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  }
}));

// ── i18n ──────────────────────────────────────────────────────────────────────
app.use(i18n);

// ── Globals injectés dans toutes les vues ─────────────────────────────────────
const db = require('./db/database');
app.use((req, res, next) => {
  // Horaires toujours disponibles dans les templates (footer, etc.)
  if (!res.locals.horaires) {
    res.locals.horaires = db.prepare(
      `SELECT * FROM horaires ORDER BY CASE day_of_week WHEN 1 THEN 1 WHEN 2 THEN 2 WHEN 3 THEN 3 WHEN 4 THEN 4 WHEN 5 THEN 5 WHEN 6 THEN 6 WHEN 0 THEN 7 END`
    ).all();
  }
  if (!res.locals.s) {
    const rows = db.prepare(`SELECT key, value FROM settings`).all();
    res.locals.s = Object.fromEntries(rows.map(r => [r.key, r.value]));
  }
  next();
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/', publicRouter);
app.use('/admin', adminRouter);

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).render('404', { page: '404', s: {} });
});

// ── Error handler ─────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).send('Erreur serveur');
});

app.listen(PORT, () => {
  console.log(`\n🍕 Parigina démarré sur http://localhost:${PORT}`);
  console.log(`🔑 Admin : http://localhost:${PORT}/admin\n`);
});
