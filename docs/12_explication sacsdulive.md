

|     |       |       |       |       |       |       |
| :-: | :---: | :---: | :---: | :---: | :---: | :---: |
|     | X = 0 | X = 1 | X = 2 | X = 3 | X = 4 | X = 5 |
| Y=0 | 0 0   | 1 0   | 2 0   | 3 0   | 4 0   | 5 0   |
| Y=1 | 0 1   | 1 1   | 2 1   | 3 1   | 4 1   | 5 1   |
| Y=2 | 0 2   | 1 2   | 2 2   | 3 2   | 4 2   | 5 2   |
| Y=3 | 0 3   | 1 3   | 2 3   | 3 3   | 4 3   | 5 3   |
| Y=4 | 0 4   | 1 4   | 2 4   | 3 4   | 4 4   | 5 4   |

  
  

Voici l'architecture concise du système de live qui est un lecteur de logs d'un match :

**1. Logique des Logs (****$N$** **= Index actuel)**

  - **LOG $N$ (Le Présent) :** Fournit la position du ballon et le sac des futurs possibles. le live commence avec le coup d'envoi et uniquement des jetons pour l'équipe qui effectue le coup d'envoi.
  - **LOG $N-1$ (Le Passé) :** Fournit le contexte du tirage précédent. Sauf lors du coup d'envoi d'une mi-temps, puisque aucun jeton n'a été encore tiré.
  - **Transition :** Le drawnToken stocké dans le LOG $N$ est le résultat du tirage effectué dans le sac du LOG $N-1$.

**2. Affichage des Sacs (Onglet Live de MatchLive.tsx)**

L'ordre vertical suit la chronologie de l'action :

  - **HAUT (LOG $N$) :** Affiche le sac actuel. Aucun jeton n'est allumé. C'est l'annonce des possibilités à venir.
  - **BAS (LOG $N-1$) :** Affiche le sac précédent. On y illumine le jeton qui a été tiré (le drawnToken du LOG $N$). C'est l'explication du mouvement.

**3. Rendu Terrain (PitchView)**

  - **Ballon :** Position du LOG $N$.
  - **Badge :** Affiche le type du jeton tiré au LOG $N-1$ pour justifier la position du ballon. Sauf lors du coup d'envoi d'une mi-temps, car aucun jeton n'a encore été tiré.

  
Note : Il faut afficher dans chaque sac le numero de log en cours. met en bleu les jetons home et en orange les jetons away. dans le sac n-1 met en vert le jeton tiré. c'est ce jeton qui doit etre affiché dans le badge au dessus du ballon sur le terrain. sauf pour le coup d'envoi ou c'est kick off affiché  

```
