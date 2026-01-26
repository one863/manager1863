import type { Player } from "@/core/db/db";
import { clamp, randomInt, getRandomElement } from "@/core/utils/math";

/** Génère un DNA unique pour l'apparence du joueur */
function generateDna(): string {
	const skinIdx = randomInt(0, 5);   // Teint de peau (6 options)
	const hairIdx = randomInt(0, 7);   // Couleur/style cheveux (8 options)
	const facialIdx = randomInt(0, 5); // Traits du visage (6 options)
	const eyesIdx = randomInt(0, 3);   // Type d'yeux (4 options)
	const genderIdx = randomInt(0, 9); // 0 = homme, impair = femme (10% femme)
	return `${skinIdx}-${hairIdx}-${facialIdx}-${eyesIdx}-${genderIdx}`;
}

const FIRST_NAMES = ["Arthur", "William", "Henry", "George", "Thomas", "John", "Edward", "Charles", "Walter", "Frank"];
const LAST_NAMES = ["Smith", "Jones", "Williams", "Taylor", "Brown", "Davies", "Evans", "Wilson", "Thomas", "Roberts"];

// Rôles compatibles avec formations-config.ts
const VALID_ROLES = [
    "GK",                           // Gardien
    "DC", "DCL", "DCR", "DL", "DR", // Défenseurs
    "LWB", "RWB",                   // Pistons
    "DM",                           // Milieu défensif
    "MC", "MCL", "MCR", "ML", "MR", // Milieux
    "AMC", "AML", "AMR",            // Milieux offensifs
    "LW", "RW",                     // Ailiers
    "ST", "STL", "STR", "CF"        // Attaquants
];

// Rôles par catégorie pour la génération d'équipe
const ROLE_CATEGORIES = {
    GK: ["GK"],
    DEF: ["DC", "DCL", "DCR", "DL", "DR", "LWB", "RWB"],
    MID: ["DM", "MC", "MCL", "MCR", "ML", "MR", "AMC", "AML", "AMR"],
    FWD: ["ST", "STL", "STR", "CF", "LW", "RW"]
};

function generateSimplifiedStats(role: string, baseSkill: number) {
	const getStat = (bonus = 0) => clamp(baseSkill + bonus + (Math.random() * 6 - 3), 1, 20);

	const stats: any = {
		technical: getStat(),
		finishing: getStat(),
		defense: getStat(),
		physical: getStat(),
		mental: getStat(),
		goalkeeping: getStat(role === "GK" ? 5 : -10),
	};

	// Bonus par catégorie de rôle
	if (role === "GK") {
		stats.mental += 3; stats.physical -= 2;
	} else if (ROLE_CATEGORIES.DEF.includes(role)) {
		stats.defense += 4; stats.finishing -= 5;
		if (["LWB", "RWB", "DL", "DR"].includes(role)) {
			stats.physical += 2; // Latéraux plus physiques
		}
	} else if (ROLE_CATEGORIES.MID.includes(role)) {
		stats.technical += 3; stats.mental += 2;
		if (role === "DM") {
			stats.defense += 3;
		} else if (["AMC", "AML", "AMR"].includes(role)) {
			stats.finishing += 2; // Meneurs plus décisifs
		}
	} else if (ROLE_CATEGORIES.FWD.includes(role)) {
		stats.finishing += 4; stats.defense -= 4;
		if (["LW", "RW"].includes(role)) {
			stats.technical += 2; stats.physical += 2;
		} else if (role === "CF") {
			stats.technical += 3; // Faux 9 plus technique
		}
	}

	return stats;
}


export function generatePlayer(targetAvgSkill = 5, forcedRole?: string): Partial<Player> {
	let role = forcedRole || getRandomElement(VALID_ROLES);
	if (role === "DEF") role = "DC";
	if (role === "MID") role = "MC";
	if (role === "FWD") role = "ST";

	const age = randomInt(16, 36);
	const stats = generateSimplifiedStats(role, targetAvgSkill);
	// Calcul de la note moyenne (Skill)
	const skill = (Object.values(stats) as number[]).reduce((a, b) => a + b, 0) / 6;

	// --- LOGIQUE DE POTENTIEL ---
	let potentialBonus = Math.random() * 4 + 1; // Standard: +1 à +5 points
	const randCrack = Math.random();
	if (randCrack > 0.9) potentialBonus += 4; // Crack: +5 à +9 points
	else if (age > 30) potentialBonus = Math.max(0, potentialBonus - 3); // Déclin après 30 ans
	const potential = clamp(skill + potentialBonus, skill, 20);

	// Champs obligatoires pour conformité Zod
	return {
		firstName: getRandomElement(FIRST_NAMES),
		lastName: getRandomElement(LAST_NAMES),
		age,
		role,
		position: getGeneralPosition(role) as any,
		side: getSideFromRole(role) as any,
		skill,
		potential,
		stats,
		energy: 100,
		morale: Math.floor(60 + Math.random() * 31), // 60-90, entier
		condition: 100,
		marketValue: Math.round(Math.pow(skill, 2.7) * 1000 + (potential - skill) * 500),
		wage: Math.round(Math.pow(skill, 2) * 10),
		dna: generateDna(),
		traits: [],
		seasonStats: { matches: 0, goals: 0, assists: 0, avgRating: 0, xg: 0, xa: 0, distance: 0, duelsWinRate: 0, passAccuracy: 0 },
		isStarter: false,
		playedThisWeek: false,
		lastRatings: [],
		joinedDay: 1,
		joinedSeason: 1,
		injuryDays: 0,
		suspensionMatches: 0,
	};
}

function getGeneralPosition(role: string): string {
    if (role === "GK") return "GK";
    if (ROLE_CATEGORIES.DEF.includes(role)) return "DEF";
    if (ROLE_CATEGORIES.MID.includes(role)) return "MID";
    return "FWD";
}

function getSideFromRole(role: string): string {
    const leftRoles = ["DL", "DCL", "LWB", "ML", "MCL", "AML", "LW", "STL"];
    const rightRoles = ["DR", "DCR", "RWB", "MR", "MCR", "AMR", "RW", "STR"];
    if (leftRoles.includes(role)) return "L";
    if (rightRoles.includes(role)) return "R";
    return "C";
}
