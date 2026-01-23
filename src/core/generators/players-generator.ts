import type { Player } from "@/core/db/db";
import { clamp, randomInt, getRandomElement } from "@/core/utils/math";
import { ROLES_CONFIG } from "../engine/token-engine/config/roles-config";

const FIRST_NAMES = ["Arthur", "William", "Henry", "George", "Thomas", "John", "Edward", "Charles", "Walter", "Frank"];
const LAST_NAMES = ["Smith", "Jones", "Williams", "Taylor", "Brown", "Davies", "Evans", "Wilson", "Thomas", "Roberts"];

const VALID_ROLES = Object.keys(ROLES_CONFIG);

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

	switch (role) {
		case "GK": stats.mental += 3; stats.physical -= 2; break;
		case "DC": stats.defense += 4; stats.finishing -= 5; break;
		case "MC": stats.technical += 4; stats.mental += 3; break;
		case "ST": stats.finishing += 5; stats.defense -= 5; break;
        case "LW":
        case "RW": stats.technical += 3; stats.physical += 3; break;
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
	const skill = Object.values(stats).reduce((a: any, b: any) => Number(a) + Number(b), 0) / 6;

    // --- LOGIQUE DE POTENTIEL ---
    let potentialBonus = Math.random() * 4 + 1; // Standard: +1 à +5 points
    const randCrack = Math.random();
    if (randCrack > 0.9) potentialBonus += 4; // Crack: +5 à +9 points
    else if (age > 30) potentialBonus = Math.max(0, potentialBonus - 3); // Déclin après 30 ans
    
    const potential = clamp(skill + potentialBonus, skill, 20);

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
		morale: 60 + Math.random() * 30, // Confiance initiale aléatoire (60-90)
		condition: 100,
		marketValue: Math.round(Math.pow(skill, 2.7) * 1000 + (potential - skill) * 500),
		wage: Math.round(Math.pow(skill, 2) * 10),
        dna: "0-0-0-0-0",
		traits: [],
		seasonStats: { matches: 0, goals: 0, assists: 0, avgRating: 0, xg: 0, xa: 0, distance: 0, duelsWinRate: 0, passAccuracy: 0 }
	};
}

function getGeneralPosition(role: string): string {
    if (role === "GK") return "GK";
    if (["DC", "DL", "DR"].includes(role)) return "DEF";
    if (["MC", "ML", "MR"].includes(role)) return "MID";
    return "FWD";
}

function getSideFromRole(role: string): string {
    if (role.endsWith("L") || role === "LW") return "L";
    if (role.endsWith("R") || role === "RW") return "R";
    return "C";
}
