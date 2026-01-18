# 02. Stack Technique

## Core Technologies
* **Framework UI :** Preact (Version avec `preact/compat`).
* **Langage :** TypeScript en mode `strict`.
* **Bundler :** Vite.js.
* **Style :** Tailwind CSS.

## Gestion d'État (State Management)
* **État Global (Store) :** Zustand (Gestion de l'argent, de la date, de la navigation et des modales).
* **État Réactif (Signaux) :** Preact Signals (`@preact/signals`) pour la gestion fine et performante des états locaux et des mises à jour fréquentes (ex: timer de match en direct, score, événements) sans re-rendus excessifs.

## Stockage & État (Persistance)
* **Base de Données (Persistance) :** Dexie.js (Wrapper IndexedDB).
    * **Sauvegardes :** Utilisation d'IndexedDB (table `backups`) pour stocker les backups JSON volumineux, évitant ainsi les limites de quota du LocalStorage.
    * **Nettoyage :** Routine automatique au démarrage pour nettoyer les anciens backups obsolètes du LocalStorage.
* **Export/Import :** Système complet d'export/import JSON pour les sauvegardes manuelles et le transfert entre appareils.

## Spécificités PWA & Mobile
* **Plugin :** `vite-plugin-pwa` (Stratégie `GenerateSW`).
* **Persistance OS :** Appel à `navigator.storage.persist()` pour sécuriser les données IndexedDB contre le nettoyage automatique du navigateur.
* **Wrapper :** Capacitor (pour d'éventuels builds .apk/.ipa).

## Système d'Avatars Procéduraux (SVG)
Le jeu utilise des avatars générés dynamiquement en SVG pour éviter le poids des assets graphiques.
* **Mécanique :** Composant `PlayerAvatar` utilisant un `dna` (ex: `"1-4-2-1-0"`).
* **DNA Parsing :** Décomposition du code pour définir :
    * Peau (Skins), Cheveux (Styles et Couleurs), Visage (Barbe/Rides), Genre.
* **Différenciation Staff/Joueur :**
    * **Staff :** Tenue de costume (Veste, chemise, cravate aux couleurs du club) et traits de vieillesse (rides).
    * **Joueurs :** Maillot de sport moderne aux couleurs du club et accessoires possibles (boucles d'oreilles, bandeaux).
* **Optimisation :** Utilisation de `memo` pour éviter les re-rendus inutiles dans les listes de joueurs (`SquadView`).

## Optimisation des Performances
* **Zéro Images :** Utilisation du code SVG `PlayerAvatar` et des icônes Lucide.
* **Web Workers :** Déportation des calculs de simulation de match.
* **Lazy Loading :** Chargement différé des composants "Musée" et "Historique".
