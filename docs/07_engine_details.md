# ⚙️ Détails du Moteur de Match "Token Engine" (V2.1)

Le moteur de jeu repose sur une séparation stricte entre l'**Intelligence Systémique** (Arbitrage) et le **Dictionnaire de Données** (Cinématique).

## 🃏 Concept Fondamental : Les Jetons Narratifs

Le moteur utilise un système de jetons où chaque action est représentée par un token tiré d'un sac. Le "talent" d'une équipe se reflète dans la **proportion de jetons favorables** injectés dans le sac.

### 🏟️ Système de Grille (6×5)
Le terrain est divisé en une grille de 6 colonnes (x: 0→5) × 5 lignes (y: 0→4) :
- **Colonnes :** x=0 (surface adverse pour away) ➔ x=5 (surface adverse pour home)
- **Lignes :** y=0 (aile gauche) ➔ y=4 (aile droite), y=2 (axe central)
- **Surfaces de tir :** Colonnes 0 et 5 uniquement (zones 0,1-0,3 et 5,1-5,3)

### 🎭 Sacs de Situation
Lors de phases spécifiques, le moteur utilise un sac dédié dont les proportions respectent les standards réalistes :
- **CORNER :** `CORNER_GOAL` (3%), `CORNER_CLEARED` (60%), `CORNER_SHORT` (20%), `CORNER_OVERCOOKED` (17%)
- **PENALTY :** `PENALTY_GOAL` (75%), `PENALTY_SAVED` (20%), `PENALTY_MISS` (5%)
- **GOAL_KICK :** `GK_SHORT` (40%), `GK_LONG` (40%), `GK_BOULETTE` (20%) avec `nextSituation: 'NORMAL'`
- **KICK_OFF :** `KICK_OFF_BACK`, `KICK_OFF_LONG`
- **REBOUND_ZONE :** Après un tir sur le poteau, favorise les tirs et duels

## 🏗️ Architecture Technique

### 1. Le Moteur (`match-engine.ts`) : Le Cerveau
**Gestion d'État :**
- Identifie la `MatchSituation` actuelle (NORMAL, GOAL_KICK, CORNER, PENALTY, etc.)
- Bascule entre le sac tactique et les sacs de situation
- Suit le `possessionTeamId` (possession réelle) distinct du `teamId` (exécutant du token)

**Filtrage Spatial :**
- **CLEARANCE :** Disponible uniquement en zones défensives (x≤2 pour home, x≥3 pour away)
- **CROSS :** Disponible uniquement en zones offensives (x≥3 pour home, x≤2 pour away)
- **Tokens de tir :** Disponibles uniquement dans les surfaces (x=0 ou x=5)
- **Tokens GK :** Retirés du pool offensif pour éviter les boucles infinies

**Arbitrage des Turnovers :**
- `SHOOT_OFF_TARGET`, `SHOOT_SAVED`, `SHOOT_WOODWORK` changent la possession avant le log
- Repositionnement automatique dans la surface défensive de l'équipe qui récupère
- Logs avec `possessionTeamId` pour tracking précis

**Gestion des Buts :**
```typescript
if (result.isGoal) {
  1. Log du but avec nom du joueur et stats xG
  2. Appel tracker.trackAction() pour comptabiliser le but
  3. Log "Célébration du but !" (30s)
  4. Repositionnement au centre (x=2, y=2)
  5. Log "Remise en jeu après but" (30s)
  6. Passage de possession à l'équipe qui a encaissé
  7. Situation → KICK_OFF
}
```

### 2. Dictionnaire de Logique (`token-logic.ts`) : La Cinématique
Dictionnaire pur sans calcul aléatoire interne, chaque token définit :
- **Déplacement :** Vecteur `moveX`/`moveY` (peut être fonction de la position)
- **Narration :** Message de commentaire
- **Stats :** Impact Opta (`xG`, `isPass`, `isDuel`, etc.)
- **Transition :** `nextSituation` optionnel pour changer l'état du match

**Exemples de logique spatiale :**
```typescript
// CROSS - Se dirige toujours vers la surface adverse
'CROSS': (t, p, h, b) => {
  const targetX = h ? 5 : 0;  // Surface adverse
  const moveX = h ? Math.max(1, targetX - b.x) : Math.min(-1, targetX - b.x);
  return { moveX, moveY: rnd(-1,1), ... };
}

// CLEARANCE - Dégage vers l'avant pour l'équipe possédante
'CLEARANCE': (t, p, h) => ({
  moveX: h ? 2 : -2,  // Home dégage vers x+2, Away vers x-2
  moveY: rnd(-1,1), ...
});
```

### 3. Construction du Sac (`grid-engine.ts`)
**Flux de Priorités :**
1. Filtrage par situation (CORNER/PENALTY/etc. → sac dédié)
2. Filtrage par zone (zones-config.ts fournit tokens de base)
3. Filtrage spatial (CLEARANCE/CROSS/tirs selon position)
4. Ajout des tokens joueurs (token-player.ts selon stats)

