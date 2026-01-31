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

/**
 * Nettoie le texte narratif en remplaçant les placeholders par les noms des joueurs.
 */
const cleanText = (text?: string, drawnToken?: any) => {
    if (!text) return '...';
    
    let result = text.replace(/undefined|Collectif/g, "L'équipe");
    
    if (drawnToken) {
        if (drawnToken.playerName) {
            result = result.replace(/\{p1\}/g, drawnToken.playerName);
        }
        if (drawnToken.secondaryPlayerName) {
            result = result.replace(/\{p2\}/g, drawnToken.secondaryPlayerName);
        }
    }
    
    return result.replace(/\{p1\}|\{p2\}/g, "un joueur");
};

export default function MatchLive({ onShowReport }: { onShowReport?: (id: number) => void }) {
    // 1. Déclarations des Stores
    const finalizeLiveMatch = useGameStore((s) => s.finalizeLiveMatch);
    const currentSaveId = useGameStore((s) => s.currentSaveId);
    const liveMatch = useLiveMatchStore((s) => s.liveMatch);
    const loadLiveMatchFromDb = useLiveMatchStore((s) => s.loadLiveMatchFromDb);
    const updateLiveMatchState = useLiveMatchStore((s) => s.updateLiveMatchState);

    // 2. Variables de configuration (Déclarées tôt pour être accessibles aux hooks)
    const storageKey = currentSaveId ? `matchlive_${currentSaveId}` : undefined;

    // 3. Signaux et États
    const hasLoaded = useRef(false); // Réintroduit pour un chargement unique
    const hasRestored = useRef(false);
    const currentMatchTime = useSignal(0);
    const isPaused = useSignal(true);
    const currentLogIndex = useSignal(0);
    const [activeTab, setActiveTab] = useState<TabId>("live");

    // 4. Hook de statistiques dynamiques
    const stats = useLiveMatchStats(liveMatch, currentLogIndex, currentMatchTime);
    const { allLogs = [], maxTime = 0, result, matchId, isFinished } = stats || {};

    // --- LOGIQUE DE PERSISTENCE ---

    // Réinitialise le localStorage si le matchId change
    useEffect(() => {
        if (!storageKey || !liveMatch?.matchId) return;
        const saved = localStorage.getItem(storageKey);
        if (saved) {
            try {
                const state = JSON.parse(saved);
                if (state.matchId && state.matchId !== liveMatch.matchId) {
                    localStorage.removeItem(storageKey);
                    // Réinitialiser les signaux à leurs valeurs par défaut pour un nouveau match
                    currentMatchTime.value = 0;
                    currentLogIndex.value = 0;
                    isPaused.value = true;
                    setActiveTab("live"); // Réinitialiser l'onglet actif également
                }
            } catch {
                localStorage.removeItem(storageKey);
            }
        }
    }, [storageKey, liveMatch?.matchId]);

    // Restauration automatique au montage
    useEffect(() => {
        // Ne s'exécute qu'une seule fois après le chargement complet du match pour éviter les cycles
        if (hasRestored.current || !storageKey || !liveMatch?.result?.debugLogs?.length) {
            return;
        }

        const allLogsLength = liveMatch.result.debugLogs.length;
        const saved = localStorage.getItem(storageKey);

        if (saved) {
            try {
                const state = JSON.parse(saved);
                // On ne restaure que si les IDs de match correspondent
                if (state.matchId && state.matchId === liveMatch.matchId) {
                    if (typeof state.currentMatchTime === 'number') {
                        currentMatchTime.value = state.currentMatchTime;
                    }
                    // Restaurer l'index seulement s'il est valide
                    if (typeof state.currentLogIndex === 'number' && state.currentLogIndex < allLogsLength) {
                        currentLogIndex.value = state.currentLogIndex;
                    } else {
                        currentLogIndex.value = 0; // Sécurité
                    }
                    if (typeof state.isPaused === 'boolean') {
                        isPaused.value = state.isPaused;
                    }
                    if (typeof state.activeTab === 'string') {
                        setActiveTab(state.activeTab);
                    }
                }
            } catch { /* Laisser les valeurs par défaut en cas d'erreur de parsing */ }
        }
        
        hasRestored.current = true; // Empêche de ré-exécuter
    }, [liveMatch, storageKey]);

    // Sauvegarde automatique à chaque changement
    useEffect(() => {
        if (!storageKey) return;
        const state = {
            matchId: liveMatch?.matchId,
            currentMatchTime: currentMatchTime.value,
            currentLogIndex: currentLogIndex.value,
            isPaused: isPaused.value,
            activeTab,
        };
        localStorage.setItem(storageKey, JSON.stringify(state));
    }, [storageKey, liveMatch?.matchId, currentMatchTime.value, currentLogIndex.value, isPaused.value, activeTab]);

    // --- LOGIQUE DE JEU ---

    // Chargement initial des données depuis la DB
    useEffect(() => {
        if (!currentSaveId || hasLoaded.current) return; // Utiliser hasLoaded pour un chargement unique

        const init = async () => {
            // Vérifie si les données complètes sont déjà dans le store (pour éviter de recharger lors de la navigation)
            const currentState = useLiveMatchStore.getState().liveMatch;
            const hasFullLogs = (currentState?.result?.debugLogs?.length ?? 0) > 0;
            if (currentState?.matchId && hasFullLogs) {
                hasLoaded.current = true; // Marquer comme chargé si déjà en store
                return; // Déjà chargé
            }

            // Charge depuis la DB (cas d'un rafraîchissement de page)
            await loadLiveMatchFromDb(currentSaveId);
            hasLoaded.current = true; // Marquer comme chargé après le fetch
        };
        init();
    }, [currentSaveId, loadLiveMatchFromDb]); // hasLoaded.current n'est pas une dépendance

    // Progression du temps
    useEffect(() => {
        if (isPaused.value || isFinished?.value || allLogs.length === 0) return;

        const interval = setInterval(() => {
            if (!isPaused.value && !isFinished?.value && currentMatchTime.value < maxTime) {
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
    }, [isPaused.value, isFinished?.value, allLogs.length, maxTime]);

    // Navigation manuelle
    const seekToLog = useCallback((index: number) => {
        isPaused.value = true;
        const targetLog = allLogs[index];
        if (targetLog) {
            currentLogIndex.value = index;
            currentMatchTime.value = targetLog.time;
        }
    }, [allLogs]);

    // Finalisation
    const handleFinalize = useCallback(async () => {
        // Fallback sur liveMatch si result/matchId sont manquants (cas des logs vides)
        const effectiveResult = result || liveMatch?.result;
        const effectiveMatchId = matchId || liveMatch?.matchId;

        if (!effectiveResult || !effectiveMatchId) return;

        try {
            const { db } = await import("@/core/db/db");
            const matchInDb = await db.matches.get(effectiveMatchId);
            
            if (!matchInDb) {
                alert("Erreur : Match non trouvé en base.");
                return;
            }

            await finalizeLiveMatch(effectiveResult);
            updateLiveMatchState({ currentTime: 0, isPaused: true }, currentSaveId ?? undefined);

            if (onShowReport) {
                onShowReport(effectiveMatchId);
            } else {
                window.location.hash = `/match-report/${effectiveMatchId}`;
            }
        } catch (error) {
            console.error("Erreur finalisation:", error);
        }
    }, [result, matchId, liveMatch, finalizeLiveMatch, onShowReport, updateLiveMatchState, currentSaveId]);

    // Écran de chargement
    if (!liveMatch?.result) {
        return (
            <div className="absolute inset-0 z-[200] flex items-center justify-center bg-slate-50">
                <Loader2 className="animate-spin text-slate-600" />
                <span className="ml-2 text-slate-500 text-xs">Préparation du terrain...</span>
            </div>
        );
    }

    // Cas où les logs sont vides ou invalides (erreur de sauvegarde ou match corrompu)
    // On vérifie si le premier log contient bien un 'bag' (structure de log valide)
    const isCorrupted = allLogs.length === 0;

    if (isCorrupted) {
        return (
            <div className="absolute inset-0 z-[200] flex flex-col items-center justify-center bg-slate-50 gap-4">
                <Package size={48} className="text-slate-300" />
                <p className="text-slate-500 font-medium">Données de match incomplètes ou corrompues.</p>
                <p className="text-slate-400 text-xs max-w-xs text-center">Le fichier de logs semble invalide. Cliquez ci-dessous pour voir le résultat.</p>
                <button onClick={handleFinalize} className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-bold">Voir le résultat</button>
            </div>
        );
    }

    // Sécurisation : le match ne peut être fini que si les logs sont chargés.
    const isActuallyFinished = allLogs.length > 0 && ((currentLogIndex.value >= allLogs.length - 1) || (isFinished?.value && currentLogIndex.value >= allLogs.length - 1));

    return (
        <div className="absolute inset-0 z-[200] flex flex-col bg-slate-50 overflow-hidden text-slate-900">
            {/* Croix de fermeture supprimée */}

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
                                title={`Sac (Zone ${stats.currentLog.value?.zone || '-'})`}
                                color="blue" 
                                log={stats.currentLog.value} 
                                homeTeamId={stats.homeId}
                                awayTeamId={stats.awayId}
                                drawnTokenId={null}
                                logIndex={stats.currentLog.value?.logIndex ?? currentLogIndex.value}
                                highlightDrawn={false}
                            />
                            <div className="p-3 bg-white rounded-xl border border-slate-100 flex items-start gap-3 shadow-sm">
                                <MessageSquare size={14} className="text-blue-500 mt-0.5" />
                                <p className="text-xs text-slate-600 italic leading-relaxed">
                                    {cleanText(stats.currentLog.value?.text, stats.currentLog.value?.drawnToken)}
                                </p>
                            </div>
                            <TokenBagDisplay 
                                title={`Sac (Zone ${stats.previousLog.value?.zone || '-'})`}
                                color="orange" 
                                log={stats.previousLog.value} 
                                homeTeamId={stats.homeId}
                                awayTeamId={stats.awayId}
                                drawnTokenId={stats.currentLog.value?.drawnToken?.id}
                                logIndex={stats.previousLog.value?.logIndex ?? (currentLogIndex.value - 1)}
                                highlightDrawn={true}
                            />
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

function TokenBagDisplay({ title, color, log, homeTeamId, awayTeamId, drawnTokenId, logIndex, highlightDrawn }: any) {
    const bag = log?.bag || [];
    const colorClass = color === 'blue' ? 'text-blue-600 bg-blue-50' : 'text-orange-600 bg-orange-50';

    return (
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-3">
                <h3 className={`text-[10px] font-black uppercase flex items-center gap-2 ${colorClass.split(' ')[0]}`}> 
                    <Package size={14} /> {title}
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold border border-slate-200 bg-slate-50 text-slate-700"> 
                    Log #{logIndex ?? '?'}
                </span>
            </div>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                {bag.map((token: any) => {
                    const isHomeToken = Number(token.teamId) === Number(homeTeamId);
                    const isAwayToken = Number(token.teamId) === Number(awayTeamId);
                    const isDrawn = drawnTokenId && String(token.id) === String(drawnTokenId);
                    let bgClass;
                    if (highlightDrawn && isDrawn) {
                        bgClass = 'bg-emerald-500 text-white';
                    } else if (isHomeToken) {
                        bgClass = 'bg-blue-600 border-blue-400 text-white';
                    } else if (isAwayToken) {
                        bgClass = 'bg-orange-500 border-orange-300 text-white';
                    } else {
                        bgClass = 'bg-gray-300 border-gray-400 text-gray-700';
                    }
                    return (
                        <div key={token.id} className="relative group">
                            <div 
                                title={`${token.type} - ${token.playerName || 'Collectif'}`}
                                className={`px-2 py-1 rounded text-[8px] font-bold transition-all ${bgClass} ${isDrawn && highlightDrawn ? 'scale-105 z-10' : 'opacity-90'} ${!isDrawn || !highlightDrawn ? 'border' : ''}`}
                            >
                                {token.type?.replace('_', ' ')}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}