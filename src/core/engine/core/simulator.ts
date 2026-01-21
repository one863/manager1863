import type { Player } from "@/core/db/db";
import { MatchSequencer, type StaffImpact } from "./match-sequencer";
import type { MatchResult, TacticType } from "./types";

/**
 * Point d'entrée principal du moteur de match.
 */
export async function simulateMatch(
	homePlayers: Player[], 
    awayPlayers: Player[], 
    homeName: string, 
    awayName: string,
    homeTeamId: number,
    awayTeamId: number,
	homeStaff: StaffImpact, 
    awayStaff: StaffImpact,
    hIntensity = 3,
    aIntensity = 3,
    hTactic: TacticType = "NORMAL",
    aTactic: TacticType = "NORMAL",
    hCohesion = 50,
    aCohesion = 50,
    hMentality = 3, // NOUVEAU PARAMÈTRE
    aMentality = 3, // NOUVEAU PARAMÈTRE
    debug = false
): Promise<MatchResult> {
    
    const sequencer = new MatchSequencer(
        homePlayers, awayPlayers, 
        homeName, awayName, 
        homeTeamId, awayTeamId, 
        homeStaff, awayStaff,
        hIntensity, aIntensity,
        hTactic, aTactic,
        hCohesion, aCohesion,
        hMentality, aMentality
    );

    if (debug) sequencer.enableDebug();

    return await sequencer.run();
}

export type { StaffImpact };
