import PlayerColumn from "./PlayerColumn";

export default function PlayersTab({ homePlayers, awayPlayers, homeTeam, awayTeam, ratings }: {
    homePlayers: any[];
    awayPlayers: any[];
    homeTeam: any;
    awayTeam: any;
    ratings: Record<string, number>;
}) {
    // On enrichit les joueurs avec la fatigue et la note
    const mapPlayers = (players: any[], ratings: Record<string, number>) => {
        // DEBUG: log les joueurs reçus
        if (players && players.length > 0) {
            // eslint-disable-next-line no-console
            players.forEach(p => {
                console.log(`[DEBUG] Player id=${p.id} name=${p.name} fatigue=${p.fatigue}`);
            });
        }
        return (players || []).map(p => ({
            name: p.name || [p.firstName, p.lastName].filter(Boolean).join(' ') || `Joueur #${p.id}`,
            fatigue: p.fatigue,
            rating: typeof ratings?.[p.id] === 'number' ? ratings[p.id] : 0,
            goals: p.goals ?? 0,
            role: p.role,
            position: p.position
        }));
    };

    const homePlayersWithFatigue = mapPlayers(homePlayers, ratings);
    const awayPlayersWithFatigue = mapPlayers(awayPlayers, ratings);

    if (!homePlayersWithFatigue.length && !awayPlayersWithFatigue.length) {
        return <div className="text-xs text-gray-400 italic p-4">Aucun joueur à afficher.</div>;
    }
    return (
        <div className="flex flex-col md:flex-row gap-4">
            <PlayerColumn players={homePlayersWithFatigue} team={homeTeam} color="blue" />
            <PlayerColumn players={awayPlayersWithFatigue} team={awayTeam} color="orange" />
        </div>
    );
}