**Équilibrage des Tokens :**
- **Passes :** `PASS_SHORT` (×4), `PASS_LONG` (×2), `PASS_BACK` (×2)
- **Tirs en surface :** `SHOOT_GOAL` (×8-10), `SHOOT_SAVED` (×3), `SHOOT_OFF_TARGET` (×1-2)
- **Défense :** `TACKLE`, `INTERCEPT` selon zone
- **GK (GOAL_KICK uniquement) :** `GK_SHORT`, `GK_LONG`, `GK_BOULETTE`

### 4. Statistiques (`stat-tracker.ts`)
Comptabilise en temps réel :
- **Possession :** Temps cumulé par équipe
- **Tirs :** Total, cadrés, buts (via `result.isGoal`)
- **xG :** Sommation des Expected Goals
- **Passes :** Tentées et réussies
- **Duels :** Total et remportés

⚠️ **Important :** `trackAction()` doit être appelé même pour les buts (ajouté avant le `return` dans le bloc isGoal).

## 🎮 Interface Live Match (`MatchLive.tsx`)

### Calcul Dynamique des Stats
Les stats sont calculées **à partir des logs** selon le temps actuel :
```typescript
const homeGoals = playedLogs.filter(l => 
  l.teamId === hId && 
  l.eventSubtype === 'GOAL' && 
  l.playerName  // Évite de compter "Célébration du but !"
).length;
```

### Temps Additionnel Dynamique
```typescript
const currentStoppageTime = useComputed(() => {
  const min = currentMinute.value;
  return min >= 90 ? min - 90 : 0;
});
```

### Navigation Temporelle
- **StepBack/Forward :** Mettent automatiquement en pause (`isPaused.value = true`)
- **useEffect :** Dépendances limitées à `[isPaused.value, maxTime]` pour éviter re-création
- **Affichage :** Tokens visibles sur toute la grille avec `overflow-visible`, positionnement conditionnel sur bords

## 🗺️ Le Terrain : Influence et Reach

- **Zones Actives :** Le joueur injecte **100%** de son influence
- **Zones de "Reach" :** Les voisins directs reçoivent **50%** de l'influence

## ⏱️ Chronométrie Événementielle

Le temps s'écoule par l'action. Chaque jeton consomme un temps réaliste :
- **Passe courte :** 2-4s
- **Passe longue :** 4-6s
- **Tir/Arrêt :** 5-10s
- **But :** 60s (log du but) + 30s (célébration) + 30s (remise en jeu) = 120s total
- **Corner/Penalty :** 7-10s

Le match se termine lorsque `currentTime ≥ maxTime` (90 min + arrêts de jeu).

## 🐛 Corrections Récentes (Janvier 2026)

### ✅ Boucle Infinie GK
**Problème :** `GK_SHORT`/`GK_LONG` n'avaient pas de `nextSituation`, restaient en `GOAL_KICK` indéfiniment.  
**Solution :** Ajout de `nextSituation: 'NORMAL'` sur tous les tokens GK.

### ✅ Scores 0-0 Systématiques
**Problème :** Le log du but n'était jamais créé (return avant le log principal) ET `tracker.trackAction()` n'était jamais appelé pour les buts.  
**Solutions :**
1. Création explicite du log de but avec playerName avant célébration
2. Appel `tracker.trackAction(token.teamId, result, duration)` avant le return
3. Calcul dynamique des buts dans MatchLive à partir des logs avec `eventSubtype === 'GOAL' && playerName`

### ✅ Navigation Temporelle Bloquée
**Problème :** `useEffect` avec `currentMatchTime.value` en dépendance recréait l'intervalle à chaque tick, empêchant le retour en arrière.  
**Solutions :**
1. Retrait de `currentMatchTime.value` des dépendances
2. Pause automatique dans `handleStepBack`/`handleStepForward`
3. Calcul dynamique du `stoppageTime` selon minute actuelle

### ✅ Possession Visuelle Incorrecte
**Problème :** Après turnover, la possession affichée restait à l'équipe qui tirait.  
**Solution :** Séparation logique possession/exécution avec changement avant log pour turnovers.

### ✅ Tokens Irréalistes
**Problèmes :** CLEARANCE en attaque, CROSS depuis la défense, tirs depuis le milieu.  
**Solutions :** Filtres spatiaux dans `grid-engine.ts` basés sur position x et équipe.

### ✅ Labels UI Coupés
**Problème :** Tokens sur colonne 0 (bord gauche) avaient labels tronqués.  
**Solution :** `overflow-visible` + positionnement conditionnel `left-0` vs `left-1/2 -translate-x-1/2`.

## 📊 Métriques de Performance

**Tokens par Match :** ~300-500 actions (90 min)  
**Durée Simulation :** <1s pour un match complet (worker thread)  
**Taille Logs :** ~50-100 KB par match (debugLogs complets)  
**Buts Moyens :** 2-4 par match avec équilibrage actuel
