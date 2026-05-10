const fs   = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const DB_PATH      = path.join(__dirname, '..', 'db', 'parigina.db');
const UPLOADS_DIR  = path.join(__dirname, '..', 'public', 'uploads');
const BACKUPS_DIR  = path.join(__dirname, '..', 'backups');

if (!fs.existsSync(BACKUPS_DIR)) fs.mkdirSync(BACKUPS_DIR, { recursive: true });

const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const backupDir = path.join(BACKUPS_DIR, `backup-${timestamp}`);
fs.mkdirSync(backupDir, { recursive: true });

// Copier la DB
const dbDest = path.join(backupDir, 'parigina.db');
fs.copyFileSync(DB_PATH, dbDest);
console.log(`✅ DB copiée → ${dbDest}`);

// Copier les uploads
const uploadsDest = path.join(backupDir, 'uploads');
if (fs.existsSync(UPLOADS_DIR)) {
  fs.cpSync(UPLOADS_DIR, uploadsDest, { recursive: true });
  console.log(`✅ Uploads copiés → ${uploadsDest}`);
}

// Zipper le dossier si zip est disponible
try {
  const zipPath = path.join(BACKUPS_DIR, `backup-${timestamp}.zip`);
  execSync(`cd "${BACKUPS_DIR}" && zip -r "backup-${timestamp}.zip" "backup-${timestamp}"`, { stdio: 'inherit' });
  fs.rmSync(backupDir, { recursive: true, force: true });
  console.log(`\n🎉 Backup terminé : ${zipPath}`);
} catch {
  console.log(`\n🎉 Backup terminé (dossier non zippé — zip non disponible) : ${backupDir}`);
}

// Garder seulement les 10 derniers backups
const backups = fs.readdirSync(BACKUPS_DIR)
  .filter(f => f.startsWith('backup-'))
  .sort()
  .reverse();
backups.slice(10).forEach(b => {
  fs.rmSync(path.join(BACKUPS_DIR, b), { recursive: true, force: true });
  console.log(`🗑️  Ancien backup supprimé : ${b}`);
});
