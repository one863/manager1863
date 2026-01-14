import { db } from "@/db/db";
import { clamp, probability, randomInt } from "@/utils/math";
import { NewsService } from "./news-service";

export const TrainingService = {
	async startTrainingCycle(
		teamId: number,
		focus: "PHYSICAL" | "TECHNICAL",
		currentDay: number,
	) {
		const team = await db.teams.get(teamId);
		if (!team) return { success: false };
		
		const nextStartDay = Math.ceil(currentDay / 7) * 7 + 1;

		await db.teams.update(teamId, {
			trainingEndDay: nextStartDay,
			trainingFocus: focus,
		});

		return { success: true, endDay: nextStartDay };
	},

	async processDailyUpdates(
		teamId: number,
		saveId: number,
		currentDay: number,
		currentDate: Date,
	) {
		const team = await db.teams.get(teamId);
		if (!team || !team.trainingEndDay || !team.trainingFocus) return;

		if (currentDay !== team.trainingEndDay) return;

		const focus = team.trainingFocus;
		
		// RÉCUPÉRATION DU STAFF POUR LES BONUS
		const staff = await db.staff
			.where("[saveId+teamId]")
			.equals([saveId, teamId])
			.toArray();
		
		const coach = staff.find(s => s.role === "COACH");
		const trainer = staff.find(s => s.role === "PHYSICAL_TRAINER");

		// Calcul du bonus de staff (0 à 0.3 selon le skill 0-100)
		let staffBonus = 0;
		if (focus === "PHYSICAL" && trainer) {
			staffBonus = (trainer.skill / 100) * 0.3;
		} else if (focus === "TECHNICAL" && coach) {
			staffBonus = (coach.skill / 100) * 0.3;
		}

		const players = await db.players
			.where("[saveId+teamId]")
			.equals([saveId, teamId])
			.toArray();
		
		const progressions: string[] = [];

		for (const player of players) {
			const energyCost = randomInt(15, 25);
			const newEnergy = Math.max(0, player.energy - energyCost);
			
			// Bonus d'âge : les jeunes progressent plus vite
			// 20 ans et moins : bonus max (+0.3)
			// 30 ans et plus : bonus nul
			const youthBonus = clamp((30 - player.age) * 0.03, 0, 0.3);
			
			// Chance de base (0.2) + Bonus Jeunesse (jusqu'à 0.3) + Bonus Staff (jusqu'à 0.3)
			// Max chance possible: 0.8 pour un jeune avec un staff d'élite
			const chance = 0.2 + youthBonus + staffBonus;

			const stats = { ...player.stats };

			if (probability(chance)) {
				let statIncreased = "";
				if (focus === "PHYSICAL") {
					const choices: (keyof typeof stats)[] = ["speed", "head", "stamina"];
					const picked = choices[randomInt(0, 2)];
					(stats as any)[picked] = clamp(((stats as any)[picked] || 0) + 1, 1, 99);
					statIncreased = picked;
					if (picked === "head") stats.strength = stats.head;
				} else if (focus === "TECHNICAL") {
					const choices: (keyof typeof stats)[] = ["scoring", "playmaking", "technique", "defense"];
					const picked = choices[randomInt(0, 3)];
					(stats as any)[picked] = clamp(((stats as any)[picked] || 0) + 1, 1, 99);
					statIncreased = picked;
					if (picked === "scoring") stats.shooting = stats.scoring;
					if (picked === "playmaking") stats.passing = stats.playmaking;
					if (picked === "technique") stats.dribbling = stats.technique;
				}

				const avgSkill = Math.round(
					((stats.speed || 0) +
						(stats.head || stats.strength || 0) +
						(stats.stamina || 0) +
						(stats.scoring || stats.shooting || 0) +
						(stats.playmaking || stats.passing || 0) +
						(stats.technique || stats.dribbling || 0) +
						(stats.defense || 0)) /
						7,
				);

				await db.players.update(player.id!, {
					stats,
					skill: avgSkill,
					energy: newEnergy,
				});
				
				progressions.push(`- [[player:${player.id}|${player.lastName}]] a augmenté d'un point en **${statIncreased}**.`);
			} else {
				await db.players.update(player.id!, { energy: newEnergy });
			}
		}

		await db.teams.update(teamId, {
			trainingEndDay: undefined,
			trainingFocus: undefined,
		});

		if (progressions.length > 0) {
			await NewsService.addNews(saveId, {
				day: currentDay,
				date: currentDate,
				title: "RAPPORT D'ENTRAÎNEMENT HEBDOMADAIRE",
				content: `Le cycle intensif de focus ${focus} s'est achevé. Grâce au travail de notre encadrement technique, voici les progrès notables :\n\n${progressions.join("\n")}`,
				type: "CLUB",
				importance: 2,
			});
		} else {
			await NewsService.addNews(saveId, {
				day: currentDay,
				date: currentDate,
				title: "RAPPORT D'ENTRAÎNEMENT",
				content: `Le cycle de focus ${focus} est terminé. Malgré l'investissement du staff, aucun progrès significatif n'est à noter cette semaine.`,
				type: "CLUB",
				importance: 1,
			});
		}

		return progressions;
	},
};
