import { GridEngine } from "../core/engine/token-engine/grid-engine";
import { TokenPlayer } from "../core/engine/token-engine/token-player";
import { ZONES_CONFIG } from "../core/engine/token-engine/config/zones-config";
import { describe, it, expect } from "vitest";

// Génère des joueurs factices pour chaque équipe
function generatePlayers(homeId: number, awayId: number) {
  const roles = ["GK", "DC", "DL", "DR", "MC", "ST", "ML", "MR"];
  const home = roles.map((role, i) => new TokenPlayer({ id: i + 1, name: `Home${role}`, teamId: homeId, role, stats: {}}));
  const away = roles.map((role, i) => new TokenPlayer({ id: 100 + i + 1, name: `Away${role}`, teamId: awayId, role, stats: {}}));
  return [...home, ...away];
}

describe("Analyse automatique des sacs de jetons par zone", () => {
  it("collecte la répartition des jetons pour chaque zone", () => {
    const homeId = 1;
    const awayId = 2;
    const players = generatePlayers(homeId, awayId);
    const engine = new GridEngine(players);
    const stats: Record<string, Record<string, number>> = {};

    for (let x = 0; x < 6; x++) {
      for (let y = 0; y < 5; y++) {
        const pos = { x, y };
        // Simule possession home puis away
        [homeId, awayId].forEach(teamId => {
          const bag = engine.buildBag(pos, "NORMAL", teamId, homeId, awayId);
          const key = `${x},${y} (team ${teamId})`;
          stats[key] = {};
          for (const t of bag) {
            stats[key][t.type] = (stats[key][t.type] || 0) + 1;
          }
        });
      }
    }
    // Affiche un résumé pour analyse IA
    // eslint-disable-next-line no-console
    console.log("STATS_JETONS_PAR_ZONE", JSON.stringify(stats, null, 2));
    expect(Object.keys(stats).length).toBe(60 * 2 / 2); // 6x5x2 équipes
  });
});
