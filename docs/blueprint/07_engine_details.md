# 📑 DOCUMENT DE SPÉCIFICATIONS : MOTEUR DE MATCH "90-S" (V4.7)

## 1. PHILOSOPHIE DU MOTEUR : LE MODÈLE PROBABILISTE UNIFIÉ

Le moteur "90-S" repose sur une approche **probabiliste non-linéaire**. Il simule un match comme une succession de 90+ séquences (minutes) où chaque action est le résultat d'un entonnoir de probabilités. 

L'innovation majeure de la V4.7 réside dans l'utilisation du modèle **Bradley-Terry (Ratio de Talent)** couplé à une **Ancre Dynamique**. Cette architecture garantit que les statistiques (Conversion xG et Précision) restent stables et réalistes, qu'il s'agisse d'un match de District ou d'une finale d'Élite mondiale.

---

## 2. L'ANATOMIE DU JOUEUR (V-Q-N)

Le moteur puise dans 18 caractéristiques individuelles réparties en trois vecteurs de performance :

### A. Axe Physique (V - Volume & Dynamique)
*   **Stamina (Endurance)** : Détermine la courbe de fatigue. La perte de $V_{dyn}$ par minute est calculée par : $0.85 - (\text{Stamina} / 40)$.
*   **Speed (Vitesse)** : Crucial pour les débordements sur les ailes et le succès des **Contre-Attaques** (Porte C).
*   **Strength (Force)** : Utilisé dans les duels physiques, notamment sur les corners et phases arrêtées.
*   **Jumping (Détente)** : Utilisé pour les duels aériens (centres) et la parade des frappes hautes par le gardien.
*   **Agility (Agilité)** : Améliore la réactivité du gardien et la propreté des tacles défensifs.
*   **Volume Dynamique ($V_{dyn}$)** : État d'énergie en temps réel. **Seuil critique : 50%**. En dessous, un malus proportionnel ($\frac{V}{50}$) est appliqué à toutes les caractéristiques techniques ($Q$).

### B. Axe Technique (Q - Qualité)
*   **Passing (Passe)** : Clé de la circulation de balle (Secteur Milieu) et de la réussite des transitions (Porte B).
*   **Shooting (Finition)** : Force brute de frappe utilisée dans le duel final.
*   **Dribbling (Dribble)** : Permet de conserver le ballon sous pression et d'éliminer un adversaire en transition.
*   **Tackling (Tacle)** : Capacité à stopper les transitions adverses et à réussir un pressing haut.
*   **Ball Control (Contrôle)** : Stat transverse réduisant le "déchet technique" (interceptions) et stabilisant la frappe.
*   **Crossing (Centre)** : Multiplicateur de qualité pour les tirs déclenchés depuis les secteurs latéraux.
*   **Goalkeeping (Gardien)** : Valeur pivot de la `Force_Defense`.

