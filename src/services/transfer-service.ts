import { type Player, type Team, type StaffMember, db } from "@/db/db";
import { randomInt, getRandomElement } from "@/utils/math";

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
				const skill = Math.max(10, Math.min(99, reputation + randomInt(-15, 15)));
				const marketValue = Math.round(skill * skill * 0.1);
				
				newPlayers.push({
					saveId,
					teamId: -1,
					firstName: getRandomElement(FIRST_NAMES_M),
					lastName: getRandomElement(LAST_NAMES),
					age: randomInt(17, 34),
					position: getRandomElement(["GK", "DEF", "MID", "FWD"]) as any,
					skill,
					marketValue,
					condition: 100,
					energy: 100,
					dna: `${randomInt(0, 3)}-${randomInt(0, 5)}-${randomInt(0, 4)}-${randomInt(0, 5)}-0`,
					stats: {
						stamina: randomInt(30, 90),
						playmaking: randomInt(30, 90),
						defense: randomInt(30, 90),
						speed: randomInt(30, 90),
						head: randomInt(30, 90),
						technique: randomInt(30, 90),
						scoring: randomInt(30, 90),
						setPieces: randomInt(30, 90),
					},
					isStarter: false,
					version: 1,
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
				const isFemale = Math.random() < 0.5; // 50% de femmes dans le staff

				newStaff.push({
					saveId,
					teamId: -1,
					name: `${getRandomElement(isFemale ? FIRST_NAMES_F : FIRST_NAMES_M)} ${getRandomElement(LAST_NAMES)}`,
					role,
					skill,
					wage,
					age: randomInt(35, 65),
					specialty: getRandomElement(SPECIALTIES),
					dna: `${randomInt(0, 3)}-${randomInt(0, 5)}-${randomInt(0, 4)}-${randomInt(0, 5)}-${isFemale ? 1 : 0}`,
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
		
		const hireCost = staff.skill * 2; // Coût de signature proportionnel au skill
		if (team.budget < hireCost) throw new Error("Budget insuffisant pour la signature");

		// Vérifier si un membre du même rôle existe déjà
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
