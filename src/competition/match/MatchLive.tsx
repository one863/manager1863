import PlayersTab from "./components/PlayersTab";
import StatsTab from "./components/StatsTab";
import { useGameStore } from "@/infrastructure/store/gameSlice";
import { useLiveMatchStore } from "@/infrastructure/store/liveMatchStore";
import { useSignal, useComputed } from "@preact/signals";
import useLiveMatchStats from "./components/useLiveMatchStats";
import { Loader2, Package, MapPin, Users, BarChart3, MessageSquare, ArrowDown } from "lucide-preact";
import { useEffect, useState, useRef, useCallback, useMemo } from "preact/hooks";

import EventItem from "./components/EventItem";
import HighlightsTab from "./components/HighlightsTab";
import Scoreboard from "./components/Scoreboard";
import MomentumChart from "./components/MomentumChart";
import PitchView from "./components/PitchView";
import MatchControls from "./components/MatchControls";
import StatRow from "./components/StatRow";
import PlayerColumn from "./components/PlayerColumn";

// Constantes
const TABS = [
    { id: "live", icon: Package },
    { id: "highlights", icon: MapPin },
    { id: "stats", icon: BarChart3 },
    { id: "players", icon: Users }
] as const;

type TabId = typeof TABS[number]['id'];

// Utilitaires
const cleanText = (text?: string) => text?.replace(/undefined|Collectif/g, "L'équipe") || '...';

