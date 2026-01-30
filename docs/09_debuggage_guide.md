# 🐛 Guide de Débogage du Moteur de Match

Ce document liste les problèmes courants et leurs solutions pour le Token Engine.

## 🔴 Symptômes Fréquents

### Match Bloqué / Boucle Infinie

**Symptômes :**
- La simulation ne se termine jamais
- Tous les logs montrent les mêmes tokens (ex: `GK_SHORT`, `GK_LONG`)
- Le chrono n'avance plus ou avance très lentement

**Causes Possibles :**

1. **Token sans nextSituation**
   ```typescript
   // ❌ MAUVAIS - Reste bloqué en GOAL_KICK
   'GK_SHORT': (t, p, h) => ({
     moveX: h ? 1 : -1,
     // Manque nextSituation !
   })
   
   // ✅ BON
   'GK_SHORT': (t, p, h) => ({
     moveX: h ? 1 : -1,
     nextSituation: 'NORMAL'  // Retour au jeu normal
   })
   ```

2. **Sac de situation vide**
   - Vérifier que `buildBag()` retourne au moins 1 token pour chaque situation
   - Ajouter un fallback `NEUTRAL_POSSESSION` si le sac est vide

3. **Tokens GK dans le pool offensif**
   ```typescript
   // Vérifier dans grid-engine.ts que GK tokens sont exclus
   const offensiveTypes = [...].filter(t => 
     !['GK_SHORT', 'GK_LONG', 'GK_BOULETTE'].includes(t.type)
   );
   ```

**Solutions :**
- Auditer tous les tokens avec un `nextSituation` définissant une transition
- Vérifier que chaque `MatchSituation` peut retourner à `NORMAL`
- Logger le contenu du bag à chaque tirage pour identifier les boucles

---

### Score Reste à 0-0

**Symptômes :**
- Les logs montrent "BUT !!!" et "Célébration du but !"
- Les buteurs apparaissent dans le Scoreboard
- Le score affiché reste 0-0

**Causes Possibles :**

1. **trackAction() non appelé pour les buts**
   ```typescript
   // ❌ MAUVAIS - Le return empêche le tracking
   if (result.isGoal) {
     this.log('EVENT', 'Célébration du but !');
     return;  // ← Saute tracker.trackAction() !
   }
   ```

2. **Calcul de score basé sur des stats statiques**
   ```typescript
   // ❌ MAUVAIS - Utilise result.stats qui est figé à la fin du match
   homeScore: result.stats.shots[homeId].goals
   
   // ✅ BON - Compte dynamiquement à partir des logs
   homeGoals: playedLogs.filter(l => 
     l.eventSubtype === 'GOAL' && l.playerName && l.teamId === homeId
   ).length
   ```

3. **Logs de célébration comptés comme buts**
   ```typescript
   // ❌ MAUVAIS - Compte aussi "Célébration du but !"
   playedLogs.filter(l => l.eventSubtype === 'GOAL').length
   
   // ✅ BON - Filtre sur playerName
   playedLogs.filter(l => 
     l.eventSubtype === 'GOAL' && l.playerName
   ).length
   ```

**Solutions :**
- Appeler `tracker.trackAction()` AVANT le return dans le bloc isGoal
- Créer explicitement le log du but avec `playerName` avant célébration
- Calculer les scores dynamiquement à partir des logs avec filtre `playerName`

---

### Navigation Temporelle Bloquée

**Symptômes :**
- Impossible de revenir en arrière depuis la fin du match
- StepBack ne fait rien ou rejump immédiatement en avant
- Le temps additionnel ne se met pas à jour lors du retour

**Causes Possibles :**

1. **useEffect avec dépendance sur currentMatchTime**
   ```typescript
   // ❌ MAUVAIS - Re-crée l'intervalle à chaque tick
   useEffect(() => {
     // ...
   }, [isPaused.value, currentMatchTime.value])
   
   // ✅ BON
   useEffect(() => {
     // ...
   }, [isPaused.value, maxTime])
   ```

