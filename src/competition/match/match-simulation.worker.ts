// match-simulation.worker.ts
import { db } from "@/core/db/db";
import i18next from "i18next";

// On importe dynamiquement le moteur pour éviter les problèmes de scope
let MatchService: any;

self.onmessage = async (event) => {
  const { saveId, day, userTeamId, date } = event.data;
  try {
    if (!MatchService) {
      MatchService = await import("@/competition/match/match-service");
    }
    // Appel direct à la fonction simulateDayByDay du MatchService
    const result = await MatchService.MatchService.simulateDayByDay(saveId, day, userTeamId, date);
    // On ne renvoie que le strict nécessaire (pas d'objet Dexie)
    self.postMessage({ success: true, result });
  } catch (error) {
    self.postMessage({ success: false, error: (error && typeof error === 'object' && 'message' in error) ? (error as any).message : String(error) });
  }
};
