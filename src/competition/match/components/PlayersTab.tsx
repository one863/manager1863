import PlayerColumn from "./PlayerColumn";

export default function PlayersTab({ homePlayers, awayPlayers, homeTeam, awayTeam, ratings }: {
    homePlayers: any[];
    awayPlayers: any[];
    homeTeam: any;
    awayTeam: any;
    ratings: Record<string, number>;
}) {
    if (!homePlayers?.length && !awayPlayers?.length) {
        return <div className="text-xs text-gray-400 italic p-4">Aucun joueur à afficher.</div>;
    }
    return (
        <div className="flex flex-col md:flex-row gap-4">
            <PlayerColumn players={homePlayers} team={homeTeam} color="blue" />
            <PlayerColumn players={awayPlayers} team={awayTeam} color="orange" />
        </div>
    );
}
