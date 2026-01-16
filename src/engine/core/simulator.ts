import { getNarrative } from "@/data/narratives";
import type { Player, PlayerTrait } from "@/db/db";
import { clamp, probability, randomInt } from "@/utils/math";
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
	const multiplier = 0.6 + form / 10;
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
	if (events.some(e => e.type === "CARD" && e.playerId === player.id)) rating -= 3.0;
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

	let hStarters = homePlayers.filter(p => p.isStarter).map(p => ({ ...p }));
	let aStarters = awayPlayers.filter(p => p.isStarter).map(p => ({ ...p }));
	[...hStarters, ...aStarters].forEach(p => { result.playerStats![p.id!.toString()] = initPlayerStats(p); });

	const unavailablePlayers = new Set<number>();
	let totalCycles = 40; 
	const cycleDuration = 90 / totalCycles;
	let hControlCycles = 0, totalControlCycles = 0;

	for (let cycle = 0; cycle < totalCycles; cycle++) {
		const minute = Math.floor(cycle * cycleDuration) + randomInt(1, 2);
		const applyPhys = (starters: Player[], isHome: boolean) => {
			starters.forEach(p => {
				if (unavailablePlayers.has(p.id!)) return;
				const pStat = result.playerStats![p.id!.toString()];
				const vol = (p.stats.volume || 10) / 20;
				const fp = getFatiguePenalty(p.energy || 100);
				p.energy = Math.max(0, (p.energy || 100) - ((1.5 - vol) * (2 - fp) * (90/totalCycles)));
				const dist = (0.2 + Math.random() * 0.05) * (0.8 + vol * 0.4);
				pStat.distance += dist;
				if (isHome) result.stats.homeDistance += dist; else result.stats.awayDistance += dist;
				if (Math.random() < 0.1 * (p.stats.explosivity / 20) * fp) pStat.sprints++;
			});
		};
		applyPhys(hStarters, true); applyPhys(aStarters, false);

		const hR = hStarters.reduce((acc, p) => acc + (p.stats.resistance || 10) * getFatiguePenalty(p.energy), 0) / 11;
		const aP = aStarters.reduce((acc, p) => acc + (p.stats.pressing || 10) * getFatiguePenalty(p.energy), 0) / 11;
		const hControlChance = calculateSuccessRate(home.midfield * 1.1 * (hR / 10), away.midfield * (aP / 10), 1.2);
		const controllingTeam = Math.random() < hControlChance ? "home" : "away";
		if (controllingTeam === "home") hControlCycles++;
		totalControlCycles++;

		if (controllingTeam === "home") result.stats.awayPPDA += 1; else result.stats.homePPDA += 1;

		const attStarters = (controllingTeam === "home" ? hStarters : aStarters).filter(p => !unavailablePlayers.has(p.id!));
		const defStarters = (controllingTeam === "home" ? aStarters : hStarters).filter(p => !unavailablePlayers.has(p.id!));
		
		const handleCycleStats = (attP: Player[], defP: Player[], isH: boolean) => {
			const passes = randomInt(5, 10), duels = randomInt(2, 5);
			if (isH) { result.stats.homePasses += passes; result.stats.awayDefensiveActions += 1; } else { result.stats.awayPasses += passes; result.stats.homeDefensiveActions += 1; }
			for (let i = 0; i < passes; i++) {
				const p = attP[randomInt(0, attP.length - 1)];
				const pS = result.playerStats![p.id!.toString()];
				pS.passes++; if (Math.random() < calculateSuccessRate(p.stats.resistance, 12, 1.3)) pS.passesSuccess++;
			}
			for (let i = 0; i < duels; i++) {
				const pA = attP[randomInt(0, attP.length - 1)], pD = defP[randomInt(0, defP.length - 1)];
				result.playerStats![pA.id!.toString()].duels++; result.playerStats![pD.id!.toString()].duels++;
				if (Math.random() < calculateSuccessRate(pA.stats.impact, pD.stats.impact)) {
					result.playerStats![pA.id!.toString()].duelsWon++; if (isH) result.stats.homeDuelsWon++; else result.stats.awayDuelsWon++;
				} else {
					result.playerStats![pD.id!.toString()].duelsWon++; if (isH) result.stats.awayDuelsWon++; else result.stats.homeDuelsWon++;
				}
			}
		};
		handleCycleStats(attStarters, defStarters, controllingTeam === "home");

		const actionRoll = Math.random();
		if (actionRoll < 0.15) handleNormalAttack(result, minute, controllingTeam, controllingTeam === "home" ? home : away, controllingTeam === "home" ? away : home, controllingTeam === "home" ? homeTeamId : awayTeamId, attStarters, defStarters, controllingTeam === "home" ? homeName : awayName);
		else if (actionRoll < 0.20) handleSetPiece(result, minute, controllingTeam, controllingTeam === "home" ? home : away, controllingTeam === "home" ? away : home, controllingTeam === "home" ? homeTeamId : awayTeamId, attStarters, defStarters, controllingTeam === "home" ? homeName : awayName);
	}

	result.homePossession = Math.round((hControlCycles / totalControlCycles) * 100);
	result.stats.homePPDA = result.stats.homeDefensiveActions > 0 ? Number((result.stats.homePPDA / result.stats.homeDefensiveActions).toFixed(1)) : 0;
	result.stats.awayPPDA = result.stats.awayDefensiveActions > 0 ? Number((result.stats.awayPPDA / result.stats.awayDefensiveActions).toFixed(1)) : 0;

	[...hStarters, ...aStarters].forEach(p => {
		const isH = hStarters.some(hp => hp.id === p.id);
		const pS = result.playerStats![p.id!.toString()];
		const r = calculateMatchRating(p, pS, isH ? result.homeScore : result.awayScore, isH ? result.awayScore : result.homeScore, result.events);
		pS.rating = r; result.playerPerformances![p.id!.toString()] = r;
	});

	result.events.sort((a, b) => a.minute - b.minute);
	return result;
}

