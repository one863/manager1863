interface PlayerRating {
    name: string;
    rating: number;
    goals?: number;
    fatigue?: number;
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
        <div className="flex flex-col gap-1">
            <h4 className={`text-[10px] font-black uppercase text-${color}-600 mb-2 truncate`}>
                {team.name}
            </h4>
            {sortedPlayers.map((p, i) => (
                <div key={i} className="bg-white border border-slate-100 rounded-lg p-2 flex items-center justify-between shadow-sm">
                    <div className="flex flex-col">
                        <span className="text-[9px] font-bold text-slate-600 truncate max-w-[60px]">
                            {p.name}
                        </span>
                        {p.goals && p.goals > 0 && (
                            <span className="text-[8px] text-emerald-500 font-black">⚽ {p.goals}</span>
                        )}
                        {typeof p.fatigue === 'number' && (
                            <span className="text-[8px] text-rose-500 font-black">
                                Fatigue : {Math.round(p.fatigue)}%
                            </span>
                        )}
                    </div>
                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${getRatingColor(p.rating)}`}>
                        {p.rating.toFixed(1)}
                    </span>
                </div>
            ))}
        </div>
    );
}
