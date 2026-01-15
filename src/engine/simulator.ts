import { getNarrative } from "@/data/narratives";
import type { Player } from "@/db/db";
import { clamp, getRandomElement, probability, randomInt } from "@/utils/math";
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
	// Sécurité sur les valeurs d'entrée
	const safeSkill = player.skill || 5;
	const safeForm = player.form || 5;
	const safeExp = player.experience || 1;
	const safeEnergy = player.energy || 100;
	const safeStamina = player.stats?.stamina || 5;

	// 1. Base
	let baseStat = safeSkill;
	if (player.position === "GK") baseStat = player.stats?.defense || 5;
	if (player.position === "FWD") baseStat = player.stats?.scoring || player.stats?.shooting || 5;
	if (player.position === "MID") baseStat = player.stats?.playmaking || 5;
	if (player.position === "DEF") baseStat = player.stats?.defense || 5;

	// 2. Multiplicateurs Forme & Expérience
	const formMult = 0.8 + safeForm / 20; 
	const expBonus = (safeExp / 10) * 0.5;
	
	let rating = baseStat * formMult + expBonus;

	// 3. Impact des événements
	const goals = events.filter(e => e.type === "GOAL" && e.scorerId === player.id).length;
	rating += goals * 1.5;

	// 4. Impact du score d'équipe
	const scoreDiff = teamScore - opponentScore;
	rating += scoreDiff * 0.2;

	// 5. Aléatoire (+/- 5%)
	const variation = 1 + (Math.random() - 0.5) * 0.1;
	rating *= variation;

	// 6. Fatigue
	const estimatedFinalEnergy = Math.max(0.5, (safeEnergy / 100) * (0.7 + (safeStamina / 10) * 0.3));
	rating *= estimatedFinalEnergy;

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

	const HOME_BONUS = 1.05;
	const adjustedHomeMidfield = (home.midfield || 1) * HOME_BONUS;
	const awayMidfield = away.midfield || 1;

	const getAvgStamina = (players: Player[]) => {
		const starters = players.filter((p) => p.isStarter);
		if (starters.length === 0) return 5;
		return (
			starters.reduce((acc, p) => acc + getEffectiveStat(p.stats?.stamina || 5, p.form), 0) /
			starters.length
		);
	};
	const homeAvgStamina = getAvgStamina(homePlayers);
	const awayAvgStamina = getAvgStamina(awayPlayers);

	const homeMid3 = Math.pow(adjustedHomeMidfield, 3);
	const awayMid3 = Math.pow(awayMidfield, 3);
	result.homePossession = Math.round((homeMid3 / (homeMid3 + awayMid3)) * 100);

	const CYCLES = 15;
	const cycleDuration = 90 / CYCLES;

	for (let cycle = 0; cycle < CYCLES; cycle++) {
		const minute = Math.floor(cycle * cycleDuration) + randomInt(1, 4);

		const getFatigueFactor = (avgStamina: number) => {
			const decayRate = (11 - (avgStamina || 5)) / 20;
			return 1 - decayRate * (minute / 90);
		};

		const homeFatigue = getFatigueFactor(homeAvgStamina);
		const awayFatigue = getFatigueFactor(awayAvgStamina);

		let homeComplacency = 1.0;
		let awayComplacency = 1.0;

		if (result.homeScore - result.awayScore >= 4) homeComplacency = 0.8;
		else if (result.awayScore - result.homeScore >= 4) awayComplacency = 0.8;

		const currentHomeMid = adjustedHomeMidfield * homeFatigue * homeComplacency;
		const currentAwayMid = awayMidfield * awayFatigue * awayComplacency;

		const h3 = Math.pow(currentHomeMid || 1, 3);
		const a3 = Math.pow(currentAwayMid || 1, 3);
		const homeControlChance = h3 / (h3 + a3);

		const controllingTeam = Math.random() < homeControlChance ? "home" : "away";

		const getEffectiveRatings = (
			base: TeamRatings,
			fatigue: number,
			complacency: number,
		) => {
			const r = { ...base };
			const attackFactor = fatigue * complacency;
			const defFactor = fatigue;

			(r as any).attackLeft *= attackFactor;
			(r as any).attackCenter *= attackFactor;
			(r as any).attackRight *= attackFactor;

			(r as any).defenseLeft *= defFactor;
			(r as any).defenseCenter *= defFactor;
			(r as any).defenseRight *= defFactor;
			return r;
		};

		const homeCycleRatings = getEffectiveRatings(home, homeFatigue, homeComplacency);
		const awayCycleRatings = getEffectiveRatings(away, awayFatigue, awayComplacency);

		const attackingRatings = controllingTeam === "home" ? homeCycleRatings : awayCycleRatings;
		const defendingRatings = controllingTeam === "home" ? awayCycleRatings : homeCycleRatings;
		const attackingId = controllingTeam === "home" ? homeTeamId : awayTeamId;
		const attackingPlayers = (controllingTeam === "home" ? homePlayers : awayPlayers).filter(p => p.isStarter);
		const defendingPlayers = (controllingTeam === "home" ? awayPlayers : homePlayers).filter(p => p.isStarter);
		const attackingName = controllingTeam === "home" ? homeName : awayName;

		if (attackingPlayers.length === 0) continue;

		if (controllingTeam === "home") result.stats.homeChances++;
		else result.stats.awayChances++;

		const actionRoll = Math.random();

		if (actionRoll < 0.05) {
			handleSetPiece(result, minute, controllingTeam, attackingRatings, defendingRatings, attackingId, attackingPlayers, attackingName);
			continue;
		}

		if (actionRoll < 0.08) {
			handleSpecialEvent(result, minute, controllingTeam, attackingId, attackingPlayers, attackingName);
			continue;
		}

		handleNormalAttack(result, minute, controllingTeam, attackingRatings, defendingRatings, attackingId, attackingPlayers, defendingPlayers, attackingName);
	}

	if (result.homePossession > 60 && away.tacticType === "CA") {
		handleCounterAttack(result, "away", away, home, awayTeamId, awayPlayers.filter(p => p.isStarter), homePlayers.filter(p => p.isStarter), awayName);
	} else if (result.homePossession < 40 && home.tacticType === "CA") {
		handleCounterAttack(result, "home", home, away, homeTeamId, homePlayers.filter(p => p.isStarter), awayPlayers.filter(p => p.isStarter), homeName);
	}

	if (probability(0.05)) {
		const pressTeam = home.tacticType === "PRESSING" ? "home" : away.tacticType === "PRESSING" ? "away" : null;
		if (pressTeam) {
			const tId = pressTeam === "home" ? homeTeamId : awayTeamId;
			const attPlayers = (pressTeam === "home" ? homePlayers : awayPlayers).filter(p => p.isStarter);
			const defPlayers = (pressTeam === "home" ? awayPlayers : homePlayers).filter(p => p.isStarter);
			const tName = pressTeam === "home" ? homeName : awayName;
			
			if (attPlayers.length > 0) {
				result.events.push({
					minute: randomInt(10, 80),
					type: "TRANSITION",
					teamId: tId,
					description: getUniqueNarrativeString("match", "transition", { team: pressTeam === "home" ? "Home" : "Away" }, result.events),
				});
				handleNormalAttack(result, randomInt(10, 80), pressTeam, pressTeam === "home" ? home : away, pressTeam === "home" ? away : home, tId, attPlayers, defPlayers, tName);
			}
		}
	}

	result.events.sort((a, b) => a.minute - b.minute);

	homePlayers.filter(p => p.isStarter).forEach(p => {
		result.playerPerformances![p.id!.toString()] = calculateMatchRating(p, result.homeScore, result.awayScore, result.events);
	});
	awayPlayers.filter(p => p.isStarter).forEach(p => {
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

function handleNormalAttack(result: MatchResult, minute: number, controllingTeam: "home" | "away", att: TeamRatings, def: TeamRatings, teamId: number, players: Player[], _defenders: Player[], teamName: string) {
	const sectorRoll = Math.random();
	const sector: "Left" | "Center" | "Right" = sectorRoll < 0.33 ? "Left" : sectorRoll < 0.66 ? "Right" : "Center";

	let attackPower = (att as any)[`attack${sector}`] || 1;
	const defensePower = (def as any)[`defense${sector}`] || 1;

	if (players.length === 0) return;

	const fwds = players.filter((p) => p.position === "FWD");
	const mids = players.filter((p) => p.position === "MID");
	const defs = players.filter((p) => p.position === "DEF");

	const roll = Math.random();
	let shooter: Player;
	if (roll < 0.5 && fwds.length > 0) shooter = getRandomElement(fwds);
	else if (roll < 0.9 && mids.length > 0) shooter = getRandomElement(mids);
	else if (defs.length > 0) shooter = getRandomElement(defs);
	else shooter = getRandomElement(players);

	const rawShooting = shooter.stats?.scoring || shooter.stats?.shooting || 5;
	const shooterShooting = getEffectiveStat(rawShooting, shooter.form);
	
	const shootingBonus = 0.5 + shooterShooting / 10;
	attackPower *= shootingBonus;

	const attack3 = Math.pow(attackPower, 3);
	const defense3 = Math.pow(defensePower, 3);
	let scoringChance = attack3 / (attack3 + defense3);

	if (att.strategy === "DEFENSIVE") {
		scoringChance *= 0.8;
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
		if (scoringChance > 0.2 || probability(0.3)) {
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
	const att3 = Math.pow(att.setPieces || 1, 3);
	const def3 = Math.pow(def.defenseCenter || 1, 3);
	let chance = att3 / (att3 + def3);

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
		return effectiveSpeed > 8 && p.condition > 50;
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

		if (probability(0.35)) {
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
	const skill3 = Math.pow(att.tacticSkill || 1, 3);
	const def3 = Math.pow(def.defenseCenter || 1, 3);
	const caChance = skill3 / (skill3 + def3);

	if (probability(caChance)) {
		const minute = randomInt(10, 85);
		result.events.push({
			minute,
			type: "TRANSITION",
			teamId,
			description: "Contre-attaque fulgurante lancée !",
		});
		handleNormalAttack(result, minute, teamName, att, def, teamId, players, defenders, realTeamName);
	}
}
