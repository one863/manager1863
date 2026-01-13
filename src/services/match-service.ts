import { db, Match, Team, CURRENT_DATA_VERSION } from '@/db/db';
import { calculateTeamRatings } from '@/engine/converter';
import { simulateMatch } from '@/engine/simulator';
import { MatchResult } from '@/engine/types';
import { NewsService } from '@/services/news-service';
import { ClubService } from '@/services/club-service';
import { generateSeasonFixtures } from '@/data/league-templates';

export const MatchService = {
  
  async simulateDay(saveId: number, date: Date, userTeamId: number) {
    const startOfDay = new Date(date); startOfDay.setHours(0,0,0,0);
    const endOfDay = new Date(date); endOfDay.setHours(23,59,59,999);

    const todaysMatches = await db.matches
      .where('[saveId+date]')
      .between([saveId, startOfDay], [saveId, endOfDay])
      .toArray();

    let pendingUserMatch = null;

    for (const match of todaysMatches) {
      if (match.played) continue;

      const homePlayers = await db.players.where('[saveId+teamId]').equals([saveId, match.homeTeamId]).toArray();
      const awayPlayers = await db.players.where('[saveId+teamId]').equals([saveId, match.awayTeamId]).toArray();

      const homeRatings = calculateTeamRatings(homePlayers);
      const awayRatings = calculateTeamRatings(awayPlayers);

      const result = await simulateMatch(homeRatings, awayRatings, match.homeTeamId, match.awayTeamId, homePlayers, awayPlayers);

      if (match.homeTeamId === userTeamId || match.awayTeamId === userTeamId) {
        const homeTeam = await db.teams.get(match.homeTeamId);
        const awayTeam = await db.teams.get(match.awayTeamId);
        
        if (homeTeam && awayTeam) {
           pendingUserMatch = {
             matchId: match.id!,
             homeTeam,
             awayTeam,
             result
           };
        }
      } else {
        await this.saveMatchResult(match, result, saveId, date);
      }
    }

    return pendingUserMatch;
  },

  async saveMatchResult(match: Match, result: MatchResult, saveId: number, date: Date) {
    await db.matches.update(match.id!, {
      homeScore: result.homeScore,
      awayScore: result.awayScore,
      played: true,
      details: result
    });

    await this.updateTeamStats(match.homeTeamId, result.homeScore, result.awayScore);
    await this.updateTeamStats(match.awayTeamId, result.awayScore, result.homeScore);

    const state = await db.gameState.get(saveId);
    if (state && (match.homeTeamId === state.userTeamId || match.awayTeamId === state.userTeamId)) {
        const isHome = match.homeTeamId === state.userTeamId;
        const myScore = isHome ? result.homeScore : result.awayScore;
        const oppScore = isHome ? result.awayScore : result.homeScore;
        await ClubService.updateDynamicsAfterMatch(state.userTeamId!, myScore, oppScore, isHome, saveId, date);
    }
  },

  async updateTeamStats(teamId: number, goalsFor: number, goalsAgainst: number) {
    const team = await db.teams.get(teamId);
    if (!team) return;

    let pts = team.points || 0;
    if (goalsFor > goalsAgainst) pts += 2;
    else if (goalsFor === goalsAgainst) pts += 1;
    
    await db.teams.update(teamId, {
      matchesPlayed: (team.matchesPlayed || 0) + 1,
      points: pts
    });
  },

  /**
   * Vérifie si la saison est terminée et prépare la suivante.
   */
  async checkSeasonEnd(saveId: number, leagueId: number) {
    const totalMatches = await db.matches.where('leagueId').equals(leagueId).count();
    const playedMatches = await db.matches.where('leagueId').equals(leagueId).and(m => m.played).count();

    if (totalMatches > 0 && totalMatches === playedMatches) {
        console.log("Fin de saison détectée !");
        
        const teams = await db.teams.where('leagueId').equals(leagueId).toArray();
        teams.sort((a, b) => (b.points || 0) - (a.points || 0));
        
        const winner = teams[0];
        const state = await db.gameState.get(saveId);
        const currentYear = state ? state.currentDate.getFullYear() : 1863;

        for (let i = 0; i < teams.length; i++) {
            const t = teams[i];
            await db.history.add({
                saveId,
                teamId: t.id!,
                seasonYear: currentYear,
                leagueName: "The Football Association League",
                position: i + 1,
                points: t.points || 0,
                achievements: i === 0 ? ["Champion"] : []
            });
        }

        await NewsService.addNews(saveId, {
            date: state?.currentDate || new Date(),
            title: `Saison ${currentYear} terminée !`,
            content: `Le club ${winner.name} est sacré champion ! Félicitations à tous les joueurs.`,
            type: 'LEAGUE',
            importance: 3
        });

        for (const t of teams) {
            await db.teams.update(t.id!, { points: 0, matchesPlayed: 0 });
        }

        const teamIds = teams.map(t => t.id!);
        await db.matches.where('leagueId').equals(leagueId).delete();
        await generateSeasonFixtures(saveId, leagueId, teamIds);

        return true;
    }
    return false;
  }
};
