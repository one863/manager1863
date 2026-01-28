import { Play, Pause, FastForward, StepForward, StepBack } from "lucide-preact";
import type { Signal } from "@preact/signals";

interface MatchControlsProps {
    isPaused: Signal<boolean>;
    isFinished: boolean;
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
    const buttonBase = "w-10 h-10 rounded-xl flex items-center justify-center active:scale-95 transition-transform";
    const buttonSecondary = `${buttonBase} bg-white border border-slate-200`;

    return (
        <div className="absolute bottom-0 inset-x-0 bg-white/90 backdrop-blur-xl border-t border-slate-200 p-4 flex items-center justify-between z-50 shadow-[0_-10px_30px_rgba(0,0,0,0.02)]">
            <div className="flex items-center gap-2">
                <button onClick={onGoToStart} title="Début" className={buttonSecondary} disabled={disableStepBack}>
                    <StepBack size={20} /><StepBack size={20} className="-ml-3" />
                </button>
                <button onClick={onStepBack} title="Log précédent" className={buttonSecondary} disabled={disableStepBack}>
                    <StepBack size={20} />
                </button>
                <button 
                    onClick={() => isPaused.value = !isPaused.value} 
                    title={isPaused.value ? "Lecture" : "Pause"} 
                    className={`${buttonBase} bg-slate-900 shadow-lg`}
                >
                    {isPaused.value ? <Play size={20} className="text-white fill-white" /> : <Pause size={20} className="text-white fill-white" />}
                </button>
                <button onClick={onStepForward} title="Log suivant" className={buttonSecondary}>
                    <StepForward size={20} />
                </button>
                <button onClick={onSkip} title="Aller à la fin du match" className={buttonSecondary}>
                    <FastForward size={20} className="text-slate-600" />
                </button>
                {isFinished && (
                    <button 
                        onClick={onFinalize} 
                        className="px-4 py-2.5 bg-emerald-600 rounded-xl text-[10px] font-black uppercase text-white shadow-lg active:scale-95 transition-transform ml-2"
                    >
                        Rapport
                    </button>
                )}
            </div>
        </div>
    );
}
