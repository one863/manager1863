# 06. Feuille de Route (Roadmap)

Cette roadmap définit les étapes de développement pour passer du socle technique actuel (DB & Types) à une version jouable et immersive.

## Phase 1 : Consolidation & Core Loop (Sprint 1-2)
*Objectif : Faire tourner le temps et simuler l'existence du club.*
* [ ] **Intégration du Match Engine :** Implémentation du service de calcul des scores (Phase 1 : Probabilités pures).
* [ ] **Boucle de Journée :** Finalisation du bouton "Advance Day" avec déclenchement des salaires le dimanche et mise à jour de l'énergie.
* [ ] **Gestion des Sauvegardes :** UI pour créer, charger et supprimer les slots (basée sur `saveSlots` et `verifySaveIntegrity`).
* [ ] **Système de News Basique :** Génération automatique d'articles lors des matchs et blessures.

## Phase 2 : Identité Visuelle & UX (Sprint 3-4)
*Objectif : Rendre l'interface "Blanc & Gris" fonctionnelle et élégante.*
* [ ] **Layout PWA :** Mise en place du Shell avec Bottom Navigation et zones de contenu scrollables.
* [ ] **Composants Joueurs :** Implémentation de la `PlayerCard` avec intégration complète du `PlayerAvatar` (DNA).
* [ ] **Vues Tactiques :** Interface de sélection des titulaires (`isStarter`) avec feedback visuel sur la puissance de l'équipe.
* [ ] **Système de Bottom Sheets :** Mise en place des tiroirs pour les détails des joueurs et du staff.

## Phase 3 : Le "One Club Man" & Infrastructures (Sprint 5-6)
*Objectif : Donner au joueur des raisons de rester dans son club.*
* [ ] **Menu Club :** Système d'amélioration des infrastructures (Stadium, Medical, Training).
* [ ] **Gestion du Staff :** Recrutement et impact réel des `StaffStats` sur la progression des joueurs.
* [ ] **Système de Fidélité :** Implémentation du bonus `loyalty` qui booste les stats après X jours au club.
* [ ] **Le Musée (History) :** Première version de la table history pour archiver les montées en division et les titres.

## Phase 4 : Polissage & PWA (Sprint 7-8)
*Objectif : Performance et déploiement.*
* [ ] **Optimisation Dexie :** Audit des index pour assurer la fluidité même après 20 saisons de données.
* [ ] **Service Worker Avancé :** Configuration du cache pour le mode offline complet et prompt de mise à jour.
* [ ] **Audit de Persistance :** Validation du `navigator.storage.persist()` sur iOS et Android.
* [ ] **Export de Sauvegarde :** Fonctionnalité de téléchargement du JSON de la DB pour sécuriser la progression.

## Prochaines étapes de réflexion (V2)
* Système d'académie de jeunes plus profond.
* Interaction avec la presse plus poussée (Impact du moral).
* Mode "Legacy" : Voir son stade évoluer visuellement selon sa capacité.