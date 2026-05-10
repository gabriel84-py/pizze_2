function requireAuth(req, res, next) {
  if (req.session && req.session.adminId) return next();
  res.redirect('/admin/login?next=' + encodeURIComponent(req.originalUrl));
}

module.exports = { requireAuth };
