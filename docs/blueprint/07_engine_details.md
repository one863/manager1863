# ⚙️ Détails du Moteur de Match (Engine V9.0.1)

Ce document détaille le fonctionnement interne du simulateur de match basé sur une grille de 30 zones (6x5).

## 1. Architecture du Moteur
Le moteur fonctionne par **Micro-Cycles** (4 par minute) pour simuler la fluidité du football.

### Composants Clés
*   **Heatmap d'Influence :** Système de cache calculant la puissance Atk/Def de chaque zone selon le placement des 22 joueurs.
*   **Fondation Statistique (Floor 3.0) :** Chaque zone possède une résistance de base de 3.0 pour éviter les scores fleuves en cas de zone vide.
*   **Validation Spatiale :** Les actions (tirs, centres, relances) sont bridées par les coordonnées relatives (Home 1->6, Away 6->1).

## 2. Logique de Flux (Transition)

### Algorithme Anti-Stagnation (Anti-Loop)
Pour éviter les duels infinis dans une zone unique :
*   **Seuil :** 3 cycles (ou 5 en zone de sortie de camp).
*   **Action :** Déclenchement d'un `handleEmergencyExit` (Renversement d'aile ou Dégagement long).

### Zone Fatigue & Saturation
Chaque entrée du ballon dans une zone incrémente un `saturationIndex`.
*   **Friction :** Si Index >= 3, la puissance offensive chute de **60%**.
*   **Conséquence :** Le moteur force mathématiquement le porteur à chercher une zone "fraîche" (Soutien intérieur ou changement d'aile).

### Intelligence de Soutien
*   **Couverture Dynamique :** Si les ailes (L1/L5) sont saturées, les zones intérieures (L2/L4) reçoivent un bonus d'attractivité de **x1.5** pour simuler une solution de passe en retrait.
*   **Repiquage Axial :** En Colonne 5 (approche), les MID/FWD ont 60% de chances de quitter l'aile pour entrer dans l'axe (Z27/Z28/Z29) afin de maximiser le xG.

## 3. Système de Résolution (Tirs & xG)

### xG Adaptatif
Le xG n'est plus fixe mais calculé selon la densité défensive :
`xG_Final = Base_xG * (1 - (saturationIndex * 0.15))`
*   Un tir dans une zone saturée simule un bloc regroupé et un manque d'angle.

### Bridage des Rôles
*   **GK Locking :** Le gardien est exclu des tirs et des progressions. Il ne peut effectuer que des "Relances Longues".
*   **Position Penalty :** Un joueur agissant hors de sa zone naturelle (ex: DEF en attaque) subit un malus de **-80%** d'efficacité.

## 4. Performance & Optimisation
*   **Caching d'Influence :** La heatmap n'est recalculée qu'en cas de changement tactique ou de remplacement (`isInfluenceDirty`).
*   **Fast-Lookup Zones :** Utilisation d'une map de proximité pour identifier instantanément le réceptionneur de balle le plus proche.
