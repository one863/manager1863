# 🎮 Guide de Développement - Manager1863

## 📦 Structure du Projet

```
src/
├── core/                      # Logique métier et moteur
│   ├── domain/               # Types et interfaces métier
│   │   ├── player/          # Entités joueurs
│   │   ├── team/            # Entités équipes
│   │   ├── match/           # Types de match
│   │   └── league/          # Types de compétition
│   ├── engine/              # Moteur de simulation
│   │   ├── token-engine/   # Moteur basé sur tokens
│   │   │   ├── match-engine.ts        # Orchestration du match
│   │   │   ├── grid-engine.ts         # Construction des sacs
│   │   │   ├── stat-tracker.ts        # Tracking statistiques
│   │   │   ├── config/
│   │   │   │   ├── token-logic.ts     # Dictionnaire de logique
│   │   │   │   ├── zones-config.ts    # Config par zone
│   │   │   │   └── token-player.ts    # Tokens joueurs
│   │   │   └── types.ts               # Types du moteur
│   │   └── simulation.worker.ts       # Thread de simulation
│   ├── db/                  # Base de données Dexie
│   ├── services/            # Services métier
│   └── generators/          # Génération de données
├── competition/             # Vues de compétition
│   ├── match/              # Interface de match
│   │   ├── MatchLive.tsx           # Vue live du match
│   │   ├── MatchReport.tsx         # Rapport de match
│   │   └── components/             # Composants match
│   └── league/             # Interface de ligue
├── squad/                  # Gestion d'équipe
├── club/                   # Gestion du club
├── ui/                     # Composants UI réutilisables
└── infrastructure/         # Config, i18n, store
```

## 🔧 Technologies Clés

### Frontend
- **Preact** : Framework React-like léger
- **Preact Signals** : État réactif performant
- **Tailwind CSS** : Styling utility-first
- **Lucide Preact** : Icônes

### Data & State
- **Dexie.js** : Base de données IndexedDB
- **Zod** : Validation de schémas
- **Web Workers** : Simulation en arrière-plan

### Build & Dev
- **Vite** : Build tool moderne
- **TypeScript** : Typage statique
- **Capacitor** : Packaging iOS/Android (prévu)

## 🎯 Patterns de Code

### 1. Signals pour l'État Réactif

```typescript
import { useSignal, useComputed } from '@preact/signals';

// Signal simple
const count = useSignal(0);

// Computed (dérivé)
const doubled = useComputed(() => count.value * 2);

// Usage dans JSX
<div>{count.value}</div>
<button onClick={() => count.value++}>+1</button>
```

### 2. Services avec Dexie

```typescript
import { db } from '@/core/db/db';

// Lecture
const players = await db.players.where('teamId').equals(teamId).toArray();

// Création
await db.players.add({
  id: generateId(),
  name: 'Player',
  // ...
});

// Mise à jour
await db.players.update(playerId, { energy: 100 });

// Suppression
await db.players.delete(playerId);
```

### 3. Web Workers pour Simulation

```typescript
// Dans le composant
const worker = new Worker(new URL('../worker.ts', import.meta.url), { type: 'module' });

worker.postMessage({ type: 'SIMULATE', data: matchData });

worker.onmessage = (e) => {
  const result = e.data;
  // Traiter le résultat
};

// Dans le worker
self.onmessage = (e) => {
  const { type, data } = e.data;
  if (type === 'SIMULATE') {
    const result = runSimulation(data);
    self.postMessage(result);
  }
};
```

### 4. Validation Zod

```typescript
import { z } from 'zod';

const PlayerSchema = z.object({
  id: z.number(),
  name: z.string().min(1),
  overall: z.number().min(1).max(99),
  position: z.enum(['GK', 'DEF', 'MID', 'ATT'])
});

// Validation
const result = PlayerSchema.safeParse(data);
if (result.success) {
  const player = result.data; // Typé automatiquement
}
```

## 🏗️ Ajouter une Nouvelle Fonctionnalité

### Exemple : Ajouter un Type de Token

1. **Définir la logique** dans `token-logic.ts` :
```typescript
'NEW_TOKEN': (t, p, h, b) => ({
  moveX: h ? 1 : -1,
  moveY: 0,
  isGoal: false,
  isEvent: true,
  eventSubtype: 'CUSTOM',
  logMessage: `${p} fait quelque chose de nouveau !`,
  customDuration: 5,
  stats: { isCustom: true }
})
```

2. **Ajouter aux zones** dans `zones-config.ts` :
```typescript
export const ZONES_CONFIG = {
  // ...
  '2,2': { // Centre terrain
    tokens: [
      // ...
      { type: 'NEW_TOKEN', count: 2 }
    ]
  }
}
```

3. **Gérer le résultat** dans `match-engine.ts` si nécessaire :
```typescript
if (result.eventSubtype === 'CUSTOM') {
  // Logique spéciale
}
```

### Exemple : Ajouter une Vue

1. **Créer le composant** `src/feature/FeatureView.tsx` :
```tsx
import { useSignal } from '@preact/signals';

export default function FeatureView() {
  const data = useSignal([]);
  
  return (
    <div className="p-4">
      <h1 className="text-xl font-bold">Ma Feature</h1>
      {/* Contenu */}
    </div>
  );
}
```

