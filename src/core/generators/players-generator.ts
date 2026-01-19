import type { Player, PlayerTrait } from "@/core/db/db";
import { clamp, randomInt, getRandomElement } from "@/core/utils/math";

const FIRST_NAMES = [
    "Arthur", "William", "Henry", "George", "Thomas", "John", "Edward", "Charles", "Walter", "Frank",
    "Joseph", "Robert", "James", "Harry", "Alfred", "Ernest", "Albert", "Richard", "Fred", "Herbert",
    "Jack", "Mason", "Declan", "Jude", "Marcus", "Cole", "Reece", "Trent", "Jordan", "Harvey",
    "Callum", "Kieran", "Bukayo", "Phil", "Ben", "Kyle", "Ollie", "Luke", "Tyrone", "Aaron"
];

const LAST_NAMES = [
    "Smith", "Jones", "Williams", "Taylor", "Brown", "Davies", "Evans", "Wilson", "Thomas", "Roberts",
    "Johnson", "Lewis", "Walker", "Robinson", "Wood", "Thompson", "Wright", "White", "Watson", "Harrison",
    "Kane", "Sterling", "Pickford", "Rice", "Foden", "Bellingham", "Saka", "Palmer", "Grealish", "Trippier",
    "Maguire", "Stones", "Alexander-Arnold", "Shaw", "Phillips", "Chilwell", "Gallagher", "Watkins", "Bowen", "Ramsdale"
];

const POSITIONS = ["GK", "DEF", "MID", "FWD"];

// Mise à jour de la pool avec les nouveaux traits V4.5
const TRAIT_POOL: PlayerTrait[] = [
	"COUNTER_ATTACKER", 
    "SHORT_PASSER", 
    "CLUTCH_FINISHER", 
    "WING_WIZARD", 
    "IRON_DEFENDER",
	"MARATHON_MAN", 
    "BOX_TO_BOX", 
    "FREE_KICK_EXPERT", 
    "SWEEPER_GK",
    "PENALTY_SPECIALIST", // Nouveau
    "CORNER_SPECIALIST",  // Nouveau
    "LONG_THROW_SPECIALIST" // Nouveau
];

function generateVQNStats(position: string, baseSkill: number) {
	const getStat = (bonus = 0) => clamp(baseSkill + bonus + (Math.random() * 6 - 3), 1, 20);

	const stats: Player["stats"] = {
		// Q - Technique
		passing: getStat(),
		shooting: getStat(),
		dribbling: getStat(),
		tackling: getStat(),
        ballControl: getStat(), // Q - Nouveau
        crossing: getStat(), // Q - Nouveau
		// V - Physique
		speed: getStat(),
		strength: getStat(),
		stamina: getStat(),
        jumping: getStat(), // V - Nouveau
        agility: getStat(), // V - Nouveau
		// N - Mental
		vision: getStat(),
		positioning: getStat(),
		composure: getStat(),
        aggression: getStat(), // N - Nouveau
        leadership: getStat(), // N - Nouveau
        anticipation: getStat(), // N - Nouveau
	};

	// Spécialisation par poste
	if (position === "GK") {
		stats.goalkeeping = getStat(5);
		stats.shooting = getStat(-6);
		stats.passing = getStat(-2);
        stats.crossing = getStat(-5);
        stats.agility = getStat(3); // Important pour les GK
        stats.anticipation = getStat(3);
	} else if (position === "DEF") {
		stats.tackling = getStat(4);
		stats.positioning = getStat(3);
		stats.strength = getStat(3);
        stats.jumping = getStat(3); // Important pour les duels aériens
        stats.aggression = getStat(2); // Important pour le pressing
        stats.anticipation = getStat(3); // Important pour couper les lignes
		stats.shooting = getStat(-4);
	} else if (position === "MID") {
		stats.passing = getStat(4);
		stats.vision = getStat(4);
		stats.stamina = getStat(3);
        stats.ballControl = getStat(4); // Important pour la transition
        stats.agility = getStat(2);
	} else if (position === "FWD") {
		stats.shooting = getStat(5);
		stats.speed = getStat(4);
		stats.composure = getStat(3);
        stats.jumping = getStat(2); // Jeu de tête offensif
        stats.agility = getStat(3); // Changement de direction
		stats.tackling = getStat(-5);
	}

	return stats;
}

export function generatePlayer(
	targetAvgSkill = 5,
	forcedPosition?: string,
): Partial<Player> {
	const position = forcedPosition || getRandomElement(POSITIONS);
	const age = randomInt(16, 36);
	const stats = generateVQNStats(position, targetAvgSkill);

	// Skill basé sur les stats VQN
	const skill = Object.values(stats).reduce((a, b) => (a || 0) + (b || 0), 0) / Object.values(stats).length;

	const potentialBuffer = clamp((37 - age) * 0.5 + Math.random() * 5, 0.5, 8);
	const potential = clamp(skill + potentialBuffer, skill, 20.99);

	const traits: PlayerTrait[] = [];
	
    // Chance d'avoir un trait (augmentée pour les bons joueurs)
    // On permet maintenant d'avoir jusqu'à 2 traits pour plus de diversité
	if (skill > 10 && Math.random() > 0.7) {
		traits.push(getRandomElement(TRAIT_POOL));
        
        // Chance d'un 2ème trait pour les stars
        if (skill > 14 && Math.random() > 0.8) {
            const secondTrait = getRandomElement(TRAIT_POOL);
            if (!traits.includes(secondTrait)) traits.push(secondTrait);
        }
	}

	const dna = `${randomInt(0, 4)}-${randomInt(0, 6)}-${randomInt(0, 4)}-${randomInt(0, 4)}-${Math.random() > 0.9 ? 1 : 0}`;

	const marketValue = Math.round(Math.pow(skill, 2.7) * 12 * (1.6 - age / 40));
	const wage = Math.round(marketValue / 450);
	const side = position !== "GK" && position !== "FWD" ? (Math.random() > 0.6 ? (Math.random() > 0.5 ? "L" : "R") : "C") : "C";

	return {
		firstName: getRandomElement(FIRST_NAMES),
		lastName: getRandomElement(LAST_NAMES),
		age,
		position: position as any,
		side: side as any,
		skill,
		potential,
		joinedDay: 1,
		joinedSeason: 1,
		stats,
		energy: 100,
		morale: 80,
		condition: 100,
		form: 5.0,
		formBackground: 5.0,
		marketValue,
		wage,
		dna,
		traits,
		injuryDays: 0,
		suspensionMatches: 0,
		playedThisWeek: false,
		lastRatings: [],
		seasonStats: { matches: 0, goals: 0, assists: 0, avgRating: 0, xg: 0, xa: 0, distance: 0, duelsWinRate: 0, passAccuracy: 0 }
	};
}
