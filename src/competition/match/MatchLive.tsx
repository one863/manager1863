import { useGameStore } from "@/infrastructure/store/gameSlice";
import { useLiveMatchStore } from "@/infrastructure/store/liveMatchStore";
import { useSignal, useComputed } from "@preact/signals";
import { Loader2, Package, MapPin, Users, BarChart3, MessageSquare } from "lucide-preact";
import { useEffect, useState, useRef, useCallback, useMemo } from "preact/hooks";

import EventItem from "./components/EventItem";
import Scoreboard from "./components/Scoreboard";
import MomentumChart from "./components/MomentumChart";
import PitchView from "./components/PitchView";
import MatchControls from "./components/MatchControls";
import StatRow from "./components/StatRow";
import PlayerColumn from "./components/PlayerColumn";

// Constantes
const TABS = [
    { id: "flux", icon: MapPin },
    { id: "2d", icon: Package },
    { id: "stats", icon: BarChart3 },
    { id: "players", icon: Users }
] as const;

type TabId = typeof TABS[number]['id'];

// Utilitaires
const cleanText = (text?: string) => text?.replace(/undefined|Collectif/g, "L'équipe") || '...';




// Pour le score : tout log de but (hors célébration/remise en jeu)
const isGoalForScore = (e: any) =>
    e.eventSubtype === "GOAL" &&
    e.text &&
    !/célébration|remise en jeu/i.test(e.text);
// Pour les buteurs : log de but avec playerName non vide (peu importe le texte)
const isGoalForScorer = (e: any) =>
    e.eventSubtype === "GOAL" &&
    typeof e.playerName === "string" &&
    e.playerName.trim() !== "";

