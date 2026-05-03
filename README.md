# Le Journal Vital

Une collection d'applications web locales, simples et souveraines — des outils de vie personnels qui fonctionnent entièrement dans le navigateur, sans compte ni serveur.

> *Ceci n'est pas une application médicale, juste une boîte à outils pour prendre soin de soi.*

## 📋 Aperçu

Le projet est un site web **statique** (HTML / CSS / JavaScript pur) composé de plusieurs mini-applications :

| Application | Description | Page |
|---|---|---|
| **Journal Personnel** | Espace d'écriture et d'enregistrement personnel | `pages/page_journal.html` |
| **Planning de la semaine** | Création et gestion de plannings hebdomadaires | `pages/page_planning.html` |
| **Aide Addictions** | Journal de suivi pour les addictions | `pages/page_addiction.html` |

Toutes les données sont stockées dans le **localStorage** du navigateur — rien n'est envoyé à un serveur.

## ✅ Prérequis

- Un **navigateur web** moderne (Chrome, Firefox, Edge, Safari)
- Un serveur HTTP local pour le développement (nécessaire pour le chargement des fichiers JSON i18n)

Aucun gestionnaire de paquets, aucun framework, aucune étape de build n'est requise.

## 🚀 Installation et lancement

```bash
# Cloner le dépôt
git clone https://github.com/Vital-Co/JournalVital.git
cd JournalVital

# Lancer un serveur local (au choix) :

# Option 1 — Python 3
python -m http.server 8000

# Option 2 — Node.js (npx, sans installation)
npx serve .

# Option 3 — Extension Live Server (VS Code / WebStorm)
```

## 🧰 Outils

Le Journal Vital regroupe plusieurs outils personnels pensés pour accompagner le quotidien : écrire, s’organiser, suivre ses objectifs et garder une trace de son cheminement.

Chaque outil fonctionne **localement dans le navigateur** : aucune donnée n’est envoyée à un serveur.

---

### ✍️ Journal Personnel

Un espace privé pour écrire, enregistrer et conserver ce qui compte.

| Fonctionnalité | Description |
|---|---|
| 🗂️ **Journaux multiples** | Crée plusieurs journaux séparés selon tes besoins : pensées, voyage, suivi personnel, souvenirs… |
| 📝 **Entrées texte** | Ajoute un message libre à chaque entrée. |
| 🎙️ **Notes vocales** | Enregistre une ou plusieurs notes audio directement dans une entrée. |
| 🖼️ **Images** | Ajoute des images pour garder une trace visuelle. |
| 🔎 **Recherche par date** | Consulte toutes les entrées, une date précise, une période avant/après une date ou un intervalle. |
| ⚙️ **Gestion du journal** | Supprime un journal précis sans toucher aux autres. |

> Un journal personnel simple, intime et local — pour garder une trace sans compte, sans cloud, sans friction.

---

### 📅 Planning de la semaine

Un outil visuel pour organiser une semaine type et structurer ses routines.

| Fonctionnalité | Description |
|---|---|
| 🗓️ **Plannings multiples** | Crée autant de plannings que nécessaire : travail, vacances, révisions, rythme perso… |
| 🏷️ **Nom et description** | Identifie chaque planning avec un titre et une courte description. |
| 🎨 **Pinceau d’activités** | Sélectionne une activité puis “peins” la grille hebdomadaire facilement. |
| 📋 **Éditeur d’activités** | Utilise des activités communes ou crée tes propres activités personnalisées. |
| 🌙 **Sommeil** | Intègre les temps de repos dans l’organisation de la semaine. |
| 👁️ **Vue finale** | Visualise le planning avec une légende claire. |
| 📥 **Import** | Importe un planning existant au format JSON. |

> Le planning sert de base : il aide à poser un cadre, clarifier les priorités et rendre la semaine plus lisible.

---

### 🌱 Aide Addictions

Un journal de suivi pour accompagner une démarche de réduction, d’abstinence ou de reprise de contrôle.

| Fonctionnalité | Description |
|---|---|
| 📚 **Journaux de suivi multiples** | Crée un journal par consommation, comportement ou objectif. |
| 🎯 **Descente progressive** | Définis un point de départ, une cible, une durée et une courbe de réduction. |
| 🧘 **Mode abstinence** | Suis les jours sans consommation, le streak en cours, le record précédent et les paliers symboliques. |
| ✍️ **Log quotidien** | Note le titre du jour, la consommation ou le statut, les ressentis et les événements importants. |
| 🎙️ **Notes vocales** | Ajoute des messages audio pour capturer ce qui est difficile à écrire. |
| 📊 **Plan complet** | Consulte les paliers, objectifs et étapes du programme. |
| 🕰️ **Historique** | Retrouve les derniers jours enregistrés et garde une vision de ton parcours. |
| 💡 **Raisons personnelles** | Garde sous les yeux les raisons qui motivent la démarche. |
| 📏 **Règles personnelles** | Définis tes propres limites ou principes de suivi. |
| 🔁 **Rattrapage des jours oubliés** | Complète les jours manquants pour garder des statistiques cohérentes. |
| ⏱️ **Minuteur d’envie** | Pose l’urgence pendant 10 minutes pour laisser passer le pic. |
| 🌊 **Urge surfing** | Lance une mini séance guidée pour observer l’envie sans agir. |

> Une rechute ou une journée ratée n’annule rien : l’outil est conçu pour suivre, comprendre et continuer — sans jugement.

---

### 🔐 Confidentialité commune

- 💾 Données enregistrées dans le **localStorage** du navigateur.
- 🚫 Aucun compte utilisateur.
- 🚫 Aucun serveur de synchronisation.
- 🎨 Thème partagé entre les outils.
- 🌍 Interface disponible en français, anglais et espagnol.

## 🌐 Internationalisation (i18n)

Le site supporte **3 langues** : français (par défaut), anglais et espagnol.

Le système i18n est un module JavaScript (`i18n/i18n.js`) qui :
- Charge les fichiers de traduction JSON depuis `i18n/<lang>.json`
- Traduit les éléments du DOM via les attributs `data-i18n`, `data-i18n-html`, `data-i18n-placeholder`, `data-i18n-title`, `data-i18n-aria-label`
- Supporte l'interpolation de variables (`{key}`) et le pluriel simplifié (`{s}`)

La langue choisie est stockée dans `localStorage` (clé `vital_lang`).

## 🎨 Thèmes

6 thèmes disponibles : `light` (défaut), `green`, `blue`, `orange`, `rose`, `dark`.

Le thème est stocké dans `localStorage` (clé `vital_theme`) et partagé entre toutes les pages.

## 🔧 Variables d'environnement

Aucune variable d'environnement n'est requise. Toute la configuration est gérée côté client via `localStorage`

## 📄 Licence

MIT — © 2026 Vital C.
