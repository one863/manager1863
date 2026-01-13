import { db, Match, CURRENT_DATA_VERSION, Player, Team } from '@/db/db';
import { calculateTeamRatings } from '@/engine/converter';
import { MatchResult } from '@/engine/types';
import { NewsService } from '@/services/news-service';
import { ClubService } from '@/services/club-service';
import { generateSeasonFixtures } from '@/data/league-templates';
import { randomInt, clamp } from '@/utils/math';
import i18next from 'i18next';

const simulationWorker = new Worker(
  new URL('../engine/simulation.worker.ts', import.meta.url),
  { type: 'module' }
);

// Helper function to simulate a single match in the worker
const runMatchInWorker = (matchData: any, language: string): Promise<MatchResult> => {
  return new Promise((resolve) => {
    const requestId = Math.random().toString(36).substring(7);
    
    const handler = (e: MessageEvent) => {
      const { type, payload } = e.data;
      if (type === 'MATCH_COMPLETE' && payload.requestId === requestId) {
        simulationWorker.removeEventListener('message', handler);
        resolve(payload.result);
      }
    };

    simulationWorker.addEventListener('message', handler);
    simulationWorker.postMessage({ 
      type: 'SIMULATE_MATCH', 
      payload: { ...matchData, requestId, language } 
    });
  });
};

