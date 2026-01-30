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
        // 1. Sauvegarde locale via Web Worker
        try {
            // @ts-ignore
            const worker = new Worker(new URL('./backup.worker.ts', import.meta.url), { type: 'module' });
            worker.postMessage({ saveId });
            worker.onmessage = (event) => {
                if (event.data.success) {
                    console.log(`[BackupWorker] Auto-sauvegarde locale (IndexedDB) effectuée pour le slot ${saveId}`);
                } else {
                    console.error('[BackupWorker] Erreur sauvegarde locale', event.data.error);
                }
                worker.terminate();
            };
            worker.onerror = (err) => {
                console.error('[BackupWorker] Erreur Web Worker', err);
                worker.terminate();
            };
        } catch (e) {
            console.error('[BackupWorker] Impossible de lancer le worker', e);
        }

        // 2. Sauvegarde Cloud (si connecté) — toujours sur le thread principal
        try {
            const json = await exportSaveToJSON(saveId);
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
            console.warn("[Backup] Échec de l'auto-sauvegarde cloud", e);
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
