import { describe, it, expect } from "vitest";
import { simulateMatch, type CoachMatchData } from "./simulator";
import { calculateTeamRatings } from "@/core/engine/converter";
import type { Player } from "@/core/db/db";
import { FORMATIONS, type FormationKey } from "./tactics";

let globalIdCounter = 1;

/**
 * Génère un coach aléatoire
 */
const createRandomCoach = (baseSkill: number): CoachMatchData => {
	const strategies: ("DEFENSIVE" | "BALANCED" | "OFFENSIVE")[] = ["DEFENSIVE", "BALANCED", "OFFENSIVE"];
	return {
		management: Math.max(1, Math.min(20, baseSkill + (Math.random() * 4 - 2))),
		tactical: Math.max(1, Math.min(20, baseSkill + (Math.random() * 4 - 2))),
		preferredStrategy: strategies[Math.floor(Math.random() * strategies.length)],
	};
};

/**
 * Génère une équipe complète
 * @param incompleteData Si true, supprime condition/experience/form pour tester la robustesse
 */
const createFullTeam = (
	name: string,
	targetSkill: number,
	formation: FormationKey,
    incompleteData = false
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
		};

        // Si on veut des données complètes (cas normal)
        if (!incompleteData) {
            player.form = 5;
            player.formBackground = 5;
            player.experience = 5;
            player.energy = 100;
            player.condition = 100;
            player.joinedSeason = 1;
            player.joinedDay = 1;
        } 
        // Sinon, on laisse ces champs undefined pour simuler le bug

		players.push(player as Player);
	};

	// 11 Titulaires
	for (let i = 0; i < structure.GK; i++) addPlayer("GK", "C", true);
	for (let i = 0; i < structure.DEF; i++) addPlayer("DEF", i === 0 ? "L" : i === structure.DEF - 1 ? "R" : "C", true);
	for (let i = 0; i < structure.MID; i++) addPlayer("MID", i === 0 ? "L" : i === structure.MID - 1 ? "R" : "C", true);
	for (let i = 0; i < structure.FWD; i++) addPlayer("FWD", i === 0 && structure.FWD > 1 ? "L" : i === structure.FWD - 1 && structure.FWD > 1 ? "R" : "C", true);
	
	// Remplaçants
	for (let i = 0; i < 5; i++) {
		const pos = i === 0 ? "GK" : "MID";
		addPlayer(pos, "C", false);
	}

	return { name, coach: createRandomCoach(targetSkill), players, formation };
};

async function simulateSeason(numTeams: number, avgSkill: number, label: string) {
    const teams = Array.from({ length: numTeams }, (_, i) => {
        const formations: FormationKey[] = ["4-4-2", "4-3-3", "4-5-1", "3-5-2"];
        const randomFormation = formations[Math.floor(Math.random() * formations.length)];
        return createFullTeam(`Team ${i + 1}`, avgSkill, randomFormation);
    });

    let totalGoals = 0;
    let totalMatches = 0;
    let draws = 0;
    const scoreFreq: Record<string, number> = {};

    for (let i = 0; i < numTeams; i++) {
        for (let j = 0; j < numTeams; j++) {
            if (i === j) continue;
            const home = teams[i];
            const away = teams[j];

            // Setup Ratings
            const hPlayers = JSON.parse(JSON.stringify(home.players));
            const aPlayers = JSON.parse(JSON.stringify(away.players));

            const homeRatings = calculateTeamRatings(hPlayers, "NORMAL", home.coach.preferredStrategy, 1, 1, 1, home.coach.tactical, home.coach.preferredStrategy, 0, home.coach as any);
            const awayRatings = calculateTeamRatings(aPlayers, "NORMAL", away.coach.preferredStrategy, 1, 1, 1, away.coach.tactical, away.coach.preferredStrategy, 0, away.coach as any);

            // Check validity BEFORE match (Regression test for NaN)
            if (isNaN(homeRatings.attackCenter) || isNaN(awayRatings.defenseCenter)) {
                throw new Error(`NaN detected in ratings for ${label}`);
            }

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
        }
    }

    const avgGoals = totalGoals / totalMatches;
    const drawPct = (draws / totalMatches) * 100;
    
    console.log(`\n=== ${label} (${totalMatches} Matches) ===`);
    console.log(`Avg Skill: ${avgSkill}`);
    console.log(`Avg Goals: ${avgGoals.toFixed(2)}`);
    console.log(`Draws: ${drawPct.toFixed(1)}%`);
    console.log(`Top Scores:`, Object.entries(scoreFreq).sort((a,b)=>b[1]-a[1]).slice(0, 5).map(e => `${e[0]} (${e[1]})`).join(", "));

    return { avgGoals, drawPct, scoreFreq };
}

describe("Engine Scenarios & Regression Tests", () => {

    it("BUG FIX: Should handle players with MISSING data (undefined condition/experience)", async () => {
        // Crée deux équipes avec des joueurs "cassés" (données manquantes comme dans le bug)
        const home = createFullTeam("Broken Home", 10, "4-4-2", true);
        const away = createFullTeam("Broken Away", 10, "4-4-2", true);

        // On vérifie que calculateTeamRatings ne renvoie pas NaN
        const hRatings = calculateTeamRatings(home.players as any);
        expect(hRatings.attackCenter).not.toBeNaN();
        expect(hRatings.defenseCenter).not.toBeNaN();
        expect(hRatings.midfield).not.toBeNaN();

        // On simule un match pour voir si ça plante ou si ça fait 0-0 à cause de NaN
        const res = await simulateMatch(
            hRatings, calculateTeamRatings(away.players as any), 1, 2,
            home.players, away.players, "BH", "BA",
            home.coach, away.coach
        );

        console.log(`Broken Data Match Result: ${res.homeScore}-${res.awayScore} (Events: ${res.events.length})`);
        
        // On s'attend à ce que le match ait eu lieu (events générés, possession calculée)
        // Le score peut être 0-0 par hasard, mais stats ne doit pas être vide
        expect(res.homePossession).not.toBeNaN();
        expect(res.stats.homeShots + res.stats.awayShots).toBeGreaterThanOrEqual(0); // Au moins c'est un nombre
        
        // Si les données sont manquantes, on a mis des defaults (condition 100), donc ils devraient jouer normalement
        // On s'attend à ce que l'attaque ne soit pas nulle.
    });

	it("Division 6 Ecosystem (Low Skill ~6)", async () => {
        // Le cas rapporté par l'utilisateur
		const res = await simulateSeason(6, 6.0, "Division 6 (Sunday League)");
        // Assertions pour vérifier que le foot amateur n'est pas ennuyeux à mourir
        expect(res.avgGoals).toBeGreaterThan(1.5); // On veut des buts !
        expect(res.drawPct).toBeLessThan(40); // Pas que des nuls
	});

    it("Division 1 Ecosystem (High Skill ~16)", async () => {
		const res = await simulateSeason(6, 16.0, "Premier League");
        expect(res.avgGoals).toBeGreaterThan(2.0);
        expect(res.drawPct).toBeLessThan(35);
	});
});
