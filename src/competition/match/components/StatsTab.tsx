import StatRow from "./StatRow";

export default function StatsTab({ stats, homeTeam, awayTeam }: { stats: any, homeTeam: any, awayTeam: any }) {
    if (!stats || !homeTeam?.id || !awayTeam?.id) {
        return <div className="text-xs text-gray-400 italic p-4">Aucune statistique disponible.</div>;
    }
    return (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
            <h3 className="text-[10px] font-bold text-gray-600 uppercase tracking-widest border-b border-gray-50 pb-2">Statistiques</h3>
            <StatRow label="Possession" h={stats.possessionPercent?.[homeTeam.id] || 50} a={stats.possessionPercent?.[awayTeam.id] || 50} />
            <StatRow label="Passes" h={stats.passes?.[homeTeam.id]?.successful || 0} a={stats.passes?.[awayTeam.id]?.successful || 0} />
            <StatRow label="Tirs" h={stats.shots?.[homeTeam.id]?.total || 0} a={stats.shots?.[awayTeam.id]?.total || 0} />
            <StatRow label="Fautes" h={stats.fouls?.[homeTeam.id] || 0} a={stats.fouls?.[awayTeam.id] || 0} />
        </div>
    );
}
