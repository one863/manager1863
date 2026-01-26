# 06. Feuille de Route (Roadmap)

Cette roadmap définit les étapes de développement pour passer du socle technique actuel à une version jouable et immersive.

## ✅ Phase 1 : Consolidation & Core Loop (TERMINÉ)
*Objectif : Faire tourner le temps et simuler l'existence du club.*
* [x] **Intégration du Match Engine :** Token Engine V2 opérationnel avec grille 6×5.
* [x] **Simulation de Match :** Worker thread, logs complets, stats Opta.
* [x] **Interface Live Match :** Vue 2D temps réel, timeline navigable, scoreboard dynamique.
* [x] **Système de Possession :** Tracking précis avec `possessionTeamId` séparé de `teamId`.
* [x] **Gestion des Situations :** GOAL_KICK, CORNER, PENALTY, REBOUND_ZONE.
* [x] **Filtrage Spatial :** CLEARANCE/CROSS/tirs selon zones réalistes.

## 🚧 Phase 2 : Polissage du Moteur (EN COURS)
*Objectif : Affiner le réalisme et la jouabilité.*
* [x] **Équilibrage des Buts :** Correction boucle infinie GK, tracking des buts, calcul dynamique scores.
* [x] **Navigation Temporelle :** Retour en arrière fonctionnel, temps additionnel dynamique.
* [x] **Possession Visuelle :** Couleur du ballon = possession réelle.
* [ ] **Narration Enrichie :** Plus de variété dans les commentaires (noms d'actions, adjectifs).
* [ ] **Système de Momentum :** Impact des buts sur moral et quality des tokens suivants.
* [ ] **Cartons et Fautes :** Implémentation complète avec impact sur disponibilité joueurs.
* [ ] **Blessures en Match :** Détection et gestion des blessures pendant le match.

## 📋 Phase 3 : Identité Visuelle & UX (À VENIR)
*Objectif : Rendre l'interface "Blanc & Gris" fonctionnelle et élégante.*
* [ ] **Layout PWA :** Mise en place du Shell avec Bottom Navigation et zones de contenu scrollables.
* [ ] **Composants Joueurs :** Implémentation de la `PlayerCard` avec intégration complète du `PlayerAvatar` (DNA).
* [ ] **Vues Tactiques :** Interface de sélection des titulaires (`isStarter`) avec feedback visuel sur la puissance de l'équipe.
* [ ] **Système de Bottom Sheets :** Mise en place des tiroirs pour les détails des joueurs et du staff.
* [ ] **Animations de Transition :** Smooth scrolling, fade in/out, micro-interactions.

## 🏆 Phase 4 : Le "One Club Man" & Infrastructures (À VENIR)
*Objectif : Donner au joueur des raisons de rester dans son club.*
* [ ] **Menu Club :** Système d'amélioration des infrastructures (Stadium, Medical, Training).
* [ ] **Gestion du Staff :** Recrutement et impact réel des `StaffStats` sur la progression des joueurs.
* [ ] **Système de Fidélité :** Implémentation du bonus `loyalty` qui booste les stats après X jours au club.
* [ ] **Le Musée (History) :** Première version de la table history pour archiver les montées en division et les titres.
* [ ] **Académie de Jeunes :** Génération et progression des jeunes joueurs.

## 📱 Phase 5 : Boucle de Journée & Calendrier (À VENIR)
*Objectif : Faire vivre le club au quotidien.*
* [ ] **Advance Day :** Finalisation du bouton avec déclenchement des salaires le dimanche et mise à jour de l'énergie.
* [ ] **Gestion des Sauvegardes :** UI pour créer, charger et supprimer les slots (basée sur `saveSlots` et `verifySaveIntegrity`).
* [ ] **Système de News Basique :** Génération automatique d'articles lors des matchs et blessures.
* [ ] **Calendrier Visuel :** Vue mensuelle/hebdomadaire avec prochains matchs et événements.
* [ ] **Repos et Récupération :** Gestion de la fatigue et du moral entre les matchs.

## 🚀 Phase 6 : Polissage & PWA (À VENIR)
*Objectif : Performance et déploiement.*
* [ ] **Optimisation Dexie :** Audit des index pour assurer la fluidité même après 20 saisons de données.
* [ ] **Service Worker Avancé :** Configuration du cache pour le mode offline complet et prompt de mise à jour.
* [ ] **Audit de Persistance :** Validation du `navigator.storage.persist()` sur iOS et Android.
* [ ] **Export de Sauvegarde :** Fonctionnalité de téléchargement du JSON de la DB pour sécuriser la progression.
* [ ] **Tests E2E :** Suite de tests automatisés pour valider les scénarios critiques.
* [ ] **Déploiement Production :** CI/CD, monitoring, analytics.

## 💡 Backlog & Idées Futures
* Système d'académie de jeunes plus profond avec scouting régional.
* Interaction avec la presse plus poussée (Impact du moral et de la réputation).
* Mode "Legacy" : Voir son stade évoluer visuellement selon sa capacité.
* Rivalités entre clubs avec bonus/malus selon l'adversaire.
* Mercato dynamique avec IA de négociation.
* Multi-club : Gérer plusieurs équipes simultanément.
* Mode Challenge : Scénarios prédéfinis (sauver un club de la relégation, etc.).

## 🎯 Objectifs Court Terme (Prochaines Itérations)

### Sprint en cours
1. **Affiner narration** : Varier les commentaires, ajouter contexte (minute, importance).
2. **Cartons/Fautes** : Implémenter accumulation et suspensions.
3. **Rapport de Match** : Page récapitulative avec stats détaillées et notes.

### Sprint suivant
1. **Calendrier League** : Génération de la saison complète avec dates.
2. **Classement Live** : Tableau actualisé après chaque match.
3. **Gestion d'Équipe Basique** : Sélection titulaires, changements tactiques.

---

**Note :** Cette roadmap est vivante et s'adapte selon les retours utilisateurs et les découvertes techniques. Les priorités peuvent être réorganisées pour maximiser la valeur et la jouabilité.
