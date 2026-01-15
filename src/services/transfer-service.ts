import { type Player, type Team, type StaffMember, db } from "@/db/db";
import { randomInt, getRandomElement } from "@/utils/math";
import { generatePlayer } from "@/data/players-generator";

const FIRST_NAMES_M = ["William", "John", "Thomas", "George", "Charles", "Henry", "Joseph", "Robert", "James", "Edward"];
const FIRST_NAMES_F = ["Elizabeth", "Mary", "Victoria", "Alice", "Florence", "Sarah", "Grace", "Emma", "Catherine", "Martha"];
const LAST_NAMES = ["Smith", "Jones", "Brown", "Taylor", "Williams", "Wilson", "Johnson", "Davies", "Robinson", "Wright"];
const SPECIALTIES = ["Formation Jeunes", "Tactique Moderne", "Motivation", "Discipline", "Analyse Vidéo", "Préparation Physique"];

export const TransferService = {
	async refreshMarketForReputation(saveId: number, reputation: number) {
		const playerCount = await db.players
			.where("[saveId+teamId]")
			.equals([saveId, -1])
			.count();

		if (playerCount < 20) {
			const playersToCreate = 30;
			const newPlayers: Player[] = [];

			for (let i = 0; i < playersToCreate; i++) {
				const targetSkill = Math.max(10, Math.min(99, reputation + randomInt(-15, 15)));
				const player = generatePlayer(targetSkill);
				
				newPlayers.push({
					...player,
					saveId,
					teamId: -1,
				} as Player);
			}
			await db.players.bulkAdd(newPlayers);
		}

		// Refresh Staff Market
		const staffCount = await db.staff
			.where("[saveId+teamId]")
			.equals([saveId, -1])
			.count();

		if (staffCount < 10) {
			const staffToCreate = 15;
			const newStaff: StaffMember[] = [];
			const roles: StaffMember["role"][] = ["COACH", "SCOUT", "PHYSICAL_TRAINER"];

			for (let i = 0; i < staffToCreate; i++) {
				const role = getRandomElement(roles);
				const skill = Math.max(10, Math.min(99, reputation + randomInt(-10, 10)));
				const wage = Math.round(skill * 0.5);
				const isFemale = Math.random() < 0.4; 

				// DNA: skin-hairColor-hairStyle-facial-eyes-gender-accessory
				const dna = [
					randomInt(0, 3), // skin
					randomInt(0, 5), // hairColor
					randomInt(0, 5), // hairStyle
					randomInt(0, 4), // facial
					randomInt(0, 3), // eyes
					isFemale ? 1 : 0, // gender
					randomInt(0, 10) // accessory/variation
				].join("-");

				newStaff.push({
					saveId,
					teamId: -1,
					name: `${getRandomElement(isFemale ? FIRST_NAMES_F : FIRST_NAMES_M)} ${getRandomElement(LAST_NAMES)}`,
					role,
					skill,
					wage,
					age: randomInt(35, 65),
					specialty: getRandomElement(SPECIALTIES),
					dna: dna,
				} as StaffMember);
			}
			await db.staff.bulkAdd(newStaff);
		}
	},

	async buyPlayer(playerId: number, teamId: number) {
		const player = await db.players.get(playerId);
		const team = await db.teams.get(teamId);

		if (!player || !team) throw new Error("Joueur ou équipe introuvable");
		if (team.budget < player.marketValue) throw new Error("Budget insuffisant");

		await db.transaction("rw", [db.players, db.teams], async () => {
			await db.players.update(playerId, { teamId: teamId });
			await db.teams.update(teamId, { budget: team.budget - player.marketValue });
		});
	},

	async hireStaff(staffId: number, teamId: number) {
		const staff = await db.staff.get(staffId);
		const team = await db.teams.get(teamId);

		if (!staff || !team) throw new Error("Staff ou équipe introuvable");
		
		const hireCost = staff.skill * 2; 
		if (team.budget < hireCost) throw new Error("Budget insuffisant pour la signature");

		const existing = await db.staff.where("[saveId+teamId]").equals([staff.saveId, teamId]).and(s => s.role === staff.role).first();

		await db.transaction("rw", [db.staff, db.teams], async () => {
			if (existing) {
				await db.staff.delete(existing.id!);
			}
			await db.staff.update(staffId, { teamId: teamId });
			await db.teams.update(teamId, { budget: team.budget - hireCost });
		});
	},

	async sellPlayer(playerId: number, teamId: number) {
		const player = await db.players.get(playerId);
		const team = await db.teams.get(teamId);

		if (!player || !team) return;

		const sellValue = Math.round(player.marketValue * this.getSellingPercentage(player.skill));

		await db.transaction("rw", [db.players, db.teams], async () => {
			await db.players.update(playerId, { teamId: -1 });
			await db.teams.update(teamId, { budget: team.budget + sellValue });
		});
	},

	getSellingPercentage(skill: number) {
		if (skill > 80) return 0.9;
		if (skill > 60) return 0.75;
		return 0.6;
	}
};