export default function MatchLive({ onShowReport }: { onShowReport?: (id: number) => void }) {
    // Stores
    const finalizeLiveMatch = useGameStore((s) => s.finalizeLiveMatch);
    const currentSaveId = useGameStore((s) => s.currentSaveId);
    const liveMatch = useLiveMatchStore((s) => s.liveMatch);
    const loadLiveMatchFromDb = useLiveMatchStore((s) => s.loadLiveMatchFromDb);

    // Chargement initial
    const hasLoaded = useRef(false);
    useEffect(() => {
        if (!hasLoaded.current && !liveMatch && currentSaveId) {
            hasLoaded.current = true;
            loadLiveMatchFromDb(currentSaveId);
        }
    }, [currentSaveId, liveMatch, loadLiveMatchFromDb]);

    // État local
    const [initialTime] = useState(liveMatch?.currentTime || 0);
    const currentMatchTime = useSignal(initialTime);
    // Toujours démarrer en pause pour un lecteur de logs
    const isPaused = useSignal(true);
    const [activeTab, setActiveTab] = useState<TabId>(liveMatch?.activeTab || "flux");

    // Loading state
    if (!liveMatch?.result) {
        return (
            <div className="absolute inset-0 z-[200] flex flex-col items-center justify-center bg-slate-50 gap-4">
                <Loader2 className="animate-spin text-slate-600" size={32} />
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">Simulation en cours...</p>
            </div>
        );
    }

    // Données du match (stables après chargement)
    const { result, homeTeam, awayTeam, matchId, homePlayers: homePlayersList, awayPlayers: awayPlayersList } = liveMatch;
    // Les logs complets du match
    const allLogs = result.debugLogs || [];
    // On ne garde que les logs jusqu'au temps courant pour le live
    const logs = useComputed(() => allLogs.filter((l: any) => l.time <= currentMatchTime.value));
    const maxTime = allLogs.length > 0 ? allLogs[allLogs.length - 1].time : 5400;
    // Utiliser result.homeTeamId/awayTeamId car ils correspondent aux teamId dans les logs
    const homeId = result.homeTeamId ?? homeTeam?.id;
    const awayId = result.awayTeamId ?? awayTeam?.id;

    // Signaux réactifs pour le score et les buteurs
    const homeScore = useSignal(0);
    const awayScore = useSignal(0);
    const homeScorers = useSignal([]);
    const awayScorers = useSignal([]);

    // Signaux calculés
    const currentMinute = useComputed(() => Math.floor(currentMatchTime.value / 60));
    const isFinished = useComputed(() => currentMatchTime.value >= maxTime);
    const currentStoppageTime = useComputed(() => {
        const min = currentMinute.value;
        return min >= 90 ? min - 90 : 0;
    });

    useEffect(() => {
        // Score : tous les logs de but (hors célébration/remise en jeu)
        const hGoalsScore = logs.value.filter((e: any) => e.teamId === homeId && isGoalForScore(e));
        const aGoalsScore = logs.value.filter((e: any) => e.teamId === awayId && isGoalForScore(e));
        homeScore.value = hGoalsScore.length;
        awayScore.value = aGoalsScore.length;
        // Buteurs : logs de but avec playerName non vide (hors célébration/remise en jeu)
        const hGoalsScorers = logs.value.filter((e: any) => e.teamId === homeId && isGoalForScorer(e));
        const aGoalsScorers = logs.value.filter((e: any) => e.teamId === awayId && isGoalForScorer(e));
        // Pour éviter les doublons, on ne garde qu'un but par joueur/minute
        const uniqueScorers = (arr: any[]) => {
            const seen = new Set();
            return arr.filter(e => {
                const key = e.playerName + '-' + Math.floor(e.time / 60);
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });
        };
        homeScorers.value = uniqueScorers(hGoalsScorers).map((e: any) => ({ name: e.playerName, minute: Math.floor(e.time / 60) }));
        awayScorers.value = uniqueScorers(aGoalsScorers).map((e: any) => ({ name: e.playerName, minute: Math.floor(e.time / 60) }));
    }, [logs.value, homeId, awayId, currentMatchTime.value]);

    // Index du log actuel - source de vérité unique pour la navigation
    // Index du log actuel basé sur allLogs (pas les logs filtrés)
    const currentLogIndex = useSignal(0);
    // Synchronisation automatique de l'index avec le temps courant
    useEffect(() => {
        const idx = Math.max(0, allLogs.findLastIndex((l: any) => l.time <= currentMatchTime.value));
        currentLogIndex.value = idx;
    }, [currentMatchTime.value, allLogs]);
    
    // Au démarrage (temps 0), on prend le premier log de jeu (pas le START)
    const currentLog = useComputed(() => {
        const idx = currentLogIndex.value;
        if (idx >= 0 && idx < allLogs.length) return allLogs[idx];
        // Si aucun log trouvé, chercher le premier log qui n'est pas un START
        const firstGameLog = allLogs.find((l: any) => l.type !== 'START') || allLogs[0];
        return firstGameLog;
    });

    const displayPos = useComputed(() => currentLog.value?.ballPosition || { x: 2, y: 2 });
    const effectiveTeamId = useComputed(() => currentLog.value?.possessionTeamId ?? currentLog.value?.teamId);

    const currentScorers = useComputed(() => {
        // On utilise les logs filtrés jusqu'au temps courant
        return {
            h: logs.value.filter((e: any) => e.teamId === homeId && isValidGoal(e))
                .map((e: any) => ({ name: e.playerName, minute: Math.floor(e.time / 60) })),
            a: logs.value.filter((e: any) => e.teamId === awayId && isValidGoal(e))
                .map((e: any) => ({ name: e.playerName, minute: Math.floor(e.time / 60) }))
        };
    });

    const bagStats = useComputed(() => {
        const bag = currentLog.value?.bag || [];
        // Si le bag est vide ou ne contient qu'un seul token (ancien format), ne pas afficher de stats
        if (bag.length <= 1) {
            return { total: 0, sides: { h: { count: 0, types: {} }, a: { count: 0, types: {} }, n: { count: 0, types: {} } } };
        }
        const total = bag.length;
        const stats: Record<string, { count: number; types: Record<string, number> }> = {
            h: { count: 0, types: {} },
            a: { count: 0, types: {} },
            n: { count: 0, types: {} }
        };
        
        for (const t of bag) {
            const side = String(t.teamId) === String(homeId) ? 'h' : String(t.teamId) === String(awayId) ? 'a' : 'n';
            stats[side].count++;
            stats[side].types[t.type] = (stats[side].types[t.type] || 0) + 1;
        }
        
        return { total, sides: stats };
    });

    const matchAnalysis = useComputed(() => {
        // On utilise les logs filtrés jusqu'au temps courant
        const playedLogs = logs.value;
        const analysis = result.analysis || {};

        // Fonction helper pour calculer les stats
        const calcStats = (teamId: number) => {
            const teamLogs = playedLogs.filter((l: any) => l.teamId === teamId);
            return {
                goals: teamLogs.filter((l: any) => l.eventSubtype === 'GOAL' && l.playerName).length,
                shots: teamLogs.filter((l: any) => ['SHOT', 'SAVE', 'WOODWORK', 'GOAL'].includes(l.eventSubtype)).length,
                onTarget: teamLogs.filter((l: any) => ['SAVE', 'GOAL'].includes(l.eventSubtype)).length,
                xg: teamLogs.filter((l: any) => l.statImpact?.xg).reduce((s: number, l: any) => s + (l.statImpact?.xg || 0), 0),
                passes: teamLogs.filter((l: any) => l.statImpact?.isPass && l.statImpact?.isSuccess).length,
                duels: teamLogs.filter((l: any) => l.statImpact?.isDuel && l.statImpact?.isSuccess).length
            };
        };

        return {
            stats: { h: calcStats(homeId), a: calcStats(awayId) },
            ratings: analysis.ratings || []
        };
    });

    const sampledMomentum = useComputed(() => {
        const momentum = result.ballHistory || [];
        if (momentum.length === 0) return [];
        const progressRatio = currentMatchTime.value / maxTime;
        const visibleCount = Math.ceil(momentum.length * progressRatio);
        return momentum.map((val: number, i: number) => i < visibleCount ? val : 0);
    });

    // Handlers
    const handleGoToStart = useCallback(() => {
        if (allLogs.length === 0) return;
        isPaused.value = true;
        currentLogIndex.value = 0;
        currentMatchTime.value = allLogs[0].time;
    }, [allLogs, isPaused, currentMatchTime, currentLogIndex]);

    const handleStepBack = useCallback(() => {
        if (allLogs.length === 0) return;
        isPaused.value = true;
        const idx = currentLogIndex.value;
        if (idx > 0) {
            currentLogIndex.value = idx - 1;
            currentMatchTime.value = allLogs[idx - 1].time;
        }
    }, [allLogs, isPaused, currentMatchTime, currentLogIndex]);

    const handleStepForward = useCallback(() => {
        if (allLogs.length === 0) return;
        isPaused.value = true;
        const idx = currentLogIndex.value;
        if (idx < allLogs.length - 1) {
            currentLogIndex.value = idx + 1;
            currentMatchTime.value = allLogs[idx + 1].time;
        }
    }, [allLogs, isPaused, currentMatchTime, currentLogIndex]);

    const handleSkip = useCallback(() => {
        isPaused.value = true;
        currentLogIndex.value = allLogs.length - 1;
        currentMatchTime.value = allLogs.length > 0 ? allLogs[allLogs.length - 1].time : maxTime;
    }, [isPaused, currentMatchTime, currentLogIndex, allLogs, maxTime]);

    const handleFinalize = useCallback(async () => {
        // Attendre que la sauvegarde soit terminée avant de naviguer vers le rapport
        await finalizeLiveMatch(result);
        onShowReport?.(matchId);
    }, [finalizeLiveMatch, result, onShowReport, matchId]);

    // Animation de lecture - avance le temps ET l'index
    useEffect(() => {
        if (isPaused.value) return;
        
        const interval = setInterval(() => {
            if (currentMatchTime.value < maxTime) {
                currentMatchTime.value += 1;
                // Avancer d'un seul log à la fois, même si plusieurs logs ont le même temps
                const nextIdx = currentLogIndex.value + 1;
                if (nextIdx < logs.length && logs[nextIdx].time === currentMatchTime.value) {
                    currentLogIndex.value = nextIdx;
                }
            } else {
                isPaused.value = true;
            }
        }, 100);
        return () => clearInterval(interval);
    }, [isPaused.value, maxTime, currentMatchTime]);

    // Événements filtrés pour l'onglet flux
    const visibleEvents = useMemo(() => 
        logs.value.filter((l: any) => 
            (l.type === 'EVENT' || l.type === 'ACTION')
        ).slice(-15).reverse(),
        [logs.value]
    );

    // Joueurs filtrés pour l'onglet players - utiliser les joueurs originaux enrichis avec les ratings
    const homePlayers = useMemo(() => {
        const ratings = matchAnalysis.value.ratings || [];
        // Utiliser les joueurs originaux et enrichir avec les ratings si disponibles
        if (homePlayersList && homePlayersList.length > 0) {
            return homePlayersList.map((p: any) => {
                const ratingData = ratings.find((r: any) => r.id === p.id);
                return {
                    name: p.name || p.lastName || 'Joueur',
                    rating: ratingData?.rating ?? 6.0,
                    goals: ratingData?.goals ?? 0,
                    fatigue: ratingData?.fatigue ?? p.fatigue ?? 0
                };
            });
        }
        // Fallback : utiliser les ratings directement
        return ratings.filter((r: any) => String(r.teamId) === String(homeId));
    }, [matchAnalysis.value.ratings, homePlayersList, homeId]);
    
    const awayPlayers = useMemo(() => {
        const ratings = matchAnalysis.value.ratings || [];
        // Utiliser les joueurs originaux et enrichir avec les ratings si disponibles
        if (awayPlayersList && awayPlayersList.length > 0) {
            return awayPlayersList.map((p: any) => {
                const ratingData = ratings.find((r: any) => r.id === p.id);
                return {
                    name: p.name || p.lastName || 'Joueur',
                    rating: ratingData?.rating ?? 6.0,
                    goals: ratingData?.goals ?? 0,
                    fatigue: ratingData?.fatigue ?? p.fatigue ?? 0
                };
            });
        }
        // Fallback : utiliser les ratings directement
        return ratings.filter((r: any) => String(r.teamId) === String(awayId));
    }, [matchAnalysis.value.ratings, awayPlayersList, awayId]);

    return (
        <div className="absolute inset-0 z-[200] flex flex-col bg-slate-50 overflow-hidden text-slate-900">
            <Scoreboard
                homeTeam={homeTeam}
                awayTeam={awayTeam}
                homeScore={homeScore}
                awayScore={awayScore}
                minute={currentMinute}
                homeScorers={homeScorers}
                awayScorers={awayScorers}
                possession={sampledMomentum}
                isFinished={isFinished.value}
                stoppageTime={currentStoppageTime}
                logs={logs.value}
            />

            <div className="flex-1 flex flex-col overflow-hidden px-4 pt-4 gap-3">
                {activeTab !== "2d" ? (
                    <MomentumChart 
                        momentum={sampledMomentum} 
                        currentTime={currentMatchTime.value} 
                        maxTime={maxTime} 
                    />
                ) : (
                    <PitchView
                        displayPos={displayPos}
                        effectiveTeamId={effectiveTeamId}
                        homeTeamId={homeId}
                        currentLog={currentLog}
                    />
                )}

                {/* Onglets */}
                <div className="flex bg-slate-200/50 rounded-xl p-1 border border-slate-200 shadow-sm">
                    {TABS.map(({ id, icon: Icon }) => (
                        <button
                            key={id}
                            onClick={() => setActiveTab(id)}
                            className={`flex-1 py-2 flex items-center justify-center gap-2 text-[9px] font-black uppercase rounded-lg ${
                                activeTab === id ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"
                            }`}
                        >
                            <Icon size={12} /> {id}
                        </button>
                    ))}
                </div>

                {/* Contenu des onglets */}
                <div className="flex-1 overflow-y-auto pb-24">
                    {activeTab === "2d" && (
                        <BagStatsPanel 
                            bagStats={bagStats.value} 
                            displayPos={displayPos.value}
                            currentLogText={cleanText(currentLog.value?.text)}
                        />
                    )}

                    {activeTab === "flux" && (
                        <div className="space-y-2">
                            {visibleEvents.map((l: any, i: number) => (
                                <div key={i} className="bg-white border border-slate-100 rounded-2xl p-3 shadow-sm animate-fade-in">
                                    <EventItem 
                                        event={{ ...l, minute: Math.floor(l.time / 60), type: l.eventSubtype, description: l.text }} 
                                        homeTeamId={homeId} 
                                    />
                                </div>
                            ))}
                        </div>
                    )}

                    {activeTab === "stats" && (
                        <div className="space-y-4 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
                            <StatRow label="Tirs Totaux" h={matchAnalysis.value.stats.h.shots} a={matchAnalysis.value.stats.a.shots} />
                            <StatRow label="Tirs Cadrés" h={matchAnalysis.value.stats.h.onTarget} a={matchAnalysis.value.stats.a.onTarget} />
                            <StatRow label="Expected Goals (xG)" h={matchAnalysis.value.stats.h.xg.toFixed(2)} a={matchAnalysis.value.stats.a.xg.toFixed(2)} />
                            <StatRow label="Passes" h={matchAnalysis.value.stats.h.passes} a={matchAnalysis.value.stats.a.passes} />
                            <StatRow label="Duels Gagnés" h={matchAnalysis.value.stats.h.duels} a={matchAnalysis.value.stats.a.duels} />
                        </div>
                    )}

                    {activeTab === "players" && (
                        <div className="grid grid-cols-2 gap-4">
                            <PlayerColumn team={homeTeam} players={homePlayers} color="blue" />
                            <PlayerColumn team={awayTeam} players={awayPlayers} color="orange" />
                        </div>
                    )}
                </div>
            </div>

            <MatchControls
                isPaused={isPaused}
                isFinished={isFinished.value}
                onGoToStart={handleGoToStart}
                onStepBack={handleStepBack}
                onStepForward={handleStepForward}
                onSkip={handleSkip}
                onFinalize={handleFinalize}
            />
        </div>
    );
}

