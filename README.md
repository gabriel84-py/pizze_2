# 🍕 Parigina — Site vitrine

Site web de la pizzeria napolitaine Parigina (Villeneuve-lès-Avignon).

## Stack

- **Backend** : Node.js + Express + EJS
- **Base de données** : SQLite (better-sqlite3)
- **Auth admin** : Sessions Express + bcrypt
- **Photos** : multer + sharp (redimensionnement auto → WebP)
- **i18n** : FR / EN / IT (interface)

## Démarrage rapide (développement)

```bash
# 1. Installer les dépendances
npm install

# 2. Configurer l'environnement
cp .env.example .env
# Modifier SESSION_SECRET dans .env !

# 3. Initialiser la DB avec les données Parigina
npm run seed

# 4. Lancer le serveur
npm start
# ou en mode dev avec rechargement auto :
npm run dev
```

Le site est accessible sur **http://localhost:3000**
L'admin est sur **http://localhost:3000/admin**

**Identifiants par défaut :**
- Login : `admin`
- Mot de passe : `parigina2024!`
- ⚠️ **Changer le mot de passe immédiatement** depuis l'interface admin !

## Déploiement VPS (OVH/Hetzner)

```bash
# Sur le VPS :
git clone ... /var/www/parigina
cd /var/www/parigina
npm install --production
cp .env.example .env
nano .env  # Modifier SESSION_SECRET et NODE_ENV=production

npm run seed

# Avec PM2 :
npm install -g pm2
pm2 start app.js --name parigina
pm2 save
pm2 startup

# Ou via le script fourni :
bash scripts/start.sh
```

### Configuration Nginx (reverse proxy)

```nginx
server {
    server_name parigina.fr www.parigina.fr;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }

    # Servir les uploads directement via Nginx (performances)
    location /uploads/ {
        alias /var/www/parigina/public/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

```bash
# SSL avec Certbot :
certbot --nginx -d parigina.fr -d www.parigina.fr
```

## Backup

```bash
npm run backup
# Crée un zip dans /backups/ avec la DB + les photos
# Conserve automatiquement les 10 derniers backups
```

## Structure du projet

```
parigina/
├── app.js                  # Point d'entrée Express
├── db/
│   ├── database.js         # Init SQLite
│   └── seed.js             # Données initiales
├── routes/
│   ├── public.js           # Pages publiques
│   └── admin.js            # Interface admin
├── middleware/
│   ├── auth.js             # Authentification session
│   └── i18n.js             # Internationalisation FR/EN/IT
├── views/                  # Templates EJS
│   ├── index.ejs           # Accueil
│   ├── carte.ejs           # Menu
│   ├── histoire.ejs        # Notre histoire
│   ├── avis.ejs            # Avis clients
│   ├── admin/              # Interface admin
│   └── partials/           # Composants réutilisables
├── public/
│   ├── css/main.css        # CSS public
│   ├── css/admin.css       # CSS admin
│   ├── js/main.js          # JS public
│   ├── js/admin.js         # JS admin
│   └── uploads/            # Photos uploadées
├── locales/                # Traductions FR/EN/IT
└── scripts/
    ├── backup.js           # Script de backup
    └── start.sh            # Script de démarrage VPS
```

## Admin — Fonctionnalités

| Section | Ce qu'on peut faire |
|---|---|
| **Menu** | CRUD pizzas (nom, prix, description, photo, badges, mise en avant), catégories |
| **Horaires** | Modifier ouverture/fermeture par jour, marquer fermé |
| **Galerie** | Upload multi-photos, légendes, réordonnancement |
| **Avis** | Ajouter/masquer/supprimer verbatims Google |
| **Contenu** | Hero, À propos, contact, réseaux, SEO, bandeau annonce |
| **Logs** | Journal de toutes les modifications |
# pizze_2
