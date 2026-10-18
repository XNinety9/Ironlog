# Ironlog

Suivi de charges et de mensurations à partir d'un schéma du corps cliquable. Application web installable (PWA), utilisable hors ligne, pensée pour le téléphone à la salle comme pour l'ordi.

- **Charges** : corps de face et de dos, en mode simple (groupes musculaires) ou détaillé (muscles). Chaque exercice est rattaché à des muscles principaux et secondaires ; chaque saisie (charge × répétitions) est datée.
- **Mensurations** : des points placés librement sur le corps, chacun avec son historique.

Les données sont enregistrées sur le serveur (SQLite, dans un volume hors du conteneur) : tous les appareils qui ouvrent la même instance voient la même chose. Chaque appareil en garde aussi une copie locale (IndexedDB), pour que l'app marche sans réseau ; les saisies faites hors ligne partent au serveur dès qu'il redevient joignable. La section **Sauvegarde**, en bas de page, exporte et réimporte un fichier JSON.

## Données et synchronisation

- **Enregistrements** : chaque exercice, série, point de mensuration et mesure est un enregistrement indépendant, avec sa date de modification. Deux appareils qui ajoutent chacun une série au même exercice ne se gênent pas.
- **Conflit** : si le même enregistrement a été modifié des deux côtés, la modification la plus récente l'emporte. Une suppression laisse une trace, pour être propagée.
- **Échange** : `POST /api/sync` envoie les modifications locales et reçoit tout ce qui a changé depuis le dernier échange (curseur de révision). Il a lieu au démarrage, après chaque modification, au retour du réseau et toutes les minutes.
- **Identité** : l'API fait confiance à l'en-tête `X-Auth-Request-User` posé par le reverse proxy (Caddy + oauth2-proxy). Elle ne doit donc être joignable qu'à travers lui. Sans SSO (développement, compose local), `IRONLOG_DEV_USER` attribue toutes les données à un utilisateur fixe.

## Développement

```sh
npm install
npm run dev:api  # API sur le port 3000, base dans .data/ (à lancer dans un second terminal)
npm run dev      # http://localhost:5173, aussi accessible depuis le téléphone sur le réseau local
npm run check    # vérification des types
npm run test:api # tests de l'API (node:test, aucune dépendance)
npm run build
```

L'API (`server/`) n'a aucune dépendance : SQLite est intégré à Node (`node:sqlite`, Node 24 ou plus).

## PWA

Le build génère `sw.js` (plugin dans `vite.config.ts`, source dans `sw/sw.js`) : tous les fichiers du build sont mis en cache à l'installation, l'app démarre ensuite sans réseau. Quand une nouvelle version est déployée, un bandeau propose de recharger.

Le service worker n'est actif qu'en production (`npm run build` puis `npm run preview`) et exige HTTPS, sauf sur `localhost`. Pour installer l'app sur un téléphone, il faut donc la servir en HTTPS.

## Docker

Deux images, toutes deux sans shell ni gestionnaire de paquets, en utilisateur non-root, avec un healthcheck :

- **`ghcr.io/xninety9/ironlog`** : `cgr.dev/chainguard/nginx`. Sert le site et transmet `/api` au conteneur `ironlog-api`. Sonde : petit binaire Go statique (`docker/probe`).
- **`ghcr.io/xninety9/ironlog-api`** : `cgr.dev/chainguard/node`. Base SQLite dans `/data`, à monter en volume. Sonde : `GET /api/health`.

```sh
mkdir -p .data && docker compose up --build   # http://localhost:8080, base dans ./.data
```

Le dossier de la base doit être accessible en écriture à l'utilisateur du conteneur API (`user:` dans le compose).

L'image ne gère pas HTTPS : il faut un reverse proxy devant (Caddy, Traefik, Cloudflare…). Sans HTTPS, le service worker ne s'installe pas hors de `localhost`.

## CI/CD

Le workflow `.github/workflows/ci.yml` tourne à chaque push et pull request :

1. **check** : types, tests de l'API, build, puis archive du site si c'est un tag.
2. **docker** : pour chacune des deux images, build, scan Trivy (bloque sur les vulnérabilités critiques ou hautes corrigeables), publication sur GHCR.
   - `develop` → tag `develop` ; `main` → tag `main` et `latest` ; `v1.2.3` → `1.2.3`, `1.2` et `latest`.
3. **release** : seulement pour un tag `v*.*.*`. Vérifie que le tag correspond à `package.json`, puis crée la release GitHub avec l'archive, `SHA256SUMS` et la section du `CHANGELOG.md` comme notes.

### Publier une version

```sh
# sur main, après avoir fusionné develop :
git tag -a v1.0.1 -m "Ironlog 1.0.1"
git push origin v1.0.1
```

Il faut aussi mettre à jour `package.json` (`npm version X.Y.Z --no-git-tag-version`) et ajouter la section `## [X.Y.Z]` dans `CHANGELOG.md`, sinon la release échoue.

## Schéma du corps

`src/lib/body/geo.json` est généré par `outils/trace_corps.py` à partir d'une illustration de référence (vectorisation potrace, puis découpage des zones musculaires). Ne pas l'éditer à la main.

```sh
python outils/trace_corps.py src/lib/body/geo.json chemin/vers/reference.png
```

Dépendances : `pillow`, `numpy`, `scipy` et la commande `potrace`.

> L'illustration de référence actuelle n'est pas libre de droits : elle convient pour un usage personnel. Avant toute diffusion publique, il faudra une licence ou un schéma redessiné.

## Branches

`develop` pour le travail en cours ; `main` sera créée pour la v1.0.0.

`maquette/` contient la première maquette autonome (HTML seul), gardée comme référence.
