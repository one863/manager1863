import i18next from "i18next";
import en from "@/infrastructure/locales/en.json";
import fr from "@/infrastructure/locales/fr.json";
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
    try {
        if (!data.homeRatings || !data.awayRatings) {
            throw new Error("Missing ratings for simulation");
        }
        return await simulateMatch(
            data.homeRatings,
            data.awayRatings,
            data.homeTeamId,
            data.awayTeamId,
            data.homePlayers || [],
            data.awayPlayers || [],
            data.homeName || "Home",
            data.awayName || "Away",
            data.homeCoach,
            data.awayCoach,
        );
    } catch (err: any) {
        console.error("Worker Simulation Error:", err);
        throw err;
    }
}

self.onmessage = async (e: MessageEvent) => {
	const { type, payload } = e.data;

	if (payload?.language && i18next.language !== payload.language) {
		await i18next.changeLanguage(payload.language);
	}

	try {
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
    } catch (error: any) {
        console.error("Worker Global Error:", error);
        // On pourrait envoyer un message d'erreur au thread principal ici si besoin
    }
};
