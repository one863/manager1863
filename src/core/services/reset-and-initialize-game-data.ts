import { generateWorld } from "@/core/generators/world-generator";
import { db } from "@/core/db/db";

/**
 * Réinitialise complètement la base et génère un nouveau monde.
 * À utiliser lors de la création d'une nouvelle partie.
 */
export async function resetAndInitializeGameData(saveId: number, userTeamName: string) {
  // Vide toutes les tables principales
  await db.leagues.clear();
  await db.teams.clear();
  await db.players.clear();
  await db.staff.clear();
  await db.matches?.clear?.(); // si table matches existe
  await db.news?.clear?.();    // idem pour news, etc.

  // Génère et insère les nouvelles données
  const { leagues, teams, players, staff } = generateWorld(saveId, userTeamName);
  await db.leagues.bulkAdd(leagues);
  await db.teams.bulkAdd(teams);
  await db.players.bulkAdd(players);
  await db.staff.bulkAdd(staff);
}

// Exemple d'utilisation :
// await resetAndInitializeGameData(1, "Mon Club");
