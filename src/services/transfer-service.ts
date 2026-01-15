import { type Player, type Team, type StaffMember, type StaffStats, db } from "@/db/db";
import { randomInt, getRandomElement } from "@/utils/math";
import { generatePlayer } from "@/data/players-generator";

const FIRST_NAMES_M = ["William", "John", "Thomas", "George", "Charles", "Henry", "Joseph", "Robert", "James", "Edward"];
const FIRST_NAMES_F = ["Elizabeth", "Mary", "Victoria", "Alice", "Florence", "Sarah", "Grace", "Emma", "Catherine", "Martha"];
const LAST_NAMES = ["Smith", "Jones", "Brown", "Taylor", "Williams", "Wilson", "Johnson", "Davies", "Robinson", "Wright"];

function generateStaffStats(role: StaffMember["role"], baseSkill: number): StaffStats {
	// Écart réduit pour coller plus à la réputation
	const getAttr = (base: number) => Math.max(1, Math.min(10.9, base + (Math.random() - 0.5) * 2));
	
	const stats: StaffStats = {
		management: getAttr(baseSkill),
		training: getAttr(baseSkill),
		tactical: getAttr(baseSkill),
		physical: getAttr(baseSkill),
		goalkeeping: getAttr(baseSkill),
	};

	if (role === "PHYSICAL_TRAINER") stats.physical = getAttr(baseSkill + 1.5);
	if (role === "SCOUT") stats.management = getAttr(baseSkill + 1.5);
	if (role === "COACH") {
		stats.training = getAttr(baseSkill + 1);
		stats.tactical = getAttr(baseSkill + 1);
	}

	return stats;
}

export const TransferService = {
	async refreshMarketForReputation(saveId: number, reputation: number) {
		// JOUEURS
		const playerCount = await db.players.where("[saveId+teamId]").equals([saveId, -1]).count();
		if (playerCount < 20) {
			const newPlayers: Player[] = [];
			for (let i = 0; i < 30; i++) {
				// targetSkill basé sur réputation (30 rep = skill 3.0)
				// On limite l'aléatoire à +/- 1.2 pour éviter les anomalies de niveau
				const targetSkill = Math.max(1, Math.min(10.5, (reputation / 10) + (Math.random() - 0.5) * 2.4));
				const player = generatePlayer(targetSkill);
				newPlayers.push({ ...player, saveId, teamId: -1 } as Player);
			}
			await db.players.bulkAdd(newPlayers);
		}

		// STAFF
		const staffCount = await db.staff.where("[saveId+teamId]").equals([saveId, -1]).count();
		if (staffCount < 10) {
			const newStaff: StaffMember[] = [];
			const roles: StaffMember["role"][] = ["COACH", "SCOUT", "PHYSICAL_TRAINER"];

			for (let i = 0; i < 15; i++) {
				const role = getRandomElement(roles);
				// Un club avec 30 de rep ne trouvera pas de staff > 5
				const baseSkill = Math.max(1, Math.min(10.5, (reputation / 10) + (Math.random() - 0.5) * 2));
				const stats = generateStaffStats(role, baseSkill);
				
				const skill = (stats.management + stats.training + stats.tactical + stats.physical + stats.goalkeeping) / 5;
				const wage = Math.round(Math.pow(skill, 1.5) + 5); 
				const age = randomInt(30, 70);
				const isFemale = Math.random() < 0.3;
				const dna = `0-0-0-0-${isFemale ? 1 : 0}`;

				newStaff.push({
					saveId,
					teamId: -1,
					name: `${getRandomElement(isFemale ? FIRST_NAMES_F : FIRST_NAMES_M)} ${getRandomElement(LAST_NAMES)}`,
					role,
					skill,
					stats,
					wage,
					age,
					dna
				} as StaffMember);
			}
			await db.staff.bulkAdd(newStaff);
		}
	},

	async buyPlayer(playerId: number, teamId: number) {
		const player = await db.players.get(playerId);
		const team = await db.teams.get(teamId);
		if (!player || !team) return;
		await db.transaction("rw", [db.players, db.teams], async () => {
			await db.players.update(playerId, { teamId: teamId });
			await db.teams.update(teamId, { budget: team.budget - player.marketValue });
		});
	},

	async hireStaff(staffId: number, teamId: number) {
		const staff = await db.staff.get(staffId);
		const team = await db.teams.get(teamId);
		if (!staff || !team) return;
		const cost = Math.round(staff.skill * 15);
		await db.transaction("rw", [db.staff, db.teams], async () => {
			await db.staff.update(staffId, { teamId: teamId });
			await db.teams.update(teamId, { budget: team.budget - cost });
		});
	},

	async sellPlayer(playerId: number, teamId: number) {
		const player = await db.players.get(playerId);
		const team = await db.teams.get(teamId);
		if (!player || !team) return;
		const sellValue = Math.round(player.marketValue * 0.7);
		await db.transaction("rw", [db.players, db.teams], async () => {
			await db.players.update(playerId, { teamId: -1 });
			await db.teams.update(teamId, { budget: team.budget + sellValue });
		});
	},

	getSellingPercentage(skill: number) {
		return 0.7;
	}
};
