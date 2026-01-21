import { db } from "@/core/db/db";
import { LEAGUE_TEMPLATES, generateSeasonFixtures } from "./league-templates";
import { generateFullSquad } from "./squad-generator";
import { getRandomElement, randomInt } from "@/core/utils/math";
import { generateStaff } from "./staff-generator";

const TEAM_COLORS = [
	["#E11D48", "#FFFFFF"], ["#2563EB", "#FFFFFF"], ["#059669", "#FFFFFF"], ["#F59E0B", "#000000"],
	["#7C3AED", "#FFFFFF"], ["#000000", "#FFFFFF"], ["#DB2777", "#FFFFFF"], ["#EA580C", "#FFFFFF"],
	["#0D9488", "#FFFFFF"], ["#4B5563", "#FFFFFF"], ["#DC2626", "#FCD34D"], ["#1E40AF", "#FCD34D"],
];

export async function generateWorld(saveId: number, userTeamName: string) {
	const leagues = [];
	for (const tpl of LEAGUE_TEMPLATES) {
		const id = await db.leagues.add({
			saveId,
			name: tpl.name,
			level: tpl.level,
			promotionSpots: tpl.promotionSpots,
			relegationSpots: tpl.relegationSpots,
		});
		leagues.push({ ...tpl, id });
	}

	let userTeamId: number | null = null;

	for (const league of leagues) {
		const teamNames = [...league.teamNames];
		while (teamNames.length < league.teamsCount) {
			teamNames.push(`Club ${league.name.substring(0, 3)} ${teamNames.length + 1}`);
		}

		let playerTeamIndex = -1;
		if (league.level === LEAGUE_TEMPLATES.length) { 
			playerTeamIndex = randomInt(0, teamNames.length - 1);
			teamNames[playerTeamIndex] = userTeamName;
		}

		for (let i = 0; i < league.teamsCount; i++) {
			const isUserTeam = (i === playerTeamIndex && playerTeamIndex !== -1);
            const colors = getRandomElement(TEAM_COLORS);

			const teamId = await db.teams.add({
				saveId,
				leagueId: league.id as number,
				name: teamNames[i],
				reputation: league.reputation,
				budget: isUserTeam ? 100 : league.reputation * 10,
				stadiumCapacity: league.reputation * 50,
				stadiumName: `${teamNames[i]} Park`,
				confidence: 50,
				seasonGoal: isUserTeam ? "PROMOTION" : "MID_TABLE",
				fanCount: league.reputation * 10,
				primaryColor: colors[0],
                secondaryColor: colors[1],
				points: 0,
				matchesPlayed: 0,
				goalsFor: 0,
				goalsAgainst: 0,
				goalDifference: 0,
                version: 1,
                tacticType: "NORMAL",
                formation: "4-4-2"
			});

			if (isUserTeam) userTeamId = teamId;

			// Squad VQN : Ajustement du skill moyen pour éviter le "0 but" en D5
			const avgSkill = (12 - league.level * 1.5) + (Math.random() * 2);
			await generateFullSquad(saveId, teamId as number, avgSkill);

            // Staff VQN : Coach + Physical Trainer + Video Analyst
            const coach = generateStaff(avgSkill, "COACH");
            const physio = generateStaff(avgSkill, "PHYSICAL_TRAINER");
            const analyst = generateStaff(avgSkill, "VIDEO_ANALYST");
            
            await db.staff.add({ ...coach, saveId, teamId: teamId as number } as any);
            await db.staff.add({ ...physio, saveId, teamId: teamId as number } as any);
            await db.staff.add({ ...analyst, saveId, teamId: teamId as number } as any);
		}
	}

	if (userTeamId === null) throw new Error("User team was not created.");

	for (const league of leagues) {
		const teams = await db.teams.where("leagueId").equals(league.id as number).toArray();
		const teamIds = teams.map(t => t.id!);
		await generateSeasonFixtures(saveId, league.id as number, teamIds);
	}

	return { userTeamId };
}
