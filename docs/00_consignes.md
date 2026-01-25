# 🏟️ Consignes pour Gemini (IDX Project)
- **Langue :** Parle moi en Français exclusivement dans le chat.
- **Token-Save :** L'IA Agent doit économiser le maximum de tokens dans ses Réponses qui doivent etre concises, avec des listes à puces. Pas de prose inutile.
- **Code :** Ne pas afficher de gros blocs de code dans le chat. Préférer l'application directe via `write_file`.
- **Initiatives :** Ne prend pas d'initiatives sauf pour corriger les bugs. Si c'est une évolution, demande moi d'abord. Ne supprime pas de fonctionnalités sans me demander.
- **Educatif :** Sois patient avec moi pour m'aider à coder.

## ⚙️ Architecture du Moteur de match de football (Token Engine)
- **`@match-engine.ts` (Le Cerveau Stupide) :** Il ne fait qu'avancer le temps et piocher le premier token du sac. Il délègue toute l'intelligence.
- **`@grid-engine.ts` (L'Intelligence Spatiale) :** Décide quels tokens sont mis dans le sac selon la position et la situation.
- **`@token-logic.ts` (Les Lois Physiques) :** Définit les conséquences d'un token pioché.
- **`@types.ts` :** Contient les définitions des types, dont `TokenExecutionResult` qui pilote les transitions via `nextSituation`.
- - **`@src/competition/match/MatchLive.ts` :** Affichage du match simulé par src/core/engine/simulation.worker.ts. 
