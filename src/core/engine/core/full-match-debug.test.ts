import { describe, it } from "vitest";
import { simulateMatch } from "./simulator"; 
import type { Player } from "@/core/db/db";
import { FORMATION_ROLES } from "./tactics";
import type { StaffImpact } from "./match-sequencer";

let globalIdCounter = 1;

// Staff neutre
const DEFAULT_STAFF: StaffImpact = {
    coaching: 10, tactical: 10, reading: 10, recovery: 10, conditioning: 10,
    psychology: 10, medicine: 10
};

// Création de joueur Standardisé (Note 10 partout)
const createStandardPlayer = (pos: any, teamId: number): Player => {
    const s = 10; // NOTE FIXE DE 10
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
            workrate: s, flair: s, decisions: s, concentration: s,
            adaptability: s, pressure: s
        }, 
        traits: [], energy: 100, confidence: 50, condition: 100, isStarter: true,
    } as any;
};

const createTeam = (teamId: number, formation: any = "4-4-2"): Player[] => {
    // Utilisation de FORMATION_ROLES au lieu de l'ancien objet FORMATIONS
    const roles = FORMATION_ROLES[formation as keyof typeof FORMATION_ROLES];
    const squad: Player[] = [];
    
    // Création des titulaires
    roles.forEach(role => {
        let pos = "MID";
        if (role === "GK") pos = "GK";
        else if (["LB", "RB", "CB", "CB_L", "CB_R", "LWB", "RWB"].includes(role)) pos = "DEF";
        else if (["ST", "ST_L", "ST_R", "LW", "RW"].includes(role)) pos = "FWD";
        
        const p = createStandardPlayer(pos, teamId);
        // Le rôle sera réassigné par le MatchSequencer en fonction de la position dans la liste
        // Mais on s'assure que la position (GK/DEF/MID/FWD) est cohérente
        squad.push(p);
    });

    // Subs
    for (let i = 0; i < 7; i++) {
        const p = createStandardPlayer(i === 0 ? "GK" : (i < 3 ? "DEF" : (i < 5 ? "MID" : "FWD")), teamId);
        p.isStarter = false;
        squad.push(p);
    }
    squad.forEach(p => (p as any).teamFormation = formation);
    return squad;
};

describe("Simulation Match Complet (Standard 10/10)", () => {
    it("Devrait simuler un match équilibré 4-4-2 vs 4-4-2", async () => {
        console.log(`\n=============================================================================`);
        console.log(`🧪  MATCH TEST : STANDARD FC vs CLONE UTD (Tout à 10, 4-4-2)`);
        console.log(`=============================================================================`);
        
        const home = createTeam(1, "4-4-2");
        const away = createTeam(2, "4-4-2");
        
        const res = await simulateMatch(
            home, away, "STANDARD FC", "CLONE UTD", 1, 2, 
            DEFAULT_STAFF, DEFAULT_STAFF, 
            3, 3, "NORMAL", "NORMAL", 50, 50, 
            3, 3, // Mentalité
            true // Debug
        );
        
        res.debugLogs?.forEach(log => console.log(log));
        
        console.log(`\n=============================================================================`);
        console.log(`🏁 SCORE FINAL : ${res.homeScore} - ${res.awayScore}`);
        console.log(`📈 STATS :`);
        console.log(`   Possession : ${res.homePossession}% - ${100 - res.homePossession}%`);
        console.log(`   Tirs : ${res.stats.homeShots} - ${res.stats.awayShots}`);
        console.log(`   Cadrés : ${res.stats.homeShotsOnTarget} - ${res.stats.awayShotsOnTarget}`);
        console.log(`   xG : ${res.stats.homeXG.toFixed(2)} - ${res.stats.awayXG.toFixed(2)}`);
        
        console.log(`\n📍 HISTORIQUE DU BALLON (10 premières minutes) :`);
        console.log(`   ${res.ballHistory?.slice(0, 10).join(" -> ")} ...`);
        
        console.log(`\n🔥 HEATMAP (Top 3 Zones) :`);
        if (res.heatmap) {
             const homeZones = res.heatmap.home.map((v, i) => ({ zone: i + 1, val: v })).sort((a,b) => b.val - a.val).slice(0, 3);
             const awayZones = res.heatmap.away.map((v, i) => ({ zone: i + 1, val: v })).sort((a,b) => b.val - a.val).slice(0, 3);
             
             console.log(`   DOM : Zones ${homeZones.map(z => z.zone).join(", ")}`);
             console.log(`   EXT : Zones ${awayZones.map(z => z.zone).join(", ")}`);
        }
        
        console.log(`=============================================================================\n`);
    }, 30000);
});
