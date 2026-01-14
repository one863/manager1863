import { db } from "@/db/db";
import { clamp, randomInt } from "@/utils/math";
import i18next from "i18next";
import { NewsService } from "./news-service";
import type { Sponsor } from "@/engine/types";

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

		// Traitement fin de chantier
		if (
			team.stadiumUpgradeEndDay &&
			team.stadiumUpgradeEndDay <= currentDay &&
			team.stadiumProject
		) {
			const project = team.stadiumProject;

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
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

			const titleKey =
				project.type === "NEW_STADIUM"
					? "narratives.news.club.stadium_new_title"
					: "narratives.news.club.stadium_upgrade_title";
			const contentKey =
				project.type === "NEW_STADIUM"
					? "narratives.news.club.stadium_new_content"
					: "narratives.news.club.stadium_upgrade_content";

			await NewsService.addNews(saveId, {
				day: currentDay,
				date: currentDate,
				title: i18next.t(titleKey, {
					defaultValue:
						project.type === "NEW_STADIUM"
							? "INAUGURATION"
							: "TRAVAUX TERMINÉS",
				}),
				content: i18next.t(contentKey, {
					name:
						project.type === "NEW_STADIUM"
							? project.targetName
							: team.stadiumName,
					capacity: project.targetCapacity,
					defaultValue: "Les travaux sont terminés.",
				}),
				type: "CLUB",
				importance: 3,
			});
		}

		// --- SALAIRES ET REVENUS HEBDOMADAIRES ---
		if (currentDay > 0 && currentDay % 7 === 0) {
			await this.processWeeklyFinances(saveId, teamId, currentDay, currentDate);
		}

		// --- OPPORTUNITÉS DE SPONSOR (NEWS) ---
		// On propose un sponsor si on a moins de 3 sponsors actifs
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
					content: `La société **${offer.name}** souhaite devenir l'un de nos partenaires. Ils proposent un contrat jusqu'à la Saison ${offer.expirySeason}, Jour ${offer.expiryDay}, avec un versement hebdomadaire de **M ${offer.income}**.`,
					type: "SPONSOR",
					importance: 2,
					actionData: {
						type: "SIGN_SPONSOR",
						offer: offer
					}
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

		// 1. DÉPENSES : SALAIRES
		const staff = await db.staff
			.where("[saveId+teamId]")
			.equals([saveId, teamId])
			.toArray();
		const totalStaffWage = staff.reduce((acc, s) => acc + s.wage, 0);

		const players = await db.players
			.where("[saveId+teamId]")
			.equals([saveId, teamId])
			.toArray();
		const totalPlayerWage = players.reduce((acc, p) => acc + Math.round(p.skill * 0.2), 0);

		const totalWage = totalStaffWage + totalPlayerWage;

		// 2. REVENUS : SPONSORS (Multiples)
		const currentSponsors = team.sponsors || [];
		const activeSponsors: Sponsor[] = [];
		const expiredSponsors: Sponsor[] = [];
		let totalSponsorIncome = 0;

		for (const sponsor of currentSponsors) {
			const isExpired = state.season > sponsor.expirySeason || (state.season === sponsor.expirySeason && state.day >= sponsor.expiryDay);
			if (isExpired) {
				expiredSponsors.push(sponsor);
			} else {
				activeSponsors.push(sponsor);
				totalSponsorIncome += sponsor.income;
			}
		}

		// Gérer les expirations
		if (expiredSponsors.length > 0) {
			for (const exp of expiredSponsors) {
				await NewsService.addNews(saveId, {
					day: state.day,
					date: state.currentDate,
					title: "CONTRAT DE SPONSOR EXPIRÉ",
					content: `Le contrat avec **${exp.name}** est arrivé à son terme aujourd'hui.`,
					type: "SPONSOR",
					importance: 2,
				});
			}
			await db.teams.update(teamId, { sponsors: activeSponsors });
		}

		// 3. REVENUS : BILLETTERIE
		const ticketIncome = team.pendingIncome || 0;

		const weeklyBalance = totalSponsorIncome + ticketIncome - totalWage;

		await db.teams.update(teamId, { 
			budget: team.budget + weeklyBalance,
			pendingIncome: 0
		});

		// News stylisée
		await NewsService.addNews(saveId, {
			day,
			date,
			title: "RAPPORT FINANCIER HEBDOMADAIRE",
			content: `Monsieur le Manager, voici le bilan de notre activité pour la semaine écoulée.

**RECETTES :**
- Contrats Sponsors (${activeSponsors.length}) : **M ${totalSponsorIncome}**
- Billetterie cumulée : **M ${ticketIncome}**

**DÉPENSES :**
- Masse salariale (Joueurs & Staff) : **- M ${totalWage}**

Le solde de la semaine s'établit à **M ${weeklyBalance}**. Ces fonds ont été injectés dans votre **Trésorerie**.`,
			type: "CLUB",
			importance: 2,
		});
	},

	async processDailyPlayerUpdates(saveId: number, teamId: number) {
		const players = await db.players
			.where("[saveId+teamId]")
			.equals([saveId, teamId])
			.toArray();
		for (const player of players) {
			const energyGain = 5;
			const conditionGain = 2;
			const newEnergy = clamp(player.energy + energyGain, 0, 100);
			const newCondition = clamp(player.condition + conditionGain, 0, 100);
			let newMorale = player.morale;
			if (player.morale > 55) newMorale -= 1;
			else if (player.morale < 45) newMorale += 1;
			await db.players.update(player.id!, {
				energy: newEnergy,
				condition: newCondition,
				morale: newMorale,
			});
		}
	},

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

		const repChange = isWin ? 1 + clamp(goalDiff, 0, 3) : isDraw ? 0 : -1;
		const newReputation = clamp(team.reputation + repChange, 1, 100);

		let fanChange = isWin
			? randomInt(10, 25) + (isHome ? 10 : 0)
			: isDraw
				? randomInt(-2, 5)
				: randomInt(-10, -2);
		fanChange = Math.round(fanChange * (1 + newReputation / 100));
		const newFanCount = Math.max(10, team.fanCount + fanChange);

		let confChange = isWin ? 5 : isDraw ? -1 : -8;
		if (confChange < 0) {
			let penaltyMultiplier = 1.0;
			if ((team.matchesPlayed || 0) <= 6) penaltyMultiplier = 0.5;
			const teamsInLeague = await db.teams
				.where("leagueId")
				.equals(team.leagueId)
				.toArray();
			teamsInLeague.sort((a, b) => (b.points || 0) - (a.points || 0));

			let targetPos = 10;
			if (team.seasonGoal === "CHAMPION") targetPos = 1;
			else if (team.seasonGoal === "PROMOTION") targetPos = 3;
			else if (team.seasonGoal === "AVOID_RELEGATION")
				targetPos = teamsInLeague.length - 2;

			const targetTeam =
				teamsInLeague[Math.min(targetPos - 1, teamsInLeague.length - 1)];

			if (targetTeam) {
				const targetPoints = targetTeam.points || 0;
				const myPoints = team.points || 0;
				if (myPoints >= targetPoints) penaltyMultiplier = 0.2;
				else if (targetPoints - myPoints <= 3) penaltyMultiplier = 0.7;
			}

			confChange = Math.round(confChange * penaltyMultiplier);
			if (!isDraw && confChange === 0) confChange = -1;
		}

		const newConfidence = clamp(team.confidence + confChange, 0, 100);

		let ticketIncome = 0;
		if (isHome) {
			const baseAttendance = Math.min(team.fanCount, team.stadiumCapacity);
			const variation = 1 + randomInt(-10, 10) / 100;
			const formFactor = 1 + (team.confidence - 50) / 200;
			const attendance = Math.floor(
				clamp(baseAttendance * variation * formFactor, 0, team.stadiumCapacity),
			);
			const ticketPrice = 0.15 + team.reputation / 1000;
			ticketIncome = Math.round(attendance * ticketPrice);
		}

		await db.teams.update(teamId, {
			reputation: newReputation,
			fanCount: newFanCount,
			confidence: newConfidence,
			pendingIncome: (team.pendingIncome || 0) + ticketIncome,
		});

		return { repChange, fanChange, confChange, totalIncome: ticketIncome };
	},

	async startStadiumProject(
		teamId: number,
		currentDay: number,
		type: "UPGRADE" | "NEW_STADIUM",
		customName?: string,
	) {
		const team = await db.teams.get(teamId);
		if (!team) return { success: false, error: "Club non trouvé" };
		if (team.stadiumUpgradeEndDay)
			return { success: false, error: "Chantier déjà en cours" };

		let cost = 0;
		let duration = 0;
		let targetCapacity = 0;

		if (type === "UPGRADE") {
			cost = (team.stadiumLevel || 1) * (team.stadiumLevel || 1) * 1000;
			duration = 30;
			targetCapacity = team.stadiumCapacity + 1000;
		} else {
			cost = 10000;
			duration = 60;
			targetCapacity = 10000;
		}

		if (team.budget < cost)
			return { success: false, error: "Budget insuffisant" };

		await db.teams.update(teamId, {
			stadiumUpgradeEndDay: currentDay + duration,
			budget: team.budget - cost,
			stadiumProject: {
				type,
				targetCapacity,
				targetName: customName || `${team.name} Arena`,
			},
		});

		return { success: true, endDay: currentDay + duration };
	},

	async checkSacking(teamId: number, saveId: number, date: Date) {
		const team = await db.teams.get(teamId);
		if (team && team.confidence <= 0) {
			await NewsService.addNews(saveId, {
				day: 0,
				date,
				title: i18next.t("narratives.news.club.sacked_title", {
					defaultValue: "CONTRAT ROMPU",
				}),
				content: i18next.t("narratives.news.club.sacked_content", {
					defaultValue:
						"Le Conseil d'Administration a décidé de vous licencier.",
				}),
				type: "CLUB",
				importance: 3,
			});
			return true;
		}
		return false;
	},

	async getSponsorOffers(teamId: number, reputation: number, currentDate: Date, currentDay: number, currentSeason: number) {
		const team = await db.teams.get(teamId);
		const currentSponsorNames = (team?.sponsors || []).map(s => s.name);

		const allSponsors = [
			{ name: "The Local Bakery", baseIncome: 16, durationDays: 30, minRep: 0 },
			{
				name: "Smith & Sons Tools",
				baseIncome: 25,
				durationDays: 60,
				minRep: 10,
			},
			{
				name: "London Steam Engines Co.",
				baseIncome: 50,
				durationDays: 60,
				minRep: 30,
			},
			{
				name: "Victorian Tea Imports",
				baseIncome: 70,
				durationDays: 90,
				minRep: 40,
			},
			{
				name: "Royal Textile Mill",
				baseIncome: 100,
				durationDays: 120,
				minRep: 60,
			},
			{
				name: "The Gentleman's Hat Shop",
				baseIncome: 30,
				durationDays: 60,
				minRep: 20,
			},
			{
				name: "Iron Bridge Foundries",
				baseIncome: 80,
				durationDays: 60,
				minRep: 50,
			},
			{
				name: "East India Company",
				baseIncome: 200,
				durationDays: 200,
				minRep: 80,
			},
		];

		// Filtrer les sponsors éligibles ET ceux que nous n'avons pas encore
		const eligibleSponsors = allSponsors.filter((s) => reputation >= s.minRep && !currentSponsorNames.includes(s.name));

		let offerCount = 1;
		if (reputation > 50) offerCount = 3;
		else if (reputation > 20) offerCount = 2;

		return eligibleSponsors
			.sort(() => 0.5 - Math.random())
			.slice(0, offerCount)
			.map((s) => {
				const variance = 0.9 + Math.random() * 0.2;
				const finalIncome = Math.round(
					s.baseIncome * (1 + reputation / 100) * variance,
				);
				
				// Calculate expiry in game time
				let expiryDay = currentDay + s.durationDays;
				let expirySeason = currentSeason;
				// On considère une saison de 50 jours environ
				while (expiryDay > 60) {
					expiryDay -= 60;
					expirySeason += 1;
				}

				return { name: s.name, income: finalIncome, expiryDay, expirySeason };
			});
	},

	async signSponsor(teamId: number, offer: Sponsor) {
		const team = await db.teams.get(teamId);
		if (!team) return;

		const currentSponsors = team.sponsors || [];
		
		// Vérification doublon avant signature au cas où l'offre est restée dans les news
		if (currentSponsors.some(s => s.name === offer.name)) return;
		
		// Si on a déjà 3 sponsors, on ne peut pas en signer un nouveau
		if (currentSponsors.length >= 3) return;

		await db.teams.update(teamId, {
			sponsors: [...currentSponsors, {
				name: offer.name,
				income: offer.income,
				expiryDay: offer.expiryDay,
				expirySeason: offer.expirySeason
			}]
		});
	},
};
