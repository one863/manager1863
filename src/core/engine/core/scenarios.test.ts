import { describe, it } from "vitest";
import { simulateMatch } from "./simulator"; 
import type { Player } from "@/core/db/db";
import { FORMATIONS } from "./tactics";
import type { StaffImpact } from "./match-sequencer";

let globalIdCounter = 1;

const DEFAULT_STAFF: StaffImpact = {
    coaching: 10, tactical: 10, reading: 10, recovery: 10, conditioning: 10,
    psychology: 10, medicine: 10
};

const createTestPlayer = (pos: any, skill: number, teamId: number): Player => {
    const s = Math.max(1, Math.min(20, skill + (Math.random() * 2 - 1)));
    return {
        id: teamId === 1 ? globalIdCounter++ : globalIdCounter++ + 5000,
        saveId: 1, teamId,
        firstName: "Test", lastName: `${pos}-${globalIdCounter}`,
        age: 25, position: pos, side: "C", dna: "0-0-0",
        skill: s, 
        stats: {
            passing: s, shooting: s, dribbling: s, tackling: s,
            speed: s, strength: s, stamina: s,
            vision: s, positioning: s, composure: s,
            goalkeeping: pos === "GK" ? s : 2,
            agility: s, ballControl: s, anticipation: s,
            aggression: s, leadership: s, jumping: s, crossing: s,
            // Nouvelles stats fondamentales
            workrate: s, flair: s, decisions: s, concentration: s,
            adaptability: s, pressure: s
        }, 
        traits: [], energy: 100, confidence: 50, condition: 100, isStarter: true,
    } as any;
};

const createTeam = (baseSkill: number, teamId: number, formation: any = "4-4-2"): Player[] => {
    const f = FORMATIONS[formation as keyof typeof FORMATIONS];
    const squad: Player[] = [];
    for (let i = 0; i < f.GK; i++) squad.push(createTestPlayer("GK", baseSkill, teamId));
    for (let i = 0; i < f.DEF; i++) squad.push(createTestPlayer("DEF", baseSkill, teamId));
    for (let i = 0; i < f.MID; i++) squad.push(createTestPlayer("MID", baseSkill, teamId));
    for (let i = 0; i < f.FWD; i++) squad.push(createTestPlayer("FWD", baseSkill, teamId));
    for (let i = 0; i < 7; i++) {
        const p = createTestPlayer(i === 0 ? "GK" : (i < 3 ? "DEF" : (i < 5 ? "MID" : "FWD")), baseSkill - 2, teamId);
        p.isStarter = false;
        squad.push(p);
    }
    // Injecter la formation dans les métadonnées (utilisé par le sequencer)
    squad.forEach(p => (p as any).teamFormation = formation);
    return squad;
};

async function runBenchmark(hBaseSkill: number, aBaseSkill: number, label: string, iterations = 10) {
    let stats = { goals: 0, hWins: 0, aWins: 0, draws: 0, hGoals: 0, aGoals: 0, tirs: 0, xg: 0 };
    for (let i = 0; i < iterations; i++) {
        const home = createTeam(hBaseSkill, 1);
        const away = createTeam(aBaseSkill, 2);
        // Paramètres Mentality ajoutés : 3, 3
        const res = await simulateMatch(
            home, away, "H", "A", 1, 2, 
            DEFAULT_STAFF, DEFAULT_STAFF, 
            3, 3, "NORMAL", "NORMAL", 50, 50, 
            3, 3, // Mentalité
            false // Debug
        );
        stats.goals += (res.homeScore + res.awayScore);
        stats.hGoals += res.homeScore;
        stats.aGoals += res.awayScore;
        stats.tirs += (res.stats.homeShots + res.stats.awayShots);
        stats.xg += (res.stats.homeXG + res.stats.awayXG);
        if (res.homeScore > res.awayScore) stats.hWins++;
        else if (res.awayScore > res.homeScore) stats.aWins++;
        else stats.draws++;
    }
    console.log(`📊 [${label}] - Moy. Buts: ${(stats.goals/iterations).toFixed(2)} | xG: ${(stats.xg/iterations).toFixed(2)} | Tirs: ${(stats.tirs/iterations).toFixed(1)} | V:${stats.hWins} N:${stats.draws} D:${stats.aWins}`);
}

describe("Analyse Moteur Spatial 18 Zones", () => {
    it("Benchmark Réalisme", async () => {
        console.log(`\n=============================================================================`);
        console.log(`🔍 FOCUS : TEST DE COHÉRENCE DU NOUVEAU MOTEUR SPATIAL`);
        console.log(`=============================================================================`);
        
        const home = createTeam(12, 1, "4-4-2");
        const away = createTeam(12, 2, "4-3-3");
        const res = await simulateMatch(
            home, away, "LIVERPOOL", "CITY", 1, 2, 
            DEFAULT_STAFF, DEFAULT_STAFF, 
            3, 3, "NORMAL", "NORMAL", 50, 50, 
            3, 3, // Mentalité
            true // Debug
        );
        
        res.debugLogs?.slice(0, 50).forEach(l => console.log(l));
        console.log(`... [Logs tronqués pour lisibilité] ...`);
        console.log(`\n🏁 SCORE FINAL : ${res.homeScore} - ${res.awayScore}`);
        console.log(`=============================================================================\n`);

        await runBenchmark(15, 15, "ELITE (Niveau 15)");
        await runBenchmark(10, 10, "PRO (Niveau 10)");
        await runBenchmark(5, 5, "AMATEUR (Niveau 5)");
        await runBenchmark(15, 5, "DÉSÉQUILIBRÉ (15 vs 5)");
    }, 60000);
});
