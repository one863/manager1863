# Architecture des Types de Domaine

## 📁 Structure

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

## 🎯 Comment importer

### ✅ NOUVEAU (Recommandé)
```typescript
// Import depuis le domaine spécifique
import type { Player, SeasonStats } from "@/core/domain/player/types";
import type { Team } from "@/core/domain/team/types";

// Ou import centralisé depuis l'index
import type { Player, Team, Match } from "@/core/domain";
```

### ⚠️ ANCIEN (Déprécié mais toujours fonctionnel)
```typescript
// Ne plus utiliser - passez à la syntaxe NOUVEAU ci-dessus
import type { Player, Team } from "@/core/types";
```

## 🔄 Types partagés

Les types utilisés partout se trouvent dans `/core/domain/common/types.ts`:

- `TacticType` → "NORMAL" | "POSSESSION" | "COUNTER" | ...
- `StrategyType` → "DEFENSIVE" | "BALANCED" | "OFFENSIVE"
- `StaffRole` → "COACH" | "PHYSICAL_TRAINER" | "VIDEO_ANALYST"
- `PlayerPosition` → "GK" | "DEF" | "MID" | "FWD"
- `PlayerSide` → "L" | "R" | "C"
- `Stats` → Interface commune pour les attributs (`technical`, `finishing`, etc)
- `BaseEntity` → Base pour tous les types avec `id` et `saveId`

## 📋 Checklist migration

Si tu mets à jour du code existant:

- [ ] Remplacer `import { ... } from "@/core/types"` par `import { ... } from "@/core/domain"`
- [ ] Vérifier les imports dans les services métier (`player-service.ts`, `team-service.ts`, etc)
- [ ] Tester la compilation TypeScript (`npm run build`)

## 🚀 Prochaines étapes

Phase suivante: **Zod schemas pour validation**
- Créer `{domaine}/schemas.ts` pour chaque domaine
- Exemple: `player/schemas.ts` → `PlayerSchema.parse(data)`
- Valider à la limite des services/APIs
