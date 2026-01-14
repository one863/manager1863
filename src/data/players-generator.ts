import type { Player, PlayerStats } from "@/db/db";

const firstNames = [
	"Arthur",
	"William",
	"George",
	"Thomas",
	"James",
	"John",
	"Charles",
	"Henry",
	"Edward",
	"Frederick",
	"Walter",
	"Albert",
	"Robert",
	"Joseph",
	"Samuel",
	"Alfred",
	"Harry",
	"Frank",
	"Richard",
	"Ernest",
	"David",
	"Peter",
	"Hugh",
];

const lastNames = [
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
	"Kinnaird",
	"Alcock",
	"Crompton",
];

export type Position = "GK" | "DEF" | "MID" | "FWD";

function randomInt(min: number, max: number): number {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomElement<T>(arr: T[]): T {
	return arr[randomInt(0, arr.length - 1)];
}

function generateStats(position: Position, skill: number): PlayerStats {
	const getAttr = (base: number) =>
		Math.max(1, Math.min(99, base + randomInt(-15, 15)));

	const stats: PlayerStats = {
		stamina: getAttr(skill),
		playmaking: getAttr(skill),
		defense: getAttr(skill),
		speed: getAttr(skill),
		head: getAttr(skill),
		technique: getAttr(skill),
		scoring: getAttr(skill),
		setPieces: getAttr(skill),
		// Legacy support
		strength: getAttr(skill),
		dribbling: getAttr(skill),
		passing: getAttr(skill),
		shooting: getAttr(skill),
	};

	switch (position) {
		case "GK":
			stats.defense = getAttr(skill + 20);
			stats.playmaking = getAttr(skill - 10);
			stats.scoring = getAttr(skill - 30);
			stats.passing = stats.playmaking;
			stats.shooting = stats.scoring;
			break;
		case "DEF":
			stats.defense = getAttr(skill + 15);
			stats.head = getAttr(skill + 10);
			stats.playmaking = getAttr(skill - 5);
			stats.scoring = getAttr(skill - 20);
			stats.strength = stats.head;
			stats.passing = stats.playmaking;
			stats.shooting = stats.scoring;
			break;
		case "MID":
			stats.playmaking = getAttr(skill + 15);
			stats.stamina = getAttr(skill + 10);
			stats.technique = getAttr(skill + 5);
			stats.defense = getAttr(skill - 5);
			stats.passing = stats.playmaking;
			stats.dribbling = stats.technique;
			break;
		case "FWD":
			stats.scoring = getAttr(skill + 20);
			stats.speed = getAttr(skill + 10);
			stats.technique = getAttr(skill + 5);
			stats.defense = getAttr(skill - 20);
			stats.shooting = stats.scoring;
			stats.dribbling = stats.technique;
			break;
	}
	return stats;
}

function calculateValue(skill: number, age: number): number {
	let baseValue = skill * skill * 2;
	if (age < 23) baseValue *= 1.5;
	if (age > 32) baseValue *= 0.6;
	return Math.floor(baseValue / 10);
}

function calculateWage(skill: number): number {
	return Math.floor(skill / 5);
}

export function generatePlayer(
	targetSkill = 50,
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

	// --- GÉNÉRATION DU COTÉ PRÉFÉRENTIEL ---
	let side: "L" | "C" | "R" = "C";
	if (position === "GK") {
		side = "C";
	} else {
		const sideRoll = Math.random();
		let leftProb = 0.25;
		let rightProb = 0.25;

		if (position === "MID") {
			leftProb = 0.3;
			rightProb = 0.3;
		}

		if (sideRoll < leftProb) side = "L";
		else if (sideRoll > 1 - rightProb) side = "R";
		else side = "C";
	}

	const skill = Math.max(1, Math.min(99, targetSkill + randomInt(-10, 10)));
	const stats = generateStats(position, skill);

	const skin = randomInt(0, 3);
	const hair = randomInt(0, 5);
	const facial = randomInt(0, 4);
	const eyes = randomInt(0, 3);
	const dna = `${skin}-${hair}-${facial}-${eyes}`;

	return {
		firstName,
		lastName,
		age,
		position,
		side,
		dna,
		skill,
		stats,
		energy: 100,
		condition: randomInt(90, 100),
		morale: randomInt(70, 100),
		marketValue: calculateValue(skill, age),
		wage: calculateWage(skill),
	};
}

export function generateTeamSquad(
	teamSkill = 50,
): Omit<Player, "id" | "saveId" | "teamId">[] {
	const squad: Omit<Player, "id" | "saveId" | "teamId">[] = [];

	squad.push(generatePlayer(teamSkill, "GK"));
	squad.push(generatePlayer(teamSkill - 5, "GK"));

	for (let i = 0; i < 5; i++) squad.push(generatePlayer(teamSkill, "DEF"));
	for (let i = 0; i < 4; i++) squad.push(generatePlayer(teamSkill, "MID"));
	for (let i = 0; i < 4; i++) squad.push(generatePlayer(teamSkill, "FWD"));

	return squad;
}
