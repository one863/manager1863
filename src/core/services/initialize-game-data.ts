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
  await db.leagues.bulkAdd(leagues);
  await db.teams.bulkAdd(teams);
  await db.players.bulkAdd(players);
  await db.staff.bulkAdd(staff);
}

// Exemple d'utilisation dans un composant React :
// useEffect(() => { initializeGameData(1, "Mon Club"); }, []);
