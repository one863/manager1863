import i18next from "i18next";
import en from "../../infrastructure/locales/en.json";
import fr from "../../infrastructure/locales/fr.json";
import { simulateMatch } from "./core/simulator";
import { getStaffImpact } from "./converter";

// Initialisation i18next asynchrone
const initI18n = i18next.init({
	lng: "fr",
	fallbackLng: "en",
	resources: { en: { translation: en }, fr: { translation: fr } },
	returnObjects: true,
	interpolation: { escapeValue: false },
});

async function runSimulation(data: any) {
    try {
        await initI18n; // On s'assure qu'i18n est prêt

        // Le nouveau moteur a besoin des joueurs bruts et de l'impact du staff
        const homeStaffImpact = getStaffImpact(data.homeStaff || []);
        const awayStaffImpact = getStaffImpact(data.awayStaff || []);
        
        // Valeurs par défaut pour la cohésion si non fournie (Legacy support)
        const homeCohesion = data.homeCohesion !== undefined ? data.homeCohesion : 50;
        const awayCohesion = data.awayCohesion !== undefined ? data.awayCohesion : 50;

        // Valeurs par défaut pour la mentalité
        const hMentality = data.hMentality !== undefined ? data.hMentality : 3;
        const aMentality = data.aMentality !== undefined ? data.aMentality : 3;

        const homePlayers = data.homePlayers || [];
        const awayPlayers = data.awayPlayers || [];

        // VALIDATION: Vérifier qu'on a bien des titulaires
        const homeStarters = homePlayers.filter((p: any) => p.isStarter);
        const awayStarters = awayPlayers.filter((p: any) => p.isStarter);

        if (homeStarters.length < 7 || awayStarters.length < 7) {
            throw new Error(`Not enough starters! Home: ${homeStarters.length}, Away: ${awayStarters.length}. Total players: ${homePlayers.length}/${awayPlayers.length}`);
        }

        return await simulateMatch(
            homePlayers,
            awayPlayers,
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
            awayCohesion,
            hMentality,
            aMentality,
            true // DEBUG ENABLED FOR LOGS
        );
    } catch (err: any) {
        console.error("Worker Simulation Error:", err);
        throw err;
    }
}

self.onmessage = async (e: MessageEvent) => {
	const { type, payload } = e.data;
    
    try {
        await initI18n;
        if (payload?.language && i18next.language !== payload.language) {
            await i18next.changeLanguage(payload.language);
        }

        switch (type) {
            case "SIMULATE_BATCH": {
                const { matches, saveId } = payload;
                const results = [];
                for (const matchData of matches) {
                    try {
                        const result = await runSimulation(matchData);
                        results.push({ matchId: matchData.matchId, result });
                    } catch (error) {
                        console.error(`Error simulating match ${matchData.matchId}`, error);
                        // On continue pour les autres matchs
                    }
                }
                self.postMessage({ type: "BATCH_COMPLETE", payload: { results, saveId } });
                break;
            }
            case "SIMULATE_MATCH": {
                try {
                    const result = await runSimulation(payload);
                    self.postMessage({ type: "MATCH_COMPLETE", payload: { result, requestId: payload.requestId } });
                } catch (error: any) {
                    console.error("Worker SIMULATE_MATCH error:", error);
                    self.postMessage({ 
                        type: "MATCH_ERROR", 
                        payload: { 
                            requestId: payload.requestId, 
                            error: error.message || "Unknown error during simulation" 
                        } 
                    });
                }
                break;
            }
            default:
                console.warn("Unknown message type in worker:", type);
        }
    } catch (error: any) {
        console.error("Worker Global Error:", error);
        // On essaie d'envoyer un message d'erreur même en cas de crash global
        if (type === "SIMULATE_MATCH" && payload?.requestId) {
            self.postMessage({ 
                type: "MATCH_ERROR", 
                payload: { 
                    requestId: payload.requestId, 
                    error: "Global worker error: " + error.message 
                } 
            });
        }
    }
};
