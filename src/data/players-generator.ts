import type { Player, PlayerStats } from "@/db/db";

const firstNames = [
	"Arthur", "William", "George", "Thomas", "James", "John", "Charles", "Henry",
	"Edward", "Frederick", "Walter", "Albert", "Robert", "Joseph", "Samuel",
	"Alfred", "Harry", "Frank", "Richard", "Ernest", "David", "Peter", "Hugh",
];

const lastNames = [
	"Smith", "Jones", "Williams", "Taylor", "Brown", "Davies", "Evans", "Wilson",
	"Thomas", "Roberts", "Johnson", "Lewis", "Walker", "Robinson", "Wood",
	"Thompson", "Wright", "White", "Watson", "Kinnaird", "Alcock", "Crompton",
];

export type Position = "GK" | "DEF" | "MID" | "FWD";

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
		Math.max(1, Math.min(10.99, base + randomDecimal(-1.5, 1.5)));

	const stats: PlayerStats = {
		stamina: getAttr(skill),
		playmaking: getAttr(skill),
		defense: getAttr(skill),
		speed: getAttr(skill),
		head: getAttr(skill),
		technique: getAttr(skill),
		scoring: getAttr(skill),
		setPieces: getAttr(skill),
		strength: getAttr(skill),
		dribbling: getAttr(skill),
		passing: getAttr(skill),
		shooting: getAttr(skill),
	};

	switch (position) {
		case "GK":
			stats.defense = getAttr(skill + 2);
			stats.playmaking = getAttr(skill - 1);
			stats.scoring = getAttr(skill - 3);
			stats.passing = stats.playmaking;
			stats.shooting = stats.scoring;
			break;
		case "DEF":
			stats.defense = getAttr(skill + 1.5);
			stats.head = getAttr(skill + 1);
			stats.playmaking = getAttr(skill - 0.5);
			stats.scoring = getAttr(skill - 2);
			stats.strength = stats.head;
			stats.passing = stats.playmaking;
			stats.shooting = stats.scoring;
			break;
		case "MID":
			stats.playmaking = getAttr(skill + 1.5);
			stats.stamina = getAttr(skill + 1);
			stats.technique = getAttr(skill + 0.5);
			stats.defense = getAttr(skill - 0.5);
			stats.passing = stats.playmaking;
			stats.dribbling = stats.technique;
			break;
		case "FWD":
			stats.scoring = getAttr(skill + 2);
			stats.speed = getAttr(skill + 1);
			stats.technique = getAttr(skill + 0.5);
			stats.defense = getAttr(skill - 2);
			stats.shooting = stats.scoring;
			stats.dribbling = stats.technique;
			break;
	}
	return stats;
}

function calculateValue(skill: number, age: number): number {
	let baseValue = Math.pow(skill, 4) * 10;
	if (age < 23) baseValue *= 1.5;
	if (age > 32) baseValue *= 0.6;
	return Math.floor(baseValue / 100);
}

function calculateWage(skill: number): number {
	return Math.floor(Math.pow(skill, 3) / 2);
}

export function generatePlayer(
	targetSkill = 5,
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

	const skill = Math.max(1, Math.min(10.99, targetSkill + randomDecimal(-1, 1)));
	const stats = generateStats(position, skill);

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
		form: randomInt(3, 7),
		formBackground: randomInt(4, 6), // AJOUTÉ
		experience: Math.max(1, Math.min(10, Math.floor(age / 3.5))),
		energy: 100,
		condition: randomInt(90, 100),
		morale: randomInt(70, 100),
		marketValue: calculateValue(skill, age),
		wage: calculateWage(skill),
		playedThisWeek: false, // AJOUTÉ
		lastRatings: [], // AJOUTÉ
	};
}

export function generateTeamSquad(
	teamSkill = 5,
): Omit<Player, "id" | "saveId" | "teamId">[] {
	const squad: Omit<Player, "id" | "saveId" | "teamId">[] = [];
	squad.push(generatePlayer(teamSkill, "GK"));
	squad.push(generatePlayer(teamSkill - 0.5, "GK"));
	for (let i = 0; i < 5; i++) squad.push(generatePlayer(teamSkill, "DEF"));
	for (let i = 0; i < 4; i++) squad.push(generatePlayer(teamSkill, "MID"));
	for (let i = 0; i < 4; i++) squad.push(generatePlayer(teamSkill, "FWD"));
	return squad;
}
