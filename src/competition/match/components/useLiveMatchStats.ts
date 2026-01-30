import { useComputed } from "@preact/signals";

/**
 * Hook de calcul des statistiques dérivées pour le mode Live.
 * Transforme les logs bruts en données réactives pour l'UI (Score, Buteurs, Chrono).
 */
export function useLiveMatchStats(liveMatch: any, currentLogIndex: any, currentMatchTime: any) {
    // On récupère les logs (soit debugLogs en dev, soit events en prod)
    const allLogs = liveMatch?.result?.debugLogs || liveMatch?.result?.events || [];
    
    // Le temps maximum est celui du dernier log ou 90 minutes par défaut
    const maxTime = allLogs.length > 0 ? allLogs[allLogs.length - 1].time : 5400;

    // Helpers pour accéder aux valeurs des signaux
    const getIdx = () => currentLogIndex?.value ?? 0;
    const getTime = () => currentMatchTime?.value ?? 0;

    const result = liveMatch?.result || null;
    const homeId = liveMatch?.homeTeam?.id || liveMatch?.result?.homeTeamId || 1;
    const awayId = liveMatch?.awayTeam?.id || liveMatch?.result?.awayTeamId || 2;

    // --- CALCULS DE SCORE DYNAMIQUES ---
    // On ne compte que les buts marqués AVANT ou à l'index actuel (lecture temps réel)
    const homeScore = useComputed(() => {
        return allLogs.slice(0, getIdx() + 1)
            .filter((l: any) => l.type === 'GOAL' && Number(l.teamId) === Number(homeId)).length;
    });

    const awayScore = useComputed(() => {
        return allLogs.slice(0, getIdx() + 1)
            .filter((l: any) => l.type === 'GOAL' && Number(l.teamId) === Number(awayId)).length;
    });

    // --- CALCUL DU TEMPS ADDITIONNEL (Stoppage Time) ---
    const currentStoppageTime = useComputed(() => {
        const t = getTime();
        // Mi-temps : après 45min (2700s)
        if (t >= 2700 && t < 2820) { // On laisse 2 min de temps add. fictif
            return Math.floor((t - 2700) / 60);
        }
        // Fin de match : après 90min (5400s)
        if (t >= 5400) {
            return Math.floor((t - 5400) / 60);
        }
        return 0;
    });

    return {
        allLogs,
        maxTime,
        result,
        homeTeam: liveMatch?.homeTeam || { name: "Domicile" },
        awayTeam: liveMatch?.awayTeam || { name: "Extérieur" },
        homeId,
        awayId,
        matchId: liveMatch?.matchId || liveMatch?.result?.matchId,
        
        homeScore,
        awayScore,

        // Logs de navigation
        currentLog: useComputed(() => allLogs[getIdx()] || null),
        previousLog: useComputed(() => allLogs[getIdx() - 1] || null),
        
        // État du chrono
        isFinished: useComputed(() => getTime() >= maxTime),
        currentMinute: useComputed(() => {
            const t = getTime();
            if (t >= 5400) return 90;
            if (t >= 2700 && t < 2820) return 45;
            return Math.floor(t / 60);
        }),
        currentStoppageTime,

        // Position de la balle sur le terrain
        displayPos: useComputed(() => {
            const log = allLogs[getIdx()];
            let pos = log?.ballPosition || (allLogs[0]?.ballPosition) || { x: 2, y: 2 };
            
            // Clamp pour sécurité (Grille 6x5)
            return {
                x: Math.max(0, Math.min(5, Math.round(pos.x))),
                y: Math.max(0, Math.min(4, Math.round(pos.y)))
            };
        }),

        effectiveTeamId: useComputed(() => allLogs[getIdx()]?.possessionTeamId),
        
        homePlayersList: liveMatch?.homePlayers || [],
        awayPlayersList: liveMatch?.awayPlayers || [],

        // Listes des buteurs dynamiques (mis à jour selon la lecture)
        homeScorers: useComputed(() => 
            allLogs.slice(0, getIdx() + 1)
                .filter((l: any) => l.type === 'GOAL' && Number(l.teamId) === Number(homeId))
                .map((l: any) => ({ 
                    name: l.drawnToken?.playerName || l.playerName || 'Joueur', 
                    minute: Math.floor(l.time / 60) 
                }))
        ),
        awayScorers: useComputed(() => 
            allLogs.slice(0, getIdx() + 1)
                .filter((l: any) => l.type === 'GOAL' && Number(l.teamId) === Number(awayId))
                .map((l: any) => ({ 
                    name: l.drawnToken?.playerName || l.playerName || 'Joueur', 
                    minute: Math.floor(l.time / 60) 
                }))
        ),

        ratings: liveMatch?.result?.ratings || {},
        // Possession cumulée (récupérée des stats globales du moteur)
        possession: useComputed(() => {
            const stats = liveMatch?.result?.stats;
            if (stats?.possession) return stats.possession;
            return [50, 50]; // Fallback
        }),
        currentLogsByIndex: useComputed(() => allLogs.slice(0, getIdx() + 1))
    };
}