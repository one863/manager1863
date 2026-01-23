import i18next from "i18next";
import en from "../../infrastructure/locales/en.json";
import fr from "../../infrastructure/locales/fr.json";

// NEW TOKEN ENGINE IMPORTS
import { TokenMatchEngine } from "./token-engine/match-engine";
import { convertToTokenPlayers } from "./token-engine/converter";

// Initialisation i18next
const initI18n = i18next.init({
	lng: "fr",
	fallbackLng: "en",
	resources: { en: { translation: en }, fr: { translation: fr } },
	returnObjects: true,
	interpolation: { escapeValue: false },
});

async function runSimulation(data: any) {
    try {
        await initI18n;

        const homeTeamId = data.homeTeamId || 1;
        const awayTeamId = data.awayTeamId || 2;
        const homeName = data.homeName || "Home";
        const awayName = data.awayName || "Away";

        const allTokenPlayers = convertToTokenPlayers(
            data.homePlayers || [],
            data.awayPlayers || [],
            homeTeamId,
            awayTeamId
        );

        const engine = new TokenMatchEngine(allTokenPlayers, homeTeamId, awayTeamId);

        // Simulation qui renvoie events et ballHistory
        const engineResult = engine.simulateMatch();
        const rawEvents = engineResult.events;

        // Adaptation du résultat pour l'UI
        let homeScore = 0;
        let awayScore = 0;
        const goalEvents: any[] = [];

        const formattedEvents = rawEvents.map((evt: any) => {
            const isHome = evt.teamId === homeTeamId;
            let type = "highlight";
            
            if (evt.text.includes("BUT !")) {
                type = "GOAL";
                if (isHome) homeScore++; else awayScore++;
                goalEvents.push({
                    minute: Math.floor(evt.time / 60),
                    scorer: `Joueur ${evt.text.split(" ")[1]}`, 
                    teamId: evt.teamId
                });
            } else if (evt.text.includes("TIR")) {
                type = "SHOT";
            } else if (evt.text.includes("récupère")) {
                type = "TRANSITION"; 
            } else if (evt.text.includes("surface") || evt.text.includes("Occasion")) {
                type = "CHANCE";
            } else if (evt.type === "CORNER") {
                type = "CORNER";
            } else if (evt.type === "CARD") {
                type = "CARD";
            }

            return {
                id: crypto.randomUUID(),
                matchId: data.matchId,
                minute: Math.floor(evt.time / 60),
                second: evt.time % 60,
                type: type,
                description: evt.text,
                text: evt.text,
                teamId: evt.teamId,
                isHome: isHome,
                xg: type === "SHOT" || type === "GOAL" ? 0.12 : 0 
            };
        });

        const result = {
            matchId: data.matchId,
            homeTeamId: homeTeamId,
            awayTeamId: awayTeamId,
            homeName: homeName,
            awayName: awayName,
            homeScore: homeScore,
            awayScore: awayScore,
            events: formattedEvents,
            ballHistory: engineResult.ballHistory, // Vrai Momentum
            stoppageTime: 4,
            playerStats: {}, 
            possessionHistory: [], 
            stats: {
                homePasses: formattedEvents.filter((e:any) => e.description.includes("passe") && e.isHome).length,
                awayPasses: formattedEvents.filter((e:any) => e.description.includes("passe") && !e.isHome).length,
                homeShotsOnTarget: formattedEvents.filter((e:any) => (e.type === "GOAL" || e.description.includes("CADRÉ")) && e.isHome).length,
                awayShotsOnTarget: formattedEvents.filter((e:any) => (e.type === "GOAL" || e.description.includes("CADRÉ")) && !e.isHome).length,
            },
            scorers: goalEvents
        };

        return result;

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
