import { db, Team, NewsArticle } from '@/db/db';
import { clamp, randomInt, getRandomElement } from '@/utils/math';
import { NewsService } from './news-service';
import i18next from 'i18next';

export const ClubService = {
  async processDailyUpdates(teamId: number, saveId: number, currentDay: number, currentDate: Date) {
    const team = await db.teams.get(teamId);
    if (!team) return;

    // Traitement fin de chantier
    if (team.stadiumUpgradeEndDay && team.stadiumUpgradeEndDay <= currentDay && team.stadiumProject) {
      const project = team.stadiumProject;
      
      let updateData: any = {
        stadiumUpgradeEndDay: undefined,
        stadiumProject: undefined
      };

      if (project.type === 'UPGRADE') {
        updateData.stadiumLevel = (team.stadiumLevel || 1) + 1;
        updateData.stadiumCapacity = project.targetCapacity;
      } else if (project.type === 'NEW_STADIUM') {
        updateData.stadiumLevel = 1;
        updateData.stadiumCapacity = project.targetCapacity;
        updateData.stadiumName = project.targetName;
      }

      await db.teams.update(teamId, updateData);

      const titleKey = project.type === 'NEW_STADIUM' ? 'narratives.news.club.stadium_new_title' : 'narratives.news.club.stadium_upgrade_title';
      const contentKey = project.type === 'NEW_STADIUM' ? 'narratives.news.club.stadium_new_content' : 'narratives.news.club.stadium_upgrade_content';

      await NewsService.addNews(saveId, {
        day: currentDay,
        date: currentDate,
        title: i18next.t(titleKey, { defaultValue: project.type === 'NEW_STADIUM' ? "INAUGURATION" : "TRAVAUX TERMINÉS" }),
        content: i18next.t(contentKey, { 
          name: project.type === 'NEW_STADIUM' ? project.targetName : team.stadiumName,
          capacity: project.targetCapacity,
          defaultValue: "Les travaux sont terminés."
        }),
        type: 'CLUB',
        importance: 3
      });
    }

    await this.processDailyPlayerUpdates(saveId, teamId);
  },

  async processDailyPlayerUpdates(saveId: number, teamId: number) {
    const players = await db.players.where('[saveId+teamId]').equals([saveId, teamId]).toArray();
    for (const player of players) {
      const energyGain = 5;
      const conditionGain = 2;
      const newEnergy = clamp(player.energy + energyGain, 0, 100);
      const newCondition = clamp(player.condition + conditionGain, 0, 100);
      let newMorale = player.morale;
      if (player.morale > 55) newMorale -= 1;
      else if (player.morale < 45) newMorale += 1;
      await db.players.update(player.id!, { energy: newEnergy, condition: newCondition, morale: newMorale });
    }
  },

  async updateDynamicsAfterMatch(teamId: number, myScore: number, oppScore: number, isHome: boolean, saveId: number, date: Date) {
    const team = await db.teams.get(teamId);
    if (!team) return;
    const isWin = myScore > oppScore;
    const isDraw = myScore === oppScore;
    const goalDiff = myScore - oppScore;

    // Dynamique de réputation
    let repChange = isWin ? 1 + clamp(goalDiff, 0, 3) : isDraw ? 0 : -1;
    const newReputation = clamp(team.reputation + repChange, 1, 100);

    // Dynamique de Fans
    let fanChange = isWin ? randomInt(10, 25) + (isHome ? 10 : 0) : isDraw ? randomInt(-2, 5) : randomInt(-10, -2);
    fanChange = Math.round(fanChange * (1 + newReputation / 100));
    const newFanCount = Math.max(10, team.fanCount + fanChange);

    // --- LOGIQUE CONFIANCE AVANCÉE ---
    let confChange = isWin ? 5 : isDraw ? -1 : -8;

    // Si le résultat est négatif, on applique des modificateurs de clémence
    if (confChange < 0) {
        let penaltyMultiplier = 1.0;

        // 1. Tolérance de début de saison (6 premiers matchs)
        if ((team.matchesPlayed || 0) <= 6) {
            penaltyMultiplier = 0.5; // "Il ne faut pas qu'ils s'affolent"
        }

        // 2. Tolérance basée sur le classement et les points
        const teamsInLeague = await db.teams.where('leagueId').equals(team.leagueId).toArray();
        // Tri simple pour déterminer les positions approximatives
        teamsInLeague.sort((a, b) => (b.points || 0) - (a.points || 0)); 
        
        let targetPos = 10; // Default MID_TABLE
        if (team.seasonGoal === 'CHAMPION') targetPos = 1;
        else if (team.seasonGoal === 'PROMOTION') targetPos = 3;
        else if (team.seasonGoal === 'AVOID_RELEGATION') targetPos = teamsInLeague.length - 2;

        const targetTeam = teamsInLeague[Math.min(targetPos - 1, teamsInLeague.length - 1)];
        
        if (targetTeam) {
            const targetPoints = targetTeam.points || 0;
            const myPoints = team.points || 0; // Note: team.points contient déjà les points du match actuel car updateTeamStats est appelé avant

            // Si on est à égalité de points ou devant l'objectif, on ne panique pas
            if (myPoints >= targetPoints) {
                penaltyMultiplier = 0.2; 
            } else if (targetPoints - myPoints <= 3) {
                // Si on est à une victoire de l'objectif
                penaltyMultiplier = 0.7;
            }
        }
        
        confChange = Math.round(confChange * penaltyMultiplier);
        // On s'assure qu'une défaite fait au moins -1 si pas nul
        if (!isDraw && confChange === 0) confChange = -1;
    }

    const newConfidence = clamp(team.confidence + confChange, 0, 100);

    // --- BILLETTERIE ---
    let ticketIncome = 0;
    if (isHome) {
      let baseAttendance = Math.min(team.fanCount, team.stadiumCapacity);
      const variation = 1 + (randomInt(-10, 10) / 100);
      const formFactor = 1 + ((team.confidence - 50) / 200); 
      const attendance = Math.floor(clamp(baseAttendance * variation * formFactor, 0, team.stadiumCapacity));
      const ticketPrice = 0.15 + (team.reputation / 1000); 
      ticketIncome = Math.round(attendance * ticketPrice); 
    }

    let sponsorIncome = 0;
    if (team.sponsorName && team.sponsorExpiryDate && new Date(team.sponsorExpiryDate) > date) {
      sponsorIncome = team.sponsorIncome || 0;
    } else if (team.sponsorName) {
      await NewsService.addNews(saveId, { 
        day: 0, 
        date, 
        title: i18next.t('narratives.news.club.sponsor_left_title', { defaultValue: 'SPONSOR PARTI' }), 
        content: i18next.t('narratives.news.club.sponsor_left_content', { name: team.sponsorName, defaultValue: `Le contrat avec ${team.sponsorName} est fini.` }), 
        type: 'SPONSOR', 
        importance: 2 
      });
      await db.teams.update(teamId, { sponsorName: undefined, sponsorIncome: 0 });
    }

    const totalIncome = ticketIncome + sponsorIncome;
    await db.teams.update(teamId, { reputation: newReputation, fanCount: newFanCount, confidence: newConfidence, budget: team.budget + totalIncome });
    return { repChange, fanChange, confChange, totalIncome };
  },

  async startStadiumProject(teamId: number, currentDay: number, type: 'UPGRADE' | 'NEW_STADIUM', customName?: string) {
    const team = await db.teams.get(teamId);
    if (!team) return { success: false, error: 'Club non trouvé' };
    if (team.stadiumUpgradeEndDay) return { success: false, error: 'Chantier déjà en cours' };

    let cost = 0;
    let duration = 0;
    let targetCapacity = 0;

    if (type === 'UPGRADE') {
      cost = (team.stadiumLevel || 1) * (team.stadiumLevel || 1) * 1000;
      duration = 30;
      targetCapacity = team.stadiumCapacity + 1000;
    } else {
      cost = 10000;
      duration = 60;
      targetCapacity = 10000;
    }

    if (team.budget < cost) return { success: false, error: 'Budget insuffisant' };

    await db.teams.update(teamId, {
      stadiumUpgradeEndDay: currentDay + duration,
      budget: team.budget - cost,
      stadiumProject: {
        type,
        targetCapacity,
        targetName: customName || `${team.name} Arena`
      }
    });

    return { success: true, endDay: currentDay + duration };
  },

  async checkSacking(teamId: number, saveId: number, date: Date) {
    const team = await db.teams.get(teamId);
    if (team && team.confidence <= 0) {
      await NewsService.addNews(saveId, { 
        day: 0, 
        date, 
        title: i18next.t('narratives.news.club.sacked_title', { defaultValue: 'CONTRAT ROMPU' }), 
        content: i18next.t('narratives.news.club.sacked_content', { defaultValue: "Le Conseil d'Administration a décidé de vous licencier." }), 
        type: 'CLUB', 
        importance: 3 
      });
      return true;
    }
    return false;
  },

  async getSponsorOffers(reputation: number, currentDate: Date) {
    const allSponsors = [
      { name: 'The Local Bakery', baseIncome: 8, durationMonths: 6, minRep: 0 },
      { name: 'Smith & Sons Tools', baseIncome: 12, durationMonths: 12, minRep: 10 },
      { name: 'London Steam Engines Co.', baseIncome: 25, durationMonths: 12, minRep: 30 },
      { name: 'Victorian Tea Imports', baseIncome: 35, durationMonths: 24, minRep: 40 },
      { name: 'Royal Textile Mill', baseIncome: 50, durationMonths: 36, minRep: 60 },
      { name: "The Gentleman's Hat Shop", baseIncome: 15, durationMonths: 12, minRep: 20 },
      { name: 'Iron Bridge Foundries', baseIncome: 40, durationMonths: 12, minRep: 50 },
      { name: 'East India Company', baseIncome: 100, durationMonths: 48, minRep: 80 },
    ];

    const eligibleSponsors = allSponsors.filter(s => reputation >= s.minRep);

    let offerCount = 1;
    if (reputation > 50) offerCount = 3;
    else if (reputation > 20) offerCount = 2;

    return eligibleSponsors
      .sort(() => 0.5 - Math.random())
      .slice(0, offerCount)
      .map((s) => {
        const expiryDate = new Date(currentDate);
        expiryDate.setMonth(expiryDate.getMonth() + s.durationMonths);
        const variance = 0.9 + (Math.random() * 0.2);
        const finalIncome = Math.round(s.baseIncome * (1 + reputation / 100) * variance);
        return { ...s, income: finalIncome, expiryDate };
      });
  },

  async signSponsor(teamId: number, offer: any) {
    await db.teams.update(teamId, { sponsorName: offer.name, sponsorIncome: offer.income, sponsorExpiryDate: offer.expiryDate });
  },
};
