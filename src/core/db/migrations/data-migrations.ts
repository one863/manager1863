import { db, CURRENT_DATA_VERSION } from "../db";
import { generatePlayer } from "@/core/generators/players-generator";

export async function repairSaveData(saveId: number) {
	const state = await db.gameState.where("saveId").equals(saveId).first();
	if (!state) return;

	// Si la version est déjà à jour, on ne fait rien
	if ((state as any).version === CURRENT_DATA_VERSION) return;

	console.log(`[Migration] Mise à jour de la sauvegarde ${saveId} vers la version ${CURRENT_DATA_VERSION}`);

	await db.transaction("rw", [db.players, db.gameState, db.teams, db.staff], async () => {
		// 1. Mise à jour massive des joueurs vers le nouveau schéma sur 20
		const players = await db.players.where("saveId").equals(saveId).toArray();
		for (const p of players) {
			// Si le joueur a l'ancien schéma (stamina, playmaking...), on le régénère proprement
			if ("stamina" in (p.stats as any)) {
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
						management: (s.stats as any).management * 1.8 || 10,
						training: (s.stats as any).training * 1.8 || 10,
						tactical: (s.stats as any).tactical * 1.8 || 10,
						physical: (s.stats.physical || 10) * 1.8,
						goalkeeping: (s.stats.goalkeeping || 5) * 1.8,
						coaching: ((s.stats as any).strategy || 10) * 1.8,
						medical: ((s.stats as any).medical || 10) * 1.8,
						discipline: ((s.stats as any).discipline || 10) * 1.8,
						conditioning: ((s.stats as any).conditioning || 10) * 1.8,
						recovery: ((s.stats as any).recovery || 10) * 1.8,
						reading: ((s.stats as any).reading || 10) * 1.8
					} as any
				});
			}
		}

		// 3. Validation de la version
		if (state.id !== undefined) {
			await db.gameState.update(state.id, { version: CURRENT_DATA_VERSION } as any);
		}
	});
}