2. **Ajouter la route** dans `app.tsx` :
```tsx
import FeatureView from './feature/FeatureView';

// Dans le router
<Route path="/feature" component={FeatureView} />
```

3. **Ajouter la navigation** :
```tsx
<Link href="/feature">Aller à Feature</Link>
```

## 🐛 Debugging

### DevTools React/Preact
- Installer [Preact DevTools](https://preactjs.github.io/preact-devtools/)
- Inspecter les Signals et composants
- Profiler les performances

### Console Logging Structuré
```typescript
// Grouper les logs
console.group('Match Simulation');
console.log('Home Team:', homeTeam);
console.log('Away Team:', awayTeam);
console.groupEnd();

// Tables pour les arrays
console.table(players);

// Timer
console.time('Simulation');
runSimulation();
console.timeEnd('Simulation');
```

### Dexie DevTools
```typescript
// Activer le debug Dexie
db.on('ready', () => {
  console.log('DB Ready:', db.tables.map(t => t.name));
});

// Logger toutes les queries
db.on('changes', (changes) => {
  console.log('DB Changes:', changes);
});
```

## 📝 Conventions de Code

### Nommage
- **Composants** : PascalCase (`MatchLive.tsx`)
- **Services** : kebab-case (`match-service.ts`)
- **Types** : PascalCase (`MatchResult`)
- **Variables** : camelCase (`currentTime`)
- **Constants** : UPPER_SNAKE_CASE (`MAX_PLAYERS`)

### Fichiers
- **1 composant = 1 fichier**
- **Types partagés** : `types.ts` dans le dossier concerné
- **Composants réutilisables** : `src/ui/components/`
- **Logique métier** : `src/core/`

### Imports
```typescript
// Ordre des imports
import { h } from 'preact';              // 1. Framework
import { useSignal } from '@preact/signals';  // 2. Libs
import { db } from '@/core/db/db';       // 3. Core
import { Player } from '@/core/domain';  // 4. Domain
import { Button } from '@/ui/components'; // 5. UI
import './styles.css';                   // 6. Styles
```

### TypeScript
```typescript
// Préférer les types aux interfaces pour les objets simples
type Player = {
  id: number;
  name: string;
};

// Interfaces pour les contrats et extensions
interface Scorer {
  playerId: number;
  minute: number;
}

// Éviter any, utiliser unknown si nécessaire
function process(data: unknown) {
  if (isPlayer(data)) {
    // data est maintenant de type Player
  }
}
```

## 🧪 Tests (À venir)

### Structure
```
src/
├── feature/
│   ├── component.tsx
│   └── component.test.tsx
```

### Example
```typescript
import { render } from '@testing-library/preact';
import Component from './component';

describe('Component', () => {
  it('renders correctly', () => {
    const { container } = render(<Component />);
    expect(container.textContent).toContain('Expected');
  });
});
```

## 🚀 Commandes Utiles

```bash
# Développement
npm run dev              # Serveur dev + hot reload
npm run build            # Build production
npm run preview          # Preview du build

# Type checking
npx tsc --noEmit        # Vérifier les erreurs TypeScript

# Linting
npm run lint            # ESLint (si configuré)

# Base de données
# Ouvrir IndexedDB dans DevTools > Application > Storage > IndexedDB
```

## 📚 Ressources

### Documentation Officielle
- [Preact](https://preactjs.com/)
- [Preact Signals](https://preactjs.com/guide/v10/signals/)
- [Dexie.js](https://dexie.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Vite](https://vitejs.dev/)

### Internes
- `docs/07_engine_details.md` - Détails du moteur de match
- `docs/09_debuggage_guide.md` - Guide de débogage
- `docs/03_schema_donnees.md` - Schéma de données
- `README_ARCHITECTURE.md` - Architecture globale

## 💡 Tips & Tricks

### Performance
1. **Utiliser Signals au lieu de useState** pour éviter les re-renders
2. **Mémoiser les computed coûteux** avec `useComputed`
3. **Web Workers** pour les calculs lourds (simulation)
4. **Lazy loading** des routes avec `lazy()` de preact-router

### Tailwind
```tsx
// Composition avec clsx/classnames
import clsx from 'clsx';

<div className={clsx(
  'base-class',
  isActive && 'active-class',
  isPending ? 'pending' : 'ready'
)} />

// Responsive
<div className="text-sm md:text-base lg:text-lg" />

// Dark mode (si configuré)
<div className="bg-white dark:bg-slate-900" />
```

### Dexie
```typescript
// Transactions
await db.transaction('rw', db.players, db.teams, async () => {
  await db.players.add(player);
  await db.teams.update(teamId, { playerCount: count + 1 });
});

// Bulk operations
await db.players.bulkAdd([player1, player2, player3]);
```

### Debugging Match Engine
```typescript
// Logger chaque token tiré
console.log('Token:', token.type, 'Position:', ballPos, 'Result:', result);

// Vérifier le sac
console.log('Bag composition:', 
  bag.reduce((acc, t) => {
    acc[t.type] = (acc[t.type] || 0) + 1;
    return acc;
  }, {})
);

// Timeline du match
logs.forEach(l => console.log(`${Math.floor(l.time/60)}'`, l.text));
```
