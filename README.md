# Carvizo 🚙
**Le carnet de bord intelligent de votre voiture.** PWA responsive gratuite en français, pour suivre ses véhicules, entretiens, kilométrage, consommation, dépenses, pneus et problèmes photographiés.
## Démarrer
Pré-requis : Node.js 22+, MariaDB 11.4+.
1. `npm install`
2. `cp .env.example .env` et configurez `DATABASE_URL`, `CRON_SECRET` et les clés VAPID si le push est activé.
3. `npx prisma generate && npx prisma db push` (développement) ou migrations validées en production.
4. `npm run dev`, puis http://localhost:3000.
5. Pour le rappel quotidien, appeler `POST /api/jobs/reminders` avec `Authorization: Bearer <CRON_SECRET>` via cron sécurisé (la route ne s'exécute pas automatiquement).
## Déploiement
Docker Compose utilise MariaDB + Next.js ; fournir `DB_PASSWORD`, `DB_ROOT_PASSWORD`, `CRON_SECRET` et les clés VAPID. Prévoir reverse proxy HTTPS, sauvegardes volume DB + images, migrations et surveillance. Le conteneur sert une application mais n'automatise pas la migration SQL : exécuter `npx prisma db push` en environnement local ou un workflow de migration validé. **Ne jamais lancer db push automatiquement sur une base de production existante.**
## Sécurité et limites
Photos stockées dans `STORAGE_DIR`, servies uniquement aux comptes propriétaires. Session httpOnly ; cookies secure en HTTPS ; mot de passe scrypt. Les rappels push exigent HTTPS + permission du navigateur ; sur iOS, installation sur l'écran d'accueil. L'application ne diagnostique pas le véhicule. Les fonctions de flotte collaboratives, OCR et intégration OBD sont hors V1.
## Tests
`npm test`, `npm run typecheck`, `npm run build`.
## Identité visuelle
Logo : `public/logo.svg` ; icônes générées par Next `src/app/icon.tsx`, `apple-icon.tsx`, `src/app/badge/route.tsx` ; Splash : `public/splash.svg`.
## Licence
Tous droits réservés. Une licence open source peut être choisie ultérieurement.
