import { db, CURRENT_DATA_VERSION } from '@/db/db';

/**
 * Gère les migrations de données entre les différentes versions du jeu.
 */
export async function repairSaveData(saveId: number) {
  const state = await db.gameState.get(saveId);
  if (!state) return;

  const oldVersion = state.version || 0;

  if (oldVersion < CURRENT_DATA_VERSION) {
    console.log(`[Migration] Mise à jour de la sauvegarde ${saveId} : v${oldVersion} -> v${CURRENT_DATA_VERSION}`);
    
    if (oldVersion < 1) await migrateToV1(saveId);
    if (oldVersion < 2) await migrateToV2(saveId);
    if (oldVersion < 3) await migrateToV3(saveId);

    await db.gameState.update(saveId, { version: CURRENT_DATA_VERSION });
  }
}

async function migrateToV1(saveId: number) {
    const teams = await db.teams.where('saveId').equals(saveId).toArray();
    for (const team of teams) {
        const updates: any = {};
        if (team.budget === undefined) updates.budget = 500; 
        if (Object.keys(updates).length > 0) await db.teams.update(team.id!, updates);
    }

    const players = await db.players.where('saveId').equals(saveId).toArray();
    for (const player of players) {
        if (!player.dna) {
            const dna = [Math.floor(Math.random() * 4), Math.floor(Math.random() * 6), Math.floor(Math.random() * 5), Math.floor(Math.random() * 4)].join('-');
            await db.players.update(player.id!, { dna });
        }
    }
}

async function migrateToV2(saveId: number) {
    const teams = await db.teams.where('saveId').equals(saveId).toArray();
    for (const team of teams) {
        const updates: any = {
            reputation: team.reputation ?? 50,
            fanCount: team.fanCount ?? 100,
            confidence: team.confidence ?? 70,
            stadiumName: team.stadiumName ?? `${team.name} Ground`,
            stadiumCapacity: team.stadiumCapacity ?? 500,
            stadiumLevel: team.stadiumLevel ?? 1
        };
        await db.teams.update(team.id!, updates);
    }
}

async function migrateToV3(saveId: number) {
    const teams = await db.teams.where('saveId').equals(saveId).toArray();
    for (const team of teams) {
        const updates: any = {
            sponsorName: team.sponsorName ?? "The Old Brewery",
            sponsorIncome: team.sponsorIncome ?? 10
        };
        await db.teams.update(team.id!, updates);
    }
}
