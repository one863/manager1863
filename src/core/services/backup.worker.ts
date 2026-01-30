// backup.worker.ts
import { exportSaveToJSON } from "@/core/db/export-system";
import { db } from "@/core/db/db";

// @ts-ignore
self.onmessage = async (event) => {
  const { saveId } = event.data;
  try {
    // Dexie fonctionne dans les web workers si bien importé
    const json = await exportSaveToJSON(saveId);
    // On stocke le backup dans IndexedDB (Dexie)
    await db.backups.where("saveId").equals(saveId).delete();
    await db.backups.add({ saveId, timestamp: Date.now(), data: json });
    // Réponse succès
    // @ts-ignore
    self.postMessage({ success: true });
  } catch (error) {
    // @ts-ignore
    self.postMessage({ success: false, error: error?.message || error });
  }
};
