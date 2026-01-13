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
    // Bonus de réputation si on bat une équipe plus forte (à implémenter si on avait accès à l'adversaire ici, mais on simplifie)
    const newReputation = clamp(team.reputation + repChange, 1, 100);

    // Dynamique de Fans
    let fanChange = isWin ? randomInt(10, 25) + (isHome ? 10 : 0) : isDraw ? randomInt(-2, 5) : randomInt(-10, -2);
    // Les fans viennent plus si la réputation monte
    fanChange = Math.round(fanChange * (1 + newReputation / 100));
    const newFanCount = Math.max(10, team.fanCount + fanChange);

    // Dynamique de Confiance
    let confChange = isWin ? 5 : isDraw ? -1 : -8;
    const newConfidence = clamp(team.confidence + confChange, 0, 100);

    // --- BILLETTERIE ---
    let ticketIncome = 0;
    if (isHome) {
      // Affluence de base : Fans limités par le stade
      let baseAttendance = Math.min(team.fanCount, team.stadiumCapacity);
      
      // Facteur aléatoire (Météo, Jour de semaine...) : +/- 10%
      const variation = 1 + (randomInt(-10, 10) / 100);
      
      // Facteur de forme : si on gagne (confiance haute), plus de monde
      const formFactor = 1 + ((team.confidence - 50) / 200); // +/- 25% max

      const attendance = Math.floor(clamp(baseAttendance * variation * formFactor, 0, team.stadiumCapacity));
      
      // Prix du billet : 0.15£ par défaut + prime de réputation
      const ticketPrice = 0.15 + (team.reputation / 1000); 
      
      ticketIncome = Math.round(attendance * ticketPrice); 
    }
    // -------------------

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
        content: i18next.t('narratives.news.club.sacked_content', { defaultValue: 'Le board a décidé de vous licencier.' }), 
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

    // Filtrer les sponsors éligibles selon la réputation
    const eligibleSponsors = allSponsors.filter(s => reputation >= s.minRep);

    // Déterminer combien d'offres montrer (1 à 3) selon la réputation
    // Rep 0-20: 1 offre
    // Rep 21-50: 2 offres
    // Rep 51+: 3 offres
    let offerCount = 1;
    if (reputation > 50) offerCount = 3;
    else if (reputation > 20) offerCount = 2;

    // Mélanger et prendre le nombre défini
    return eligibleSponsors
      .sort(() => 0.5 - Math.random())
      .slice(0, offerCount)
      .map((s) => {
        const expiryDate = new Date(currentDate);
        expiryDate.setMonth(expiryDate.getMonth() + s.durationMonths);
        
        // Petite variation aléatoire sur l'offre (+/- 10%)
        const variance = 0.9 + (Math.random() * 0.2);
        const finalIncome = Math.round(s.baseIncome * (1 + reputation / 100) * variance);
        
        return { ...s, income: finalIncome, expiryDate };
      });
  },

  async signSponsor(teamId: number, offer: any) {
    await db.teams.update(teamId, { sponsorName: offer.name, sponsorIncome: offer.income, sponsorExpiryDate: offer.expiryDate });
  },
};
