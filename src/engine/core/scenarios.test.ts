import { describe, expect, it } from "vitest";
import { simulateMatch, type CoachMatchData } from "./simulator";
import { calculateTeamRatings } from "../converter";
import type { TeamRatings, Player } from "./types";
import { FORMATIONS, type FormationKey } from "./tactics";

let globalIdCounter = 1;

const createFullTeam = (
	name: string,
	skill: number,
	formation: FormationKey,
	energy = 100,
	strategy: TeamRatings["strategy"] = "BALANCED",
	tactic: TeamRatings["tacticType"] = "NORMAL",
	coachStrategy: TeamRatings["strategy"] = "BALANCED",
	customStats: Partial<Player["stats"]> = {}
): { ratings: TeamRatings, players: Player[], initialEnergy: number } => {
	
	const structure = FORMATIONS[formation];
	const players: Player[] = [];

	const addPlayer = (pos: any, side: any, isStarter: boolean) => {
		players.push({
			id: globalIdCounter++,
			saveId: 1, teamId: 1,
			firstName: "P", lastName: `${pos}-${globalIdCounter}`,
			age: 25, position: pos, side: side, dna: "0-0-0",
			skill: skill, form: 5, formBackground: 5, experience: 5,
			energy: energy, condition: 100, morale: 80,
			marketValue: 1000, wage: 100, isStarter: isStarter,
			playedThisWeek: false, lastRatings: [], traits: [],
			stats: { 
				finishing: skill, creation: skill, vision: skill,
				pressing: skill, intervention: skill, impact: skill,
				resistance: skill, volume: skill, explosivity: skill,
				goalkeeping: pos === "GK" ? skill : undefined,
				...customStats
			},
		} as Player);
	};

	for (let i = 0; i < structure.GK; i++) addPlayer("GK", "C", true);
	for (let i = 0; i < structure.DEF; i++) addPlayer("DEF", i === 0 ? "L" : i === structure.DEF - 1 ? "R" : "C", true);
	for (let i = 0; i < structure.MID; i++) addPlayer("MID", i === 0 ? "L" : i === structure.MID - 1 ? "R" : "C", true);
	for (let i = 0; i < structure.FWD; i++) addPlayer("FWD", i === 0 && structure.FWD > 1 ? "L" : i === structure.FWD - 1 && structure.FWD > 1 ? "R" : "C", true);
	for (let i = 0; i < 5; i++) addPlayer(i === 0 ? "GK" : i === 1 ? "DEF" : i === 2 ? "MID" : "FWD", "C", false);

	const ratings = calculateTeamRatings(players, tactic, strategy, 1, new Date(), 10.0, coachStrategy);
	return { ratings, players, initialEnergy: energy };
};

async function runMatchUp(teamA: any, teamB: any, coachA?: CoachMatchData, coachB?: CoachMatchData, iterations = 100) {
	let winsA = 0, winsB = 0, draws = 0, goalsA = 0, goalsB = 0;
	for (let i = 0; i < iterations; i++) {
		teamA.players.forEach((p: Player) => p.energy = teamA.initialEnergy);
		teamB.players.forEach((p: Player) => p.energy = teamB.initialEnergy);
		const res = await simulateMatch(teamA.ratings, teamB.ratings, 1, 2, teamA.players, teamB.players, "A", "B", coachA, coachB);
		if (res.homeScore > res.awayScore) winsA++;
		else if (res.awayScore > res.homeScore) winsB++;
		else draws++;
		goalsA += res.homeScore;
		goalsB += res.awayScore;
	}
	return { winsA: (winsA/iterations)*100, winsB: (winsB/iterations)*100, draws: (draws/iterations)*100, avgGoalsA: goalsA/iterations, avgGoalsB: goalsB/iterations };
}