function handleNormalAttack(result: MatchResult, min: number, side: "home" | "away", attR: TeamRatings, defR: TeamRatings, teamId: number, attP: Player[], defP: Player[], teamName: string) {
	const sector = Math.random() < 0.33 ? "Left" : Math.random() < 0.5 ? "Right" : "Center";
	if (!probability(calculateSuccessRate((attR as any)[`attack${sector}`], (defR as any)[`defense${sector === "Left" ? "Right" : sector === "Right" ? "Left" : "Center"}`], 1.2) * 0.8)) return;
	const shooter = weightedPick(attP.map(p => ({ item: p, weight: p.position === "FWD" ? 15 : p.position === "MID" ? 5 : 1 })));
	const assister = weightedPick(attP.filter(p => p.id !== shooter.id).map(p => ({ item: p, weight: p.position === "MID" ? 15 : 2 })));
	const gk = defP.find(p => p.position === "GK");
	const sS = getEffectiveStat(shooter.stats.finishing, shooter.form) * getFatiguePenalty(shooter.energy);
	const gS = gk ? getEffectiveStat(gk.stats.goalkeeping || 10, gk.form) * getFatiguePenalty(gk.energy) : 1;
	let xG = calculateSuccessRate(sS, gS, 1.5) * 0.7;
	if (shooter.traits?.includes("CLUTCH_FINISHER")) xG *= 1.3;
	xG = clamp(xG, 0.05, 0.9);
	if (side === "home") { result.stats.homeXG += xG; result.stats.homeShots++; } else { result.stats.awayXG += xG; result.stats.awayShots++; }
	const pS = result.playerStats![shooter.id!.toString()]; pS.shots++; pS.xg += xG;
	result.playerStats![assister.id!.toString()].xa += xG * 0.7;
	if (probability(xG)) {
		if (side === "home") result.homeScore++; else result.awayScore++;
		pS.goals++; result.playerStats![assister.id!.toString()].assists++;
		result.events.push({ minute: min, type: "GOAL", teamId, scorerId: shooter.id, scorerName: shooter.lastName, description: getNarrative("match", "goal", { player: shooter.lastName, team: teamName }).content, xg: xG });
	} else if (xG > 0.15) {
		result.events.push({ minute: min, type: "MISS", teamId, description: gk && probability(0.5) ? `${gk.lastName} réalise un arrêt décisif !` : getNarrative("match", "miss", { player: shooter.lastName }).content, xg: xG });
	}
}

function handleSetPiece(result: MatchResult, min: number, side: "home" | "away", attR: TeamRatings, defR: TeamRatings, teamId: number, attP: Player[], defP: Player[], teamName: string) {
	const xG = clamp(calculateSuccessRate(attR.setPieces, defR.defenseCenter, 1.5) * 0.4, 0.1, 0.6);
	if (side === "home") { result.stats.homeXG += xG; result.stats.homeShots++; } else { result.stats.awayXG += xG; result.stats.awayShots++; }
	const shooter = [...attP].sort((a,b) => (b.stats.impact || 0) - (a.stats.impact || 0))[0];
	const pS = result.playerStats![shooter.id!.toString()]; pS.shots++; pS.xg += xG;
	if (probability(xG)) {
		if (side === "home") result.homeScore++; else result.awayScore++;
		pS.goals++;
		result.events.push({ minute: min, type: "GOAL", teamId, scorerId: shooter.id, scorerName: shooter.lastName, description: `But de ${shooter.lastName} sur CPA !`, xg: xG });
	}
}
