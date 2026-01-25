# Zod Validation & Schemas

## 📚 Structure

```
/src/core/domain/{domaine}/
├── types.ts       → Définitions TypeScript
└── schemas.ts     → Schémas Zod de validation
```

## 🎯 Comment utiliser

### Import des schemas

```typescript
// Import depuis le domaine spécifique
import { PlayerSchema, CreatePlayerSchema } from "@/core/domain/player/schemas";

// Ou depuis l'index centralisé
import { PlayerSchema, TeamSchema } from "@/core/domain";
```

### Validation de données

```typescript
import { PlayerSchema, type PlayerInput } from "@/core/domain";

// ✅ Valider une données complète
const playerData = {
	id: 1,
	saveId: 42,
	teamId: 10,
	firstName: "Kylian",
	lastName: "Mbappé",
	age: 25,
	// ... reste des attributs
};

try {
	const validPlayer = PlayerSchema.parse(playerData);
	// Le type est maintenant PlayerInput (= Player complet)
} catch (error) {
	console.error("Données invalides:", error.errors);
}
```

### Création sécurisée (sans ID)

```typescript
import { CreatePlayerSchema, type CreatePlayerInput } from "@/core/domain";

// ✅ Pour la création (sans id)
const newPlayer: CreatePlayerInput = {
	saveId: 42,
	teamId: 10,
	firstName: "Kylian",
	lastName: "Mbappé",
	// ... pas besoin de id
};

const validPlayer = CreatePlayerSchema.parse(newPlayer);
```

### Mise à jour partielle

```typescript
import { UpdatePlayerSchema, type UpdatePlayerInput } from "@/core/domain";

// ✅ Pour les updates (tous les champs optionnels)
const updates: UpdatePlayerInput = {
	energy: 95,
	morale: 100,
	// ... autres champs optionnels
};

const validUpdates = UpdatePlayerSchema.parse(updates);
```

## 📋 Tous les schemas disponibles

### Common
- `TacticTypeSchema`, `StrategyTypeSchema`
- `StaffRoleSchema`, `NewsCategorySchema`
- `PlayerPositionSchema`, `PlayerSideSchema`
- `StatsSchema`, `BaseEntitySchema`

### Player
- `PlayerSchema` → Joueur complet
- `SeasonStatsSchema` → Stats de saison
- `CreatePlayerSchema` → Création (sans ID)
- `UpdatePlayerSchema` → Update partiel

### Team
- `TeamSchema` → Équipe complète
- `TeamStatsSchema` → Stats de l'équipe
- `CreateTeamSchema`, `UpdateTeamSchema`

### Match
- `MatchSchema` → Match complet
- `MatchResultSchema` → Résultat détaillé
- `MatchEventSchema` → Événement du match
- `MatchStatsSchema` → Statistiques du match

### League
- `LeagueSchema`, `CreateLeagueSchema`, `UpdateLeagueSchema`

### Staff
- `StaffSchema`, `CreateStaffSchema`, `UpdateStaffSchema`

### News
- `NewsArticleSchema`, `CreateNewsArticleSchema`, `UpdateNewsArticleSchema`

### Game
- `GameStateDataSchema`, `CreateGameStateDataSchema`, `UpdateGameStateDataSchema`

## 🔒 Best Practices

### Toujours valider aux limites

```typescript
// ✅ BON: Validation au point d'entrée
export const createPlayer = async (data: unknown) => {
	const validData = CreatePlayerSchema.parse(data); // Lance ZodError si invalide
	await db.players.add(validData);
};

// ❌ MAUVAIS: Pas de validation
export const createPlayer = async (data: any) => {
	await db.players.add(data); // Pourrais accepter n'importe quoi
};
```

### Utiliser les types inférés

```typescript
import { type CreatePlayerInput } from "@/core/domain";

// Type-safe!
const newPlayer: CreatePlayerInput = {
	// TypeScript refusera un type invalide
};
```

### Gérer les erreurs Zod

```typescript
import { ZodError } from "zod";

try {
	const valid = PlayerSchema.parse(data);
} catch (error) {
	if (error instanceof ZodError) {
		error.errors.forEach((err) => {
			console.log(`${err.path.join(".")} → ${err.message}`);
		});
	}
}
```

## 🚀 Next steps

- [ ] Ajouter validation Zod aux services existants
- [ ] Créer une couche d'API avec validation automatique
- [ ] Ajouter des custom refinements pour les règles métier complexes
