# 📋 Index de la Documentation - Manager1863

Bienvenue dans la documentation du projet Manager1863, un jeu de gestion de football créé avec Preact, Dexie et un moteur de match basé sur des tokens.

## 🗂️ Documents Disponibles

### Fondamentaux
1. **[00_consignes.md](./00_consignes.md)** - Instructions et règles de base du projet
2. **[01_vision_produit.md](./01_vision_produit.md)** - Vision et objectifs du produit
3. **[02_stack_technique.md](./02_stack_technique.md)** - Technologies utilisées et choix techniques

### Architecture & Données
4. **[03_schema_donnees.md](./03_schema_donnees.md)** - Schéma complet de la base de données Dexie
5. **[04_portrait_match_opta.md](./04_portrait_match_opta.md)** - Standards Opta et métriques de match
6. **[08_zod_validation.md](./08_zod_validation.md)** - Validation des schémas avec Zod

### Interface & Design
7. **[05_interface_design.md](./05_interface_design.md)** - Guide de design et composants UI

### Moteur de Match (Token Engine V2)
8. **[07_engine_details.md](./07_engine_details.md)** ⭐ **COMPLET**
   - Architecture du Token Engine
   - Système de grille 6×5
   - Logique des tokens et situations
   - Gestion de la possession
   - Calculs statistiques
   - Corrections récentes (Jan 2026)

9. **[09_debuggage_guide.md](./09_debuggage_guide.md)** ⭐ **NOUVEAU**
   - Symptômes fréquents et solutions
   - Match bloqué / boucle infinie
   - Score 0-0 persistant
   - Navigation temporelle
   - Possession incorrecte
   - Tokens irréalistes
   - Labels UI coupés
   - Outils de débogage

### Développement
10. **[10_dev_guide.md](./10_dev_guide.md)** ⭐ **NOUVEAU**
    - Structure du projet
    - Patterns de code (Signals, Dexie, Workers)
    - Ajouter une fonctionnalité
    - Conventions de code
    - Commandes utiles
    - Tips & tricks

### Roadmap
11. **[06_feuille_de_route.md](./06_feuille_de_route.md)** ⭐ **MAJ**
    - ✅ Phase 1 : Core Loop (TERMINÉ)
    - 🚧 Phase 2 : Polissage Moteur (EN COURS)
    - 📋 Phases 3-6 : Prochaines étapes
    - Backlog & idées futures

## 🎯 Guide de Démarrage Rapide

### Pour Comprendre le Projet
1. Lire [01_vision_produit.md](./01_vision_produit.md)
2. Parcourir [02_stack_technique.md](./02_stack_technique.md)
3. Consulter la structure dans [10_dev_guide.md](./10_dev_guide.md)

### Pour Développer
1. Installer les dépendances : `npm install`
2. Lancer le serveur dev : `npm run dev`
3. Lire [10_dev_guide.md](./10_dev_guide.md) pour les conventions
4. Consulter [07_engine_details.md](./07_engine_details.md) pour le moteur

### Pour Déboguer
1. Identifier le symptôme dans [09_debuggage_guide.md](./09_debuggage_guide.md)
2. Appliquer la solution proposée
3. Valider avec la checklist de test

## 🔥 Points d'Entrée du Code

### Moteur de Match
```
src/core/engine/token-engine/
├── match-engine.ts        # Orchestration principale
├── grid-engine.ts         # Construction des sacs de tokens
├── stat-tracker.ts        # Tracking stats Opta
└── config/
    ├── token-logic.ts     # Dictionnaire de logique (moveX, narration)
    ├── zones-config.ts    # Tokens disponibles par zone
    └── token-player.ts    # Génération tokens joueurs
```

### Interface Live Match
```
src/competition/match/
├── MatchLive.tsx          # Vue 2D temps réel
├── MatchReport.tsx        # Rapport post-match
└── components/
    ├── Scoreboard.tsx     # Score et temps
    ├── FieldView.tsx      # Grille 6×5
    └── Timeline.tsx       # Contrôles temporels
```

### Base de Données
```
src/core/db/
├── db.ts                  # Instance Dexie + tables
└── migrations/            # Migrations de schéma
```

## 📊 État Actuel du Projet (Jan 2026)

### ✅ Fonctionnalités Complètes
- Moteur de match basé tokens avec grille 6×5
- Simulation en Web Worker
- Interface live 2D avec timeline navigable
- Tracking possession réelle vs exécutant
- Calcul dynamique des scores
- Navigation temporelle (avant/arrière)
- Temps additionnel dynamique
- Filtrage spatial des tokens (CLEARANCE, CROSS, tirs)
- Logs complets avec stats Opta

### 🚧 En Cours
- Enrichissement de la narration
- Cartons et fautes avec suspensions
- Rapport de match détaillé
- Système de momentum

### 📋 À Venir
- Calendrier de saison
- Classement live
- Gestion d'équipe (titulaires, tactiques)
- Infrastructures du club
- Académie de jeunes

## 🐛 Bugs Connus Résolus

| Bug | Statut | Document |
|-----|--------|----------|
| Boucle infinie GK | ✅ Résolu | [09_debuggage_guide.md](./09_debuggage_guide.md) |
| Score 0-0 systématique | ✅ Résolu | [09_debuggage_guide.md](./09_debuggage_guide.md) |
| Navigation bloquée fin match | ✅ Résolu | [09_debuggage_guide.md](./09_debuggage_guide.md) |
| Possession visuelle incorrecte | ✅ Résolu | [09_debuggage_guide.md](./09_debuggage_guide.md) |
| CROSS depuis défense | ✅ Résolu | [09_debuggage_guide.md](./09_debuggage_guide.md) |
| Labels UI coupés | ✅ Résolu | [09_debuggage_guide.md](./09_debuggage_guide.md) |

## 🤝 Contribution

### Ajouter une Fonctionnalité
1. Consulter la roadmap dans [06_feuille_de_route.md](./06_feuille_de_route.md)
2. Suivre les patterns dans [10_dev_guide.md](./10_dev_guide.md)
3. Tester avec la checklist de [09_debuggage_guide.md](./09_debuggage_guide.md)
4. Mettre à jour la documentation si nécessaire

### Corriger un Bug
1. Identifier dans [09_debuggage_guide.md](./09_debuggage_guide.md)
2. Appliquer la solution
3. Ajouter un test de régression
4. Documenter la correction

## 📚 Ressources Externes

- [Preact Documentation](https://preactjs.com/)
- [Dexie.js Guide](https://dexie.org/docs/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Vite Guide](https://vitejs.dev/guide/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

## 📞 Contact & Support

Pour toute question ou problème :
1. Consulter d'abord la documentation appropriée
2. Vérifier les bugs connus dans [09_debuggage_guide.md](./09_debuggage_guide.md)
3. Ouvrir une issue avec détails et logs

---

**Dernière mise à jour :** Janvier 2026  
**Version moteur :** Token Engine V2.1  
**Status :** Phase 2 - Polissage en cours
