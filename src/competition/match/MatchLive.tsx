import { useGameStore } from "@/infrastructure/store/gameSlice";
import { useLiveMatchStore } from "@/infrastructure/store/liveMatchStore";
import { useSignal, useComputed } from "@preact/signals";
import { TrendingUp, Loader2, Play, Pause, FastForward, StepForward, StepBack, Package, MapPin, Users, BarChart3, MessageSquare } from "lucide-preact";
import { useEffect, useState, useRef } from "preact/hooks";
import EventItem from "./components/EventItem";
import Scoreboard from "./components/Scoreboard";

export default function MatchLive({ onShowReport }: { onShowReport?: (id: number) => void }) {
	const finalizeLiveMatch = useGameStore((state) => state.finalizeLiveMatch);
	const liveMatch = useLiveMatchStore((state) => state.liveMatch);
    const updateLiveMatchState = useLiveMatchStore((state) => state.updateLiveMatchState);
    const currentSaveId = useGameStore((state) => state.currentSaveId);
    const loadLiveMatchFromDb = useLiveMatchStore((state) => state.loadLiveMatchFromDb);

    const hasLoaded = useRef(false);
    useEffect(() => {
        if (!hasLoaded.current && !liveMatch && currentSaveId) {
            hasLoaded.current = true;
            loadLiveMatchFromDb(currentSaveId);
        }
    }, [currentSaveId]);

    const [initialTime] = useState(liveMatch?.currentTime || 0);
    const currentMatchTime = useSignal(initialTime);
	const isPaused = useSignal(liveMatch?.isPaused ?? true); 
    const [activeTab, setActiveTab] = useState<"flux" | "2d" | "stats" | "players">(liveMatch?.activeTab || "flux");

    if (!liveMatch || !liveMatch.result) {
        return (
            <div className="absolute inset-0 z-[200] flex flex-col items-center justify-center bg-slate-50 gap-4">
                <Loader2 className="animate-spin text-slate-400" size={32} />
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Simulation en cours...</p>
            </div>
        );
    }

    const result = liveMatch.result;
    const logs = result.debugLogs || [];
    const maxTime = logs.length > 0 ? logs[logs.length - 1].time : 5400;

    const currentMinute = useComputed(() => Math.floor(currentMatchTime.value / 60));
    const isFinished = useComputed(() => currentMatchTime.value >= maxTime);

    const executedLogIndex = useComputed(() => logs.findLastIndex(l => l.time <= currentMatchTime.value));
    const currentLog = useComputed(() => executedLogIndex.value >= 0 ? logs[executedLogIndex.value] : logs[0]);
    
    const displayPos = useComputed(() => currentLog.value?.ballPosition || { x: 2, y: 2 });
    const effectiveTeamId = useComputed(() => currentLog.value?.teamId);

    const currentScorers = useComputed(() => {
        const hId = liveMatch.homeTeam?.id;
        const playedLogs = logs.filter(l => l.time <= currentMatchTime.value);
        return {
            h: playedLogs.filter(e => e.teamId === hId && (e.eventSubtype === "GOAL" || e.type === "GOAL")).map(e => ({ name: e.playerName || "Joueur", minute: Math.floor(e.time / 60) })),
            a: playedLogs.filter(e => e.teamId !== hId && (e.eventSubtype === "GOAL" || e.type === "GOAL")).map(e => ({ name: e.playerName || "Joueur", minute: Math.floor(e.time / 60) }))
        };
    });

    const bagStats = useComputed(() => {
        const bag = currentLog.value?.bag || [];
        const total = bag.length || 1;
        const stats: any = { h: { count: 0, types: {} }, a: { count: 0, types: {} }, n: { count: 0, types: {} } };
        bag.forEach(t => {
            const side = t.teamId === liveMatch.homeTeam.id ? 'h' : (t.teamId === liveMatch.awayTeam.id ? 'a' : 'n');
            stats[side].count++;
            stats[side].types[t.type] = (stats[side].types[t.type] || 0) + 1;
        });
        return { total, sides: stats };
    });

    const matchAnalysis = useComputed(() => {
        const hId = liveMatch.homeTeam?.id || 0;
        const playedLogs = logs.filter(l => l.time <= currentMatchTime.value);
        const stats = {
            h: { goals: 0, shots: 0, onTarget: 0, xg: 0, passes: 0, duels: 0, int: 0, fouls: 0, corners: 0 },
            a: { goals: 0, shots: 0, onTarget: 0, xg: 0, passes: 0, duels: 0, int: 0, fouls: 0, corners: 0 }
        };
        const playerRatings: Record<number, { name: string, rating: number, goals: number, teamId: number }> = {};
        const allPlayers = [...(liveMatch.homePlayers || []), ...(liveMatch.awayPlayers || [])]; 
        allPlayers.forEach(p => { if (p && p.id) playerRatings[p.id] = { name: p.lastName, rating: 6.0, goals: 0, teamId: p.teamId }; });

        playedLogs.forEach(l => {
            const side = l.teamId === hId ? 'h' : 'a';
            const isGoal = l.eventSubtype === 'GOAL' || l.type === 'GOAL';
            if (isGoal) { stats[side].goals++; stats[side].shots++; stats[side].onTarget++; }
            else if (l.eventSubtype === 'SAVE') { stats[side].shots++; stats[side].onTarget++; }
            else if (l.eventSubtype === 'SHOT') { stats[side].shots++; }
            if (l.statImpact) {
                const si = l.statImpact;
                if (si.xg) stats[side].xg += si.xg;
                if (si.isPass) stats[side].passes++;
                if (si.isDuel) stats[side].duels++;
                if (si.isInterception) stats[side].int++;
                const pId = l.drawnToken?.ownerId;
                if (pId && playerRatings[pId]) {
                    let impact = 0;
                    if (isGoal) { impact += 1.0; playerRatings[pId].goals++; }
                    if (si.isChanceCreated) impact += 0.3;
                    if (si.isPass && si.isSuccess) impact += 0.05;
                    if (si.isDuel && si.isSuccess) impact += 0.2;
                    if (si.isInterception) impact += 0.2;
                    if (l.eventSubtype === 'SAVE') impact += 0.4;
                    playerRatings[pId].rating = Math.min(10, playerRatings[pId].rating + impact);
                }
            }
        });
        return { stats, ratings: Object.values(playerRatings) };
    });

    const sampledMomentum = useComputed(() => {
        const history = result.ballHistory || [];
        const barsCount = Math.ceil(maxTime / 120) || 1;
        const step = Math.max(1, Math.floor(history.length / barsCount));
        const bars = [];
        for (let i = 0; i < barsCount; i++) bars.push(history[i * step] || 0);
        return bars;
    });

    const liveMomentum = useComputed(() => {
        const momentumIdx = Math.min(99, Math.floor((currentMatchTime.value / (maxTime || 1)) * 99));
        const val = result.ballHistory ? result.ballHistory[momentumIdx] : 0;
        return Math.round(50 + (val || 0) * 2.5);
    });

    useEffect(() => {
        if (!result) return;
        const timer = setInterval(() => {
            if (!isPaused.value && currentMatchTime.value < maxTime) currentMatchTime.value += 1;
        }, 30); 
        return () => clearInterval(timer);
    }, [result, maxTime]);

    const handleSkip = () => { currentMatchTime.value = maxTime; isPaused.value = true; };

    const handleStepBack = () => {
        isPaused.value = true;
        if (executedLogIndex.value > 0) {
            currentMatchTime.value = logs[executedLogIndex.value - 1].time;
        } else {
            currentMatchTime.value = 0;
        }
    };

    const handleStepForward = () => {
        isPaused.value = true;
        const nextIdx = executedLogIndex.value + 1;
        if (nextIdx < logs.length) {
            currentMatchTime.value = logs[nextIdx].time;
        }
    };

    const handleFinalize = async () => { 
        if (result) await finalizeLiveMatch(result); 
        if (onShowReport && liveMatch) onShowReport(liveMatch.matchId); 
    };

	return (
		<div className="absolute inset-0 z-[200] flex flex-col bg-slate-50 overflow-hidden text-slate-900">
			<Scoreboard
				homeTeam={liveMatch.homeTeam} awayTeam={liveMatch.awayTeam}
				homeScore={useComputed(() => matchAnalysis.value.stats.h.goals)} awayScore={useComputed(() => matchAnalysis.value.stats.a.goals)} 
                minute={currentMinute} homeScorers={useComputed(() => currentScorers.value.h)} awayScorers={useComputed(() => currentScorers.value.a)}
				possession={liveMomentum} isFinished={isFinished.value} stoppageTime={useSignal(result.stoppageTime || 0)}
			/>

            <div className="flex-1 flex flex-col overflow-hidden px-4 pt-4 gap-3">
                <div className={`bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden relative transition-all duration-300 ${activeTab === '2d' ? 'flex-[1.2] min-h-[180px]' : 'h-32 flex-none'}`}>
                    {activeTab !== "2d" ? (
                        <div className="p-4 flex-1 flex flex-col justify-center relative">
                            <div className="flex items-center gap-2 mb-2">
                                <TrendingUp size={14} className="text-slate-400" />
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Domination</span>
                            </div>
                            <div className="flex-1 flex items-end justify-between gap-[3px] relative">
                                <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-slate-100 z-0 -translate-y-1/2" />
                                {sampledMomentum.value.map((val: number, i: number) => {
                                    const barsLen = sampledMomentum.value.length;
                                    const isPast = currentMatchTime.value > 0 && (i / barsLen) < (currentMatchTime.value / maxTime);
                                    if (!isPast) return <div key={i} className="flex-1 h-full bg-slate-50/50" />; 
                                    const height = Math.min(45, Math.abs(val) * 6);
                                    return <div key={i} className="flex-1 h-full relative"><div className={`absolute w-full rounded-full ${val > 0 ? 'bg-blue-500' : 'bg-orange-500'} opacity-80`} style={{ height: `${height}%`, bottom: val > 0 ? '50%' : 'auto', top: val <= 0 ? '50%' : 'auto' }} /></div>;
                                })}
                            </div>
                        </div>
                    ) : (
                        <div className="absolute inset-0 bg-[#52b788] flex flex-col">
                            <div className="flex-1 relative overflow-hidden">
                                <div className="absolute inset-0 flex pointer-events-none opacity-10">{[...Array(10)].map((_, i) => <div key={i} className={`flex-1 ${i % 2 === 0 ? 'bg-black' : ''}`} />)}</div>
                                <div className="absolute inset-2 border-2 border-white/40 pointer-events-none" />
                                <div className="absolute inset-y-[15%] left-0 w-[18%] border-2 border-l-0 border-white/30 pointer-events-none rounded-r-lg" />
                                <div className="absolute inset-y-[15%] right-0 w-[18%] border-2 border-r-0 border-white/30 pointer-events-none rounded-l-lg" />
                                <div className="absolute inset-y-0 left-1/2 w-[2px] bg-white/40" />
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 border-2 border-white/40 rounded-full" />
                                <div className="absolute inset-0 grid grid-cols-6 grid-rows-5 z-10">
                                    {[...Array(30)].map((_, i) => {
                                        const x = i % 6; const y = Math.floor(i / 6);
                                        const isBall = displayPos.value.x === x && displayPos.value.y === y;
                                        const possessionColor = effectiveTeamId.value === liveMatch.homeTeam.id ? 'border-blue-500 bg-blue-500/20' : effectiveTeamId.value === liveMatch.awayTeam.id ? 'border-orange-500 bg-orange-500/20' : 'border-white/5';
                                        
                                        const showToken = currentLog.value && currentLog.value.drawnToken;

                                        return (
                                            <div key={i} className={`border flex flex-col items-center justify-center relative transition-colors duration-300 ${isBall ? 'border-4 z-20 ' + possessionColor : 'border-white/5'}`}>
                                                {isBall && <div className="absolute inset-0 border-2 border-white animate-pulse" />}
                                                {isBall && showToken && <span className="absolute bottom-1 text-[8px] font-black text-white uppercase bg-black/80 px-1.5 py-0.5 rounded-sm shadow-xl z-30 ring-1 ring-white/20 whitespace-nowrap">{currentLog.value.drawnToken.type.split('_').pop()}</span>}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex bg-slate-200/50 rounded-xl p-1 border border-slate-200 shadow-sm">
                    {[ {id: "flux", icon: <MapPin size={12}/>}, {id: "2d", icon: <Package size={12}/>}, {id: "stats", icon: <BarChart3 size={12}/>}, {id: "players", icon: <Users size={12}/>}].map(t => (
                        <button key={t.id} onClick={() => setActiveTab(t.id as any)} className={`flex-1 py-2 flex items-center justify-center gap-2 text-[9px] font-black uppercase rounded-lg ${activeTab === t.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-400"}`}>
                            {t.icon} {t.id}
                        </button>
                    ))}
                </div>

                <div className="flex-1 overflow-y-auto pb-24">
                    {activeTab === "2d" && (
                        <div className="space-y-2">
                            <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-sm">
                                <div className="flex flex-col gap-1.5 mb-2 border-b border-slate-100 pb-2">
                                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1">
                                        <Package size={10}/> Contenu du sac ({bagStats.value.total} tokens) 
                                        <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded ml-1">Zone {displayPos.value.x},{displayPos.value.y}</span>
                                    </span>
                                    <div className="flex items-start gap-2 bg-slate-50 px-2 py-1.5 rounded-xl border border-slate-100">
                                        <MessageSquare size={10} className="text-slate-400 mt-0.5 shrink-0" />
                                        <p className="text-[12px] text-slate-600 leading-tight font-medium italic">"{currentLog.value?.text}"</p>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    {['h', 'a', 'n'].map(side => {
                                        const s = bagStats.value.sides[side];
                                        if (s.count === 0) return null;
                                        return (
                                            <div key={side} className={`p-1.5 rounded-lg ${side === 'h' ? 'bg-blue-50' : side === 'a' ? 'bg-orange-50' : 'bg-slate-50'} border border-white/50`}>
                                                <div className="flex items-center gap-1.5 mb-1 opacity-60"><div className={`w-1 h-2 rounded-full ${side === 'h' ? 'bg-blue-500' : side === 'a' ? 'bg-orange-500' : 'bg-slate-400'}`} /><span className="text-[8px] font-black uppercase tracking-tighter">{Math.round(s.count/bagStats.value.total*100)}%</span></div>
                                                <div className="flex flex-wrap gap-x-4 gap-y-2">
                                                    {Object.entries(s.types).map(([type, count]: [any, any]) => (
                                                        <div key={type} className="flex flex-col min-w-[60px]"><span className={`text-[11px] font-black uppercase tracking-tight ${side === 'h' ? 'text-blue-800' : side === 'a' ? 'text-orange-800' : 'text-slate-600'}`}>{type}</span><span className="text-[10px] font-bold text-slate-400">{Math.round(count/bagStats.value.total*100)}%</span></div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                    {activeTab === "flux" && (
                        <div className="space-y-2">
                            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 shadow-inner mb-2 border-dashed">
                                <div className="flex items-center gap-2 mb-1">
                                    <Package size={12} className="text-slate-400" />
                                    <span className="text-[9px] font-black uppercase text-slate-400">Dernière action</span>
                                </div>
                                <p className="text-[12px] text-slate-600 font-medium italic">"{currentLog.value?.text}"</p>
                            </div>
                            {(logs.filter(l => (l.type === 'EVENT' || l.type === 'ACTION') && l.time <= currentMatchTime.value)).slice(-15).reverse().map((l, i) => (
                                <div key={i} className="bg-white border border-slate-100 rounded-2xl p-3 shadow-sm animate-fade-in"><EventItem event={{ ...l, minute: Math.floor(l.time / 60), type: l.eventSubtype, description: l.text } as any} homeTeamId={liveMatch.homeTeam.id} /></div>
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
                            <PlayerColumn team={liveMatch.homeTeam} players={matchAnalysis.value.ratings.filter(r => r.teamId === liveMatch.homeTeam.id)} color="blue" />
                            <PlayerColumn team={liveMatch.awayTeam} players={matchAnalysis.value.ratings.filter(r => r.teamId === liveMatch.awayTeam.id)} color="orange" />
                        </div>
                    )}
                </div>
            </div>

            <div className="absolute bottom-0 inset-x-0 bg-white/90 backdrop-blur-xl border-t border-slate-200 p-4 flex items-center justify-between z-50 shadow-[0_-10px_30px_rgba(0,0,0,0.02)]">
                <div className="flex items-center gap-2">
                    <button onClick={() => isPaused.value = !isPaused.value} className="w-10 h-10 rounded-xl flex items-center justify-center bg-slate-900 shadow-lg active:scale-95 transition-transform">{isPaused.value ? <Play size={20} className="text-white fill-white" /> : <Pause size={20} className="text-white fill-white" />}</button>
                    <button onClick={handleStepBack} className="w-10 h-10 rounded-xl flex items-center justify-center bg-white border border-slate-200 active:scale-95 transition-transform"><StepBack size={20} /></button>
                    <button onClick={handleStepForward} className="w-10 h-10 rounded-xl flex items-center justify-center bg-white border border-slate-200 active:scale-95 transition-transform"><StepForward size={20} /></button>
                    {!isFinished.value && (<button onClick={handleSkip} className="w-10 h-10 rounded-xl flex items-center justify-center bg-white border border-slate-200 active:scale-95 transition-transform"><FastForward size={20} className="text-slate-400" /></button>)}
                    {isFinished.value && (<button onClick={handleFinalize} className="px-4 py-2.5 bg-emerald-600 rounded-xl text-[10px] font-black uppercase text-white shadow-lg active:scale-95 transition-transform ml-2">Rapport</button>)}
                </div>
            </div>
		</div>
	);
}

function StatRow({ label, h, a }: any) {
    const valH = Number(h) || 0; const valA = Number(a) || 0;
    const total = valH + valA || 1;
    return (
        <div className="flex flex-col gap-2">
            <div className="flex justify-between text-[9px] font-black uppercase text-slate-400"><span>{h}</span><span>{label}</span><span>{a}</span></div>
            <div className="w-full h-1.5 bg-slate-100 rounded-full flex overflow-hidden"><div className="h-full bg-blue-500 transition-all duration-1000" style={{ width: `${(valH/total)*100}%` }} /><div className="h-full bg-orange-500 transition-all duration-1000" style={{ width: `${(valA/total)*100}%` }} /></div>
        </div>
    );
}

function PlayerColumn({ team, players, color }: any) {
    const getRatingColor = (r: number) => {
        if (r >= 8.0) return 'bg-emerald-500 text-white';
        if (r >= 7.0) return 'bg-blue-500 text-white';
        if (r >= 6.0) return 'bg-amber-500 text-white';
        return 'bg-rose-500 text-white';
    };
    return (
        <div className="flex flex-col gap-1">
            <h4 className={`text-[10px] font-black uppercase text-${color}-600 mb-2 truncate`}>{team.name}</h4>
            {players.sort((a: any, b: any) => b.rating - a.rating).map((p: any, i: number) => (
                <div key={i} className="bg-white border border-slate-100 rounded-lg p-2 flex items-center justify-between shadow-sm">
                    <div className="flex flex-col">
                        <span className="text-[9px] font-bold text-slate-600 truncate max-w-[60px]">{p.name}</span>
                        {p.goals > 0 && <span className="text-[8px] text-emerald-500 font-black">⚽ {p.goals}</span>}
                    </div>
                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${getRatingColor(p.rating)}`}>{p.rating.toFixed(1)}</span>
                </div>
            ))}
        </div>
    );
}
