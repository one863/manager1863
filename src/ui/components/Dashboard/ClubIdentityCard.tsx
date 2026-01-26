import { type League, type Team, type StaffMember } from "@/core/db/db";
import { Shield, Trophy, Users } from "lucide-preact";
import { TeamCrest, getTeamColors } from "../Common/TeamCrest";

export { TeamCrest, getTeamColors };

interface ClubIdentityCardProps {
	team: Team | null;
	league: League | null;
	position: number;
	coach: StaffMember | null;
}

export default function ClubIdentityCard({
	team,
	league,
	position,
	coach,
}: ClubIdentityCardProps) {
	if (!team) return null;

	const { primary, secondary } = getTeamColors(team);
    // @ts-ignore
    const logoType = team.logoType !== undefined ? team.logoType : undefined;

	return (
		<div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm relative overflow-hidden">
			{/* Background Pattern */}
			<div className="absolute -top-10 -right-10 opacity-[0.03] text-slate-900 pointer-events-none">
				<Shield size={240} />
			</div>

			<div className="relative z-10 flex items-start gap-4">
				<div className="w-20 h-20 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100 shadow-sm shrink-0">
					<TeamCrest primary={primary} secondary={secondary} name={team.name} type={logoType} />
				</div>

				<div className="flex-1 min-w-0 pt-1">
					<h2 className="text-xl font-black italic tracking-tighter text-ink truncate leading-none mb-2">
						{team.name}
					</h2>
					<div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-black text-slate-600 uppercase tracking-widest">
						<span className="flex items-center gap-1.5 text-slate-700">
							<Trophy size={10} className="text-slate-600" />
							{league?.name || "Ligue"}
						</span>
						<span className="opacity-30">•</span>
						<span className="flex items-center gap-1.5">
							<Users size={10} />
							Rep: {team.reputation}
						</span>
					</div>
				</div>
			</div>

			<div className="relative z-10 grid grid-cols-3 gap-3 mt-6">
				<div className="bg-slate-50/50 border border-slate-100 rounded-xl p-3">
					<span className="block text-[8px] font-black text-slate-600 uppercase tracking-widest mb-1">Classement</span>
					<div className="flex items-baseline gap-1">
						<span className="text-lg font-black text-ink">{position}</span>
						<span className="text-[10px] text-slate-600 font-black">E</span>
					</div>
				</div>

				<div className="bg-slate-50/50 border border-slate-100 rounded-xl p-3">
					<span className="block text-[8px] font-black text-slate-600 uppercase tracking-widest mb-1">Budget</span>
					<div className="flex items-baseline gap-1">
						<span className="text-lg font-black text-ink">{team.budget > 1000 ? `${(team.budget/1000).toFixed(1)}M` : `${team.budget}k`}</span>
					</div>
				</div>

				<div className="bg-slate-50/50 border border-slate-100 rounded-xl p-3">
					<span className="block text-[8px] font-black text-slate-600 uppercase tracking-widest mb-1">Confiance</span>
					<div className="flex items-baseline gap-1">
						<span className={`text-lg font-black ${team.confidence > 50 ? "text-green-600" : "text-amber-500"}`}>{team.confidence}</span>
						<span className="text-[10px] text-slate-600 font-black">%</span>
					</div>
				</div>
			</div>
		</div>
	);
}
