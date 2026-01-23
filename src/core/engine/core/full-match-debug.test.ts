import { describe, it } from "vitest";
import { simulateMatch } from "./simulator"; 
import type { Player } from "@/core/db/db";
import { FORMATIONS } from "./tactics";
import type { StaffImpact } from "./match-sequencer";

let globalIdCounter = 1;

const DEFAULT_STAFF: StaffImpact = {
    coaching: 12, tactical: 12, reading: 10, recovery: 10, conditioning: 11
};

const createRandomPlayer = (pos: any, teamId: number): Player => {
    const s = () => Math.floor(Math.random() * 9) + 8; 
    return {
        id: teamId === 1 ? globalIdCounter++ : globalIdCounter++ + 5000,
        saveId: 1, teamId,
        firstName: "Test", lastName: `${pos}-${globalIdCounter}`,
        age: 25, position: pos, side: "C", dna: "0-0-0",
        skill: 12, 
        stats: {
            passing: s(), shooting: s(), dribbling: s(), tackling: s(),
            speed: s(), strength: s(), stamina: s(),
            vision: s(), positioning: s(), composure: s(),
            goalkeeping: pos === "GK" ? s() : 2, 
            agility: s(), ballControl: s(), anticipation: s(),
            aggression: s(), leadership: s(), jumping: s(), crossing: s(),
            workrate: s(), flair: s(), decisions: s(), concentration: s(),
            adaptability: s(), pressure: s()
        }, 
        traits: [], energy: 100, confidence: 50, condition: 100, isStarter: true,
    } as any;
};

const createTeam = (teamId: number, formationKey: keyof typeof FORMATIONS = "4-4-2"): Player[] => {
    const counts = FORMATIONS[formationKey];
    const squad: Player[] = [];
    
    // Titulaires
    for (let i = 0; i < counts.GK; i++) squad.push(createRandomPlayer("GK", teamId));
    for (let i = 0; i < counts.DEF; i++) squad.push(createRandomPlayer("DEF", teamId));
    for (let i = 0; i < counts.MID; i++) squad.push(createRandomPlayer("MID", teamId));
    for (let i = 0; i < counts.FWD; i++) squad.push(createRandomPlayer("FWD", teamId));

    // Remplaçants (7)
    for (let i = 0; i < 7; i++) {
        const p = createRandomPlayer(i === 0 ? "GK" : (i < 3 ? "DEF" : (i < 5 ? "MID" : "FWD")), teamId);
        p.isStarter = false;
        squad.push(p);
    }
    squad.forEach(p => (p as any).teamFormation = formationKey);
    return squad;
};

describe("Simulation Match Complet (Debug Engine)", () => {
    it("Devrait simuler un match 4-4-2 vs 4-3-3 avec logs complets", async () => {
        console.log(`\n=============================================================================`);
        console.log(`🧪  MATCH TEST : LORIENT FC vs AJACCIO UTD`);
        console.log(`=============================================================================`);
        
        const home = createTeam(1, "4-4-2");
        const away = createTeam(2, "4-3-3");
        
        const res = await simulateMatch(
            home, away, "TOULOUSE FC", "JUVENTUS UTD", 1, 2, 
            DEFAULT_STAFF, DEFAULT_STAFF, 
            3, 3, "NORMAL", "NORMAL", 50, 50, 
            3, 3, 
            true 
        );
        
        res.debugLogs?.forEach(log => console.log(log));
        
        console.log(`\n=============================================================================`);
        console.log(`🏁 SCORE FINAL : ${res.homeScore} - ${res.awayScore}`);
        console.log(`📈 STATS :`);
        console.log(`   Possession : ${res.homePossession}% - ${100 - res.homePossession}%`);
        console.log(`   Tirs : ${res.stats.homeShots} - ${res.stats.awayShots}`);
        console.log(`   Cadrés : ${res.stats.homeShotsOnTarget} - ${res.stats.awayShotsOnTarget}`);
        console.log(`   xG : ${res.stats.homeXG.toFixed(2)} - ${res.stats.awayXG.toFixed(2)}`);
        
        console.log(`\n📍 HISTORIQUE DU BALLON (Zones occupées) :`);
        const zones = res.ballHistory?.map(m => Math.floor(m / 50) + 3) || [];
        console.log(`   ${zones.slice(0, 30).join("-")}...`);
        
        console.log(`=============================================================================\n`);
    }, 60000);
});