// Sous-composant pour les stats du bag (onglet 2D)
function BagStatsPanel({ bagStats, displayPos, currentLogText }: { 
    bagStats: { total: number; sides: Record<string, { count: number; types: Record<string, number> }> };
    displayPos: { x: number; y: number };
    currentLogText: string;
}) {
    const sideColors: Record<string, { bg: string; text: string; bar: string }> = {
        h: { bg: 'bg-blue-50', text: 'text-blue-800', bar: 'bg-blue-500' },
        a: { bg: 'bg-orange-50', text: 'text-orange-800', bar: 'bg-orange-500' },
        n: { bg: 'bg-slate-50', text: 'text-slate-600', bar: 'bg-slate-400' }
    };

    const hasBagContent = bagStats.total > 0;

    return (
        <div className="space-y-2">
            <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-sm">
                <div className="flex flex-col gap-1.5 mb-2 border-b border-slate-100 pb-2">
                    {hasBagContent && (
                        <span className="text-[9px] font-black uppercase text-slate-600 tracking-widest flex items-center gap-1">
                            <Package size={10} /> Contenu du bag ({bagStats.total} tokens)
                            <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded ml-1">
                                Zone {displayPos.x},{displayPos.y}
                            </span>
                        </span>
                    )}
                    <div className="flex items-start gap-2 bg-slate-50 px-2 py-1.5 rounded-xl border border-slate-100">
                        <MessageSquare size={10} className="text-slate-600 mt-0.5 shrink-0" />
                        <p className="text-[12px] text-slate-600 leading-tight font-medium italic">"{currentLogText}"</p>
                    </div>
                </div>
                {hasBagContent && (
                    <div className="space-y-2">
                        {(['h', 'a', 'n'] as const).map(side => {
                            const s = bagStats.sides[side];
                            if (s.count === 0) return null;
                            const colors = sideColors[side];
                            
                            return (
                                <div key={side} className={`p-1.5 rounded-lg ${colors.bg} border border-white/50`}>
                                    <div className="flex items-center gap-1.5 mb-1 opacity-60">
                                        <div className={`w-1 h-2 rounded-full ${colors.bar}`} />
                                        <span className="text-[10px] uppercase tracking-tighter">
                                            {Math.round(s.count / bagStats.total * 100)}%
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap gap-x-4 gap-y-2">
                                        {Object.entries(s.types).map(([type, count]) => (
                                            <div key={type} className="flex flex-col min-w-[60px]">
                                                <span className={`text-[11px] font-black uppercase tracking-tight ${colors.text}`}>
                                                    {type}
                                                </span>
                                                <span className="text-[11px] text-slate-600">
                                                    {Math.round(count / bagStats.total * 100)}%
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
