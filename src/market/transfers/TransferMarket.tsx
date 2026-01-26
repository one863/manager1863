import { db, type Player, type StaffMember } from "@/core/db/db";
import { useGameStore } from "@/infrastructure/store/gameSlice";
import { Search, User, TrendingUp, UserPlus, Filter, Shield, Briefcase } from "lucide-preact";
import { useEffect, useState } from "preact/hooks";
import { useTranslation } from "react-i18next";
import PlayerAvatar from "@/squad/components/PlayerAvatar";
import { TransferService } from "./transfer-service";
import { SubTabs } from "@/ui/components/Common/SubTabs";

export default function TransferMarket({ 
    onSelectPlayer,
    onSelectStaff 
}: { 
    onSelectPlayer?: (p: Player) => void,
    onSelectStaff?: (s: StaffMember) => void 
}) {
	const { t } = useTranslation();
	const currentSaveId = useGameStore((state) => state.currentSaveId);
	const userTeamId = useGameStore((state) => state.userTeamId);
	const refreshKey = useGameStore((state) => (state as any).refreshKey);
    const activeTab = useGameStore((state) => (state.uiContext.transfers as "players" | "staff") || "players");
    const setUIContext = useGameStore((state) => state.setUIContext);
	
	const [players, setPlayers] = useState<Player[]>([]);
	const [staffList, setStaffList] = useState<StaffMember[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchQuery, setSearchQuery] = useState("");
	const [filterPos, setFilterPos] = useState("ALL");
	const [filterRole, setFilterRole] = useState("ALL");

	useEffect(() => {
		const loadMarket = async () => {
			if (!currentSaveId) return;
			setLoading(true);
			if (activeTab === "players") {
				const p = await TransferService.generateMarketPlayers(currentSaveId, 60);
				// On filtre pour ne pas afficher ses propres joueurs
				setPlayers(p.filter(p => p.teamId !== userTeamId));
			} else {
				const s = await TransferService.generateMarketStaff(currentSaveId, 40);
				setStaffList(s.filter(s => s.teamId !== userTeamId));
			}
			setLoading(false);
		};
		loadMarket();
	}, [currentSaveId, activeTab, userTeamId, refreshKey]);

	const filteredPlayers = players.filter(p => {
		const matchesSearch = `${p.firstName} ${p.lastName}`.toLowerCase().includes(searchQuery.toLowerCase());
		const matchesFilter = filterPos === "ALL" || p.position === filterPos;
		return matchesSearch && matchesFilter;
	});

	const filteredStaff = staffList.filter(s => {
        const name = s.firstName && s.lastName ? `${s.firstName} ${s.lastName}` : (s as any).name || "";
		const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase());
		const matchesFilter = filterRole === "ALL" || s.role === filterRole;
		return matchesSearch && matchesFilter;
    });

	const tabs = [
		{ id: "players", label: "Joueurs" },
		{ id: "staff", label: "Staff" },
	];

	return (
		<div className="flex flex-col h-full bg-gray-50 animate-fade-in">
			{/* TOP TABS */}
			<SubTabs 
				tabs={tabs} 
				activeTab={activeTab} 
				onChange={(id) => {
					setUIContext("transfers", id);
					setSearchQuery("");
					setFilterPos("ALL");
					setFilterRole("ALL");
				}} 
			/>

			{/* SEARCH & FILTERS HEADER */}
			<div className="p-4 bg-white border-b border-gray-100 space-y-4">
				<div className="relative">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" size={18} />
					<input 
						type="text" 
						placeholder={activeTab === "players" ? "Rechercher un joueur..." : "Rechercher un membre du staff..."}
						value={searchQuery}
						onInput={(e) => setSearchQuery(e.currentTarget.value)}
						className="w-full pl-10 pr-4 py-3 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
					/>
				</div>

				{/* FILTERS */}
				<div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
					{activeTab === "players" ? (
						["ALL", "GK", "DEF", "MID", "FWD"].map(pos => (
							<button
								key={pos}
								onClick={() => setFilterPos(pos)}
								className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-colors whitespace-nowrap ${
									filterPos === pos ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200"
								}`}
							>
								{pos === "ALL" ? "TOUS" : pos}
							</button>
						))
					) : (
						["ALL", "COACH", "SCOUT", "PHYSICAL_TRAINER"].map(role => (
							<button
								key={role}
								onClick={() => setFilterRole(role)}
								className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-colors whitespace-nowrap ${
									filterRole === role ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200"
								}`}
							>
								{role === "ALL" ? "TOUS" : role === "PHYSICAL_TRAINER" ? "PREP. PHY" : role}
							</button>
						))
					)}
				</div>
			</div>

			{/* CONTENT LIST */}
			<div className="flex-1 overflow-y-auto p-4 space-y-2 pb-24">
				{loading ? (
					<div className="flex flex-col items-center justify-center py-20 opacity-30">
						<div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
						<p className="text-xs font-bold uppercase tracking-widest">Consultation du marché...</p>
					</div>
				) : activeTab === "players" ? (
					filteredPlayers.length > 0 ? (
						filteredPlayers.map(player => (
							<div 
								key={player.id} 
								className="bg-white p-3 rounded-xl flex items-center gap-3 border border-gray-100 hover:border-blue-200 transition-all cursor-pointer group"
								onClick={() => onSelectPlayer?.(player)}
							>
								<PlayerAvatar dna={player.dna} size={44} />
								<div className="flex-1 min-w-0">
									<div className="flex justify-between items-baseline">
										<span className="font-bold text-gray-900 text-sm truncate">{player.lastName}</span>
										<span className="font-black text-blue-600 text-sm">{Math.floor(player.skill)}</span>
									</div>
									<div className="flex items-center gap-2 mt-0.5">
										<span className="text-[10px] font-bold text-gray-600 uppercase">{player.position}</span>
										<span className="text-[10px] text-gray-500">{player.age} ans</span>
									</div>
								</div>
								<div className="text-right ml-2">
									<div className="text-xs font-bold text-gray-900">M {player.marketValue}</div>
								</div>
							</div>
						))
					) : (
						<EmptyState message="Aucun joueur trouvé" />
					)
				) : (
					filteredStaff.length > 0 ? (
						filteredStaff.map(staff => (
							<div 
								key={staff.id} 
								className="bg-white p-3 rounded-xl flex items-center gap-3 border border-gray-100 hover:border-blue-200 transition-all cursor-pointer group"
								onClick={() => onSelectStaff?.(staff)}
							>
								<div className="w-11 h-11 bg-gray-100 rounded-full flex items-center justify-center border border-gray-200 overflow-hidden">
									<PlayerAvatar dna={staff.dna} size={44} isStaff />
								</div>
								<div className="flex-1 min-w-0">
									<div className="flex justify-between items-baseline">
										<span className="font-bold text-gray-900 text-sm truncate">
                                            {staff.firstName} {staff.lastName}
                                        </span>
										<span className="font-black text-blue-600 text-sm">{Math.floor(staff.skill)}</span>
									</div>
									<div className="flex items-center gap-2 mt-0.5">
										<span className="text-[10px] font-bold text-gray-600 uppercase">
											{staff.role === "PHYSICAL_TRAINER" ? "PREP. PHY" : staff.role.replace("_", " ")}
										</span>
										<span className="text-[10px] text-gray-500">{staff.age} ans</span>
									</div>
								</div>
								<div className="text-right ml-2">
									<div className="text-xs font-bold text-gray-900">Salaire {staff.wage}</div>
								</div>
							</div>
						))
					) : (
						<EmptyState message="Aucun membre du staff trouvé" />
					)
				)}
			</div>
		</div>
	);
}

function EmptyState({ message }: { message: string }) {
	return (
		<div className="flex flex-col items-center justify-center py-20 text-gray-600">
			<Filter size={40} className="mb-4 opacity-20" />
			<p className="text-sm font-bold uppercase tracking-widest opacity-40">{message}</p>
		</div>
	);
}
