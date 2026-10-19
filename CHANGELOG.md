# Changelog

Each version is written in English, then in French. The release notes on GitHub are taken from the section of the version.
Chaque version est rédigée en anglais, puis en français. Les notes de release GitHub reprennent la section de la version.

## [1.3.0] - 2026-10-19

### English

#### Added
- Correct an entry: tap a line in the history to change its date and load, reps or measurement.
- Rename a measurement point.
- Full history: past the 6 most recent entries, a link shows them all.
- Goal per exercise (load and minimum reps): progress bar, dashed line on the chart, and a message when a new entry reaches it for the first time.
- "Screen on" button in the header: keeps the screen awake while Ironlog is displayed. Remembered on each device, shown only when the browser supports it.

### Français

#### Ajouté
- Corriger une saisie : touche une ligne de l'historique pour changer sa date et sa charge, ses répétitions ou sa mesure.
- Renommer un point de mensuration.
- Historique complet : au-delà des 6 entrées les plus récentes, un lien les affiche toutes.
- Objectif par exercice (charge et répétitions minimum) : barre de progression, ligne pointillée sur le graphe, et message quand une nouvelle saisie l'atteint pour la première fois.
- Bouton « Écran allumé » dans l'en-tête : empêche la mise en veille quand Ironlog est affiché. Mémorisé sur chaque appareil, affiché seulement si le navigateur le permet.

## [1.2.0] - 2026-10-18

### English

#### Added
- New Ironlog logo: in the header, as PWA icons and favicon, and at the top of the README.
- Animated tour in the README (loads, measurements overview, one measurement's history), in English and French.

#### Changed
- Visual refresh: soft shadows, hover and press states on buttons and rows, count badges on muscle chips, subtle slide when an exercise opens, slight background glow in light and dark themes.

#### Fixed
- Missing space between the last value and the change in the measurements list.

### Français

#### Ajouté
- Nouveau logo Ironlog : dans l'en-tête, en icônes PWA et favicon, et en haut du README.
- Visite animée dans le README (charges, vue d'ensemble des mensurations, historique d'une mesure), en anglais et en français.

#### Modifié
- Refonte visuelle : ombres douces, états de survol et d'appui sur les boutons et les lignes, compteurs en pastilles sur les muscles, glissement doux à l'ouverture d'un exercice, léger dégradé de fond en clair comme en sombre.

#### Corrigé
- Espace manquant entre la dernière valeur et la variation dans la liste des mensurations.

## [1.1.0] - 2026-10-18

### English

#### Added
- Data is stored on the server (API + SQLite in a volume): all your devices see the same data.
- Each device keeps a local copy: the app works offline, and changes are sent when the network returns.
- Status indicator in the header: synced, offline, changes pending, session expired.
- Data already in the browser is migrated and sent to the server automatically.
- Healthcheck in both Docker images.
- The sample-data prompt can be hidden; the choice is remembered on the device.
- Full English and French interface, with a FR/EN switch in the header. The language follows the browser by default.
- English and French README, with screenshots and badges.

#### Changed
- The page loads from the network first (the cache is used only offline or if the network takes more than 3 s), so you can sign in again when your session has expired.
- Repository reorganised into `frontend/` and `backend/`, with a single version at the root.
- Two Docker images: `ironlog` (web app) and `ironlog-api` (API, database in `/data`).

### Français

#### Ajouté
- Données enregistrées sur le serveur (API + SQLite dans un volume) : tous tes appareils voient la même chose.
- Chaque appareil garde une copie locale : l'app reste utilisable hors ligne, et les saisies partent au retour du réseau.
- Indicateur dans l'en-tête : synchronisé, hors ligne, modifications en attente, session expirée.
- Les données déjà présentes dans le navigateur sont migrées et envoyées au serveur automatiquement.
- Healthcheck dans les deux images Docker.
- Le message proposant de charger des exemples peut être masqué ; le choix est mémorisé sur l'appareil.
- Interface complète en anglais et en français, avec un sélecteur FR/EN dans l'en-tête. La langue suit celle du navigateur par défaut.
- README en anglais et en français, avec captures et badges.

#### Modifié
- Au chargement, la page vient d'abord du réseau (le cache ne sert que hors ligne ou si le réseau tarde plus de 3 s), pour pouvoir se reconnecter quand la session a expiré.
- Dépôt réorganisé en `frontend/` et `backend/`, avec une version unique à la racine.
- Deux images Docker : `ironlog` (site) et `ironlog-api` (API, base dans `/data`).

## [1.0.1] - 2026-10-17

### English

#### Added
- Measurement points can be moved by drag and drop, staying on the silhouette.
- Labels move vertically only; their position is saved and a link resets them automatically.
- Keyboard: arrow keys move the focused point or label.

#### Fixed
- Dragging a label with the mouse no longer selects the page's text.

### Français

#### Ajouté
- Les points de mensuration se déplacent par glisser-déposer, en restant sur la silhouette.
- Les étiquettes se déplacent à la verticale ; leur position est mémorisée et un lien les replace automatiquement.
- Au clavier : les flèches déplacent le point ou l'étiquette qui a le focus.

#### Corrigé
- Déplacer une étiquette à la souris ne sélectionne plus le texte de la page.

## [1.0.0] - 2026-10-17

### English

#### Loads
- Front and back body map, in simple (muscle groups) or detailed (muscles) mode.
- Exercises linked to primary and secondary muscles, editable at any time.
- Entries with load and reps, dated today or on a past date.
- Progress chart by load or estimated 1RM (Epley formula), with the record shown.

#### Measurements
- Points placed freely on the body, each with its history and chart.
- Entries dated today or on a past date.

#### Data and installation
- Data kept on the device (IndexedDB), with a warning if storage is unavailable.
- JSON export and import, with confirmation before anything is replaced.
- Installable web app (PWA), usable offline.
- Minimal Docker image, served without root privileges.

### Français

#### Charges
- Schéma du corps de face et de dos, en mode simple (groupes) ou détaillé (muscles).
- Exercices rattachés à des muscles principaux et secondaires, modifiables à tout moment.
- Saisie de la charge et des répétitions, à la date du jour ou à une date passée.
- Graphe de progression, en charge ou en 1RM estimé (formule d'Epley), avec le record affiché.

#### Mensurations
- Points placés librement sur le corps, avec leur historique et leur graphe.
- Saisie à la date du jour ou à une date passée.

#### Données et installation
- Données conservées sur l'appareil (IndexedDB), avec un avertissement si le stockage est indisponible.
- Export et import au format JSON, avec confirmation avant tout remplacement.
- Application installable (PWA) et utilisable hors ligne.
- Image Docker minimale, servie sans droits root.
