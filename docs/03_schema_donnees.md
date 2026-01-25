
# 03. Schéma des Données (Dexie.js)

Ce document détaille la structure de la base de données `Manager1863DB`. L'architecture est conçue pour supporter plusieurs emplacements de sauvegarde (`SaveSlot`) et une indexation performante via des clés composées.

## 1. Gestion des Sauvegardes
* **Table `saveSlots`** : Répertorie les parties créées.
    * `++id` (PK), `managerName`, `teamName`, `lastPlayedDate`, `day`, `season`.
* **Table `gameState`** : Stocke l'état réactif global lié à une sauvegarde spécifique.
    * `++id`, `saveId` (FK), et les données du moteur de jeu (`GameStateData`).
* **Table `backups`** : Stocke les sauvegardes automatiques volumineuses.
    * `++id`, `saveId`, `timestamp`, `data` (JSON string).
    * **Note :** Cette table remplace le stockage dans le `localStorage` pour éviter les erreurs de quota.

## 2. Structure Sportive & Ligue
* **Table `leagues`** : Définit les championnats.
    * `++id`, `saveId`.
* **Table `teams`** : Tous les clubs de la base.
    * `++id`, `saveId`, `leagueId` (Indexé).
* **Table `players`** : L'ensemble des athlètes.
    * `++id`, `saveId`, `teamId` (Indexé), `isStarter`.
    * **Index Composé :** `[saveId+teamId]` (Optimisé pour charger l'effectif d'un club).
    * *Attributs clés :* `dna` (pour l'avatar), `rating`, `potential`, `isInjured`.

## 3. Personnel & Staff Technique
* **Table `staff`** : Membres rattachés au club ou libres.
    * `++id`, `saveId`, `teamId`, `dna` (isStaff flag), `stats`.
    * **Stats détaillées :** `management`, `training`, `tactical`, `physical`, `goalkeeping`.

## 4. Moteur de Match & Vie du Club
* **Table `matches`** : Calendrier et résultats.
    * `++id`, `saveId`, `leagueId`, `day`, `played`.
    * **Index Composé :** `[saveId+day]` (Chargement rapide des matchs du jour).
* **Table `news`** : Flux d'informations et narration.
    * `++id`, `saveId`, `day`.
* **Table `history`** : Archives, palmarès et événements marquants du club unique.

## 5. Intégrité & Versions
* **Version actuelle :** `15`.
* **Vérification :** Utilisation de `verifySaveIntegrity(saveId)` pour valider l'existence du `gameState` avant le chargement d'une partie.
* **Sécurité :** `computeSaveHash` permet de garantir la stabilité des données de sauvegarde.

---

## 📁 Types de Domaine & Migration

```
/src/core/domain/
├── common/types.ts       → Types partagés et énums
├── player/types.ts       → Entité Player
├── team/types.ts         → Entité Team
├── match/types.ts        → Entités Match, MatchResult, MatchEvent
├── league/types.ts       → Entité League
├── staff/types.ts        → Entité Staff
├── news/types.ts         → Entité NewsArticle
├── game/types.ts         → Entité GameStateData
└── index.ts              → Exports centralisés
```

### ✅ Comment importer

```typescript
// Import depuis le domaine spécifique
import type { Player, SeasonStats } from "@/core/domain/player/types";
import type { Team } from "@/core/domain/team/types";

// Ou import centralisé depuis l'index
import type { Player, Team, Match } from "@/core/domain";
```

### ⚠️ Ancien (Déprécié mais toujours fonctionnel)

```typescript
// Ne plus utiliser - passez à la syntaxe NOUVEAU ci-dessus
import type { Player, Team } from "@/core/types";
```

### 🔄 Types partagés

Les types utilisés partout se trouvent dans `/core/domain/common/types.ts`:

- `TacticType` → "NORMAL" | "POSSESSION" | "COUNTER" | ...
- `StrategyType` → "DEFENSIVE" | "BALANCED" | "OFFENSIVE"
- `StaffRole` → "COACH" | "PHYSICAL_TRAINER" | "VIDEO_ANALYST"
- `PlayerPosition` → "GK" | "DEF" | "MID" | "FWD"
- `PlayerSide` → "L" | "R" | "C"
- `Stats` → Interface commune pour les attributs (`technical`, `finishing`, etc)
- `BaseEntity` → Base pour tous les types avec `id` et `saveId`

### 📋 Checklist migration

Si tu mets à jour du code existant:

- [ ] Remplacer `import { ... } from "@/core/types"` par `import { ... } from "@/core/domain"`
- [ ] Vérifier les imports dans les services métier (`player-service.ts`, `team-service.ts`, etc)
- [ ] Tester la compilation TypeScript (`npm run build`)

### 🚀 Prochaines étapes

Phase suivante: **Zod schemas pour validation**
- Créer `{domaine}/schemas.ts` pour chaque domaine
- Exemple: `player/schemas.ts` → `PlayerSchema.parse(data)`
- Valider à la limite des services/APIs
