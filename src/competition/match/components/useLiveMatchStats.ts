// /src/competition/match/components/useLiveMatchStats.ts
import { useComputed } from "@preact/signals";

export function useLiveMatchStats(liveMatch: any, currentLogIndex: any, currentMatchTime: any) {
    const allLogs = liveMatch?.result?.debugLogs || liveMatch?.result?.events || [];
    const maxTime = allLogs.length > 0 ? allLogs[allLogs.length - 1].time : 5400;

    const getIdx = () => currentLogIndex?.value ?? 0;
    const getTime = () => currentMatchTime?.value ?? 0;

    const result = liveMatch?.result || null;
    const homeId = liveMatch?.homeTeam?.id || liveMatch?.result?.homeTeamId || 1;
    const awayId = liveMatch?.awayTeam?.id || liveMatch?.result?.awayTeamId || 2;

    // --- CALCULS DE SCORE DYNAMIQUES ---
    // On compte les logs de type 'GOAL' jusqu'à l'index actuel
    const homeScore = useComputed(() => {
        return allLogs.slice(0, getIdx() + 1)
            .filter((l: any) => l.type === 'GOAL' && String(l.teamId) === String(homeId)).length;
    });

    const awayScore = useComputed(() => {
        return allLogs.slice(0, getIdx() + 1)
            .filter((l: any) => l.type === 'GOAL' && String(l.teamId) === String(awayId)).length;
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
        
        // Signaux de score (Corrigent l'erreur TS 2551)
        homeScore,
        awayScore,

        currentLog: useComputed(() => allLogs[getIdx()] || null),
        previousLog: useComputed(() => allLogs[getIdx() - 1] || null),
        isFinished: useComputed(() => getTime() >= maxTime),
        currentMinute: useComputed(() => Math.floor(getTime() / 60)),
        currentStoppageTime: useComputed(() => {
            const t = getTime();
            return t > 2700 && t < 2800 ? Math.floor((t - 2700) / 60) : 0;
        }),
        displayPos: useComputed(() => {
            // Si le log courant a une position de balle, on l'utilise
            const log = allLogs[getIdx()];
            let pos = log && log.ballPosition
                ? log.ballPosition
                : (allLogs.length > 0 && allLogs[0].ballPosition
                    ? allLogs[0].ballPosition
                    : { x: 2, y: 2 });
            // Clamp la position pour rester dans la grille (0-5, 0-4)
            pos = {
                x: Math.max(0, Math.min(5, Math.round(pos.x))),
                y: Math.max(0, Math.min(4, Math.round(pos.y)))
            };
            // Correction spéciale : si le moteur envoie (2,2) ou (3,2), c'est le centre
            // (optionnel, pour forcer le centre visuel)
            if ((pos.x === 2 || pos.x === 3) && pos.y === 2) {
                // rien à corriger, c'est le centre
                return pos;
            }
            return pos;
        }),
        effectiveTeamId: useComputed(() => allLogs[getIdx()]?.possessionTeamId),
        
        homePlayersList: liveMatch?.homePlayers || [],
        awayPlayersList: liveMatch?.awayPlayers || [],
        homeScorers: useComputed(() => 
            allLogs.slice(0, getIdx() + 1)
                .filter((l: any) => l.type === 'GOAL' && String(l.teamId) === String(homeId))
                .map((l: any) => ({ name: l.drawnToken?.playerName || l.playerName || 'Un joueur', minute: Math.floor(l.time / 60) }))
        ),
        awayScorers: useComputed(() => 
            allLogs.slice(0, getIdx() + 1)
                .filter((l: any) => l.type === 'GOAL' && String(l.teamId) === String(awayId))
                .map((l: any) => ({ name: l.drawnToken?.playerName || l.playerName || 'Un joueur', minute: Math.floor(l.time / 60) }))
        ),
        ratings: liveMatch?.result?.ratings || {},
        possession: useComputed(() => liveMatch?.result?.stats?.possession || [50, 50]),
        currentLogsByIndex: useComputed(() => allLogs.slice(0, getIdx() + 1))
    };
}