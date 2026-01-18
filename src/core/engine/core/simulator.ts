import { getNarrative } from "@/core/generators/narratives";
import type { Player, PlayerTrait } from "@/core/db/db";
import { clamp, probability, randomInt } from "@/core/utils/math";
import { 
	calculateSuccessRate, 
	getFatiguePenalty, 
	weightedPick, 
	boxMullerRandom,
	calculateRiskEvent 
} from "./probabilities";
import { type FormationKey } from "./tactics";
import type { MatchEvent, MatchResult, TeamRatings, PlayerMatchStats } from "./types";

export interface CoachMatchData {
	management: number;
	tactical: number;
	preferredStrategy: "DEFENSIVE" | "BALANCED" | "OFFENSIVE";
	formation?: FormationKey;
}

function getEffectiveStat(stat: number, form: number): number {
    // Default form to 5 if undefined/NaN
    const safeForm = (form !== undefined && !isNaN(form)) ? form : 5;
	const multiplier = 0.6 + safeForm / 10;
	return stat * multiplier;
}

function initPlayerStats(p: Player): PlayerMatchStats {
	return {
		rating: 0, goals: 0, assists: 0, shots: 0, shotsOnTarget: 0,
		xg: 0, xa: 0, passes: 0, passesSuccess: 0, duels: 0,
		duelsWon: 0, distance: 0, sprints: 0, interventions: 0, saves: 0,
	};
}

