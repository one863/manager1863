import { db } from "@/core/db/db";
import { LEAGUE_TEMPLATES, generateSeasonFixtures } from "./league-templates";
import { generateFullSquad } from "./squad-generator";
import { getRandomElement, randomInt } from "@/core/utils/math";
import { generateInitialStaffMarket, generateStaffMember } from "./staff-generator";

// Liste de couleurs pour les équipes
const TEAM_COLORS = [
	["#E11D48", "#FFFFFF"], // Red/White
	["#2563EB", "#FFFFFF"], // Blue/White
	["#059669", "#FFFFFF"], // Green/White
	["#F59E0B", "#000000"], // Yellow/Black
	["#7C3AED", "#FFFFFF"], // Purple/White
	["#000000", "#FFFFFF"], // Black/White
	["#DB2777", "#FFFFFF"], // Pink/White
	["#EA580C", "#FFFFFF"], // Orange/White
	["#0D9488", "#FFFFFF"], // Teal/White
	["#4B5563", "#FFFFFF"], // Gray/White
	["#DC2626", "#FCD34D"], // Red/Yellow
	["#1E40AF", "#FCD34D"], // Blue/Yellow
];

// Génération complète d'une nouvelle partie (Monde)
export async function generateWorld(saveId: number, userTeamName: string) {
	// 1. Création des Ligues
	const leagues = [];
	for (const tpl of LEAGUE_TEMPLATES) {
		const id = await db.leagues.add({
			saveId,
			name: tpl.name,
			level: tpl.level,
			promotionSpots: tpl.promotionSpots,
			relegationSpots: tpl.relegationSpots,
		});
		if (typeof id !== 'number') {
            throw new Error(`Failed to create league: ${tpl.name}. Received invalid ID: ${id}`);
        }
		leagues.push({ ...tpl, id });
	}

	// 2. Création des Clubs
	let userTeamId: number | null = null;

	for (const league of leagues) {
		const teamNames = [...league.teamNames];
		
		// Compléter avec des noms génériques si besoin
		while (teamNames.length < league.teamsCount) {
			teamNames.push(`Club ${league.name.substring(0, 3)} ${teamNames.length + 1}`);
		}

		// Si c'est la division la plus basse (ou choisie), on remplace un club par celui du joueur
		let playerTeamIndex = -1;
		if (league.level === LEAGUE_TEMPLATES.length) { 
			playerTeamIndex = randomInt(0, teamNames.length - 1);
			teamNames[playerTeamIndex] = userTeamName;
		}

		for (let i = 0; i < league.teamsCount; i++) {
			const isUserTeam = (i === playerTeamIndex && playerTeamIndex !== -1);
            
            // Sélectionner des couleurs aléatoires
            const colors = getRandomElement(TEAM_COLORS);

			const teamId = await db.teams.add({
				saveId,
				leagueId: league.id as number,
				name: teamNames[i],
				reputation: league.reputation, // Base reputation
				budget: isUserTeam ? 100 : league.reputation * 10,
				stadiumCapacity: league.reputation * 50,
				stadiumName: `${teamNames[i]} Park`,
				confidence: 50,
				seasonGoal: isUserTeam ? "PROMOTION" : "MID_TABLE",
				supportersMood: 50,
				fanCount: league.reputation * 10,
				primaryColor: colors[0],
                secondaryColor: colors[1],
				points: 0,
				matchesPlayed: 0,
				goalsFor: 0,
				goalsAgainst: 0,
				goalDifference: 0,
                version: 1
			});

			if (typeof teamId !== 'number') {
                throw new Error(`Failed to create team: ${teamNames[i]} in league ${league.name}. Received invalid ID: ${teamId}`);
            }

			if (isUserTeam) userTeamId = teamId;

			// 3. Génération des joueurs pour ce club
			const avgSkill = (11 - league.level * 2) + (Math.random() * 2);
			await generateFullSquad(saveId, teamId, avgSkill);

            // 4. Génération d'un staff de base pour le club
            const coach = generateStaffMember(saveId, teamId, avgSkill);
            coach.role = "COACH";
            const scout = generateStaffMember(saveId, teamId, avgSkill);
            scout.role = "SCOUT";
            
            await db.staff.add(coach as any);
            await db.staff.add(scout as any);
		}
	}

	// Ensure userTeamId is set before proceeding
	if (userTeamId === null) {
		throw new Error("User team was not created. This should not happen.");
	}

	// 5. Génération du calendrier pour chaque ligue
	for (const league of leagues) {
		const teams = await db.teams.where("leagueId").equals(league.id as number).toArray();
		const teamIds = teams.map(t => t.id!);

		if (teamIds.length === 0) {
            throw new Error(`No teams found for league ${league.name} (${league.id}). Cannot generate fixtures.`);
        }
		await generateSeasonFixtures(saveId, league.id as number, teamIds);
	}

    // 6. Génération du marché du staff (candidats libres)
    await generateInitialStaffMarket(saveId);

	return { userTeamId };
}
