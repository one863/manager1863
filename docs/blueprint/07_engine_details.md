# ⚙️ Détails du Moteur de Match "Token Engine"

Le moteur de jeu a abandonné l'approche probabiliste pure pour un système de **Deck Building dynamique** et de **Jetons Nominatifs**. Cette approche "Bottom-Up" permet une narration émergente plus riche et réaliste.

## 🃏 Concept Fondamental : Les Jetons (Tokens)

Chaque action sur le terrain est le résultat du tirage d'un **Jeton** dans un "Sac" commun. Les joueurs injectent leurs jetons dans ce sac en fonction de leur position et de leurs caractéristiques.

### Types de Jetons
*   **PASS :** Tentative de transmission (Action la plus commune).
*   **DRIBBLE :** Tentative d'élimination individuelle.
*   **SHOOT :** Tentative de tir (nécessite d'être en zone offensive).
*   **TACKLE :** Tentative de récupération défensive (peut provoquer une faute).
*   **INTERCEPT :** Lecture du jeu et interception propre.
*   **SAVE :** Arrêt du gardien.
*   **ERROR :** Perte de balle non provoquée (déchet technique).
*   **FATIGUE :** Jeton "négatif" qui, si tiré, diminue les attributs du joueur.

## 🗺️ Le Terrain : Grille Tactique 6x5

Le terrain n'est plus une simple ligne (1-5) mais une **Grille 2D de 30 zones (6x5)**.

*   **Axe X (0-5) :** La profondeur du terrain.
    *   Zone 0 : But Domicile (Gardien Home).
    *   Zone 5 : But Extérieur (Gardien Away).
*   **Axe Y (0-4) :** La largeur du terrain (Gauche, Centre-Gauche, Centre, Centre-Droit, Droite).

### Mécanique d'Injection (Le Sac)
À chaque phase de jeu, le moteur construit un "Sac" de jetons basé sur la position du ballon :
1.  **Zone Active (Ballon) :** Les joueurs présents dans cette case injectent **100%** de leur stock de jetons pertinents.
2.  **Zones Adjacentes :** Les joueurs situés dans les 8 cases autour injectent **50%** de leur stock.
3.  **Mélange :** Le sac est mélangé aléatoirement.
4.  **Tirage :** Un seul jeton est tiré et résolu.

## ⏱️ Gestion du Temps Dynamique

Contrairement à un système de "Ticks" fixes (ex: 1 tick = 1 minute), le temps s'écoule de manière fluide selon l'action tirée :
*   Une **Passe** consomme ~3-5 secondes.
*   Un **Dribble** consomme ~5-8 secondes.
*   Un **Corner** consomme ~45 secondes.
*   Un **But** (célébration + engagement) consomme ~60 secondes.

Le match s'arrête naturellement quand le chronomètre dépasse le temps réglementaire (+ arrêts de jeu).

## 📊 Momentum & Domination Territoriale

Le moteur calcule en temps réel la "Pression" exercée par chaque équipe, inspirée des graphiques Opta/SofaScore.

*   **Calcul :** Basé sur la position X du ballon.
    *   Ballon chez l'adversaire = Momentum Positif (Barre vers le haut).
    *   Ballon dans son camp = Momentum Négatif (Barre vers le bas).
    *   Bonus pour la possession active.
*   **Visualisation :** Un graphique à barres (Bleu/Orange) permet de lire instantanément la physionomie du match (Dominé vs Dominant).

## 🧠 Comportement des Joueurs (IA)

Les joueurs ne sont pas statiques. À chaque phase :
1.  **Suivi du Ballon :** Le bloc équipe coulisse pour suivre le ballon (montée/descente).
2.  **Rôle Tactique :**
    *   Les **Défenseurs** restent généralement derrière la ligne du ballon.
    *   Les **Milieux** suivent le ballon de près.
    *   Les **Attaquants** se projettent dans les zones libres devant.
3.  **Fatigue :** Chaque action consomme de l'énergie. Un joueur fatigué injecte plus de jetons "FATIGUE" et "ERROR" dans le sac, augmentant le risque de perdre le match en fin de partie.

## ⚽ Résolution des Actions Clés

*   **Tirs :**
    *   Ne sont possibles que dans les zones proches du but adverse (X >= 4 ou X <= 1).
    *   Taux de conversion réaliste (~10-15%).
    *   Gestion des Tirs Cadrés (Arrêts Gardien) et Non Cadrés.
*   **Fautes & Cartons :**
    *   Chaque jeton `TACKLE` a une probabilité de générer une faute.
    *   Gravité aléatoire : Simple faute, Jaune, ou Rouge (Expulsion).
*   **Corners :**
    *   Générés aléatoirement suite à un arrêt du gardien ou un contre défensif.
    *   Phase de jeu spécifique avec danger de but accru.
