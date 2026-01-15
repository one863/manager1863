import { getNarrative } from "@/data/narratives";
import type { Player } from "@/db/db";
import { clamp, getRandomElement, probability, randomInt } from "@/utils/math";
import { 
	calculateSuccessRate, 
	getFatiguePenalty, 
	weightedPick, 
	boxMullerRandom 
} from "./probabilities";
import type { MatchEvent, MatchResult, TeamRatings } from "./types";

/**
 * Calcule le skill effectif basé sur la forme avec sécurité
 */
function getEffectiveStat(stat: number, form: number): number {
	const safeStat = stat || 1;
	const safeForm = form || 5;
	const multiplier = 0.6 + safeForm / 10;
	return safeStat * multiplier;
}

/**
 * Calcule la note de performance individuelle (Rating 1-10) avec sécurité
 */
function calculateMatchRating(
	player: Player,
	teamScore: number,
	opponentScore: number,
	events: MatchEvent[],
): number {
	const safeSkill = player.skill || 5;
	const safeForm = player.form || 5;
	const safeExp = player.experience || 1;
	const safeEnergy = player.energy || 100;

	let rating = boxMullerRandom(safeSkill, 1.0);

	const formMult = 0.8 + safeForm / 20; 
	const expBonus = (safeExp / 10) * 0.5;
	rating = rating * formMult + expBonus;

	const goals = events.filter(e => e.type === "GOAL" && e.scorerId === player.id).length;
	rating += goals * 1.5;

	const scoreDiff = teamScore - opponentScore;
	rating += scoreDiff * 0.2;

	const fatiguePenalty = getFatiguePenalty(safeEnergy);
	rating *= (0.7 + fatiguePenalty * 0.3);

	const finalRating = clamp(rating, 1, 10);
	return isNaN(finalRating) ? 5.0 : finalRating;
}

