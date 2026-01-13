import { db, CURRENT_DATA_VERSION } from '@/db/db';
import { generateTeamSquad } from './players-generator';

const historicalClubNames = [
  "Notts County", "Stoke Ramblers", "Hallam FC", "Cray Wanderers", "Worksop Town",
  "Bradford Park", "Royal Engineers", "Civil Service", "The Wanderers", "Barnes FC",
  "Crystal Palace", "Forest FC", "N.N. Kilburn", "Percival House", "War Office",
];

export async function generateSeasonFixtures(saveId: number, leagueId: number, teamIds: number[]) {
  // ... (Logique inchangée, je la remets pour la cohérence du fichier)
  const schedule = createSchedule(teamIds);
  const startDate = new Date('1863-09-05'); 
  const matchesToInsert: any[] = [];
  
  schedule.forEach((roundMatches, roundIndex) => {
    const matchDate = new Date(startDate);
    matchDate.setDate(startDate.getDate() + (roundIndex * 7));
    roundMatches.forEach(([homeId, awayId]) => {
      matchesToInsert.push({ saveId, leagueId, homeTeamId: homeId, awayTeamId: awayId, homeScore: -1, awayScore: -1, date: new Date(matchDate), played: false });
    });
  });

  const returnStartDate = new Date(startDate);
  returnStartDate.setDate(returnStartDate.getDate() + (schedule.length * 7) + 7);
  schedule.forEach((roundMatches, roundIndex) => {
    const matchDate = new Date(returnStartDate);
    matchDate.setDate(returnStartDate.getDate() + (roundIndex * 7));
    roundMatches.forEach(([awayId, homeId]) => {
      matchesToInsert.push({ saveId, leagueId, homeTeamId: homeId, awayTeamId: awayId, homeScore: -1, awayScore: -1, date: new Date(matchDate), played: false });
    });
  });
  await db.matches.bulkAdd(matchesToInsert);
}

function createSchedule(teams: number[]): [number, number][][] {
  const schedule: [number, number][][] = [];
  const numberOfTeams = teams.length;
  const half = numberOfTeams / 2;
  const teamIds = [...teams];
  for (let round = 0; round < numberOfTeams - 1; round++) {
    const roundMatches: [number, number][] = [];
    for (let i = 0; i < half; i++) {
      const home = teamIds[i];
      const away = teamIds[numberOfTeams - 1 - i];
      if (round % 2 === 0) roundMatches.push([home, away]);
      else roundMatches.push([away, home]);
    }
    schedule.push(roundMatches);
    teamIds.splice(1, 0, teamIds.pop()!);
  }
  return schedule;
}

export async function generateLeagueStructure(saveId: number, userTeamId: number, userTeamName: string) {
  const leagueId = await db.leagues.add({ saveId, name: "The Football Association League", level: 1 });
  
  // Mise à jour équipe joueur avec les nouveaux champs V2
  await db.teams.update(userTeamId, { 
    leagueId: leagueId as number,
    reputation: 50,
    fanCount: 150,
    confidence: 80,
    stadiumName: `${userTeamName} Park`,
    stadiumCapacity: 800,
    stadiumLevel: 1,
    budget: 1000 // Budget initial plus généreux pour commencer
  });

  const opponentsCount = 9;
  const availableNames = historicalClubNames.filter(name => name !== userTeamName);
  const shuffledNames = availableNames.sort(() => 0.5 - Math.random());
  const playersToInsert: any[] = [];
  const teamIds: number[] = [userTeamId]; 
  
  for (let i = 0; i < opponentsCount; i++) {
    const aiTeamName = shuffledNames[i] || `Club 1863 #${i+1}`; 
    const aiTeamId = await db.teams.add({
      saveId,
      name: aiTeamName,
      leagueId: leagueId as number,
      managerName: "CPU Manager",
      matchesPlayed: 0,
      points: 0,
      budget: 500,
      reputation: 40 + Math.random() * 20,
      fanCount: 100 + Math.random() * 100,
      confidence: 70,
      stadiumName: `${aiTeamName} Ground`,
      stadiumCapacity: 500,
      stadiumLevel: 1,
      version: CURRENT_DATA_VERSION
    });
    teamIds.push(aiTeamId as number);
    const squad = generateTeamSquad(Math.floor(Math.random() * 20) + 40);
    squad.forEach(player => playersToInsert.push({ ...player, saveId, teamId: aiTeamId }));
  }
  await db.players.bulkAdd(playersToInsert);
  await generateSeasonFixtures(saveId, leagueId as number, teamIds);
  return leagueId;
}
