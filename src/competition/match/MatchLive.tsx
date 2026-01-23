import { useGameStore } from "@/infrastructure/store/gameSlice";
import { useLiveMatchStore } from "@/infrastructure/store/liveMatchStore";
import { useSignal, useComputed } from "@preact/signals";
import { BarChart3, MessageSquareText, Users, Zap, ChevronRight, Activity, FastForward, Play, Pause, TrendingUp, Loader2, Target, AlertTriangle, Star } from "lucide-preact";
import { useEffect, useState, useMemo } from "preact/hooks";
import EventItem from "./components/EventItem";
import Scoreboard from "./components/Scoreboard";
import type { MatchEvent } from "@/core/engine/core/types";

export default function MatchLive({ onShowReport }: { onShowReport?: (id: number) => void }) {
	const finalizeLiveMatch = useGameStore((state) => state.finalizeLiveMatch);
	const liveMatch = useLiveMatchStore((state) => state.liveMatch);
    
    const tickIndex = useSignal(0);
	const isPaused = useSignal(true);
    const isGoalPause = useSignal(false);
    const [activeTab, setActiveTab] = useState<"flux" | "highlights" | "squad" | "stats">("flux");

    if (!liveMatch || !liveMatch.result) {
        return (
            <div className="absolute inset-0 z-[200] flex flex-col items-center justify-center bg-slate-50 gap-4">
                <Loader2 className="animate-spin text-slate-400" size={32} />
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Préparation du live...</p>
            </div>
        );
    }

    const result = liveMatch.result;
    
    // On synchronise sur le ballHistory pour le momentum
    const totalTicks = result.ballHistory && result.ballHistory.length > 0 ? result.ballHistory.length : 192; 
    
    const currentMinute = useComputed(() => {
        const progress = tickIndex.value / totalTicks;
        return Math.min(96, Math.floor(progress * 96));
    });

    const isFinished = useComputed(() => tickIndex.value >= totalTicks - 1);

    const cleanDesc = (desc: string) => {
        if (!desc) return "";
        return desc.replace(/\[#\w+:\d+\]|\[#\d+:\w+\]/g, "").trim();
    };

    const pastEvents = useComputed(() => {
        const min = currentMinute.value;
        const filtered = (result.events || []).filter(e => e.minute <= min);
        return filtered.sort((a,b) => (b.minute*60 + (b.second||0)) - (a.minute*60 + (a.second||0)))
                       .map(e => ({ ...e, description: cleanDesc(e.description || e.text || "Action inconnue") }));
    });

    const highlights = useComputed(() => pastEvents.value.filter(e => ["GOAL", "CARD", "INJURY", "CHANCE"].includes(e.type)));

    const liveStats = useComputed(() => {
        const events = pastEvents.value;
        const hId = liveMatch.homeTeam.id;

        const hPasses = events.filter(e => e.description.includes("passe") && e.teamId === hId).length;
        const aPasses = events.filter(e => e.description.includes("passe") && e.teamId !== hId).length;
        const totalPasses = hPasses + aPasses || 1;
        const hPoss = Math.round((hPasses / totalPasses) * 100);

        const safeDescIncludes = (e: any, term: string) => (e.description || "").includes(term);

        return {
            hScore: events.filter(e => e.type === "GOAL" && e.teamId === hId).length,
            aScore: events.filter(e => e.type === "GOAL" && e.teamId !== hId).length,
            hShots: events.filter(e => (e.type === "SHOT" || e.description.includes("TIR")) && e.teamId === hId).length,
            aShots: events.filter(e => (e.type === "SHOT" || e.description.includes("TIR")) && e.teamId !== hId).length,
            hCorners: events.filter(e => e.type === "CORNER" && e.teamId === hId).length,
            aCorners: events.filter(e => e.type === "CORNER" && e.teamId !== hId).length,
            hYellows: events.filter(e => e.type === "CARD" && e.teamId === hId && !safeDescIncludes(e, "ROUGE") && !safeDescIncludes(e, "expulsé")).length,
            aYellows: events.filter(e => e.type === "CARD" && e.teamId !== hId && !safeDescIncludes(e, "ROUGE") && !safeDescIncludes(e, "expulsé")).length,
            hReds: events.filter(e => e.type === "CARD" && e.teamId === hId && (safeDescIncludes(e, "ROUGE") || safeDescIncludes(e, "expulsé"))).length,
            aReds: events.filter(e => e.type === "CARD" && e.teamId !== hId && (safeDescIncludes(e, "ROUGE") || safeDescIncludes(e, "expulsé"))).length,
            hXG: events.filter(e => e.teamId === hId && (e.type === "SHOT" || e.type === "GOAL")).length * 0.12,
            aXG: events.filter(e => e.teamId !== hId && (e.type === "SHOT" || e.type === "GOAL")).length * 0.12,
            hChances: events.filter(e => e.type === "CHANCE" && e.teamId === hId).length,
            aChances: events.filter(e => e.type === "CHANCE" && e.teamId !== hId).length,
            hPasses, aPasses,
            hShotsOnTarget: events.filter(e => e.teamId === hId && (e.type === "GOAL" || safeDescIncludes(e, "CADRÉ") || safeDescIncludes(e, "gardien"))).length,
            aShotsOnTarget: events.filter(e => e.teamId !== hId && (e.type === "GOAL" || safeDescIncludes(e, "CADRÉ") || safeDescIncludes(e, "gardien"))).length,
            hPoss: hPoss
        };
    });

    const homeScorers = useComputed(() => 
        pastEvents.value.filter(e => e.type === "GOAL" && e.teamId === liveMatch.homeTeam.id)
                  .map(e => ({ name: e.scorerName || "Joueur", minute: e.minute }))
    );

    const awayScorers = useComputed(() => 
        pastEvents.value.filter(e => e.type === "GOAL" && e.teamId === liveMatch.awayTeam.id)
                  .map(e => ({ name: e.scorerName || "Joueur", minute: e.minute }))
    );

    useEffect(() => {
        const timer = setInterval(() => {
            if (!isPaused.value && !isGoalPause.value && tickIndex.value < totalTicks) {
                const next = tickIndex.value + 1;
                const min = Math.floor((next / totalTicks) * 96);
                
                // Pause sur but
                const justScored = result.events.find(e => e.type === "GOAL" && e.minute === min && !e._seen);
                if (justScored) {
                    isGoalPause.value = true; 
                    // @ts-ignore
                    justScored._seen = true; 
                    setTimeout(() => isGoalPause.value = false, 3000);
                }
                tickIndex.value = next;
            }
        }, 150); // Vitesse rapide pour un bon flux
        return () => clearInterval(timer);
    }, [totalTicks]);

    const handleSkip = () => { tickIndex.value = totalTicks - 1; };
    const handleFinalize = async () => { await finalizeLiveMatch(result); if (onShowReport) onShowReport(liveMatch.matchId); };

	return (
		<div className="absolute inset-0 z-[200] flex flex-col bg-slate-50 animate-fade-in overflow-hidden text-slate-900">
			<Scoreboard
				homeTeam={liveMatch.homeTeam} awayTeam={liveMatch.awayTeam}
				homeScore={useComputed(() => liveStats.value.hScore)} awayScore={useComputed(() => liveStats.value.aScore)} 
                minute={currentMinute} homeScorers={homeScorers} awayScorers={awayScorers}
				possession={useComputed(() => liveStats.value.hPoss)} isFinished={isFinished.value} stoppageTime={useSignal(result.stoppageTime || 0)}
			/>

            <div className="flex-1 flex flex-col overflow-hidden px-4 pt-4 gap-3">
                
                {/* Visualisation Principale : MOMENTUM OPTA */}
                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm relative overflow-hidden flex flex-col justify-center min-h-[160px]">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2">
                            <TrendingUp size={14} className={isGoalPause.value ? 'text-emerald-500' : 'text-slate-400'} />
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{isGoalPause.value ? 'BUT !' : 'Domination'}</span>
                        </div>
                    </div>
                    <MomentumChart 
                        ballHistory={result.ballHistory || []} 
                        currentTick={tickIndex.value} 
                        events={result.events || []} 
                        homeTeamId={liveMatch.homeTeam.id} 
                        totalTicks={totalTicks} 
                    />
                </div>

                <div className="flex bg-slate-200/50 rounded-xl p-1 border border-slate-200 overflow-x-auto no-scrollbar">
                    {["flux", "highlights", "squad", "stats"].map(t => (
                        <button key={t} onClick={() => setActiveTab(t as any)} className={`flex-1 py-2 px-3 text-[9px] font-black uppercase rounded-lg transition-all ${activeTab === t ? "bg-white text-slate-900 shadow-sm" : "text-slate-400"}`}>{t}</button>
                    ))}
                </div>

                <div className="flex-1 overflow-y-auto pb-24">
                    {activeTab === "flux" && <div className="space-y-2">{[...pastEvents.value].slice(0, 15).map((e, i) => <div key={i} className="bg-white border rounded-xl p-1 shadow-sm"><EventItem event={e} homeTeamId={liveMatch.homeTeam.id} /></div>)}</div>}
                    {activeTab === "highlights" && <div className="space-y-2">{[...highlights.value].reverse().map((e, i) => <div key={i} className="bg-white border rounded-xl p-1 shadow-sm"><EventItem event={e} homeTeamId={liveMatch.homeTeam.id} /></div>)}</div>}
                    {activeTab === "squad" && (
                        <div className="flex flex-col gap-2">
                             <div className="p-4 text-center text-xs text-slate-400 font-bold uppercase">Notes disponibles fin de match</div>
                        </div>
                    )}
                    {activeTab === "stats" && (
                        <div className="space-y-4 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                            <StatRow label="Possession" h={liveStats.value.hPoss} a={100 - liveStats.value.hPoss} unit="%" />
                            <StatRow label="Expected Goals" h={liveStats.value.hXG.toFixed(2)} a={liveStats.value.aXG.toFixed(2)} />
                            <StatRow label="Occasions" h={liveStats.value.hChances} a={liveStats.value.aChances} />
                            <StatRow label="Tirs" h={liveStats.value.hShots} a={liveStats.value.aShots} />
                            <StatRow label="Tirs cadrés" h={liveStats.value.hShotsOnTarget} a={liveStats.value.aShotsOnTarget} />
                            <StatRow label="Passes" h={liveStats.value.hPasses} a={liveStats.value.aPasses} />
                            <StatRow label="Corners" h={liveStats.value.hCorners} a={liveStats.value.aCorners} />
                            <StatRow label="Cartons jaunes" h={liveStats.value.hYellows} a={liveStats.value.aYellows} />
                            <StatRow label="Cartons rouges" h={liveStats.value.hReds} a={liveStats.value.aReds} />
                        </div>
                    )}
                </div>
            </div>

            <div className="absolute bottom-0 inset-x-0 bg-white/80 backdrop-blur-xl border-t border-slate-200 p-4 flex items-center justify-between z-50">
                <div className="flex items-center gap-4">
                    {!isFinished.value && (
                        <>
                            <button onClick={() => isPaused.value = !isPaused.value} className="w-12 h-12 rounded-2xl flex items-center justify-center bg-slate-100 text-slate-600 border border-slate-200">{isPaused.value ? <Play size={24} /> : <Pause size={24} />}</button>
                            <button onClick={handleSkip} className="w-12 h-12 rounded-2xl flex items-center justify-center bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200"><FastForward size={24} /></button>
                        </>
                    )}
                    <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{isFinished.value ? 'Match Terminé' : 'Simulation'}</p>
                        <p className="text-xs font-black text-slate-900 uppercase tracking-tighter">{liveMatch.homeTeam.name} vs {liveMatch.awayTeam.name}</p>
                    </div>
                </div>
                {isFinished.value && <button onClick={handleFinalize} className="px-6 py-2.5 bg-slate-900 rounded-full text-[10px] font-black uppercase text-white shadow-lg">Voir le rapport</button>}
            </div>
		</div>
	);
}

function PlayerStatsCell({ playerId, result, tickIndex, side }: { playerId: number, result: any, tickIndex: number, side: 'home' | 'away' }) {
    return <div className="w-8"></div>;
}

function MomentumChart({ ballHistory, currentTick, events, homeTeamId, totalTicks }: { ballHistory: number[], currentTick: number, events: MatchEvent[], homeTeamId: number, totalTicks: number }) {
    // On veut afficher ~60 barres pour couvrir le match
    const barCount = 60; 
    const ticksPerBar = Math.max(1, Math.floor(totalTicks / barCount));

    const bars = useMemo(() => {
        if (!ballHistory || ballHistory.length === 0) return [];
        const res = [];
        
        for (let i = 0; i < barCount; i++) {
            const start = i * ticksPerBar;
            const end = Math.min(ballHistory.length, (i + 1) * ticksPerBar);
            
            // Moyenne du momentum sur la période
            let sum = 0; let count = 0;
            for(let j = start; j < end; j++) {
                if (ballHistory[j] !== undefined) { sum += ballHistory[j]; count++; }
            }
            // Momentum Opta : -10 (Away GK) à +10 (Home GK)
            const avgMomentum = count > 0 ? sum / count : 0;

            // Détection Event
            const minTime = (start / totalTicks) * 96; 
            const maxTime = (end / totalTicks) * 96;
            const goalEvent = events.find(e => e.type === "GOAL" && e.minute >= minTime && e.minute < maxTime);
            const goalType = goalEvent ? (goalEvent.teamId === homeTeamId ? 'HOME' : 'AWAY') : 'NONE';

            res.push({ val: avgMomentum, goalType }); 
        }
        return res;
    }, [ballHistory, events, homeTeamId, totalTicks]);

    return (
        <div className="flex items-end justify-between h-20 gap-0.5 relative pt-4 pb-4 select-none">
            {/* Ligne médiane (Neutre) */}
            <div className="absolute top-1/2 left-0 right-0 h-px bg-slate-100 -translate-y-1/2 pointer-events-none z-0" />
            {/* Ligne Mi-temps */}
            <div className="absolute top-0 bottom-0 w-px bg-slate-400/20 z-0 pointer-events-none" style={{ left: '50%' }} />

            {bars.map((bar, i) => {
                const barTickStart = i * ticksPerBar;
                const isPast = barTickStart <= currentTick;
                
                // Hauteur dynamique : max 100% (pour val=10), min 5%
                // Le momentum est signé : + = Home (Haut), - = Away (Bas)
                // Mais pour le rendu "BarChart" classique type Opta :
                // Les barres partent du centre (50%)
                
                const heightPercent = Math.min(100, Math.abs(bar.val) * 10); // Scale factor
                const isHome = bar.val >= 0;

                return (
                    <div key={i} className="flex-1 flex flex-col h-full relative items-center group">
                        {/* Indicateur de But */}
                        {isPast && bar.goalType !== 'NONE' && (
                            <div className={`absolute z-20 ${bar.goalType === 'HOME' ? '-top-3' : '-bottom-3'}`}>
                                <div className={`w-2 h-2 rounded-full shadow-sm border border-white ${bar.goalType === 'HOME' ? 'bg-blue-600' : 'bg-orange-600'}`} />
                            </div>
                        )}

                        {/* Barre de Momentum */}
                        {/* On positionne par rapport au centre (50%) */}
                        <div 
                            className={`absolute w-full rounded-sm transition-all duration-500
                                ${!isPast ? 'bg-slate-100 opacity-0' : (isHome ? 'bg-blue-500' : 'bg-orange-500')}
                            `} 
                            style={{ 
                                height: `${heightPercent / 2}%`, // On divise par 2 car on part du centre
                                bottom: isHome ? '50%' : 'auto', 
                                top: !isHome ? '50%' : 'auto', 
                                opacity: isPast ? 0.9 : 0 
                            }} 
                        />
                    </div>
                );
            })}
        </div>
    );
}

function StatRow({ label, h, a, unit = "" }: { label: string, h: any, a: any, unit?: string }) {
    const valH = Number(h) || 0; const valA = Number(a) || 0;
    const total = valH + valA || 1;
    return (
        <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-400">
                <span className="text-slate-900 w-12 font-mono">{valH}{unit}</span>
                <span className="flex-1 text-center text-[9px] font-black">{label}</span>
                <span className="text-slate-900 w-12 text-right font-mono">{valA}{unit}</span>
            </div>
            <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden flex relative">
                <div className="h-full bg-blue-600 transition-all duration-1000" style={{ width: `${(valH/total)*100}%` }} />
                <div className="h-full bg-orange-500 transition-all duration-1000" style={{ width: `${(valA/total)*100}%` }} />
            </div>
        </div>
    );
}