describe("Engine Platinum - Global Consistency Tests", () => {
	
	it("1. Mirror Match Consistency (4-4-2 vs 4-4-2)", async () => {
		const teamA = createFullTeam("A", 12, "4-4-2");
		const teamB = createFullTeam("B", 12, "4-4-2");
		const stats = await runMatchUp(teamA, teamB, undefined, undefined, 200);
		console.log(`[Mirror] Wins A: ${stats.winsA}% | Wins B: ${stats.winsB}% | Draws: ${stats.draws}%`);
		expect(Math.abs(stats.winsA - stats.winsB)).toBeLessThan(20);
		expect(stats.draws).toBeGreaterThan(15);
	});

	it("2. Division 1 (18) vs Division 6 (4)", async () => {
		const d1 = createFullTeam("D1", 18, "4-3-3");
		const d6 = createFullTeam("D6", 4, "5-4-1");
		const stats = await runMatchUp(d1, d6, undefined, undefined, 100);
		console.log(`[Hierarchy] D1 vs D6 -> Score: ${stats.avgGoalsA.toFixed(1)} - ${stats.avgGoalsB.toFixed(1)}`);
		expect(stats.winsA).toBeGreaterThan(90);
	});

	it("3. Tactical Clash: 4-4-2 vs 5-4-1 (The Bus)", async () => {
		const offense = createFullTeam("Offense", 12, "4-4-2");
		const bus = createFullTeam("Bus", 12, "5-4-1", 100, "DEFENSIVE", "CA");
		const stats = await runMatchUp(offense, bus, undefined, undefined, 100);
		console.log(`[Tactics] 4-4-2 vs 5-4-1 (CA) -> Draws: ${stats.draws}% | Bus Wins: ${stats.winsB}%`);
		expect(stats.draws).toBeGreaterThan(15); 
	});

	it("4. Home Advantage Impact over 100 matches", async () => {
		const teamA = createFullTeam("Home", 12, "4-4-2");
		const teamB = createFullTeam("Away", 12, "4-4-2");
		const stats = await runMatchUp(teamA, teamB, undefined, undefined, 200);
		console.log(`[HomeBonus] Home Wins: ${stats.winsA}% | Away Wins: ${stats.winsB}%`);
		expect(stats.winsA).toBeGreaterThan(stats.winsB);
	});

	it("5. Management Power (Substitution Impact)", async () => {
		const teamA = createFullTeam("ProCoach", 12, "4-4-2");
		const teamB = createFullTeam("NoobCoach", 12, "4-4-2");
		const coachA = { management: 18, tactical: 10, preferredStrategy: "BALANCED" as const };
		const coachB = { management: 2, tactical: 10, preferredStrategy: "BALANCED" as const };
		const stats = await runMatchUp(teamA, teamB, coachA, coachB, 100);
		console.log(`[Coaching] Management 18 vs 2 -> WinRate: ${stats.winsA}% vs ${stats.winsB}%`);
		expect(stats.winsA).toBeGreaterThan(stats.winsB);
	});

	it("6. Underdog Miracle (Tactical Genius)", async () => {
		const weak = createFullTeam("Weak", 10, "4-5-1");
		const strong = createFullTeam("Strong", 14, "4-3-3");
		const coachA = { management: 18, tactical: 18, preferredStrategy: "DEFENSIVE" as const };
		const stats = await runMatchUp(weak, strong, coachA, undefined, 100);
		console.log(`[Miracle] Weak+Genius vs Strong -> Weak Wins/Draws: ${stats.winsA + stats.draws}%`);
		expect(stats.winsA + stats.draws).toBeGreaterThan(15);
	});

	it("7. The 2-3-5 Pyramid Penalty (Boulevard)", async () => {
		const pyramid = createFullTeam("Pyramid", 12, "2-3-5");
		const standard = createFullTeam("Standard", 12, "4-4-2");
		const stats = await runMatchUp(standard, pyramid, undefined, { management: 10, tactical: 4, preferredStrategy: "BALANCED", formation: "2-3-5" }, 100);
		console.log(`[Boulevard] Goals vs 2-3-5: ${stats.avgGoalsA.toFixed(1)}`);
		expect(stats.avgGoalsA).toBeGreaterThan(1.0);
	});

	it("8. Goalkeeper Value (The Wall)", async () => {
		const teamA = createFullTeam("Shooter", 12, "4-3-3", 100, "BALANCED", "NORMAL", "BALANCED", { finishing: 18 });
		const teamB = createFullTeam("Wall", 12, "4-3-3", 100, "BALANCED", "NORMAL", "BALANCED", { goalkeeping: 18 });
		const stats = await runMatchUp(teamA, teamB, undefined, undefined, 100);
		console.log(`[Wall] Elite Striker vs Elite GK -> Avg Goals: ${stats.avgGoalsA.toFixed(1)}`);
		expect(stats.avgGoalsA).toBeLessThan(4.0);
	});

	it("9. Fatigue & Stamina Punishment", async () => {
		const fit = createFullTeam("Fit", 12, "4-4-2", 100);
		const tired = createFullTeam("Tired", 12, "4-4-2", 40); 
		const stats = await runMatchUp(fit, tired, undefined, undefined, 100);
		console.log(`[Fatigue] Fresh vs Tired (40%) -> WinRate: ${stats.winsA}%`);
		expect(stats.winsA).toBeGreaterThan(40);
	});

	it("10. Extreme Strategy: All-In", async () => {
		const teamA = createFullTeam("Risky", 12, "4-4-2");
		const coachA = { management: 10, tactical: 18, preferredStrategy: "BALANCED" as const };
		const teamB = createFullTeam("Normal", 12, "4-4-2");
		const stats = await runMatchUp(teamA, teamB, coachA, undefined, 100);
		console.log(`[Strategy] Tactical Coach WinRate: ${stats.winsA}%`);
		expect(stats.winsA).toBeGreaterThan(stats.winsB - 10);
	});

});
