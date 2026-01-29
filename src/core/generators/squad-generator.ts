import { generatePlayer } from "./players-generator";
import { getFormationRoles, DEFAULT_FORMATION } from "@/core/engine/token-engine/formations-config";

/**
 * Génère un effectif complet pour une équipe (22 joueurs)
 * Compatible avec les rôles de formations-config.ts
 */
export function generateFullSquad(
	saveId: number,
	teamId: number,
	avgSkill = 5,
	formation = DEFAULT_FORMATION
): any[] {
	const players = [];
	const formationRoles = getFormationRoles(formation);

	// --- TITULAIRES (11) basés sur la formation ---
	for (const role of formationRoles) {
		const player = { ...generatePlayer(avgSkill, role), saveId, teamId, isStarter: true };
		players.push(player);
	}

	// --- REMPLAÇANTS (11) ---
	// 1 GK de secours
	players.push({ ...generatePlayer(avgSkill - 1, "GK"), saveId, teamId, isStarter: false });

	// 3 défenseurs polyvalents
	const defBackups = ["DC", "DL", "DR"];
	for (const role of defBackups) {
		players.push({ ...generatePlayer(avgSkill - 1, role), saveId, teamId, isStarter: false });
	}

	// 4 milieux polyvalents
	const midBackups = ["MC", "MC", "ML", "MR"];
	for (const role of midBackups) {
		players.push({ ...generatePlayer(avgSkill - 1, role), saveId, teamId, isStarter: false });
	}

	// 3 attaquants polyvalents
	const fwdBackups = ["ST", "LW", "RW"];
	for (const role of fwdBackups) {
		players.push({ ...generatePlayer(avgSkill - 1, role), saveId, teamId, isStarter: false });
	}

	return players;
}
