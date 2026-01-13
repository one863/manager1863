import { simulateMatch } from './simulator';
import i18next from 'i18next';
import en from '../locales/en.json';
import fr from '../locales/fr.json';

// Initialisation i18next pour le worker (Narratives)
i18next.init({
  lng: 'fr', // Sera écrasé par le payload
  fallbackLng: 'en',
  resources: {
    en: { translation: en },
    fr: { translation: fr }
  },
  returnObjects: true,
  interpolation: {
    escapeValue: false
  }
});

self.onmessage = async (e: MessageEvent) => {
  const { type, payload } = e.data;

  // Mise à jour de la langue si nécessaire
  if (payload?.language && i18next.language !== payload.language) {
    await i18next.changeLanguage(payload.language);
  }

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

  if (type === 'SIMULATE_MATCH') {
    const { homeRatings, awayRatings, homeTeamId, awayTeamId, homePlayers, awayPlayers, requestId } = payload;

    const result = await simulateMatch(
      homeRatings,
      awayRatings,
      homeTeamId,
      awayTeamId,
      homePlayers,
      awayPlayers
    );

    self.postMessage({ type: 'MATCH_COMPLETE', payload: { result, requestId } });
  }
};
