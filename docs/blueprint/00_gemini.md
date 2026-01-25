# 🏟️ Consignes pour Gemini (IDX Project)
- **Langue :** Parle moi en Français exclusivement dans le chat.
- **Token-Save :** Gemini doit économiser le maximum de tokens dans ses Réponses qui doivent etre concises, avec des listes à puces. Pas de prose inutile.
- **Code :** Ne pas afficher de gros blocs de code dans le chat. Préférer l'application directe via `write_file`.
- **Initiatives :** Ne prend pas d'initiatives sauf pour corriger les bugs. Si c'est une évolution, demande moi d'abord.
- **Dossiers :** Voici les dossiers importants à connaitre. : 
- Dossier du moteur de match src/core/engine/token-engine
- Affichage du live : src/competition/match/MatchLive.tsx
- **Modification :** N'ouvre pas les fichiers dans l'éditeur quand tu modifies.

## ⚙️ Architecture du Moteur (Token Engine)
- **`match-engine.ts` (Le Cerveau Stupide) :** Il ne fait qu'avancer le temps et piocher le premier token du sac. Il délègue toute l'intelligence.
- **`grid-engine.ts` (L'Intelligence Spatiale) :** Décide quels tokens sont mis dans le sac selon la position et la situation (ex: probabilités de but, filtrage des tirs trop lointains).
- **`token-logic.ts` (Les Lois Physiques) :** Définit les conséquences d'un token pioché (déplacement X/Y, changement de possession, passage à une nouvelle situation comme `CORNER` ou `REBOUND_ZONE`).
- **`types.ts` :** Contient les définitions des types, dont `TokenExecutionResult` qui pilote les transitions via `nextSituation`.
