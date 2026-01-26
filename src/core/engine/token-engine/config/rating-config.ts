import { TokenType } from "../types";

/**
 * Configuration des impacts sur le rating par type de jeton.
 * Chaque action contribue positivement ou négativement à la note du joueur.
 * Base rating = 6.0, les actions modifient cette note.
 */
export const TOKEN_RATING_IMPACT: Record<TokenType, number> = {
    // --- PROGRESSION (OFFENSE) ---
    'PASS_SHORT': 0.02,        // Passe courte réussie
    'PASS_LONG': 0.03,         // Passe longue réussie (plus difficile)
    'PASS_BACK': 0.01,         // Passe en retrait (conservatrice)
    'PASS_SWITCH': 0.04,       // Renversement de jeu (vision)
    'DRIBBLE': 0.06,           // Dribble réussi (technique)
    'COMBO_PASS': 0.05,        // Combinaison
    'CROSS': 0.03,             // Centre
    'THROUGH_BALL': 0.08,      // Passe décisive potentielle (fusionné avec KEY_PASS)
    'CUT_BACK': 0.05,          // Centre en retrait

    // --- FINITION ---
    'SHOOT_GOAL': 0.50,        // BUT = gros boost
    'SHOOT_SAVED': 0.02,       // Tir cadré (effort)
    'SHOOT_CORNER': 0.02,      // Tir dévié en corner
    'SHOOT_OFF_TARGET': -0.03, // Tir non cadré (négatif)
    'SHOOT_WOODWORK': 0.05,    // Poteau/barre (malchance mais dangereux)
    'SHOOT_SAVED_CORNER': 0.03,// Arrêt réflexe provoqué
    'WOODWORK_OUT': 0.04,      // Bois + sortie

    // --- TÊTES ---
    'HEAD_PASS': 0.03,         // Remise de la tête
    'HEAD_SHOT': 0.04,         // Tête au but
    'REBOUND': 0.03,           // Récupération du second ballon
    'OWN_GOAL': -0.60,         // CSC = très négatif

    // --- DÉFENSE ---
    'TACKLE': 0.05,            // Tacle réussi
    'INTERCEPT': 0.06,         // Interception
    'SAVE': 0.15,              // Arrêt (gardien)
    'BLOCK': 0.04,             // Contre
    'CLEARANCE': 0.03,         // Dégagement
    'BALL_RECOVERY': 0.04,     // Récupération

    // --- DUELS ---
    'DUEL_WON': 0.04,          // Duel gagné
    'DUEL_LOST': -0.04,        // Duel perdu
    'PRESSING_SUCCESS': 0.05,  // Pressing réussi

    // --- GARDIEN ---
    'PUNCH': 0.06,             // Dégagement au poing
    'CLAIM': 0.08,             // Sortie aérienne
    'SWEEPER_KEEPER': 0.10,    // Sortie loin du but
    'GK_SHORT': 0.02,          // Relance courte
    'GK_LONG': 0.02,           // Relance longue
    'GK_BOULETTE': -0.25,      // Erreur de relance
    'GK_POSSESSION': 0.01,     // Gardien avec le ballon

    // --- NÉGATIF ---
    'FATIGUE': -0.02,          // Action sous fatigue
    'ERROR': -0.15,            // Erreur technique
    'OFFSIDE': -0.02,          // Hors-jeu
    'FOUL': -0.04,             // Faute commise
    'FOUL_PENALTY': -0.25,     // Faute dans la surface (penalty concédé)
    'CARD': -0.10,             // Carton (pénalité morale)
    'FREE_KICK': 0.00,         // Coup franc obtenu (neutre pour celui qui tire)
    'YELLOW_CARD': -0.10,      // Carton jaune
    'RED_CARD': -0.40,         // Carton rouge
    'SECOND_YELLOW_CARD': -0.30, // 2ème jaune
    'INJURY': -0.05,           // Blessé
    'STRETCHER': -0.02,        // Sortie sur civière

    // --- COUPS DE PIED ARRÊTÉS ---
    'CORNER_GOAL': 0.45,       // But sur corner
    'CORNER_CLEARED': 0.04,    // Corner dégagé (défenseur)
    'CORNER_SHORT': 0.02,      // Corner joué court
    'CORNER_OVERCOOKED': -0.03,// Corner raté
    'PENALTY_GOAL': 0.35,      // Penalty marqué
    'PENALTY_SAVED': 0.25,     // Penalty arrêté (gardien)
    'PENALTY_MISS': -0.20,     // Penalty raté

    // --- TOUCHES ET COUPS FRANCS ---
    'THROW_IN_SAFE': 0.01,     // Touche conservée
    'THROW_IN_LOST': -0.03,    // Touche perdue
    'THROW_IN_LONG_BOX': 0.04, // Longue touche dangereuse
    'FREE_KICK_SHOT': 0.06,    // Tir sur coup franc
    'FREE_KICK_CROSS': 0.03,   // Centre sur coup franc
    'FREE_KICK_WALL': -0.02,   // Tir dans le mur

    // --- SYSTÈME ---
    'VAR_CHECK': 0.00,         // Vérification VAR (neutre)
    'STALEMATE': 0.00,         // Situation bloquée
    'ADDED_TIME': 0.00,        // Temps additionnel
    'NEUTRAL_POSSESSION': 0.00,// Possession neutre
    'SYSTEM': 0.00             // Système
};

/**
 * Bonus/malus contextuels appliqués en plus de l'impact de base
 */
export const RATING_MODIFIERS = {
    // Bonus pour action dans une zone difficile (surface adverse)
    DANGER_ZONE_MULTIPLIER: 1.3,
    
    // Bonus pour action sous pression (beaucoup de défenseurs)
    UNDER_PRESSURE_BONUS: 0.02,
    
    // Malus pour erreur en zone dangereuse (surface défensive)
    OWN_ZONE_ERROR_MULTIPLIER: 1.5,
    
    // Bonus d'assist (joueur ayant fait la passe avant le but)
    ASSIST_BONUS: 0.25,
    
    // Bonus pour clean sheet (gardien et défenseurs)
    CLEAN_SHEET_BONUS: 0.30,
    
    // Malus pour but encaissé (gardien et défenseurs)
    GOAL_CONCEDED_PENALTY: -0.10,
    
    // Bonus homme du match potentiel
    MOTM_THRESHOLD: 8.0,
    
    // Note minimum et maximum
    MIN_RATING: 4.0,
    MAX_RATING: 10.0,
    BASE_RATING: 6.0
};
