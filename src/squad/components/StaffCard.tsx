import type { StaffMember } from "@/core/db/db";
import { TransferService } from "@/market/transfers/transfer-service";
import { useGameStore } from "@/infrastructure/store/gameSlice";
import { 
	ArrowLeft, 
	Award, 
	Handshake, 
	LogOut, 
	AlertTriangle, 
	Star, 
	ShieldCheck, 
	Zap, 
	Users, 
	Brain, 
	TrendingUp,
	Calendar,
    History
} from "lucide-preact";
import { useState } from "preact/hooks";
import PlayerAvatar from "@/squad/components/PlayerAvatar";
import CareerHistoryView from "@/ui/components/Common/CareerHistoryView";

interface StaffCardProps {
	staff: StaffMember | null;
	onClose: () => void;
	onStaffAction?: () => void;
}

const TRAIT_DATA: Record<string, { label: string; desc: string; icon: any; color: string }> = {
	MOTIVATOR: {
		label: "Motivateur",
		desc: "Réduit les baisses de moral après une défaite.",
		icon: Users,
		color: "text-orange-500 bg-orange-50",
	},
	TACTICIAN: {
		label: "Tacticien",
		desc: "Bonus permanent de +5% à l'organisation tactique.",
		icon: Brain,
		color: "text-blue-500 bg-blue-50",
	},
	YOUTH_SPECIALIST: {
		label: "Formateur",
		desc: "Accélère la progression des joueurs de -21 ans.",
		icon: TrendingUp,
		color: "text-green-500 bg-green-50",
	},
	STRATEGIST: {
		label: "Stratège",
		desc: "Bonus de +5% lors des matchs à haute pression (>50).",
		icon: Star,
		color: "text-purple-500 bg-purple-50",
	},
	HARD_DRILLER: {
		label: "Bourreau",
		desc: "Boost physique accru mais fatigue plus les joueurs.",
		icon: Zap,
		color: "text-red-500 bg-red-50",
	},
};

