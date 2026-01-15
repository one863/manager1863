# BLUEPRINT - 1863 Football Manager

## 1. Vision & Core Concept
**"1863"** is a minimalist yet deep football management game. It combines the addictive "one more turn" loop of classic manager games with a modern, mobile-first UX. 
*Note: "1863" is the brand name referencing the birth of modern football rules, but the simulation takes place in a generic timeline, allowing for modern tactics and league structures.*

### Pillars
1.  **Immediacy:** Fast loading, quick day simulation, instant feedback.
2.  **Clarity:** Information is presented clearly without spreadsheets overload. "Easy to learn, hard to master".
3.  **Atmosphere:** A distinct visual identity (paper, ink, typography) that stands out from the generic glossy look of competitors.

## 2. Technical Architecture

### Stack
*   **Framework:** Preact (lighter than React, ideal for mobile).
*   **Language:** TypeScript (strict mode).
*   **Build Tool:** Vite.
*   **Storage:** IndexedDB via Dexie.js (Critical for storing large save files locally).
*   **State:** Zustand (Global UI state).
*   **Styling:** Tailwind CSS.
*   **Wrapper:** Capacitor (for iOS/Android build).

### Data Model (Dexie/IndexedDB)
*   `saves`: Meta-data about save slots.
*   `gameState`: Current date, user ID, day/season tracking.
*   `leagues`: Tier structure, promotion/relegation rules.
*   `teams`: Club data, strategy flags, budget, reputation.
*   `players`: Attributes, contracts, history, fitness.
*   `staff`: Specialized personnel (Coach, Scout, PT).
*   `matches`: Fixtures, historical results, detailed events.
*   `news`: Inbox messages and narrative events.

## 3. Match Engine Detail (v2.0)

### Engine Logic
The engine is a **probabilistic cycle-based simulator** (25 to 30 cycles per match). It uses a "Layered Tactical" approach where the result is the product of three distinct tiers:

1.  **Structural Tier (The Formation):** 
    *   Determines base ratings for each sector (Left, Center, Right). 
    *   Directly influenced by player position weights.
2.  **Strategic Tier (The Coach Identity):** 
    *   Defensive, Balanced, or Offensive preference.
    *   Applies ±15% bonuses/maluses to Attack/Defense ratings.
    *   **Tactical Skill Modifier:** A high-level coach reduces the defensive vulnerability of offensive strategies.
3.  **Operational Tier (The Tactic):** 
    *   Direct instructions (Pressing, CA, AOW).
    *   **Cohesion Bonus:** +5% boost if the instruction matches the coach's identity (e.g., Offensive + Pressing).
    *   **Conflict Penalty:** -5% malus if the instruction contradicts the identity, unless the coach has >7.0 Tactical Skill.

### Key Simulation Mechanics
*   **Possession:** Calculated via Midfield ratings using a power-of-3 ratio (now adjusted for better balance).
*   **Shot Probability:** Uses an Attack vs Defense comparison. Higher skill gaps result in higher scoring efficiency.
*   **Fatigue & Condition:** Players' effective stats decay throughout the match based on stamina and team intensity (Pressing).
*   **Coach Management:** The selection of starters is automated for AI (and optionally for the user) based on the staff's **Management Skill**, weighting talent, energy, and condition.

## 4. UI/UX Structure

### Views
*   **Dashboard (Hub):** Club identity, next match, league summary, board room.
*   **Squad:** Player list, line-up selector, tactical philosophy.
*   **Tactics:** Formation picker and team instructions.
*   **Staff Profile:** Detailled stats, preferred strategy, and specialized roles.
*   **League:** Full table, results, top scorers.
*   **Transfers:** Market search and recruitment.
*   **Club:** Stadium development, finances, sponsors.

## 5. Development Phases

### Phase 1: Foundation (Done)
*   Project setup and database schema.
*   Basic Data Generators.

### Phase 2: Core Gameplay (Done)
*   Squad Management and automated selection logic.
*   Advanced Match Simulation with Coach Identity.
*   League Table and progression.

### Phase 3: Depth (Current)
*   Staff management and specialized skills impact.
*   Stadium infrastructure development.
*   Transfer Market and economic balance.

### Phase 4: Polish & Mobile
*   Save/Load system integrity.
*   Visual polish (animations, match visualizer).
*   Capacitor deployment.

## 6. Future Considerations
*   Dynamic narratives (Press conferences, player drama).
*   Historical record tracking (All-time top scorers).
*   Multi-layered youth academy.

---

# BLUEPRINT - 1863 Football Manager (FR)

## 1. Vision & Concept de Base
**"1863"** est un jeu de gestion de football à la fois minimaliste et profond. Il combine la boucle addictive "encore un tour" des jeux de gestion classiques avec une expérience utilisateur moderne, pensée pour le mobile.
*Note : "1863" est le nom de marque faisant référence à la naissance des règles du football moderne, mais la simulation se déroule dans une chronologie générique, permettant des tactiques et des structures de ligue modernes.*

