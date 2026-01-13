import { simulateMatch } from './simulator';

self.onmessage = async (e: MessageEvent) => {
  const { type, payload } = e.data;

  if (type === 'SIMULATE_BATCH') {
    const { matches, saveId } = payload;
    const results = [];

    for (const matchData of matches) {
      const { homeRatings, awayRatings, homeTeamId, awayTeamId, homePlayers, awayPlayers, matchId } = matchData;
      
      const result = await simulateMatch(
        homeRatings,
        awayRatings,
        homeTeamId,
        awayTeamId,
        homePlayers,
        awayPlayers
      );

      results.push({
        matchId,
        result
      });
    }

    self.postMessage({ type: 'BATCH_COMPLETE', payload: { results, saveId } });
  }
};
