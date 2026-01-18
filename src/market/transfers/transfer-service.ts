import { db } from "@/core/db/db";
import { NewsService } from "@/news/service/news-service";

export const TransferService = {
	getSellingPercentage(skill: number) {
		if (skill > 80) return 0.85;
		if (skill > 60) return 0.75;
		return 0.65;
	},

	async generateMarketPlayers(saveId: number, count: number = 30) {
		// Logique pour trouver des joueurs qui ne sont pas dans l'équipe de l'utilisateur
		// Pour simplifier ici, on prend des joueurs de la sauvegarde
		const players = await db.players
			.where("saveId")
			.equals(saveId)
			.limit(count)
			.toArray();
		return players;
	},

	async generateMarketStaff(saveId: number, count: number = 15) {
		const staff = await db.staff
			.where("saveId")
			.equals(saveId)
			.limit(count)
			.toArray();
		return staff;
	},

	async buyPlayer(playerId: number, teamId: number, price: number) {
		const player = await db.players.get(playerId);
		const team = await db.teams.get(teamId);

		if (!player || !team) return { success: false, error: "Not found" };
		if (team.budget < price) return { success: false, error: "Insufficient funds" };

		const oldTeamId = player.teamId;

		await db.transaction("rw", db.players, db.teams, async () => {
			await db.players.update(playerId, { 
				teamId, 
				status: "CONTRACTED",
				morale: 100 
			});
			await db.teams.update(teamId, { budget: team.budget - price });
			
			if (oldTeamId) {
				const oldTeam = await db.teams.get(oldTeamId);
				if (oldTeam) {
					await db.teams.update(oldTeamId, { budget: oldTeam.budget + price });
				}
			}
		});

		await NewsService.createNews(
			team.saveId,
			"TRANSFER",
			`Signature de ${player.firstName} ${player.lastName} à ${team.name} pour ${price.toLocaleString()}€ !`,
			teamId
		);

		return { success: true };
	},

	async hireStaff(staffId: number, teamId: number) {
		const staff = await db.staff.get(staffId);
		const team = await db.teams.get(teamId);

		if (!staff || !team) return { success: false, error: "Not found" };
		
		// Un membre de staff ne coûte rien à l'embauche (pour l'instant), juste le salaire hebdomadaire
		await db.staff.update(staffId, { teamId });

		await NewsService.createNews(
			team.saveId,
			"STAFF",
			`${staff.firstName} ${staff.lastName} rejoint le staff de ${team.name} en tant que ${staff.role}.`,
			teamId
		);

		return { success: true };
	},

    async fireStaff(staffId: number, teamId: number) {
        const staff = await db.staff.get(staffId);
        const team = await db.teams.get(teamId);

        if (!staff || !team) return { success: false, error: "Not found" };

        const severancePay = Math.round(staff.wage * 4); // 4 semaines de salaire en indemnité

        if (team.budget < severancePay) {
            return { success: false, error: "Budget insuffisant pour payer les indemnités." };
        }

        await db.transaction("rw", db.staff, db.teams, async () => {
            await db.staff.update(staffId, { teamId: undefined });
            await db.teams.update(teamId, { budget: team.budget - severancePay });
        });

        await NewsService.createNews(
            team.saveId,
            "STAFF",
            `${staff.firstName} ${staff.lastName} a été licencié de son poste de ${staff.role} à ${team.name}.`,
            teamId
        );

        return { success: true };
    },

	async sellPlayer(playerId: number, teamId: number) {
		const player = await db.players.get(playerId);
		const team = await db.teams.get(teamId);

		if (!player || !team) throw new Error("Not found");
		
		const sellPercentage = this.getSellingPercentage(player.skill);
		const sellValue = Math.round(player.marketValue * sellPercentage);

		await db.transaction("rw", db.players, db.teams, async () => {
			await db.players.update(playerId, { 
				teamId: 0, // Free agent
				status: "FREE",
				isStarter: false
			});
			await db.teams.update(teamId, { budget: team.budget + sellValue });
		});

		await NewsService.createNews(
			team.saveId,
			"TRANSFER",
			`${player.firstName} ${player.lastName} quitte ${team.name} !`,
			teamId
		);

		return { success: true };
	}
};
