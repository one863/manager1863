# 🏟️ Consignes pour Gemini (IDX Project)

## 🤖 Comportement Général
- **Langue :** Français exclusivement.
- **Token-Save :** Gemini doit économiser le maximum de tokens dans ses Réponses qui doivent etre concises, avec des listes à puces. Pas de prose inutile.
- **Code :** Ne pas afficher de gros blocs de code dans le chat sauf demande explicite. Préférer l'application directe via `write_file`.


### 📝 Système de Logs & Narration
- **Dualité Flux :** Toujours différencier la narration utilisateur (Flux/Highlights) des logs techniques (Journal).
- **Journal de Debug :** Doit être **ULTRA COMPLET**. Chaque décision mathématique doit être tracée avec les tags :
    - `[DEBUG]` : Structure (Ticks, Possession, Changements de phase).
    - `[MATH]` : Détails Bradley-Terry, puissances de base vs finales, calculs xG.
    - `[AI]` : Décisions du CoachAI (changements tactiques, remplacements).
    - `[EVENT]` : Faits de jeu bruts (RNG, incidents).
    - `[STAT_END]` : Notes des joueurs, possession, passes, xg...
- **Filtrage UI :** Utiliser les balises techniques type `[#ID:POS]` dans les descriptions pour permettre au frontend de filtrer les données tout en gardant l'info dans les logs bruts.