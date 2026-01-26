import type { StaffMember } from "@/core/db/db";
import { TransferService } from "@/market/transfers/transfer-service";
import { useGameStore } from "@/infrastructure/store/gameSlice";
import { ArrowLeft, Award, Handshake, LogOut, Star, Calendar } from "lucide-preact";
import { useState } from "preact/hooks";
import PlayerAvatar from "@/squad/components/PlayerAvatar";
import CareerHistoryView from "@/ui/components/Common/CareerHistoryView";

interface StaffCardProps {
	staff: StaffMember | null;
	onClose: () => void;
	onStaffAction?: () => void;
}

export default function StaffCard({ staff, onClose, onStaffAction }: StaffCardProps) {
	const userTeamId = useGameStore((state) => state.userTeamId);
	const currentSaveId = useGameStore((state) => state.currentSaveId);
	const currentDay = useGameStore((state) => state.day || 1);
	const currentSeason = useGameStore((state) => state.season || 1);
	const triggerRefresh = useGameStore((state) => state.triggerRefresh);
	const [activeTab, setActiveTab] = useState<"stats" | "contract" | "history">("stats");
	const [showConfirmHire, setShowConfirmHire] = useState(false);
	const [showConfirmFire, setShowConfirmFire] = useState(false);

	if (!staff) return null;

	const isUserStaff = staff.teamId === userTeamId;
	const daysInClub = isUserStaff ? (currentSeason - staff.joinedSeason) * 35 + (currentDay - staff.joinedDay) : 0;

	const handleHire = async () => {
		if (!userTeamId || !staff.id) return;
		const res = await TransferService.hireStaff(staff.id, userTeamId);
		if (res.success) {
			triggerRefresh();
			setShowConfirmHire(false);
			if (onStaffAction) onStaffAction();
			onClose();
		} else {
			alert(res.error);
		}
	};

    const handleFire = async () => {
        if (!userTeamId || !staff.id) return;
        const res = await TransferService.fireStaff(staff.id, userTeamId);
        if (res.success) {
            triggerRefresh();
            setShowConfirmFire(false);
            if (onStaffAction) onStaffAction();
            onClose();
        } else {
            alert(res.error);
        }
    };

	const StatBar = ({ label, value, max=20 }: { label: string; value: number, max?: number }) => (
		<div className="flex items-center mb-2">
			<span className="w-24 text-gray-500 truncate font-bold uppercase tracking-tight text-[10px]">
				{label}
			</span>
			<div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
				<div
					className={`h-full transition-all duration-500 ${value >= 15 ? 'bg-amber-500' : 'bg-blue-500'}`}
					style={{ width: `${(value / max) * 100}%` }}
				/>
			</div>
			<span className="w-6 text-right font-bold text-gray-800 ml-2 text-xs">{Math.floor(value)}</span>
		</div>
	);

	return (
		<div className="flex flex-col h-full bg-white animate-fade-in">
			{/* Header */}
			<div className="bg-white px-4 py-4 border-b flex justify-between items-center sticky top-0 z-10">
				<div className="flex gap-3 items-center">
					<button onClick={onClose} className="text-gray-600 hover:text-gray-600 p-1">
						<ArrowLeft size={24} />
					</button>
					<PlayerAvatar dna={staff.dna} size={48} isStaff />
					<div>
						<h2 className="text-lg font-bold text-gray-900 leading-tight">{staff.firstName} {staff.lastName}</h2>
						<div className="flex items-center gap-2 mt-0.5">
							<span className="px-1.5 py-0 bg-blue-50 text-blue-600 rounded text-[10px] font-bold border border-blue-100 uppercase">
								{staff.role}
							</span>
							<span className="text-xs text-gray-500">{staff.age} ans</span>
						</div>
					</div>
				</div>
				<div className="text-right">
					<div className="text-2xl font-black text-gray-900">{Math.floor(staff.skill)}</div>
					<div className="text-[9px] text-gray-600 uppercase font-bold tracking-tight">Potentiel</div>
				</div>
			</div>

			{/* Tabs */}
			<div className="flex border-b bg-white">
                {[{ id: "stats", label: "Profil" }, { id: "history", label: "Carrière" }, { id: "contract", label: "Contrat" }].map((tab) => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-wider transition-all ${activeTab === tab.id ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-600"}`}>
                        {tab.label}
                    </button>
                ))}
			</div>

			<div className="flex-1 overflow-y-auto p-4 space-y-6">
				{activeTab === "stats" && (
					<div className="space-y-4">
						<div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
							<h3 className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-3 flex items-center gap-2">
								<Award size={14} className="text-blue-500" /> Compétences Principales
							</h3>
							{staff.role === "COACH" && (
								<>
									<StatBar label="Coaching" value={staff.stats.coaching} />
									<StatBar label="Tactique" value={staff.stats.tactical} />
									<StatBar label="Discipline" value={staff.stats.discipline} />
									<StatBar label="Entraînement" value={staff.stats.training} />
								</>
							)}
							{staff.role === "PHYSICAL_TRAINER" && (
								<>
									<StatBar label="Condition" value={staff.stats.conditioning} />
									<StatBar label="Récupération" value={staff.stats.recovery} />
									<StatBar label="Physique" value={staff.stats.physical || 10} />
									<StatBar label="Médical" value={staff.stats.medical} />
								</>
							)}
							{staff.role === "VIDEO_ANALYST" && (
								<>
									<StatBar label="Lecture" value={staff.stats.reading} />
									<StatBar label="Tactique" value={staff.stats.tactical} />
									<StatBar label="Gestion" value={staff.stats.management} />
								</>
							)}
						</div>

						<div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
							<span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest block mb-1">Confiance</span>
							<p className="font-bold text-gray-900">{staff.confidence}%</p>
						</div>

						{isUserStaff && (
							<div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-center justify-between">
								<div className="flex items-center gap-2">
									<Calendar size={14} className="text-blue-500" />
									<p className="font-bold text-blue-900">{daysInClub} jours au club</p>
								</div>
							</div>
						)}
					</div>
				)}

                {activeTab === "history" && <CareerHistoryView teamId={staff.teamId} />}

				{activeTab === "contract" && (
					<div className="space-y-4">
						<div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
							<span className="text-[10px] font-bold text-gray-600 uppercase block mb-1">Salaire Hebdo</span>
							<p className="text-xl font-bold text-gray-900">M {staff.wage}</p>
						</div>

						{isUserStaff ? (
							<button onClick={handleFire} className="w-full py-4 bg-red-50 text-red-600 border border-red-100 rounded-xl text-xs font-bold flex items-center justify-center gap-2">
								<LogOut size={16} /> Licencier
							</button>
                        ) : (
							<button onClick={handleHire} className="w-full py-4 bg-blue-50 text-blue-600 border border-blue-100 rounded-xl text-xs font-bold flex items-center justify-center gap-2">
								<Handshake size={16} /> Engager
							</button>
						)}
					</div>
				)}
			</div>
		</div>
	);
}
