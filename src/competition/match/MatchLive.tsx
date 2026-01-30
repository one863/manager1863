import { useEffect, useState, useRef, useCallback } from "preact/hooks";
import { useSignal } from "@preact/signals";
import { Loader2, Package, MapPin, Users, BarChart3, MessageSquare, X } from "lucide-preact";

// Stores et Hooks
import { useGameStore } from "@/infrastructure/store/gameSlice";
import { useLiveMatchStore } from "@/infrastructure/store/liveMatchStore";
import { useLiveMatchStats } from "./components/useLiveMatchStats";

// Composants
import PlayersTab from "./components/PlayersTab";
import StatsTab from "./components/StatsTab";
import HighlightsTab from "./components/HighlightsTab";
import Scoreboard from "./components/Scoreboard";
import PitchView from "./components/PitchView";
import MatchControls from "./components/MatchControls";

const TABS = [
    { id: "live", icon: Package },
    { id: "highlights", icon: MapPin },
    { id: "stats", icon: BarChart3 },
    { id: "players", icon: Users }
] as const;

type TabId = typeof TABS[number]['id'];

const cleanText = (text?: string) => text?.replace(/undefined|Collectif/g, "L'équipe") || '...';


export default function MatchLive({ onShowReport }: { onShowReport?: (id: number) => void }) {
    const finalizeLiveMatch = useGameStore((s) => s.finalizeLiveMatch);
    const currentSaveId = useGameStore((s) => s.currentSaveId);
    const liveMatch = useLiveMatchStore((s) => s.liveMatch);
    const loadLiveMatchFromDb = useLiveMatchStore((s) => s.loadLiveMatchFromDb);
    const updateLiveMatchState = useLiveMatchStore((s) => s.updateLiveMatchState);

    const hasLoaded = useRef(false);
    const currentMatchTime = useSignal(0);
    const isPaused = useSignal(true);
    const currentLogIndex = useSignal(0);
    const [activeTab, setActiveTab] = useState<TabId>("live");

    // 1. CHARGEMENT INITIAL ROBUSTE + LOGS DEBUG
    useEffect(() => {
        if (!currentSaveId) return;
        if (liveMatch && liveMatch.matchId) return;
        loadLiveMatchFromDb(currentSaveId);
    }, [currentSaveId]);

    useEffect(() => {
        if (!currentSaveId || (liveMatch && liveMatch.matchId)) return;
        const timeout = setTimeout(() => {
            loadLiveMatchFromDb(currentSaveId);
        }, 1000);
        return () => clearTimeout(timeout);
    }, [currentSaveId, liveMatch]);

    useEffect(() => {
        // ...
    }, [liveMatch]);

    // 2. SYNCHRONISATION INITIALE
    useEffect(() => {
        if (!liveMatch?.result) return;
        currentMatchTime.value = liveMatch.currentTime ?? 0;
        isPaused.value = liveMatch.isPaused ?? true;
        
        const logs = liveMatch.result.debugLogs || liveMatch.result.events || [];
        if (logs.length > 0) {
            const idx = Math.max(0, logs.findLastIndex((l: any) => l.time <= currentMatchTime.value));
            currentLogIndex.value = idx;
        }
    }, [liveMatch]);

    // 3. HOOK DE STATS
    const stats = useLiveMatchStats(liveMatch, currentLogIndex, currentMatchTime);
    const { allLogs, maxTime, result, matchId, isFinished } = stats;

    // 4. LOGIQUE DE TEMPS
    useEffect(() => {
        if (isPaused.value || isFinished.value || allLogs.length === 0) return;

        const interval = setInterval(() => {
            if (currentMatchTime.value < maxTime) {
                currentMatchTime.value += 1;
                const nextIdx = allLogs.findLastIndex((l: any) => l.time <= currentMatchTime.value);
                if (nextIdx !== -1 && nextIdx !== currentLogIndex.value) {
                    currentLogIndex.value = nextIdx;
                }
            } else {
                isPaused.value = true;
            }
        }, 100);

        return () => clearInterval(interval);
    }, [isPaused.value, maxTime, allLogs.length, isFinished.value]);

    // 5. HANDLERS DE NAVIGATION
    const seekToLog = useCallback((index: number) => {
        const targetLog = allLogs[index];
        if (targetLog) {
            isPaused.value = true;
            currentLogIndex.value = index;
            currentMatchTime.value = targetLog.time;
        }
    }, [allLogs]);

   // Dans MatchLive.tsx

const handleFinalize = useCallback(async () => {
    // ...

    if (!result || !matchId) {
        console.error("Finalisation impossible : Données manquantes", { result, matchId });
        return;
    }

    try {
        // Vérification que le match existe bien en DB avant finalisation
        const matchInDb = await import("@/core/db/db").then(m => m.db.matches.get(matchId));
        if (!matchInDb) {
            console.error("Finalisation impossible : Match non trouvé en base", { matchId });
            alert("Erreur : Match non trouvé en base de données.");
            return;
        }
        // 1. Mise à jour de la DB et purge des données de simulation
        await finalizeLiveMatch(result);
        // 2. Nettoyage de l'état live pour éviter les boucles au rechargement
        updateLiveMatchState({ currentTime: 0, isPaused: true }, currentSaveId ?? undefined);
        // 3. Navigation vers le rapport
        if (onShowReport) {
            onShowReport(matchId);
        } else {
            window.location.hash = `/match-report/${matchId}`;
        }
    } catch (error) {
        console.error("Erreur lors de la finalisation du match:", error);
        alert("Erreur lors de la sauvegarde du match. Réessayez.");
    }
}, [result, matchId, finalizeLiveMatch, onShowReport, updateLiveMatchState, currentSaveId]);


    if (!currentSaveId || !liveMatch?.result) {
        return (
            <div className="absolute inset-0 z-[200] flex items-center justify-center bg-slate-50">
                <Loader2 className="animate-spin text-slate-600" />
                <span className="ml-2 text-slate-500 text-xs">Chargement du match en cours...</span>
            </div>
        );
    }

    // Condition de fin pour les contrôles (si le temps est fini OU si on est au dernier log)
    const isActuallyFinished = isFinished.value || currentLogIndex.value >= allLogs.length - 1;

    return (
        <div className="absolute inset-0 z-[200] flex flex-col bg-slate-50 overflow-hidden text-slate-900">
            {/* Bouton de secours si fini */}
            {isActuallyFinished && (
                <button
                    onClick={handleFinalize}
                    className="absolute top-3 right-3 z-50 bg-white shadow-xl text-red-600 rounded-full p-2 border border-red-100 hover:scale-110 transition-transform"
                >
                    <X size={20} />
                </button>
            )}

            <Scoreboard
                homeTeam={stats.homeTeam!} awayTeam={stats.awayTeam!}
                homeScore={stats.homeScore} awayScore={stats.awayScore}
                minute={stats.currentMinute} homeScorers={stats.homeScorers} awayScorers={stats.awayScorers}
                possession={stats.possession}
                isFinished={isActuallyFinished} stoppageTime={stats.currentStoppageTime}
            />

            <div className="flex-1 flex flex-col overflow-hidden px-4 pt-4 gap-3">
                <div className="mb-4">
                    <PitchView
                        displayPos={stats.displayPos}
                        effectiveTeamId={stats.effectiveTeamId}
                        homeTeamId={stats.homeId!}
                        awayTeamId={stats.awayId!}
                        currentLog={stats.currentLog}
                        previousLog={stats.previousLog}
                        possession={stats.possession}
                    />
                </div>

                <div className="flex bg-slate-200/50 rounded-xl p-1 border border-slate-200">
                    {TABS.map(({ id, icon: Icon }) => (
                        <button 
                            key={id} 
                            onClick={() => setActiveTab(id)} 
                            className={`flex-1 py-2 flex items-center justify-center gap-2 text-[9px] font-black uppercase rounded-lg transition-all ${
                                activeTab === id ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"
                            }`}
                        >
                            <Icon size={12} /> {id}
                        </button>
                    ))}
                </div>

                <div className="flex-1 overflow-y-auto pb-24">
                    {activeTab === "live" && (
                        <div className="flex flex-col gap-4">
                            {/* Sac du présent (N) */}
                            <TokenBagDisplay 
                                title={`Sac actuel (présent) — Log #${stats.currentLog.value ? stats.allLogs.indexOf(stats.currentLog.value) : 0} - #${stats.currentLog.value?.ballPosition ? `${stats.currentLog.value.ballPosition.x},${stats.currentLog.value.ballPosition.y}` : ''}`}
                                color="blue" 
                                log={stats.currentLog.value} 
                                homeTeamId={stats.homeId}
                                awayTeamId={stats.awayId}
                                highlightTokenId={null}
                                drawnTokenId={null}
                            />
                            {/* Sac du passé (N-1) */}
                            {stats.previousLog.value && (
                                <TokenBagDisplay 
                                    title={`Sac précédent (passé) — Log #${stats.previousLog.value ? stats.allLogs.indexOf(stats.previousLog.value) : 0} - #${stats.previousLog.value?.ballPosition ? `${stats.previousLog.value.ballPosition.x},${stats.previousLog.value.ballPosition.y}` : ''}`}
                                    color="orange" 
                                    log={stats.previousLog.value} 
                                    homeTeamId={stats.homeId}
                                    awayTeamId={stats.awayId}
                                    highlightTokenId={stats.currentLog.value?.drawnToken?.id || null}
                                    drawnTokenId={stats.currentLog.value?.drawnToken?.id || null}
                                />
                            )}
                            <div className="p-3 bg-white rounded-xl border border-slate-100 flex items-start gap-3">
                                <MessageSquare size={14} className="text-slate-400 mt-0.5" />
                                <p className="text-xs text-slate-600 italic leading-relaxed">
                                    {cleanText(stats.currentLog.value?.text)}
                                </p>
                            </div>
                        </div>
                    )}
                    {activeTab === "highlights" && <HighlightsTab logs={stats.currentLogsByIndex.value} />}
                    {activeTab === "stats" && <StatsTab stats={liveMatch.result?.stats} homeTeam={stats.homeTeam} awayTeam={stats.awayTeam} />}
                    {activeTab === "players" && <PlayersTab homePlayers={stats.homePlayersList} awayPlayers={stats.awayPlayersList} homeTeam={stats.homeTeam} awayTeam={stats.awayTeam} ratings={stats.ratings} />}
                </div>

                <MatchControls
                    isPaused={isPaused}
                    isFinished={isActuallyFinished}
                    onGoToStart={() => seekToLog(0)}
                    onStepBack={() => seekToLog(Math.max(0, currentLogIndex.value - 1))}
                    onStepForward={() => seekToLog(Math.min(allLogs.length - 1, currentLogIndex.value + 1))}
                    onSkip={() => seekToLog(allLogs.length - 1)}
                    onFinalize={handleFinalize}
                    disableStepBack={currentLogIndex.value <= 0}
                />
            </div>
        </div>
    );
}