export default function StaffCard({ staff, onClose, onStaffAction }: StaffCardProps) {
	const userTeamId = useGameStore((state) => state.userTeamId);
	const gameState = useGameStore((state) => state.gameState);
	const triggerRefresh = useGameStore((state) => state.triggerRefresh);
	const [activeTab, setActiveTab] = useState<"stats" | "traits" | "contract" | "history">("stats");
	const [showConfirmHire, setShowConfirmHire] = useState(false);
	const [showConfirmFire, setShowConfirmFire] = useState(false);

	if (!staff) return null;

	const isUserStaff = staff.teamId === userTeamId;
    const severancePay = Math.round(staff.wage * 4);

	// Calcul d'ancienneté
	const currentDay = gameState?.day || 1;
	const currentSeason = gameState?.season || 1;
	const daysInClub = isUserStaff 
		? (currentSeason - staff.joinedSeason) * 35 + (currentDay - staff.joinedDay)
		: 0;
	const familiarityBonus = Math.min(10, Math.floor(daysInClub / 100));

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
					className={`h-full transition-all duration-500 ${value >= 15 ? 'bg-amber-500' : value >= 10 ? 'bg-green-500' : 'bg-blue-500'}`}
					style={{ width: `${(value / max) * 100}%` }}
				/>
			</div>
			<span className="w-6 text-right font-bold text-gray-800 ml-2 text-xs">
				{Math.floor(value)}
			</span>
		</div>
	);

	return (
		<div className="flex flex-col h-full bg-white animate-fade-in">
			{/* Header */}
			<div className="bg-white px-4 py-4 border-b flex justify-between items-center sticky top-0 z-10">
				<div className="flex gap-3 items-center">
					<button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
						<ArrowLeft size={24} />
					</button>
					<div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center border-2 border-white shadow-sm">
						<PlayerAvatar dna={staff.dna} size={48} isStaff />
					</div>
					<div>
						<h2 className="text-lg font-bold text-gray-900 leading-tight">
                            {staff.firstName} {staff.lastName}
                        </h2>
						<div className="flex items-center gap-2 mt-0.5">
							<span className="px-1.5 py-0 bg-blue-50 text-blue-600 rounded text-[10px] font-bold border border-blue-100 uppercase">
								{staff.role.replace("_", " ")}
							</span>
							<span className="text-xs text-gray-500">{staff.age} ans</span>
						</div>
					</div>
				</div>
				<div className="text-right">
					<div className="text-2xl font-black text-gray-900">{Math.floor(staff.skill)}</div>
					<div className="text-[9px] text-gray-400 uppercase font-bold tracking-tight">Potentiel</div>
				</div>
			</div>

			{/* Tabs */}
			<div className="flex border-b bg-white">
                {[
                    { id: "stats", label: "Profil" },
                    { id: "traits", label: "Traits" },
                    { id: "history", label: "Carrière" },
                    { id: "contract", label: "Contrat" }
                ].map((tab) => (
                    <button 
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-wider transition-all ${activeTab === tab.id ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-400"}`}
                    >
                        {tab.label}
                    </button>
                ))}
			</div>

			{/* Body */}
			<div className="flex-1 overflow-y-auto p-4 space-y-6">
				{activeTab === "stats" && (
					<div className="space-y-4">
						<div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
							<h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
								<Award size={14} className="text-blue-500" /> Compétences
							</h3>
							<StatBar label="Gestion" value={staff.stats.management} />
							<StatBar label="Entraînement" value={staff.stats.training} />
							<StatBar label="Tactique" value={staff.stats.tactical} />
							<StatBar label="Physique" value={staff.stats.physical} />
							<StatBar label="Gardiens" value={staff.stats.goalkeeping} />
						</div>

						<div className="grid grid-cols-2 gap-3">
							<div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
								<span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Sérénité</span>
								<div className="flex items-center gap-2">
									<div className={`w-2 h-2 rounded-full ${staff.confidence > 70 ? 'bg-green-500' : staff.confidence > 40 ? 'bg-orange-500' : 'bg-red-500'}`} />
									<p className="font-bold text-gray-900">{staff.confidence}%</p>
								</div>
							</div>
							<div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
								<span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Style Favori</span>
								<p className="font-bold text-gray-900 text-sm truncate">{staff.preferredStrategy || 'Polyvalent'}</p>
							</div>
						</div>

						{isUserStaff && (
							<div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-center justify-between">
								<div>
									<span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest block mb-1">Ancienneté</span>
									<div className="flex items-center gap-2">
										<Calendar size={14} className="text-blue-500" />
										<p className="font-bold text-blue-900">{daysInClub} jours</p>
									</div>
								</div>
								<div className="text-right">
									<span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest block mb-1">Bonus Tactique</span>
									<p className="font-black text-blue-600">+{familiarityBonus}%</p>
								</div>
							</div>
						)}
					</div>
				)}

				{activeTab === "traits" && (
					<div className="space-y-4">
						<h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
							<Star size={14} className="text-amber-500" /> Traits de Personnalité
						</h3>
						
						{staff.traits && staff.traits.length > 0 ? (
							<div className="space-y-3">
								{staff.traits.map(trait => {
									const data = TRAIT_DATA[trait];
									if (!data) return null;
									const Icon = data.icon;
									return (
										<div key={trait} className="flex gap-4 p-4 bg-white border border-gray-100 rounded-xl shadow-sm">
											<div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${data.color}`}>
												<Icon size={20} />
											</div>
											<div>
												<h4 className="font-bold text-gray-900 text-sm">{data.label}</h4>
												<p className="text-xs text-gray-500 leading-relaxed mt-0.5">{data.desc}</p>
											</div>
										</div>
									);
								})}
							</div>
						) : (
							<div className="text-center py-12 px-4 bg-gray-50 rounded-xl border border-dashed border-gray-200">
								<ShieldCheck size={32} className="mx-auto text-gray-300 mb-2" />
								<p className="text-xs text-gray-400">Aucun trait particulier identifié pour ce membre du staff.</p>
							</div>
						)}
					</div>
				)}

                {activeTab === "history" && (
                    <CareerHistoryView teamId={staff.teamId} />
                )}

				{activeTab === "contract" && (
					<div className="space-y-4">
						<div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex justify-between items-center">
							<div>
								<span className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Salaire Hebdo</span>
								<p className="text-xl font-bold text-gray-900">M {staff.wage}</p>
							</div>
							<Handshake size={24} className="text-blue-600 opacity-20" />
						</div>

						{isUserStaff ? (
                            <div className="pt-4">
                                {showConfirmFire ? (
									<div className="bg-red-50 p-4 rounded-xl border border-red-100 space-y-4">
                                        <div className="flex items-center gap-2 text-red-600">
                                            <AlertTriangle size={16} />
                                            <p className="text-xs font-bold uppercase">Attention</p>
                                        </div>
										<p className="text-xs text-red-700">
                                            Le licenciement immédiat de ce membre vous coûtera 
                                            <span className="font-black"> M {severancePay}</span> (4 semaines de salaire).
                                        </p>
										<div className="flex gap-2">
											<button onClick={() => setShowConfirmFire(false)} className="flex-1 py-2 bg-white text-gray-500 border border-gray-200 rounded-lg text-xs font-bold">Annuler</button>
											<button onClick={handleFire} className="flex-1 py-2 bg-red-600 text-white rounded-lg text-xs font-bold">Confirmer</button>
										</div>
									</div>
								) : (
									<button
										onClick={() => setShowConfirmFire(true)}
										className="w-full py-4 bg-red-50 text-red-600 border border-red-100 rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-red-100 transition-colors"
									>
										<LogOut size={16} /> Licencier le membre
									</button>
								)}
                            </div>
                        ) : (
							<div className="pt-4">
								{showConfirmHire ? (
									<div className="bg-blue-50 p-4 rounded-xl border border-blue-100 space-y-4">
										<p className="text-xs font-bold text-blue-700">Engager pour un salaire de M {staff.wage} ?</p>
										<div className="flex gap-2">
											<button onClick={() => setShowConfirmHire(false)} className="flex-1 py-2 bg-white text-gray-500 border border-gray-200 rounded-lg text-xs font-bold">Annuler</button>
											<button onClick={handleHire} className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold">Confirmer</button>
										</div>
									</div>
								) : (
									<button
										onClick={() => setShowConfirmHire(true)}
										className="w-full py-4 bg-blue-50 text-blue-600 border border-blue-100 rounded-xl text-xs font-bold flex items-center justify-center gap-2"
									>
										<Handshake size={16} /> Engager ce membre
									</button>
								)}
							</div>
						)}
					</div>
				)}
			</div>
		</div>
	);
}
