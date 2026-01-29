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

    // 1. CHARGEMENT INITIAL
    useEffect(() => {
        if (!hasLoaded.current && !liveMatch && currentSaveId) {
            hasLoaded.current = true;
            loadLiveMatchFromDb(currentSaveId);
        }
    }, [currentSaveId, liveMatch, loadLiveMatchFromDb]);

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
    console.log("Tentative de finalisation...", { matchId, hasResult: !!result });

    if (!result || !matchId) {
        console.error("Finalisation impossible : Données manquantes", { result, matchId });
        return;
    }

    try {
        // 1. Mise à jour de la DB et purge des données de simulation
        // Cette fonction dans ton gameSlice doit appeler MatchService.saveMatchResult
        await finalizeLiveMatch(result);
        
        // 2. Nettoyage de l'état live pour éviter les boucles au rechargement
        updateLiveMatchState({ currentTime: 0, isPaused: true }, currentSaveId ?? undefined);

        // 3. Navigation vers le rapport
        if (onShowReport) {
            onShowReport(matchId);
        } else {
            // Fallback si la prop n'est pas passée
            window.location.hash = `/match-report/${matchId}`;
        }
    } catch (error) {
        console.error("Erreur lors de la finalisation du match:", error);
        alert("Erreur lors de la sauvegarde du match. Réessayez.");
    }
}, [result, matchId, finalizeLiveMatch, onShowReport, updateLiveMatchState, currentSaveId]);

    if (!liveMatch?.result) return (
        <div className="absolute inset-0 z-[200] flex items-center justify-center bg-slate-50">
            <Loader2 className="animate-spin text-slate-600" />
        </div>
    );

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
                            <TokenBagDisplay 
                                title="Sac actuel" 
                                color="blue" 
                                log={stats.currentLog.value} 
                                teamId={stats.homeId}
                            />
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

function TokenBagDisplay({ title, color, log, teamId }: any) {
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
                {bag.map((token: any) => (
                    <div 
                        key={token.id}
                        className={`px-2 py-1 rounded text-[9px] font-bold border ${
                            String(token.teamId) === String(teamId) 
                            ? 'bg-blue-600 text-white border-blue-400' 
                            : 'bg-orange-500 text-white border-orange-300'
                        }`}
                    >
                        {token.type}
                    </div>
                ))}
            </div>
        </div>
    );
}