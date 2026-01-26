import { db, type StaffMember } from "@/core/db/db";
import { useGameStore } from "@/infrastructure/store/gameSlice";
import { useEffect, useState } from "preact/hooks";
import PlayerAvatar from "@/squad/components/PlayerAvatar";
import { Brain, Star, Users, Zap, TrendingUp } from "lucide-preact";

interface StaffListProps {
	onSelectStaff?: (staff: StaffMember) => void;
}

const TRAIT_ICONS: Record<string, any> = {
	MOTIVATOR: Users,
	TACTICIAN: Brain,
	YOUTH_SPECIALIST: TrendingUp,
	STRATEGIST: Star,
	HARD_DRILLER: Zap,
};

export default function StaffList({ onSelectStaff }: StaffListProps) {
	const userTeamId = useGameStore((state) => state.userTeamId);
	const currentSaveId = useGameStore((state) => state.currentSaveId);
	const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
	const [filterRole, setFilterRole] = useState("ALL");

	useEffect(() => {
		const load = async () => {
			if (!userTeamId || !currentSaveId) return;
			const s = await db.staff.where("[saveId+teamId]").equals([currentSaveId, userTeamId]).toArray();
			setStaffMembers(s);
		};
		load();
	}, [userTeamId, currentSaveId]);

	const filteredStaff = staffMembers.filter(s => filterRole === "ALL" || s.role === filterRole);

	return (
		<div className="space-y-4 pb-24">
			<div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
				{["ALL", "COACH", "SCOUT", "PHYSICAL_TRAINER"].map(role => (
					<button
						key={role}
						onClick={() => setFilterRole(role)}
						className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-colors whitespace-nowrap ${
							filterRole === role ? "bg-ink text-white border-ink" : "bg-white text-ink-light border-gray-200"
						}`}
					>
						{role === "ALL" ? "TOUS" : role === "PHYSICAL_TRAINER" ? "PREP. PHY" : role}
					</button>
				))}
			</div>

			<div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
				<div className="grid grid-cols-[auto_1fr_auto_auto] gap-2 p-3 bg-gray-50 border-b border-gray-100 text-[9px] font-black uppercase text-gray-600">
					<div className="w-20 text-center">Rôle</div>
					<div>Nom</div>
					<div className="w-12 text-center">Traits</div>
					<div className="w-10 text-center">Niv</div>
				</div>

				<div className="divide-y divide-gray-50">
					{filteredStaff.length === 0 && (
						<div className="p-8 text-center text-gray-600 italic text-sm">
							Aucun staff trouvé
						</div>
					)}
					{filteredStaff.map(staff => (
						<div 
							key={staff.id} 
							onClick={() => onSelectStaff && onSelectStaff(staff)}
							className="grid grid-cols-[auto_1fr_auto_auto] gap-2 p-3 items-center hover:bg-gray-50 transition-colors cursor-pointer"
						>
							<div className="w-20 flex justify-center">
								<span className="px-1.5 py-0.5 rounded text-[9px] font-black border bg-purple-50 text-purple-700 border-purple-100 uppercase truncate max-w-full">
									{staff.role === "PHYSICAL_TRAINER" ? "PREP. PHY" : staff.role.replace("_", " ")}
								</span>
							</div>
							<div className="flex items-center gap-3 min-w-0">
								<PlayerAvatar dna={staff.dna} size={32} isStaff />
								<div className="truncate">
									<p className="font-bold text-ink text-sm truncate">{staff.lastName}</p>
									<p className="text-[9px] text-gray-600 truncate">{staff.firstName}</p>
								</div>
							</div>
							<div className="w-12 flex justify-center gap-0.5">
								{staff.traits?.slice(0, 2).map(trait => {
									const Icon = TRAIT_ICONS[trait];
									return Icon ? <Icon key={trait} size={12} className="text-amber-500" /> : null;
								})}
							</div>
							<div className="w-10 text-center">
								<span className="font-black font-mono text-sm text-ink">
									{Math.floor(staff.skill)}
								</span>
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
