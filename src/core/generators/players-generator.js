"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generatePlayer = generatePlayer;
var math_1 = require("@/core/utils/math");
var FIRST_NAMES = [
    "Arthur",
    "William",
    "Henry",
    "George",
    "Thomas",
    "John",
    "Edward",
    "Charles",
    "Walter",
    "Frank",
    "Joseph",
    "Robert",
    "James",
    "Harry",
    "Alfred",
    "Ernest",
    "Albert",
    "Richard",
    "Fred",
    "Herbert",
];
var LAST_NAMES = [
    "Smith",
    "Jones",
    "Williams",
    "Taylor",
    "Brown",
    "Davies",
    "Evans",
    "Wilson",
    "Thomas",
    "Roberts",
    "Johnson",
    "Lewis",
    "Walker",
    "Robinson",
    "Wood",
    "Thompson",
    "Wright",
    "White",
    "Watson",
    "Harrison",
];
var POSITIONS = ["GK", "DEF", "MID", "FWD"];
var TRAIT_POOL = [
    "COUNTER_ATTACKER",
    "SHORT_PASSER",
    "CLUTCH_FINISHER",
    "WING_WIZARD",
    "IRON_DEFENDER",
    "MARATHON_MAN",
    "BOX_TO_BOX",
    "FREE_KICK_EXPERT",
    "SWEEPER_GK"
];
function generateStats(position, baseSkill) {
    // Fonction utilitaire pour générer une stat autour d'une moyenne
    var getStat = function (bonus) {
        if (bonus === void 0) { bonus = 0; }
        return (0, math_1.clamp)(baseSkill + bonus + (Math.random() * 4 - 2), 1, 20);
    };
    var stats = {
        // Physiques
        speed: getStat(),
        stamina: getStat(),
        strength: getStat(),
        explosivity: getStat(),
        head: getStat(),
        // Techniques
        finishing: getStat(),
        shooting: getStat(),
        dribbling: getStat(),
        technique: getStat(),
        passing: getStat(),
        crossing: getStat(),
        // Mentales / Tactiques
        positioning: getStat(),
        vision: getStat(),
        pressing: getStat(),
        aggression: getStat(),
        leadership: getStat(),
        // Défensives
        tackling: getStat(),
        marking: getStat(),
        intervention: getStat(), // New
        impact: getStat(), // New
        // Autres
        resistance: getStat(),
        volume: getStat(),
        creation: getStat(),
    };
    // Spécialisation par poste
    if (position === "GK") {
        stats.goalkeeping = getStat(5); // Bonus GK
        stats.reflexes = getStat(5);
        stats.handling = getStat(3);
        stats.speed = getStat(-2);
        stats.finishing = getStat(-5);
    }
    else if (position === "DEF") {
        stats.tackling = getStat(3);
        stats.marking = getStat(3);
        stats.strength = getStat(2);
        stats.intervention = getStat(3);
        stats.impact = getStat(2);
        stats.head = getStat(3);
        stats.finishing = getStat(-3);
    }
    else if (position === "MID") {
        stats.passing = getStat(3);
        stats.vision = getStat(3);
        stats.stamina = getStat(2);
        stats.volume = getStat(3);
        stats.resistance = getStat(2);
        stats.technique = getStat(2);
    }
    else if (position === "FWD") {
        stats.finishing = getStat(4);
        stats.shooting = getStat(3);
        stats.speed = getStat(2);
        stats.dribbling = getStat(2);
        stats.tackling = getStat(-3);
        stats.explosivity = getStat(3);
    }
    return stats;
}
function generatePlayer(targetAvgSkill, forcedPosition) {
    if (targetAvgSkill === void 0) { targetAvgSkill = 5; }
    var position = forcedPosition || (0, math_1.getRandomElement)(POSITIONS);
    var age = (0, math_1.randomInt)(16, 34);
    var stats = generateStats(position, targetAvgSkill);
    // Calcul du skill global (moyenne simple pour l'instant)
    var skill = Object.values(stats).reduce(function (a, b) { return (a || 0) + (b || 0); }, 0) /
        Object.values(stats).length;
    // Potentiel : minimum égal au skill actuel, maximum 20.99
    // Les jeunes ont un potentiel plus élevé
    var potentialBuffer = (0, math_1.clamp)((35 - age) * 0.4 + Math.random() * 5, 0.5, 8);
    var potential = (0, math_1.clamp)(skill + potentialBuffer, skill, 20.99);
    // Génération de traits (10% de chance d'en avoir un, ou plus si bon joueur)
    var traits = [];
    if (skill > 10 && Math.random() > 0.7) {
        var trait = (0, math_1.getRandomElement)(TRAIT_POOL);
        if ((position === "GK" && trait === "SWEEPER_GK") ||
            (position === "FWD" && trait === "CLUTCH_FINISHER") ||
            (position !== "GK" && trait !== "SWEEPER_GK")) {
            traits.push(trait);
        }
    }
    // DNA Visuel
    // Format: SkinTone-HairType-HairColor-Beard-Glasses
    var skinTone = (0, math_1.randomInt)(0, 4); // 0-4
    var hairType = (0, math_1.randomInt)(0, 6); // 0-6
    var hairColor = (0, math_1.randomInt)(0, 4); // 0-4
    var beard = (0, math_1.randomInt)(0, 10) > 6 ? (0, math_1.randomInt)(1, 4) : 0; // 0=None, 1-4 Styles
    var glasses = Math.random() > 0.95 ? 1 : 0;
    var dna = "".concat(skinTone, "-").concat(hairType, "-").concat(hairColor, "-").concat(beard, "-").concat(glasses);
    var marketValue = Math.round(Math.pow(skill, 2.5) * 10 * (1.5 - age / 40));
    var wage = Math.round(marketValue / 500);
    var side = position !== "GK" && position !== "FWD" ? (Math.random() > 0.6 ? (Math.random() > 0.5 ? "L" : "R") : "C") : "C";
    return {
        firstName: (0, math_1.getRandomElement)(FIRST_NAMES),
        lastName: (0, math_1.getRandomElement)(LAST_NAMES),
        age: age,
        position: position,
        side: side,
        skill: skill,
        potential: potential,
        joinedDay: 1,
        joinedSeason: 1,
        stats: stats,
        energy: 100,
        morale: 80,
        condition: 100, // Forme du joueur (0-100)
        form: 5.0, // Note moyenne des derniers matchs
        formBackground: 5.0,
        marketValue: marketValue,
        wage: wage,
        contractEnds: 1, // Saison relative
        dna: dna,
        traits: traits,
        injuryDays: 0,
        suspensionMatches: 0,
        playedThisWeek: false,
        lastRatings: [],
        seasonStats: { matches: 0, goals: 0, assists: 0, avgRating: 0, xg: 0, xa: 0, distance: 0, duelsWinRate: 0, passAccuracy: 0 }
    };
}
