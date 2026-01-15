import { type StaffMember, db } from "@/db/db";
import { useGameStore } from "@/store/gameSlice";
import { ArrowLeft, Trash2, Award, Briefcase, AlertCircle, TrendingUp, Target, Shield, Zap } from "lucide-preact";
import { useState, useEffect } from "preact/hooks";
import { useTranslation } from "react-i18next";
import PlayerAvatar from "./PlayerAvatar";

interface StaffCardProps {
	staff: StaffMember | null;
	onClose: () => void;
	onStaffAction?: () => void;
}

export default function StaffCard({
	staff: initialStaff,
	onClose,
	onStaffAction,
}: StaffCardProps) {
	const { t } = useTranslation();
	const userTeamId = useGameStore((state) => state.userTeamId);
	const [staff, setStaff] = useState<StaffMember | null>(initialStaff);
	const [showConfirmFire, setShowConfirmFire] = useState(false);

	useEffect(() => {
		setStaff(initialStaff);
	}, [initialStaff]);

	if (!staff) return null;

	const isUserStaff = staff.teamId === userTeamId;

	const handleFire = async () => {
		if (!staff.id) return;
		try {
			await db.staff.delete(staff.id);
			setShowConfirmFire(false);
			if (onStaffAction) onStaffAction();
			onClose();
		} catch (e) {
			alert("Erreur lors du licenciement");
		}
	};

	const getRoleDescription = (role: string) => {
		switch (role) {
			case "COACH": return "Responsable de l'entraînement technique et tactique.";
			case "SCOUT": return "Déniche les meilleurs talents sur le marché des transferts.";
			case "PHYSICAL_TRAINER": return "Améliore la condition physique et réduit la fatigue.";
			default: return "";
		}
	};

	const StatBar = ({ label, value }: { label: string; value: number }) => (
		<div className="flex items-center mb-2">
			<span className="w-24 text-[9px] font-black uppercase text-ink-light tracking-tighter truncate">{label}</span>
			<div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden border border-gray-200 mx-2">
				<div 
					className={`h-full transition-all duration-1000 ${value >= 5 ? "bg-accent" : "bg-orange-400"}`} 
					style={{ width: `${(Math.max(0, Math.min(10, value)) / 10) * 100}%` }} 
				/>
			</div>
			<span className="w-6 text-right font-mono font-bold text-[10px] text-ink">{Math.floor(value)}</span>
		</div>
	);

	const stats = staff.stats || {
		management: staff.skill,
		training: staff.skill,
		tactical: staff.skill,
		physical: staff.skill,
		goalkeeping: staff.skill
	};

	const strategyLabel = staff.preferredStrategy === "OFFENSIVE" ? "Offensif" : staff.preferredStrategy === "DEFENSIVE" ? "Défensif" : "Équilibré";
	const StrategyIcon = staff.preferredStrategy === "OFFENSIVE" ? Zap : staff.preferredStrategy === "DEFENSIVE" ? Shield : Target;

	return (
		<div
			className="fixed inset-x-0 bottom-0 z-[200] bg-white flex flex-col max-w-md mx-auto rounded-t-3xl shadow-2xl overflow-hidden animate-slide-up h-[90vh]"
			onClick={(e) => e.stopPropagation()}
		>
			<div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto my-3 shrink-0" />

			<div className="bg-white px-4 pb-4 border-b flex justify-between items-center sticky top-0 z-10 shrink-0">
				<div className="flex gap-4 items-center">
					<button onClick={onClose} className="text-ink-light hover:text-accent p-1 transition-colors">
						<ArrowLeft size={24} />
					</button>
					<PlayerAvatar dna={staff.dna || "0-0-0-0"} isStaff size={56} className="border-2 border-accent shadow-sm" />
					<div>
						<h2 className="text-xl font-serif font-bold text-accent leading-tight">{staff.name}</h2>
						<div className="flex items-center gap-2 mt-0.5">
							<span className="px-1.5 py-0 rounded text-[10px] font-bold border bg-paper-dark text-ink-light border-gray-300 uppercase tracking-widest">
								{staff.role.replace("_", " ")}
							</span>
							<span className="text-xs text-ink-light">{staff.age} ans</span>
						</div>
					</div>
				</div>
				<div className="text-right">
					<div className="text-2xl font-black text-ink">{Math.floor(staff.skill)}</div>
					<div className="text-[8px] text-ink-light uppercase tracking-widest font-black">Niveau Global</div>
				</div>
			</div>

			<div className="p-5 space-y-6 flex-1 overflow-y-auto">
				{staff.role === "COACH" && (
					<div className="bg-paper-dark p-4 rounded-2xl border border-gray-100 flex items-center gap-4">
						<div className={`p-3 rounded-full ${staff.preferredStrategy === "OFFENSIVE" ? "bg-red-100 text-red-600" : staff.preferredStrategy === "DEFENSIVE" ? "bg-blue-100 text-blue-600" : "bg-accent/10 text-accent"}`}>
							<StrategyIcon size={24} />
						</div>
						<div>
							<h4 className="text-[10px] font-black uppercase tracking-widest text-ink-light">Identité Tactique</h4>
							<p className="text-sm font-bold text-ink">{strategyLabel}</p>
							<p className="text-[9px] text-ink-light italic opacity-70">
								{staff.preferredStrategy === "DEFENSIVE" ? "Prudence et bloc regroupé" : staff.preferredStrategy === "OFFENSIVE" ? "Projection rapide vers l'avant" : "Maîtrise et équilibre des lignes"}.
							</p>
						</div>
					</div>
				)}

				<div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
					<h3 className="text-[10px] font-black text-accent uppercase tracking-widest mb-4 border-b border-accent/10 pb-1 flex justify-between">
						<span>Compétences Clés</span>
						<Award size={12} />
					</h3>
					<StatBar label="Management" value={stats.management} />
					<StatBar label="Entraînement" value={stats.training} />
					<StatBar label="Tactique" value={stats.tactical} />
					<StatBar label="Physique" value={stats.physical} />
					<StatBar label="Gardiens" value={stats.goalkeeping} />
				</div>

				<div className="space-y-4">
					<h3 className="text-[10px] font-black text-accent uppercase tracking-widest mb-3 border-b border-accent/10 pb-1 flex justify-between">
						<span>Missions</span>
						<Briefcase size={12} />
					</h3>
					<div className="bg-paper-dark/50 p-4 rounded-2xl border border-gray-100 italic text-sm text-ink-light leading-relaxed">
						"{getRoleDescription(staff.role)}"
					</div>
				</div>

				<div className="grid grid-cols-2 gap-3">
					<div className="bg-paper-dark p-3 rounded-2xl border border-gray-200">
						<span className="block text-[8px] text-ink-light uppercase font-black tracking-widest">Salaire Hebdo</span>
						<span className="text-lg font-bold text-ink">M {staff.wage}</span>
					</div>
					<div className="bg-paper-dark p-3 rounded-2xl border border-gray-200">
						<span className="block text-[8px] text-ink-light uppercase font-black tracking-widest">Contrat</span>
						<span className="text-lg font-bold text-ink">Indéterminé</span>
					</div>
				</div>
			</div>

			{isUserStaff && (
				<div className="p-4 bg-paper-dark border-t border-gray-200 pb-10 shrink-0">
					<button
						onClick={() => setShowConfirmFire(true)}
						className="w-full py-4 bg-red-50 text-red-600 border border-red-200 rounded-2xl text-[10px] font-black tracking-widest flex items-center justify-center gap-2 hover:bg-red-100 active:scale-[0.98] transition-all uppercase"
					>
						<Trash2 size={14} /> Licencier (Rupture)
					</button>
				</div>
			)}

			{showConfirmFire && (
				<div className="absolute inset-0 bg-white/95 flex flex-col items-center justify-center p-8 text-center animate-fade-in z-[210]">
					<div className="p-4 bg-red-100 rounded-full text-red-500 mb-4">
						<AlertCircle size={48} />
					</div>
					<h4 className="font-serif font-bold text-2xl mb-2 text-ink">Rupture de contrat ?</h4>
					<p className="text-sm text-ink-light mb-8 max-w-[280px]">Confirmez-vous le licenciement de <span className="font-bold text-ink">{staff.name}</span> ?</p>
					<div className="flex flex-col gap-3 w-full max-w-[280px]">
						<button onClick={handleFire} className="w-full py-4 bg-red-600 text-white rounded-xl font-bold uppercase text-xs tracking-widest shadow-lg">Confirmer</button>
						<button onClick={() => setShowConfirmFire(false)} className="w-full py-4 bg-paper-dark text-ink-light rounded-xl font-bold uppercase text-xs tracking-widest">Annuler</button>
					</div>
				</div>
			)}
		</div>
	);
}