export async function simulateMatch(
	home: TeamRatings,
	away: TeamRatings,
	homeTeamId: number,
	awayTeamId: number,
	homePlayers: Player[],
	awayPlayers: Player[],
	homeName: string,
	awayName: string,
): Promise<MatchResult> {
	const result: MatchResult = {
		homeScore: 0,
		awayScore: 0,
		homePossession: 0,
		events: [],
		stats: { homeChances: 0, awayChances: 0 },
		playerPerformances: {},
	};

	const HOME_BONUS = 1.03;
	const adjustedHomeMidfield = (home.midfield || 1) * HOME_BONUS;
	const awayMidfield = away.midfield || 1;

	const homeStarters = homePlayers.filter(p => p.isStarter);
	const awayStarters = awayPlayers.filter(p => p.isStarter);

	const getAvgEnergy = (starters: Player[]) => {
		if (starters.length === 0) return 100;
		return starters.reduce((acc, p) => acc + (p.energy || 100), 0) / starters.length;
	};
	const homeStartEnergy = getAvgEnergy(homeStarters);
	const awayStartEnergy = getAvgEnergy(awayStarters);

	const getAvgStamina = (starters: Player[]) => {
		if (starters.length === 0) return 5;
		return starters.reduce((acc, p) => acc + getEffectiveStat(p.stats?.stamina || 5, p.form), 0) / starters.length;
	};
	const homeStaminaAttr = getAvgStamina(homeStarters);
	const awayStaminaAttr = getAvgStamina(awayStarters);

	const homeMidPenalty = getFatiguePenalty(homeStartEnergy);
	const awayMidPenalty = getFatiguePenalty(awayStartEnergy);
	
	// CORRECTION POSSESSION : Pente plus forte (2.5 au lieu de 1.5)
	// Un milieu à 5 joueurs (Note 5) contre un milieu à 3 (Note 3) -> Ratio 1.66
	// Avec pente 2.5, la possession sera écrasante (~85-90%)
	const possessionChance = calculateSuccessRate(
		adjustedHomeMidfield * homeMidPenalty, 
		awayMidfield * awayMidPenalty, 
		2.5 
	);
	result.homePossession = Math.round(possessionChance * 100);

	let totalCycles = 32;
	if (home.strategy === "OFFENSIVE") totalCycles += 2;
	if (away.strategy === "OFFENSIVE") totalCycles += 2;
	if (home.strategy === "DEFENSIVE") totalCycles -= 2;
	if (away.strategy === "DEFENSIVE") totalCycles -= 2;
	totalCycles = clamp(totalCycles, 24, 40);

	const cycleDuration = 90 / totalCycles;

	for (let cycle = 0; cycle < totalCycles; cycle++) {
		const minute = Math.floor(cycle * cycleDuration) + randomInt(1, 2);

		const getDynamicFatigueFactor = (startEnergy: number, staminaAttr: number) => {
			const drainPerMinute = 1.5 - (staminaAttr / 10); 
			const currentEnergy = Math.max(0, startEnergy - (drainPerMinute * minute));
			return getFatiguePenalty(currentEnergy);
		};

		const homeFatigue = getDynamicFatigueFactor(homeStartEnergy, homeStaminaAttr);
		const awayFatigue = getDynamicFatigueFactor(awayStartEnergy, awayStaminaAttr);

		const scoreDiff = result.homeScore - result.awayScore;
		const homeComplacency = scoreDiff >= 3 ? 0.85 : 1.0;
		const awayComplacency = scoreDiff <= -3 ? 0.85 : 1.0;

		const currentHomeMid = adjustedHomeMidfield * homeFatigue * homeComplacency;
		const currentAwayMid = awayMidfield * awayFatigue * awayComplacency;

		// Même pente forte pour le contrôle du cycle
		const homeControlChance = calculateSuccessRate(currentHomeMid, currentAwayMid, 2.5);
		const controllingTeam = Math.random() < homeControlChance ? "home" : "away";

		const getEffectiveRatings = (base: TeamRatings, fatigue: number, complacency: number) => {
			const attackFactor = fatigue * complacency;
			return {
				...base,
				attackLeft: base.attackLeft * attackFactor,
				attackCenter: base.attackCenter * attackFactor,
				attackRight: base.attackRight * attackFactor,
				defenseLeft: base.defenseLeft * fatigue,
				defenseCenter: base.defenseCenter * fatigue,
				defenseRight: base.defenseRight * fatigue,
			};
		};

		const homeCycleRatings = getEffectiveRatings(home, homeFatigue, homeComplacency);
		const awayCycleRatings = getEffectiveRatings(away, awayFatigue, awayComplacency);

		const attackingRatings = controllingTeam === "home" ? homeCycleRatings : awayCycleRatings;
		const defendingRatings = controllingTeam === "home" ? awayCycleRatings : homeCycleRatings;
		const attackingId = controllingTeam === "home" ? homeTeamId : awayTeamId;
		const attackingStarters = controllingTeam === "home" ? homeStarters : awayStarters;
		const defendingStarters = controllingTeam === "home" ? awayStarters : homeStarters;
		const attackingName = controllingTeam === "home" ? homeName : awayName;

		if (attackingStarters.length === 0) continue;

		if (controllingTeam === "home") result.stats.homeChances++;
		else result.stats.awayChances++;

		const actionRoll = Math.random();

		if (actionRoll < 0.03) {
			handleSetPiece(result, minute, controllingTeam, attackingRatings, defendingRatings, attackingId, attackingStarters, attackingName);
			continue;
		}

		if (actionRoll < 0.05) {
			handleSpecialEvent(result, minute, controllingTeam, attackingId, attackingStarters, attackingName);
			continue;
		}

		const opponentStrategy = controllingTeam === "home" ? away.strategy : home.strategy;
		
		handleNormalAttack(
			result, minute, controllingTeam, 
			attackingRatings, defendingRatings, 
			attackingId, attackingStarters, defendingStarters, attackingName,
			opponentStrategy
		);
	}

	if (result.homePossession > 60 && away.tacticType === "CA") {
		handleCounterAttack(result, "away", away, home, awayTeamId, awayStarters, homeStarters, awayName);
	} else if (result.homePossession < 40 && home.tacticType === "CA") {
		handleCounterAttack(result, "home", home, away, homeTeamId, homeStarters, awayStarters, homeName);
	}

	if (probability(0.05)) {
		const pressTeam = home.tacticType === "PRESSING" ? "home" : away.tacticType === "PRESSING" ? "away" : null;
		if (pressTeam) {
			const tId = pressTeam === "home" ? homeTeamId : awayTeamId;
			const attStarters = pressTeam === "home" ? homeStarters : awayStarters;
			const defStarters = pressTeam === "home" ? awayStarters : homeStarters;
			const tName = pressTeam === "home" ? homeName : awayName;
			
			if (attStarters.length > 0) {
				result.events.push({
					minute: randomInt(10, 80),
					type: "TRANSITION",
					teamId: tId,
					description: getUniqueNarrativeString("match", "transition", { team: pressTeam === "home" ? "Home" : "Away" }, result.events),
				});
				handleNormalAttack(result, randomInt(10, 80), pressTeam, pressTeam === "home" ? home : away, pressTeam === "home" ? away : home, tId, attStarters, defStarters, tName, "BALANCED");
			}
		}
	}

	result.events.sort((a, b) => a.minute - b.minute);

	homeStarters.forEach(p => {
		result.playerPerformances![p.id!.toString()] = calculateMatchRating(p, result.homeScore, result.awayScore, result.events);
	});
	awayStarters.forEach(p => {
		result.playerPerformances![p.id!.toString()] = calculateMatchRating(p, result.awayScore, result.homeScore, result.events);
	});

	return result;
}

