import { LEAGUE_TEMPLATES, generateSeasonFixtures } from "./league-templates";
import { generateFullSquad } from "./squad-generator";
import { getRandomElement, randomInt } from "@/core/utils/math";
import { generateStaff } from "./staff-generator";

const TEAM_COLORS = [
  ["#E11D48", "#FFFFFF"], ["#2563EB", "#FFFFFF"], ["#059669", "#FFFFFF"], ["#F59E0B", "#000000"],
  ["#7C3AED", "#FFFFFF"], ["#000000", "#FFFFFF"], ["#DB2777", "#FFFFFF"], ["#EA580C", "#FFFFFF"],
  ["#0D9488", "#FFFFFF"], ["#4B5563", "#FFFFFF"], ["#DC2626", "#FCD34D"], ["#1E40AF", "#FCD34D"]
];
export function generateWorld(saveId: number, userTeamName: string) {
	const leagues: any[] = [];
	const teams: any[] = [];
	const players: any[] = [];
	const staff: any[] = [];
	let userTeamId: number | null = null;

	for (const tpl of LEAGUE_TEMPLATES) {
		const leagueId = leagues.length + 1; // simple auto-increment
		leagues.push({
			id: leagueId,
			saveId,
			name: tpl.name,
			level: tpl.level,
			promotionSpots: tpl.promotionSpots,
			relegationSpots: tpl.relegationSpots,
			teamNames: tpl.teamNames,
			teamsCount: tpl.teamsCount,
			reputation: tpl.reputation,
		});

		const teamNames = [...tpl.teamNames];
		while (teamNames.length < tpl.teamsCount) {
			teamNames.push(`Club ${tpl.name.substring(0, 3)} ${teamNames.length + 1}`);
		}

		let playerTeamIndex = -1;
		if (tpl.level === LEAGUE_TEMPLATES.length) {
			playerTeamIndex = randomInt(0, teamNames.length - 1);
			teamNames[playerTeamIndex] = userTeamName;
		}

		for (let i = 0; i < tpl.teamsCount; i++) {
			const isUserTeam = (i === playerTeamIndex && playerTeamIndex !== -1);
			const colors = getRandomElement(TEAM_COLORS);
			const teamId = teams.length + 1; // simple auto-increment
			teams.push({
				id: teamId,
				saveId,
				leagueId,
				name: teamNames[i],
				reputation: tpl.reputation,
				budget: isUserTeam ? 100 : tpl.reputation * 10,
				stadiumCapacity: tpl.reputation * 50,
				stadiumName: `${teamNames[i]} Park`,
				confidence: 50,
				seasonGoal: isUserTeam ? "PROMOTION" : "MID_TABLE",
				fanCount: tpl.reputation * 10,
				primaryColor: colors[0],
				secondaryColor: colors[1],
				points: 0,
				matchesPlayed: 0,
				goalsFor: 0,
				goalsAgainst: 0,
				goalDifference: 0,
				version: 1,
				tacticType: "4-4-2",
				formation: "4-4-2"
			});
			if (isUserTeam) userTeamId = teamId;

			const avgSkill = (12 - tpl.level * 1.5) + (Math.random() * 2);
			const squad = generateFullSquad(saveId, teamId, avgSkill);
			players.push(...squad);

			const coach = generateStaff(avgSkill, "COACH");
			const physio = generateStaff(avgSkill, "PHYSICAL_TRAINER");
			const analyst = generateStaff(avgSkill, "VIDEO_ANALYST");
			staff.push(
				{ ...coach, saveId, teamId },
				{ ...physio, saveId, teamId },
				{ ...analyst, saveId, teamId }
			);
		}
	}

	if (userTeamId === null) throw new Error("User team was not created.");

	// Les fixtures ne sont pas générés ici, à faire côté appelant si besoin

	return { leagues, teams, players, staff, userTeamId };

	return { userTeamId };
}
