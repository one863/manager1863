import { db, type StaffMember } from "@/core/db/db";
import { useGameStore } from "@/infrastructure/store/gameSlice";
import { Search, UserCheck, Briefcase, Star, Info } from "lucide-preact";
import { useEffect, useState } from "preact/hooks";
import { useTranslation } from "react-i18next";
import Button from "@/ui/components/Common/Button";
import Card from "@/ui/components/Common/Card";
import PlayerAvatar from "@/squad/components/PlayerAvatar";
import { generateStaffMember } from "@/core/generators/staff-generator";

export default function RecruitmentView() {
	const { t } = useTranslation();
	const currentSaveId = useGameStore((state) => state.currentSaveId);
	const userTeamId = useGameStore((state) => state.userTeamId);
	
	const [candidates, setCandidates] = useState<StaffMember[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const loadCandidates = async () => {
			if (!currentSaveId) return;
			// Simulation de candidats disponibles
			let allStaff = await db.staff
				.where("saveId")
				.equals(currentSaveId)
				.filter(s => s.teamId === null || s.teamId === undefined)
				.limit(10)
				.toArray();
			
            // Fallback: if no staff in DB, generate some (e.g. for existing saves)
            if (allStaff.length === 0) {
                const newStaff = [];
                for(let i = 0; i < 10; i++) {
                    newStaff.push(generateStaffMember(currentSaveId, undefined, 5) as StaffMember);
                }
                await db.staff.bulkAdd(newStaff);
                allStaff = await db.staff
                    .where("saveId")
                    .equals(currentSaveId)
                    .filter(s => s.teamId === null || s.teamId === undefined)
                    .limit(10)
                    .toArray();
            }

			setCandidates(allStaff);
			setLoading(false);
		};
		loadCandidates();
	}, [currentSaveId]);

	const handleHire = async (staff: StaffMember) => {
		if (!userTeamId || !staff.id) return;
		
		const team = await db.teams.get(userTeamId);
		if (!team) return;

		// Vérifier si un staff occupe déjà ce poste
		const currentStaff = await db.staff
			.where("[saveId+teamId]")
			.equals([currentSaveId!, userTeamId])
			.filter(s => s.role === staff.role)
			.first();

		if (currentStaff) {
			if (!confirm(`Vous avez déjà un ${staff.role}. Voulez-vous le remplacer ?`)) return;
			await db.staff.update(currentStaff.id!, { teamId: undefined });
		}

		await db.staff.update(staff.id, { teamId: userTeamId });
		setCandidates(prev => prev.filter(s => s.id !== staff.id));
		alert(`${staff.firstName} ${staff.lastName} a rejoint votre staff !`);
	};

	return (
		<div className="flex flex-col h-full bg-gray-50 animate-fade-in pb-20">
			<div className="p-6 bg-black text-white">
				<h2 className="text-2xl font-serif font-black italic tracking-tight">Bureau de Recrutement</h2>
				<p className="text-xs opacity-60 font-medium uppercase tracking-widest mt-1">Trouvez les meilleurs experts pour votre club</p>
			</div>

			<div className="flex-1 overflow-y-auto p-4 space-y-4">
				{candidates.length === 0 && !loading && (
					<div className="text-center py-12 bg-white rounded-3xl border border-dashed border-gray-200">
						<Briefcase size={48} className="mx-auto text-gray-200 mb-2" />
						<p className="text-sm text-gray-400 italic font-serif">Aucun candidat disponible pour le moment</p>
					</div>
				)}

				{candidates.map(staff => (
					<Card key={staff.id} className="p-4 border-l-4 border-l-accent overflow-hidden">
						<div className="flex items-start gap-4">
							<PlayerAvatar dna={staff.dna || "staff"} size={56} isStaff />
							<div className="flex-1 min-w-0">
								<div className="flex items-center justify-between mb-1">
									<h3 className="font-bold text-ink">{staff.firstName} {staff.lastName}</h3>
									<span className="bg-accent/10 text-accent text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
										{staff.role}
									</span>
								</div>
								
								<div className="flex items-center gap-4 mt-2">
									<div className="flex flex-col">
										<span className="text-[9px] font-bold text-gray-400 uppercase">Expertise</span>
										<span className="text-sm font-black text-ink">{staff.skill}/100</span>
									</div>
									<div className="flex flex-col">
										<span className="text-[9px] font-bold text-gray-400 uppercase">Salaire hebdo.</span>
										<span className="text-sm font-black text-accent">{staff.wage || 500} M</span>
									</div>
								</div>

								<div className="mt-4 pt-4 border-t border-gray-50 flex gap-2">
									<Button 
										variant="primary" 
										className="flex-1 py-2 text-[10px] uppercase font-black tracking-widest"
										onClick={() => handleHire(staff)}
									>
										Recruter
									</Button>
								</div>
							</div>
						</div>
					</Card>
				))}
			</div>
		</div>
	);
}
