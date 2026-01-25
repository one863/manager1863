# Architecture du moteur et des services

## 1. Découplage métier / persistance
- Les générateurs (players, teams, world, etc.) ne font que retourner des objets purs.
- La persistance (sauvegarde en DB, cloud, etc.) est gérée par des adapters (ports/adapters).
- Les services métiers orchestrent la logique en utilisant ces ports.

## 2. Ports & Adapters (Hexagonal)
- Les interfaces SavePort<T> et LoadPort<T> définissent les méthodes de persistance.
- Les adapters (ex : DexieAdapter) implémentent ces interfaces pour chaque backend (Dexie, REST, etc.).
- Les services métiers (EntityService<T>) utilisent ces ports pour manipuler les entités sans dépendre de l’infra.

## 3. Générateurs purs
- Ex : generateWorld() retourne { leagues, teams, players, staff } sans effet de bord.
- L’appelant décide où et comment sauvegarder.

## 4. Tests unitaires
- Les services et adapters sont testés avec des mocks (pas besoin de vraie DB).
- Les tests couvrent la création, la mise à jour, la récupération et la liste d’entités.

## 5. Exemple d’utilisation
```ts
import { DexieAdapter, EntityService } from "./core/services/entity-adapter-service";
import { db } from "./core/db/db";

const playerAdapter = new DexieAdapter(db.players);
const playerService = new EntityService(playerAdapter, playerAdapter);

const player = await playerService.createEntity({ firstName: "Zidane", ... });
```

## 6. Schéma simplifié

[ Générateur pur ] → [ Service métier ] → [ Port (interface) ] → [ Adapter (Dexie, REST, etc.) ] → [ DB ]

## 7. Avantages
- Testabilité, évolutivité, robustesse, portabilité.
- Facile à brancher sur d’autres backends ou à mocker pour les tests.

---

Pour toute nouvelle entité ou service, il suffit de :
- Définir l’interface (types, port)
- Créer l’adapter (Dexie, REST, etc.)
- Utiliser le service métier générique ou spécifique
- Ajouter des tests unitaires
