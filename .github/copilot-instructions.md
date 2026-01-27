# 🤖 Copilot Instructions for 1863 Football Manager

## 🏗️ Architecture & Structure
- **src/core/**: Moteur métier, simulation, génération de données, accès DB (Dexie), services, validation (Zod).
- **src/competition/**, **src/club/**, **src/squad/**: Vues principales (match, club, équipe) et leurs composants.
- **src/ui/**: Composants UI réutilisables (voir aussi `docs/05_interface_design.md`).
- **Simulation**: Utilise un Web Worker (`simulation.worker.ts`) pour la simulation de matchs, orchestrée par le moteur à tokens (`engine/token-engine/`).
- **State**: Zustand pour le store global, Signals pour l’état local réactif.

## ⚙️ Patterns & Conventions
- **Services**: Toute logique métier (match, transfert, backup, etc.) doit passer par un service dédié dans `core/services/`.
- **Dexie.js**: Accès DB via `core/db/db.ts` (voir exemples dans `docs/10_dev_guide.md`).
- **Validation**: Utiliser Zod pour tous les schémas de données critiques (`core/validation/`).
- **Web Workers**: Les calculs lourds (simulation) ne doivent jamais bloquer l’UI.
- **Procédural**: Génération du monde, des joueurs, des ligues via les générateurs dans `core/generators/`.
- **UI**: Respecter le style rétro (voir Tailwind, Lucide, et `docs/05_interface_design.md`).

## 🛠️ Workflows Développeur
- **Démarrage**: `npm install` puis `npm run dev` (ou tâche VS Code "Démarrer Vite").
- **Build**: `npm run build`.
- **Tests**: (À compléter si tests automatisés présents)
- **Debug**: Voir `docs/09_debuggage_guide.md` pour les bugs de simulation (boucles, scores, etc.).
- **Ajout de fonctionnalité**: Suivre les patterns de service, validation, et UI décrits ci-dessus.

## 🔗 Références clés
- **docs/10_dev_guide.md** : Guide complet pour développeurs (structure, patterns, commandes)
- **docs/07_engine_details.md** : Architecture du moteur de match
- **docs/09_debuggage_guide.md** : Débogage simulation
- **docs/05_interface_design.md** : Design UI
- **core/services/** : Logique métier
- **core/db/db.ts** : Accès base Dexie

## 🧭 Conseils spécifiques
- Toujours séparer la logique métier (service) de la vue (component).
- Pour toute nouvelle entité, ajouter le schéma Zod correspondant.
- Pour la simulation, vérifier les transitions de situation (voir `token-logic.ts`).
- Utiliser les workers pour tout calcul potentiellement long.
- Respecter la structure des dossiers pour la maintenabilité.

---
Pour toute question d’architecture ou de workflow, consulter d’abord les fichiers de la documentation dans `docs/`.