function calculateMatchRating(
	player: Player,
	pStats: PlayerMatchStats,
	teamScore: number,
	opponentScore: number,
	events: MatchEvent[],
): number {
	let rating = boxMullerRandom(6.0, 0.8);
	const formMult = (player.form || 5) / 5; 
	rating *= (0.9 + formMult * 0.1);
	rating += (pStats.goals || 0) * 1.5;
	rating += (pStats.assists || 0) * 1.0;
	rating += (pStats.xg || 0) * 0.5;
	rating += (pStats.xa || 0) * 0.5;
	const passAccuracy = pStats.passes > 0 ? pStats.passesSuccess / pStats.passes : 0.7;
	rating += (passAccuracy - 0.7) * 2;
	const duelWinRate = pStats.duels > 0 ? pStats.duelsWon / pStats.duels : 0.5;
	rating += (duelWinRate - 0.5) * 2;
	const diff = teamScore - opponentScore;
	rating += diff * 0.1;
	const fatiguePenalty = getFatiguePenalty(player.energy || 100);
	rating *= (0.7 + fatiguePenalty * 0.3);
	if (events && events.some(e => e.type === "CARD" && e.playerId === player.id && e.duration === 1)) rating -= 3.0; // Rouge
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

	let hStarters = (homePlayers || []).filter(p => p.isStarter).map(p => ({ ...p }));
	let aStarters = (awayPlayers || []).filter(p => p.isStarter).map(p => ({ ...p }));
	let hSubs = (homePlayers || []).filter(p => !p.isStarter).map(p => ({ ...p }));
	let aSubs = (awayPlayers || []).filter(p => !p.isStarter).map(p => ({ ...p }));
	
	let hSubsUsed = 0;
	let aSubsUsed = 0;
	const playerCards = new Map<number, number>();

	const allMatchPlayers = [...hStarters, ...aStarters, ...hSubs, ...aSubs];
	allMatchPlayers.forEach(p => { 
		if (p && p.id) result.playerStats![p.id.toString()] = initPlayerStats(p); 
	});

	const unavailablePlayers = new Set<number>();
	const sentOffPlayers = new Set<number>();
	const stoppageTime = randomInt(1, 6);
	const totalMatchMinutes = 90 + stoppageTime;
	let totalCycles = totalMatchMinutes; 
	const cycleDuration = totalMatchMinutes / totalCycles;
	let hControlCycles = 0, totalControlCycles = 0;

	// Start cycle at 1 to avoid minute 0 events
	for (let cycle = 1; cycle <= totalCycles; cycle++) {
		const minute = Math.min(Math.floor(cycle * cycleDuration), totalMatchMinutes);
		
		const manageTeam = (starters: Player[], subs: Player[], coach: CoachMatchData | undefined, used: number, side: string, tId: number) => {
			let currentUsed = used;
			for (let i = 0; i < starters.length; i++) {
				const p = starters[i];
				if (!p) continue;

				if (unavailablePlayers.has(p.id!)) {
					if (sentOffPlayers.has(p.id!)) {
						// Red card: remove player without replacement
						starters.splice(i, 1);
						i--;
					} else if (currentUsed < 5 && subs.length > 0) {
						const subIdx = subs.findIndex(s => s.position === p.position);
						const fresh = subIdx !== -1 ? subs.splice(subIdx, 1)[0] : subs.splice(0, 1)[0];
						starters[i] = fresh;
						result.events.push({ minute, type: "SPECIAL", teamId: tId, description: `🔄 ${fresh.lastName} remplace ${p.lastName}` });
						currentUsed++;
					} else {
						starters.splice(i, 1);
						i--;
					}
					continue;
				}

				if (minute >= 60 && minute <= 85 && cycle % 10 === 0 && currentUsed < 5) {
					const threshold = coach ? 55 + (coach.management / 2) : 60;
					if (p.energy < threshold && p.position !== "GK") {
						const subIdx = subs.findIndex(s => s.position === p.position);
						if (subIdx !== -1) {
							const fresh = subs.splice(subIdx, 1)[0];
							const tired = p;
							starters[i] = fresh;
							result.events.push({ minute, type: "SPECIAL", teamId: tId, description: `🔄 ${fresh.lastName} remplace ${tired.lastName}` });
							currentUsed++;
						}
					}
				}

				const fp = getFatiguePenalty(p.energy);
				if (calculateRiskEvent(0.0002, fp)) {
					result.events.push({ minute, type: "INJURY", teamId: tId, playerId: p.id, duration: randomInt(3, 21), description: `🚑 ${p.lastName} se blesse !` });
					unavailablePlayers.add(p.id!);
				} else if (probability(0.0012)) {
					// Check if a card event already happened for this player at this minute
					const existingCardThisMinute = result.events.some(e => 
						e.minute === minute && 
						e.playerId === p.id && 
						e.type === "CARD"
					);

					if (!existingCardThisMinute) {
						const currentYellows = (playerCards.get(p.id!) || 0) + 1;
						playerCards.set(p.id!, currentYellows);
						if (currentYellows === 2 || probability(0.05)) {
							result.events.push({ minute, type: "CARD", teamId: tId, playerId: p.id, duration: 1, description: `🔴 Carton rouge pour ${p.lastName} !` });
							unavailablePlayers.add(p.id!);
							sentOffPlayers.add(p.id!);
						} else {
							result.events.push({ minute, type: "CARD", teamId: tId, playerId: p.id, duration: 0, description: `🟨 Carton jaune pour ${p.lastName}.` });
						}
					}
				}
			}
			return currentUsed;
		};

		hSubsUsed = manageTeam(hStarters, hSubs, homeCoach, hSubsUsed, "home", homeTeamId);
		aSubsUsed = manageTeam(aStarters, aSubs, awayCoach, aSubsUsed, "away", awayTeamId);

		const applyPhys = (starters: Player[], isHome: boolean) => {
			starters.forEach(p => {
				const pStat = result.playerStats![p.id!.toString()];
				if (!pStat) return;
				const vol = (p.stats.volume || 10) / 20;
				const fp = getFatiguePenalty(p.energy || 100);
				p.energy = Math.max(0, (p.energy || 100) - ((1.5 - vol) * (2 - fp) * (90/totalCycles)));
				const dist = (0.2 + Math.random() * 0.05) * (0.8 + vol * 0.4);
				pStat.distance += dist;
				if (isHome) result.stats.homeDistance += dist; else result.stats.awayDistance += dist;
			});
		};
		applyPhys(hStarters, true); applyPhys(aStarters, false);

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
		else if (actionRoll < 0.16) handleSetPiece(result, minute, controllingTeam, controllingTeam === "home" ? home : away, controllingTeam === "home" ? away : home, controllingTeam === "home" ? homeTeamId : awayTeamId, attStarters, defStarters, controllingTeam === "home" ? homeName : awayName);
	}

	result.homePossession = totalControlCycles > 0 ? Math.round((hControlCycles / totalControlCycles) * 100) : 50;

	// Add stoppage time announcement
	if (stoppageTime > 0) {
		result.events.push({
			minute: 90,
			type: "SE",
			teamId: 0,
			description: `⏱️ ${stoppageTime} minutes de temps additionnel.`
		});
	}

	[...homePlayers, ...awayPlayers].forEach(p => {
		const pS = result.playerStats![p.id!.toString()];
		if (!pS) return;
		const isH = homePlayers.some(hp => hp.id === p.id);
		const r = calculateMatchRating(p, pS, isH ? result.homeScore : result.awayScore, isH ? result.awayScore : result.homeScore, result.events);
		pS.rating = r; result.playerPerformances![p.id!.toString()] = r;
	});

	if (result.events) result.events.sort((a, b) => {
		if (a.minute === b.minute) {
			// Ensure stoppage time announcement comes before 90+ events
			if (a.type === "SE" && a.minute === 90) return -1;
			if (b.type === "SE" && b.minute === 90) return 1;
		}
		return a.minute - b.minute;
	});
	return result;
}

