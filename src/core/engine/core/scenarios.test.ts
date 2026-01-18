import { describe, it, expect } from "vitest";
import { simulateMatch } from "./simulator";
import { calculateTeamRatings } from "@/core/engine/converter";
import type { Player } from "@/core/db/db";
import { FORMATIONS, type FormationKey } from "./tactics";
import type { CoachMatchData } from "./coach-ai";

let globalIdCounter = 1;

/**
 * Génère un coach avec une stratégie spécifique
 */
const createCoach = (baseSkill: number, strategy?: "DEFENSIVE" | "BALANCED" | "OFFENSIVE"): CoachMatchData => {
	const strategies: ("DEFENSIVE" | "BALANCED" | "OFFENSIVE")[] = ["DEFENSIVE", "BALANCED", "OFFENSIVE"];
	return {
		management: Math.max(1, Math.min(20, baseSkill + (Math.random() * 4 - 2))),
		tactical: Math.max(1, Math.min(20, baseSkill + (Math.random() * 4 - 2))),
		preferredStrategy: strategy || strategies[Math.floor(Math.random() * strategies.length)],
	};
};

/**
 * Génère une équipe complète
 */
const createFullTeam = (
	name: string,
	targetSkill: number,
	formation: FormationKey,
    strategy?: "DEFENSIVE" | "BALANCED" | "OFFENSIVE"
): { name: string, coach: CoachMatchData, players: Player[], formation: FormationKey } => {
	
	const structure = FORMATIONS[formation];
	const players: Player[] = [];

	const addPlayer = (pos: any, side: any, isStarter: boolean) => {
		const individualSkill = Math.max(1, Math.min(20, targetSkill + (Math.random() * 3 - 1.5)));
		
        const stats: any = { 
            finishing: individualSkill + (pos === "FWD" ? 2 : 0),
            creation: individualSkill + (pos === "MID" ? 1 : 0),
            vision: individualSkill,
            pressing: individualSkill,
            intervention: individualSkill + (pos === "DEF" ? 2 : 0),
            impact: individualSkill,
            resistance: individualSkill,
            volume: individualSkill,
            explosivity: individualSkill,
            goalkeeping: pos === "GK" ? individualSkill + 3 : undefined,
        };

        const player: Partial<Player> = {
			id: globalIdCounter++,
			saveId: 1, teamId: globalIdCounter,
			firstName: "P", lastName: `${pos}-${globalIdCounter}`,
			age: 25, position: pos, side: side, dna: "0-0-0",
			skill: individualSkill, 
            morale: 80,
			marketValue: 1000, wage: 100, isStarter: isStarter,
			playedThisWeek: false, lastRatings: [], traits: [],
			stats: stats,
            form: 5, formBackground: 5, experience: 5, energy: 100, condition: 100, joinedSeason: 1, joinedDay: 1
		};

		players.push(player as Player);
	};

	for (let i = 0; i < structure.GK; i++) addPlayer("GK", "C", true);
	for (let i = 0; i < structure.DEF; i++) addPlayer("DEF", i === 0 ? "L" : i === structure.DEF - 1 ? "R" : "C", true);
	for (let i = 0; i < structure.MID; i++) addPlayer("MID", i === 0 ? "L" : i === structure.MID - 1 ? "R" : "C", true);
	for (let i = 0; i < structure.FWD; i++) addPlayer("FWD", i === 0 && structure.FWD > 1 ? "L" : i === structure.FWD - 1 && structure.FWD > 1 ? "R" : "C", true);
	
	// Remplaçants (7 pour avoir du choix)
	for (let i = 0; i < 7; i++) {
		const pos = i === 0 ? "GK" : i < 3 ? "DEF" : i < 5 ? "MID" : "FWD";
		addPlayer(pos, "C", false);
	}

	return { name, coach: createCoach(targetSkill, strategy), players, formation };
};

