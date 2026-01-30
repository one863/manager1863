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
const GRID_CELLS = [...Array(30)]; // 6x5 = 30 cases



export default function PitchView({ 
    displayPos, 
    homeTeamId, 
    currentLog, 
    previousLog 
}: PitchViewProps) {
    // Sécurisation : accepte previousLog null/undefined sans erreur ni log
    if (!displayPos || !currentLog) {
        // displayPos et currentLog sont obligatoires
        console.error('[PitchView] Props manquantes', {
            displayPos,
            currentLog
        });
        return (
            <div className="w-full h-full flex items-center justify-center text-red-600 bg-white/80">
                <span>Erreur d'affichage du terrain (données manquantes)</span>
            </div>
        );
    }

    // Extraction des valeurs
    const pos = displayPos.value ?? { x: 0, y: 0 };
    const log = currentLog.value ?? {};
    // previousLog peut être null/undefined, on fallback sur un objet vide
    const prevLog = previousLog?.value ?? {};

    // Détermination de la possession (Home = Bleu, Away = Orange)
    const possessionTeamId = log?.possessionTeamId;
    const isHomePossession = possessionTeamId !== undefined && Number(possessionTeamId) === Number(homeTeamId);
    const posColorClass = isHomePossession ? 'bg-blue-600' : 'bg-orange-500';
    const posBorderClass = isHomePossession ? 'border-blue-400' : 'border-orange-300';

    // Badge = type du jeton tiré du sac N-1 (drawnToken du log N), sauf coup d'envoi
    const isKickOff = log?.situation === 'KICK_OFF' || (log?.text && /coup d'envoi/i.test(log.text));
    const prevDrawnToken = log?.drawnToken; // drawnToken du log N (tiré dans le sac N-1)
    const tokenLabel = isKickOff
        ? "COUP D'ENVOI"
        : (prevDrawnToken?.type?.replace('_', ' ') || "Action");

    return (
        <div className="relative w-full max-w-2xl mx-auto aspect-[105/68] bg-emerald-600 border-[3px] border-white/40 shadow-2xl overflow-hidden rounded-3xl">
            {/* Pelouse (Zébrures) */}
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
            
            {/* Grille de positionnement (6x5) */}
            <div className="absolute inset-0 grid grid-cols-6 grid-rows-5 z-30">
                {GRID_CELLS.map((_, i) => {
                    const x = i % 6;
                    const y = 4 - Math.floor(i / 6); // Inverse l'axe Y pour que 0 soit en bas
                    const hasBall = pos.x === x && pos.y === y;

                    // Détermine si c'est la ligne supérieure (y=0 dans le système inversé)
                    const isTopRow = (y === 0);
                    const badgePositionClass = isTopRow ? 'top-full mt-2' : 'bottom-full mb-2';
                    const arrowClass = isTopRow ? 'border-b-[4px] border-b-white/80' : 'border-t-[4px] border-t-white/80';

                    return (
                        <div key={i} className="relative flex items-center justify-center">
                            {hasBall && (
                                <div className="relative flex flex-col items-center justify-center">
                                    {/* Aura de possession animée */}
                                    <div className={`absolute w-12 h-12 ${posColorClass} opacity-30 rounded-full animate-ping`} />
                                    {/* Le Ballon */}
                                    <div className={`w-6 h-6 ${posColorClass} rounded-full border-2 border-white shadow-xl z-30 flex items-center justify-center transition-all duration-500`}>
                                        <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                                    </div>
                                    {/* Badge Action Dynamique (au-dessus/en-dessous du ballon) */}
                                    <div className={`absolute z-50 animate-bounce-short ${badgePositionClass}`}>
                                        <div className={`px-2 py-0.5 rounded shadow-lg border-2 text-[8px] font-black uppercase whitespace-nowrap ${posColorClass} ${posBorderClass} text-white`}>
                                            {tokenLabel}
                                        </div>
                                        {/* Petite flèche du badge (s'adapte à la position du badge) */}
                                        <div className={`w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent mx-auto ${arrowClass}`} />
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}