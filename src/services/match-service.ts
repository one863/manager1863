import { db, Match, CURRENT_DATA_VERSION, Player } from '@/db/db';
import { calculateTeamRatings } from '@/engine/converter';
import { MatchResult } from '@/engine/types';
import { NewsService } from '@/services/news-service';
import { ClubService } from '@/services/club-service';
import { generateSeasonFixtures } from '@/data/league-templates';

const simulationWorker = new Worker(
  new URL('../engine/simulation.worker.ts', import.meta.url),
  { type: 'module' }
);

export const MatchService = {
  /**
   * Vérifie si l'utilisateur a un match à jouer à la date donnée.
   */
  async hasUserMatchToday(saveId: number, date: Date, userTeamId: number): Promise<boolean> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const match = await db.matches
      .where('[saveId+date]')
      .between([saveId, startOfDay], [saveId, endOfDay])
      .and(m => (m.homeTeamId === userTeamId || m.awayTeamId === userTeamId) && !m.played)
      .first();

    return !!match;
  },

  async simulateDay(saveId: number, date: Date, userTeamId: number): Promise<any> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const dayOfWeek = date.getDay();
    if (dayOfWeek === 1) await NewsService.generateWeeklyEvents(saveId, date, userTeamId);
    if (dayOfWeek === 3) await NewsService.generateTrainingReport(saveId, date, userTeamId);
    if (dayOfWeek === 0) await NewsService.generateSundayBoardReport(saveId, date, userTeamId);

    const todaysMatches = await db.matches
      .where('[saveId+date]')
      .between([saveId, startOfDay], [saveId, endOfDay])
      .toArray();

    const userMatch = todaysMatches.find(m => (m.homeTeamId === userTeamId || m.awayTeamId === userTeamId) && !m.played);
    if (userMatch) {
      const [homeTeam, awayTeam] = await Promise.all([db.teams.get(userMatch.homeTeamId), db.teams.get(userMatch.awayTeamId)]);
      if (homeTeam && awayTeam) {
        await NewsService.announceMatchDay(saveId, date, homeTeam.name, awayTeam.name, homeTeam.stadiumName);
      }
    }

    const otherMatches = todaysMatches.filter(m => !m.played && m.homeTeamId !== userTeamId && m.awayTeamId !== userTeamId);
    
    if (otherMatches.length > 0) {
      const allPlayers = await db.players.where('saveId').equals(saveId).toArray();
      const playersByTeam = allPlayers.reduce((acc, player) => {
        if (!acc[player.teamId]) acc[player.teamId] = [];
        acc[player.teamId].push(player);
        return acc;
      }, {} as Record<number, Player[]>);

      const matchesToSimulate = [];
      for (const match of otherMatches) {
        const homePlayers = playersByTeam[match.homeTeamId] || [];
        const awayPlayers = playersByTeam[match.awayTeamId] || [];
        const [homeT, awayT] = await Promise.all([db.teams.get(match.homeTeamId), db.teams.get(match.awayTeamId)]);
        
        matchesToSimulate.push({
          matchId: match.id,
          homeRatings: calculateTeamRatings(homePlayers, homeT?.tacticType || 'NORMAL'),
          awayRatings: calculateTeamRatings(awayPlayers, awayT?.tacticType || 'NORMAL'),
          homeTeamId: match.homeTeamId,
          awayTeamId: match.awayTeamId,
          homePlayers,
          awayPlayers
        });
      }
      this.runBatchSimulation(matchesToSimulate, saveId, date);
    }

    if (userMatch) {
      const homePlayers = await db.players.where('[saveId+teamId]').equals([saveId, userMatch.homeTeamId]).toArray();
      const awayPlayers = await db.players.where('[saveId+teamId]').equals([saveId, userMatch.awayTeamId]).toArray();
      const [homeT, awayT] = await Promise.all([db.teams.get(userMatch.homeTeamId), db.teams.get(userMatch.awayTeamId)]);
      
      const result = await import('@/engine/simulator').then(m => m.simulateMatch(
        calculateTeamRatings(homePlayers, homeT?.tacticType || 'NORMAL'),
        calculateTeamRatings(awayPlayers, awayT?.tacticType || 'NORMAL'),
        userMatch.homeTeamId, userMatch.awayTeamId, homePlayers, awayPlayers
      ));

      return {
        matchId: userMatch.id!,
        homeTeam: homeT,
        awayTeam: awayT,
        result,
      };
    }

    return null;
  },

  runBatchSimulation(matches: any[], saveId: number, date: Date) {
    simulationWorker.postMessage({ type: 'SIMULATE_BATCH', payload: { matches, saveId } });
    simulationWorker.onmessage = async (e) => {
      const { type, payload } = e.data;
      if (type === 'BATCH_COMPLETE') {
        await db.transaction('rw', [db.matches, db.teams, db.gameState, db.news], async () => {
          for (const res of payload.results) {
            const match = await db.matches.get(res.matchId);
            if (match) await this.saveMatchResult(match, res.result, saveId, date, false);
          }
        });
      }
    };
  },

  async saveMatchResult(match: Match, result: MatchResult, saveId: number, date: Date, generateNews = true) {
    await db.matches.update(match.id!, {
      homeScore: result.homeScore,
      awayScore: result.awayScore,
      played: true,
      details: result,
    });

    await Promise.all([
      this.updateTeamStats(match.homeTeamId, result.homeScore, result.awayScore),
      this.updateTeamStats(match.awayTeamId, result.awayScore, result.homeScore)
    ]);

    if (generateNews) {
      const [homeT, awayT] = await Promise.all([db.teams.get(match.homeTeamId), db.teams.get(match.awayTeamId)]);
      if (homeT && awayT) {
        await NewsService.generateMatchNews(saveId, date, homeT.name, awayT.name, result.homeScore, result.awayScore);
      }
    }

    const state = await db.gameState.get(saveId);
    if (state && (match.homeTeamId === state.userTeamId || match.awayTeamId === state.userTeamId)) {
      const isHome = match.homeTeamId === state.userTeamId;
      await ClubService.updateDynamicsAfterMatch(state.userTeamId!, isHome ? result.homeScore : result.awayScore, isHome ? result.awayScore : result.homeScore, isHome, saveId, date);
    }
  },

  async updateTeamStats(teamId: number, goalsFor: number, goalsAgainst: number) {
    const team = await db.teams.get(teamId);
    if (!team) return;
    let pts = team.points || 0;
    if (goalsFor > goalsAgainst) pts += 2;
    else if (goalsFor === goalsAgainst) pts += 1;
    await db.teams.update(teamId, { matchesPlayed: (team.matchesPlayed || 0) + 1, points: pts });
  },

  async checkSeasonEnd(saveId: number, leagueId: number) {
    const totalMatches = await db.matches.where('leagueId').equals(leagueId).count();
    const playedMatches = await db.matches.where('leagueId').equals(leagueId).and((m) => m.played).count();
    if (totalMatches === 0 || totalMatches !== playedMatches) return false;

    const teams = await db.teams.where('leagueId').equals(leagueId).toArray();
    teams.sort((a, b) => (b.points || 0) - (a.points || 0));
    const state = await db.gameState.get(saveId);
    if (!state) return false;

    const userTeamIndex = teams.findIndex(t => t.id === state.userTeamId);
    const userPosition = userTeamIndex + 1;
    const userTeam = teams[userTeamIndex];

    let isFailed = false;
    if (userTeam.seasonGoal === 'CHAMPION' && userPosition > 1) isFailed = true;
    if (userTeam.seasonGoal === 'PROMOTION' && userPosition > 3) isFailed = true;
    if (userTeam.seasonGoal === 'MID_TABLE' && userPosition > 6) isFailed = true;

    if (isFailed) {
      await db.gameState.update(saveId, { isGameOver: true });
      await NewsService.addNews(saveId, { date: state.currentDate, title: "LICENCIEMENT", content: `Objectif non rempli pour ${userTeam.name}.`, type: 'BOARD', importance: 3 });
      return true; 
    }

    const currentYear = state.currentDate.getFullYear();
    for (let i = 0; i < teams.length; i++) {
      const t = teams[i];
      await db.history.add({ saveId, teamId: t.id!, seasonYear: currentYear, leagueName: 'The Football Association League', position: i + 1, points: t.points || 0, achievements: i === 0 ? ['Champion'] : [] });
      await db.teams.update(t.id!, { points: 0, matchesPlayed: 0 });
    }

    const teamIds = teams.map((t) => t.id!);
    await db.matches.where('leagueId').equals(leagueId).delete();
    await generateSeasonFixtures(saveId, leagueId, teamIds);
    return true;
  },
};
