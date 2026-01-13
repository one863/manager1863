import { exportSaveToJSON } from '@/db/export-system';

/**
 * Service gérant les sauvegardes de secours.
 */
export const BackupService = {
  
  async performAutoBackup(saveId: number) {
    try {
        const json = await exportSaveToJSON(saveId);
        localStorage.setItem(`fm1863_backup_slot_${saveId}`, json);
        console.log(`[Backup] Auto-sauvegarde effectuée pour le slot ${saveId}`);
    } catch (e) {
        console.error("[Backup] Échec de l'auto-sauvegarde", e);
    }
  }
};
