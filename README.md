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
Logo retenu (proposition 1) : `public/logo.svg` et `public/brand-icon.svg`. Icônes Android 192/512, iOS 180, badge monochrome et splash générés depuis les mêmes tracés (`src/lib/brand-shapes.ts`). Voir `docs/branding.md`.
## Licence
Tous droits réservés. Une licence open source peut être choisie ultérieurement.

## Alertes et images
Le job quotidien crée les rappels de kilométrage (30 jours), pression des pneus (30 jours depuis le dernier contrôle) et entretiens configurés. Limites de photos : 3 par véhicule et 4 par événement ; JPEG/PNG/WebP 5 Mo maximum. L'écran de lancement `/splash` est un PNG généré pour les appareils compatibles ; tous les modèles iOS ne garantissent pas la même prise en charge.

## Tests d'intégration
La CI démarre une MariaDB 11.4 temporaire, applique le schéma avec `prisma db push`, exécute les tests et compile Next.js. En Docker Compose, un worker appelle l'API des rappels toutes les 6 heures ; les alertes sont dédoublonnées. Initialiser le schéma et configurer les sauvegardes avant ouverture publique.

## Fiabilité du suivi
Les échéances de vidange sont ancrées sur la dernière vidange effectuée : les trois projections futures et les distances restantes suivent le compteur, tandis qu’une échéance dépassée reste signalée séparément. Sans historique, les échéances sont explicitement estimées. L’intervalle se personnalise à la saisie d’une vidange ; les opérations prévues ne font pas avancer le compteur et leurs devis ne sont pas comptés comme dépenses réalisées.

Les historiques sont paginés ; les totaux, la dernière vidange et les données nécessaires à la consommation sont calculés indépendamment des pages chargées. Une correction du compteur est conservée dans le journal. Pour les anciens véhicules, le kilométrage initial manquant est estimé à partir du plus ancien relevé disponible ; il peut être corrigé dans la fiche du véhicule.

Les factures PDF sont des pièces jointes privées aux opérations. Les exports CSV et la vue imprimable (enregistrement PDF via le navigateur) complètent l’export JSON. Les relevés des véhicules électriques utilisent les kWh ; les pressions mesurées sont conservées dans les notes du contrôle des pneus.

Avant déploiement sur une base existante, appliquer uniquement la migration additive `prisma/manual-migrations/20261113_recovery_code.sql` si la colonne n’existe pas. Voir `docs/account-recovery.md` pour les codes de récupération et les limites de connexion. Le traitement des rappels réessaie les envois transitoirement échoués ; un appareil peut recevoir à nouveau une alerte si un autre appareil avait échoué.

Vérifications : `npm test`, `npm run typecheck`, `npm run build`, `npm run test:integration` sur une base temporaire et `npm run test:browser` après installation Chromium avec `npx playwright install chromium`. Les tests HTTP démarrent leurs propres serveurs sur 3456/3457 ; le test navigateur utilise 3458 et des données simulées sans modifier de compte réel.