function TokenBagDisplay({ title, color, log, homeTeamId, awayTeamId, highlightTokenId, drawnTokenId }: any) {
        // Debug : afficher la structure des jetons du sac
        // ...
    const bag = log?.bag || log?.tokens || log?.availableTokens || [];
    const colorClass = color === 'blue' ? 'text-blue-600 bg-blue-50' : 'text-orange-600 bg-orange-50';
    return (
        <div className="bg-white rounded-2xl p-4 border border-slate-100">
            <div className="flex items-center justify-between mb-3">
                <h3 className={`text-[10px] font-black uppercase flex items-center gap-2 ${colorClass.split(' ')[0]}`}> 
                    <Package size={14} /> {title}
                </h3>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${colorClass}`}>
                    {bag.length} options
                </span>
            </div>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                {bag.map((token: any) => {
                    // Correction : si le jeton n'a pas de teamId, on lui attribue homeTeamId
                    let teamId = token.teamId;
                    if (!teamId || (teamId !== homeTeamId && teamId !== awayTeamId)) {
                        // Fallback : si le jeton n'a pas d'équipe, on utilise la possession du log
                        teamId = log?.possessionTeamId ?? homeTeamId;
                    }
                    const isHome = String(teamId) === String(homeTeamId);
                    const isAway = String(teamId) === String(awayTeamId);
                    const isDrawn = drawnTokenId && token.id === drawnTokenId;
                    let tokenClass = 'bg-slate-200 text-slate-700 border-slate-300';
                    if (isDrawn) {
                        tokenClass = 'bg-green-500 text-white border-green-700 scale-110 shadow-lg';
                    } else if (isHome) {
                        tokenClass = 'bg-blue-600 text-white border-blue-400';
                    } else if (isAway) {
                        tokenClass = 'bg-orange-500 text-white border-orange-300';
                    }
                    return (
                        <div 
                            key={token.id}
                            className={`px-2 py-1 rounded text-[9px] font-bold border transition-all duration-200 ${tokenClass}`}
                        >
                            {token.type}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}