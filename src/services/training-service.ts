import { db, type StaffMember } from "@/db/db";
import { clamp, probability, randomInt } from "@/utils/math";
import { NewsService } from "./news-service";

export type TrainingFocus = "GENERAL" | "PHYSICAL" | "ATTACK" | "DEFENSE" | "GK";

export const TrainingService = {
	async startTrainingCycle(
		teamId: number,
		focus: TrainingFocus,
		currentDay: number,
	) {
		const team = await db.teams.get(teamId);
		if (!team) return { success: false };
		
		const nextStartDay = Math.ceil(currentDay / 7) * 7 + 1;

		await db.teams.update(teamId, {
			trainingStartDay: currentDay,
			trainingEndDay: nextStartDay,
			trainingFocus: focus,
		});

		return { success: true, endDay: nextStartDay };
	},

	async cancelTraining(teamId: number) {
		await db.teams.update(teamId, {
			trainingStartDay: undefined,
			trainingEndDay: undefined,
			trainingFocus: undefined,
		});
		return { success: true };
	},

	async processDailyUpdates(
		teamId: number,
		saveId: number,
		currentDay: number,
		currentDate: Date,
	) {
		const team = await db.teams.get(teamId);
		if (!team) return;

		// --- MISE À JOUR HEBDOMADAIRE (FORME) ---
		if (currentDay % 7 === 1) {
			const teamPlayers = await db.players.where("[saveId+teamId]").equals([saveId, teamId]).toArray();
			for (const p of teamPlayers) {
				let newFB = p.formBackground || 5;
				newFB += (4.5 - newFB) * 0.1 + (Math.random() - 0.5) * 2;
				if (!p.playedThisWeek) newFB -= 0.5;
				newFB = clamp(newFB, 1, 8);
				const newForm = p.form + (newFB - p.form) * 0.2;
				await db.players.update(p.id!, { form: newForm, formBackground: newFB, playedThisWeek: false, lastTrainingSkillChange: undefined });
			}
		}

		// --- LOGIQUE D'ENTRAÎNEMENT ---
		if (!team.trainingEndDay || !team.trainingFocus || currentDay !== team.trainingEndDay) return;

		const focus = team.trainingFocus as TrainingFocus;
		const startDay = team.trainingStartDay || (currentDay - 7);
		const activeDays = Math.min(7, currentDay - startDay);
		const trainingRatio = activeDays / 7;

		const staff = await db.staff.where("[saveId+teamId]").equals([saveId, teamId]).toArray();
		
		// Détermination de l'éligibilité basée sur les stats du staff
		let responsibleStaff: StaffMember | undefined = undefined;
		
		if (focus === "PHYSICAL") {
			responsibleStaff = staff.find(s => s.role === "PHYSICAL_TRAINER" && s.stats.physical >= 5);
		} else if (focus === "GENERAL") {
			responsibleStaff = staff.find(s => s.role === "COACH" && s.stats.training >= 5);
		} else if (focus === "ATTACK") {
			responsibleStaff = staff.find(s => s.role === "COACH" && s.stats.training >= 5.5); // Plus exigeant
		} else if (focus === "DEFENSE") {
			responsibleStaff = staff.find(s => s.role === "COACH" && s.stats.tactical >= 5.5);
		} else if (focus === "GK") {
			responsibleStaff = staff.find(s => s.role === "COACH" && s.stats.goalkeeping >= 5);
		}

		if (!responsibleStaff) {
			await db.teams.update(teamId, { trainingFocus: undefined, trainingEndDay: undefined });
			await NewsService.addNews(saveId, {
				day: currentDay, date: currentDate, type: "CLUB", importance: 2,
				title: "ENTRAÎNEMENT ANNULÉ",
				content: `Le cycle d'entraînement ${focus} a été annulé : personne dans le staff n'est qualifié pour le diriger.`
			});
			return;
		}

		// Bonus basé sur la stat spécifique du staff
		let skillBonus = 0;
		if (focus === "PHYSICAL") skillBonus = responsibleStaff.stats.physical;
		else if (focus === "GENERAL") skillBonus = responsibleStaff.stats.training;
		else if (focus === "ATTACK") skillBonus = responsibleStaff.stats.training;
		else if (focus === "DEFENSE") skillBonus = responsibleStaff.stats.tactical;
		else if (focus === "GK") skillBonus = responsibleStaff.stats.goalkeeping;
		
		const staffBonus = (skillBonus / 10) * 0.1;

		const players = await db.players.where("[saveId+teamId]").equals([saveId, teamId]).toArray();
		const progressions: string[] = [];

		for (const player of players) {
			const energyCost = randomInt(15, 25) * trainingRatio;
			const youthBonus = clamp((30 - player.age) * 0.005, 0, 0.05);
			const baseGain = (0.02 + youthBonus + staffBonus) * trainingRatio;

			const stats = { ...player.stats };
			const oldSkillFloor = Math.floor(player.skill);

			if (focus === "GENERAL") {
				const keys: (keyof typeof stats)[] = ["speed", "stamina", "playmaking", "technique", "scoring", "defense", "head"];
				const picked = keys[randomInt(0, keys.length - 1)];
				(stats as any)[picked] = clamp(((stats as any)[picked] || 1) + baseGain, 1, 10.99);
			} else if (focus === "PHYSICAL") {
				const picked = probability(0.5) ? "speed" : "stamina";
				(stats as any)[picked] = clamp(((stats as any)[picked] || 1) + baseGain * 1.6, 1, 10.99);
			} else if (focus === "ATTACK") {
				const picked = probability(0.6) ? "scoring" : "technique";
				(stats as any)[picked] = clamp(((stats as any)[picked] || 1) + baseGain * 1.6, 1, 10.99);
				if (picked === "scoring") stats.shooting = stats.scoring;
			} else if (focus === "DEFENSE") {
				const picked = probability(0.6) ? "defense" : "head";
				(stats as any)[picked] = clamp(((stats as any)[picked] || 1) + baseGain * 1.6, 1, 10.99);
				if (picked === "head") stats.strength = stats.head;
			} else if (focus === "GK") {
				if (player.position === "GK") {
					stats.defense = clamp((stats.defense || 1) + baseGain * 2.2, 1, 10.99);
				}
			}

			const avgSkill = (((stats.speed || 1) + (stats.head || 1) + (stats.stamina || 1) + (stats.scoring || 1) + (stats.playmaking || 1) + (stats.technique || 1) + (stats.defense || 1)) / 7);
			const skillIncreasedLevel = Math.floor(avgSkill) > oldSkillFloor;
			
			await db.players.update(player.id!, { 
				stats, 
				skill: avgSkill, 
				energy: Math.max(0, player.energy - energyCost), 
				lastTrainingSkillChange: skillIncreasedLevel ? avgSkill - player.skill : undefined 
			});
			
			if (skillIncreasedLevel) progressions.push(`- **[[player:${player.id}|${player.lastName}]]** est passé au niveau **${Math.floor(avgSkill)}**.`);
		}

		await db.teams.update(teamId, { trainingStartDay: undefined, trainingEndDay: undefined, trainingFocus: undefined });
		await NewsService.addNews(saveId, {
			day: currentDay, date: currentDate, type: "CLUB", importance: 2,
			title: "RAPPORT D'ENTRAÎNEMENT",
			content: `Le cycle ${focus} dirigé par ${responsibleStaff.name} est terminé.\n\n${progressions.join("\n")}`
		});
	}
};
