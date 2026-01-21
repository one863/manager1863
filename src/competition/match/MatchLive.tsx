import { useGameStore } from "@/infrastructure/store/gameSlice";
import { useLiveMatchStore } from "@/infrastructure/store/liveMatchStore";
import { useSignal } from "@preact/signals";
import { FastForward, BarChart3, MessageSquareText, Star, Users, CheckCircle2, Pause, Play, ChevronLeft, ChevronRight } from "lucide-preact";
import { useEffect, useRef, useState } from "preact/hooks";
import EventItem from "./components/EventItem";
import Scoreboard from "./components/Scoreboard";
import MatchEngine from "./MatchEngine";

export default function MatchLive({ onShowReport }: { onShowReport?: (id: number) => void }) {
	const finalizeLiveMatch = useGameStore((state) => state.finalizeLiveMatch);
	const liveMatch = useLiveMatchStore((state) => state.liveMatch);
    const clearLiveMatch = useLiveMatchStore((state) => state.clearLiveMatch);
    
	const currentMinute = useSignal(0);
	const homeScore = useSignal(0);
	const awayScore = useSignal(0);
    const possession = useSignal(50);
	const isFinished = useSignal(false);
    const isPaused = useSignal(false);
    
	const displayedEvents = useSignal<any[]>([]);
	const homeScorers = useSignal<any[]>([]);
	const awayScorers = useSignal<any[]>([]);
	const stats = { 
        hS: useSignal(0), aS: useSignal(0), 
        hST: useSignal(0), aST: useSignal(0),
        hX: useSignal(0), aX: useSignal(0),
        hDA: useSignal(0), aDA: useSignal(0),
        hPass: useSignal(0), aPass: useSignal(0)
    };
	const stoppageTime = useSignal(0);

    const momentumHistory = useSignal<{ minute: number, val: number, type?: 'goal' | 'red' }[]>(new Array(95).fill(null).map((_, i) => ({ minute: i, val: 0 })));

    const [activeTab, setActiveTab] = useState<"flux" | "highlights" | "stats">("flux");
    const [currentEventIndex, setCurrentEventIndex] = useState(0);
	const scrollRef = useRef<HTMLDivElement>(null);
    const autoPauseRef = useRef(false);

	useEffect(() => {
        const result = liveMatch?.result;
		if (!result) return;

        let stop = 0; 
        (result.events || []).forEach((e: any) => { if (e && ["GOAL", "INJURY", "CARD"].includes(e.type)) stop++; });
		stoppageTime.value = Math.ceil(Math.min(10, Math.max(1, stop)));

        const targetPossession = result.homePossession !== undefined ? result.homePossession : 50;

		const timer = setInterval(() => {
			if (isPaused.value || autoPauseRef.current || isFinished.value) return;

            if (currentMinute.value >= 90 + stoppageTime.value) {
                isFinished.value = true;
                possession.value = targetPossession; 
                clearInterval(timer);
                return;
            }

            currentMinute.value++;
            const min = currentMinute.value;

            // Momentum sync correction
            const ballZone = result.ballHistory?.[min] || 13;
            const row = Math.floor((ballZone - 1) / 5); 
            let intensity = (row - 2.5) * 18;
            intensity += (Math.random() * 8 - 4);
            
            const eventsNow = (result.events || []).filter((e: any) => e && e.minute === min);
            let specialType: 'goal' | 'red' | undefined;
            if (eventsNow.some(e => e.type === "GOAL")) specialType = 'goal';
            else if (eventsNow.some(e => e.type === "RED_CARD")) specialType = 'red';

            if (min < 95) {
                const newHistory = [...momentumHistory.value];
                newHistory[min] = { minute: min, val: Math.max(-45, Math.min(45, intensity)), type: specialType };
                momentumHistory.value = newHistory;
            }

            // Possession
            const pChange = ((targetPossession - possession.value) * 0.05) + (Math.random() * 2 - 1);
            possession.value = Math.max(20, Math.min(80, Math.round(possession.value + pChange)));

            if (eventsNow.length > 0) {
                displayedEvents.value = [...displayedEvents.value, ...eventsNow];
                
                const hasAction = eventsNow.some(e => ["GOAL", "SHOT", "MISS", "RED_CARD"].includes(e.type));
                if (hasAction) {
                    autoPauseRef.current = true;
                    const delay = eventsNow.some(e => e.type === "GOAL") ? 4000 : 2000;
                    setTimeout(() => { autoPauseRef.current = false; }, delay);
                }

                const goals = eventsNow.filter((e: any) => e.type === "GOAL");
                if (goals.length > 0) {
                    goals.forEach((g: any) => {
                        if (g.teamId === liveMatch?.homeTeam?.id) { homeScore.value++; homeScorers.value = [...homeScorers.value, { name: g.scorerName || "Joueur", minute: g.minute }]; }
                        else { awayScore.value++; awayScorers.value = [...awayScorers.value, { name: g.scorerName || "Joueur", minute: g.minute }]; }
                    });
                }
            }

            // Stats update
            const pastEvents = (result.events || []).filter((e: any) => e && e.minute <= min);
            let hS=0, aS=0, hST=0, aST=0, hX=0, aX=0, hDA=0, aDA=0;
            pastEvents.forEach((e: any) => {
                const isHome = e.teamId === liveMatch?.homeTeam?.id;
                if (isHome) {
                    if (e.xg) { hX += e.xg; hS++; if (["GOAL", "SHOT"].includes(e.type)) hST++; }
                    if (e.type === "TRANSITION" && e.description.includes("Interception")) hDA++;
                } else {
                    if (e.xg) { aX += e.xg; aS++; if (["GOAL", "SHOT"].includes(e.type)) aST++; }
                    if (e.type === "TRANSITION" && e.description.includes("Interception")) aDA++;
                }
            });
            
            stats.hS.value = hS; stats.aS.value = aS;
            stats.hST.value = hST; stats.aST.value = aST;
            stats.hX.value = hX; stats.aX.value = aX;
            stats.hDA.value = hDA; stats.aDA.value = aDA;
            stats.hPass.value = Math.round(min * 5 * (possession.value/100));
            stats.aPass.value = Math.round(min * 5 * ((100-possession.value)/100));

		}, 800);

		return () => clearInterval(timer);
	}, [liveMatch]);

    const highlights = (displayedEvents.value || []).filter((e: any) => 
        e && ["GOAL", "CARD", "RED_CARD", "INJURY", "MISS", "SHOT", "PENALTY"].includes(e.type)
    );

    const currentNavArray = activeTab === "highlights" ? highlights : (activeTab === "flux" ? displayedEvents.value : []);
    
    useEffect(() => {
        if (currentNavArray.length > 0) {
            setCurrentEventIndex(currentNavArray.length - 1);
        }
    }, [currentNavArray.length, activeTab]);

    const handleFinalize = async () => {
        if (!liveMatch) return;
        const mId = liveMatch.matchId;
        await finalizeLiveMatch();
        if (onShowReport) onShowReport(mId);
    };

	if (!liveMatch) return null;

	return (
		<div className="absolute inset-0 z-[200] flex flex-col bg-gray-50 animate-fade-in overflow-hidden text-gray-900">
			<Scoreboard
				homeTeam={liveMatch.homeTeam} awayTeam={liveMatch.awayTeam}
				homeScore={homeScore} awayScore={awayScore} minute={currentMinute}
				homeScorers={homeScorers} awayScorers={awayScorers}
				possession={possession} isFinished={isFinished.value}
				stoppageTime={stoppageTime}
			/>

            <div className="bg-white border-b border-gray-100 shrink-0">
                <div className="px-4 mt-2 mb-2">
                    <div className="h-14 w-full bg-gray-50/50 rounded-xl flex items-center relative overflow-hidden border border-gray-100">
                        <div className="absolute inset-x-0 top-1/2 h-px bg-gray-200 z-0" />
                        <div className="absolute inset-0 flex items-center gap-[1px] px-1 z-10">
                            {momentumHistory.value.map((m, i) => (
                                <div key={i} className="flex-1 h-full relative">
                                    {m && m.val > 0 ? (
                                        <div className="absolute bottom-1/2 left-0 right-0 bg-blue-500/80 rounded-t-[1px]" style={{ height: `${m.val}%` }} />
                                    ) : m && m.val < 0 ? (
                                        <div className="absolute top-1/2 left-0 right-0 bg-orange-500/80 rounded-b-[1px]" style={{ height: `${-m.val}%` }} />
                                    ) : null}
                                </div>
                            ))}
                        </div>
                        <div className="absolute h-full w-[2px] bg-blue-600 z-30 shadow-[0_0_8px_rgba(37,99,235,0.5)] transition-none" style={{ left: `${(currentMinute.value / 95) * 100}%` }} />
                    </div>
                </div>

                <div className="px-4">
                    <MatchEngine minute={currentMinute} events={displayedEvents.value} ballHistory={liveMatch.result?.ballHistory || []} homeTeamId={liveMatch.homeTeam?.id || 0} />
                </div>

                <div className="px-4 mt-3 pb-3">
                    <div className="flex bg-gray-100/80 rounded-xl p-1 mb-2 border border-gray-100">
                        <button onClick={() => setActiveTab("flux")} className={`flex-1 py-1.5 flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${activeTab === "flux" ? "bg-white text-emerald-600 shadow-sm" : "text-gray-400"}`}><MessageSquareText size={12} /> Flux</button>
                        <button onClick={() => setActiveTab("highlights")} className={`flex-1 py-1.5 flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${activeTab === "highlights" ? "bg-white text-emerald-600 shadow-sm" : "text-gray-400"}`}><Star size={12} /> Highlights</button>
                        <button onClick={() => setActiveTab("stats")} className={`flex-1 py-1.5 flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${activeTab === "stats" ? "bg-white text-emerald-600 shadow-sm" : "text-gray-400"}`}><BarChart3 size={12} /> Stats</button>
                    </div>

                    {activeTab !== "stats" && (
                        <div className="bg-white border border-gray-100 rounded-2xl p-4 relative h-28 flex items-center shadow-sm">
                            <button onClick={() => setCurrentEventIndex(prev => Math.max(0, prev - 1))} disabled={currentEventIndex <= 0} className={`p-2 rounded-full shrink-0 ${currentEventIndex <= 0 ? 'text-gray-100' : 'text-emerald-600 bg-gray-50'}`}><ChevronLeft size={24} /></button>
                            <div className="flex-1 min-w-0 px-4 flex items-center h-full" key={`${activeTab}-${currentEventIndex}`}>
                                {currentNavArray[currentEventIndex] ? (
                                    <div className="w-full animate-in fade-in slide-in-from-bottom-2 duration-300">
                                        <EventItem event={currentNavArray[currentEventIndex]} homeTeamId={liveMatch.homeTeam?.id || 0} />
                                    </div>
                                ) : (
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-300 italic w-full text-center">Aucun événement</p>
                                )}
                            </div>
                            <button onClick={() => setCurrentEventIndex(prev => Math.min(currentNavArray.length - 1, prev + 1))} disabled={currentEventIndex >= currentNavArray.length - 1} className={`p-2 rounded-full shrink-0 ${currentEventIndex >= currentNavArray.length - 1 ? 'text-gray-100' : 'text-emerald-600 bg-gray-50'}`}><ChevronRight size={24} /></button>
                            <div className="absolute top-2 right-4 flex items-center gap-2">
                                <span className="text-[10px] font-black text-blue-600 tabular-nums">{currentNavArray[currentEventIndex]?.minute || 0}'</span>
                                <span className="text-[7px] font-black text-gray-200 uppercase">{currentNavArray.length > 0 ? currentEventIndex + 1 : 0}/{currentNavArray.length}</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

			<div className="flex-1 overflow-y-auto bg-gray-50 pb-24" ref={scrollRef}>
                <div className="p-4 max-w-md mx-auto h-full">
                    {activeTab === "stats" && (
                        <div className="space-y-2 animate-in fade-in duration-500">
                            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
                                <StatRow label="Possession" h={possession.value} a={100 - possession.value} unit="%" />
                                <StatRow label="Tirs" h={stats.hS.value} a={stats.aS.value} />
                                <StatRow label="Tirs Cadrés" h={stats.hST.value} a={stats.aST.value} />
                                <StatRow label="Expected Goals" h={stats.hX.value.toFixed(2)} a={stats.aX.value.toFixed(2)} />
                                <div className="pt-2 border-t border-gray-50 space-y-4">
                                    <StatRow label="Interceptions" h={stats.hDA.value} a={stats.aDA.value} />
                                    <StatRow label="Passes (est.)" h={stats.hPass.value} a={stats.aPass.value} />
                                </div>
                            </div>
                        </div>
                    )}
                    {activeTab !== "stats" && (
                        <div className="h-full flex flex-col items-center justify-center py-12 opacity-30">
                            <Users size={32} className="text-gray-400 mb-2" />
                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">Match en direct</p>
                        </div>
                    )}
                </div>
			</div>

            <div className="absolute bottom-0 inset-x-0 bg-white/90 backdrop-blur-xl border-t border-gray-100 p-4 flex items-center justify-between z-50">
                <div className="flex items-center gap-4">
                    {!isFinished.value && (
                        <button onClick={() => isPaused.value = !isPaused.value} className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${isPaused.value ? 'bg-emerald-600 text-white shadow-emerald-200' : 'bg-gray-100 text-gray-600'}`}>
                            {isPaused.value ? <Play size={24} fill="currentColor" /> : <Pause size={24} fill="currentColor" />}
                        </button>
                    )}
                    <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">{isFinished.value ? 'Terminé' : (isPaused.value ? 'En pause' : 'En direct')}</p>
                        <p className="text-xs font-black text-gray-800">Match {liveMatch.matchId}</p>
                    </div>
                </div>

                {!isFinished.value ? (
                    <button onClick={() => { currentMinute.value = 90 + stoppageTime.value; isFinished.value = true; }} className="px-5 py-2.5 bg-gray-100 rounded-full text-[9px] font-black uppercase tracking-widest text-gray-500 flex items-center gap-2"><FastForward size={14} /> Passer</button>
                ) : (
                    <button onClick={handleFinalize} className="px-6 py-2.5 bg-emerald-600 rounded-full text-[9px] font-black uppercase tracking-widest text-white shadow-lg shadow-emerald-200">Continuer</button>
                )}
            </div>
		</div>
	);
}

function StatRow({ label, h, a, unit = "" }: { label: string, h: any, a: any, unit?: string }) {
    const total = Number(h) + Number(a) || 1;
    const hPerc = (Number(h) / total) * 100;
    return (
        <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-gray-400">
                <span className="text-gray-900 w-12">{h}{unit}</span>
                <span className="flex-1 text-center text-[9px]">{label}</span>
                <span className="text-gray-900 w-12 text-right">{a}{unit}</span>
            </div>
            <div className="w-full h-1.5 bg-gray-50 rounded-full overflow-hidden flex relative border border-gray-100">
                <div className="h-full bg-blue-600 transition-all duration-1000" style={{ width: `${hPerc}%` }} />
                <div className="h-full bg-orange-500 transition-all duration-1000" style={{ width: `${100 - hPerc}%` }} />
            </div>
        </div>
    );
}
