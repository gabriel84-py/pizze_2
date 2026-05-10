/* ── Sidebar toggle (mobile) ────────────────────────────────────────────── */
const sidebarToggle = document.getElementById('sidebar-toggle');
const sidebar = document.getElementById('admin-sidebar');
if (sidebarToggle && sidebar) {
  sidebarToggle.addEventListener('click', () => sidebar.classList.toggle('open'));
  document.addEventListener('click', e => {
    if (sidebar.classList.contains('open') && !sidebar.contains(e.target) && e.target !== sidebarToggle) {
      sidebar.classList.remove('open');
    }
  });
}

/* ── Admin tabs ─────────────────────────────────────────────────────────── */
document.querySelectorAll('.admin-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    const target = tab.dataset.target;
    if (!target) return;
    document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.admin-tab-panel').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    const panel = document.getElementById(target);
    if (panel) panel.classList.add('active');
  });
});

/* ── Modal ──────────────────────────────────────────────────────────────── */
function openModal(id) {
  const el = document.getElementById(id);
  if (el) { el.classList.add('open'); document.body.style.overflow = 'hidden'; }
}
function closeModal(id) {
  const el = document.getElementById(id);
  if (el) { el.classList.remove('open'); document.body.style.overflow = ''; }
}
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => {
    if (e.target === overlay) closeModal(overlay.id);
  });
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') document.querySelectorAll('.modal-overlay.open').forEach(m => closeModal(m.id));
});

/* ── File upload preview (add item modal) ───────────────────────────────── */
document.querySelectorAll('.file-upload-zone .file-input').forEach(input => {
  const zone = input.closest('.file-upload-zone');
  const previewId = zone.nextElementSibling?.id;
  const preview = previewId ? document.getElementById(previewId) : null;

  ['dragenter','dragover'].forEach(ev => zone.addEventListener(ev, e => { e.preventDefault(); zone.style.borderColor = 'var(--a-sage)'; }));
  ['dragleave','drop'].forEach(ev => zone.addEventListener(ev, e => { e.preventDefault(); zone.style.borderColor = ''; }));
  zone.addEventListener('drop', e => { input.files = e.dataTransfer.files; showPreview(); });
  input.addEventListener('change', showPreview);

  function showPreview() {
    if (!input.files[0] || !preview) return;
    const url = URL.createObjectURL(input.files[0]);
    preview.innerHTML = `<img src="${url}" style="height:80px;border-radius:8px;margin-top:.5rem" alt="Aperçu">`;
  }
});

/* ── Meta desc counter ──────────────────────────────────────────────────── */
const metaDesc = document.querySelector('textarea[name="meta_description"]');
const metaHint = metaDesc?.nextElementSibling;
if (metaDesc && metaHint) {
  metaDesc.addEventListener('input', () => {
    metaHint.textContent = metaDesc.value.length + '/160 caractères';
    metaHint.style.color = metaDesc.value.length > 160 ? 'var(--a-red)' : 'var(--a-muted)';
  });
}

/* ── Auto-slug from category name ───────────────────────────────────────── */
const catNameInput = document.querySelector('input[name="name"][placeholder="Ex: Desserts"]');
const catSlugInput = document.querySelector('input[name="slug"]');
if (catNameInput && catSlugInput) {
  catNameInput.addEventListener('input', () => {
    catSlugInput.value = catNameInput.value
      .toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g,'');
  });
}
