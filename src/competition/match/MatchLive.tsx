import { useGameStore } from "@/infrastructure/store/gameSlice";
import { useLiveMatchStore } from "@/infrastructure/store/liveMatchStore";
import { useSignal, useComputed } from "@preact/signals";
import { TrendingUp, Loader2, Play, Pause, FastForward, StepForward, StepBack, Package, MapPin, BarChart2 } from "lucide-preact";
import { useEffect, useState } from "preact/hooks";
import EventItem from "./components/EventItem";
import Scoreboard from "./components/Scoreboard";

export default function MatchLive({ onShowReport }: { onShowReport?: (id: number) => void }) {
	const finalizeLiveMatch = useGameStore((state) => state.finalizeLiveMatch);
	const liveMatch = useLiveMatchStore((state) => state.liveMatch);
    
    const currentMatchTime = useSignal(0);
	const isPaused = useSignal(true); 
    const isGoalPause = useSignal(false);
    const [activeTab, setActiveTab] = useState<"flux" | "2d" | "stats">("flux");

    const result = liveMatch?.result;
    const maxTime = 5700; 
    
    const currentMinute = useComputed(() => Math.floor(currentMatchTime.value / 60));
    const isFinished = useComputed(() => currentMatchTime.value >= maxTime);

    const pastEvents = useComputed(() => {
        if (!result) return [];
        const now = currentMatchTime.value;
        return (result.events || [])
            .filter(e => (e.minute * 60) + (e.second || 0) <= now)
            .sort((a,b) => (b.minute*60 + (b.second||0)) - (a.minute*60 + (a.second||0)));
    });

    const currentLog = useComputed(() => {
        if (!result) return null;
        const logs = result.debugLogs || [];
        return logs.findLast(l => l.time <= currentMatchTime.value);
    });

    const currentBallPos = useComputed(() => currentLog.value?.ballPosition || { x: 2, y: 2 });

    const bagStats = useComputed(() => {
        if (!result) return [];
        const bag = currentLog.value?.bag || [];
        if (bag.length === 0) return [];
        const types = [...new Set(bag.map((t: any) => t.type))];
        return types.map(type => {
            const count = bag.filter((t: any) => t.type === type).length;
            return { type, count, percent: Math.round((count / bag.length) * 100) };
        }).sort((a, b) => b.count - a.count);
    });

    const drawnTokensStats = useComputed(() => {
        if (!result) return [];
        const logs = (result.debugLogs || []).filter(l => l.time <= currentMatchTime.value && l.drawnToken);
        const stats: Record<string, number> = {};
        logs.forEach(l => {
            const type = l.drawnToken!.type;
            stats[type] = (stats[type] || 0) + 1;
        });
        const total = logs.length || 1;
        return Object.entries(stats).map(([type, count]) => ({
            type, count, percent: Math.round((count / total) * 100)
        })).sort((a, b) => b.count - a.count);
    });

    const homeScorers = useComputed(() => {
        if (!liveMatch) return [];
        return pastEvents.value.filter(e => e.type === "GOAL" && e.teamId === liveMatch.homeTeam.id)
                  .map(e => ({ name: e.text.split(' ')[2] || "Joueur", minute: e.minute }))
    });

    const awayScorers = useComputed(() => {
        if (!liveMatch) return [];
        return pastEvents.value.filter(e => e.type === "GOAL" && e.teamId === liveMatch.awayTeam.id)
                  .map(e => ({ name: e.text.split(' ')[2] || "Joueur", minute: e.minute }))
    });

    const liveStats = useComputed(() => {
        const events = pastEvents.value;
        const hId = liveMatch?.homeTeam?.id || 0;
        const momentumIdx = Math.floor((currentMatchTime.value / maxTime) * 99);
        const currentMomentum = result?.ballHistory ? result.ballHistory[momentumIdx] : 0;
        
        return {
            hScore: events.filter(e => e.type === "GOAL" && e.teamId === hId).length,
            aScore: events.filter(e => e.type === "GOAL" && e.teamId !== hId).length,
            hPoss: Math.round(50 + (currentMomentum || 0) * 2.5),
            hShots: events.filter(e => e.type === "SHOT" && e.teamId === hId).length,
            aShots: events.filter(e => e.type === "SHOT" && e.teamId !== hId).length,
            hPasses: events.filter(e => e.type === "PASS" && e.teamId === hId).length,
            aPasses: events.filter(e => e.type === "PASS" && e.teamId !== hId).length,
        };
    });

    useEffect(() => {
        if (!result) return;
        const timer = setInterval(() => {
            if (!isPaused.value && !isGoalPause.value && currentMatchTime.value < maxTime) {
                const next = currentMatchTime.value + 1;
                const goal = (result.events || []).find(e => (e.minute * 60) + (e.second || 0) === next && e.type === "GOAL");
                if (goal) {
                    isGoalPause.value = true;
                    setTimeout(() => isGoalPause.value = false, 3000);
                }
                currentMatchTime.value = next;
            }
        }, 30); 
        return () => clearInterval(timer);
    }, [result, maxTime]);

    const handleSkip = () => { currentMatchTime.value = maxTime; };
    
    const handleNextStep = () => {
        if (!result) return;
        isPaused.value = true;
        const logs = result.debugLogs || [];
        const nextLog = logs.find(l => l.time > currentMatchTime.value);
        if (nextLog) {
            currentMatchTime.value = nextLog.time;
        } else if (currentMatchTime.value < maxTime) {
            currentMatchTime.value = Math.min(maxTime, currentMatchTime.value + 10);
        }
    };

    const handlePrevStep = () => {
        if (!result) return;
        isPaused.value = true;
        const logs = result.debugLogs || [];
        const prevLog = logs.findLast(l => l.time < currentMatchTime.value);
        if (prevLog) {
            currentMatchTime.value = prevLog.time;
        } else {
            currentMatchTime.value = 0;
        }
    };

    const handleFinalize = async () => { if (result) await finalizeLiveMatch(result); if (onShowReport && liveMatch) onShowReport(liveMatch.matchId); };

    if (!liveMatch || !result) {
        return (
            <div className="absolute inset-0 z-[200] flex flex-col items-center justify-center bg-slate-50 gap-4">
                <Loader2 className="animate-spin text-slate-400" size={32} />
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Simulation en cours...</p>
            </div>
        );
    }

	return (
		<div className="absolute inset-0 z-[200] flex flex-col bg-slate-50 overflow-hidden text-slate-900">
			<Scoreboard
				homeTeam={liveMatch.homeTeam} awayTeam={liveMatch.awayTeam}
				homeScore={useComputed(() => liveStats.value.hScore)} awayScore={useComputed(() => liveStats.value.aScore)} 
                minute={currentMinute} homeScorers={homeScorers} awayScorers={awayScorers}
				possession={useComputed(() => liveStats.value.hPoss)} isFinished={isFinished.value} stoppageTime={useSignal(result.stoppageTime || 0)}
			/>

            <div className="flex-1 flex flex-col overflow-hidden px-4 pt-4 gap-3">
                <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden relative transition-all duration-300 ${activeTab === '2d' ? 'flex-[1.2] min-h-[200px]' : 'h-32 flex-none'}`}>
                    {activeTab !== "2d" ? (
                        <div className="p-4 flex-1 flex flex-col">
                            <div className="flex items-center gap-2 mb-4">
                                <TrendingUp size={14} className="text-slate-400" />
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Domination Territoriale</span>
                            </div>
                            
                            <div className="flex-1 flex items-end justify-between gap-[2px]">
                                {result.ballHistory.map((val: number, i: number) => {
                                    const isPast = (i / 100) < (currentMatchTime.value / maxTime);
                                    const height = Math.abs(val) * 8;
                                    const isHome = val > 0;

                                    if (!isPast && currentMatchTime.value > 0) {
                                        return <div key={i} className="flex-1 h-full relative" />;
                                    }

                                    return (
                                        <div key={i} className="flex-1 h-full relative">
                                            <div 
                                                className={`absolute w-full rounded-sm transition-all duration-500 ${isHome ? 'bg-blue-500' : 'bg-orange-500'}`}
                                                style={{ 
                                                    height: `${Math.max(2, height / 2)}%`,
                                                    bottom: isHome ? '50%' : 'auto',
                                                    top: !isHome ? '50%' : 'auto',
                                                    opacity: currentMatchTime.value === 0 ? 0 : 1
                                                }} 
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        <div className="absolute inset-0 bg-[#40916c] flex flex-col">
                            <div className="flex-1 relative overflow-hidden">
                                <div className="absolute inset-0 flex">
                                    {[...Array(10)].map((_, i) => (
                                        <div key={i} className={`flex-1 ${i % 2 === 0 ? 'bg-white/5' : ''}`} />
                                    ))}
                                </div>
                                
                                <div className="absolute inset-0 grid grid-cols-6 grid-rows-5 opacity-20 pointer-events-none">
                                    {[...Array(30)].map((_, i) => <div key={i} className="border border-white/40" />)}
                                </div>

                                <div className="absolute inset-0 border-2 border-white/40 m-2" />
                                <div className="absolute inset-y-0 left-1/2 w-[2px] bg-white/50" />
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 border-2 border-white/50 rounded-full" />
                                <div className="absolute inset-y-[20%] left-2 w-[15%] border-2 border-white/50 border-l-0" />
                                <div className="absolute inset-y-[20%] right-2 w-[15%] border-2 border-white/50 border-r-0" />

                                {/* Floating Token Pop-up */}
                                {currentLog.value?.drawnToken && (
                                    <div 
                                        key={currentLog.value.time}
                                        className="absolute z-20 pointer-events-none animate-bounce"
                                        style={{ 
                                            left: `${(currentBallPos.value.x / 5) * 100}%`, 
                                            top: `${(currentBallPos.value.y / 4) * 100 - 10}%`,
                                            transform: 'translateX(-50%)'
                                        }}
                                    >
                                        <div className="bg-slate-900 text-white text-[10px] font-black px-2 py-0.5 rounded shadow-lg border border-white/20 uppercase tracking-tighter scale-125 origin-bottom">
                                            {currentLog.value.drawnToken.type}
                                        </div>
                                    </div>
                                )}

                                {/* Ball Shadow */}
                                <div 
                                    className="absolute w-4 h-1.5 bg-black/20 rounded-full blur-sm transition-all duration-500 z-[9]"
                                    style={{ 
                                        left: `${(currentBallPos.value.x / 5) * 100}%`, 
                                        top: `${(currentBallPos.value.y / 4) * 100 + 1}%`,
                                        transform: 'translate(-50%, -50%)' 
                                    }}
                                />

                                {/* Ball */}
                                <div 
                                    className="absolute w-3.5 h-3.5 bg-white rounded-full shadow-lg transition-all duration-500 z-10 flex items-center justify-center border border-slate-300"
                                    style={{ 
                                        left: `${(currentBallPos.value.x / 5) * 100}%`, 
                                        top: `${(currentBallPos.value.y / 4) * 100}%`,
                                        transform: 'translate(-50%, -50%)' 
                                    }}
                                >
                                    <div className="w-1 h-1 bg-slate-900 rounded-full opacity-30" />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex bg-slate-200/50 rounded-xl p-1 border border-slate-200 shadow-sm">
                    {["flux", "2d", "stats"].map(t => (
                        <button key={t} onClick={() => setActiveTab(t as any)} className={`flex-1 py-2 px-3 text-[9px] font-black uppercase rounded-lg ${activeTab === t ? "bg-white text-slate-900 shadow-sm" : "text-slate-400"}`}>{t}</button>
                    ))}
                </div>

                <div className="flex-1 overflow-y-auto pb-24">
                    {activeTab === "flux" && (
                        <div className="space-y-2">
                            {pastEvents.value.slice(0, 15).map((e, i) => (
                                <div key={i} className="bg-white border border-slate-100 rounded-xl p-3 shadow-sm animate-fade-in">
                                    <EventItem event={e} homeTeamId={liveMatch.homeTeam.id} />
                                </div>
                            ))}
                        </div>
                    )}
                    {activeTab === "2d" && (
                        <div className="space-y-4">
                            {/* 1. Contenu du Sac (Actuel) */}
                            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                                <div className="flex items-center gap-2 mb-4">
                                    <Package size={16} className="text-emerald-600" />
                                    <h4 className="text-xs font-black uppercase text-slate-400 tracking-widest">Contenu du Sac (Actuel)</h4>
                                </div>
                                <div className="grid grid-cols-1 gap-2">
                                    {bagStats.value.map((s, i) => (
                                        <div key={i} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                                            <span className="text-sm font-black uppercase text-slate-700">{s.type}</span>
                                            <div className="flex items-center gap-3">
                                                <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden hidden sm:block">
                                                    <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${s.percent}%` }} />
                                                </div>
                                                <span className="text-sm font-mono font-black text-emerald-600 w-12 text-right">{s.percent}%</span>
                                                <span className="text-[10px] text-slate-300 font-bold uppercase w-8">({s.count}u)</span>
                                            </div>
                                        </div>
                                    ))}
                                    {bagStats.value.length === 0 && <p className="text-sm text-slate-400 italic text-center py-4">Recherche de la prochaine séquence...</p>}
                                </div>
                            </div>

                            {/* 2. Répartition des Tirages Effectués */}
                            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                                <div className="flex items-center gap-2 mb-4">
                                    <BarChart2 size={16} className="text-blue-600" />
                                    <h4 className="text-xs font-black uppercase text-slate-400 tracking-widest">Répartition des Tirages Effectués</h4>
                                </div>
                                <div className="grid grid-cols-1 gap-2">
                                    {drawnTokensStats.value.map((s, i) => (
                                        <div key={i} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
                                            <span className="text-[11px] font-black uppercase text-slate-700">{s.type}</span>
                                            <div className="flex items-center gap-3">
                                                <div className="w-32 h-1.5 bg-slate-100 rounded-full overflow-hidden hidden sm:block">
                                                    <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${s.percent}%` }} />
                                                </div>
                                                <span className="text-[11px] font-mono font-black text-blue-600 w-10 text-right">{s.percent}%</span>
                                                <span className="text-[9px] text-slate-300 font-bold uppercase w-8">({s.count})</span>
                                            </div>
                                        </div>
                                    ))}
                                    {drawnTokensStats.value.length === 0 && <p className="text-xs text-slate-400 italic text-center py-2">Aucun tirage effectué pour le moment.</p>}
                                </div>
                            </div>
                            
                            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                                <div className="flex items-center gap-2 mb-3">
                                    <MapPin size={14} className="text-slate-400" />
                                    <h4 className="text-[10px] font-black uppercase text-slate-400">Historique Tactical</h4>
                                </div>
                                <div className="space-y-2 max-h-[150px] overflow-y-auto">
                                    {result.debugLogs?.filter(l => l.time <= currentMatchTime.value).slice(-8).reverse().map((l, i) => (
                                        <div key={i} className="text-[10px] flex flex-col border-b border-slate-50 pb-2 last:border-0">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-slate-400 font-mono">[{Math.floor(l.time / 60)}:{(l.time % 60).toString().padStart(2, '0')}]</span>
                                                <div className="flex items-center gap-2">
                                                    {l.drawnToken && (
                                                        <span className="bg-slate-900 text-white text-[8px] px-1.5 py-0.5 rounded font-black uppercase">
                                                            Tirage: {l.drawnToken.type}
                                                        </span>
                                                    )}
                                                    <span className="text-emerald-600 font-mono font-black">[{l.ballPosition?.x},{l.ballPosition?.y}]</span>
                                                </div>
                                            </div>
                                            <span className="font-bold text-slate-600">{l.text}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                    {activeTab === "stats" && (
                        <div className="space-y-4 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                            <StatRow label="Tirs" h={liveStats.value.hShots} a={liveStats.value.aShots} />
                            <StatRow label="Passes" h={liveStats.value.hPasses} a={liveStats.value.aPasses} />
                        </div>
                    )}
                </div>
            </div>

            <div className="absolute bottom-0 inset-x-0 bg-white/90 backdrop-blur-xl border-t border-slate-200 p-4 flex items-center justify-between z-50 shadow-[0_-10px_30px_rgba(0,0,0,0.02)]">
                <div className="flex items-center gap-2">
                    {!isFinished.value && (
                        <>
                            <button onClick={() => isPaused.value = !isPaused.value} className="w-10 h-10 rounded-xl flex items-center justify-center bg-slate-900 border border-slate-800 shadow-lg active:scale-95 transition-transform">
                                {isPaused.value ? <Play size={20} className="text-white fill-white" /> : <Pause size={20} className="text-white fill-white" />}
                            </button>
                            <button onClick={handlePrevStep} className="w-10 h-10 rounded-xl flex items-center justify-center bg-white border border-slate-200 hover:bg-slate-50 shadow-sm active:scale-95 transition-transform" title="Phase précédente">
                                <StepBack size={20} className="text-slate-700" />
                            </button>
                            <button onClick={handleNextStep} className="w-10 h-10 rounded-xl flex items-center justify-center bg-white border border-slate-200 hover:bg-slate-50 shadow-sm active:scale-95 transition-transform" title="Phase suivante">
                                <StepForward size={20} className="text-slate-700" />
                            </button>
                            <button onClick={handleSkip} className="w-10 h-10 rounded-xl flex items-center justify-center bg-white border border-slate-200 hover:bg-slate-50 shadow-sm">
                                <FastForward size={20} className="text-slate-400" />
                            </button>
                        </>
                    )}
                    <div className="ml-1">
                        <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest leading-none">Match</p>
                        <p className="text-[11px] font-black uppercase text-slate-900 truncate max-w-[100px]">Live</p>
                    </div>
                </div>
                {isFinished.value && <button onClick={handleFinalize} className="px-6 py-2.5 bg-emerald-600 rounded-xl text-[10px] font-black uppercase text-white shadow-lg active:scale-95 transition-transform">Rapport Final</button>}
            </div>
		</div>
	);
}

function StatRow({ label, h, a, unit = "" }: any) {
    const valH = Number(h) || 0; const valA = Number(a) || 0;
    const total = valH + valA || 1;
    return (
        <div className="flex flex-col gap-1.5">
            <div className="flex justify-between text-[9px] font-black uppercase text-slate-400"><span>{valH}{unit}</span><span>{label}</span><span>{valA}{unit}</span></div>
            <div className="w-full h-1.5 bg-slate-100 rounded-full flex overflow-hidden shadow-inner"><div className="h-full bg-blue-600 transition-all duration-500" style={{ width: `${(valH/total)*100}%` }} /><div className="h-full bg-orange-500 transition-all duration-500" style={{ width: `${(valA/total)*100}%` }} /></div>
        </div>
    );
}
