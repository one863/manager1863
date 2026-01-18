import { db } from "@/core/db/db";
import { generatePlayer } from "./players-generator";

export async function generateFullSquad(
	saveId: number,
	teamId: number,
	avgSkill = 5,
) {
	const players = [];

	// 2 Gardiens
	players.push({ ...generatePlayer(avgSkill, "GK"), saveId, teamId });
	players.push({ ...generatePlayer(avgSkill - 1, "GK"), saveId, teamId });

	// 6 Défenseurs
	for (let i = 0; i < 6; i++) {
		players.push({ ...generatePlayer(avgSkill, "DEF"), saveId, teamId });
	}

	// 6 Milieux
	for (let i = 0; i < 6; i++) {
		players.push({ ...generatePlayer(avgSkill, "MID"), saveId, teamId });
	}

	// 4 Attaquants
	for (let i = 0; i < 4; i++) {
		players.push({ ...generatePlayer(avgSkill, "FWD"), saveId, teamId });
	}

	// Assigner les titulaires par défaut (les meilleurs)
	players.sort((a, b) => (b.skill || 0) - (a.skill || 0));
	
	let gkCount = 0;
	let defCount = 0;
	let midCount = 0;
	let fwdCount = 0;

	// Tactique par défaut 4-4-2
	players.forEach(p => {
		let isStarter = false;
		if (p.position === "GK" && gkCount < 1) { isStarter = true; gkCount++; }
		else if (p.position === "DEF" && defCount < 4) { isStarter = true; defCount++; }
		else if (p.position === "MID" && midCount < 4) { isStarter = true; midCount++; }
		else if (p.position === "FWD" && fwdCount < 2) { isStarter = true; fwdCount++; }
		p.isStarter = isStarter;
	});

	await db.players.bulkAdd(players as any);
}
