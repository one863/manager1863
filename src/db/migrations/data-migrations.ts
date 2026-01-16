import { db, CURRENT_DATA_VERSION } from "../db";
import { generatePlayer } from "@/data/players-generator";

export async function repairSaveData(saveId: number) {
	const state = await db.gameState.get(saveId);
	if (!state) return;

	// Si la version est déjà à jour, on ne fait rien
	if (state.version === CURRENT_DATA_VERSION) return;

	console.log(`[Migration] Mise à jour de la sauvegarde ${saveId} vers la version ${CURRENT_DATA_VERSION}`);

	await db.transaction("rw", [db.players, db.gameState, db.teams, db.staff], async () => {
		// 1. Mise à jour massive des joueurs vers le nouveau schéma sur 20
		const players = await db.players.where("saveId").equals(saveId).toArray();
		for (const p of players) {
			// Si le joueur a l'ancien schéma (stamina, playmaking...), on le régénère proprement
			if ("stamina" in p.stats) {
				const newStats = generatePlayer(p.skill > 11 ? p.skill : p.skill * 1.8, p.position).stats;
				await db.players.update(p.id!, {
					stats: newStats,
					skill: Math.max(p.skill, 8), // Mise à niveau minimum
					traits: p.traits || []
				});
			}
		}

		// 2. Mise à jour du staff
		const staff = await db.staff.where("saveId").equals(saveId).toArray();
		for (const s of staff) {
			if (s.skill < 11) {
				await db.staff.update(s.id!, {
					skill: s.skill * 1.8,
					stats: {
						management: s.stats.management * 1.8,
						training: s.stats.training * 1.8,
						tactical: s.stats.tactical * 1.8,
						physical: s.stats.physical * 1.8,
						goalkeeping: s.stats.goalkeeping * 1.8,
						strategy: s.stats.strategy * 1.8
					}
				});
			}
		}

		// 3. Validation de la version
		await db.gameState.update(saveId, { version: CURRENT_DATA_VERSION });
	});
}