2. **Pas de pause lors des contrôles manuels**
   ```typescript
   // ❌ MAUVAIS - L'auto-play reprend immédiatement
   const handleStepBack = () => {
     currentMatchTime.value = logs[idx - 1].time;
   }
   
   // ✅ BON
   const handleStepBack = () => {
     isPaused.value = true;  // Pause d'abord !
     currentMatchTime.value = logs[idx - 1].time;
   }
   ```

3. **Temps additionnel statique**
   ```typescript
   // ❌ MAUVAIS - Toujours result.stoppageTime
   stoppageTime={useSignal(result.stoppageTime || 0)}
   
   // ✅ BON - Calcul dynamique
   const currentStoppageTime = useComputed(() => {
     const min = currentMinute.value;
     return min >= 90 ? min - 90 : 0;
   });
   ```

**Solutions :**
- Limiter les dépendances du useEffect à `[isPaused.value, maxTime]`
- Mettre automatiquement en pause dans handleStepBack/Forward
- Calculer le stoppageTime dynamiquement selon currentMinute

---

### Possession Visuelle Incorrecte

**Symptômes :**
- Le ballon reste bleu (home) alors que away attaque
- Après un tir raté, la couleur du ballon ne change pas
- Les logs montrent `possessionTeamId` différent de la couleur affichée

**Causes Possibles :**

1. **Possession changée après le log**
   ```typescript
   // ❌ MAUVAIS - Log puis changement de possession
   this.log(result.logMessage, { teamId: token.teamId });
   this.possessionTeamId = oppositeTeamId;
   
   // ✅ BON - Changement puis log avec nouvelle possession
   this.possessionTeamId = oppositeTeamId;
   this.log(result.logMessage, { 
     teamId: token.teamId,
     possessionTeamId: this.possessionTeamId 
   });
   ```

2. **UI utilise teamId au lieu de possessionTeamId**
   ```typescript
   // ❌ MAUVAIS
   const ballColor = currentLog.teamId === homeId ? 'blue' : 'orange';
   
   // ✅ BON
   const ballColor = currentLog.possessionTeamId === homeId ? 'blue' : 'orange';
   ```

**Solutions :**
- Changer `possessionTeamId` AVANT de créer le log
- Utiliser `possessionTeamId` dans l'UI, pas `teamId`
- Ajouter `possessionTeamId` à tous les logs (même système)

---

### Tokens Irréalistes (CROSS depuis défense, etc.)

**Symptômes :**
- Centres depuis la surface défensive
- Dégagements dans le camp adverse
- Tirs depuis le milieu de terrain

**Causes Possibles :**

1. **Pas de filtrage spatial**
   ```typescript
   // ❌ MAUVAIS - CROSS disponible partout
   if (situation === 'NORMAL') {
     return [...offensiveTokens, ...allOtherTokens];
   }
   
   // ✅ BON - Filtre selon position
   const crossTokens = offensiveTokens.filter(t => {
     if (t.type === 'CROSS') {
       const isOffensive = possession === homeId ? pos.x >= 3 : pos.x <= 2;
       return isOffensive;
     }
     return true;
   });
   ```

2. **Logique de mouvement incorrecte**
   ```typescript
   // ❌ MAUVAIS - CROSS peut aller en arrière
   'CROSS': (t, p, h) => ({ moveX: rnd(-1, 2) })
   
   // ✅ BON - CROSS va toujours vers surface adverse
   'CROSS': (t, p, h, b) => {
     const targetX = h ? 5 : 0;
     const moveX = h ? Math.max(1, targetX - b.x) : Math.min(-1, targetX - b.x);
     return { moveX, moveY: rnd(-1,1) };
   }
   ```

**Solutions :**
- Ajouter filtres spatiaux dans `grid-engine.ts`
- Définir des zones autorisées pour chaque type de token
- Utiliser la position du ballon (`ballPos`) dans la logique des tokens

