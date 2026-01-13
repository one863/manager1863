# 📜 1863 FOOTBALL - Plan de Conception (Blueprint)

## 🎯 Objectif du Projet
Créer une simulation de management de football **légère**, **rapide** et **optimisée pour mobile**, sous la marque **1863 FOOTBALL**. L'application est conçue comme une **Progressive Web App (PWA)** pour offrir une expérience fluide et "native" sur smartphone, sans nécessiter de serveur distant pour la logique ou le stockage.

---

## 🏗️ Pile Technique (Stack)

- **Framework :** [Preact](https://preactjs.com/) (Haute performance, alternative ultra-légère à React).
- **Gestion d'État :** [Zustand](https://docs.pmnd.rs/zustand/) (Minimaliste, rapide et scalable).
- **Base de Données & Persistance :** [Dexie.js](https://dexie.org/) (Wrapper pour IndexedDB) incluant :
    - Versioning robuste du schéma.
    - Migrations automatiques des données.
    - Hachage d'intégrité anti-triche (SHA-256).
- **Style :** [Tailwind CSS](https://tailwindcss.com/) avec un thème personnalisé "Papier & Encre".
- **Linter & Formatter :** [Biome](https://biomejs.dev/) (Remplaçant ultra-fast d'ESLint/Prettier).
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

### 3. Identité Visuelle
- **Avatars Procéduraux :** Pas d'images lourdes ; chaque joueur possède une chaîne "DNA" qui génère un avatar SVG unique (`PlayerAvatar.tsx`).
- **Thématique :** Palette de couleurs inspirée des vieux journaux et du cuir (Identité de marque 1863 FOOTBALL).

---

## 🕹️ Mécaniques de Jeu (Implémentées)

### 📈 Services & Logique métier
- **Match Service :** Gestion de la programmation et du déroulement des matchs par cycles de jours.
- **Club Service :** Gestion du budget, des sponsors et de l'identité du club (Présidence).
- **Transfer Service :** Marché des transferts dynamique.
- **Training Service :** Système de progression des joueurs par cycles hebdomadaires.
- **News Service :** Système de notifications et actualités mondiales.

### 🏟️ Moteur de Simulation (`src/engine`)
- **Simulator :** Moteur probabiliste à 12 actions par match.
- **Tactics :** Prise en compte des formations (ex: 2-3-5, 4-4-2) et des styles de jeu (Pressing, Contre-attaque).
- **Live Match :** Visualisation en temps réel avec commentaires textuels et effets visuels (Flash But).

### 👤 Gestion des Joueurs
- **Générateur :** Création procédurale de joueurs avec noms et talents variés.
- **Progression :** Système d'entraînement influençant les attributs (Vitesse, Force, Tir, etc.) et gestion de l'énergie.

---

## 📱 Fonctionnalités PWA & Mobile
- **Affichage Standalone :** Suppression de la barre d'adresse.
- **Support Natif :** Configuration Capacitor prête pour un déploiement sur les stores.
- **Optimisation Mobile :** Interface tactile pensée "mobile-first", protection contre l'overscroll.

---

## 🚀 État Actuel & Roadmap
- ✅ Base de données IndexedDB & Migrations (v12)
- ✅ Moteur de match (Live & Report)
- ✅ Marché des transferts & Budget
- ✅ Entraînement par cycles & Récupération quotidienne
- ✅ Système de News & Dépêches
- ✅ Système de Calendrier & Saisons Linéaires (Saison X, Jour Y)
- 📅 **Prochaines étapes :**
    - Expansion du marché des transferts (Recherche ciblée).
    - Approfondissement des mécaniques de présidence.
    - Système de succès (Achievements).
