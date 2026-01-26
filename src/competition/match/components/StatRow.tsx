interface StatRowProps {
    label: string;
    h: number | string;
    a: number | string;
}

export default function StatRow({ label, h, a }: StatRowProps) {
    const valH = Number(h) || 0;
    const valA = Number(a) || 0;
    const total = valH + valA || 1;

    return (
        <div className="flex flex-col gap-2">
            <div className="flex justify-between text-[11px] uppercase text-slate-600">
                <span>{h}</span>
                <span>{label}</span>
                <span>{a}</span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 rounded-full flex overflow-hidden">
                <div 
                    className="h-full bg-blue-500 transition-all duration-1000" 
                    style={{ width: `${(valH / total) * 100}%` }} 
                />
                <div 
                    className="h-full bg-orange-500 transition-all duration-1000" 
                    style={{ width: `${(valA / total) * 100}%` }} 
                />
            </div>
        </div>
    );
}
