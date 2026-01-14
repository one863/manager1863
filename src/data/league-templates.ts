import { CURRENT_DATA_VERSION, type Team, db } from "@/db/db";
import { getRandomElement } from "@/utils/math";
import { generateTeamSquad } from "./players-generator";

const clubPrefixes = [
	"London",
	"Manchester",
	"Sheffield",
	"Liverpool",
	"Birmingham",
	"Leeds",
	"Bristol",
	"Leicester",
	"Nottingham",
	"York",
	"Chester",
	"Oxford",
	"Cambridge",
	"Reading",
	"Bath",
	"Derby",
	"Hull",
	"Brighton",
	"Portsmouth",
	"Plymouth",
];

const clubSuffixes = [
	"FC",
	"United",
	"City",
	"Wanderers",
	"Rovers",
	"Town",
	"Athletic",
	"Rangers",
	"Albion",
	"Strollers",
	"Ramblers",
	"Celtic",
	"Argyle",
	"County",
];

const clubNames = [
	"The Wanderers",
	"Crystal Palace",
	"Old Etonians",
	"Royal Engineers",
	"Forest FC",
	"Barnes FC",
	"Kilburn FC",
	"Blackheath",
	"No Names",
];

function generateColor(): string {
	const letters = "0123456789ABCDEF";
	let color = "#";
	for (let i = 0; i < 6; i++) {
		color += letters[Math.floor(Math.random() * 16)];
	}
	return color;
}

/**
 * Génère un nom de club aléatoire réaliste.
 */
function generateRandomClubName(): string {
	if (Math.random() < 0.2) return getRandomElement(clubNames); // 20% noms historiques fixes

	const prefix = getRandomElement(clubPrefixes);
	const suffix = getRandomElement(clubSuffixes);
	return `${prefix} ${suffix}`;
}

export async function generateSeasonFixtures(
	saveId: number,
	leagueId: number,
	teamIds: number[],
) {
	const schedule = createSchedule(teamIds);
	const matchesToInsert: any[] = [];
	const startDay = 6;

	schedule.forEach((roundMatches, roundIndex) => {
		const day = startDay + roundIndex * 7;
		roundMatches.forEach(([homeId, awayId]) => {
			matchesToInsert.push({
				saveId,
				leagueId,
				homeTeamId: homeId,
				awayTeamId: awayId,
				homeScore: -1,
				awayScore: -1,
				date: new Date(),
				day: day,
				played: false,
			});
		});
	});

	const returnStartDay = startDay + schedule.length * 7 + 7;
	schedule.forEach((roundMatches, roundIndex) => {
		const day = returnStartDay + roundIndex * 7;
		roundMatches.forEach(([awayId, homeId]) => {
			matchesToInsert.push({
				saveId,
				leagueId,
				homeTeamId: homeId,
				awayTeamId: awayId,
				homeScore: -1,
				awayScore: -1,
				date: new Date(),
				day: day,
				played: false,
			});
		});
	});

	await db.matches.bulkAdd(matchesToInsert);
}

function createSchedule(teams: number[]): [number, number][][] {
	const schedule: [number, number][][] = [];
	const numberOfTeams = teams.length;
	const half = numberOfTeams / 2;
	const teamIds = [...teams];
	for (let round = 0; round < numberOfTeams - 1; round++) {
		const roundMatches: [number, number][] = [];
		for (let i = 0; i < half; i++) {
			const home = teamIds[i];
			const away = teamIds[numberOfTeams - 1 - i];
			if (round % 2 === 0) roundMatches.push([home, away]);
			else roundMatches.push([away, home]);
		}
		schedule.push(roundMatches);
		teamIds.splice(1, 0, teamIds.pop()!);
	}
	return schedule;
}

export async function generateLeagueStructure(
	saveId: number,
	userTeamId: number,
	userTeamName: string,
) {
	const leagueId = await db.leagues.add({
		saveId,
		name: "The Football Association League",
		level: 1,
		promotionSpots: 1,
		relegationSpots: 2,
	});

	await db.teams.update(userTeamId, {
		leagueId: leagueId as number,
		reputation: 50,
		fanCount: 150,
		confidence: 80,
		stadiumName: `${userTeamName} Ground`,
		stadiumCapacity: 800,
		stadiumLevel: 1,
		budget: 1000,
		pendingIncome: 0,
		tacticType: "NORMAL",
		formation: "4-4-2",
		seasonGoal: "MID_TABLE",
		seasonGoalStatus: "PENDING",
		goalsFor: 0,
		goalsAgainst: 0,
		goalDifference: 0,
	});

	const opponentsCount = 9;
	const teamIds: number[] = [userTeamId];
	const usedNames = new Set([userTeamName]);

	for (let i = 0; i < opponentsCount; i++) {
		let aiTeamName = generateRandomClubName();
		// Éviter les doublons
		while (usedNames.has(aiTeamName)) {
			aiTeamName = generateRandomClubName();
		}
		usedNames.add(aiTeamName);

		const aiTeam: Omit<Team, "id"> = {
			saveId,
			name: aiTeamName,
			leagueId: leagueId as number,
			managerName: "CPU Manager",
			primaryColor: generateColor(),
			secondaryColor: generateColor(),
			matchesPlayed: 0,
			points: 0,
			goalsFor: 0,
			goalsAgainst: 0,
			goalDifference: 0,
			budget: 500,
			pendingIncome: 0,
			reputation: 40 + Math.random() * 20,
			fanCount: 100 + Math.random() * 100,
			confidence: 70,
			stadiumName: `${aiTeamName} Ground`,
			stadiumCapacity: 500,
			stadiumLevel: 1,
			version: CURRENT_DATA_VERSION,
			tacticType: "NORMAL",
			formation: "4-4-2",
		};

		const aiTeamId = await db.teams.add(aiTeam as Team);
		teamIds.push(aiTeamId as number);

		const playersToInsert: any[] = [];
		const squad = generateTeamSquad(Math.floor(Math.random() * 10) + 40);
		squad.forEach((player) =>
			playersToInsert.push({ ...player, saveId, teamId: aiTeamId }),
		);
		await db.players.bulkAdd(playersToInsert);
	}

	await generateSeasonFixtures(saveId, leagueId as number, teamIds);
	return leagueId;
}
