import type { Player } from "@/core/db/db";
import { clamp, probability, boxMullerRandom, randomInt } from "@/core/utils/math";
import { 
	calculateSuccessRate, 
	getFatiguePenalty, 
	calculateRiskEvent 
} from "./probabilities";
import { CoachAI, type CoachMatchData } from "./coach-ai";
import { handleNormalAttack, handleSetPiece, getEffectiveStat } from "./match-actions";
import type { MatchEvent, MatchResult, TeamRatings, PlayerMatchStats } from "./types";

export type { CoachMatchData };

/**
 * Initialise les statistiques de match d'un joueur
 */
function initPlayerStats(): PlayerMatchStats {
	return {
		rating: 0, goals: 0, assists: 0, shots: 0, shotsOnTarget: 0,
		xg: 0, xa: 0, passes: 0, passesSuccess: 0, duels: 0,
		duelsWon: 0, distance: 0, sprints: 0, interventions: 0, saves: 0,
	};
}

/**
 * Calcule la note finale d'un joueur après le match
 */
function calculateMatchRating(
	player: Player,
	pStats: PlayerMatchStats,
	teamScore: number,
	opponentScore: number,
	events: MatchEvent[],
): number {
	let rating = boxMullerRandom(6.2, 0.7);
	const formMult = (player.form || 5) / 5; 
	rating *= (0.9 + formMult * 0.1);
	rating += (pStats.goals || 0) * 1.5;
	rating += (pStats.assists || 0) * 1.0;
	rating += (pStats.xg || 0) * 0.4;
	rating += (pStats.xa || 0) * 0.4;
    
    if (player.position !== "GK") {
        const expectedDist = 8;
        rating += (pStats.distance - expectedDist) * 0.15;
    }

	const passAccuracy = pStats.passes > 0 ? pStats.passesSuccess / pStats.passes : 0.7;
	rating += (passAccuracy - 0.7) * 2;
	const duelWinRate = pStats.duels > 0 ? pStats.duelsWon / pStats.duels : 0.5;
	rating += (duelWinRate - 0.5) * 2;
	const diff = teamScore - opponentScore;
	rating += diff * 0.1;
	const fatiguePenalty = getFatiguePenalty(player.energy || 100);
	rating *= (0.7 + fatiguePenalty * 0.3);
	if (events && events.some(e => e.type === "CARD" && e.playerId === player.id && e.duration === 1)) rating -= 3.0; 
	return clamp(isNaN(rating) ? 6.0 : Number(rating.toFixed(1)), 1, 10);
}

