<p align="center">
  <img src="docs/logo.png" alt="Logo Ironlog" width="180">
</p>

# Ironlog

[![CI](https://github.com/XNinety9/Ironlog/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/XNinety9/Ironlog/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/XNinety9/Ironlog?sort=semver&display_name=tag)](https://github.com/XNinety9/Ironlog/releases)
[![Image Docker](https://img.shields.io/badge/image-ghcr.io%2Fxninety9%2Fironlog-2496ED?logo=docker&logoColor=white)](https://github.com/XNinety9/Ironlog/pkgs/container/ironlog)
![Svelte 5](https://img.shields.io/badge/Svelte-5-FF3E00?logo=svelte&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![Node 24+](https://img.shields.io/badge/Node-%E2%89%A5%2024-339933?logo=nodedotjs&logoColor=white)
![PWA](https://img.shields.io/badge/PWA-installable%20%26%20hors%20ligne-5A0FC8)
![Langues](https://img.shields.io/badge/langues-FR%20%7C%20EN-0A7EA4)
![Trivy](https://img.shields.io/badge/s%C3%A9curit%C3%A9-scann%C3%A9%20Trivy-1904DA?logo=aquasecurity&logoColor=white)

[English](README.md) · **Français**

Suis tes charges et tes mensurations sur un schéma du corps cliquable. Installable sur ton téléphone, utilisable hors ligne à la salle, et partagée entre tous tes appareils grâce à ton propre serveur.

<p align="center">
  <img src="docs/desktop-fr.png" alt="Ironlog sur ordinateur : schéma du corps avec les pectoraux sélectionnés, et le graphe de progression d'un exercice" width="820">
  &nbsp;
  <img src="docs/mobile-fr.png" alt="Ironlog sur téléphone : le schéma du corps et le panneau d'exercice" width="240">
</p>

<p align="center">
  <img src="docs/tour-fr.gif" alt="Visite d'Ironlog : charges avec graphe de progression, puis vue d'ensemble des mensurations, puis historique d'une mesure" width="820">
  <br>
  <sub>Visite : charges et leur graphe → vue d'ensemble des mensurations → historique d'une mesure.</sub>
</p>

## Fonctionnalités

**Charges**
- Schéma du corps de face et de dos, en mode *simple* (groupes musculaires) ou *détaillé* (muscles individuels).
- Chaque exercice est rattaché à un ou plusieurs muscles, en **principal** ou en **secondaire**. Un développé couché peut compter pour les pectoraux en principal et les triceps en secondaire.
- Saisie de la charge et des répétitions pour chaque séance, datée du jour ou d'une date passée.
- Graphe de progression en charge ou en **1RM estimé** (formule d'Epley), avec ton record. Graphe et historique sont par exercice.

**Mensurations**
- Place des points librement sur le corps (un toucher sur la figure), nomme-les, et note leurs valeurs dans le temps.
- Glisse les points et les étiquettes pour réorganiser la mise en page ; les étiquettes ne bougent qu'à la verticale.
- Graphe et historique par mesure.

**Données et appareils**
- Tes données sont sur **ton serveur** (SQLite dans un volume Docker). Chaque appareil qui ouvre la même instance voit les mêmes données.
- Chaque appareil garde une copie locale : l'app marche hors ligne. Les modifications partent dès que le réseau revient.
- Export et import d'une sauvegarde JSON à tout moment.

**Partout**
- Installable comme application (PWA) sur téléphone et ordinateur.
- Interface en **français** et en **anglais**, à changer dans l'en-tête. Elle suit la langue du navigateur par défaut.
- Thème clair et sombre, selon le réglage de ton système.

## Architecture

```mermaid
flowchart LR
  subgraph Appareils["Tes appareils (PC, téléphone)"]
    PWA["PWA Ironlog<br/>copie locale (IndexedDB)"]
  end
  Proxy["Reverse proxy + SSO<br/>(HTTPS, authentification)"]
  subgraph Serveur["Ton serveur (Docker)"]
    Web["ironlog<br/>nginx, fichiers statiques"]
    API["ironlog-api<br/>Node + SQLite"]
    DB[("/data<br/>ironlog.db")]
  end
  PWA -- "HTTPS" --> Proxy
  Proxy -- "/" --> Web
  Proxy -- "/api" --> API
  API --- DB
```

L'API ne reçoit jamais de trafic non authentifié : elle fait confiance à l'en-tête `X-Auth-Request-User` posé par ton reverse proxy. Ne l'expose que derrière ce proxy.

## Démarrage rapide

### Avec Docker (recommandé)

```sh
mkdir -p .data
docker compose up --build        # puis ouvre http://localhost:8080
```

En local il n'y a pas de SSO : toutes les données sont attribuées à l'utilisateur `IRONLOG_DEV_USER` (voir `docker-compose.yml`).

### Images

Publiées à chaque release sur GitHub Container Registry :

| Image | Rôle | Base |
| --- | --- | --- |
| `ghcr.io/xninety9/ironlog` | Application web (fichiers statiques, nginx) | `cgr.dev/chainguard/nginx`, ~29 Mo |
| `ghcr.io/xninety9/ironlog-api` | API de synchronisation, base SQLite dans `/data` | `cgr.dev/chainguard/node` |

Les deux tournent en utilisateur non-root, sans shell, et exposent un healthcheck. Les images sont scannées par Trivy dans la CI.

### Déploiement derrière un reverse proxy

L'application doit être servie en HTTPS (service worker, installation de la PWA). Route `/api/*` vers `ironlog-api:3000` et le reste vers `ironlog:8080`, derrière ton authentification. Monte un volume sur `/data` pour que l'API garde sa base.

## Développement

Prérequis : Node 24 ou plus (l'API utilise `node:sqlite`, intégré à Node).

```sh
npm install          # installe les workspaces front et back
npm run dev:api      # API sur :3000, base dans .data/
npm run dev          # app sur :5173 (redirige /api vers l'API)
npm run check        # vérification des types du front (svelte-check + tsc)
npm test             # tests de l'API (node:test, aucune dépendance)
npm run build        # build de production dans frontend/dist
```

### Organisation du dépôt

```
frontend/   PWA Svelte 5 : src/, public/, service worker (sw/), Dockerfile, nginx et sonde (docker/)
backend/    API de synchronisation (Node, SQLite) : app, validation, base, tests, Dockerfile
outils/     Script qui vectorise le schéma du corps à partir d'une illustration de référence
maquette/   Première maquette HTML statique, gardée comme référence
```

La racine est un workspace npm. Son `package.json` porte **la** version de l'app, partagée par le front, le back et le tag de release.

### Traductions

Les textes sont dans `frontend/src/lib/i18n/` : `fr.ts` est le dictionnaire de référence, et `en.ts` doit contenir exactement les mêmes clés (le compilateur le vérifie). Ajoute une clé dans les deux fichiers, puis utilise `t('ta.cle')` dans un composant.

## Releases

La CI tourne à chaque push et pull request : vérification des types, tests de l'API, build, scan Trivy des deux images, puis publication sur GHCR (branche `develop` → tag `develop`, `main` → `main` et `latest`).

Pour publier une version :

```sh
# sur main, après la fusion de develop
npm version X.Y.Z --no-git-tag-version       # met à jour le package.json racine
# ajoute une section "## [X.Y.Z]" dans CHANGELOG.md (anglais, puis français)
git commit -am "Version X.Y.Z" && git push
git tag -a vX.Y.Z -m "Ironlog X.Y.Z" && git push origin vX.Y.Z
```

Le workflow du tag vérifie que le tag correspond à `package.json`, produit l'archive statique avec ses empreintes SHA-256, publie les images, et crée la release GitHub avec la section du changelog comme notes.

## Vie privée

Tes données ne quittent jamais ton serveur. Pas de service tiers, pas d'analytique, aucune requête externe depuis l'app.

## Licence

Aucune licence n'a encore été choisie. Le schéma du corps a été vectorisé à partir d'une illustration tierce dont la licence n'est pas confirmée. Tant qu'une licence n'est pas ajoutée, tous les droits sont réservés et le code n'est pas distribué sous licence pour réutilisation.
