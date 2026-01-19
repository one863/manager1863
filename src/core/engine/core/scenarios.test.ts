import { describe, it } from "vitest";
import { simulateMatch } from "./simulator"; // Ton point d'entrée qui appelle MatchSequencer
import type { Player } from "@/core/db/db";
import { FORMATIONS } from "./tactics";
import type { StaffImpact } from "./match-sequencer";

let globalIdCounter = 1;

// Mise à jour avec les nouveaux attributs de staff
const DEFAULT_STAFF: StaffImpact = {
    coaching: 10, 
    tactical: 10, 
    reading: 10, 
    recovery: 10, 
    conditioning: 10,
    psychology: 10, // Nouveau
    medicine: 10    // Nouveau
};

const createTestPlayer = (pos: any, skill: number, teamId: number): Player => {
    return {
        id: globalIdCounter++, saveId: 1, teamId,
        firstName: "Test", lastName: `${pos}-${globalIdCounter}`,
        age: 25, position: pos, side: "C", dna: "0-0-0",
        skill, 
        stats: {
            // Stats de base
            passing: skill, shooting: skill, dribbling: skill, tackling: skill,
            speed: skill, strength: skill, stamina: skill,
            vision: skill, positioning: skill, composure: skill,
            goalkeeping: pos === "GK" ? skill : 2,
            
            // NOUVELLES STATS V4.5
            agility: skill,
            ballControl: skill,
            anticipation: skill,
            aggression: skill,
            leadership: skill,
            jumping: skill,
            crossing: skill
        }, 
        traits: [], // On peut ajouter des traits ici pour tester (ex: ["CLUTCH_FINISHER"])
        energy: 100, 
        confidence: 50, // Équivalent à 0 dans le moteur (-10 à +10)
        condition: 100,
        isStarter: true,
    } as any; // Casté en any pour simplifier les tests
};

const createTeam = (avgSkill: number, teamId: number): Player[] => {
    const f = FORMATIONS["4-4-2"];
    const squad: Player[] = [];
    for (let i = 0; i < f.GK; i++) squad.push(createTestPlayer("GK", avgSkill, teamId));
    for (let i = 0; i < f.DEF; i++) squad.push(createTestPlayer("DEF", avgSkill, teamId));
    for (let i = 0; i < f.MID; i++) squad.push(createTestPlayer("MID", avgSkill, teamId));
    for (let i = 0; i < f.FWD; i++) squad.push(createTestPlayer("FWD", avgSkill, teamId));
    return squad;
};

async function runScenario(hSkill: number, aSkill: number, label: string, iterations = 50) {
    let stats = {
        goals: 0, xG: 0, shots: 0, shotsOnTarget: 0,
        hWins: 0, aWins: 0, draws: 0, possession: 0
    };
    
    const homePlayers = createTeam(hSkill, 1);
    const awayPlayers = createTeam(aSkill, 2);

    for (let i = 0; i < iterations; i++) {
        const res = await simulateMatch(
            homePlayers, awayPlayers, 
            "Home Team", "Away Team",
            1, 2,
            DEFAULT_STAFF, DEFAULT_STAFF
        );
        stats.goals += (res.homeScore + res.awayScore);
        stats.xG += (res.stats.homeXG + res.stats.awayXG);
        stats.shots += (res.stats.homeShots + res.stats.awayShots);
        stats.shotsOnTarget += (res.stats.homeShotsOnTarget + res.stats.awayShotsOnTarget);
        stats.possession += res.homePossession;
        
        if (res.homeScore > res.awayScore) stats.hWins++;
        else if (res.awayScore > res.homeScore) stats.aWins++;
        else stats.draws++;
    }

    const conversionRate = ((stats.goals / stats.xG) * 100).toFixed(1);
    const precision = ((stats.shotsOnTarget / stats.shots) * 100).toFixed(1);

    console.log(`
╔═══════════════════════════════════════════════════════════╗
  SCÉNARIO : ${label.padEnd(42)}
╟───────────────────────────────────────────────────────────╢
  ⚽ MOY. BUTS : ${(stats.goals / iterations).toFixed(2)} / xG : ${(stats.xG / iterations).toFixed(2)}
  🎯 CONVERSION: ${conversionRate}% (Cible: 80-100%)
  🏹 PRÉCISION : ${precision}% (Cible: 35-45%)
  📈 POSSESSION: ${Math.round(stats.possession / iterations)}%
  ⚖️  V/N/D     : ${Math.round(stats.hWins/iterations*100)}% / ${Math.round(stats.draws/iterations*100)}% / ${Math.round(stats.aWins/iterations*100)}%
╚═══════════════════════════════════════════════════════════╝`);
}

describe("Validation Multi-Scénarios VQN V4.5", () => {
    it("Équilibré (Ligue 1 vs Ligue 1)", async () => {
        await runScenario(12, 12, "CHOC DES TITANS (ÉQUILIBRÉ)");
    }, 30000);

    it("Déséquilibré (Ligue 1 vs National)", async () => {
        await runScenario(16, 7, "ELITE vs FAIBLE (DÉZONAGE)");
    }, 30000);

    it("Impact Mental (Favori avec stats moyennes)", async () => {
        // Ici on pourrait tester avec un différentiel de staff ou de cohésion
        await runScenario(14, 11, "FAVORI vs OUTSIDER");
    }, 30000);

    it("Match de district (Faible skill, forte variance)", async () => {
        await runScenario(5, 5, "DISTRICT (ERREURS TECHNIQUES)");
    }, 30000);
});
