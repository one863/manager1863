import { db } from "@/core/db/db";
import { exportSaveToJSON } from "@/core/db/export-system";
import { CloudService } from "@/core/services/cloud-service";

/**
 * Service gérant les sauvegardes de secours.
 * Utilise Dexie (IndexedDB) pour stocker les backups plus volumineux
 * afin d'éviter les QuotaExceededError du LocalStorage.
 */
export const BackupService = {
	async performAutoBackup(saveId: number) {
		if (!saveId) return;
		
		try {
			const json = await exportSaveToJSON(saveId);

			// 1. Sauvegarde Locale persistante avec Dexie
            try {
                // Supprimer les anciens backups pour ce slot pour ne garder que le dernier
                // On peut décider d'en garder plus, mais pour l'instant un seul suffit pour l'auto-backup
                await db.backups.where("saveId").equals(saveId).delete();

                await db.backups.add({
                    saveId: saveId,
                    timestamp: Date.now(),
                    data: json
                });
                
			    console.log(`[Backup] Auto-sauvegarde locale (IndexedDB) effectuée pour le slot ${saveId}`);
                
                // Nettoyage de l'ancien LocalStorage si présent (migration)
                localStorage.removeItem(`fm1863_backup_slot_${saveId}`);

            } catch (storageError) {
                 console.error("[Backup] Erreur lors de la sauvegarde locale Dexie", storageError);
            }

			// 2. Sauvegarde Cloud (si connecté)
			if (CloudService.getCurrentUser()) {
				const gameState = await db.gameState.where("saveId").equals(saveId).first();
				if (gameState && gameState.userTeamId) {
					const team = await db.teams.get(gameState.userTeamId);
					if (team) {
						await CloudService.uploadSave(saveId, json, {
							clubName: team.name,
							season: gameState.season,
							day: gameState.day
						});
					}
				}
			}
		} catch (e) {
			console.warn("[Backup] Échec de l'auto-sauvegarde", e);
		}
	},

    /**
     * Nettoie les anciens backups obsolètes du LocalStorage (migration)
     */
    clearOldLocalStorageBackups() {
        try {
            const keys = Object.keys(localStorage);
            const backupKeys = keys.filter(k => k.startsWith('fm1863_backup_slot_'));
            
            backupKeys.forEach(key => {
                localStorage.removeItem(key);
            });
        } catch (e) {
            // Ignorer
        }
    },

    /**
     * Restaure le dernier backup disponible pour un slot donné
     */
    async restoreBackup(saveId: number): Promise<string | null> {
        // Essayer Dexie d'abord
        const backup = await db.backups.where("saveId").equals(saveId).last();
        if (backup) {
            return backup.data;
        }

        // Fallback LocalStorage (pour compatibilité avec anciennes versions si backup non migré)
        return localStorage.getItem(`fm1863_backup_slot_${saveId}`);
    }
};
