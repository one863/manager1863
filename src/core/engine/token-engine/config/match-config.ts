export const MATCH_CONFIG = {
    timing: {
        matchDuration: 5400,     // 90 minutes
        celebrationDuration: 30, // Temps de célébration (phases de GOAL_SEQUENCE)
        restartDelay: 30,        // Temps de remise en jeu
        stoppageTimeFactor: 1.2  // Multiplicateur pour calculer le temps additionnel
    },
    grid: {
        width: 6,  // x: 0-5
        height: 5, // y: 0-4
        goalZones: { home: 0, away: 5 }
    },
    balancing: {
        // Au lieu de "chance de réussite", on définit la densité du sac
        baseOffensiveTokens: 15, // Nombre de jetons générés par une stat de 10
        fatigueStart: 60,        // % à partir duquel les jetons _TIRED apparaissent
        fatigueImpact: 1.5,      // Vitesse d'épuisement des joueurs
        confidenceBoost: 0.2     // % de jetons ELITE ajoutés en cas de succès
    }
};