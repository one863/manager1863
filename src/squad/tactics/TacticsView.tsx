import { db, type Player, type Team } from "@/core/db/db";
import { useGameStore } from "@/infrastructure/store/gameSlice";
import { useEffect, useState } from "preact/hooks";
import { ArrowDownUp, ChevronDown, Shield, User } from "lucide-preact";
import PlayerAvatar from "@/squad/components/PlayerAvatar";
import { FORMATIONS, type FormationKey } from "@/core/tactics";

export default function Tactics() {
	const userTeamId = useGameStore((state) => state.userTeamId);
	const currentSaveId = useGameStore((state) => state.currentSaveId);
	const [team, setTeam] = useState<Team | null>(null);
	const [players, setPlayers] = useState<Player[]>([]);
	const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);
	const [formation, setFormation] = useState<FormationKey>("4-4-2");

	useEffect(() => {
		loadData();
	}, [userTeamId, currentSaveId]);

	const loadData = async () => {
		if (!userTeamId || !currentSaveId) return;
		
		const t = await db.teams.get(userTeamId);
		if (t) {
			setTeam(t);
			setFormation((t.formation as FormationKey) || "4-4-2");
		}

		const p = await db.players.where("[saveId+teamId]").equals([currentSaveId, userTeamId]).toArray();
		// Sort: Starters first (GK, DEF, MID, FWD), then subs by Skill
		setPlayers(p.sort((a, b) => {
			if (a.isStarter && !b.isStarter) return -1;
			if (!a.isStarter && b.isStarter) return 1;
			return b.skill - a.skill;
		}));
	};

	const handlePlayerClick = async (player: Player) => {
		if (selectedPlayerId === null) {
			// Select first player
			setSelectedPlayerId(player.id!);
		} else {
			// Swap players
			if (selectedPlayerId !== player.id) {
				await swapPlayers(selectedPlayerId, player.id!);
			}
			setSelectedPlayerId(null);
		}
	};

	const swapPlayers = async (id1: number, id2: number) => {
		const p1 = players.find(p => p.id === id1);
		const p2 = players.find(p => p.id === id2);
		if (!p1 || !p2) return;

		const p1Starter = p1.isStarter;
		const p2Starter = p2.isStarter;

		// Optimistic UI update
		const newPlayers = players.map(p => {
			if (p.id === id1) return { ...p, isStarter: p2Starter };
			if (p.id === id2) return { ...p, isStarter: p1Starter };
			return p;
		});
		setPlayers(newPlayers);

		// DB Update
		await db.players.update(id1, { isStarter: p2Starter });
		await db.players.update(id2, { isStarter: p1Starter });
		
		// Refresh to ensure sort is correct
		loadData();
	};

	const handleFormationChange = async (fmt: FormationKey) => {
		if (!team) return;
		setFormation(fmt);
		await db.teams.update(team.id!, { formation: fmt });
		
		// Auto-adjust starters if counts mismatch? 
		// For now, we trust the user to manual swap, or we could run autoSelectStarters logic.
	};

	// Helper to get positions for the visual board
	const getFormationPositions = (fmt: FormationKey) => {
		// Simplified grid positions (row, col) 0-4 rows, 0-4 cols
		// GK is always bottom (or top depending on view). Let's say Bottom is GK.
		const layout = {
			"4-4-2": [
				{ r: 4, c: 2, pos: "GK" },
				{ r: 3, c: 0, pos: "DEF" }, { r: 3, c: 1, pos: "DEF" }, { r: 3, c: 3, pos: "DEF" }, { r: 3, c: 4, pos: "DEF" },
				{ r: 2, c: 0, pos: "MID" }, { r: 2, c: 1, pos: "MID" }, { r: 2, c: 3, pos: "MID" }, { r: 2, c: 4, pos: "MID" },
				{ r: 0, c: 1, pos: "FWD" }, { r: 0, c: 3, pos: "FWD" }
			],
			"4-3-3": [
				{ r: 4, c: 2, pos: "GK" },
				{ r: 3, c: 0, pos: "DEF" }, { r: 3, c: 1, pos: "DEF" }, { r: 3, c: 3, pos: "DEF" }, { r: 3, c: 4, pos: "DEF" },
				{ r: 2, c: 1, pos: "MID" }, { r: 2, c: 2, pos: "MID" }, { r: 2, c: 3, pos: "MID" },
				{ r: 0, c: 0, pos: "FWD" }, { r: 0, c: 2, pos: "FWD" }, { r: 0, c: 4, pos: "FWD" }
			],
			// Fallbacks for others to standard 4-4-2 layout logic or custom
		};
		// Basic generic filler if not defined above
		return (layout as any)[fmt] || layout["4-4-2"];
	};

	const starters = players.filter(p => p.isStarter);
	const substitutes = players.filter(p => !p.isStarter);

	return (
		<div className="flex flex-col h-full bg-slate-50 pb-20">
			{/* Controls */}
			<div className="bg-white p-4 border-b border-gray-200 flex justify-between items-center shadow-sm z-10">
				<div className="relative">
					<select 
						value={formation}
						onChange={(e) => handleFormationChange(e.target.value as FormationKey)}
						className="appearance-none bg-slate-100 font-bold text-sm text-ink py-2 pl-4 pr-8 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-accent"
					>
						{Object.keys(FORMATIONS).map(f => (
							<option key={f} value={f}>{f}</option>
						))}
					</select>
					<ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
				</div>
				
				<div className="text-xs font-bold text-ink-light bg-slate-100 px-3 py-2 rounded-lg">
					{starters.length}/11 Titulaires
				</div>
			</div>

			<div className="flex-1 overflow-y-auto">
				{/* Pitch Visualizer */}
				<div className="w-full aspect-[3/4] bg-green-600 relative overflow-hidden shadow-inner mx-auto max-w-md my-4 rounded-xl border-4 border-white/20">
					{/* Field Markings */}
					<div className="absolute inset-0 opacity-20 pointer-events-none">
						<div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-16 border-b-2 border-x-2 border-white"></div>
						<div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-32 h-16 border-t-2 border-x-2 border-white"></div>
						<div className="absolute top-1/2 left-0 w-full h-0.5 bg-white"></div>
						<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 border-2 border-white rounded-full"></div>
					</div>

					{/* Players on Pitch */}
					{/* We simply map the first 11 starters. 
					    Real implementation would map specific player ID to specific slot.
						For now, auto-fill slots. */}
					<div className="absolute inset-0 p-4 grid grid-rows-5 grid-cols-5">
						{/* This grid is a hack. A real tactic board needs absolute positioning based on formation coordinates. */}
						{/* Let's try a simpler approach: Just absolute position based on role distribution */}
						
						{starters.map((player, idx) => {
							// Simple logic to distribute them roughly correctly
							// GK at bottom. FWD at top.
							// This is purely visual and might not match "Formation" strict slots yet
							let top = "85%";
							let left = "50%";
							
							// Very naive positioning for demo
							if (player.position === "GK") { top = "90%"; left = "50%"; }
							else if (player.position === "DEF") { top = "70%"; left = `${20 + (idx % 4) * 20}%`; }
							else if (player.position === "MID") { top = "45%"; left = `${20 + (idx % 4) * 20}%`; }
							else if (player.position === "FWD") { top = "15%"; left = `${30 + (idx % 2) * 40}%`; }

							return (
								<div 
									key={player.id}
									onClick={() => handlePlayerClick(player)}
									className={`absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center cursor-pointer transition-all duration-300 z-10 ${selectedPlayerId === player.id ? "scale-125 z-50 drop-shadow-xl" : "hover:scale-110"}`}
									style={{ top, left }}
								>
									<div className={`relative ${selectedPlayerId === player.id ? "ring-4 ring-yellow-400 rounded-full" : ""}`}>
										<PlayerAvatar dna={player.dna} size={40} className="border-2 border-white shadow-md bg-slate-800" />
										<div className="absolute -bottom-1 -right-1 bg-white text-black text-[8px] font-black px-1 rounded shadow-sm border border-gray-200">
											{Math.floor(player.skill)}
										</div>
									</div>
									<span className="mt-1 bg-black/50 text-white text-[9px] font-bold px-2 py-0.5 rounded-full backdrop-blur-sm truncate max-w-[60px]">
										{player.lastName}
									</span>
								</div>
							);
						})}
					</div>
				</div>

				{/* Substitutes List */}
				<div className="px-4 pb-8">
					<h3 className="text-xs font-black uppercase tracking-widest text-ink-light mb-3 flex items-center gap-2">
						<ArrowDownUp size={14} /> Remplaçants
					</h3>
					<div className="space-y-2">
						{substitutes.map(player => (
							<div 
								key={player.id}
								onClick={() => handlePlayerClick(player)}
								className={`bg-white p-2 rounded-xl flex items-center gap-3 border transition-all cursor-pointer ${
									selectedPlayerId === player.id 
										? "border-accent ring-1 ring-accent bg-accent/5 shadow-md" 
										: "border-gray-100 hover:border-gray-300"
								}`}
							>
								<PlayerAvatar dna={player.dna} size={32} />
								<div className="flex-1 min-w-0">
									<div className="flex justify-between items-baseline">
										<span className="font-bold text-ink text-sm truncate">{player.lastName}</span>
										<span className="font-black text-ink-light text-xs">{Math.floor(player.skill)}</span>
									</div>
									<div className="flex gap-2 text-[10px] text-gray-400">
										<span className="font-black text-gray-500">{player.position}</span>
										<span>{player.age} ans</span>
									</div>
								</div>
								{selectedPlayerId && (
									<div className="text-accent animate-pulse">
										<ArrowDownUp size={16} />
									</div>
								)}
							</div>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}
