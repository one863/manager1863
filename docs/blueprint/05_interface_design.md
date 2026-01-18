# 05. Interface & Design System (UI/UX)

Ce document définit les règles graphiques et ergonomiques. Le design suit une approche "Neutral Dashboard" où la structure est incolore pour laisser les données métier (notes, stats, alertes) être les seuls points d'attention.

## 1. Philosophie Visuelle : "Clean & Informative"
* **Base Chromatique :** Gris et Blanc uniquement.
* **Typographie :** * *Interface :* Sans-serif moderne (Inter ou System UI) pour la lisibilité.
    * *Données :* Monospacé (JetBrains Mono) pour les scores et les notes, renforçant l'aspect "simulation".
* **Surfaces :** Utilisation de l'élévation (ombres légères) et des bordures fines (`border-slate-200`) pour séparer les zones sans alourdir.

## 2. Palette de Couleurs (Informative)
Les couleurs ne sont utilisées que pour le feedback utilisateur :
* **Notes & Statistiques (Échelle sur 20) :**
    * `16+` : Vert Émeraude (Excellent/Mondial).
    * `12-15` : Bleu (Bon/Professionnel).
    * `8-11` : Orange (Moyen/Limité).
    * `<8` : Rouge (Faible).
* **Finances :** Positif (Vert), Négatif (Rouge).
* **Énergie :** Barre de progression grise qui vire au jaune puis au rouge sous 30%.

## 3. Structure des Menus (Architecture Mobile-First)
Le jeu est conçu pour être utilisé à une main (Navigation en bas).

### Navigation Principale (Bottom Bar)
1. **Dashboard (Home) :** Résumé de la situation actuelle et bouton "Suivant".
2. **Squad (Équipe) :** Gestion de l'effectif et des titulaires.
3. **Club (Bâtisseur) :** Infrastructures, Staff et Finances.
4. **Market (Marché) :** Recrutement et Scouting.
5. **History (Musée) :** Palmarès et archives du "Club Unique".

### UX Patterns : "Navigation par Vues Pleines"
Pour maintenir une immersion totale et une sensation d'application PWA native, le jeu utilise une navigation par remplacement de vue.
* **Fiches Détails :** Voir la fiche d'un joueur ou d'une équipe remplace la vue principale. 
* **Bouton Retour :** Chaque vue de détail possède un bouton "Retour" (`ArrowLeft`) clair en haut à gauche pour revenir à l'écran précédent sans rompre le flux.
* *Avantage :* Utilisation maximale de l'espace écran sur mobile et cohérence avec le reste de l'interface (Dashboard, Marché).

## 4. Intégration des Avatars SVG
Le composant `PlayerAvatar` est l'élément visuel le plus "vivant" de l'UI.
* **Dans les listes :** Affichage en petit format (32px ou 48px) avec un cercle de fond gris clair.
* **Fiche Joueur :** Affichage grand format (128px) mettant en avant les traits distinctifs (cheveux, barbe, accessoires).
* **Staff :** Toujours représenté avec son costume caractéristique et sa cravate aux couleurs du club pour une distinction immédiate.

## 5. États de l'Interface (Feedback)
* **Loading :** Skeleton screens (zones grises animées) respectant la forme des futures cartes.
* **Transition :** Fondu enchaîné léger entre les onglets via Tailwind `transition-opacity`.
* **Empty States :** Illustrations filaires grises quand une liste est vide (ex: "Aucun scout en mission").
