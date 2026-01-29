import { Play, Pause, FastForward, StepForward, StepBack, RotateCcw } from "lucide-preact";
import type { Signal } from "@preact/signals";

interface MatchControlsProps {
    isPaused: Signal<boolean>;
    isFinished: boolean; // Reçu depuis MatchLive (isActuallyFinished)
    onGoToStart: () => void;
    onStepBack: () => void;
    onStepForward: () => void;
    onSkip: () => void;
    onFinalize: () => void;
    disableStepBack?: boolean;
}

export default function MatchControls({
    isPaused,
    isFinished,
    onGoToStart,
    onStepBack,
    onStepForward,
    onSkip,
    onFinalize,
    disableStepBack = false
}: MatchControlsProps) {
    
    // Styles réutilisables
    const buttonBase = "w-10 h-10 rounded-xl flex items-center justify-center active:scale-95 transition-all duration-200 disabled:opacity-20 disabled:pointer-events-none";
    const buttonSecondary = `${buttonBase} bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm`;
    const buttonPrimary = `${buttonBase} bg-slate-900 shadow-lg hover:bg-slate-800`;

    return (
        <div className="absolute bottom-0 inset-x-0 bg-white/95 backdrop-blur-xl border-t border-slate-200 p-4 flex items-center justify-between z-[100] shadow-[0_-10px_30px_rgba(0,0,0,0.08)]">
            
            <div className="flex items-center gap-1.5">
                {/* Revenir au début */}
                <button 
                    onClick={onGoToStart} 
                    className={buttonSecondary} 
                    disabled={disableStepBack}
                    title="Début du match"
                >
                    <RotateCcw size={18} />
                </button>

                {/* Reculer d'un log */}
                <button 
                    onClick={onStepBack} 
                    className={buttonSecondary} 
                    disabled={disableStepBack}
                    title="Action précédente"
                >
                    <StepBack size={20} />
                </button>

                {/* Play / Pause */}
                <button 
                    onClick={() => { if (!isFinished) isPaused.value = !isPaused.value; }} 
                    className={`${buttonPrimary} ${isFinished ? 'opacity-30' : ''}`}
                >
                    {isPaused.value ? (
                        <Play size={20} className="text-white fill-white ml-0.5" />
                    ) : (
                        <Pause size={20} className="text-white fill-white" />
                    )}
                </button>

                {/* Avancer d'un log */}
                <button 
                    onClick={onStepForward} 
                    className={buttonSecondary}
                    disabled={isFinished}
                    title="Action suivante"
                >
                    <StepForward size={20} />
                </button>

                {/* Sauter à la fin */}
                <button 
                    onClick={onSkip} 
                    className={buttonSecondary}
                    disabled={isFinished}
                    title="Sauter à la fin"
                >
                    <FastForward size={18} />
                </button>
            </div>

            {/* BOUTON DE SORTIE : Apparaît uniquement à la fin */}
            {isFinished && (
                <button 
                    onClick={(e) => {
                        e.preventDefault();
                        onFinalize();
                    }} 
                    className="flex-1 ml-4 h-11 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-[11px] font-black uppercase text-white shadow-lg shadow-emerald-200/50 active:scale-95 transition-all animate-in zoom-in slide-in-from-right-4 duration-500 whitespace-nowrap"
                >
                    Consulter le Rapport
                </button>
            )}
        </div>
    );
}