import { generateWorld } from "@/core/generators/world-generator";
import { db } from "@/core/db/db";

/**
 * Initialise la base de données avec un monde complet si elle est vide.
 * À appeler au démarrage de l'application (ex : dans un useEffect global).
 */
export async function initializeGameData(saveId: number, userTeamName: string) {
  const leaguesCount = await db.leagues.count();
  if (leaguesCount > 0) return; // Données déjà présentes

  const { leagues, teams, players, staff } = generateWorld(saveId, userTeamName);
  
  if (leagues && leagues.length > 0) await db.leagues.bulkAdd(leagues);
  if (teams && teams.length > 0) await db.teams.bulkAdd(teams);
  if (players && players.length > 0) await db.players.bulkAdd(players);
  if (staff && staff.length > 0) await db.staff.bulkAdd(staff);
}

// Exemple d'utilisation dans un composant React :
// useEffect(() => { initializeGameData(1, "Mon Club"); }, []);
