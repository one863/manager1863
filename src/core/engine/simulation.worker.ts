import i18next from "i18next";
import en from "../../infrastructure/locales/en.json";
import fr from "../../infrastructure/locales/fr.json";

// NEW TOKEN ENGINE IMPORTS
import { TokenMatchEngine } from "./token-engine/match-engine";

// Initialisation i18next
const initI18n = i18next.init({
	lng: "fr",
	fallbackLng: "en",
	resources: { en: { translation: en }, fr: { translation: fr } },
	returnObjects: true,
	interpolation: { escapeValue: false },
});

// Polyfill pour randomUUID si manquant dans le worker
const generateId = () => {
    try {
        return crypto.randomUUID();
    } catch (e) {
        return Math.random().toString(36).substring(2) + Date.now().toString(36);
    }
};

async function runSimulation(data: any) {
    try {
        await initI18n;


        const homeTeamId = data.homeTeamId || 1;
        const awayTeamId = data.awayTeamId || 2;
        const homeName = data.homeName || "Home";
        const awayName = data.awayName || "Away";

        // Le moteur simplifié ne prend que les IDs
        const engine = new TokenMatchEngine(homeTeamId, awayTeamId);
        const engineResult = engine.simulateMatch();
        const rawEvents = engineResult.events;

        const goalEvents: any[] = [];

        const formattedEvents = rawEvents.map((evt: any) => {
            const isHome = evt.teamId === homeTeamId;
            let type = "highlight";
            
            if (evt.eventSubtype === "GOAL") {
                type = "GOAL";
                goalEvents.push({
                    minute: Math.floor(evt.time / 60),
                    teamId: evt.teamId,
                    scorerName: evt.playerName || 'Joueur'
                });
            } else if (evt.eventSubtype === "SHOT") {
                type = "SHOT";
            } else if (evt.eventSubtype === "FOUL") {
                type = "CARD";
            } else if (evt.eventSubtype === "CORNER") {
                type = "CORNER";
            }

            return {
                id: generateId(),
                matchId: data.matchId,
                minute: Math.floor(evt.time / 60),
                second: evt.time % 60,
                type: type,
                description: evt.text,
                text: evt.text,
                teamId: evt.teamId,
                isHome: isHome,
                scorerName: type === "GOAL" ? (evt.playerName || 'Joueur') : undefined
            };
        });


        return {
            matchId: data.matchId,
            homeTeamId: homeTeamId,
            awayTeamId: awayTeamId,
            homeName: homeName,
            awayName: awayName,
            homeScore: engineResult.homeScore,
            awayScore: engineResult.awayScore,
            events: formattedEvents,
            debugLogs: engineResult.events,
            ballHistory: [],
            stats: { shots: {}, xg: {} },
            scorers: goalEvents,
            ratings: [],
            stoppageTime: 4
        };

    } catch (err: any) {
        console.error("Worker Simulation Error:", err);
        throw err;
    }
}

self.onmessage = async (e: MessageEvent) => {
	const { type, payload } = e.data;
    try {
        await initI18n;
        if (payload?.language && i18next.language !== payload.language) await i18next.changeLanguage(payload.language);

        switch (type) {
            case "SIMULATE_BATCH": {
                const results = [];
                for (const matchData of payload.matches) {
                    try {
                        const result = await runSimulation(matchData);
                        results.push({ matchId: matchData.matchId, result });
                    } catch (e) {
                        console.error("Batch simulation individual error", e);
                    }
                }
                self.postMessage({ type: "BATCH_COMPLETE", payload: { results, saveId: payload.saveId } });
                break;
            }
            case "SIMULATE_MATCH": {
                try {
                    const result = await runSimulation(payload);
                    self.postMessage({ type: "MATCH_COMPLETE", payload: { result, requestId: payload.requestId } });
                } catch (simError: any) {
                    self.postMessage({ 
                        type: "MATCH_ERROR", 
                        payload: { 
                            error: simError.message || "Simulation failed", 
                            requestId: payload.requestId 
                        } 
                    });
                }
                break;
            }
        }
    } catch (error: any) {
        console.error("Worker Global Error:", error);
        if (type === "SIMULATE_MATCH" && payload?.requestId) {
            self.postMessage({ 
                type: "MATCH_ERROR", 
                payload: { 
                    error: "Critical worker error", 
                    requestId: payload.requestId 
                } 
            });
        }
    }
};