---

### Labels UI Coupés / Invisibles

**Symptômes :**
- Tokens sur la colonne 0 ont labels tronqués
- Nom du joueur ou type de token disparaît sur les bords
- Affichage correct au centre mais problème sur les extrémités

**Causes Possibles :**

1. **overflow-hidden sur le conteneur**
   ```tsx
   {/* ❌ MAUVAIS */}
   <div className="relative overflow-hidden">
     {/* Labels hors de la zone sont coupés */}
   </div>
   
   {/* ✅ BON */}
   <div className="relative overflow-visible">
     {/* Labels peuvent dépasser */}
   </div>
   ```

2. **Positionnement absolu toujours centré**
   ```tsx
   {/* ❌ MAUVAIS - Label centré dépasse à gauche sur x=0 */}
   <div className="absolute left-1/2 -translate-x-1/2">
   
   {/* ✅ BON - Conditionnel selon position */}
   <div className={x === 0 ? "absolute left-0" : "absolute left-1/2 -translate-x-1/2"}>
   ```
2
**Solutions :**
- `overflow-visible` sur conteneur de terrain
- Positionnement conditionnel sur bords (x=0, x=5)
- Z-index élevé pour garantir visibilité (`z-50`)
. **Positionnement d'acces au live**
**Solutions :**
Le bug venait du fait que la méthode qui simulait les matchs IA contre IA (runBatchSimulation) était asynchrone mais n’était pas attendue (pas de await) dans simulateDayByDay. Résultat : les résultats des matchs IA vs IA n’étaient pas toujours sauvegardés ou à jour au moment où tu consultais les données.

En rendant runBatchSimulation asynchrone et en l’attendant avec await, on garantit que tous les résultats IA vs IA sont bien simulés et enregistrés avant de continuer. Cela corrige le problème de non-mise à jour des matchs IA contre IA.

c'etait dans quel fichier le bug ?

Le bug était dans le fichier src/competition/match/match-service.ts.
C’est là que la gestion de la simulation et de la sauvegarde des résultats des matchs IA contre IA n’était pas correctement synchronisée.



## 🔧 Outils de Débogage

### Console Logs Utiles

```typescript
// Dans match-engine.ts
console.log('Bag size:', currentBag.length);
console.log('Current situation:', this.currentSituation);
console.log('Ball position:', this.ballPosition);
console.log('Possession:', this.possessionTeamId);

// Dans token-logic.ts
console.log('Token executed:', token.type, 'Result:', result);

// Dans grid-engine.ts
console.log('Available tokens:', tokens.map(t => t.type));
```

### DevTools React

- **Components :** Inspecter les Signals Preact
- **Profiler :** Identifier les re-renders excessifs
- **Network :** Vérifier que le worker renvoie les résultats

### Validation des Logs

```typescript
// Vérifier structure complète
const validateLog = (log: MatchLog) => {
  console.assert(log.time !== undefined, 'Missing time');
  console.assert(log.possessionTeamId !== undefined, 'Missing possession');
  console.assert(log.ballPosition, 'Missing ball position');
  console.assert(log.bag, 'Missing bag snapshot');
};
```

---

## 📝 Checklist de Test

Avant de merger une modification du moteur :

- [ ] Match se termine normalement (pas de boucle infinie)
- [ ] Score affiché = nombre de buts dans les logs
- [ ] Navigation temporelle fonctionne (avant/arrière/fin)
- [ ] Temps additionnel se met à jour correctement
- [ ] Possession visuelle = possessionTeamId dans logs
- [ ] Aucun token irréaliste (CROSS en défense, tir depuis milieu)
- [ ] Labels visibles sur toute la grille
- [ ] Stats cohérentes (xG, tirs, passes)
- [ ] Logs complets avec playerName sur événements clés
- [ ] Tracker appelé pour tous les types d'actions
