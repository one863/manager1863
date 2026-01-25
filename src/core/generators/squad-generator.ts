import { generatePlayer } from "./players-generator";
import { randomInt } from "@/core/utils/math";

export function generateFullSquad(
	saveId: number,
	teamId: number,
	avgSkill = 5,
): any[] {
	const players = [];

	// Gardiens (2)
	for (let i = 0; i < 2; i++) {
		players.push({ ...generatePlayer(avgSkill, "GK"), saveId, teamId });
	}

	// Défenseurs (7) : 4 DC, 2 DL, 1 DR
	const defRoles = ["DC", "DC", "DC", "DC", "DL", "DL", "DR"];
	for (const role of defRoles) {
		players.push({ ...generatePlayer(avgSkill, role), saveId, teamId });
	}

	// Milieux (8) : 4 MC, 2 ML, 2 MR
	const midRoles = ["MC", "MC", "MC", "MC", "ML", "ML", "MR", "MR"];
	for (const role of midRoles) {
		players.push({ ...generatePlayer(avgSkill, role), saveId, teamId });
	}

	// Attaquants (5) : 3 ST, 1 LW, 1 RW
	const fwdRoles = ["ST", "ST", "ST", "LW", "RW"];
	for (const role of fwdRoles) {
		players.push({ ...generatePlayer(avgSkill, role), saveId, teamId });
	}

	// Assigner les titulaires par défaut (les meilleurs par rôle pour un 4-4-2)
	players.sort((a, b) => (b.skill || 0) - (a.skill || 0));

	let gkCount = 0, dcCount = 0, dlCount = 0, drCount = 0, mcCount = 0, mlCount = 0, mrCount = 0, stCount = 0;

	players.forEach(p => {
		let isStarter = false;
		if (p.role === "GK" && gkCount < 1) { isStarter = true; gkCount++; }
		else if (p.role === "DC" && dcCount < 2) { isStarter = true; dcCount++; }
		else if (p.role === "DL" && dlCount < 1) { isStarter = true; dlCount++; }
		else if (p.role === "DR" && drCount < 1) { isStarter = true; drCount++; }
		else if (p.role === "MC" && mcCount < 2) { isStarter = true; mcCount++; }
		else if (p.role === "ML" && mlCount < 1) { isStarter = true; mlCount++; }
		else if (p.role === "MR" && mrCount < 1) { isStarter = true; mrCount++; }
		else if (p.role === "ST" && stCount < 2) { isStarter = true; stCount++; }
		p.isStarter = isStarter;
	});

	return players;
}