export default function MatchLive({ onShowReport }: { onShowReport?: (id: number) => void }) {
    // Stores
    const finalizeLiveMatch = useGameStore((s) => s.finalizeLiveMatch);
    const currentSaveId = useGameStore((s) => s.currentSaveId);
    const liveMatch = useLiveMatchStore((s) => s.liveMatch);
    const loadLiveMatchFromDb = useLiveMatchStore((s) => s.loadLiveMatchFromDb);

    // État local et signaux
    const hasLoaded = useRef(false);
    const currentMatchTime = useSignal(0);
    const isPaused = useSignal(true);
    const [activeTab, setActiveTab] = useState<TabId>("live");
    const currentLogIndex = useSignal(0);

    // Chargement initial
    useEffect(() => {
        if (!hasLoaded.current && !liveMatch && currentSaveId) {
            hasLoaded.current = true;
            loadLiveMatchFromDb(currentSaveId);
        }
    }, [currentSaveId, liveMatch, loadLiveMatchFromDb]);

    // Données et calculs extraits dans un hook custom
    const {
        result, homeTeam, awayTeam, matchId, homePlayersList, awayPlayersList,
        allLogs, maxTime, homeId, awayId, currentLogsByIndex, homeScore, awayScore,
        homeScorers, awayScorers, currentMinute, isFinished, currentStoppageTime,
        currentLog, previousLog, displayPos, effectiveTeamId, isKickOffSituation, ratings
    } = useLiveMatchStats(liveMatch, currentLogIndex, currentMatchTime);

    // Stats du sac (inchangé)
    const bagStats = useComputed(() => {
        const bag = currentLog.value?.bag || [];
        const isKickOff = currentLog.value?.time === 0;
        if (bag.length === 0 || (bag.length === 1 && !isKickOff)) {
            return { total: 0, sides: { h: { count: 0, types: {} }, a: { count: 0, types: {} }, n: { count: 0, types: {} } } };
        }
        const total = bag.length;
        const stats: Record<string, { count: number; types: Record<string, number> }> = {
            h: { count: 0, types: {} }, a: { count: 0, types: {} }, n: { count: 0, types: {} }
        };
        for (const t of bag) {
            const side = String(t.teamId) === String(homeId) ? 'h' : String(t.teamId) === String(awayId) ? 'a' : 'n';
            stats[side].count++;
            stats[side].types[t.type] = (stats[side].types[t.type] || 0) + 1;
        }
        return { total, sides: stats };
    });

    // Analysis & Momentum (simplifiés pour lecture)
    const matchAnalysis = useComputed(() => ({ stats: { h: {}, a: {} }, ratings: [] } as any)); // Placeholder simplifié
    const sampledMomentum = useComputed(() => {
        const momentum = Array.isArray(result?.ballHistory) ? result.ballHistory : [];
        const progressRatio = currentMatchTime.value / maxTime;
        const visibleCount = Math.ceil(momentum.length * progressRatio);
        return momentum.slice(0, visibleCount);
    });

    // --- EFFETS ET HANDLERS (Time Loop) ---
    // Synchronisation index <-> temps :
    // Si l’index est modifié manuellement (stepBack/stepForward), on ne force pas l’index à partir du temps
    // On ne synchronise que si le temps est modifié par la lecture automatique
    useEffect(() => {
        if (allLogs.length === 0) return;
        // Si le temps est modifié par la lecture auto, on synchronise l’index
        if (!isPaused.value) {
            if (currentMatchTime.value === 0) {
                currentLogIndex.value = 0;
                return;
            }
            const idx = Math.max(0, allLogs.findLastIndex((l: any) => l.time <= currentMatchTime.value));
            if (idx !== currentLogIndex.value) currentLogIndex.value = idx;
        }
    }, [currentMatchTime.value, allLogs, isPaused.value]);

    useEffect(() => {
        if (isPaused.value) return;
        const interval = setInterval(() => {
            if (currentMatchTime.value < maxTime) currentMatchTime.value += 1;
            else isPaused.value = true;
        }, 100);
        return () => clearInterval(interval);
    }, [isPaused.value, maxTime]);

    const handleGoToStart = useCallback(() => { isPaused.value = true; currentMatchTime.value = 0; currentLogIndex.value = 0; }, []);
    const handleStepBack = useCallback(() => {
        if (currentLogIndex.value <= 0) return;
        isPaused.value = true;
        currentLogIndex.value = currentLogIndex.value - 1;
        // On ne touche pas au temps, l’index pilote l’affichage
    }, []);
    const handleStepForward = useCallback(() => {
        if (currentLogIndex.value >= allLogs.length - 1) return;
        isPaused.value = true;
        currentLogIndex.value = currentLogIndex.value + 1;
        // On ne touche pas au temps, l’index pilote l’affichage
    }, [allLogs]);
    const handleSkip = useCallback(() => { isPaused.value = true; currentLogIndex.value = allLogs.length - 1; currentMatchTime.value = maxTime; }, [allLogs, maxTime]);
    const handleFinalize = useCallback(async () => { if (result && matchId) { await finalizeLiveMatch(result); onShowReport?.(matchId); } }, [finalizeLiveMatch, result, onShowReport, matchId]);

    // Événements Highlights (simplifié)
    const computedVisibleEvents = useComputed(() => currentLogsByIndex.value.filter((l: any) => l.eventSubtype === 'GOAL').slice(-5));

    if (!liveMatch?.result) return <div className="absolute inset-0 z-[200] flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-slate-600" /></div>;

    return (
        <div className="absolute inset-0 z-[200] flex flex-col bg-slate-50 overflow-hidden text-slate-900">
            <Scoreboard
                homeTeam={homeTeam!} awayTeam={awayTeam!} homeScore={homeScore} awayScore={awayScore}
                minute={currentMinute} homeScorers={homeScorers} awayScorers={awayScorers}
                possession={sampledMomentum} isFinished={isFinished.value} stoppageTime={currentStoppageTime}
            />

            <div className="flex-1 flex flex-col overflow-hidden px-4 pt-4 gap-3">
                {activeTab !== "live" ? (
                    <MomentumChart momentum={sampledMomentum} currentTime={currentMatchTime.value} maxTime={maxTime} />
                ) : (
                    <PitchView
                        displayPos={displayPos}
                        effectiveTeamId={effectiveTeamId}
                        homeTeamId={homeId!}
                        awayTeamId={awayId!}
                        currentLog={currentLog}
                        previousLog={previousLog}
                    />
                )}

                <div className="flex bg-slate-200/50 rounded-xl p-1 border border-slate-200 shadow-sm">
                    {TABS.map(({ id, icon: Icon }) => (
                        <button key={id} onClick={() => setActiveTab(id)} className={`flex-1 py-2 flex items-center justify-center gap-2 text-[9px] font-black uppercase rounded-lg ${activeTab === id ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"}`}>
                            <Icon size={12} /> {id}
                        </button>
                    ))}
                </div>

                <div className="flex-1 overflow-y-auto pb-24 scrollbar-hide">
                    {activeTab === "live" && (
                        <div className="space-y-4">
                            {/* --- 1. LE PRÉSENT (LOG N) : Les Possibles --- */}
                            {/* Architecture: On montre le sac actuel, mais AUCUN jeton n'est allumé car le choix n'est pas encore fait pour le futur */}
                            <BagStatsPanel
                                bagStats={bagStats.value}
                                bag={currentLog.value?.bag || []}
                                homeId={homeId!}
                                awayId={awayId!}
                                possessionTeamId={currentLog.value?.possessionTeamId}
                                displayPos={displayPos.value}
                                currentLogText={cleanText(currentLog.value?.text)}
                                drawnTokenId={null} // FORCE NULL : On ne montre pas de résultat ici
                                title={`SITUATION ACTUELLE (LOG ${currentLogIndex.value})`}
                                isFuture={true}
                            />

                            {/* --- 2. LE PASSÉ (LOG N-1) : L'Explication --- */}
                            {/* Architecture: On montre le sac précédent et on illumine le jeton qui a créé la situation actuelle */}
                            {!isKickOffSituation.value && currentLogIndex.value > 0 && previousLog.value && (
                                <div className="relative animate-fade-in-up">
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10 bg-slate-200 text-slate-500 rounded-full p-1 border border-white">
                                        <ArrowDown size={12} />
                                    </div>
                                    <BagStatsPanel
                                        bagStats={null}
                                        bag={previousLog.value.bag}
                                        homeId={homeId!}
                                        awayId={awayId!}
                                        possessionTeamId={previousLog.value.possessionTeamId}
                                        displayPos={previousLog.value.ballPosition || { x: 2, y: 2 }}
                                        currentLogText={cleanText(previousLog.value.text)}
                                        // On passe l'ID du token qui se trouve dans le Log N (car c'est le résultat du tirage du Log N-1)
                                        drawnTokenId={currentLog.value?.drawnToken?.id} 
                                        title={`ACTION PRÉCÉDENTE (LOG ${currentLogIndex.value - 1})`}
                                        isPast={true}
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === "highlights" && (
                        <HighlightsTab logs={allLogs} />
                    )}
                    {activeTab === "stats" && (
                        <StatsTab stats={result?.stats} homeTeam={homeTeam} awayTeam={awayTeam} />
                    )}
                    {activeTab === "players" && (
                        <PlayersTab homePlayers={homePlayersList} awayPlayers={awayPlayersList} homeTeam={homeTeam} awayTeam={awayTeam} ratings={ratings} />
                    )}
                </div>
            </div>

            <MatchControls
                isPaused={isPaused} isFinished={isFinished.value}
                onGoToStart={handleGoToStart} onStepBack={handleStepBack}
                onStepForward={handleStepForward} onSkip={handleSkip}
                onFinalize={handleFinalize} disableStepBack={currentLogIndex.value <= 0}
            />
        </div>
    );
}

// --- SOUS-COMPOSANT MIS À JOUR ---

function BagStatsPanel({ bagStats, bag, homeId, awayId, possessionTeamId, displayPos, currentLogText, drawnTokenId, title, isFuture, isPast }: {
    bagStats: any;
    bag: any[];
    homeId: number;
    awayId: number;
    possessionTeamId: number;
    displayPos: { x: number; y: number };
    currentLogText: string;
    drawnTokenId?: string | null;
    title?: string;
    isFuture?: boolean;
    isPast?: boolean;
}) {
    const safeBag = Array.isArray(bag) ? bag : [];
    const hasBagContent = safeBag.length > 0;
    
    // Styles conditionnels basés sur le temps (Passé vs Futur)
    const containerStyle = isPast 
        ? "bg-slate-50 border-slate-200 opacity-90" 
        : "bg-white border-blue-200 shadow-md ring-1 ring-blue-50";

    const titleStyle = isPast
        ? "text-slate-400"
        : "text-blue-600 font-extrabold";

    const getTokenColor = (teamId: any) => {
        if (String(teamId) === String(homeId)) return 'bg-blue-50 text-blue-700 border-blue-100';
        if (String(teamId) === String(awayId)) return 'bg-orange-50 text-orange-700 border-orange-100';
        return 'bg-slate-50 text-slate-600 border-slate-100';
    };

    const tokensPoss = safeBag.filter(t => String(t.teamId) === String(possessionTeamId));
    const tokensOther = safeBag.filter(t => String(t.teamId) !== String(possessionTeamId));
    const typeCounts = safeBag.reduce((acc: Record<string, number>, t: any) => {
        acc[t.type] = (acc[t.type] || 0) + 1;
        return acc;
    }, {});

    const isDrawn = (t: any) => drawnTokenId && String(t.id) === String(drawnTokenId);

    return (
        <div className={`rounded-2xl p-3 border transition-all duration-500 ${containerStyle}`}>
            {title && (
                <div className={`text-[9px] uppercase tracking-widest mb-2 ${titleStyle}`}>{title}</div>
            )}
            
            <div className="flex flex-col gap-1.5 mb-2 pb-2 border-b border-slate-100/50">
                {hasBagContent && (
                    <div className="flex justify-between items-center">
                        <span className="text-[9px] font-bold uppercase text-slate-400 flex items-center gap-1">
                            <Package size={10} /> {bag.length} Options
                        </span>
                        <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-mono">
                            Zone {displayPos.x},{displayPos.y}
                        </span>
                    </div>
                )}
                <div className="flex items-start gap-2 px-2 py-1.5 rounded-lg bg-slate-50/50 border border-slate-100/50">
                    <MessageSquare size={10} className="text-slate-400 mt-0.5 shrink-0" />
                    <p className="text-[11px] text-slate-600 leading-tight font-medium italic">
                        {currentLogText ? `"${currentLogText}"` : "..."}
                    </p>
                </div>
            </div>

            {hasBagContent && (
                <div className="space-y-2">
                    {/* Groupe Possession */}
                    <div className="flex flex-wrap gap-1.5">
                        {tokensPoss.map((t: any, i: number) => {
                            const active = isDrawn(t);
                            return (
                                <div
                                    key={i}
                                    className={`
                                        px-2 py-1 rounded-md border text-[10px] font-mono flex items-center justify-center transition-all duration-300
                                        ${active 
                                            ? 'bg-emerald-500 text-white border-emerald-600 shadow-lg scale-110 font-bold z-10' 
                                            : getTokenColor(t.teamId) + (isPast && !active ? ' opacity-40 blur-[0.5px] scale-95' : '')
                                        }
                                    `}
                                >
                                    <span className="uppercase">{t.position || '*'} {t.type} {typeCounts[t.type] > 1 && <span className="text-[8px] opacity-70 ml-1">x{typeCounts[t.type]}</span>}</span>
                                </div>
                            );
                        })}
                    </div>
                    
                    {/* Groupe Adversaire/Neutre */}
                    {tokensOther.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1 border-t border-slate-50">
                            {tokensOther.map((t: any, i: number) => {
                                const active = isDrawn(t);
                                return (
                                    <div
                                        key={i}
                                        className={`
                                            px-2 py-1 rounded-md border text-[10px] font-mono flex items-center justify-center transition-all duration-300
                                            ${active 
                                                ? 'bg-emerald-500 text-white border-emerald-600 shadow-lg scale-110 font-bold z-10' 
                                                : getTokenColor(t.teamId) + (isPast && !active ? ' opacity-40 blur-[0.5px] scale-95' : '')
                                            }
                                        `}
                                    >
                                        <span className="uppercase">{t.position || '*'} {t.type}</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}