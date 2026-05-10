const path = require('path');
const fs   = require('fs');

const SUPPORTED = ['fr', 'en', 'it'];
const DEFAULT   = 'fr';

const locales = {};
SUPPORTED.forEach(lang => {
  const file = path.join(__dirname, '..', 'locales', `${lang}.json`);
  locales[lang] = JSON.parse(fs.readFileSync(file, 'utf-8'));
});

function i18nMiddleware(req, res, next) {
  // Detect lang: query > cookie > accept-language > default
  let lang = req.query.lang || req.cookies?.lang || DEFAULT;
  if (!SUPPORTED.includes(lang)) lang = DEFAULT;

  // Persist in cookie (no need for extra dep, use res.cookie via express)
  if (req.query.lang && SUPPORTED.includes(req.query.lang)) {
    res.cookie('lang', lang, { maxAge: 365 * 24 * 3600 * 1000, httpOnly: false });
  }

  req.lang = lang;
  res.locals.lang  = lang;
  res.locals.langs = SUPPORTED;
  res.locals.t     = (key, vars) => {
    const keys = key.split('.');
    let val = locales[lang];
    for (const k of keys) val = val?.[k];
    if (!val) {
      // Fallback to FR
      let fallback = locales[DEFAULT];
      for (const k of keys) fallback = fallback?.[k];
      val = fallback || key;
    }
    if (vars) {
      Object.entries(vars).forEach(([k, v]) => { val = val.replace(`{{${k}}}`, v); });
    }
    return val;
  };
  next();
}

module.exports = i18nMiddleware;
