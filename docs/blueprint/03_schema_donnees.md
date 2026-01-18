# 03. Schéma des Données (Dexie.js)

Ce document détaille la structure de la base de données `Manager1863DB`. L'architecture est conçue pour supporter plusieurs emplacements de sauvegarde (`SaveSlot`) et une indexation performante via des clés composées.

## 1. Gestion des Sauvegardes
* **Table `saveSlots`** : Répertorie les parties créées.
    * `++id` (PK), `managerName`, `teamName`, `lastPlayedDate`, `day`, `season`.
* **Table `gameState`** : Stocke l'état réactif global lié à une sauvegarde spécifique.
    * `++id`, `saveId` (FK), et les données du moteur de jeu (`GameStateData`).
* **Table `backups`** : Stocke les sauvegardes automatiques volumineuses.
    * `++id`, `saveId`, `timestamp`, `data` (JSON string).
    * **Note :** Cette table remplace le stockage dans le `localStorage` pour éviter les erreurs de quota.

## 2. Structure Sportive & Ligue
* **Table `leagues`** : Définit les championnats.
    * `++id`, `saveId`.
* **Table `teams`** : Tous les clubs de la base.
    * `++id`, `saveId`, `leagueId` (Indexé).
* **Table `players`** : L'ensemble des athlètes.
    * `++id`, `saveId`, `teamId` (Indexé), `isStarter`.
    * **Index Composé :** `[saveId+teamId]` (Optimisé pour charger l'effectif d'un club).
    * *Attributs clés :* `dna` (pour l'avatar), `rating`, `potential`, `isInjured`.

## 3. Personnel & Staff Technique
* **Table `staff`** : Membres rattachés au club ou libres.
    * `++id`, `saveId`, `teamId`, `dna` (isStaff flag), `stats`.
    * **Stats détaillées :** `management`, `training`, `tactical`, `physical`, `goalkeeping`.

## 4. Moteur de Match & Vie du Club
* **Table `matches`** : Calendrier et résultats.
    * `++id`, `saveId`, `leagueId`, `day`, `played`.
    * **Index Composé :** `[saveId+day]` (Chargement rapide des matchs du jour).
* **Table `news`** : Flux d'informations et narration.
    * `++id`, `saveId`, `day`.
* **Table `history`** : Archives, palmarès et événements marquants du club unique.

## 5. Intégrité & Versions
* **Version actuelle :** `15`.
* **Vérification :** Utilisation de `verifySaveIntegrity(saveId)` pour valider l'existence du `gameState` avant le chargement d'une partie.
* **Sécurité :** `computeSaveHash` permet de garantir la stabilité des données de sauvegarde.
