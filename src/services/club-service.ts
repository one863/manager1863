import { db, Team, NewsArticle } from '@/db/db';
import { clamp, randomInt, getRandomElement } from '@/utils/math';
import { NewsService } from './news-service';

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

      await NewsService.addNews(saveId, {
        day: currentDay,
        date: currentDate,
        title: project.type === 'NEW_STADIUM' ? "INAUGURATION DU STADE" : "TRAVAUX TERMINÉS",
        content: project.type === 'NEW_STADIUM' 
          ? `Le ruban est coupé ! Bienvenue au ${project.targetName}, notre nouveau foyer de ${project.targetCapacity} places.`
          : `L'agrandissement de ${team.stadiumName} est fini. Nous pouvons désormais accueillir ${project.targetCapacity} supporters.`,
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

    let repChange = isWin ? 1 + clamp(goalDiff, 0, 3) : isDraw ? 0 : -1;
    const newReputation = clamp(team.reputation + repChange, 1, 100);

    let fanChange = isWin ? randomInt(10, 25) + (isHome ? 10 : 0) : isDraw ? randomInt(-2, 5) : randomInt(-10, -2);
    fanChange = Math.round(fanChange * (1 + newReputation / 100));
    const newFanCount = Math.max(10, team.fanCount + fanChange);

    let confChange = isWin ? 5 : isDraw ? -1 : -8;
    const newConfidence = clamp(team.confidence + confChange, 0, 100);

    let ticketIncome = 0;
    if (isHome) {
      const attendance = Math.min(team.fanCount, team.stadiumCapacity);
      ticketIncome = Math.round(attendance * 0.15); // Prix billet légèrement augmenté
    }

    let sponsorIncome = 0;
    if (team.sponsorName && team.sponsorExpiryDate && new Date(team.sponsorExpiryDate) > date) {
      sponsorIncome = team.sponsorIncome || 0;
    } else if (team.sponsorName) {
      await NewsService.addNews(saveId, { day: 0, date, title: 'SPONSOR PARTI', content: `Le contrat avec ${team.sponsorName} est fini.`, type: 'SPONSOR', importance: 2 });
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
      await NewsService.addNews(saveId, { day: 0, date, title: 'CONTRAT ROMPU', content: `Le board a décidé de vous licencier.`, type: 'CLUB', importance: 3 });
      return true;
    }
    return false;
  },

  async getSponsorOffers(reputation: number, currentDate: Date) {
    const historicalSponsors = [
      { name: 'London Steam Engines Co.', baseIncome: 20, durationMonths: 6 },
      { name: 'Victorian Tea Imports', baseIncome: 15, durationMonths: 12 },
      { name: 'Royal Textile Mill', baseIncome: 25, durationMonths: 4 },
      { name: "The Gentleman's Hat Shop", baseIncome: 10, durationMonths: 24 },
      { name: 'Iron Bridge Foundries', baseIncome: 30, durationMonths: 3 },
    ];
    return historicalSponsors.sort(() => 0.5 - Math.random()).slice(0, 3).map((s) => {
      const expiryDate = new Date(currentDate);
      expiryDate.setMonth(expiryDate.getMonth() + s.durationMonths);
      return { ...s, income: Math.round(s.baseIncome * (reputation / 50)), expiryDate };
    });
  },

  async signSponsor(teamId: number, offer: any) {
    await db.teams.update(teamId, { sponsorName: offer.name, sponsorIncome: offer.income, sponsorExpiryDate: offer.expiryDate });
  },
};
