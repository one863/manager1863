import { db } from "@/db/db";
import { clamp, randomInt } from "@/utils/math";
import { NewsService } from "./news-service";
import type { Sponsor } from "@/engine/core/types";

export const ClubService = {
	async processDailyUpdates(
		teamId: number,
		saveId: number,
		currentDay: number,
		currentDate: Date,
	) {
		const team = await db.teams.get(teamId);
		if (!team) return;

		const state = await db.gameState.get(saveId);
		if (!state) return;

		if (
			team.stadiumUpgradeEndDay &&
			team.stadiumUpgradeEndDay <= currentDay &&
			team.stadiumProject
		) {
			const project = team.stadiumProject;
			const updateData: any = {
				stadiumUpgradeEndDay: undefined,
				stadiumProject: undefined,
			};

			if (project.type === "UPGRADE") {
				updateData.stadiumLevel = (team.stadiumLevel || 1) + 1;
				updateData.stadiumCapacity = project.targetCapacity;
			} else if (project.type === "NEW_STADIUM") {
				updateData.stadiumLevel = 1;
				updateData.stadiumCapacity = project.targetCapacity;
				updateData.stadiumName = project.targetName;
			}

			await db.teams.update(teamId, updateData);

			await NewsService.addNews(saveId, {
				day: currentDay,
				date: currentDate,
				title: "TRAVAUX TERMINÉS",
				content: `Les travaux au stade sont finis. Capacité : ${project.targetCapacity} places.`,
				type: "CLUB",
				importance: 3,
			});
		}

		// FINANCES HEBDOMADAIRES (Jour 7, 14, 21...)
		if (currentDay > 0 && currentDay % 7 === 0) {
			await this.processWeeklyFinances(saveId, teamId, currentDay, currentDate);
		}

		// SPONSORS
		const currentSponsors = team.sponsors || [];
		const shouldGetOffer = currentSponsors.length < 3 && (currentDay === 1 || Math.random() < 0.05);

		if (shouldGetOffer) {
			const offers = await this.getSponsorOffers(teamId, team.reputation, currentDate, state.day, state.season);
			if (offers.length > 0) {
				const offer = offers[0];
				await NewsService.addNews(saveId, {
					day: currentDay,
					date: currentDate,
					title: "OFFRE DE PARTENARIAT",
					content: `La société **${offer.name}** propose un versement hebdomadaire de **M ${offer.income}**.`,
					type: "SPONSOR",
					importance: 2,
					actionData: { type: "SIGN_SPONSOR", offer: offer }
				});
			}
		}

		await this.processDailyPlayerUpdates(saveId, teamId);
	},

	async processWeeklyFinances(saveId: number, teamId: number, day: number, date: Date) {
		const team = await db.teams.get(teamId);
		if (!team) return;

		const state = await db.gameState.get(saveId);
		if (!state) return;

		// 1. SALAIRES STAFF (Réels)
		const staff = await db.staff.where("[saveId+teamId]").equals([saveId, teamId]).toArray();
		const totalStaffWage = staff.reduce((acc, s) => acc + (s.wage || 0), 0);

		// 2. SALAIRES JOUEURS (Réels)
		const players = await db.players.where("[saveId+teamId]").equals([saveId, teamId]).toArray();
		const totalPlayerWage = players.reduce((acc, p) => acc + (p.wage || 0), 0);

		const totalWage = totalStaffWage + totalPlayerWage;

		// 3. REVENUS
		const currentSponsors = team.sponsors || [];
		let totalSponsorIncome = 0;
		const activeSponsors = currentSponsors.filter(s => {
			const isExpired = state.season > s.expirySeason || (state.season === s.expirySeason && state.day >= s.expiryDay);
			if (!isExpired) totalSponsorIncome += s.income;
			return !isExpired;
		});

		if (activeSponsors.length !== currentSponsors.length) {
			await db.teams.update(teamId, { sponsors: activeSponsors });
		}

		const ticketIncome = team.pendingIncome || 0;
		const weeklyBalance = totalSponsorIncome + ticketIncome - totalWage;

		await db.teams.update(teamId, { 
			budget: team.budget + weeklyBalance,
			pendingIncome: 0
		});

		await NewsService.addNews(saveId, {
			day,
			date,
			title: "BILAN FINANCIER",
			content: `Bilan de la semaine : \n- Recettes : M ${totalSponsorIncome + ticketIncome} \n- Salaires Staff : M ${totalStaffWage} \n- Salaires Joueurs : M ${totalPlayerWage} \n\nSolde : **M ${weeklyBalance}**`,
			type: "CLUB",
			importance: 2,
		});
	},

	async processDailyPlayerUpdates(saveId: number, teamId: number) {
		const players = await db.players.where("[saveId+teamId]").equals([saveId, teamId]).toArray();
		for (const player of players) {
			await db.players.update(player.id!, {
				energy: clamp(player.energy + 5, 0, 100),
				condition: clamp(player.condition + 2, 0, 100),
				morale: clamp(player.morale + (player.morale < 50 ? 1 : -1), 0, 100)
			});
		}
	},

	async updateDynamicsAfterMatch(teamId: number, myScore: number, oppScore: number, isHome: boolean, saveId: number, date: Date) {
		const team = await db.teams.get(teamId);
		if (!team) return;
		const isWin = myScore > oppScore;
		const goalDiff = myScore - oppScore;

		const repChange = isWin ? 1 + clamp(goalDiff, 0, 3) : (myScore === oppScore ? 0 : -1);
		const newReputation = clamp(team.reputation + repChange, 1, 100);

		let ticketIncome = 0;
		if (isHome) {
			const attendance = Math.floor(clamp(team.fanCount * (1 + (team.confidence - 50) / 200), 0, team.stadiumCapacity));
			ticketIncome = Math.round(attendance * (0.15 + team.reputation / 1000));
		}

		await db.teams.update(teamId, {
			reputation: newReputation,
			confidence: clamp(team.confidence + (isWin ? 5 : -5), 0, 100),
			pendingIncome: (team.pendingIncome || 0) + ticketIncome,
		});

		return { repChange, totalIncome: ticketIncome };
	},

	async startStadiumProject(teamId: number, currentDay: number, type: "UPGRADE" | "NEW_STADIUM", customName?: string) {
		const team = await db.teams.get(teamId);
		if (!team || team.stadiumUpgradeEndDay) return { success: false };
		const cost = type === "UPGRADE" ? (team.stadiumLevel || 1) * 1000 : 10000;
		if (team.budget < cost) return { success: false };

		await db.teams.update(teamId, {
			stadiumUpgradeEndDay: currentDay + 30,
			budget: team.budget - cost,
			stadiumProject: { type, targetCapacity: team.stadiumCapacity + 1000, targetName: customName || team.stadiumName }
		});
		return { success: true };
	},

	async getSponsorOffers(teamId: number, reputation: number, currentDate: Date, currentDay: number, currentSeason: number) {
		const allSponsors = [
			{ name: "The Local Bakery", baseIncome: 16, minRep: 0 },
			{ name: "Smith & Sons Tools", baseIncome: 25, minRep: 10 },
			{ name: "London Steam Engines Co.", baseIncome: 50, minRep: 30 },
		];
		return allSponsors.filter(s => reputation >= s.minRep).map(s => ({
			name: s.name, income: s.baseIncome, expiryDay: 1, expirySeason: currentSeason + 1
		}));
	},

	async signSponsor(teamId: number, offer: Sponsor) {
		const team = await db.teams.get(teamId);
		if (team && (team.sponsors || []).length < 3) {
			await db.teams.update(teamId, { sponsors: [...(team.sponsors || []), offer] });
		}
	},
};
