import { db, Team, NewsArticle } from '@/db/db';
import { clamp, randomInt, getRandomElement } from '@/utils/math';
import { NewsService } from './news-service';

export const ClubService = {
  async updateDynamicsAfterMatch(
    teamId: number,
    myScore: number,
    oppScore: number,
    isHome: boolean,
    saveId: number,
    date: Date,
  ) {
    const team = await db.teams.get(teamId);
    if (!team) return;

    const isWin = myScore > oppScore;
    const isDraw = myScore === oppScore;
    const goalDiff = myScore - oppScore;

    // 1. Réputation
    let repChange = isWin ? 1 + clamp(goalDiff, 0, 3) : isDraw ? 0 : -1;
    const newReputation = clamp(team.reputation + repChange, 1, 100);

    // 2. Fans
    let fanChange = isWin
      ? randomInt(5, 15) + (isHome ? 5 : 0)
      : isDraw
        ? randomInt(-2, 5)
        : randomInt(-10, -2);
    fanChange = Math.round(fanChange * (1 + newReputation / 100));
    const newFanCount = Math.max(10, team.fanCount + fanChange);

    // 3. Confiance
    let confChange = isWin ? 5 : isDraw ? -1 : -8;
    if (newReputation < 30) confChange -= 2;
    const newConfidence = clamp(team.confidence + confChange, 0, 100);

    // 4. Revenus (Billetterie + Sponsor)
    let ticketIncome = 0;
    if (isHome) {
      const attendance = Math.min(team.fanCount, team.stadiumCapacity);
      ticketIncome = Math.round(attendance * 0.1);
    }

    // Gestion de l'expiration du sponsor
    let sponsorIncome = 0;
    if (
      team.sponsorName &&
      team.sponsorExpiryDate &&
      new Date(team.sponsorExpiryDate) > date
    ) {
      sponsorIncome = team.sponsorIncome || 0;
    } else if (team.sponsorName) {
      // Le contrat a expiré
      await NewsService.addNews(saveId, {
        date,
        title: 'CONTRAT DE SPONSORING TERMINÉ',
        content: `Le contrat avec ${team.sponsorName} est arrivé à son terme. Vous devez trouver un nouveau partenaire.`,
        type: 'SPONSOR',
        importance: 2,
      });
      await db.teams.update(teamId, {
        sponsorName: undefined,
        sponsorIncome: 0,
      });
    }

    const totalIncome = ticketIncome + sponsorIncome;

    await db.teams.update(teamId, {
      reputation: newReputation,
      fanCount: newFanCount,
      confidence: newConfidence,
      budget: team.budget + totalIncome,
    });

    if (isWin && goalDiff >= 3 && sponsorIncome > 0) {
      await NewsService.addNews(saveId, {
        date,
        title: `Bonus Sponsor : ${team.sponsorName} ravi !`,
        content: `Grâce à votre large victoire, votre sponsor ${team.sponsorName} a décidé de doubler sa prime de match ! (+${sponsorIncome} crédits)`,
        type: 'SPONSOR',
        importance: 2,
      });
      await db.teams.update(teamId, {
        budget: team.budget + totalIncome + sponsorIncome,
      });
    }

    return { repChange, fanChange, confChange, totalIncome };
  },

  async checkSacking(teamId: number, saveId: number, date: Date) {
    const team = await db.teams.get(teamId);
    if (team && team.confidence <= 0) {
      await NewsService.addNews(saveId, {
        date,
        title: 'RUPTURE DE CONTRAT',
        content: `Le conseil d'administration de ${team.name} a décidé de se séparer de vous avec effet immédiat. Vos résultats et la chute de la confiance ont scellé votre destin.`,
        type: 'CLUB',
        importance: 3,
      });
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

    return historicalSponsors
      .sort(() => 0.5 - Math.random())
      .slice(0, 3)
      .map((s) => {
        const expiryDate = new Date(currentDate);
        expiryDate.setMonth(expiryDate.getMonth() + s.durationMonths);
        return {
          ...s,
          income: Math.round(s.baseIncome * (reputation / 50)),
          expiryDate,
        };
      });
  },

  async signSponsor(teamId: number, offer: any) {
    await db.teams.update(teamId, {
      sponsorName: offer.name,
      sponsorIncome: offer.income,
      sponsorExpiryDate: offer.expiryDate,
    });
  },
};
