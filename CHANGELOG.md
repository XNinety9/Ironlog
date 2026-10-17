# Changelog

Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/). Chaque section `## [X.Y.Z]` alimente les notes de la release correspondante.

## [1.0.0] - 2026-10-17

Première version utilisable au quotidien.

### Charges
- Schéma du corps de face et de dos, en mode simple (groupes) ou détaillé (muscles).
- Exercices rattachés à des muscles principaux et secondaires, modifiables à tout moment.
- Saisie de la charge et des répétitions, à la date du jour ou à une date passée.
- Graphe de progression, en charge ou en 1RM estimé (formule d'Epley), avec le record affiché.

### Mensurations
- Points placés librement sur le corps, avec leur historique et leur graphe.
- Saisie à la date du jour ou à une date passée.

### Données et installation
- Données conservées sur l'appareil (IndexedDB), avec un avertissement si le stockage est indisponible.
- Export et import au format JSON, avec confirmation avant tout remplacement.
- Application installable (PWA) et utilisable hors ligne.
- Image Docker minimale, servie sans droits root.
