# 04. Mécaniques Métier (Engine)

Ce document décrit les algorithmes qui régissent la simulation, mis à jour pour le moteur VQN (Version 2.0).

## 1. Moteur de Match (VQN Engine)
La simulation repose sur une boucle itérative de **90 séquences fixes** (représentant les 90 minutes du match). À chaque séquence (minute $i$), le moteur suit une logique stricte :

### A. Étape d'Initiative (Duel du Milieu)
Détermine quelle équipe prend le contrôle de la balle pour cette minute.
*   **Calcul :** `Force_Equipe = Σ(Passe * 0.4 + Vision * 0.3 + Placement * 0.3) + D20 + Bonus_Analyste`.
*   **Résultat :** Si la différence entre les deux équipes est $> 5$, l'équipe dominante lance une transition. Sinon, la séquence est marquée comme "VIDE" (possession neutre).

### B. Étape de Transition (Le Filtre de Risque)
L'équipe en contrôle tente de progresser vers le dernier tiers.
*   **Calcul :** Un jet de `D100` est effectué contre le `Seuil_de_Risque` défini par la tactique du Coach Principal (Tactical).
*   **Succès :** Accès direct à la phase de Résolution (Tir).
*   **Échec :** Déclenchement du sous-module de Contre-Réaction.

### C. Sous-Module de Contre-Réaction
En cas d'échec de transition, le moteur teste deux événements :
1.  **Contre-Pressing :** L'attaquant tente de récupérer la balle immédiatement via sa stat `Tacle (Q)`.
2.  **Contre-Attaque :** Si le pressing échoue, le défenseur adverse tente une attaque rapide basée sur sa `Vitesse (V)`.

### D. Résolution (xG Dynamique & Duel Final)
Si une équipe tire, le résultat est déterminé par un xG variable.
*   **Formule xG :** `xG_Final = (Base_Zone * Variance_D10) * Modificateur_Risque_Coach`.
*   **Le Duel Final :** Un but est marqué si `(Tir (Q) + D20) * xG_Final > (Gardien (Q) + D20)`.

### E. Physiologie (Mise à jour du Volume V)
À la fin de chaque séquence, l'usure est appliquée :
*   **Consommation :** Le Volume (V) diminue selon l'Endurance du joueur et le staff médical.
*   **Seuil Critique (50%) :** Si $V < 50\%$, toutes les statistiques techniques (Q) et mentales (N) sont réduites proportionnellement à la chute de Volume.

## 2. Le Staff (Multiplicateurs de Système)
Le personnel modifie les constantes avant et pendant le match :
*   **Coach Principal :** Influence le `Seuil_de_Risque` et booste le `Placement (N)`.
*   **Préparateur Physique :** Augmente le `Volume (V)` de départ et réduit l'usure par minute.
*   **Analyste Vidéo :** Apporte un bonus fixe à l'Initiative (Lecture du jeu).

## 3. Dynamique de Fidélité (Loyalty)
La fidélité est une variable cachée qui augmente avec l'ancienneté (jours au club).
*   **Impact :** Un joueur fidèle résiste mieux à la baisse de moral et reçoit un léger bonus de performance sur ses stats Mentales (N).
