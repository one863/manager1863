import { db, type Player } from "@/core/db/db";
import { useGameStore } from "@/infrastructure/store/gameSlice";
import { useEffect, useState } from "preact/hooks";
import PlayerAvatar from "@/squad/components/PlayerAvatar";
import { ArrowUpDown, Filter, Shield, Shirt, User } from "lucide-preact";

interface RosterProps {
	onSelectPlayer?: (player: Player) => void;
}

export default function Roster({ onSelectPlayer }: RosterProps) {
	const userTeamId = useGameStore((state) => state.userTeamId);
	const currentSaveId = useGameStore((state) => state.currentSaveId);
	const [players, setPlayers] = useState<Player[]>([]);
	const [filterPos, setFilterPos] = useState("ALL");
	const [sortConfig, setSortConfig] = useState<{ key: keyof Player | "skill"; dir: "asc" | "desc" }>({ key: "skill", dir: "desc" });

	useEffect(() => {
		const load = async () => {
			if (!userTeamId || !currentSaveId) return;
			const p = await db.players.where("[saveId+teamId]").equals([currentSaveId, userTeamId]).toArray();
			setPlayers(p);
		};
		load();
	}, [userTeamId, currentSaveId]);

	const filteredPlayers = players.filter(p => filterPos === "ALL" || p.position === filterPos);
	
	const sortedPlayers = [...filteredPlayers].sort((a, b) => {
		const aVal = a[sortConfig.key] ?? 0;
		const bVal = b[sortConfig.key] ?? 0;
		if (aVal < bVal) return sortConfig.dir === "asc" ? -1 : 1;
		if (aVal > bVal) return sortConfig.dir === "asc" ? 1 : -1;
		return 0;
	});

	const handleSort = (key: any) => {
		setSortConfig(prev => ({
			key,
			dir: prev.key === key && prev.dir === "desc" ? "asc" : "desc"
		}));
	};

	return (
		<div className="space-y-4 pb-24">
			<div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
				{["ALL", "GK", "DEF", "MID", "FWD"].map(pos => (
					<button
						key={pos}
						onClick={() => setFilterPos(pos)}
						className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-colors whitespace-nowrap ${
							filterPos === pos ? "bg-ink text-white border-ink" : "bg-white text-ink-light border-gray-200"
						}`}
					>
						{pos === "ALL" ? "TOUS" : pos}
					</button>
				))}
			</div>

			<div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
				<div className="grid grid-cols-[auto_1fr_auto_auto] gap-2 p-3 bg-gray-50 border-b border-gray-100 text-[9px] font-black uppercase text-gray-400">
					<div className="w-10 text-center">Pos</div>
					<div onClick={() => handleSort("lastName")} className="flex items-center gap-1 cursor-pointer">Nom <ArrowUpDown size={8} /></div>
					<div onClick={() => handleSort("age")} className="w-8 text-center cursor-pointer">Age</div>
					<div onClick={() => handleSort("skill")} className="w-8 text-center cursor-pointer">Niv</div>
				</div>

				<div className="divide-y divide-gray-50">
					{sortedPlayers.map(player => (
						<div 
							key={player.id} 
							onClick={() => onSelectPlayer && onSelectPlayer(player)}
							className="grid grid-cols-[auto_1fr_auto_auto] gap-2 p-3 items-center hover:bg-gray-50 transition-colors cursor-pointer"
						>
							<div className="w-10 flex justify-center">
								<span className={`px-1.5 py-0.5 rounded text-[9px] font-black border ${
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
									<p className="font-bold text-ink text-sm truncate">{player.lastName}</p>
									<p className="text-[9px] text-gray-400 truncate">{player.firstName}</p>
								</div>
							</div>
							<div className="w-8 text-center text-xs font-mono text-gray-500">
								{player.age}
							</div>
							<div className="w-8 text-center">
								<span className={`font-black font-mono text-sm ${
									player.skill >= 80 ? "text-amber-500" : 
									player.skill >= 70 ? "text-green-600" : "text-gray-400"
								}`}>
									{Math.floor(player.skill)}
								</span>
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
