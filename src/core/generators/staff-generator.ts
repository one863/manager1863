import type { StaffMember, StaffStats } from "@/core/db/db";
import { getRandomElement, randomInt, clamp } from "@/core/utils/math";

/** Génère un DNA unique pour l'apparence du staff */
function generateStaffDna(): string {
	const skinIdx = randomInt(0, 5);   // Teint de peau
	const hairIdx = randomInt(0, 5);   // Cheveux gris (staff plus âgé)
	const facialIdx = randomInt(0, 5); // Traits du visage
	const eyesIdx = randomInt(0, 3);   // Type d'yeux
	const genderIdx = 0;               // Staff toujours masculin pour l'époque
	return `${skinIdx}-${hairIdx}-${facialIdx}-${eyesIdx}-${genderIdx}`;
}

const STAFF_FIRST_NAMES = ["Albert", "George", "Thomas", "Arthur", "Walter", "Frank", "Herbert", "Ernest"];
const STAFF_LAST_NAMES = ["Ferguson", "Busby", "Nicholson", "Chapman", "Clough", "Shankly", "Paisley", "Stein"];

const ROLES: StaffMember["role"][] = ["COACH", "PHYSICAL_TRAINER", "VIDEO_ANALYST"];

export function generateStaff(
	targetSkill = 5,
	forcedRole?: StaffMember["role"]
): Partial<StaffMember> {
	const role = forcedRole || getRandomElement(ROLES);
	const age = randomInt(35, 75);

	const getStat = (bonus = 0) => clamp(targetSkill + bonus + (Math.random() * 6 - 3), 1, 20);

	const stats: StaffStats = {
		coaching: getStat(3),
		tactical: getStat(4),
		discipline: getStat(2),
		medical: getStat(3),
		conditioning: getStat(5),
		recovery: getStat(4),
		management: getStat(2),
		reading: getStat(6),
		training: getStat(4),
		physical: getStat(2),
		goalkeeping: getStat(1),
	};

	if (role === "COACH") {
		stats.coaching = getStat(3);
		stats.tactical = getStat(4);
		stats.discipline = getStat(2);
	} else if (role === "PHYSICAL_TRAINER") {
		stats.conditioning = getStat(5);
		stats.recovery = getStat(4);
	} else if (role === "VIDEO_ANALYST") {
		stats.reading = getStat(6);
		stats.tactical = getStat(2);
	}

	const skill = (Object.values(stats).reduce((a, b) => a + b, 0) / 3); // Moyenne pondérée simple
	const marketValue = Math.pow(skill, 2.2) * 100;

	return {
		firstName: getRandomElement(STAFF_FIRST_NAMES),
		lastName: getRandomElement(STAFF_LAST_NAMES),
		role,
		age,
		skill,
		wage: Math.round(marketValue / 12),
		confidence: 70,
		stats,
		traits: [],
		joinedDay: 1,
		joinedSeason: 1,
		dna: generateStaffDna()
	};
}
