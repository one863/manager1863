// match-simulation.worker.ts
import { db } from "@/core/db/db";
import i18next from "i18next";

// Polyfill for crypto.randomUUID which might be missing in non-secure contexts
if (!self.crypto.randomUUID) {
    (self.crypto as any).randomUUID = () => {
        return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c: any) =>
            (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
        ) as `${string}-${string}-${string}-${string}-${string}`;
    };
}

// On importe dynamiquement le moteur pour éviter les problèmes de scope
let MatchService: any;
let MatchEngine: any;

self.onmessage = async (event) => {
  const data = event.data;

  // 1. CAS BATCH : Simulation de masse (IA vs IA)
  if (data.type === "SIMULATE_BATCH") {
    const { matches, saveId, language } = data.payload;
    try {
        if (!MatchEngine) {
            MatchEngine = await import("@/core/engine/token-engine/match-engine");
        }
        
        const results = [];
        for (const match of matches) {
            const engine = new MatchEngine.TokenMatchEngine(
                match.homePlayers,
                match.awayPlayers,
                match.homeTeamId,
                match.awayTeamId
            );
            const result = engine.simulateMatch();
            results.push({ matchId: match.matchId, result });
        }
        
        self.postMessage({ type: "BATCH_COMPLETE", payload: { saveId, results } });
    } catch (error) {
        console.error("Batch simulation error", error);
        self.postMessage({ type: "BATCH_ERROR", error: String(error) });
    }
    return;
  }

  // 2. CAS MATCH UNIQUE : Simulation détaillée (User / Live)
  // On identifie ce cas par la présence de matchId et l'absence de type
  if (data.matchId && !data.type) {
      try {
        if (!MatchEngine) {
            MatchEngine = await import("@/core/engine/token-engine/match-engine");
        }
        const engine = new MatchEngine.TokenMatchEngine(
            data.homePlayers,
            data.awayPlayers,
            data.homeTeamId,
            data.awayTeamId
        );
        const result = engine.simulateMatch();
        self.postMessage({ success: true, result });
      } catch (error) {
        self.postMessage({ success: false, error: (error && typeof error === 'object' && 'message' in error) ? (error as any).message : String(error) });
      }
      return;
  }

  // 3. CAS ORCHESTRATION : Simulation de la journée (simulateDayByDay)
  // On identifie ce cas par la présence de saveId, day et userTeamId
  if (data.saveId && data.day && data.userTeamId) {
      const { saveId, day, userTeamId, date } = data;
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
      return;
  }
};