function getUniqueNarrativeString(category: string, subCategory: string, params: any, existingEvents: MatchEvent[]): string {
	let text = getNarrative(category, subCategory, params).content;
	let attempts = 0;
	while (existingEvents.some((e) => e.description === text) && attempts < 5) {
		text = getNarrative(category, subCategory, params).content;
		attempts++;
	}
	return text;
}

function handleNormalAttack(
	result: MatchResult, 
	minute: number, 
	controllingTeam: "home" | "away", 
	att: TeamRatings, 
	def: TeamRatings, 
	teamId: number, 
	players: Player[], 
	_defenders: Player[], 
	teamName: string,
	opponentStrategy: string 
) {
	const sectorRoll = Math.random();
	const sector: "Left" | "Center" | "Right" = sectorRoll < 0.33 ? "Left" : sectorRoll < 0.66 ? "Right" : "Center";

	const diffLeft = (att.attackLeft || 1) - (def.defenseRight || 1);
	const diffCenter = (att.attackCenter || 1) - (def.defenseCenter || 1);
	const diffRight = (att.attackRight || 1) - (def.defenseLeft || 1);

	const options = [
		{ id: "Left", weight: Math.max(1, 10 + diffLeft * 3) },
		{ id: "Center", weight: Math.max(1, 10 + diffCenter * 3) },
		{ id: "Right", weight: Math.max(1, 10 + diffRight * 3) },
	];

	const selected = weightedPick(options.map(o => ({ item: o.id, weight: o.weight })));
	const chosenSector = selected as "Left" | "Center" | "Right";

	let attackPower = (att as any)[`attack${chosenSector}`] || 1;
	const defSector = chosenSector === "Left" ? "Right" : chosenSector === "Right" ? "Left" : "Center";
	const defensePower = (def as any)[`defense${defSector}`] || 1;

	if (players.length === 0) return;

	const candidates = players.map(p => {
		let weight = 1;
		if (p.position === "FWD") weight = 12;
		if (p.position === "MID") weight = 4;
		if (p.position === "DEF") weight = 1;
		const skill = p.stats?.scoring || p.stats?.shooting || 5;
		weight *= (skill / 5);
		return { item: p, weight };
	});
	const shooter = weightedPick(candidates);

	const rawShooting = shooter.stats?.scoring || shooter.stats?.shooting || 5;
	const shooterShooting = getEffectiveStat(rawShooting, shooter.form);
	
	const shootingBonus = 0.5 + shooterShooting / 10;
	attackPower *= shootingBonus;

	const dominationRatio = attackPower / (defensePower || 1);
	
	let scoringChance = 0.09 * Math.pow(dominationRatio, 1.5);
	scoringChance = clamp(scoringChance, 0.005, 0.45);

	if (att.strategy === "DEFENSIVE") {
		scoringChance *= 0.8;
	}

	if (att.strategy === "DEFENSIVE" && opponentStrategy === "DEFENSIVE") {
		scoringChance *= 0.75;
	}

	if (probability(scoringChance)) {
		if (controllingTeam === "home") result.homeScore++;
		else result.awayScore++;

		result.events.push({
			minute,
			type: "GOAL",
			teamId,
			scorerId: shooter.id,
			scorerName: shooter.lastName,
			description: getUniqueNarrativeString("match", "goal", { player: shooter.lastName, team: teamName }, result.events),
		});
	} else {
		if (scoringChance > 0.1 || probability(0.3)) {
			result.events.push({
				minute,
				type: "MISS",
				teamId,
				description: getUniqueNarrativeString("match", "miss", { player: shooter.lastName }, result.events),
			});
		}
	}
}

