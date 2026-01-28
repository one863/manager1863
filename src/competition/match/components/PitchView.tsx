import type { ReadonlySignal } from "@preact/signals";

interface PitchViewProps {
    displayPos: ReadonlySignal<{ x: number; y: number }>;
    effectiveTeamId: ReadonlySignal<number | undefined>;
    homeTeamId: number;
    awayTeamId: number;
    currentLog: ReadonlySignal<any>;
    previousLog: ReadonlySignal<any>;
}

const GRASS_STRIPES = [...Array(10)];
const GRID_CELLS = [...Array(30)];

export default function PitchView({ displayPos, effectiveTeamId, homeTeamId, awayTeamId, currentLog, previousLog }: PitchViewProps) {
    const pos = displayPos.value;
    const log = currentLog.value;
    const prevLog = previousLog.value; // On récupère la valeur du signal ici
    
    const teamId = log?.possessionTeamId ?? effectiveTeamId.value;

    // --- CORRECTION ---
    // Si prevLog est null (Index 0), c'est FORCÉMENT le coup d'envoi du match.
    // Sinon, on vérifie la situation ou le texte pour les remises en jeu après but/mi-temps.
    const isKickOffSituation = 
        !prevLog || // <--- AJOUT CRUCIAL : Force l'état Kickoff au tout début
        log?.situation === 'KICK_OFF' || 
        log?.situation === 'KICK_OFF_RESTART' || 
        (log?.text && /coup d'envoi/i.test(log.text));

    // On n'affiche le badge du token QUE si ce n'est pas un coup d'envoi
    const showDrawnToken = !isKickOffSituation && log?.drawnToken;

    // --- COULEURS ---
    let possessionColor = 'bg-gray-400';
    if (teamId === homeTeamId) possessionColor = 'bg-blue-500';
    else if (teamId === awayTeamId) possessionColor = 'bg-orange-500';

    let kickoffColor = 'bg-slate-900';
    // Pour le kickoff, on utilise l'équipe qui a la possession dans le log actuel
    if (isKickOffSituation) {
        if (log?.possessionTeamId === homeTeamId) kickoffColor = 'bg-blue-600';
        else if (log?.possessionTeamId === awayTeamId) kickoffColor = 'bg-orange-500';
    }

    return (
        <div className="relative w-full max-w-2xl mx-auto aspect-[105/68] bg-emerald-600 border-[3px] border-white/50 shadow-2xl overflow-visible rounded-3xl">
            {/* Pelouse */}
            <div className="absolute inset-0 flex z-0">
                {GRASS_STRIPES.map((_, i) => (
                    <div key={i} className={`h-full flex-1 ${i % 2 === 0 ? 'bg-black/5' : ''}`} />
                ))}
            </div>
            
            {/* Marquages */}
            <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white/60 -translate-x-1/2 z-10" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[18%] aspect-square border-2 border-white/60 rounded-full flex items-center justify-center z-10">
                <div className="w-1.5 h-1.5 bg-white rounded-full" />
            </div>
            
            {/* Surfaces */}
            <div className="absolute left-0 top-1/2 -translate-y-1/2 h-[62%] w-[16%] border-2 border-l-0 border-white/60 z-10">
                <div className="absolute left-0 top-1/2 -translate-y-1/2 h-[35%] w-[33%] border-2 border-l-0 border-white/60" />
                <div className="absolute right-[25%] top-1/2 -translate-y-1/2 w-1 h-1 bg-white rounded-full" />
                <div className="absolute top-1/2 -right-[28%] -translate-y-1/2 h-[32%] w-[28%] border-2 border-l-0 border-white/60 rounded-r-full" />
            </div>
            
            <div className="absolute right-0 top-1/2 -translate-y-1/2 h-[62%] w-[16%] border-2 border-r-0 border-white/60 z-10">
                <div className="absolute right-0 top-1/2 -translate-y-1/2 h-[35%] w-[33%] border-2 border-r-0 border-white/60" />
                <div className="absolute left-[25%] top-1/2 -translate-y-1/2 w-1 h-1 bg-white rounded-full" />
                <div className="absolute top-1/2 -left-[28%] -translate-y-1/2 h-[32%] w-[28%] border-2 border-r-0 border-white/60 rounded-l-full" />
            </div>
            
            {/* Buts */}
            <div className="absolute top-1/2 left-[-4px] -translate-y-1/2 w-1 h-[12%] bg-white/80 rounded-sm shadow-[0_0_8px_white] z-20" />
            <div className="absolute top-1/2 right-[-4px] -translate-y-1/2 w-1 h-[12%] bg-white/80 rounded-sm shadow-[0_0_8px_white] z-20" />
            
            {/* Grille Logique */}
            <div className="absolute inset-0 grid grid-cols-6 grid-rows-5 z-30 overflow-visible">
                {GRID_CELLS.map((_, i) => {
                    const x = i % 6;
                    const y = Math.floor(i / 6);
                    const isBall = pos.x === x && pos.y === y;
                    
                    return (
                        <div key={i} className="relative flex items-center justify-center border border-white/5 hover:bg-white/5 transition-colors overflow-visible">
                            {isBall && (
                                <div className="relative flex items-center justify-center scale-110">
                                    {/* Ballon */}
                                    <div className={`absolute w-10 h-10 ${possessionColor} opacity-30 rounded-full animate-ping`} />
                                    <div className={`w-5 h-5 ${possessionColor} rounded-full border-2 border-white shadow-[0_0_15px_rgba(0,0,0,0.3)] z-30 flex items-center justify-center`}>
                                        <div className="w-1 h-1 bg-white rounded-full animate-pulse" />
                                    </div>
                                    
                                    {/* Badge : Token tiré OU Kickoff */}
                                    {(showDrawnToken || isKickOffSituation) && (
                                        <div className={
                                            x === 0 ? "absolute -top-7 left-0 z-50 text-left min-w-[80px]" :
                                            x === 5 ? "absolute -top-7 right-0 z-50 text-right min-w-[80px]" :
                                            "absolute -top-7 left-1/2 -translate-x-1/2 z-50 text-center min-w-[80px]"
                                        }>
                                            {showDrawnToken ? (
                                                <div className={
                                                    `inline-block text-[10px] px-2 py-1 rounded-md font-black uppercase whitespace-nowrap shadow-xl border-2 tracking-wide transform transition-all duration-300 ease-out ` +
                                                    (String(log.drawnToken.teamId) === String(homeTeamId)
                                                        ? 'bg-blue-600 text-white border-white/30'
                                                        : String(log.drawnToken.teamId) === String(awayTeamId)
                                                        ? 'bg-orange-500 text-white border-white/30'
                                                        : 'bg-slate-800 text-white border-white/30')
                                                }>
                                                    <div className="flex items-center gap-1 justify-center">
                                                        <span className="opacity-75">{log.drawnToken.position}</span>
                                                        <span>{log.drawnToken.type}</span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className={`${kickoffColor} inline-block text-[10px] text-white px-2 py-1 rounded-md border-2 border-white/30 font-black uppercase whitespace-nowrap shadow-xl tracking-wide`}>
                                                    KICKOFF
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}