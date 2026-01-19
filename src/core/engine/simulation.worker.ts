import i18next from "i18next";
import en from "@/infrastructure/locales/en.json";
import fr from "@/infrastructure/locales/fr.json";
import { simulateMatch } from "./core/simulator";
import { getStaffImpact } from "./converter";

// Initialisation i18next
i18next.init({
	lng: "fr",
	fallbackLng: "en",
	resources: { en: { translation: en }, fr: { translation: fr } },
	returnObjects: true,
	interpolation: { escapeValue: false },
});

async function runSimulation(data: any) {
    try {
        // Le nouveau moteur a besoin des joueurs bruts et de l'impact du staff
        const homeStaffImpact = getStaffImpact(data.homeStaff || []);
        const awayStaffImpact = getStaffImpact(data.awayStaff || []);
        
        // Valeurs par défaut pour la cohésion si non fournie (Legacy support)
        const homeCohesion = data.homeCohesion !== undefined ? data.homeCohesion : 50;
        const awayCohesion = data.awayCohesion !== undefined ? data.awayCohesion : 50;

        return await simulateMatch(
            data.homePlayers || [],
            data.awayPlayers || [],
            data.homeName || "Home",
            data.awayName || "Away",
            data.homeTeamId || 1,
            data.awayTeamId || 2,
            homeStaffImpact,
            awayStaffImpact,
            data.hIntensity || 3,
            data.aIntensity || 3,
            data.hTactic || "NORMAL",
            data.aTactic || "NORMAL",
            homeCohesion,
            awayCohesion
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
                    results.push({ matchId: matchData.matchId, result });
                }
                self.postMessage({ type: "BATCH_COMPLETE", payload: { results, saveId } });
                break;
            }
            case "SIMULATE_MATCH": {
                const result = await runSimulation(payload);
                self.postMessage({ type: "MATCH_COMPLETE", payload: { result, requestId: payload.requestId } });
                break;
            }
        }
    } catch (error: any) {
        console.error("Worker Global Error:", error);
    }
};
