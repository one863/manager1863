# 🗺️ Topologie du Terrain (Grille 6x5)

Le terrain est une matrice de **30 zones** organisée en **6 colonnes** (profondeur/progression) et **5 lignes** (largeur/étalement).

## 1. Structure de la Grille
* **Colonnes (Axe horizontal) :** Elles représentent la progression du jeu. Chaque équipe traverse les colonnes dans un sens opposé pour atteindre son but.
* **Lignes (Axe vertical) :** Elles représentent la largeur du terrain. Les lignes 1 et 5 sont les **ailes** (couloirs latéraux), tandis que la ligne 3 est l'**axe central** (le chemin le plus direct vers le but).

### Coordonnées des Colonnes (Progression)
| Colonne | Zones | Description / Fonction |
| :--- | :--- | :--- |
| **Col 1** | Z1 - Z5 | Zone défensive Home / Surface de réparation Home |
| **Col 2** | Z6 - Z10 | Camp défensif Home / Sortie de zone |
| **Col 3** | Z11 - Z15 | Milieu de terrain côté Home (Ligne médiane) |
| **Col 4** | Z16 - Z20 | Milieu de terrain côté Away (Ligne médiane) |
| **Col 5** | Z21 - Z25 | Camp défensif Away / Sortie de zone |
| **Col 6** | Z26 - Z30 | Zone défensive Away / Surface de réparation Away |

### Coordonnées des Lignes (Largeur)
* **Ligne 1 (Z1, Z6, Z11, Z16, Z21, Z26) :** Aile gauche.
* **Ligne 2 & 4 :** Intervalles (Demi-espaces).
* **Ligne 3 (Z3, Z8, Z13, Z18, Z23, Z28) :** Axe Central.
* **Ligne 5 (Z5, Z10, Z15, Z20, Z25, Z30) :** Aile droite.

---

## 2. Dynamique Home vs Away
Le terrain fonctionne selon un système de miroir constant. La sémantique d'une zone dépend de l'équipe qui possède le ballon.

| Aspect | Équipe **HOME** | Équipe **AWAY** |
| :--- | :--- | :--- |
| **Point de départ** | Colonne 1 (Gauche) | Colonne 6 (Droite) |
| **Sens de l'attaque** | Vers la droite ($Col 1 \rightarrow Col 6$) | Vers la gauche ($Col 6 \rightarrow Col 1$) |
| **Zone de but (Cible)** | Colonne 6 (Zones 26 à 30) | Colonne 1 (Zones 1 à 5) |
| **Zone de défense** | Colonne 1 (Zones 1 à 5) | Colonne 6 (Zones 26 à 30) |

---

## 3. Algorithmes de Flux et Anti-Stagnation

### A. Système Anti-Loop (Brise-Boucle)
- **Seuil de Stagnation :** 
  - **5 cycles** en Sortie de zone (Colonne 2 relative).
  - **3 cycles** partout ailleurs.
- **Action Forcée :** Déclenchement d'une `handleEmergencyExit`.
  - **Priorité :** Renversement de jeu (changement d'aile) si blocage en Col 2.
  - **Alternative :** Dégagement long (60%), Changement d'aile (30%), Sortie (10%).

### B. Diversification et Bonus
- **Malus Axe Central (Ligne 3) :** Pénalité de puissance offensive si la densité dépasse 3 joueurs alliés dans la zone.
- **Bonus Ailes (Lignes 1 & 5) :** Une progression réussie sur les ailes active le flag `wingAttackActive`.
  - **Bonus Centre en retrait :** +15% xG sur le tir suivant si l'action vient d'une aile.

### C. Bridage des Rôles
- **GK (Gardien) :** Verrouillé en Colonne 1 (Home) ou 6 (Away). Repositionnement forcé si le ballon sort de sa zone de base.
- **DEF (Défenseurs) :** Ne peuvent pas progresser au-delà de la Colonne 4 (Home) ou 3 (Away) en possession standard.
