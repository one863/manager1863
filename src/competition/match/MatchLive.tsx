import { useGameStore } from "@/infrastructure/store/gameSlice";
import { useLiveMatchStore } from "@/infrastructure/store/liveMatchStore";
import { useSignal, useComputed } from "@preact/signals";
import { TrendingUp, Loader2, Play, Pause, FastForward, StepForward, StepBack, Package, MapPin, Users, BarChart3 } from "lucide-preact";
import { useEffect, useState, useRef } from "preact/hooks";
import EventItem from "./components/EventItem";
import Scoreboard from "./components/Scoreboard";

export default function MatchLive({ onShowReport }: { onShowReport?: (id: number) => void }) {
	const finalizeLiveMatch = useGameStore((state) => state.finalizeLiveMatch);
	const liveMatch = useLiveMatchStore((state) => state.liveMatch);
    const updateLiveMatchState = useLiveMatchStore((state) => state.updateLiveMatchState);
    const currentSaveId = useGameStore((state) => state.currentSaveId);
    const loadLiveMatchFromDb = useLiveMatchStore((state) => state.loadLiveMatchFromDb);

    // --- DIAGNOSTIC: Log pour voir l'état initial du liveMatch ---
    // console.log("MatchLive render - liveMatch:", liveMatch);
    
    // Charger liveMatch depuis la DB si ce n'est pas déjà fait (ex: au refresh)
    useEffect(() => {
        if (!liveMatch && currentSaveId) {
            loadLiveMatchFromDb(currentSaveId);
        }
    }, [liveMatch, currentSaveId, loadLiveMatchFromDb]);

    // Affichage d'un loader tant que liveMatch ou result n'est pas prêt
    if (!liveMatch || !liveMatch.result) {
        // console.log("MatchLive: Loading or result not available.");
        return (
            <div className="absolute inset-0 z-[200] flex flex-col items-center justify-center bg-slate-50 gap-4">
                <Loader2 className="animate-spin text-slate-400" size={32} />
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Simulation en cours...</p>
            </div>
        );
    }

    // Si on arrive ici, liveMatch et liveMatch.result sont définis
    const result = liveMatch.result; // result est maintenant garanti
    const logs = result.debugLogs || []; // logs est maintenant garanti
    const maxTime = logs.length > 0 ? logs[logs.length - 1].time : 5400;

    const currentMatchTime = useSignal(liveMatch.currentTime || 0);
	const isPaused = useSignal(liveMatch.isPaused ?? true); 
    const isGoalPause = useSignal(false);
    const [activeTab, setActiveTab] = useState<"flux" | "2d" | "stats" | "players">(liveMatch.activeTab || "flux");

    const currentMinute = useComputed(() => Math.floor(currentMatchTime.value / 60));
    const isFinished = useComputed(() => currentMatchTime.value >= maxTime);

    const currentScorers = useComputed(() => {
        const hId = liveMatch.homeTeam?.id; // liveMatch est garanti
        const events = logs.filter(l => l.time <= currentMatchTime.value && l.eventSubtype === "GOAL");
        return {
            h: events.filter(e => e.teamId === hId).map(e => ({ name: e.playerName || "Joueur", minute: Math.floor(e.time / 60) })),
            a: events.filter(e => e.teamId !== hId).map(e => ({ name: e.playerName || "Joueur", minute: Math.floor(e.time / 60) }))
        };
    });

    const currentLog = useComputed(() => logs.findLast(l => l.time <= currentMatchTime.value));
    const currentBallPos = useComputed(() => currentLog.value?.ballPosition || { x: 2, y: 2 });

    const matchAnalysis = useComputed(() => {
        const hId = liveMatch.homeTeam?.id || 0; // liveMatch est garanti
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
            if (l.eventSubtype === 'GOAL') { stats[side].goals++; stats[side].shots++; stats[side].onTarget++; }
            else if (l.eventSubtype === 'SAVE') { stats[side].shots++; stats[side].onTarget++; }
            else if (l.eventSubtype === 'SHOT') { stats[side].shots++; }
            else if (l.eventSubtype === 'FOUL') { stats[side].fouls++; }
            else if (l.eventSubtype === 'CORNER') { stats[side].corners++; }
            if (l.statImpact) {
                const si = l.statImpact;
                if (si.xg) stats[side].xg += si.xg;
                if (si.isPass) stats[side].passes++;
                if (si.isDuel) stats[side].duels++;
                if (si.isInterception) stats[side].int++;
                const pId = l.drawnToken?.ownerId;
                if (pId && playerRatings[pId]) {
                    let impact = 0;
                    if (l.eventSubtype === 'GOAL') { impact += 1.0; playerRatings[pId].goals++; }
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

    const liveMomentum = useComputed(() => {
        const momentumIdx = Math.min(99, Math.floor((currentMatchTime.value / (maxTime || 1)) * 99));
        const val = result.ballHistory ? result.ballHistory[momentumIdx] : 0; // result est garanti
        return Math.round(50 + (val || 0) * 2.5);
    });

    useEffect(() => {
        if (!result) return; // result est garanti
        const timer = setInterval(() => {
            if (!isPaused.value && !isGoalPause.value && currentMatchTime.value < maxTime) {
                currentMatchTime.value += 1;
            }
        }, 30); 
        return () => clearInterval(timer);
    }, [result, maxTime]);

    const handleSkip = () => { 
        currentMatchTime.value = maxTime;
        isPaused.value = true;
        updateLiveMatchState({ currentTime: maxTime, isPaused: true, activeTab: activeTab }, currentSaveId || undefined);
    };

    const handleFinalize = async () => { 
        console.log("Finalizing match...");
        if (result) await finalizeLiveMatch(result); 
        if (onShowReport && liveMatch) onShowReport(liveMatch.matchId); 
    };

	return (
		<div className="absolute inset-0 z-[200] flex flex-col bg-slate-50 overflow-hidden text-slate-900">
			<Scoreboard
				homeTeam={liveMatch.homeTeam} awayTeam={liveMatch.awayTeam}
				homeScore={useComputed(() => matchAnalysis.value.stats.h.goals)} awayScore={useComputed(() => matchAnalysis.value.stats.a.goals)} 
                minute={currentMinute} homeScorers={currentScorers.value.h} awayScorers={currentScorers.value.a}
				possession={liveMomentum} isFinished={isFinished.value} stoppageTime={useSignal(result.stoppageTime || 0)}
			/>

            <div className="flex-1 flex flex-col overflow-hidden px-4 pt-4 gap-3">
                <div className={`bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden relative transition-all duration-300 ${activeTab === '2d' ? 'flex-[1.2] min-h-[220px]' : 'h-32 flex-none'}`}>
                    {activeTab !== "2d" ? (
                        <div className="p-4 flex-1 flex flex-col justify-center">
                            <div className="flex items-center gap-2 mb-2">
                                <TrendingUp size={14} className="text-slate-400" />
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Domination</span>
                            </div>
                            <div className="flex-1 flex items-end justify-between gap-[2px]">
                                {(result.ballHistory || []).map((val: number, i: number) => {
                                    const isPast = (i / 100) <= (currentMatchTime.value / maxTime);
                                    if (!isPast) return <div key={i} className="flex-1 h-full" />; 
                                    return (
                                        <div key={i} className="flex-1 h-full relative">
                                            <div className={`absolute w-full rounded-full ${val > 0 ? 'bg-blue-500' : 'bg-orange-500'}`} style={{ height: `${Math.max(4, Math.abs(val) * 8)}%`, bottom: val > 0 ? '50%' : 'auto', top: val <= 0 ? '50%' : 'auto' }} />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        <div className="absolute inset-0 bg-[#52b788] flex flex-col">
                            <div className="flex-1 relative overflow-hidden">
                                <div className="absolute inset-0 flex pointer-events-none opacity-10">{[...Array(10)].map((_, i) => <div key={i} className={`flex-1 ${i % 2 === 0 ? 'bg-black' : ''}`} />)}</div>
                                <div className="absolute inset-2 border-2 border-white/40 pointer-events-none" />
                                <div className="absolute inset-y-0 left-1/2 w-[2px] bg-white/40" />
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 border-2 border-white/40 rounded-full" />
                                <div className="absolute inset-0 grid grid-cols-6 grid-rows-5 z-10">
                                    {[...Array(30)].map((_, i) => {
                                        const x = i % 6; const y = Math.floor(i / 6);
                                        const isBall = currentBallPos.value.x === x && currentBallPos.value.y === y;
                                        const side = currentLog.value?.teamId === liveMatch.homeTeam.id ? 'bg-blue-500/80' : currentLog.value?.teamId === liveMatch.awayTeam.id ? 'bg-orange-500/80' : 'bg-white/40';
                                        return (
                                            <div key={i} className={`border border-white/5 flex items-center justify-center ${isBall ? side + ' shadow-xl rounded-xl border-2 border-white/30 scale-95' : ''}`}>
                                                {isBall && <span className="text-[7px] font-black text-white uppercase animate-pulse">{currentLog.value?.drawnToken?.type.split('_').pop()}</span>}
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
                    {activeTab === "flux" && (
                        <div className="space-y-2">
                            {(logs.filter(l => l.type === 'EVENT' && l.time <= currentMatchTime.value)).slice(-15).reverse().map((l, i) => (
                                <div key={i} className="bg-white border border-slate-100 rounded-2xl p-3 shadow-sm animate-fade-in">
                                    <EventItem event={{ ...l, minute: Math.floor(l.time / 60), type: l.eventSubtype }} homeTeamId={liveMatch.homeTeam.id} />
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
                            <PlayerColumn team={liveMatch.homeTeam} players={matchAnalysis.value.ratings.filter(r => r.teamId === liveMatch.homeTeam.id)} color="blue" />
                            <PlayerColumn team={liveMatch.awayTeam} players={matchAnalysis.value.ratings.filter(r => r.teamId === liveMatch.awayTeam.id)} color="orange" />
                        </div>
                    )}
                </div>
            </div>

            <div className="absolute bottom-0 inset-x-0 bg-white/90 backdrop-blur-xl border-t border-slate-200 p-4 flex items-center justify-between z-50 shadow-[0_-10px_30px_rgba(0,0,0,0.02)]">
                <div className="flex items-center gap-2">
                    <button onClick={() => isPaused.value = !isPaused.value} className="w-10 h-10 rounded-xl flex items-center justify-center bg-slate-900 shadow-lg active:scale-95 transition-transform">{isPaused.value ? <Play size={20} className="text-white fill-white" /> : <Pause size={20} className="text-white fill-white" />}</button>
                    <button onClick={() => currentMatchTime.value = Math.max(0, currentMatchTime.value - 30)} className="w-10 h-10 rounded-xl flex items-center justify-center bg-white border border-slate-200 active:scale-95 transition-transform"><StepBack size={20} /></button>
                    <button onClick={() => currentMatchTime.value = Math.min(maxTime, currentMatchTime.value + 30)} className="w-10 h-10 rounded-xl flex items-center justify-center bg-white border border-slate-200 active:scale-95 transition-transform"><StepForward size={20} /></button>
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
            <div className="w-full h-1.5 bg-slate-100 rounded-full flex overflow-hidden"><div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${(valH/total)*100}%` }} /><div className="h-full bg-orange-500 transition-all duration-500" style={{ width: `${(valA/total)*100}%` }} /></div>
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
