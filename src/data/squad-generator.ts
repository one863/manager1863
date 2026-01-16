import { type Player, db } from "@/db/db";
import { generateTeamSquad } from "./players-generator";

export async function generateSquad(
	saveId: number,
	teamId: number,
	teamSkill: number,
) {
	const playersData = generateTeamSquad(teamSkill);
	const players = playersData.map((p) => ({
		...p,
		saveId,
		teamId,
		isStarter: false, // Default all to false, auto-select will handle it
	})) as Player[];

	const starterIds = [];
	// Simple auto-starter logic for generation
	const positions = ["GK", "DEF", "MID", "FWD"];
	for(const pos of positions) {
		const posPlayers = players.filter(p => p.position === pos);
		const count = pos === "GK" ? 1 : pos === "DEF" ? 4 : pos === "MID" ? 4 : 2;
		posPlayers.slice(0, count).forEach(p => p.isStarter = true);
	}

	await db.players.bulkAdd(players);
}
