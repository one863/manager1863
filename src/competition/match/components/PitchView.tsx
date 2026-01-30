import { ReadonlySignal } from "@preact/signals";

interface PitchViewProps {
    displayPos: ReadonlySignal<{ x: number; y: number }>;
    effectiveTeamId: ReadonlySignal<number | undefined>;
    homeTeamId: number;
    awayTeamId: number;
    currentLog: ReadonlySignal<any>;
    previousLog: ReadonlySignal<any>;
    possession?: ReadonlySignal<number[]>;
}

const GRASS_STRIPES = [...Array(10)];
const GRID_CELLS = [...Array(30)];

export default function PitchView({ 
    displayPos, 
    effectiveTeamId, 
    homeTeamId, 
    awayTeamId, 
    currentLog, 
    previousLog,
    possession
}: PitchViewProps) {
    // Extraction des valeurs des Signals
    const pos = displayPos.value;
    const log = currentLog.value;
    const prevLog = previousLog.value;
    const effectiveId = effectiveTeamId?.value;
    const possessionVals = (possession as any)?.value;

    // 1. Logique de Possession et Couleurs
    const teamId = effectiveId ?? log?.possessionTeamId ?? prevLog?.possessionTeamId ?? 
                   (possessionVals && possessionVals[0] > possessionVals[1] ? homeTeamId : awayTeamId);
    
    const isHomePossession = String(teamId) === String(homeTeamId);
    const possessionColor = isHomePossession ? 'bg-blue-500' : 'bg-orange-500';

    // 2. Détection du type d'événement
    const isKickOffSituation = 
        !prevLog || 
        log?.situation === 'KICK_OFF' || 
        log?.situation === 'KICK_OFF_RESTART' || 
        (log?.text && /coup d'envoi/i.test(log.text));

    // On veut afficher le tirage du sac N-1 (log précédent)
    const drawnToken = prevLog?.drawnToken || prevLog?.token;
    const tokenLabel = drawnToken?.type || drawnToken?.action || "Action";
    const showDrawnToken = !!drawnToken && !isKickOffSituation;

    // Couleur dynamique du badge selon le token tiré (home/away)
    let badgeColor = 'bg-slate-400 text-white border-slate-300';
    if (isKickOffSituation) {
        badgeColor = 'bg-slate-900 text-white border-white/50';
    } else {
        // Couleur du badge = couleur de l'équipe qui a la possession
        badgeColor = isHomePossession
            ? 'bg-blue-600 text-white border-blue-400'
            : 'bg-orange-500 text-white border-orange-300';
    }

    return (
        <div className="relative w-full max-w-2xl mx-auto aspect-[105/68] bg-emerald-600 border-[3px] border-white/40 shadow-2xl overflow-hidden rounded-3xl">
            {/* Pelouse (Zébrure) */}
            <div className="absolute inset-0 flex z-0">
                {GRASS_STRIPES.map((_, i) => (
                    <div key={i} className={`h-full flex-1 ${i % 2 === 0 ? 'bg-black/5' : ''}`} />
                ))}
            </div>
            
            {/* Marquages au sol */}
            <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white/40 -translate-x-1/2 z-10" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[18%] aspect-square border-2 border-white/40 rounded-full flex items-center justify-center z-10">
                <div className="w-1.5 h-1.5 bg-white rounded-full" />
            </div>
            
            {/* Surfaces de réparation & Buts */}
            <div className="absolute left-0 top-1/2 -translate-y-1/2 h-[62%] w-[15%] border-2 border-l-0 border-white/40 z-10" />
            <div className="absolute right-0 top-1/2 -translate-y-1/2 h-[62%] w-[15%] border-2 border-r-0 border-white/40 z-10" />
            <div className="absolute top-1/2 left-[-2px] -translate-y-1/2 w-1 h-[12%] bg-white/90 rounded-sm z-20 shadow-[0_0_8px_white]" />
            <div className="absolute top-1/2 right-[-2px] -translate-y-1/2 w-1 h-[12%] bg-white/90 rounded-sm z-20 shadow-[0_0_8px_white]" />
            
            {/* Grille de jeu et Ballon */}
            <div className="absolute inset-0 grid grid-cols-6 grid-rows-5 z-30">
                {GRID_CELLS.map((_, i) => {
                    const x = i % 6;
                    // Inversion de l'axe Y pour avoir (0,0) en bas à gauche
                    const y = 4 - Math.floor(i / 6);
                    const inGrid = pos.x >= 0 && pos.x <= 5 && pos.y >= 0 && pos.y <= 4;
                    // Inversion de l'axe Y pour l'affichage : yAffiche = 4 - pos.y
                    const yAffiche = 4 - pos.y;
                    const hasBall = inGrid && pos.x === x && yAffiche === y;
                    // ...
                    return (
                        <div key={i} className="relative flex items-center justify-center border border-white/5">
                            {hasBall && (
                                <div className="relative flex flex-col items-center justify-center transition-all duration-500 ease-out">
                                    {/* Aura de possession animée */}
                                    <div className={`absolute w-10 h-10 ${possessionColor} opacity-30 rounded-full animate-ping`} />
                                    {/* Le Ballon */}
                                    <div className={`w-4 h-4 ${possessionColor} rounded-full border-2 border-white shadow-xl z-30 flex items-center justify-center transition-colors duration-300`}>
                                        <div className="w-1 h-1 bg-white rounded-full animate-pulse" />
                                    </div>
                                    {/* Badge Action Dynamique */}
                                    {(showDrawnToken || isKickOffSituation) && (
                                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-bottom-2 duration-300">
                                            <div className={`px-2 py-1 rounded-md text-[9px] font-black uppercase whitespace-nowrap shadow-xl border-2 tracking-tighter ${badgeColor}`}>
                                                {isKickOffSituation ? "KICKOFF" : tokenLabel}
                                            </div>
                                            {/* Petite flèche sous le badge */}
                                            <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-inherit mx-auto" />
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