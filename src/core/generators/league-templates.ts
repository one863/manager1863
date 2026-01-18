import { db } from "@/core/db/db";

// Structure simplifiée pour les templates de ligues
// 5 divisions de 10 équipes.

interface LeagueTemplate {
	name: string;
	level: number;
	reputation: number;
	promotionSpots: number;
	relegationSpots: number;
	teamsCount: number; // Nombre de clubs à générer
	teamNames: string[];
}

export const LEAGUE_TEMPLATES: LeagueTemplate[] = [
	{
		name: "Division 1",
		level: 1,
		reputation: 120,
		promotionSpots: 0,
		relegationSpots: 2,
		teamsCount: 10,
		teamNames: [
			"London FC", "Royal Albion", "United Steam", "Victoria FC", "Iron Steamers",
			"Railway United", "Engineers FC", "London Wasps", "The Gunners", "Borough United",
		],
	},
	{
		name: "Division 2",
		level: 2,
		reputation: 100,
		promotionSpots: 2,
		relegationSpots: 2,
		teamsCount: 10,
		teamNames: [
			"Kensington FC", "Wanderers FC", "Royal Engineers", "Civil Service", "Crusaders",
			"No Names Club", "Barnes FC", "Crystal Palace", "Blackheath", "Perceval House",
		],
	},
	{
		name: "Division 3",
		level: 3,
		reputation: 80,
		promotionSpots: 2,
		relegationSpots: 2,
		teamsCount: 10,
		teamNames: [
			"Clapham Rovers", "Upton Park", "Maidenhead", "Great Marlow", "Reigate Priory",
			"Swifts", "Old Etonians", "Oxford University", "Cambridge University", "Hitchin",
		],
	},
	{
		name: "Division 4",
		level: 4,
		reputation: 60,
		promotionSpots: 2,
		relegationSpots: 2,
		teamsCount: 10,
		teamNames: [
			"Bristol City", "Cardiff Town", "Swansea United", "Plymouth Argyle", "Exeter Chiefs",
			"Southampton FC", "Portsmouth FC", "Brighton & Hove", "Reading FC", "Oxford City",
		],
	},
	{
		name: "Division 5",
		level: 5,
		reputation: 40,
		promotionSpots: 2,
		relegationSpots: 0,
		teamsCount: 10,
		teamNames: [
			"Kent United", "Surrey City", "Essex Wanderers", "Sussex Albion", "Dorset FC",
			"Cornwall Rovers", "Hampshire Athletic", "Devon United", "Somerset FC", "Berkshire United",
		],
	},
];

export async function generateSeasonFixtures(
	saveId: number,
	leagueId: number,
	teamIds: number[],
) {
	// Algorithme Round-Robin simple (Aller-Retour)
	if (teamIds.length % 2 !== 0) {
		teamIds.push(-1); // Bye
	}

	const numRounds = (teamIds.length - 1) * 2;
	const halfRounds = numRounds / 2;
	const matchesPerRound = teamIds.length / 2;

	const fixtures = [];
	let currentDay = 6; // Premier match au jour 6

	// Aller
	for (let round = 0; round < halfRounds; round++) {
		const isLastRound = round === halfRounds - 1;
		const roundPressure = Math.min(100, (round / halfRounds) * 50); // Pression monte au fil de la saison

		for (let match = 0; match < matchesPerRound; match++) {
			const home = teamIds[match];
			const away = teamIds[teamIds.length - 1 - match];

			if (home !== -1 && away !== -1) {
				fixtures.push({
					saveId,
					leagueId,
					day: currentDay,
					homeTeamId: home,
					awayTeamId: away,
					played: false,
					homeScore: 0,
					awayScore: 0,
					pressure: Math.floor(roundPressure + (isLastRound ? 40 : 0)) // Gros pic en fin de championnat
				});
			}
		}
		// Rotation (sauf le premier élément)
		teamIds.splice(1, 0, teamIds.pop()!);
		currentDay += 7; // Un match par semaine
	}

	// Retour (miroir de l'aller avec inversion domicile/extérieur)
	const returnFixtures = fixtures.map((f, idx) => {
		const roundIdx = Math.floor(idx / matchesPerRound) + halfRounds;
		const isLastRound = roundIdx === numRounds - 1;
		const roundPressure = Math.min(100, (roundIdx / numRounds) * 70); 

		return {
			...f,
			day: f.day + halfRounds * 7,
			homeTeamId: f.awayTeamId,
			awayTeamId: f.homeTeamId,
			pressure: Math.floor(roundPressure + (isLastRound ? 30 : 0))
		};
	});
	
	await db.matches.bulkAdd([...fixtures, ...returnFixtures]);
}
