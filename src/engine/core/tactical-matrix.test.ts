import { describe, it } from "vitest";
import { simulateMatch } from "./simulator";
import { calculateTeamRatings } from "../converter";
import type { TeamRatings, Player } from "./types";
import { FORMATIONS, type FormationKey } from "./tactics";

const FORMATION_LIST = Object.keys(FORMATIONS) as FormationKey[];

// Génère une équipe standard avec une formation donnée
const createStandardTeam = (formation: FormationKey): { ratings: TeamRatings, players: Player[] } => {
	const structure = FORMATIONS[formation];
	const players: Player[] = [];
	let idCounter = 1;
	const skill = 6.0; // Niveau égal pour tout le monde

	const addPlayer = (pos: any, side: any) => {
		players.push({
			id: idCounter++,
			saveId: 1,
			teamId: 1,
			firstName: "P",
			lastName: `${pos}`,
			age: 25,
			position: pos,
			side: side,
			dna: "0-0-0",
			skill: skill,
			form: 5,
			formBackground: 5,
			experience: 5,
			energy: 100,
			condition: 100,
			morale: 80,
			marketValue: 1000,
			wage: 100,
			isStarter: true,
			playedThisWeek: false,
			lastRatings: [],
			stats: { 
				stamina: 7, playmaking: skill, defense: skill, speed: 7, 
				head: 7, technique: skill, scoring: skill, setPieces: 7, goalkeeping: skill 
			},
		} as Player);
	};

	for (let i = 0; i < structure.GK; i++) addPlayer("GK", "C");
	for (let i = 0; i < structure.DEF; i++) addPlayer("DEF", i === 0 ? "L" : i === structure.DEF - 1 ? "R" : "C");
	for (let i = 0; i < structure.MID; i++) addPlayer("MID", i === 0 ? "L" : i === structure.MID - 1 ? "R" : "C");
	for (let i = 0; i < structure.FWD; i++) addPlayer("FWD", i === 0 && structure.FWD > 1 ? "L" : i === structure.FWD - 1 && structure.FWD > 1 ? "R" : "C");

	// Tous en stratégie BALANCED et tactique NORMAL pour isoler l'effet de la formation
	const ratings = calculateTeamRatings(players, "NORMAL", "BALANCED", 1, new Date(), 5.0);

	return { ratings, players };
};

describe("Full Tactical Matrix (Round Robin)", () => {
	it("Should generate a win-rate matrix for all formations", async () => {
		console.log("\n====== TACTICAL MATRIX (Home Win Rate %) ======");
		console.log("Row: Home Team / Col: Away Team\n");

		// Header
		let header = "      ";
		FORMATION_LIST.forEach(f => header += ` | ${f}`);
		console.log(header);
		console.log("-".repeat(header.length));

		for (const homeF of FORMATION_LIST) {
			let rowString = `${homeF.padEnd(6)}`;
			const homeTeam = createStandardTeam(homeF);

			for (const awayF of FORMATION_LIST) {
				const awayTeam = createStandardTeam(awayF);
				
				let homeWins = 0;
				const ITERATIONS = 100; // 100 matchs par duel

				for (let i = 0; i < ITERATIONS; i++) {
					const res = await simulateMatch(
						homeTeam.ratings, awayTeam.ratings, 1, 2, 
						homeTeam.players, awayTeam.players, 
						"H", "A"
					);
					if (res.homeScore > res.awayScore) homeWins++;
				}

				const winRate = homeWins; // sur 100, c'est direct le %
				// Coloration basique pour la lisibilité
				const valStr = winRate.toString().padStart(3);
				rowString += ` |  ${valStr}% `;
			}
			console.log(rowString);
		}
		console.log("\n===============================================\n");
	});
});
