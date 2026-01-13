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
- **Icônes :** [Lucide-Preact](https://lucide.dev/guide/preact).
- **PWA :** [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) pour le support hors-ligne et l'installation sur écran d'accueil.
- **Internationalisation :** [i18next](https://www.i18next.com/) pour le support multilingue.

---

## 🛠️ Principes Fondamentaux d'Architecture

### 1. Local-First & Mode Hors-ligne
Tout s'exécute dans le navigateur de l'utilisateur. Aucun traitement côté serveur n'est requis pour la logique de jeu ou le stockage, garantissant des temps de chargement instantanés et une confidentialité totale.

### 2. Intégrité & Sécurité des Données
- **Auto-Versioning :** Dexie gère les mises à jour du schéma IndexedDB.
- **Système de Réparation :** Une couche de migration applicative personnalisée garantit que les anciennes sauvegardes restent compatibles avec les nouvelles règles du jeu.
- **Redondance :** Snapshots JSON automatiques stockés dans le `localStorage` comme sauvegarde secondaire à IndexedDB.
- **Portabilité :** Système intégré d'Export/Import JSON pour migrer les sauvegardes entre navigateurs ou appareils.

### 3. Identité Visuelle (ADN du XIXe siècle)
- **Avatars Procéduraux :** Pas d'images lourdes ; chaque joueur possède une chaîne "DNA" (ex: `1-4-2-8`) qui génère un avatar SVG unique avec une pilosité et des coiffures d'époque.
- **Thématique :** Palette de couleurs inspirée des vieux journaux et du cuir (`#fdfbf7` papier, `#3d1d13` cuir/accent).

---

## 🕹️ Mécaniques de Jeu

### Gestion du Temps (Le système de "Tick")
- **Temps en jeu :** Les joueurs récupèrent +10% d'énergie chaque jour simulé.
- **Temps réel (Absence) :** Récupération de +5% d'énergie par heure d'absence réelle, calculée à la réouverture de l'application.

### Simulation de Match
- **Moteur :** Simulation rapide basée sur les probabilités et les niveaux de l'équipe (Attaque/Défense/Milieu).
- **Live :** Commentaires textuels en temps réel avec une ambiance historique.

### Effectif & Marché des Transferts
- **Attributs :** Système de caractéristiques précises (Vitesse, Force, Tir, Passe, etc.).
- **Économie :** Gestion du budget de transfert et des salaires en £ (Livres Sterling).

---

## 📱 Fonctionnalités PWA
- **Affichage Standalone :** Suppression de la barre d'adresse du navigateur.
- **Couleur de Thème :** Intégration OS harmonisée avec le thème papier.
- **Protection Overscroll :** CSS personnalisé pour éviter l'effet de rebond sur mobile, renforçant l'aspect "app native".

---

## 🚀 Feuille de Route (Roadmap)
- **Classement Mondial :** Utilisation du système de hash pour vérifier l'intégrité des scores partagés.
- **Profondeur Tactique :** Mise en place des formations d'époque (ex: le 2-3-5 "Pyramide").
- **Expansion Historique :** Ouverture vers d'autres époques clés de l'histoire du football.
