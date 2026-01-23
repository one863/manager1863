export const MATCH_CONFIG = {
    timing: {
        matchDuration: 5400, // 90 mins en secondes
        stoppageTime: 240,    // 4 mins
        kickOffDelay: 60      // Délai après un but
    },
    physics: {
        moveBallX: 1,         // Pas de base en X
        moveBallY: 1,         // Pas de base en Y
        randomYChance: 0.4    // Chance que Y change lors d'un mouvement X
    },
    balancing: {
        baseSuccessChance: 70, // Chance de base de réussir une action offensive
        defensePressureMax: 2.0, // Multiplicateur max de la défense
        fatigueThreshold: 50   // Seuil à partir duquel le joueur perd de l'influence
    }
};