### C. Axe Mental (N - Neuronal)
*   **Vision** : Capacité à transformer une possession stérile en occasion franche (Porte B).
*   **Positioning (Placement)** : Capacité à fermer les espaces (Défense) ou à se faire oublier (Attaque).
*   **Composure (Sang-froid)** : Stat maîtresse de la Porte D pour réussir le test de cadrage (Précision).
*   **Leadership** : Actif durant le **Money Time** (80'+). Si $> 14$, il stabilise la confiance de l'équipe.
*   **Anticipation** : Permet aux défenseurs de "lire" et d'avorter les contre-attaques adverses.
*   **Aggression** : Détermine l'efficacité des récupérations via le **Contre-Pressing**.

---

## 3. LE RÔLE DU STAFF ET DE LA STRATÉGIE

Le joueur influence le moteur via son Staff et ses réglages d'Intensité :

### L'Impact du Staff
*   **Entraîneur (Coaching)** : Améliore la pertinence des remplacements effectués par l'IA.
*   **Analyste (Tactical & Reading)** : 
    *   *Tactical* : Bonus direct aux transitions (Porte B).
    *   *Reading* : Bonus permanent au duel d'Initiative (Porte A).
*   **Préparateur (Conditioning & Medicine)** :
    *   *Conditioning* : Boost le $V_{dyn}$ de départ.
    *   *Medicine* : Réduit radicalement l'usure physique durant les 90 minutes.
*   **Psychologue (Psychology)** : Stabilise la confiance des joueurs face à l'échec.

### Le Réglage de l'Intensité (1 à 5)
L'Intensité est un multiplicateur de performance à double tranchant :
*   **Bonus** : Chaque point booste l'Initiative ($+1.5$), les Transitions ($+2$) et les stats $Q$ ($+5\%$).
*   **Malus** : Augmente proportionnellement la vitesse d'épuisement du Volume ($V_{dyn}$). À l'intensité 5, un joueur s'épuise 2x plus vite.

---

## 4. L'ALGORITHME DES 4 PORTES

### Porte A : Initiative (La Possession)
*   **Calcul** : $Force\_Milieu + Staff\_Reading + (Cohesion / 4) + (Intensité \times 1.5) + D20$.
*   **Neutral Zone** : Si l'écart est $< 6$, la possession est stérile.

### Porte B : Transition (La Création)
*   **Test** : $D100 < (15 + Staff\_Tactique + Intensité \times 2 + Cohésion \times 0.25)$.
*   **Succès** : Accès à la Porte D. **Échec** : Passage à la Porte C.

### Porte C : Réaction (Pressing & Contre-Attaque)
1.  **Contre-Pressing** (10% de chance) : Si l'équipe a une forte **Aggression**, elle peut re-déclencher une Porte B.
2.  **Contre-Attaque** : Si le pressing échoue, le défenseur utilise sa **Vitesse** contre l'**Anticipation** adverse. Un succès mène à la Porte D avec un bonus d'xG.

### Porte D : Résolution (L'Ancre Dynamique)
1.  **Précision (Le Cadre)** : Seuil $19.5 - (xG \times 20)$. Réussite si $D20 + (Composure \times 0.4) > Seuil$.
2.  **Ancre Dynamique** : Le moteur calcule l'**Estimated Accuracy** (probabilité statistique du tireur de cadrer).
3.  **Le Duel Bradley-Terry** : 
    *   $Ratio = 1 + \log_{10}(AttForce / DefForce)$.
    *   $Probabilité\_But = \text{clamp}(\frac{xG}{EstimatedAccuracy} \times Ratio, 0.01, 0.95)$.
4.  **Saturation Défensive** : Si $ScoreDiff > 1$, la défense reçoit un bonus de densité ($+25\%$ par but d'écart).

---

## 5. INCIDENTS, CPA ET PERSISTENCE

*   **Temps Additionnel** : $90 + \text{randomInt}(2, 5)$ minutes.
*   **CPA (Corners/Penalties)** : Duel de caractéristiques spécifiques (Strength/Shooting) avec bonus de traits.
*   **Cartons & Blessures** : Liés à l'Aggression, la Discipline et l'épuisement ($V_{dyn} < 10\%$).
*   **Après-Match** : Cristallisation du $V_{final}$, de la **Confiance**, et calcul du **Rating (0-10)**.

---

## 6. PERFORMANCES DE RÉFÉRENCE (VALIDATION V4.7)

| Scénario | Moy. Buts | Conversion xG | Précision |
| :--- | :--- | :--- | :--- |
| **Choc des Titans (Ligue 1)** | 2.25 | ~100% | ~40% |
| **Elite vs Faible** | 5.50 | ~110% | ~45% |
| **District (Bas niveau)** | 1.60 | ~70% | ~25% |

---

## 7. RÉSUMÉ DES TESTS (LANCERS DE DÉS)
*   **D20** : Talent & Chance (utilisé pour les duels et l'initiative).
*   **D100** : Logique de "Oui/Non" (Transitions, Pressing, CPA).
*   **D10** : Qualité de position (Génère l'xG entre 0.08 et 0.40).
