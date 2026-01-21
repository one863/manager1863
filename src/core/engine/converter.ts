import { type Player, type StaffMember, type StaffStats } from "@/core/db/db";
import { TACTIC_DEFINITIONS } from "./core/tactics";
import type { TeamRatings } from "./core/types";
import { type StaffImpact } from "./core/simulator";

/**
 * Calcule une note globale (0-100) pour l'affichage UI
 * basé sur le nouveau système VQN
 */
export function calculateTeamRatings(
	players: Player[],
	tactic: TeamRatings["tacticType"] = "NORMAL",
	strategy: TeamRatings["strategy"] = "BALANCED",
    currentDay = 1,
    currentSeason = 1,
): TeamRatings {
	let starters = players.filter((p) => p.isStarter);
	if (starters.length < 11) {
		const availablePlayers = players.filter((p) => !p.isStarter);
		starters = [...starters, ...availablePlayers.slice(0, 11 - starters.length)];
	}

    const avg = (statName: keyof Player["stats"]) => 
        starters.reduce((acc, p) => acc + (Number(p.stats[statName]) || 0), 0) / starters.length;

	const baseRatings: TeamRatings = {
		midfield: (avg("passing") * 0.4 + avg("vision") * 0.3 + avg("positioning") * 0.3) * 5,
		pressing: avg("tackling") * 5,
		resistance: avg("stamina") * 5,
		
		attackCenter: avg("shooting") * 5,
		attackLeft: (avg("speed") * 0.5 + avg("dribbling") * 0.5) * 5,
		attackRight: (avg("speed") * 0.5 + avg("dribbling") * 0.5) * 5,
		
		defenseCenter: avg("tackling") * 5,
		defenseLeft: (avg("speed") * 0.4 + avg("tackling") * 0.6) * 5,
		defenseRight: (avg("speed") * 0.4 + avg("tackling") * 0.6) * 5,
		
		setPieces: avg("shooting") * 0.7 + avg("vision") * 0.3,
		tacticSkill: 10,
		tacticType: tactic,
		strategy: strategy,
        pressure: 0,
	};

	return baseRatings;
}

export const DEFAULT_STAFF_IMPACT: StaffImpact = {
    coaching: 0,
    tactical: 10,
    conditioning: 0,
    recovery: 0,
    reading: 0,
    psychology: 10,
    medicine: 10
};

/**
 * Fusionne les stats de tout le staff d'une équipe pour le moteur
 */
export function getStaffImpact(staffList: StaffMember[] | any): StaffImpact {
    const impact = { ...DEFAULT_STAFF_IMPACT };
    
    if (Array.isArray(staffList)) {
        staffList.forEach(member => {
            if (member.role === "COACH") {
                impact.coaching = (member.stats?.coaching !== undefined) ? member.stats.coaching : 0;
                impact.tactical = (member.stats?.tactical !== undefined) ? member.stats.tactical : 10;
                // Mapping approx pour psychology si manquant
                const discipline = member.stats?.discipline || 10;
                impact.psychology = (impact.coaching + discipline) / 2; 
            } else if (member.role === "PHYSICAL_TRAINER") {
                impact.conditioning = (member.stats?.conditioning !== undefined) ? member.stats.conditioning : 0;
                impact.recovery = (member.stats?.recovery !== undefined) ? member.stats.recovery : 0;
                impact.medicine = (impact.recovery + impact.conditioning) / 2; 
            } else if (member.role === "VIDEO_ANALYST") {
                impact.reading = (member.stats?.reading !== undefined) ? member.stats.reading : 0;
            }
        });
    } else if (staffList && typeof staffList === 'object' && staffList.coaching !== undefined) {
        // Fallback pour supporter l'ancien format (objet stats direct) si nécessaire
        impact.coaching = staffList.coaching || 0;
        impact.tactical = staffList.tactical || 10;
        impact.psychology = staffList.discipline || 10; 
        impact.conditioning = staffList.conditioning || 0;
        impact.recovery = staffList.recovery || 0;
        impact.reading = staffList.reading || 0;
    }

    return impact;
}