export async function simulateMatch(
	home: TeamRatings, away: TeamRatings, homeTeamId: number, awayTeamId: number,
	homePlayers: Player[], awayPlayers: Player[], homeName: string, awayName: string,
	homeCoach?: CoachMatchData, awayCoach?: CoachMatchData,
): Promise<MatchResult> {
	const result: MatchResult = {
		homeScore: 0, awayScore: 0, homePossession: 50, events: [],
		stats: { 
			homeChances: 0, awayChances: 0, homeShots: 0, awayShots: 0,
			homeShotsOnTarget: 0, awayShotsOnTarget: 0, homeXG: 0, awayXG: 0,
			homeXA: 0, awayXA: 0, homePPDA: 0, awayPPDA: 0, homePasses: 0, awayPasses: 0,
			homeDefensiveActions: 0, awayDefensiveActions: 0, homeDuelsWon: 0, awayDuelsWon: 0,
			homeDuelsTotal: 0, awayDuelsTotal: 0, homeDistance: 0, awayDistance: 0,
		},
		playerPerformances: {}, playerStats: {},
	};

    // CLONAGE ET INITIALISATION
	let hStarters = (homePlayers || []).filter(p => p.isStarter).map(p => ({ ...p }));
	let aStarters = (awayPlayers || []).filter(p => p.isStarter).map(p => ({ ...p }));
	let hSubs = (homePlayers || []).filter(p => !p.isStarter).map(p => ({ ...p }));
	let aSubs = (awayPlayers || []).filter(p => !p.isStarter).map(p => ({ ...p }));
	
	let hSubsUsed = 0, aSubsUsed = 0;
    let hSlotsUsed = 0, aSlotsUsed = 0;
	const playerCards = new Map<number, number>();

	const allMatchPlayers = [...hStarters, ...aStarters, ...hSubs, ...aSubs];
	allMatchPlayers.forEach(p => { 
		if (p && p.id) result.playerStats![p.id.toString()] = initPlayerStats(); 
	});

	const unavailablePlayers = new Set<number>();
	const sentOffPlayers = new Set<number>();
	const stoppageTime = randomInt(1, 6);
	const totalMatchMinutes = 90 + stoppageTime;
	let totalCycles = totalMatchMinutes; 
	const cycleDuration = totalMatchMinutes / totalCycles;
	let hControlCycles = 0, totalControlCycles = 0;

    // BOUCLE DE MATCH
	for (let cycle = 1; cycle <= totalCycles; cycle++) {
		const minute = Math.min(Math.floor(cycle * cycleDuration), totalMatchMinutes);
		
        // IA COACH
        const hCoachDecision = CoachAI.decideSubstitutions(minute, hStarters, hSubs, homeCoach, hSubsUsed, hSlotsUsed, homeTeamId, result.homeScore, result.awayScore, unavailablePlayers, sentOffPlayers);
        hSubsUsed = hCoachDecision.used; hSlotsUsed = hCoachDecision.slots; result.events.push(...hCoachDecision.events);

        const aCoachDecision = CoachAI.decideSubstitutions(minute, aStarters, aSubs, awayCoach, aSubsUsed, aSlotsUsed, awayTeamId, result.awayScore, result.homeScore, unavailablePlayers, sentOffPlayers);
        aSubsUsed = aCoachDecision.used; aSlotsUsed = aCoachDecision.slots; result.events.push(...aCoachDecision.events);

		// PHYSIOLOGY & INCIDENTS
		const processPhysiology = (starters: Player[], isHome: boolean, teamId: number) => {
			starters.forEach(p => {
				const pStat = result.playerStats![p.id!.toString()];
				if (!pStat) return;
				const vol = (p.stats.volume || 10) / 20;
				const fp = getFatiguePenalty(p.energy);
				p.energy = Math.max(0, (p.energy || 100) - ((1.5 - vol) * (2 - fp) * (90/totalCycles)));
				const dist = (0.2 + Math.random() * 0.05) * (0.8 + vol * 0.4);
				pStat.distance += dist;
				if (isHome) result.stats.homeDistance += dist; else result.stats.awayDistance += dist;

				if (calculateRiskEvent(0.0002, fp)) {
					result.events.push({ minute, type: "INJURY", teamId, playerId: p.id, duration: randomInt(3, 21), description: `🚑 ${p.lastName} se blesse !` });
					unavailablePlayers.add(p.id!);
				} else if (probability(0.0012)) {
					const existingCard = result.events.some(e => e.minute === minute && e.playerId === p.id && e.type === "CARD");
					if (!existingCard) {
						const currentYellows = (playerCards.get(p.id!) || 0) + 1;
						playerCards.set(p.id!, currentYellows);
						if (currentYellows === 2 || probability(0.05)) {
							result.events.push({ minute, type: "CARD", teamId, playerId: p.id, duration: 1, description: `🔴 Carton rouge pour ${p.lastName} !` });
							unavailablePlayers.add(p.id!); sentOffPlayers.add(p.id!);
						} else {
							result.events.push({ minute, type: "CARD", teamId, playerId: p.id, duration: 0, description: `🟨 Carton jaune pour ${p.lastName}.` });
						}
					}
				}
			});
		};
		processPhysiology(hStarters, true, homeTeamId); processPhysiology(aStarters, false, awayTeamId);

		// POSSESSION & MOTEUR D'ACTION
		const hStrength = hStarters.reduce((acc, p) => acc + (p.stats.resistance || 10) * getFatiguePenalty(p.energy), 0) * (hStarters.length / 11);
		const aStrength = aStarters.reduce((acc, p) => acc + (p.stats.pressing || 10) * getFatiguePenalty(p.energy), 0) * (aStarters.length / 11);
		
		const hControlChance = calculateSuccessRate(home.midfield * 1.1 * (hStrength / 100), away.midfield * (aStrength / 100), 1.2);
		const controllingTeam = Math.random() < hControlChance ? "home" : "away";
		if (controllingTeam === "home") hControlCycles++;
		totalControlCycles++;

		const attStarters = (controllingTeam === "home" ? hStarters : aStarters);
		const defStarters = (controllingTeam === "home" ? aStarters : hStarters);
		
		const actionRoll = Math.random();
		if (actionRoll < 0.12) handleNormalAttack(result, minute, controllingTeam, controllingTeam === "home" ? home : away, controllingTeam === "home" ? away : home, controllingTeam === "home" ? homeTeamId : awayTeamId, attStarters, defStarters, controllingTeam === "home" ? homeName : awayName);
		else if (actionRoll < 0.16) handleSetPiece(result, minute, controllingTeam, controllingTeam === "home" ? home : away, controllingTeam === "home" ? away : home, controllingTeam === "home" ? homeTeamId : awayTeamId, attStarters, defStarters, controllingTeam === "home" ? homeName : awayName, controllingTeam === "home" ? aStarters : hStarters);
	}

    // FINALISATION
	result.homePossession = totalControlCycles > 0 ? Math.round((hControlCycles / totalControlCycles) * 100) : 50;
	if (stoppageTime > 0) result.events.push({ minute: 90, type: "SE", teamId: 0, description: `⏱️ ${stoppageTime} minutes de temps additionnel.` });

	[...homePlayers, ...awayPlayers].forEach(p => {
		const pS = result.playerStats![p.id!.toString()];
		if (pS && pS.distance > 0) {
            const isH = homePlayers.some(hp => hp.id === p.id);
            const r = calculateMatchRating(p, pS, isH ? result.homeScore : result.awayScore, isH ? result.awayScore : result.homeScore, result.events);
            pS.rating = r; result.playerPerformances![p.id!.toString()] = r;
        }
	});

	if (result.events) result.events.sort((a, b) => (a.minute === b.minute && a.type === "SE" && a.minute === 90) ? -1 : a.minute - b.minute);
	return result;
}
