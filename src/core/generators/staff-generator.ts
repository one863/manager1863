import type { StaffMember, StaffStats } from "@/core/db/db";
import { getRandomElement, randomInt, clamp } from "@/core/utils/math";

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
		coaching: 1,
		tactical: 1,
		discipline: 1,
		conditioning: 1,
		recovery: 1,
		reading: 1
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
		dna: "0-0-0-0-0"
	};
}
