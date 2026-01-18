# 04. Mécaniques Métier (Engine)

Ce document décrit les algorithmes et les logiques de calcul qui régissent la simulation du club, mis à jour selon l'implémentation réelle.

## 1. Moteur de Match (Match Engine)
La simulation repose sur une **résolution par cycles minute par minute** (environ 95-100 cycles par match) utilisant des probabilités pondérées.

### Calcul des Team Ratings (Contribution des Joueurs)
La contribution de chaque joueur aux notes de secteur (Attaque, Défense, Milieu) est calculée dynamiquement avec les multiplicateurs suivants :

*   **Condition Physique & Énergie :** Multiplicateur direct (ex: 80% de condition = 80% de contribution).
*   **Forme du moment (`form`) :** De **0.7x** à **1.4x**. La valeur neutre (5) apporte un bonus de 1.1x.
*   **Fidélité (`loyalty`) :** Bonus de **+2% tous les 100 jours** au club (max +20%).
*   **Engagement :** Malus de **-10%** si le joueur est sur la liste des transferts (`isTransferListed`).
*   **Confiance Individuelle (`confidence`) :** Impact max de **+/- 10%**, stabilisé par l'expérience du joueur (les vétérans sont moins volatiles).
*   **Impact du Coach (Staff) :** 
    *   **Sérénité :** Un coach en confiance booste globalement l'équipe (jusqu'à +5%).
    *   **Familiarité Tactique :** Bonus progressif selon l'ancienneté du coach au club (+1% tous les 100 jours, max +10%).
    *   **Traits de Staff :**
        *   `TACTICIAN` : Bonus permanent de +5% à l'organisation.
        *   `STRATEGIST` : Bonus de +5% lors des matchs à haute pression (>50).
        *   `MOTIVATOR` : Réduit les pertes de confiance collectives après une défaite.
*   **Pression du Match (`pressure`) :**
    *   Chaque match possède un score de pression (0-100).
    *   **Vétérans :** Gagnent en focus (+ contribution) sous pression.
    *   **Jeunes :** Perdent en contribution (jusqu'à -10%) sous forte pression.
    *   **Traits Joueurs :** `BIG_MATCH_PLAYER` (+15% max) et `GHOST_PLAYER` (-20% max).

### Résolution des Actions
Deux types d'actions offensives sont déclenchés aléatoirement selon le contrôle :
1.  **Attaque Normale (12% de chance par cycle) :** Duel entre l'Attaque du secteur et la Défense correspondante de l'adversaire.
2.  **Coup de Pied Arrêté (4% de chance par cycle) :** Calcul basé sur `Team.setPieces vs Opponent.defenseCenter`.

## 2. Dynamique Psychologique & Confiance

### Évolution de la Confiance
La confiance évolue après chaque match selon la série de résultats (5 derniers matchs) :
*   **Joueurs :** Influencée par la forme de l'équipe et leur note de performance individuelle (> 6.5).
*   **Coach :** Très sensible aux résultats collectifs. Le trait `MOTIVATOR` amortit les chutes de moral en cas de crise.
*   **Incidents :** Les blessures, suspensions et mises sur la liste des transferts dégradent la confiance et l'engagement.

## 3. Système de Progression (Training & Growth)
Le développement est calculé chaque lundi (`day % 7 === 1`).

### Formule de Gain
*   **Cycle Hebdomadaire :** XP gagnée selon le `trainingFocus`.
*   **Bonus Staff :** La stat du coach responsable ajoute un bonus de progression. Le trait `YOUTH_SPECIALIST` accélère le gain pour les joueurs de moins de 21 ans.
*   **Facteur Jeunesse & Potentiel :** Les jeunes progressent plus vite, mais le gain ralentit drastiquement à mesure que le `skill` approche du `potential`.

## 4. Économie & Finances
### Revenus de Match
*   **Affluence :** `FanCount * Modificateur de Confiance`, limitée par `StadiumCapacity`.
*   **Billetterie :** Basée sur l'affluence et la réputation du club.

## 5. Santé & Condition
*   **Récupération :** Gain quotidien d'énergie et condition.
*   **Blessures :** Risque accru par la fatigue. Une blessure réduit la condition et la confiance. Le trait `HARD_DRILLER` du staff augmente la stat physique mais accélère la fatigue.
*   **Suspensions :** Gérées automatiquement après accumulation de cartons ou carton rouge.
