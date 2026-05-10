#!/bin/bash
set -e

echo "🍕 Démarrage Parigina..."

# Vérifier .env
if [ ! -f ".env" ]; then
  echo "⚠️  Fichier .env manquant, copie depuis .env.example..."
  cp .env.example .env
  echo "⚠️  Modifiez SESSION_SECRET dans .env avant la prod !"
fi

# Installer les dépendances si besoin
if [ ! -d "node_modules" ]; then
  echo "📦 Installation des dépendances..."
  npm install
fi

# Seeder la DB si elle n'existe pas
if [ ! -f "db/parigina.db" ]; then
  echo "🌱 Initialisation de la base de données..."
  npm run seed
fi

# Créer le dossier uploads
mkdir -p public/uploads

# Lancer avec PM2 si disponible, sinon node
if command -v pm2 &> /dev/null; then
  echo "🚀 Lancement avec PM2..."
  pm2 start app.js --name parigina --update-env
  pm2 save
else
  echo "🚀 Lancement avec node (installez PM2 pour la prod: npm i -g pm2)..."
  node app.js
fi
