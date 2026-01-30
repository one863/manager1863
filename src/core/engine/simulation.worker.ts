// simulation.worker.ts
// Ancien worker pour la simulation de match (mode batch ou unitaire)

import { TokenMatchEngine } from "./token-engine/match-engine";

self.onmessage = async (event) => {
  const { type, payload } = event.data;

  if (type === "SIMULATE_MATCH") {
    try {
      const { matchId, homeTeamId, awayTeamId, homePlayers, awayPlayers, homeName, awayName, language, requestId } = payload;
      // Instanciation du moteur de match
      const engine = new TokenMatchEngine(homePlayers, awayPlayers, homeTeamId, awayTeamId);
      const result = engine.simulateMatch();
      self.postMessage({ type: "MATCH_COMPLETE", payload: { result, matchId, requestId } });
    } catch (error) {
      self.postMessage({ type: "MATCH_ERROR", payload: { error: error instanceof Error ? error.message : String(error), requestId: payload.requestId } });
    }
  }

  if (type === "SIMULATE_BATCH") {
    try {
      const { matches, saveId, language } = payload;
      const results = [];
      for (const match of matches) {
        const engine = new TokenMatchEngine(match.homePlayers, match.awayPlayers, match.homeTeamId, match.awayTeamId);
        const result = engine.simulateMatch();
        results.push({ matchId: match.matchId, result });
      }
      self.postMessage({ type: "BATCH_COMPLETE", payload: { results, saveId } });
    } catch (error) {
      self.postMessage({ type: "BATCH_ERROR", payload: { error: error instanceof Error ? error.message : String(error), saveId: payload.saveId } });
    }
  }
};
