# Système de Sauvegarde

## Vue d'ensemble

Le système de sauvegarde utilise **IndexedDB** via la librairie **Dexie**. Les données sont stockées localement dans le navigateur et persistent entre les sessions.

## Tables de la base de données

| Table | Description | Clés |
|-------|-------------|------|
| `saveSlots` | Métadonnées des sauvegardes | `id`, `lastPlayedDate` |
| `gameState` | État du jeu (jour, saison, équipe) | `id`, `saveId` |
| `leagues` | Ligues et classements | `id`, `saveId` |
| `teams` | Équipes et statistiques | `id`, `saveId`, `leagueId` |
| `players` | Joueurs et attributs | `id`, `saveId`, `teamId` |
| `staff` | Personnel technique | `id`, `saveId`, `teamId` |
| `matches` | Résultats des matchs | `id`, `saveId`, `leagueId`, `day` |
| `news` | Articles de news | `id`, `saveId`, `day` |
| `history` | Historique du club | `id`, `saveId`, `teamId` |
| `backups` | Sauvegardes automatiques | `id`, `saveId`, `timestamp` |
| `matchLogs` | Logs de match temporaires | `id`, `saveId`, `matchId` |

## Optimisations de taille

### Matchs sauvegardés (tous les matchs)

Seules les données essentielles sont persistées :

```typescript
{
  matchId, homeTeamId, awayTeamId,
  homeScore, awayScore,
  stats,           // Possession, tirs, corners, etc.
  scorers,         // Liste des buteurs
  ratings,         // Notes des joueurs
  stoppageTime,
  events: [],      // ❌ Non stockés
  debugLogs: [],   // ❌ Non stockés
  ballHistory: []  // ❌ Non stocké
}
```

### Match Live (table séparée `matchLogs`)

Les logs complets sont stockés dans une **table séparée** `matchLogs` pendant le match, puis **supprimés automatiquement** à la sortie :

```typescript
// Table matchLogs (temporaire pendant le match)
interface MatchLogsEntry {
    saveId: number;
    matchId: number;
    debugLogs: any[];      // Logs complets avec bag, drawnToken
    events: any[];         // Événements formatés
    ballHistory: number[]; // Historique du ballon
}
```

| Donnée | Mémoire | Table `matchLogs` | Table `gameState` |
|--------|---------|-------------------|-------------------|
| `debugLogs` | ✅ Complet | ✅ Complet | ❌ Exclu |
| `events` | ✅ Complet | ✅ Complet | ❌ Exclu |
| `ballHistory` | ✅ Complet | ✅ Complet | ❌ Exclu |
| `stats` | ✅ | ❌ | ✅ |
| `ratings` | ✅ | ❌ | ✅ |
| `scorers` | ✅ | ❌ | ✅ |

**Workflow :**
1. Début match → Logs sauvés dans `matchLogs` (table séparée)
2. Pendant le match → Logs disponibles pour replay/debug
3. Fin match (`clearLiveMatch`) → `matchLogs` **SUPPRIMÉS**

### News

- Maximum **30 news** conservées
- Nettoyage automatique tous les **7 jours**
- Les plus anciennes sont supprimées en premier

### Nettoyage périodique

Exécuté tous les 7 jours de jeu :

```typescript
// gameSlice.ts - advanceDate()
if (day % 7 === 0) {
    await NewsService.cleanupOldNews(currentSaveId, season);
    await MatchService.cleanupOldUserMatchLogs(currentSaveId, userTeamId, day);
}
```

## Flux de sauvegarde d'un match

```
┌─────────────────────────────────────────────────────────────┐
│                    SIMULATION (Worker)                       │
│  Génère result complet avec debugLogs, events, ballHistory  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────┴─────────────────────┐
        ▼                                           ▼
┌───────────────────────┐               ┌───────────────────────┐
│  Table `matchLogs`    │               │ Table `gameState`     │
│  (temporaire)         │               │ liveMatch (allégé)    │
│  - debugLogs complets │               │ - scores, stats       │
│  - events complets    │               │ - ratings, scorers    │
│  - ballHistory        │               │ - PAS de logs         │
└───────────────────────┘               └───────────────────────┘
        │                                           │
        ▼ (fin du match)                            ▼
┌───────────────────────┐               ┌───────────────────────┐
│  SUPPRIMÉ             │               │ saveMatchResult()     │
│  (clearLiveMatch)     │               │ Persist scores/stats  │
└───────────────────────┘               └───────────────────────┘
```

## Export / Import

### Export

```typescript
// export-system.ts
const exportData = {
  version: CURRENT_DATA_VERSION,
  exportedAt: new Date().toISOString(),
  saveSlot: { ... },
  gameState: { ... },
  leagues: [...],
  teams: [...],
  players: [...],
  staff: [...],
  matches: [...],  // Données allégées
  news: [...],
  history: [...]
};
```

Format : JSON téléchargé en fichier `.json`

### Import

1. Parse du fichier JSON
2. Validation de la version
3. Insertion dans les tables IndexedDB
4. Création d'un nouveau `saveSlot`

## Estimation de taille

| Durée de jeu | Taille estimée |
|--------------|----------------|
| 1 semaine | ~50 Ko |
| 1 mois | ~200 Ko |
| 1 saison | ~500 Ko |
| Multi-saisons | < 2 Mo |

## Fichiers concernés

- [db.ts](../src/core/db/db.ts) - Définition des tables Dexie
- [export-system.ts](../src/core/db/export-system.ts) - Export/Import
- [match-service.ts](../src/competition/match/match-service.ts) - `saveMatchResult()`
- [liveMatchStore.ts](../src/infrastructure/store/liveMatchStore.ts) - Gestion match live
- [gameSlice.ts](../src/infrastructure/store/gameSlice.ts) - Nettoyage périodique
- [news-service.ts](../src/news/service/news-service.ts) - `cleanupOldNews()`
