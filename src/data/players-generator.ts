import type { Player, PlayerStats, PlayerTrait, Position } from "@/db/db";

const firstNames = [
	"Arthur", "William", "George", "Thomas", "James", "John", "Charles", "Henry",
	"Edward", "Frederick", "Walter", "Albert", "Robert", "Joseph", "Samuel",
	"Alfred", "Harry", "Frank", "Richard", "Ernest", "David", "Peter", "Hugh",
	"Oliver", "Jack", "Harry", "Jacob", "Charlie", "Thomas", "George", "Oscar",
	"James", "William", "Noah", "Alfiam", "Freddie", "Leo", "Archie", "Arthur",
	"Paul", "Steven", "Mark", "Andrew", "Kevin", "Brian", "Gary", "Timothy",
	"Patrick", "Sean", "Gregory", "Julian", "Marcus", "Lucas", "Victor", "Felix"
];

const lastNames = [
	"Smith", "Jones", "Williams", "Taylor", "Brown", "Davies", "Evans", "Wilson",
	"Thomas", "Roberts", "Johnson", "Lewis", "Walker", "Robinson", "Wood",
	"Thompson", "Wright", "White", "Watson", "Kinnaird", "Alcock", "Crompton",
	"Green", "Baker", "Adams", "Campbell", "Phillips", "Murray", "Parker", "Collins",
	"Graham", "Stewarts", "Morris", "Morgan", "Bell", "Murphy", "Cook", "Bailey",
	"Richardson", "Cox", "Marshall", "Ward", "Foster", "Griffin", "Knight", "Scott",
	"Henderson", "Grant", "Elliott", "Fisher", "Reynolds", "Palmer", "Webb", "Hunt"
];

const traitList: PlayerTrait[] = [
	"COUNTER_ATTACKER", "SHORT_PASSER", "CLUTCH_FINISHER", "WING_WIZARD", 
	"IRON_DEFENDER", "MARATHON_MAN", "BOX_TO_BOX", "FREE_KICK_EXPERT", "SWEEPER_GK"
];

function randomInt(min: number, max: number): number {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDecimal(min: number, max: number): number {
	return Math.random() * (max - min) + min;
}

function getRandomElement<T>(arr: T[]): T {
	return arr[randomInt(0, arr.length - 1)];
}

function generateStats(position: Position, skill: number): PlayerStats {
	const getAttr = (base: number) =>
		Math.max(1, Math.min(20.99, base + randomDecimal(-3, 3)));

	const stats: PlayerStats = {
		finishing: getAttr(skill),
		creation: getAttr(skill),
		vision: getAttr(skill),
		pressing: getAttr(skill),
		intervention: getAttr(skill),
		impact: getAttr(skill),
		resistance: getAttr(skill),
		volume: getAttr(skill),
		explosivity: getAttr(skill),
	};

	switch (position) {
		case "GK":
			stats.goalkeeping = getAttr(skill + 4);
			stats.resistance = getAttr(skill + 2); // Good relief
			stats.finishing = getAttr(skill - 10);
			stats.creation = getAttr(skill - 5);
			break;
		case "DEF":
			stats.impact = getAttr(skill + 3);
			stats.intervention = getAttr(skill + 3);
			stats.finishing = getAttr(skill - 6);
			break;
		case "MID":
			stats.vision = getAttr(skill + 3);
			stats.creation = getAttr(skill + 2);
			stats.resistance = getAttr(skill + 2);
			break;
		case "FWD":
			stats.finishing = getAttr(skill + 4);
			stats.explosivity = getAttr(skill + 3);
			stats.intervention = getAttr(skill - 8);
			break;
	}
	return stats;
}

function calculateValue(skill: number, age: number): number {
	let baseValue = Math.pow(skill, 4.2) * 2;
	if (age < 23) baseValue *= 1.5;
	if (age > 32) baseValue *= 0.6;
	return Math.floor(baseValue / 100);
}

function calculateWage(skill: number): number {
	return Math.floor(Math.pow(skill, 2.5) * 2);
}

export function generatePlayer(
	targetSkill = 10,
	forcedPosition?: Position,
): Omit<Player, "id" | "saveId" | "teamId"> {
	const firstName = getRandomElement(firstNames);
	const lastName = getRandomElement(lastNames);
	const age = randomInt(16, 38);

	let position = forcedPosition;
	if (!position) {
		const roll = Math.random();
		if (roll < 0.1) position = "GK";
		else if (roll < 0.4) position = "DEF";
		else if (roll < 0.7) position = "MID";
		else position = "FWD";
	}

	let side: "L" | "C" | "R" = "C";
	if (position !== "GK") {
		const sideRoll = Math.random();
		if (sideRoll < 0.25) side = "L";
		else if (sideRoll > 0.75) side = "R";
	}

	const skill = Math.max(1, Math.min(20, targetSkill + randomDecimal(-2, 2)));
	const stats = generateStats(position, skill);

	// Traits generation (0-2 traits based on skill)
	const traits: PlayerTrait[] = [];
	const traitChance = skill / 20;
	if (Math.random() < traitChance) {
		traits.push(getRandomElement(traitList));
		if (Math.random() < traitChance * 0.3) {
			let secondTrait = getRandomElement(traitList);
			if (secondTrait !== traits[0]) traits.push(secondTrait);
		}
	}

	const dna = `${randomInt(0, 3)}-${randomInt(0, 5)}-${randomInt(0, 4)}-${randomInt(0, 3)}`;

	return {
		firstName,
		lastName,
		age,
		position,
		side,
		dna,
		skill,
		stats,
		traits,
		form: randomInt(3, 7),
		formBackground: randomInt(4, 6),
		experience: Math.max(1, Math.min(10, Math.floor(age / 3.5))),
		energy: 100,
		condition: randomInt(90, 100),
		morale: randomInt(70, 100),
		marketValue: calculateValue(skill, age),
		wage: calculateWage(skill),
		playedThisWeek: false,
		lastRatings: [],
	};
}

export function generateTeamSquad(
	teamSkill = 10,
): Omit<Player, "id" | "saveId" | "teamId">[] {
	const squad: Omit<Player, "id" | "saveId" | "teamId">[] = [];
	squad.push(generatePlayer(teamSkill, "GK"));
	squad.push(generatePlayer(teamSkill - 2, "GK"));
	for (let i = 0; i < 6; i++) squad.push(generatePlayer(teamSkill, "DEF"));
	for (let i = 0; i < 6; i++) squad.push(generatePlayer(teamSkill, "MID"));
	for (let i = 0; i < 4; i++) squad.push(generatePlayer(teamSkill, "FWD"));
	return squad;
}
