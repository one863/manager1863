# ⚙️ Détails du Moteur de Match "Token Engine" (V2)

Le moteur de jeu repose sur une séparation stricte entre l'**Intelligence Systémique** (Arbitrage) et le **Dictionnaire de Données** (Cinématique).

## 🃏 Concept Fondamental : Les Jetons Narratifs

Le moteur a abandonné les calculs de probabilités internes au profit de jetons portant directement leur issue narrative. Le "talent" d'une équipe se reflète désormais dans la **proportion de jetons favorables** injectés dans le sac.

### 🎭 Sacs de Situation (Nouveau)
Lors de phases spécifiques, le moteur utilise un sac dédié dont les proportions respectent les standards Opta :
*   **CORNER :** Composé de jetons `CORNER_GOAL` (3%), `CORNER_CLEARED` (60%), `CORNER_SHORT` (20%), et `CORNER_OVERCOOKED` (17%).
*   **PENALTY :** Composé de `PENALTY_GOAL` (75%), `PENALTY_SAVED` (20%), et `PENALTY_MISS` (5%).
*   **GOAL_KICK (6 mètres) :** Définit la qualité de relance (`GK_SHORT`, `GK_LONG`, `GK_BOULETTE`).
*   **KICK_OFF :** Force une reprise de jeu propre (`KICK_OFF_BACK`, `KICK_OFF_LONG`).

## 🏗️ Architecture Technique (Engine vs Logic)

### 1. Le Moteur (`MatchEngine.ts`) : Le Cerveau
*   **Gestion d'État :** Identifie la `MatchSituation` actuelle pour basculer entre le sac tactique et les sacs de situation.
*   **Filtrage :** Applique les interdits géographiques (ex: pas de tir depuis les ailes ou sa propre moitié de terrain).
*   **Arbitrage :** Gère les conséquences systémiques (repositionnement du ballon, cumul du temps additionnel).

### 2. Dictionnaire de Logique (`token-logic.ts`) : La Cinématique
Un pur dictionnaire de données, sans calcul aléatoire interne.
*   **Déplacement :** Définit le vecteur de mouvement précis.
*   **Narration :** Fournit les commentaires variés pour chaque issue (ex: plusieurs façons de décrire un but sur corner).
*   **Stats :** Enregistre l'impact Opta (xG, Passes réussies, Duels).

## 🧠 État Dynamique du Joueur (Mental & Physique)

*   **Confiance (Mental) :** Score de 0 à 100. Influence directement la `quality` des jetons injectés.
*   **Fatigue (Physique) :** Réduit le volume technique (nombre de jetons dans le sac) et la précision.
*   **Synergie Collective :** Un but marqué booste le moral de toute l'équipe (+15), simulant un momentum psychologique.

## 🗺️ Le Terrain : Influence et Reach

*   **Zones Actives :** Le joueur injecte **100%** de son influence (stock plein).
*   **Zones de "Reach" :** Les voisins directs reçoivent **50%** de l'influence, simulant la capacité de couverture latérale et la projection.

## ⏱️ Chronométrie Événementielle

Le temps s'écoule par l'action. Chaque jeton consomme un temps réaliste (CPA: 45s, But: 60s, Passe: 3-5s). Le match se termine lorsque le cumul `BaseTime + StoppageTime` est atteint.