async function simulateSeason(numTeams: number, avgSkill: number, label: string) {
    const teams = Array.from({ length: numTeams }, (_, i) => {
        const formations: FormationKey[] = ["4-4-2", "4-3-3", "4-5-1", "3-5-2"];
        const randomFormation = formations[Math.floor(Math.random() * formations.length)];
        // Alterner les stratégies pour voir les différences
        const strategy = i % 3 === 0 ? "OFFENSIVE" : i % 3 === 1 ? "DEFENSIVE" : "BALANCED";
        return createFullTeam(`Team ${i + 1}`, avgSkill, randomFormation, strategy);
    });

    let totalGoals = 0;
    let totalMatches = 0;
    let draws = 0;
    let substitutionsCount = 0;
    const scoreFreq: Record<string, number> = {};

    for (let i = 0; i < numTeams; i++) {
        for (let j = 0; j < numTeams; j++) {
            if (i === j) continue;
            const home = teams[i];
            const away = teams[j];

            const hPlayers = JSON.parse(JSON.stringify(home.players));
            const aPlayers = JSON.parse(JSON.stringify(away.players));

            const homeRatings = calculateTeamRatings(hPlayers, "NORMAL", home.coach.preferredStrategy, 1, 1, 1, home.coach.tactical, home.coach.preferredStrategy, 0, home.coach as any);
            const awayRatings = calculateTeamRatings(aPlayers, "NORMAL", away.coach.preferredStrategy, 1, 1, 1, away.coach.tactical, away.coach.preferredStrategy, 0, away.coach as any);

            const res = await simulateMatch(
                homeRatings, awayRatings, i, j,
                hPlayers, aPlayers, home.name, away.name,
                home.coach, away.coach
            );

            totalGoals += res.homeScore + res.awayScore;
            totalMatches++;
            if (res.homeScore === res.awayScore) draws++;
            const k = `${res.homeScore}-${res.awayScore}`;
            scoreFreq[k] = (scoreFreq[k] || 0) + 1;
            
            // Compter les remplacements
            substitutionsCount += res.events.filter(e => e.type === "SPECIAL" && e.description.includes("🔄")).length;
        }
    }

    const avgGoals = totalGoals / totalMatches;
    const drawPct = (draws / totalMatches) * 100;
    const avgSubs = substitutionsCount / (totalMatches * 2);
    
    console.log(`\n=== ${label} (${totalMatches} Matches) ===`);
    console.log(`Avg Goals: ${avgGoals.toFixed(2)} | Draws: ${drawPct.toFixed(1)}% | Avg Subs/Team: ${avgSubs.toFixed(1)}`);
    console.log(`Top Scores:`, Object.entries(scoreFreq).sort((a,b)=>b[1]-a[1]).slice(0, 5).map(e => `${e[0]} (${e[1]})`).join(", "));

    return { avgGoals, drawPct, scoreFreq };
}

describe("Engine Realism & Strategy Tests", () => {

    it("Comparison: Offensive vs Defensive Coaches", async () => {
        const offCoach = createFullTeam("Offensive FC", 12, "4-3-3", "OFFENSIVE");
        const defCoach = createFullTeam("Defensive Park", 12, "5-4-1", "DEFENSIVE");

        let offWins = 0;
        let defWins = 0;
        let totalSubsOff = 0;
        let totalSubsDef = 0;

        for (let i = 0; i < 50; i++) {
            const hPlayers = JSON.parse(JSON.stringify(offCoach.players));
            const aPlayers = JSON.parse(JSON.stringify(defCoach.players));
            
            const hRatings = calculateTeamRatings(hPlayers, "NORMAL", "OFFENSIVE", 1, 1, 1, offCoach.coach.tactical, "OFFENSIVE", 0, offCoach.coach as any);
            const aRatings = calculateTeamRatings(aPlayers, "NORMAL", "DEFENSIVE", 1, 1, 1, defCoach.coach.tactical, "DEFENSIVE", 0, defCoach.coach as any);

            const res = await simulateMatch(hRatings, aRatings, 1, 2, hPlayers, aPlayers, "OFF", "DEF", offCoach.coach, defCoach.coach);
            
            if (res.homeScore > res.awayScore) offWins++;
            else if (res.awayScore > res.homeScore) defWins++;
            
            totalSubsOff += res.events.filter(e => e.teamId === 1 && e.description.includes("🔄")).length;
            totalSubsDef += res.events.filter(e => e.teamId === 2 && e.description.includes("🔄")).length;
        }

        console.log(`\n=== Strategy Battle (50 Matches) ===`);
        console.log(`Offensive Wins: ${offWins} | Defensive Wins: ${defWins}`);
        console.log(`Avg Subs Offensive Coach: ${(totalSubsOff/50).toFixed(2)}`);
        console.log(`Avg Subs Defensive Coach: ${(totalSubsDef/50).toFixed(2)}`);
        
        // On s'attend à ce que les deux fassent des changements, mais différemment
        expect(totalSubsOff).toBeGreaterThan(0);
        expect(totalSubsDef).toBeGreaterThan(0);
    });

	it("Ecosystem Realism Check (Various levels)", async () => {
		await simulateSeason(6, 7.0, "Low Tier League");
		await simulateSeason(6, 15.0, "Elite League");
	});
});
