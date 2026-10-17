# Ironlog

Suivi de charges et de mensurations à partir d'un schéma du corps cliquable. Application web installable (PWA), utilisable hors ligne, pensée pour le téléphone à la salle comme pour l'ordi.

- **Charges** : corps de face et de dos, en mode simple (groupes musculaires) ou détaillé (muscles). Chaque exercice est rattaché à des muscles principaux et secondaires ; chaque saisie (charge × répétitions) est datée.
- **Mensurations** : des points placés librement sur le corps, chacun avec son historique.

Les données restent dans le navigateur (IndexedDB). La section **Sauvegarde**, en bas de page, exporte et réimporte un fichier JSON.

## Développement

```sh
npm install
npm run dev      # http://localhost:5173, aussi accessible depuis le téléphone sur le réseau local
npm run check    # vérification des types
npm run build
```

## PWA

Le build génère `sw.js` (plugin dans `vite.config.ts`, source dans `sw/sw.js`) : tous les fichiers du build sont mis en cache à l'installation, l'app démarre ensuite sans réseau. Quand une nouvelle version est déployée, un bandeau propose de recharger.

Le service worker n'est actif qu'en production (`npm run build` puis `npm run preview`) et exige HTTPS, sauf sur `localhost`. Pour installer l'app sur un téléphone, il faut donc la servir en HTTPS.

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
