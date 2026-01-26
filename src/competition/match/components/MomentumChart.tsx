import { TrendingUp } from "lucide-preact";
import type { ReadonlySignal } from "@preact/signals";

interface MomentumChartProps {
    momentum: ReadonlySignal<number[]>;
    currentTime: number;
    maxTime: number;
}

export default function MomentumChart({ momentum, currentTime, maxTime }: MomentumChartProps) {
    const values = momentum.value;
    const barsLen = values.length;

    return (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden relative transition-all duration-300 h-32 flex-none">
            <div className="p-4 flex-1 flex flex-col justify-center relative">
                <div className="flex items-center gap-2 mb-2">
                    <TrendingUp size={14} className="text-slate-600" />
                    <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Domination</span>
                </div>
                <div className="flex-1 flex items-end justify-between gap-[3px] relative">
                    <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-slate-100 z-0 -translate-y-1/2" />
                    {values.map((val, i) => {
                        const isPast = currentTime > 0 && (i / barsLen) < (currentTime / maxTime);
                        if (!isPast) return <div key={i} className="flex-1 h-full bg-slate-50/50" />;
                        const height = Math.min(45, Math.abs(val) * 6);
                        const colorClass = val > 0 ? 'bg-blue-500' : 'bg-orange-500';
                        return (
                            <div key={i} className="flex-1 h-full relative">
                                <div 
                                    className={`absolute w-full rounded-full ${colorClass} opacity-80`} 
                                    style={{ 
                                        height: `${height}%`, 
                                        bottom: val > 0 ? '50%' : 'auto', 
                                        top: val <= 0 ? '50%' : 'auto' 
                                    }} 
                                />
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
