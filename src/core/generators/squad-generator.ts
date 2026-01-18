import { db } from "@/core/db/db";
import { generatePlayer } from "./players-generator";
import { randomInt } from "@/core/utils/math";

export async function generateFullSquad(
	saveId: number,
	teamId: number,
	avgSkill = 5,
) {
	const players = [];

	/**
	 * Total 22 joueurs avec répartition variable :
	 * - GK: 2-3
	 * - DEF: 6-8
	 * - MID: 6-8
	 * - FWD: 4-6
	 * On ajuste pour que le total soit exactement 22.
	 */
	
	const gkCountTarget = randomInt(2, 3);
	const defCountTarget = randomInt(6, 8);
	const midCountTarget = randomInt(6, 8);
	// Le reste en FWD pour atteindre 22
	const fwdCountTarget = 22 - (gkCountTarget + defCountTarget + midCountTarget);

	// Génération des Gardiens
	for (let i = 0; i < gkCountTarget; i++) {
		players.push({ ...generatePlayer(avgSkill + (i === 0 ? 0 : -1), "GK"), saveId, teamId });
	}

	// Génération des Défenseurs
	for (let i = 0; i < defCountTarget; i++) {
		players.push({ ...generatePlayer(avgSkill + (Math.random() * 2 - 1), "DEF"), saveId, teamId });
	}

	// Génération des Milieux
	for (let i = 0; i < midCountTarget; i++) {
		players.push({ ...generatePlayer(avgSkill + (Math.random() * 2 - 1), "MID"), saveId, teamId });
	}

	// Génération des Attaquants
	for (let i = 0; i < fwdCountTarget; i++) {
		players.push({ ...generatePlayer(avgSkill + (Math.random() * 2 - 1), "FWD"), saveId, teamId });
	}

	// Assigner les titulaires par défaut (les meilleurs par poste pour une formation 4-4-2)
	players.sort((a, b) => (b.skill || 0) - (a.skill || 0));
	
	let gkStarters = 0;
	let defStarters = 0;
	let midStarters = 0;
	let fwdStarters = 0;

	// Tactique par défaut 4-4-2
	players.forEach(p => {
		let isStarter = false;
		if (p.position === "GK" && gkStarters < 1) { isStarter = true; gkStarters++; }
		else if (p.position === "DEF" && defStarters < 4) { isStarter = true; defStarters++; }
		else if (p.position === "MID" && midStarters < 4) { isStarter = true; midStarters++; }
		else if (p.position === "FWD" && fwdStarters < 2) { isStarter = true; fwdStarters++; }
		p.isStarter = isStarter;
	});

	await db.players.bulkAdd(players as any);
}