function handleNormalAttack(result: MatchResult, min: number, side: "home" | "away", attR: TeamRatings, defR: TeamRatings, teamId: number, attP: Player[], defP: Player[], teamName: string) {
	if (!attP || attP.length === 0) return;
	const sector = Math.random() < 0.33 ? "Left" : Math.random() < 0.5 ? "Right" : "Center";
	if (!probability(calculateSuccessRate((attR as any)[`attack${sector}`], (defR as any)[`defense${sector === "Left" ? "Right" : sector === "Right" ? "Left" : "Center"}`], 1.2))) return;
	
	const shooter = weightedPick(attP.map(p => ({ item: p, weight: p.position === "FWD" ? 15 : p.position === "MID" ? 5 : 1 })));
	const assister = attP.length > 1 ? weightedPick(attP.filter(p => p.id !== shooter.id).map(p => ({ item: p, weight: p.position === "MID" ? 15 : 2 }))) : null;
	const gk = defP.find(p => p.position === "GK");
	
	const sS = getEffectiveStat(shooter.stats.finishing, shooter.form) * getFatiguePenalty(shooter.energy || 100);
	const gS = gk ? getEffectiveStat(gk.stats.goalkeeping || 10, gk.form) * getFatiguePenalty(gk.energy || 100) : 1;
	let xG = calculateSuccessRate(sS, gS, 1.5) * 0.75;
	if (shooter.traits?.includes("CLUTCH_FINISHER")) xG *= 1.3;
	xG = clamp(xG, 0.05, 0.9);
	
	if (side === "home") { result.stats.homeXG += xG; result.stats.homeShots++; } else { result.stats.awayXG += xG; result.stats.awayShots++; }
	const pS = result.playerStats![shooter.id!.toString()]; 
	if (pS) { pS.shots++; pS.xg += xG; }
	
	if (probability(xG)) {
		if (side === "home") result.homeScore++; else result.awayScore++;
		if (pS) pS.goals++;
		if (assister) {
			const aS = result.playerStats![assister.id!.toString()];
			if (aS) aS.assists++;
		}
		const narrative = getNarrative("match", "goal", { player: shooter.lastName, team: teamName });
		result.events.push({ minute: min, type: "GOAL", teamId, scorerId: shooter.id, scorerName: shooter.lastName, description: narrative.content || "But !", xg: xG });
	} else if (xG > 0.15) {
		const narrative = getNarrative("match", "miss", { player: shooter.lastName });
		result.events.push({ minute: min, type: "MISS", teamId, description: gk && probability(0.5) ? `${gk.lastName} réalise un arrêt décisif !` : (narrative.content || "Occasion manquée"), xg: xG });
	} else {
		result.events.push({ minute: min, type: "SHOT", teamId, description: "Tir non cadré", xg: xG });
	}
}

function handleSetPiece(result: MatchResult, min: number, side: "home" | "away", attR: TeamRatings, defR: TeamRatings, teamId: number, attP: Player[], defP: Player[], teamName: string) {
	if (!attP || attP.length === 0) return;
	const xG = clamp(calculateSuccessRate(attR.setPieces, defR.defenseCenter, 1.5) * 0.45, 0.1, 0.65);
	if (side === "home") { result.stats.homeXG += xG; result.stats.homeShots++; } else { result.stats.awayXG += xG; result.stats.awayShots++; }
	
	const sorted = [...attP].sort((a,b) => (b.stats.impact || 0) - (a.stats.impact || 0));
	const shooter = sorted[0];
	const pS = result.playerStats![shooter.id!.toString()]; 
	if (pS) { pS.shots++; pS.xg += xG; }

	if (probability(xG)) {
		if (side === "home") result.homeScore++; else result.awayScore++;
		if (pS) pS.goals++;
		result.events.push({ minute: min, type: "GOAL", teamId, scorerId: shooter.id, scorerName: shooter.lastName, description: `But de ${shooter.lastName} sur CPA !`, xg: xG });
	} else {
		if (xG > 0.15) {
			result.events.push({ minute: min, type: "MISS", teamId, description: "Grosse occasion manquée sur coup de pied arrêté !", xg: xG });
		} else {
			result.events.push({ minute: min, type: "SHOT", teamId, description: "Tir sur CPA", xg: xG });
		}
	}
}
