import { db, type StaffMember } from "@/core/db/db";
import { getRandomElement, randomInt } from "@/core/utils/math";
import type { StaffTrait } from "@/core/engine/core/types";

const FIRST_NAMES = [
	"Arthur", "William", "Henry", "George", "Thomas", "John", "Edward", "Charles", "Walter", "Frank",
	"Joseph", "Robert", "James", "Harry", "Alfred", "Ernest", "Albert", "Richard", "Fred", "Herbert",
];

const LAST_NAMES = [
	"Smith", "Jones", "Williams", "Taylor", "Brown", "Davies", "Evans", "Wilson", "Thomas", "Roberts",
	"Johnson", "Lewis", "Walker", "Robinson", "Wood", "Thompson", "Wright", "White", "Watson", "Harrison",
];

const ROLES: StaffMember["role"][] = ["COACH", "SCOUT", "PHYSICAL_TRAINER"];

const STAFF_TRAITS: StaffTrait[] = [
    "MOTIVATOR",
    "TACTICIAN",
    "YOUTH_SPECIALIST",
    "STRATEGIST",
    "HARD_DRILLER",
];

export function generateStaffMember(saveId: number, teamId?: number, avgSkill = 5): Partial<StaffMember> {
	const firstName = getRandomElement(FIRST_NAMES);
	const lastName = getRandomElement(LAST_NAMES);
	const role = getRandomElement(ROLES);
	const age = randomInt(35, 65);
	
	const skill = Math.min(100, Math.max(1, Math.round(avgSkill * 10 + (Math.random() * 20 - 10))));
	
	const stats = {
		management: randomInt(1, 20),
		training: randomInt(1, 20),
		tactical: randomInt(1, 20),
		physical: randomInt(1, 20),
		goalkeeping: randomInt(1, 20),
	};

	// Spécialisation selon le rôle
	if (role === "COACH") {
		stats.training = Math.min(20, stats.training + 5);
		stats.tactical = Math.min(20, stats.tactical + 5);
	} else if (role === "PHYSICAL_TRAINER") {
		stats.physical = Math.min(20, stats.physical + 8);
	}

    // DNA Visuel (même format que les joueurs)
	const skinTone = randomInt(0, 4);
	const hairType = randomInt(0, 6);
	const hairColor = randomInt(0, 4);
	const beard = randomInt(0, 10) > 4 ? randomInt(1, 4) : 0;
	const glasses = Math.random() > 0.7 ? 1 : 0;
	const dna = `${skinTone}-${hairType}-${hairColor}-${beard}-${glasses}`;

	const wage = Math.round(skill * 50);

    // Attribution de traits (10-30% de chance d'avoir un trait, max 2)
    const traits: StaffTrait[] = [];
    if (Math.random() > 0.7) {
        traits.push(getRandomElement(STAFF_TRAITS));
        if (Math.random() > 0.8) {
            let secondTrait = getRandomElement(STAFF_TRAITS);
            if (!traits.includes(secondTrait)) {
                traits.push(secondTrait);
            }
        }
    }

	return {
		saveId,
		teamId,
		firstName,
		lastName,
		role,
		skill,
		age,
		wage,
		dna,
		stats,
		preferredStrategy: getRandomElement(["DEFENSIVE", "BALANCED", "OFFENSIVE"]),
        traits,
        confidence: randomInt(40, 90),
        joinedDay: 1,
        joinedSeason: 1
	};
}

export async function generateInitialStaffMarket(saveId: number, count = 20) {
    const staff = [];
    for (let i = 0; i < count; i++) {
        staff.push(generateStaffMember(saveId, undefined, 5));
    }
    await db.staff.bulkAdd(staff as StaffMember[]);
}
