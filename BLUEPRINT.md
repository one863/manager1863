# 📜 MANAGER 1863 - Plan de Conception (Blueprint)

## 🎯 Objectif du Projet
Créer une simulation de management de football **légère**, **rapide** et **optimisée pour mobile**, se déroulant à l'aube du football moderne (1863). L'application est conçue comme une **Progressive Web App (PWA)** pour offrir une expérience fluide et "native" sur smartphone, sans nécessiter de serveur distant pour la logique ou le stockage.

---

## 🏗️ Pile Technique (Stack)

- **Framework :** [Preact](https://preactjs.com/) (Haute performance, alternative ultra-légère à React).
- **Gestion d'État :** [Zustand](https://docs.pmnd.rs/zustand/) (Minimaliste, rapide et scalable).
- **Base de Données & Persistance :** [Dexie.js](https://dexie.org/) (Wrapper pour IndexedDB) incluant :
    - Versioning robuste du schéma.
    - Migrations automatiques des données.
    - Hachage d'intégrité anti-triche (SHA-256).
- **Style :** [Tailwind CSS](https://tailwindcss.com/) avec un thème personnalisé "Papier & Encre Historique".
- **Linter & Formatter :** [Biome](https://biomejs.dev/) (Remplaçant ultra-rapide d'ESLint/Prettier).
- **Icônes :** [Lucide-Preact](https://lucide.dev/guide/preact).
- **PWA :** [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) pour le support hors-ligne et l'installation sur écran d'accueil.
- **Internationalisation :** [i18next](https://www.i18next.com/) pour le support multilingue (FR/EN implémentés).
- **Mobile Natif :** [Capacitor](https://capacitorjs.com/) pour l'encapsulation native optionnelle (iOS/Android).

---

## 🛠️ Principes Fondamentaux d'Architecture

### 1. Local-First & Mode Hors-ligne
Tout s'exécute dans le navigateur de l'utilisateur. Aucun traitement côté serveur n'est requis pour la logique de jeu ou le stockage, garantissant des temps de chargement instantanés et une confidentialité totale.

### 2. Intégrité & Sécurité des Données
- **Auto-Versioning :** Dexie gère les mises à jour du schéma IndexedDB.
- **Système de Réparation :** Une couche de migration applicative personnalisée garantit que les anciennes sauvegardes restent compatibles avec les nouvelles règles du jeu.
- **Redondance :** Snapshots JSON automatiques via un service de backup dédié (`backup-service.ts`).
- **Portabilité :** Système intégré d'Export/Import JSON pour migrer les sauvegardes entre navigateurs ou appareils.

### 3. Identité Visuelle (ADN du XIXe siècle)
- **Avatars Procéduraux :** Pas d'images lourdes ; chaque joueur possède une chaîne "DNA" qui génère un avatar SVG unique avec une pilosité et des coiffures d'époque (`PlayerAvatar.tsx`).
- **Thématique :** Palette de couleurs inspirée des vieux journaux et du cuir.

---

## 🕹️ Mécaniques de Jeu (Implémentées)

### 📈 Services & Logique métier
- **Match Service :** Gestion de la programmation et du déroulement des matchs.
- **Club Service :** Gestion des finances, des sponsors et de l'identité du club.
- **Transfer Service :** Marché des transferts dynamique.
- **Training Service :** Système de progression des joueurs.
- **News Service :** Système de notifications et actualités du monde du foot.

### 🏟️ Moteur de Simulation (`src/engine`)
- **Simulator :** Moteur basé sur les probabilités calculées à partir des statistiques d'équipe.
- **Tactics :** Prise en compte des formations historiques (ex: le 2-3-5 "Pyramide").
- **Live Match :** Visualisation en temps réel avec commentaires textuels.

### 👤 Gestion des Joueurs
- **Générateur :** Création procédurale de joueurs avec noms et talents variés.
- **Progression :** Système d'entraînement influençant les attributs (Vitesse, Force, Tir, etc.).

---

## 📱 Fonctionnalités PWA & Mobile
- **Affichage Standalone :** Suppression de la barre d'adresse.
- **Support Natif :** Configuration Capacitor prête pour un déploiement sur les stores.
- **Optimisation Mobile :** Interface tactile pensée "mobile-first", protection contre l'overscroll.

---

## 🚀 État Actuel & Roadmap
- ✅ Base de données IndexedDB & Migrations
- ✅ Moteur de match (Live & Report)
- ✅ Marché des transferts & Finances
- ✅ Entraînement & Progression
- ✅ Système de News
- 🔄 Système de Calendrier & Saisons (En cours)
- 📅 **Prochaines étapes :**
    - Expansion de la base de données des clubs historiques.
    - Approfondissement des mécaniques de coaching (causeries, changements tactiques en match).
    - Système de succès (Achievements).
