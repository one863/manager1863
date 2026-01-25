# Zod Validation & Intégration Services

## 📚 Structure

```
/src/core/domain/{domaine}/
├── types.ts       → Définitions TypeScript
└── schemas.ts     → Schémas Zod de validation
```

## ✅ Comment utiliser

### Import des schemas
```typescript
import { PlayerSchema, CreatePlayerSchema } from "@/core/domain/player/schemas";
// Ou depuis l'index centralisé
import { PlayerSchema, TeamSchema } from "@/core/domain";
```

### Validation de données
```typescript
import { PlayerSchema, type PlayerInput } from "@/core/domain";
const validPlayer = PlayerSchema.parse(playerData);
```

### Création sécurisée (sans ID)
```typescript
import { CreatePlayerSchema, type CreatePlayerInput } from "@/core/domain";
const validPlayer = CreatePlayerSchema.parse(newPlayer);
```

### Mise à jour partielle
```typescript
import { UpdatePlayerSchema, type UpdatePlayerInput } from "@/core/domain";
const validUpdates = UpdatePlayerSchema.parse(updates);
```

## 🧩 Tous les schemas disponibles
- Common : TacticTypeSchema, StaffRoleSchema, etc.
- Player : PlayerSchema, SeasonStatsSchema, Create/UpdatePlayerSchema
- Team : TeamSchema, TeamStatsSchema, Create/UpdateTeamSchema
- Match : MatchSchema, MatchResultSchema, MatchEventSchema, MatchStatsSchema
- League : LeagueSchema, Create/UpdateLeagueSchema
- Staff : StaffSchema, Create/UpdateStaffSchema
- News : NewsArticleSchema, Create/UpdateNewsArticleSchema
- Game : GameStateDataSchema, Create/UpdateGameStateDataSchema

## 🛡️ Best Practices
- Toujours valider aux limites (entrée service/API)
- Utiliser les types inférés pour le type-safety
- Gérer les erreurs Zod (ZodError)

## 🛠️ Utilitaires & Pattern Service
```typescript
import { UpdatePlayerSchema } from "@/core/domain";
import { validateOrThrow } from "@/core/validation/zod-utils";
const playerUpdate = validateOrThrow(UpdatePlayerSchema, { energy: 95 }, "MyService.updatePlayer");
await db.players.update(playerId, playerUpdate);
```

## 🚀 Avantages
- Validation stricte, typage fort, erreurs claires, scalable, maintenance facile

## 🚦 Next steps
- Ajouter validation Zod à tous les services
- Créer une couche d'API avec validation automatique
- Ajouter des custom refinements pour les règles métier complexes
- Transaction wrappers, audit logging
