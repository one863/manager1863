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
  
  if (leagues && leagues.length > 0) await db.leagues.bulkAdd(leagues);
  if (teams && teams.length > 0) await db.teams.bulkAdd(teams);
  if (players && players.length > 0) await db.players.bulkAdd(players);
  if (staff && staff.length > 0) await db.staff.bulkAdd(staff);
}

// Exemple d'utilisation :
// await resetAndInitializeGameData(1, "Mon Club");
