import { ExportDataSchema } from "@/core/types";
import { db } from "./db";

/**
 * Exporte l'intégralité d'un slot de sauvegarde en format JSON.
 */
export async function exportSaveToJSON(saveId: number): Promise<string> {
	const players = await db.players.where("saveId").equals(saveId).toArray();
	const teams = await db.teams.where("saveId").equals(saveId).toArray();
	const matches = await db.matches.where("saveId").equals(saveId).toArray();
	const leagues = await db.leagues.where("saveId").equals(saveId).toArray();
	const news = await db.news.where("saveId").equals(saveId).toArray();
	const history = await db.history.where("saveId").equals(saveId).toArray();
	
	// FIXED: Search for gameState by saveId properly since it's no longer the primary key
	const gameState = await db.gameState.where("saveId").equals(saveId).first();

	if (!gameState) throw new Error("Sauvegarde introuvable");

	const fullData = {
		gameState,
		teams,
		players,
		matches,
		leagues,
		news,
		history,
	};

	return JSON.stringify(fullData);
}

/**
 * Importe des données JSON dans un slot spécifique de la base de données.
 * Valide les données avec Zod avant l'insertion.
 */
export async function importSaveFromJSON(
	jsonString: string,
	targetSlotId: number,
): Promise<void> {
	const rawData = JSON.parse(jsonString);

	const validatedData = ExportDataSchema.parse(rawData);

	await db.transaction(
		"rw",
		[
			db.players,
			db.teams,
			db.matches,
			db.leagues,
			db.saveSlots,
			db.gameState,
			db.news,
			db.history,
            db.backups, // Ajout pour supprimer les backups associés à l'ancien slot si nécessaire
		],
		async () => {
			// 2. Nettoyage du slot cible
			await Promise.all([
				db.gameState.where("saveId").equals(targetSlotId).delete(),
				db.players.where("saveId").equals(targetSlotId).delete(),
				db.teams.where("saveId").equals(targetSlotId).delete(),
				db.matches.where("saveId").equals(targetSlotId).delete(),
				db.leagues.where("saveId").equals(targetSlotId).delete(),
				db.news.where("saveId").equals(targetSlotId).delete(),
				db.history.where("saveId").equals(targetSlotId).delete(),
                // On nettoie aussi les backups automatiques liés à ce slot pour éviter des incohérences
                db.backups.where("saveId").equals(targetSlotId).delete(),
			]);

			// 3. Ré-insertion des données validées
			await db.gameState.add({
				...validatedData.gameState,
				saveId: targetSlotId,
			});

			// On met à jour aussi le slot de sauvegarde global (SaveSlot) pour l'écran de chargement
			const userTeam = validatedData.teams.find(
				(t) => t.id === validatedData.gameState.userTeamId,
			);
			await db.saveSlots.put({
				id: targetSlotId,
				name: userTeam ? userTeam.name : "Sans Club",
				season: validatedData.gameState.season,
				day: validatedData.gameState.day,
				lastPlayedDate: new Date(),
			});

			// Insertion par paquets
			if (validatedData.teams.length > 0)
				await db.teams.bulkAdd(
					validatedData.teams.map((t) => ({
						...t,
						id: undefined,
						saveId: targetSlotId,
					})),
				);

			if (validatedData.players.length > 0)
				await db.players.bulkAdd(
					validatedData.players.map((p) => ({
						...p,
						id: undefined,
						saveId: targetSlotId,
					})),
				);

			if (validatedData.matches.length > 0)
				await db.matches.bulkAdd(
					validatedData.matches.map((m) => ({
						...m,
						id: undefined,
						saveId: targetSlotId,
					})),
				);

			if (validatedData.leagues.length > 0)
				await db.leagues.bulkAdd(
					validatedData.leagues.map((l) => ({
						...l,
						id: undefined,
						saveId: targetSlotId,
					})),
				);

			if (validatedData.news.length > 0)
				await db.news.bulkAdd(
					validatedData.news.map((n) => ({
						...n,
						id: undefined,
						saveId: targetSlotId,
					})),
				);

			if (validatedData.history.length > 0)
				await db.history.bulkAdd(
					validatedData.history.map((h) => ({
						...h,
						id: undefined,
						saveId: targetSlotId,
					})),
				);
		},
	);
}
