import { db, type Player, type MatchResult } from "@/core/db/db";
import { useGameStore } from "@/infrastructure/store/gameSlice";
import { useEffect, useState } from "preact/hooks";
import PlayerAvatar from "@/squad/components/PlayerAvatar";
import { ArrowUpDown, Filter, Shield, Shirt, User, Goal, Handshake, Star, ChevronUp, ChevronDown, Coins } from "lucide-preact";

interface RosterProps {
	onSelectPlayer?: (player: Player) => void;
}

export default function Roster({ onSelectPlayer }: RosterProps) {
	const userTeamId = useGameStore((state) => state.userTeamId);
	const currentSaveId = useGameStore((state) => state.currentSaveId);
	const [players, setPlayers] = useState<Player[]>([]);
	const [filterPos, setFilterPos] = useState("ALL");
	const [sortConfig, setSortConfig] = useState<{ key: string; dir: "asc" | "desc" }>({ key: "position", dir: "asc" });

	useEffect(() => {
		const load = async () => {
			if (!userTeamId || !currentSaveId) return;
			const p = await db.players.where("[saveId+teamId]").equals([currentSaveId, userTeamId]).toArray();
			setPlayers(p);
		};
		load();
	}, [userTeamId, currentSaveId]);

	const getPositionOrder = (pos: string) => {
		const order: Record<string, number> = { GK: 0, DEF: 1, MID: 2, FWD: 3 };
		return order[pos] ?? 99;
	};

	const filteredPlayers = players.filter(p => filterPos === "ALL" || p.position === filterPos);
	
	const sortedPlayers = [...filteredPlayers].sort((a, b) => {
        if (sortConfig.key === "position") {
            const orderA = getPositionOrder(a.position);
            const orderB = getPositionOrder(b.position);
            if (orderA !== orderB) return sortConfig.dir === "asc" ? orderA - orderB : orderB - orderA;
            return b.skill - a.skill;
        }

        let aVal: any;
        let bVal: any;

        if (sortConfig.key === "matches") aVal = a.seasonStats?.matches || 0;
        else if (sortConfig.key === "goals") aVal = a.seasonStats?.goals || 0;
        else if (sortConfig.key === "rating") aVal = a.seasonStats?.avgRating || 0;
        else if (sortConfig.key === "marketValue") aVal = a.marketValue || 0;
        else if (sortConfig.key === "lastName") aVal = a.lastName.toLowerCase();
        else aVal = (a as any)[sortConfig.key] ?? 0;

        if (sortConfig.key === "matches") bVal = b.seasonStats?.matches || 0;
        else if (sortConfig.key === "goals") bVal = b.seasonStats?.goals || 0;
        else if (sortConfig.key === "rating") bVal = b.seasonStats?.avgRating || 0;
        else if (sortConfig.key === "marketValue") bVal = b.marketValue || 0;
        else if (sortConfig.key === "lastName") bVal = b.lastName.toLowerCase();
        else bVal = (b as any)[sortConfig.key] ?? 0;

		if (aVal < bVal) return sortConfig.dir === "asc" ? -1 : 1;
		if (aVal > bVal) return sortConfig.dir === "asc" ? 1 : -1;
		return 0;
	});

	const handleSort = (key: string) => {
		setSortConfig(prev => ({
			key,
			dir: prev.key === key && prev.dir === "desc" ? "asc" : "desc"
		}));
	};

    const SortIcon = ({ column }: { column: string }) => {
        if (sortConfig.key !== column) return <ArrowUpDown size={8} className="opacity-30 ml-0.5" />;
        return sortConfig.dir === "asc" ? <ChevronUp size={10} className="text-accent ml-0.5" /> : <ChevronDown size={10} className="text-accent ml-0.5" />;
    };

	return (
		<div className="space-y-4 pb-24">
			<div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
				{["ALL", "GK", "DEF", "MID", "FWD"].map(pos => (
					<button
						key={pos}
						onClick={() => setFilterPos(pos)}
						className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors whitespace-nowrap ${
							filterPos === pos ? "bg-ink text-white border-ink" : "bg-white text-ink-light border-gray-200"
						}`}
					>
						{pos === "ALL" ? "TOUS" : pos}
					</button>
				))}
			</div>

			<div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
				<div className="grid grid-cols-[40px_1fr_35px_35px_35px_50px_45px] gap-1 p-3 bg-gray-50 border-b border-gray-100 text-[9px] uppercase text-gray-600 items-center font-bold">
					<div onClick={() => handleSort("position")} className="flex items-center justify-center cursor-pointer">
                        Pos <SortIcon column="position" />
                    </div>
					<div onClick={() => handleSort("lastName")} className="flex items-center cursor-pointer pl-2">
                        Joueur <SortIcon column="lastName" />
                    </div>
                    <div onClick={() => handleSort("age")} className="flex items-center justify-center cursor-pointer">
                        Age <SortIcon column="age" />
                    </div>
					<div onClick={() => handleSort("matches")} className="flex items-center justify-center cursor-pointer">
                        MJ <SortIcon column="matches" />
                    </div>
					<div onClick={() => handleSort("goals")} className="flex items-center justify-center cursor-pointer">
                        Buts <SortIcon column="goals" />
                    </div>
					<div onClick={() => handleSort("marketValue")} className="flex items-center justify-center cursor-pointer">
                        Val. <SortIcon column="marketValue" />
                    </div>
					<div onClick={() => handleSort("rating")} className="flex items-center justify-center cursor-pointer">
                        Note <SortIcon column="rating" />
                    </div>
				</div>

				<div className="divide-y divide-gray-50">
					{sortedPlayers.map(player => {
                        const hasEnoughMatches = (player.seasonStats?.matches || 0) >= 2;
                        return (
                            <div 
                                key={player.id} 
                                onClick={() => onSelectPlayer && onSelectPlayer(player)}
                                className="grid grid-cols-[40px_1fr_35px_35px_35px_50px_45px] gap-1 p-4 items-center hover:bg-gray-50 transition-colors cursor-pointer"
                            >
                                <div className="flex justify-center">
                                    <span className={`px-2 py-0.5 rounded-[4px] text-[9px] border font-medium ${
                                        player.position === "GK" ? "bg-yellow-50 text-yellow-700 border-yellow-100" :
                                        player.position === "DEF" ? "bg-blue-50 text-blue-700 border-blue-100" :
                                        player.position === "MID" ? "bg-green-50 text-green-700 border-green-100" :
                                        "bg-red-50 text-red-700 border-red-100"
                                    }`}>
                                        {player.position}
                                    </span>
                                </div>
                                <div className="flex items-center gap-3 min-w-0">
                                    <PlayerAvatar dna={player.dna} size={32} />
                                    <div className="truncate">
                                        <p className="text-ink text-[12px] truncate leading-none uppercase font-medium">
                                            {player.lastName} <span className="text-gray-600 normal-case">{player.firstName[0]}.</span>
                                        </p>
                                    </div>
                                </div>
                                <div className="text-center text-xs text-gray-500 font-medium">
                                    {player.age}
                                </div>
                                <div className="text-center text-xs text-gray-600 font-medium">
                                    {player.seasonStats?.matches || 0}
                                </div>
                                <div className="text-center text-xs text-gray-900 font-medium">
                                    {player.seasonStats?.goals || 0}
                                </div>
                                <div className="text-center text-[10px] text-accent font-medium">
                                    {player.marketValue >= 1000 ? `${(player.marketValue / 1000).toFixed(1)}M` : `${player.marketValue}k`}
                                </div>
                                <div className="text-center flex justify-center items-center h-full">
                                    <span className={`text-xs ${
                                        !hasEnoughMatches ? "text-gray-500" :
                                        (player.seasonStats?.avgRating || 0) >= 7.5 ? "text-amber-600 font-medium" :
                                        (player.seasonStats?.avgRating || 0) >= 7.0 ? "text-green-600 font-medium" :
                                        "text-gray-600 font-medium"
                                    }`}>
                                        {hasEnoughMatches ? (player.seasonStats?.avgRating || 0).toFixed(1) : "-"}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
				</div>
			</div>
		</div>
	);
}
