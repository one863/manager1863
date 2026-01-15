import { describe, expect, it } from "vitest";
import { simulateMatch } from "./simulator";
import { calculateTeamRatings } from "../converter";
import type { TeamRatings, Player } from "./types";
import { FORMATIONS, type FormationKey } from "./tactics";

// --- Utilitaires de génération ---

const createFullTeam = (
	name: string,
	skill: number,
	formation: FormationKey,
	energy = 100,
	strategy: TeamRatings["strategy"] = "BALANCED",
	tactic: TeamRatings["tacticType"] = "NORMAL"
): { ratings: TeamRatings, players: Player[] } => {
	
	const structure = FORMATIONS[formation];
	const players: Player[] = [];
	let idCounter = 1;

	const addPlayer = (pos: any, side: any) => {
		players.push({
			id: idCounter++,
			saveId: 1,
			teamId: 1,
			firstName: "P",
			lastName: `${pos}-${idCounter}`,
			age: 25,
			position: pos,
			side: side,
			dna: "0-0-0",
			skill: skill,
			form: 5,
			formBackground: 5,
			experience: 5,
			energy: energy,
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

	const ratings = calculateTeamRatings(players, tactic, strategy, 1, new Date(), 8.0);

	return { ratings, players };
};

async function runMatchUp(teamA: any, teamB: any, iterations = 100) {
	let winsA = 0;
	let winsB = 0;
	let draws = 0;
	let goalsA = 0;
	let goalsB = 0;
	let possessionA = 0;

	for (let i = 0; i < iterations; i++) {
		const res = await simulateMatch(
			teamA.ratings, teamB.ratings, 1, 2, 
			teamA.players, teamB.players, 
			"A", "B"
		);

		if (res.homeScore > res.awayScore) winsA++;
		else if (res.awayScore > res.homeScore) winsB++;
		else draws++;

		goalsA += res.homeScore;
		goalsB += res.awayScore;
		possessionA += res.homePossession;
	}

	return {
		winsA: (winsA / iterations) * 100,
		winsB: (winsB / iterations) * 100,
		draws: (draws / iterations) * 100,
		avgGoalsA: goalsA / iterations,
		avgGoalsB: goalsB / iterations,
		possessionA: possessionA / iterations
	};
}

describe("Engine Regression Tests (v2.1 Gold)", () => {
	
	it("Should be fair in a Mirror Match (4-4-2 Balanced vs 4-4-2 Balanced)", async () => {
		console.log("\n--- TEST: MIRROR MATCH ---");
		const teamA = createFullTeam("A", 6, "4-4-2");
		const teamB = createFullTeam("B", 6, "4-4-2");
		
		const stats = await runMatchUp(teamA, teamB, 200);
		console.log(`Wins A: ${stats.winsA.toFixed(1)}% | Wins B: ${stats.winsB.toFixed(1)}% | Draws: ${stats.draws.toFixed(1)}%`);
		
		const gap = Math.abs(stats.winsA - stats.winsB);
		expect(gap).toBeLessThan(15);
		expect(stats.possessionA).toBeGreaterThan(48);
		expect(stats.possessionA).toBeLessThan(55);
	});

	it("Should respect hierarchy: Giant (9) vs Minnow (3)", async () => {
		console.log("\n--- TEST: GIANT vs MINNOW ---");
		const giant = createFullTeam("Giant", 9, "4-3-3");
		const minnow = createFullTeam("Minnow", 3, "5-4-1");
		
		const stats = await runMatchUp(giant, minnow, 100);
		console.log(`Giant Wins: ${stats.winsA.toFixed(1)}% | Minnow Wins: ${stats.winsB.toFixed(1)}%`);
		console.log(`Avg Score: ${stats.avgGoalsA.toFixed(1)} - ${stats.avgGoalsB.toFixed(1)}`);
		
		// Attente ajustée à 65% car le Minnow joue le Bus (5-4-1)
		expect(stats.winsA).toBeGreaterThan(65);
		expect(stats.avgGoalsA).toBeGreaterThan(2.0);
		expect(stats.avgGoalsB).toBeLessThan(1.5);
	});

	it("Should punish exhausted teams: Fresh (100%) vs Tired (30%)", async () => {
		console.log("\n--- TEST: FRESH vs TIRED ---");
		const fresh = createFullTeam("Fresh", 6, "4-4-2", 100);
		const tired = createFullTeam("Tired", 6, "4-4-2", 30);
		
		const stats = await runMatchUp(fresh, tired, 100);
		console.log(`Fresh Wins: ${stats.winsA.toFixed(1)}% | Tired Wins: ${stats.winsB.toFixed(1)}%`);
		
		expect(stats.winsA).toBeGreaterThan(80);
		expect(stats.avgGoalsB).toBeLessThan(0.5);
	});

	it("Should respect tactical structure: 3-5-2 vs 4-4-2 (Possession battle)", async () => {
		console.log("\n--- TEST: 3-5-2 vs 4-4-2 ---");
		const f352 = createFullTeam("3-5-2", 6, "3-5-2");
		const f442 = createFullTeam("4-4-2", 6, "4-4-2");
		
		const stats = await runMatchUp(f352, f442, 100);
		console.log(`3-5-2 Possession: ${stats.possessionA.toFixed(1)}% | 4-4-2 Possession: ${(100 - stats.possessionA).toFixed(1)}%`);
		
		expect(stats.possessionA).toBeGreaterThan(51);
	});

});
