import { exportSaveToJSON } from '@/db/export-system';
import { CloudService } from '@/services/cloud-service';
import { db } from '@/db/db';

/**
 * Service gérant les sauvegardes de secours.
 */
export const BackupService = {
  async performAutoBackup(saveId: number) {
    try {
      const json = await exportSaveToJSON(saveId);
      
      // 1. Sauvegarde Locale (LocalStorage)
      // Utile en cas de corruption légère de l'IDB
      localStorage.setItem(`fm1863_backup_slot_${saveId}`, json);
      console.log(`[Backup] Auto-sauvegarde locale effectuée pour le slot ${saveId}`);

      // 2. Sauvegarde Cloud (si connecté)
      if (CloudService.getCurrentUser()) {
         const gameState = await db.gameState.get(saveId);
         const team = gameState?.userTeamId ? await db.teams.get(gameState.userTeamId) : null;
         
         if (gameState) {
            await CloudService.uploadSave(saveId, json, {
                clubName: team ? team.name : "Sans Club",
                season: gameState.season,
                day: gameState.day
            });
            console.log(`[Backup] Synchronisation Cloud effectuée pour le slot ${saveId}`);
         }
      }
    } catch (e) {
      console.error("[Backup] Échec de l'auto-sauvegarde", e);
    }
  },
};
