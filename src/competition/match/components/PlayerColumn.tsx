interface PlayerRating {
    name: string;
    rating: number;
    goals?: number;
    fatigue?: number;
    role?: string;
    position?: string;
}

interface PlayerColumnProps {
    team: { name: string };
    players: PlayerRating[];
    color: 'blue' | 'orange';
}

const getRatingColor = (rating: number): string => {
    if (rating >= 8.0) return 'bg-emerald-500 text-white';
    if (rating >= 7.0) return 'bg-blue-500 text-white';
    if (rating >= 6.0) return 'bg-amber-500 text-white';
    return 'bg-rose-500 text-white';
};

export default function PlayerColumn({ team, players, color }: PlayerColumnProps) {
    const sortedPlayers = [...players].sort((a, b) => b.rating - a.rating);

    return (
        <div className="flex flex-col gap-2 w-full">
            <h4 className={`text-[13px] font-black uppercase text-${color}-600 mb-3 truncate`}>
                {team.name}
            </h4>
            {sortedPlayers.map((p, i) => (
                <div key={i} className="bg-white border border-slate-100 rounded-lg p-3 flex items-center justify-between shadow-sm w-full">
                    <div className="flex flex-col">
                        <span className="text-[13px] font-bold text-slate-700 truncate max-w-[120px]">
                            {p.name}
                            {p.role && (
                                <span className="ml-2 text-[11px] font-bold text-blue-400">[{p.role}]</span>
                            )}
                        </span>
                        {p.goals && p.goals > 0 && (
                            <span className="text-[11px] text-emerald-500 font-black mt-0.5">⚽ {p.goals}</span>
                        )}
                        {typeof p.fatigue === 'number' && (
                            <span className="text-[11px] text-rose-500 font-black mt-0.5">
                                Fatigue : {Math.round(p.fatigue)}%
                            </span>
                        )}
                    </div>
                    <span className={`text-[13px] font-black px-2 py-1 rounded ${getRatingColor(p.rating)}`}>
                        {typeof p.rating === 'number' ? p.rating.toFixed(1) : '--'}
                    </span>
                </div>
            ))}
        </div>
    );
}
