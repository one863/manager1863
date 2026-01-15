import { type StaffMember, db } from "@/db/db";
import { useGameStore } from "@/store/gameSlice";
import { ArrowLeft, Trash2, Award, Briefcase, UserCircle } from "lucide-preact";
import { useState } from "preact/hooks";
import { useTranslation } from "react-i18next";
import PlayerAvatar from "./PlayerAvatar";

interface StaffCardProps {
	staff: StaffMember | null;
	onClose: () => void;
	onStaffAction?: () => void;
}

export default function StaffCard({
	staff,
	onClose,
	onStaffAction,
}: StaffCardProps) {
	const { t } = useTranslation();
	const userTeamId = useGameStore((state) => state.userTeamId);
	const [showConfirmFire, setShowConfirmFire] = useState(false);

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
			case "COACH": return "Améliore la progression tactique et technique des joueurs.";
			case "SCOUT": return "Permet de dénicher de meilleures opportunités sur le marché.";
			case "PHYSICAL_TRAINER": return "Accélère la récupération d'énergie entre les matchs.";
			default: return "";
		}
	};

	return (
		<div
			className="fixed inset-0 z-[200] bg-white flex flex-col max-w-md mx-auto border-x border-paper-dark shadow-2xl overflow-hidden animate-fade-in"
			onClick={(e) => e.stopPropagation()}
		>
			{/* Unified Header - Consistent with PlayerCard and ClubDetails */}
			<div className="bg-paper-dark p-6 text-center border-b border-gray-300 relative flex flex-col items-center shrink-0">
				<button
					onClick={onClose}
					className="absolute top-6 left-6 text-ink-light hover:text-accent p-1 transition-colors"
				>
					<ArrowLeft size={24} />
				</button>
				
				<div className="mb-3">
					<PlayerAvatar dna={staff.dna || "0-0-0-0"} isStaff size={120} className="border-4 border-accent shadow-lg" />
				</div>
				<h2 className="text-2xl font-serif font-bold text-ink leading-tight">
					{staff.name}
				</h2>
				<div className="text-[10px] uppercase tracking-[0.3em] text-ink-light font-bold mt-1">
					{staff.role.replace("_", " ")}
				</div>
			</div>

			{/* Main Content */}
			<div className="flex-1 p-5 space-y-6 overflow-y-auto">
				<div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm text-center">
					<div className="text-[10px] text-ink-light uppercase font-bold mb-2 tracking-widest">
						Niveau de Compétence
					</div>
					<div className="text-5xl font-mono font-bold text-accent">
						{staff.skill}
					</div>
					<div className="mt-4 flex justify-center gap-1">
						{Array.from({ length: 5 }).map((_, i) => (
							<Award 
								key={i} 
								size={16} 
								className={i < Math.floor(staff.skill / 20) ? "text-accent fill-accent" : "text-gray-200"} 
							/>
						))}
					</div>
				</div>

				<div className="space-y-4">
					<h3 className="text-xs font-bold uppercase tracking-widest text-ink-light flex items-center gap-2">
						<UserCircle size={14} /> Profil
					</h3>
					<div className="bg-paper-dark/30 p-4 rounded-xl space-y-3">
						<div className="flex justify-between items-center text-sm">
							<span className="text-ink-light">Âge</span>
							<span className="font-bold text-ink">{staff.age} ans</span>
						</div>
						{staff.specialty && (
							<div className="flex justify-between items-center text-sm">
								<span className="text-ink-light">Spécialité</span>
								<span className="font-bold text-accent">{staff.specialty}</span>
							</div>
						)}
					</div>
				</div>

				<div className="space-y-4">
					<h3 className="text-xs font-bold uppercase tracking-widest text-ink-light flex items-center gap-2">
						<Briefcase size={14} /> Mission
					</h3>
					<div className="bg-paper-dark/50 p-4 rounded-xl border border-gray-100 italic text-sm text-ink-light leading-relaxed">
						"{getRoleDescription(staff.role)}"
					</div>
				</div>

				<div className="grid grid-cols-2 gap-4">
					<div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
						<div className="text-[9px] text-ink-light uppercase font-bold mb-1">Salaire hebdo</div>
						<div className="font-mono font-bold text-ink">M {staff.wage}</div>
					</div>
					<div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
						<div className="text-[9px] text-ink-light uppercase font-bold mb-1">Contrat</div>
						<div className="font-bold text-ink">Indéterminé</div>
					</div>
				</div>
			</div>

			{/* Unified Footer safety */}
			{isUserStaff ? (
				<div className="p-4 bg-paper-dark border-t border-gray-200 pb-10 shrink-0">
					<button
						onClick={() => setShowConfirmFire(true)}
						className="w-full py-4 bg-red-50 border border-red-200 rounded-xl text-red-600 font-bold shadow-sm active:scale-95 transition-all uppercase text-xs tracking-widest flex items-center justify-center gap-2"
					>
						<Trash2 size={16} /> Licencier le membre
					</button>
				</div>
			) : (
				<div className="h-16 shrink-0 bg-white" />
			)}

			{/* Confirmation Licenciement */}
			{showConfirmFire && (
				<div className="absolute inset-0 bg-white/95 flex flex-col items-center justify-center p-8 text-center animate-fade-in z-[210]">
					<div className="p-4 bg-red-100 rounded-full text-red-600 mb-6">
						<Trash2 size={48} />
					</div>
					<h4 className="font-serif font-bold text-2xl mb-2 text-ink">
						Rupture de contrat ?
					</h4>
					<p className="text-sm text-ink-light mb-8 leading-relaxed">
						Êtes-vous sûr de vouloir vous séparer de <span className="font-bold">{staff.name}</span> ? Cette action est irréversible.
					</p>
					<div className="flex flex-col gap-3 w-full">
						<button
							onClick={handleFire}
							className="w-full py-4 bg-red-600 text-white rounded-xl font-bold uppercase text-xs tracking-widest shadow-lg active:scale-95 transition-transform"
						>
							Confirmer le licenciement
						</button>
						<button
							onClick={() => setShowConfirmFire(false)}
							className="w-full py-4 bg-paper-dark text-ink-light rounded-xl font-bold uppercase text-xs tracking-widest"
						>
							Annuler
						</button>
					</div>
				</div>
			)}
		</div>
	);
}
