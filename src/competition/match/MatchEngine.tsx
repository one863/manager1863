import { Trophy, AlertCircle, Zap, ShieldAlert, Goal } from "lucide-preact";
import type { Signal } from "@preact/signals";

export interface MatchEngineProps {
    minute?: Signal<number>; 
    events?: any[];
    ballHistory?: number[];
    homeTeamId?: number;
}

export default function MatchEngine({ 
    minute,
    events = [],
    ballHistory = [],
    homeTeamId
}: MatchEngineProps) {
    
    const currentMin = minute ? minute.value : 0;
    const currentZoneId = (ballHistory && ballHistory[currentMin]) ? ballHistory[currentMin] : 13; 
    const currentEvent = events.find((e: any) => e.minute === currentMin);

    let visualZoneId = currentZoneId;
    if (currentEvent && ["GOAL", "SHOT", "MISS"].includes(currentEvent.type)) {
        const isHomeAttacking = currentEvent.teamId === homeTeamId;
        visualZoneId = isHomeAttacking ? 28 : 3;
    }

    const row = Math.floor((visualZoneId - 1) / 5); 
    const col = (visualZoneId - 1) % 5; 

    const ballX = 8 + (row * 16.8);
    const ballY = 10 + (col * 20);

    return (
        <div className="w-full max-w-lg mx-auto animate-fade-in relative mt-2 select-none">
            <div className="relative w-full aspect-[3/2] bg-emerald-600 rounded-xl overflow-hidden border-4 border-white/10 shadow-xl">
                
                {/* Pelouse */}
                <div className="absolute inset-0 flex">
                    {[0,1,2,3,4,5,6,7,8,9,10,11].map(i => (
                        <div key={i} className={`flex-1 ${i % 2 === 0 ? 'bg-black/5' : ''}`} />
                    ))}
                </div>

                {/* Lignes */}
                <div className="absolute inset-4 border-2 border-white/40 rounded-sm pointer-events-none">
                    <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/40" />
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 border-2 border-white/40 rounded-full" />
                    <div className="absolute left-0 top-[20%] bottom-[20%] w-[15%] border-2 border-l-0 border-white/40 bg-white/5" />
                    <div className="absolute right-0 top-[20%] bottom-[20%] w-[15%] border-2 border-r-0 border-white/40 bg-white/5" />
                </div>

                {/* Ballon */}
                <div 
                    className={`absolute w-4 h-4 z-20 transition-all duration-700 ${currentEvent?.type === 'GOAL' ? 'ease-in' : 'ease-out'}`}
                    style={{ left: `${ballX}%`, top: `${ballY}%`, transform: 'translate(-50%, -50%)' }}
                >
                    <div className="w-3 h-3 bg-white rounded-full shadow-md border border-gray-400 flex items-center justify-center">
                        <div className="w-1 h-1 bg-black/10 rounded-full" />
                    </div>
                </div>

                {/* --- OVERLAYS TV STYLE (FOND NOIR) --- */}
                
                {/* GOAL OVERLAY */}
                {currentEvent?.type === 'GOAL' && (
                    <div className="absolute inset-0 bg-black/90 z-50 animate-in fade-in duration-300 flex items-center justify-center overflow-hidden">
                        <div className="absolute inset-0 opacity-20 flex items-center justify-center">
                            <Goal size={300} className="text-white animate-pulse" />
                        </div>
                        <div className="relative flex flex-col items-center animate-in zoom-in duration-500 delay-100">
                            <div className="text-emerald-500 font-black text-6xl tracking-tighter uppercase italic drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]">
                                GOAL !
                            </div>
                            <div className="mt-6 bg-emerald-600 text-white font-black text-xl px-10 py-3 rounded-full shadow-2xl uppercase tracking-[0.2em] border-2 border-white/20">
                                {currentEvent.scorerName}
                            </div>
                        </div>
                    </div>
                )}

                {/* RED CARD OVERLAY */}
                {currentEvent?.type === 'RED_CARD' && (
                    <div className="absolute inset-0 bg-black/90 z-50 animate-in fade-in duration-300 flex items-center justify-center">
                        <div className="flex flex-col items-center animate-in slide-in-from-bottom-10 duration-500">
                            <div className="bg-red-600 w-24 h-36 rounded-xl shadow-[0_0_50px_rgba(220,38,38,0.5)] border-4 border-white animate-pulse flex items-center justify-center">
                                <ShieldAlert size={48} className="text-white opacity-50" />
                            </div>
                            <div className="mt-8 text-red-500 font-black text-3xl uppercase tracking-widest italic">Expulsion</div>
                        </div>
                    </div>
                )}

                {/* PENALTY OVERLAY */}
                {(currentEvent?.type === 'PENALTY' || (currentEvent?.description?.toLowerCase().includes("penalty") && !currentEvent.type.includes("GOAL"))) && (
                    <div className="absolute inset-0 bg-black/80 z-50 flex items-center justify-center animate-in fade-in duration-500">
                        <div className="flex flex-col items-center">
                            <Zap size={64} className="text-yellow-400 animate-bounce mb-4" />
                            <div className="text-white font-black text-5xl uppercase tracking-[0.3em] drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">Penalty</div>
                        </div>
                    </div>
                )}

                {/* OCCASION OVERLAY */}
                {currentEvent?.type === 'SHOT' && (
                    <div className="absolute inset-0 bg-black/40 z-40 flex items-center justify-center pointer-events-none animate-in fade-in duration-300">
                         <div className="bg-white text-black font-black text-2xl px-10 py-3 rounded-xl shadow-2xl uppercase italic border-l-8 border-yellow-500 animate-in slide-in-from-left-10 duration-500">
                            Occasion !
                         </div>
                    </div>
                )}
            </div>
        </div>
    );
}
