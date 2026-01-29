import { TokenMatchEngine } from "./token-engine/match-engine";

/**
 * Générateur d'ID unique pour les événements du match
 */
const generateId = () => {
    try {
        return crypto.randomUUID();
    } catch (e) {
        return Math.random().toString(36).substring(2) + Date.now().toString(36);
    }
};

/**
 * Exécute une simulation unique et formate les données pour l'UI
 */
async function runSimulation(data: any) {
    try {
        const { matchId, homeName, awayName, homeTeamId, awayTeamId } = data;

        // 1. Initialisation du moteur
        const engine = new TokenMatchEngine();

        // 2. Lancement de la simulation avec les paramètres reçus
        const engineResult = engine.simulateMatch(5400, {
            homeName: homeName || "Domicile",
            awayName: awayName || "Extérieur"
        });

        // 3. Extraction et formatage des événements de but
        const goalEvents: any[] = [];
        const formattedEvents = engineResult.events.map((evt: any) => {
            const minute = Math.floor(evt.time / 60);

            // bag JSON safe : [{id, type, teamId}, ...]
            let bag = Array.isArray(evt.bag)
                ? evt.bag.map((t: any) => ({ id: t.id, type: t.type, teamId: t.teamId }))
                : [];

            // drawnToken = le jeton effectivement tiré (celui du log)
            let drawnToken = evt.token ? { id: evt.token.id, type: evt.token.type, teamId: evt.token.teamId } : null;

            if (evt.type === "GOAL") {
                goalEvents.push({
                    minute: minute,
                    teamId: evt.teamId,
                    scorerName: evt.scorer?.name || "Joueur"
                });
            }

            return {
                id: generateId(),
                matchId: matchId,
                minute: minute,
                second: evt.time % 60,
                type: evt.type,
                description: evt.text,
                teamId: evt.teamId,
                ballPosition: evt.ballPosition,
                situation: evt.situation,
                bag,
                drawnToken
            };
        });

        // 4. Retour des résultats complets
        return {
            matchId: matchId,
            homeTeamId: homeTeamId || 1,
            awayTeamId: awayTeamId || 2,
            homeName: homeName || "Domicile",
            awayName: awayName || "Extérieur",
            homeScore: engineResult.homeScore,
            awayScore: engineResult.awayScore,
            events: formattedEvents,
            scorers: goalEvents,
            stats: {
                shots: { home: 0, away: 0 }, // Tu pourras incrémenter cela plus tard
                possession: { home: 50, away: 50 }
            }
        };

    } catch (err) {
        console.error("Worker Simulation Error:", err);
        throw err;
    }
}

/**
 * Gestionnaire de messages entrant
 */
self.onmessage = async (e: MessageEvent) => {
    const { type, payload } = e.data;

    try {
        switch (type) {
            case "SIMULATE_MATCH": {
                const result = await runSimulation(payload);
                self.postMessage({ 
                    type: "MATCH_COMPLETE", 
                    payload: { result, requestId: payload.requestId } 
                });
                break;
            }
            case "SIMULATE_BATCH": {
                const results = [];
                for (const matchData of payload.matches) {
                    const result = await runSimulation(matchData);
                    results.push({ matchId: matchData.matchId, result });
                }
                self.postMessage({ 
                    type: "BATCH_COMPLETE", 
                    payload: { results, saveId: payload.saveId } 
                });
                break;
            }
        }
    } catch (error) {
        console.error("Worker Global Error:", error);
    }
};