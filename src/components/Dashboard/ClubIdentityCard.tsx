import type { League, Team, StaffMember } from "@/db/db";
import { Shield, Trophy, Users, Wallet, Star, MapPin } from "lucide-preact";
import { useTranslation } from "react-i18next";
import CreditAmount from "../Common/CreditAmount";

interface ClubIdentityCardProps {
	team: Team | null;
	league: League | null;
	position: number;
	coach?: StaffMember | null;
}

export default function ClubIdentityCard({
	team,
	league,
	position,
}: ClubIdentityCardProps) {
	const { t } = useTranslation();

	const getOrdinal = (n: number) => {
		if (n <= 0) return "-";
		return n + (n === 1 ? "er" : "e");
	};

	return (
		<div className="bg-white p-5 rounded-[2.5rem] shadow-sm border border-gray-100 relative overflow-hidden">
			{/* Fond décoratif */}
			<div
				className="absolute top-0 right-0 w-40 h-40 opacity-[0.04] pointer-events-none -mr-10 -mt-10"
				style={{
					backgroundColor: team?.primaryColor || "#991b1b",
					borderRadius: "100%",
				}}
			/>

			<div className="flex items-center gap-5 mb-6 relative z-10">
				{/* ÉCUSSON */}
				<div className="relative w-16 h-16 rounded-[1.25rem] overflow-hidden shadow-md border border-gray-100 flex flex-col shrink-0">
					<div
						className="flex-1"
						style={{ backgroundColor: team?.primaryColor || "#991b1b" }}
					/>
					<div
						className="h-1/3"
						style={{ backgroundColor: team?.secondaryColor || "#ffffff" }}
					/>
					<div className="absolute inset-0 flex items-center justify-center">
						<Shield size={28} className="text-white/30" strokeWidth={2} />
					</div>
				</div>

				<div className="flex-1 min-w-0">
					<div className="flex items-center justify-between gap-2 mb-1">
						<h2 className="text-xl font-serif font-black text-ink leading-tight truncate">
							{team?.name || "Club inconnu"}
						</h2>
					</div>
					<p className="text-[11px] text-accent font-black uppercase tracking-[0.15em] truncate mb-1.5">
						{league?.name || "Ligue"}
					</p>
					<div className="flex items-center gap-2">
						<div className="flex items-center gap-1.5 text-[10px] text-ink-light font-bold">
							<MapPin size={12} className="text-accent/60" />
							<span className="truncate max-w-[150px]">{team?.stadiumName}</span>
						</div>
					</div>
				</div>
			</div>

			<div className="grid grid-cols-4 gap-3 relative z-10 border-t border-paper-dark/30 pt-5">
				<div className="flex flex-col items-center text-center">
					<Trophy size={18} className="text-accent mb-1.5" />
					<div className="text-base font-black text-ink leading-none mb-1">{getOrdinal(position)}</div>
					<div className="text-[8px] text-ink-light uppercase font-black tracking-widest opacity-60">Rang</div>
				</div>

				<div className="flex flex-col items-center text-center border-l border-paper-dark/10">
					<Star size={18} className="text-amber-500 mb-1.5" />
					<div className="text-base font-black text-ink leading-none mb-1">{team?.reputation || 0}</div>
					<div className="text-[8px] text-ink-light uppercase font-black tracking-widest opacity-60">Prestige</div>
				</div>

				<div className="flex flex-col items-center text-center border-l border-paper-dark/10">
					<Users size={18} className="text-ink-light mb-1.5" />
					<div className="text-base font-black text-ink leading-none mb-1">{team?.fanCount ? (team.fanCount >= 1000 ? (team.fanCount / 1000).toFixed(1) + 'k' : team.fanCount) : 0}</div>
					<div className="text-[8px] text-ink-light uppercase font-black tracking-widest opacity-60">Fans</div>
				</div>

				<div className="flex flex-col items-center text-center border-l border-paper-dark/10">
					<Wallet size={18} className="text-accent mb-1.5" />
					<div className="text-base font-black text-ink leading-none mb-1">
						<CreditAmount amount={team?.budget || 0} size="sm" color="text-accent" />
					</div>
					<div className="text-[8px] text-ink-light uppercase font-black tracking-widest opacity-60">Budget</div>
				</div>
			</div>
		</div>
	);
}