export const MatchService = {
  async hasUserMatchToday(saveId: number, day: number, userTeamId: number): Promise<boolean> {
    const match = await db.matches
      .where('[saveId+day]')
      .equals([saveId, day])
      .and(m => (m.homeTeamId === userTeamId || m.awayTeamId === userTeamId) && !m.played)
      .first();

    return !!match;
  },

  async simulateDayByDay(saveId: number, day: number, userTeamId: number, date: Date): Promise<any> {
    if (day % 7 === 1) await NewsService.generateWeeklyEvents(saveId, date, userTeamId);
    if (day % 7 === 3) await NewsService.generateTrainingReport(saveId, date, userTeamId);
    if (day % 7 === 0 && day > 0) await NewsService.generateSundayBoardReport(saveId, date, userTeamId);

    const todaysMatches = await db.matches
      .where('[saveId+day]')
      .equals([saveId, day])
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
      
      const matchData = {
        homeRatings: calculateTeamRatings(homePlayers, homeT?.tacticType || 'NORMAL'),
        awayRatings: calculateTeamRatings(awayPlayers, awayT?.tacticType || 'NORMAL'),
        homeTeamId: userMatch.homeTeamId,
        awayTeamId: userMatch.awayTeamId,
        homePlayers,
        awayPlayers
      };

      const result = await runMatchInWorker(matchData, i18next.language);

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
    const language = i18next.language;
    simulationWorker.postMessage({ type: 'SIMULATE_BATCH', payload: { matches, saveId, language } });
    
    const handler = async (e: MessageEvent) => {
      const { type, payload } = e.data;
      if (type === 'BATCH_COMPLETE' && payload.saveId === saveId) {
        simulationWorker.removeEventListener('message', handler);
        await db.transaction('rw', [db.matches, db.teams, db.gameState, db.news, db.players], async () => {
          for (const res of payload.results) {
            const match = await db.matches.get(res.matchId);
            // OPTIMISATION: Suppression des commentaires pour les matchs IA
            if (res.result && res.result.commentary) {
              delete res.result.commentary;
            }
            if (match) await this.saveMatchResult(match, res.result, saveId, date, false);
          }
        });
      }
    };
    
    simulationWorker.addEventListener('message', handler);
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
      this.updateTeamStats(match.awayTeamId, result.awayScore, result.homeScore),
      this.applyMatchFatigue(match.homeTeamId, saveId),
      this.applyMatchFatigue(match.awayTeamId, saveId)
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

  async applyMatchFatigue(teamId: number, saveId: number) {
    const team = await db.teams.get(teamId);
    const starters = await db.players.where('[saveId+teamId]').equals([saveId, teamId]).and(p => !!p.isStarter).toArray();
    
    let baseFatigue = randomInt(20, 30);
    if (team?.tacticType === 'PRESSING') baseFatigue += 10;

    for (const player of starters) {
      const currentEnergy = player.energy || 100;
      const currentCondition = player.condition || 100;
      
      const newEnergy = Math.max(0, currentEnergy - baseFatigue);
      
      const condLoss = randomInt(1, 4);
      const newCondition = Math.max(10, currentCondition - condLoss);

      await db.players.update(player.id!, {
        energy: newEnergy,
        condition: newCondition
      });
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

  async checkSeasonEnd(saveId: number, userLeagueId: number) {
    const totalMatches = await db.matches.where('leagueId').equals(userLeagueId).count();
    const playedMatches = await db.matches.where('leagueId').equals(userLeagueId).and((m) => m.played).count();
    if (totalMatches === 0 || totalMatches !== playedMatches) return false;

    const state = await db.gameState.get(saveId);
    if (!state) return false;

    // --- CLEANUP DE FIN DE SAISON ---
    const oldSeason = state.season - 5;
    if (oldSeason > 0) {
        const oldHistory = await db.history.where('saveId').equals(saveId).and(h => h.seasonYear <= oldSeason).primaryKeys();
        await db.history.bulkDelete(oldHistory);
    }
    await db.news.where('saveId').equals(saveId).delete();
    const matchesToClean = await db.matches.where('saveId').equals(saveId).toArray();
    for (const m of matchesToClean) {
      if (m.details && m.details.commentary) {
        const cleanDetails = { ...m.details };
        delete cleanDetails.commentary; 
        await db.matches.update(m.id!, { details: cleanDetails });
      }
    }
    // --------------------------------

    // 1. Récupérer toutes les ligues triées par niveau
    const allLeagues = await db.leagues.where('saveId').equals(saveId).toArray();
    allLeagues.sort((a, b) => a.level - b.level);

    let promotions: Map<number, Team[]> = new Map(); // level -> équipes promues vers ce level
    let relegations: Map<number, Team[]> = new Map(); // level -> équipes reléguées vers ce level

    // 2. Traiter chaque ligue pour déterminer classements et mouvements
    for (const league of allLeagues) {
      const teams = await db.teams.where('leagueId').equals(league.id!).toArray();
      
      // Si c'est la ligue du joueur ou qu'il y a eu des matchs simulés, on utilise les points
      // Sinon (simulation simplifiée pour les autres ligues), on trie par réputation/skill
      const hasMatches = (await db.matches.where('leagueId').equals(league.id!).count()) > 0;
      
      if (hasMatches) {
         teams.sort((a, b) => (b.points || 0) - (a.points || 0));
      } else {
         // Simulation aléatoire pondérée par la réputation pour les ligues non jouées
         teams.sort((a, b) => (b.reputation + randomInt(-10, 10)) - (a.reputation + randomInt(-10, 10)));
      }

      // Sauvegarder l'historique
      for (let i = 0; i < teams.length; i++) {
        const t = teams[i];
        await db.history.add({ 
            saveId, 
            teamId: t.id!, 
            seasonYear: state.season, 
            leagueName: league.name, 
            position: i + 1, 
            points: t.points || 0, 
            achievements: i === 0 ? ['Champion'] : [] 
        });
      }

      // Gestion Objectifs Joueur
      if (league.id === userLeagueId) {
        const userTeamIndex = teams.findIndex(t => t.id === state.userTeamId);
        const userPosition = userTeamIndex + 1;
        const userTeam = teams[userTeamIndex];

        let isFailed = false;
        if (userTeam.seasonGoal === 'CHAMPION' && userPosition > 1) isFailed = true;
        if (userTeam.seasonGoal === 'PROMOTION' && userPosition > league.promotionSpots) isFailed = true; // Top 3
        if (userTeam.seasonGoal === 'MID_TABLE' && userPosition > (teams.length / 2)) isFailed = true;

        if (isFailed) {
          await db.gameState.update(saveId, { isGameOver: true });
          await NewsService.addNews(saveId, { day: state.day, date: state.currentDate, title: "LICENCIEMENT", content: `Objectif non rempli pour ${userTeam.name}.`, type: 'BOARD', importance: 3 });
          return true; 
        }
      }

      // Identifier Promus et Relégués
      const promoteCount = league.promotionSpots; // Ex: 3 (sauf Div 1 qui a 0)
      const relegateCount = league.relegationSpots; // Ex: 3 (sauf Div 5 qui a 0)

      // Promus (vers le niveau supérieur, donc level - 1)
      if (promoteCount > 0 && league.level > 1) {
         const promotedTeams = teams.slice(0, promoteCount);
         const targetLevel = league.level - 1;
         if (!promotions.has(targetLevel)) promotions.set(targetLevel, []);
         promotions.get(targetLevel)!.push(...promotedTeams);
      }

      // Relégués (vers le niveau inférieur, donc level + 1)
      if (relegateCount > 0 && league.level < allLeagues.length) {
         const relegatedTeams = teams.slice(teams.length - relegateCount);
         const targetLevel = league.level + 1;
         if (!relegations.has(targetLevel)) relegations.set(targetLevel, []);
         relegations.get(targetLevel)!.push(...relegatedTeams);
      }
    }

    // 3. Appliquer les mouvements
    // On doit récupérer les IDs des ligues par niveau pour faire les updates
    const leaguesByLevel = new Map(allLeagues.map(l => [l.level, l.id]));

    // Traiter les promotions
    for (const [level, teams] of promotions) {
        const targetLeagueId = leaguesByLevel.get(level);
        if (targetLeagueId) {
            for (const team of teams) {
                await db.teams.update(team.id!, { leagueId: targetLeagueId });
                // News spéciale si c'est le joueur
                if (team.id === state.userTeamId) {
                    await NewsService.addNews(saveId, { day: state.day, date: state.currentDate, title: "PROMOTION !", content: "Nous montons dans la division supérieure !", type: 'BOARD', importance: 3 });
                }
            }
        }
    }

    // Traiter les relégations
    for (const [level, teams] of relegations) {
        const targetLeagueId = leaguesByLevel.get(level);
        if (targetLeagueId) {
            for (const team of teams) {
                await db.teams.update(team.id!, { leagueId: targetLeagueId });
                if (team.id === state.userTeamId) {
                    await NewsService.addNews(saveId, { day: state.day, date: state.currentDate, title: "RELÉGATION", content: "Une saison cauchemardesque qui nous envoie à l'étage inférieur.", type: 'BOARD', importance: 3 });
                }
            }
        }
    }

    // 4. Reset des points et génération des calendriers pour TOUTES les ligues
    // Suppression des matchs de la saison passée (toutes ligues confondues pour ce save)
    await db.matches.where('saveId').equals(saveId).delete();

    for (const league of allLeagues) {
        // Récupérer les équipes qui sont MAINTENANT dans cette ligue (après mouvements)
        const currentTeams = await db.teams.where('leagueId').equals(league.id!).toArray();
        const teamIds = currentTeams.map(t => t.id!);
        
        // Reset stats
        for (const t of currentTeams) {
            await db.teams.update(t.id!, { points: 0, matchesPlayed: 0 });
        }

        // Générer nouveau calendrier
        await generateSeasonFixtures(saveId, league.id!, teamIds);
    }

    return true;
  },
};
