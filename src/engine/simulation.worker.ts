import i18next from "i18next";
import en from "../locales/en.json";
import fr from "../locales/fr.json";
import { simulateMatch } from "./core/simulator";

// Initialisation i18next pour le worker (Narratives)
i18next.init({
	lng: "fr",
	fallbackLng: "en",
	resources: {
		en: { translation: en },
		fr: { translation: fr },
	},
	returnObjects: true,
	interpolation: {
		escapeValue: false,
	},
});

/**
 * Fonction centrale pour exécuter une simulation avec des valeurs par défaut
 */
async function runSimulation(data: any) {
	return await simulateMatch(
		data.homeRatings,
		data.awayRatings,
		data.homeTeamId,
		data.awayTeamId,
		data.homePlayers,
		data.awayPlayers,
		data.homeName || "Home",
		data.awayName || "Away",
	);
}

self.onmessage = async (e: MessageEvent) => {
	const { type, payload } = e.data;

	// Mise à jour de la langue si nécessaire
	if (payload?.language && i18next.language !== payload.language) {
		await i18next.changeLanguage(payload.language);
	}

	switch (type) {
		case "SIMULATE_BATCH": {
			const { matches, saveId } = payload;
			const results = [];

			for (const matchData of matches) {
				const result = await runSimulation(matchData);
				results.push({
					matchId: matchData.matchId,
					result,
				});
			}

			self.postMessage({ type: "BATCH_COMPLETE", payload: { results, saveId } });
			break;
		}

		case "SIMULATE_MATCH": {
			const result = await runSimulation(payload);
			self.postMessage({
				type: "MATCH_COMPLETE",
				payload: { result, requestId: payload.requestId },
			});
			break;
		}
	}
};