### Piliers
1.  **Immédiateté :** Chargement rapide, simulation rapide des journées, retours instantanés.
2.  **Clarté :** L'information est présentée clairement sans surcharge de tableaux. "Facile à apprendre, difficile à maîtriser".
3.  **Atmosphère :** Une identité visuelle distincte (papier, encre, typographie) qui se démarque de l'aspect brillant générique des concurrents.

## 2. Architecture Technique

### Stack
*   **Framework :** Preact (plus léger que React, idéal pour le mobile).
*   **Langage :** TypeScript (mode strict).
*   **Outil de Build :** Vite.
*   **Stockage :** IndexedDB via Dexie.js (Crucial pour stocker localement de gros fichiers de sauvegarde).
*   **État :** Zustand (État global de l'interface).
*   **Style :** Tailwind CSS.
*   **Wrapper :** Capacitor (pour les builds iOS/Android).

### Modèle de Données (Dexie/IndexedDB)
*   `saves`: Métadonnées sur les emplacements de sauvegarde.
*   `gameState`: Date actuelle, ID de l'utilisateur, suivi des jours/saisons.
*   `leagues`: Structure des niveaux, règles de promotion/relégation.
*   `teams`: Données des clubs, drapeaux stratégiques, budget, réputation.
*   `players`: Attributs des joueurs, contrats, historique, forme physique.
*   `staff`: Personnel spécialisé (Coach, Scout, Préparateur physique).
*   `matches`: Calendriers, résultats historiques, événements détaillés.
*   `news`: Messages de la boîte de réception et événements narratifs.

## 3. Détail du Moteur de Match (v2.0)

### Logique du Moteur
Le moteur est un **simulateur probabiliste basé sur des cycles** (25 à 30 cycles par match). Il utilise une approche "Tactique par couches" où le résultat est le produit de trois niveaux distincts :

1.  **Niveau Structurel (La Formation) :**
    *   Détermine les notes de base pour chaque secteur (Gauche, Centre, Droite).
    *   Directement influencé par le poids des positions des joueurs.
2.  **Niveau Stratégique (L'Identité du Coach) :**
    *   Préférence Défensive, Équilibrée ou Offensive.
    *   Applique des bonus/malus de ±15% aux notes d'Attaque/Défense.
    *   **Modificateur de Compétence Tactique :** Un coach de haut niveau réduit la vulnérabilité défensive des stratégies offensives.
3.  **Niveau Opérationnel (La Tactique) :**
    *   Instructions directes (Pressing, Contre-Attaque, Attaque sur les ailes).
    *   **Bonus de Cohésion :** Boost de +5% si l'instruction correspond à l'identité du coach (ex: Offensif + Pressing).
    *   **Pénalité de Conflit :** Malus de -5% si l'instruction contredit l'identité, sauf si le coach a une compétence tactique > 7.0.

### Mécaniques Clés de Simulation
*   **Possession :** Calculée via les notes du Milieu de terrain en utilisant un ratio de puissance 3 (ajusté pour un meilleur équilibre).
*   **Probabilité de Tir :** Utilise une comparaison Attaque vs Défense. Des écarts de compétence plus élevés entraînent une plus grande efficacité de score.
*   **Fatigue & Condition :** Les statistiques effectives des joueurs diminuent tout au long du match en fonction de l'endurance et de l'intensité de l'équipe (Pressing).
*   **Gestion du Coach :** La sélection des titulaires est automatisée pour l'IA (et optionnellement pour l'utilisateur) en fonction de la **Compétence de Management** du staff, pondérant talent, énergie et condition.

## 4. Structure UI/UX

### Vues
*   **Tableau de bord (Hub) :** Identité du club, prochain match, résumé de la ligue, salle du conseil.
*   **Effectif :** Liste des joueurs, sélecteur de composition, philosophie tactique.
*   **Tactiques :** Choix de la formation et instructions d'équipe.
*   **Profil du Staff :** Statistiques détaillées, stratégie préférée et rôles spécialisés.
*   **Ligue :** Classement complet, résultats, meilleurs buteurs.
*   **Transferts :** Recherche sur le marché et recrutement.
*   **Club :** Développement du stade, finances, sponsors.

## 5. Phases de Développement

### Phase 1 : Fondation (Terminé)
*   Configuration du projet et schéma de la base de données.
*   Générateurs de données de base.

### Phase 2 : Gameplay de Base (Terminé)
*   Gestion de l'effectif et logique de sélection automatisée.
*   Simulation de match avancée avec l'identité du coach.
*   Tableau de la ligue et progression.

### Phase 3 : Profondeur (En cours)
*   Gestion du staff et impact des compétences spécialisées.
*   Développement des infrastructures du stade.
*   Marché des transferts et équilibre économique.

### Phase 4 : Finitions & Mobile
*   Intégrité du système de Sauvegarde/Chargement.
*   Polissage visuel (animations, visualiseur de match).
*   Déploiement Capacitor.

## 6. Considérations Futures
*   Narrations dynamiques (conférences de presse, drames entre joueurs).
*   Suivi des records historiques (meilleurs buteurs de tous les temps).
*   Centre de formation multi-niveaux.
