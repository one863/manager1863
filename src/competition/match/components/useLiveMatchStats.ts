import { useMemo } from "preact/hooks";
import { useComputed } from "@preact/signals";

export default function useLiveMatchStats(liveMatch: any, currentLogIndex: any, currentMatchTime: any) {
    const result = liveMatch?.result;
    const homeTeam = liveMatch?.homeTeam;
    const awayTeam = liveMatch?.awayTeam;
    const matchId = liveMatch?.matchId;
    const homePlayersList = liveMatch?.homePlayers;
    const awayPlayersList = liveMatch?.awayPlayers;

    const allLogs = useMemo(() => result?.debugLogs || result?.events || [], [result]);
    const maxTime = useMemo(() => allLogs.length > 0 ? allLogs[allLogs.length - 1].time : 5400, [allLogs]);

    const homeId = useMemo(() => result?.homeTeamId ?? homeTeam?.id, [result, homeTeam]);
    const awayId = useMemo(() => result?.awayTeamId ?? awayTeam?.id, [result, awayTeam]);

    const currentLogsByIndex = useComputed(() => allLogs.slice(0, currentLogIndex.value + 1));

    const homeScore = useComputed(() => {
        if (!homeId) return 0;
        return currentLogsByIndex.value.filter((l: any) => l.eventSubtype === 'GOAL' && String(l.teamId) === String(homeId)).length;
    });
    const awayScore = useComputed(() => {
        if (!awayId) return 0;
        return currentLogsByIndex.value.filter((l: any) => l.eventSubtype === 'GOAL' && String(l.teamId) === String(awayId)).length;
    });

    const homeScorers = useComputed(() => {
        if (!homeId) return [];
        return currentLogsByIndex.value
            .filter((l: any) => l.eventSubtype === "GOAL" && String(l.teamId) === String(homeId) && l.text && !/célébration|remise en jeu/i.test(l.text))
            .map((l: any) => ({ name: l.playerName || "Inconnu", minute: Math.floor(l.time / 60) }));
    });
    const awayScorers = useComputed(() => {
        if (!awayId) return [];
        return currentLogsByIndex.value
            .filter((l: any) => l.eventSubtype === "GOAL" && String(l.teamId) === String(awayId) && l.text && !/célébration|remise en jeu/i.test(l.text))
            .map((l: any) => ({ name: l.playerName || "Inconnu", minute: Math.floor(l.time / 60) }));
    });

    const currentMinute = useComputed(() => Math.floor(currentMatchTime.value / 60));
    const isFinished = useComputed(() => currentMatchTime.value >= maxTime);
    const currentStoppageTime = useComputed(() => {
        const min = currentMinute.value;
        return min >= 90 ? min - 90 : 0;
    });

    const currentLog = useComputed(() => {
        const idx = currentLogIndex.value;
        return (idx >= 0 && idx < allLogs.length) ? allLogs[idx] : (allLogs[0] || null);
    });
    const previousLog = useComputed(() => {
        const idx = currentLogIndex.value;
        return (idx > 0 && idx < allLogs.length) ? allLogs[idx - 1] : null;
    });
    const displayPos = useComputed(() => currentLog.value?.ballPosition || { x: 2, y: 2 });
    const effectiveTeamId = useComputed(() => currentLog.value?.possessionTeamId ?? currentLog.value?.teamId);
    const isKickOffSituation = useComputed(() => {
        const l = currentLog.value;
        return l?.situation === 'KICK_OFF' || 
               l?.situation === 'KICK_OFF_RESTART' || 
               (l?.text && /coup d'envoi/i.test(l.text));
    });

    // Ratings pour PlayersTab
    const ratings: Record<string, number> = {};
    if ((result as any)?.ratings && Array.isArray((result as any).ratings)) {
        (result as any).ratings.forEach((player: any) => {
            if (player && player.id && player.rating > 0) {
                ratings[String(player.id)] = player.rating;
            }
        });
    }
    if (Object.keys(ratings).length === 0 && (result as any)?.playerStats) {
        Object.entries((result as any).playerStats).forEach(([pid, s]: [string, any]) => { 
            if (s && typeof s === 'object' && s.rating > 0) ratings[pid] = s.rating; 
        });
    }

    return {
        result, homeTeam, awayTeam, matchId, homePlayersList, awayPlayersList,
        allLogs, maxTime, homeId, awayId, currentLogsByIndex, homeScore, awayScore,
        homeScorers, awayScorers, currentMinute, isFinished, currentStoppageTime,
        currentLog, previousLog, displayPos, effectiveTeamId, isKickOffSituation, ratings
    };
}
