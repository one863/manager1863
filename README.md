# ⚽ Manager 1863 | Moteur de Football Stochastique

**Manager 1863** est un jeu de gestion de football ultra-léger développé avec **Preact** et **Zustand**, conçu pour offrir une profondeur tactique inspirée de *Football Manager* et l'accessibilité de *Hattrick*.

Le projet repose sur une architecture de simulation moderne qui dépasse la simple opposition attaque/défense pour modéliser le football comme un cycle perpétuel de transitions.

---

## 🧠 Architecture du Moteur : Le Cycle Tactique Intégral

Contrairement aux moteurs classiques, Manager 1863 décompose chaque match en **20 cycles de jeu** basés sur 5 moments structurels clés :

1. **Organisation Offensive** : Utilisation des demi-espaces et des corridors pour contourner le bloc adverse.
2. **Transition Défensive** : Gestion de la *Rest-Defense* pour empêcher les contres après une perte de balle.
3. **Organisation Défensive** : Structure du bloc et déclenchement du pressing.
4. **Transition Offensive** : Exploitation de la *Rest-Attack* et de la *Vista* des milieux.
5. **Coups de Pied Arrêtés (CPA)** : Moments de rupture gérés par des spécialistes (type James Ward-Prowse).



---

## 🛠️ Caractéristiques Techniques

- **Framework :** Preact (Ultra-léger, performance maximale).
- **Gestion d'état :** Zustand (Store réactif pour le score et les événements).
- **Base de données :** Dexie.js (Persistance locale pour une expérience "Coût Zéro" sans serveur).
- **Visuels :** Avatars procéduraux via *Multiavatar* et icônes SVG *Lucide*.
- **Algorithme :** Formule cubique de probabilité $P = \frac{Atk^3}{Atk^3 + Def^3}$ pour des résultats réalistes.

---

## 📋 Rôles Tactiques Implémentés

Le jeu intègre des rôles modernes qui influencent dynamiquement les probabilités de chaque cycle :
- **Regista** : Maître du tempo et des transitions.
- **Mezzala** : Créateur d'espaces dans les demi-espaces.
- **Inverted Wing-Back** : Latéral renforçant le milieu en phase de possession.
- **Sweeper-Keeper** : Gardien participant à la relance.

---

## 🚀 Installation & Développement (IDX)

Ce projet est optimisé pour **Google IDX**. Pour personnaliser votre environnement :

1. Modifiez le fichier `.idx/dev.nix` pour ajouter des outils ou extensions.
2. Lancez le serveur de développement : `npm run dev`.
3. Consultez la [documentation IDX](https://developers.google.com/idx/guides/customize-idx-env) pour plus d'infos.

---

## 🗺️ Roadmap
- [ ] Générateur de joueurs procédural par profils.
- [ ] Système de championnat à 38 journées (Algorithme de Berger).
- [ ] Interface de coaching en temps réel pour les phases de transition.
- [ ] Historique des confrontations via Dexie.

---
*Propulsé par la passion du football et l'analyse tactique moderne.*