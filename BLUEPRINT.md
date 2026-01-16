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

## 3. Match Engine Detail (v2.1 - PLATINUM)

### Engine Logic
The engine is a **probabilistic cycle-based simulator** (24 to 40 cycles per match). It uses a "Layered Tactical" approach where the result is the product of three distinct tiers:

1.  **Structural Tier (The Formation):** 
    *   Determines base ratings for each sector (Left, Center, Right). 
    *   Directly influenced by player position weights.
    *   **Confusion Malus:** Exotic formations (e.g., 2-3-5) suffer -15% midfield rating during the first 20 minutes if the coach's Tactical skill is < 7.0.
2.  **Strategic Tier (The Coach Identity):** 
    *   Defensive, Balanced, or Offensive preference.
    *   Applies ±10% bonuses/maluses to Attack/Defense ratings.
    *   **Tactical Skill Modifier:** A high-level coach reduces the defensive vulnerability of offensive strategies.
3.  **Operational Tier (The Tactic):** 
    *   Direct instructions (Pressing, CA, AOW).
    *   **Cohesion Bonus:** +5% boost if the instruction matches the coach's identity (e.g., Offensive + Pressing).
    *   **Conflict Penalty:** -5% malus if the instruction contradicts the identity, unless the coach has >7.0 Tactical Skill.

### Key Simulation Mechanics
*   **Possession:** Calculated via Midfield ratings using a **Sigmoid Curve** (Logistic function) with a smooth slope (1.3) to allow tactical diversity.
*   **Scoring Model (Sigmoid xG):** Uses a Success Rate formula (Sigmoid) between Attack and Defense. Capped at 45% per action, with a baseline scoring factor of 0.16.
*   **The "Save" Duel:** Every shot triggers a direct duel between the shooter's Scoring and the goalkeeper's Goalkeeping, which can reduce attack power by up to 40%.
*   **Fatigue & Energy:** Non-linear penalty (Cubic Curve under 60% energy). A player at 40% energy retains only ~5% of their initial Skill.
*   **Coach Active Management:** 
    *   **Substitutions:** Coaches make up to 3 changes (60'-80') based on Management skill, targeting tired players (<65% energy).
    *   **Late-Game Coaching:** Coaches with high Tactical skill can force Strategy changes (Offensive All-In or Defensive Lock) after the 75th minute depending on the score.

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
*   Advanced Match Simulation with Coach Identity (xG, Fatigue, Tactics).
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

## 2. Architecture Technique
(Idem version EN)

## 3. Détail du Moteur de Match (v2.1 - PLATINUM)

### Logique du Moteur
Le moteur est un **simulateur probabiliste basé sur des cycles** (24 à 40 cycles par match). Il utilise une approche "Tactique par couches" où le résultat est le produit de trois niveaux :

1.  **Niveau Structurel (La Formation) :**
    *   Détermine les notes de base par secteur.
    *   **Malus de Confusion :** Les formations exotiques (ex: 2-3-5) subissent -15% de milieu les 20 premières minutes si le coach a < 7.0 en Tactique.
2.  **Niveau Stratégique (L'Identité du Coach) :**
    *   Préférence Défensive, Équilibrée ou Offensive (±10% aux notes).
3.  **Niveau Opérationnel (La Tactique) :**
    *   Instructions directes (Pressing, CA, AOW).
    *   **Bonus de Cohésion (+5%)** ou **Pénalité de Conflit (-5%)** selon l'alignement avec l'identité du coach.

### Mécaniques Clés de Simulation
*   **Possession :** Courbe sigmoïde douce (1.3) pour favoriser la diversité tactique.
*   **Modèle de But (Sigmoïde xG) :** Calculé sur le rapport Attaque/Défense, facteur de base 0.16.
*   **Le Duel du "Save" :** Duel direct Buteur vs Gardien (réduction possible de 40% de la puissance d'attaque).
*   **Fatigue & Énergie :** Pénalité cubique sous 60% d'énergie. Un joueur à 40% d'énergie perd 95% de son efficacité.
*   **Coaching Actif :** 
    *   **Remplacements :** Jusqu'à 3 changements (60'-80') basés sur le Management.
    *   **Coaching de Fin de Match :** Changements de stratégie automatiques (All-In ou Verrou) selon le score et la stat Tactique du coach.

## 4. Structure UI/UX
(Idem version EN)

## 5. Phases de Développement
(Idem version EN)