function handleSetPiece(result: MatchResult, minute: number, controllingTeam: "home" | "away", att: TeamRatings, def: TeamRatings, teamId: number, players: Player[], teamName: string) {
	let chance = calculateSuccessRate(att.setPieces || 1, def.defenseCenter || 1, 1.8) * 0.20;

	if (att.strategy === "DEFENSIVE") {
		chance *= 0.8;
	}

	if (players.length === 0) return;

	if (probability(chance)) {
		if (controllingTeam === "home") result.homeScore++;
		else result.awayScore++;

		const taker = players.reduce((prev, curr) => {
			const prevRaw = prev.stats?.setPieces || prev.stats?.shooting || 0;
			const currRaw = curr.stats?.setPieces || curr.stats?.shooting || 0;
			const prevVal = getEffectiveStat(prevRaw, prev.form);
			const currVal = getEffectiveStat(currRaw, curr.form);
			return prevVal > currVal ? prev : curr;
		});
		result.events.push({
			minute,
			type: "GOAL",
			teamId,
			scorerId: taker.id,
			scorerName: taker.lastName,
			description: `But sur coup de pied arrêté magnifique pour ${teamName} !`,
		});
	} else {
		if (probability(0.5)) {
			result.events.push({
				minute,
				type: "SET_PIECE",
				teamId,
				description: "Coup franc dangereux mais repoussé par la défense.",
			});
		}
	}
}

function handleSpecialEvent(result: MatchResult, minute: number, controllingTeam: "home" | "away", teamId: number, players: Player[], teamName: string) {
	if (players.length === 0) return;
	const speedster = players.find((p) => {
		const effectiveSpeed = getEffectiveStat(p.stats?.speed || 5, p.form);
		const currentEnergy = (p.energy || 100) - (minute * 0.8);
		return effectiveSpeed > 8 && currentEnergy > 40;
	});

	if (speedster && probability(0.15)) {
		result.events.push({
			minute,
			type: "SPECIAL",
			teamId,
			scorerId: speedster.id,
			scorerName: speedster.lastName,
			description: `${speedster.lastName} prend tout le monde de vitesse !`,
		});

		if (probability(0.20)) {
			if (controllingTeam === "home") result.homeScore++;
			else result.awayScore++;

			result.events.push({
				minute,
				type: "GOAL",
				teamId,
				scorerId: speedster.id,
				scorerName: speedster.lastName,
				description: `Et c'est au fond ! Quel raid solitaire pour ${teamName} !`,
			});
		}
	}
}

function handleCounterAttack(result: MatchResult, teamName: "home" | "away", att: TeamRatings, def: TeamRatings, teamId: number, players: Player[], defenders: Player[], realTeamName: string) {
	// CORRECTION CA : Plus sensible à la défense
	const caChance = calculateSuccessRate(att.tacticSkill || 1, def.defenseCenter || 1, 1.8);

	if (probability(caChance)) {
		const minute = randomInt(10, 85);
		result.events.push({
			minute,
			type: "TRANSITION",
			teamId,
			description: "Contre-attaque fulgurante lancée !",
		});
		
		// CORRECTION OVER-EXTENSION : Si la défense est faible (ex: 2 défenseurs), on booste le xG
		// On détecte la faiblesse via la note défensive moyenne
		const avgDef = (def.defenseCenter + def.defenseLeft + def.defenseRight) / 3;
		// Si défense très faible (2-3-5), le xG de la CA est multiplié
		const extensionMalus = avgDef < 2.5 ? 2.5 : 1.0; 
		
		// On appelle handleNormalAttack mais on ne peut pas passer de paramètre custom xG facilement
		// Donc on va "tricher" en boostant temporairement l'attaque pour ce cycle
		const boostedAtt = { ...att, attackCenter: att.attackCenter * 1.5 * extensionMalus };
		
		handleNormalAttack(result, minute, teamName, boostedAtt, def, teamId, players, defenders, realTeamName, "BALANCED");
	}
}
