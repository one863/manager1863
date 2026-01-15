import { CURRENT_DATA_VERSION, db } from "@/db/db";
import { randomInt } from "@/utils/math";

/**
 * Gère les migrations de données entre les différentes versions du jeu.
 */
export async function repairSaveData(saveId: number) {
	const state = await db.gameState.get(saveId);
	if (!state) return;

	const oldVersion = state.version || 0;

	if (oldVersion < CURRENT_DATA_VERSION) {
		console.log(
			`[Migration] Mise à jour de la sauvegarde ${saveId} : v${oldVersion} -> v${CURRENT_DATA_VERSION}`,
		);

		if (oldVersion < 1) await migrateToV1(saveId);
		if (oldVersion < 2) await migrateToV2(saveId);
		if (oldVersion < 3) await migrateToV3(saveId);
		if (oldVersion < 20) await migrateToV20(saveId);
		if (oldVersion < 22) await migrateToV22(saveId);

		await db.gameState.update(saveId, { version: CURRENT_DATA_VERSION });
	}
}

async function migrateToV1(saveId: number) {
	const teams = await db.teams.where("saveId").equals(saveId).toArray();
	for (const team of teams) {
		const updates: any = {};
		if (team.budget === undefined) updates.budget = 500;
		if (Object.keys(updates).length > 0)
			await db.teams.update(team.id!, updates);
	}

	const players = await db.players.where("saveId").equals(saveId).toArray();
	for (const player of players) {
		if (!player.dna) {
			const dna = [
				Math.floor(Math.random() * 4),
				Math.floor(Math.random() * 6),
				Math.floor(Math.random() * 5),
				Math.floor(Math.random() * 4),
			].join("-");
			await db.players.update(player.id!, { dna });
		}
	}
}

async function migrateToV2(saveId: number) {
	const teams = await db.teams.where("saveId").equals(saveId).toArray();
	for (const team of teams) {
		const updates: any = {
			reputation: team.reputation ?? 50,
			fanCount: team.fanCount ?? 100,
			confidence: team.confidence ?? 70,
			stadiumName: team.stadiumName ?? `${team.name} Ground`,
			stadiumCapacity: team.stadiumCapacity ?? 500,
			stadiumLevel: team.stadiumLevel ?? 1,
		};
		await db.teams.update(team.id!, updates);
	}
}

async function migrateToV3(saveId: number) {
	const teams = await db.teams.where("saveId").equals(saveId).toArray();
	for (const team of teams) {
		const updates: any = {
			sponsorName: team.sponsorName ?? "The Old Brewery",
			sponsorIncome: team.sponsorIncome ?? 10,
		};
		await db.teams.update(team.id!, updates);
	}
}

async function migrateToV20(saveId: number) {
	// Migration pour ajouter du DNA aux membres du staff qui n'en ont pas (Version 20)
	const staffMembers = await db.staff.where("saveId").equals(saveId).toArray();
	for (const staff of staffMembers) {
		if (!staff.dna) {
			const isFemale = Math.random() < 0.2; // Ratio par défaut pour la migration
			const dna = `${randomInt(0, 3)}-${randomInt(0, 5)}-${randomInt(0, 4)}-${randomInt(0, 5)}-${isFemale ? 1 : 0}`;
			await db.staff.update(staff.id!, { dna });
		}
	}
}

async function migrateToV22(saveId: number) {
	// Migration vers l'échelle 1-10
	const players = await db.players.where("saveId").equals(saveId).toArray();
	for (const player of players) {
		const stats = { ...player.stats };
		for (const key in stats) {
			if (typeof (stats as any)[key] === 'number') {
				(stats as any)[key] = Math.max(1, (stats as any)[key] / 10);
			}
		}
		
		await db.players.update(player.id!, {
			skill: Math.max(1, player.skill / 10),
			stats: stats,
			form: 5,
			experience: Math.max(1, Math.min(10, Math.floor(player.age / 3)))
		});
	}

	const staffMembers = await db.staff.where("saveId").equals(saveId).toArray();
	for (const staff of staffMembers) {
		await db.staff.update(staff.id!, {
			skill: Math.max(1, staff.skill / 10)
		});
	}
}
