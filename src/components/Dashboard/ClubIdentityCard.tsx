import type { League, Team, StaffMember } from "@/db/db";
import { Shield, Trophy, Users, Wallet, Star, MapPin, Zap, Target, Shield as DefenseIcon } from "lucide-preact";
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
	coach,
}: ClubIdentityCardProps) {
	const { t } = useTranslation();

	const getOrdinal = (n: number) => {
		if (n <= 0) return "-";
		return n + (n === 1 ? "er" : "e");
	};

	// Sécurité sur la stratégie
	const strategy = coach?.preferredStrategy || "BALANCED";
	const StrategyIcon = strategy === "OFFENSIVE" ? Zap : strategy === "DEFENSIVE" ? DefenseIcon : Target;
	const strategyColor = strategy === "OFFENSIVE" ? "text-red-500 bg-red-50" : strategy === "DEFENSIVE" ? "text-blue-500 bg-blue-50" : "text-accent bg-accent/5";
	const strategyLabel = strategy === "OFFENSIVE" ? "Offensif" : strategy === "DEFENSIVE" ? "Défensif" : "Équilibré";

	return (
		<div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 relative overflow-hidden">
			{/* Fond décoratif */}
			<div
				className="absolute top-0 right-0 w-32 h-32 opacity-[0.03] pointer-events-none -mr-8 -mt-8"
				style={{
					backgroundColor: team?.primaryColor || "#991b1b",
					borderRadius: "100%",
				}}
			/>

			<div className="flex items-center gap-4 mb-4 relative z-10">
				{/* ÉCUSSON */}
				<div className="relative w-14 h-14 rounded-2xl overflow-hidden shadow-sm border border-gray-100 flex flex-col shrink-0">
					<div
						className="flex-1"
						style={{ backgroundColor: team?.primaryColor || "#991b1b" }}
					/>
					<div
						className="h-1/3"
						style={{ backgroundColor: team?.secondaryColor || "#ffffff" }}
					/>
					<div className="absolute inset-0 flex items-center justify-center">
						<Shield size={24} className="text-white/30" strokeWidth={2} />
					</div>
				</div>

				<div className="flex-1 min-w-0">
					<div className="flex items-center justify-between gap-2">
						<h2 className="text-lg font-serif font-black text-ink leading-tight truncate">
							{team?.name || "Club inconnu"}
						</h2>
						{/* LE BADGE TACTIQUE DOIT S'AFFICHER ICI */}
						<div className={`flex items-center gap-1 px-2 py-0.5 rounded-full border border-current ${strategyColor} shrink-0`}>
							<StrategyIcon size={10} strokeWidth={3} />
							<span className="text-[8px] font-black uppercase tracking-tighter">{strategyLabel}</span>
						</div>
					</div>
					<p className="text-[10px] text-accent font-black uppercase tracking-wider truncate">
						{league?.name || "Ligue"}
					</p>
					<div className="flex items-center gap-2 mt-0.5">
						<div className="flex items-center gap-1 text-[9px] text-ink-light font-bold">
							<MapPin size={10} />
							<span className="truncate max-w-[120px]">{team?.stadiumName}</span>
						</div>
					</div>
				</div>
			</div>

			<div className="grid grid-cols-4 gap-2 relative z-10 border-t border-paper-dark/30 pt-3">
				<div className="flex flex-col items-center text-center">
					<Trophy size={14} className="text-accent mb-0.5" />
					<div className="text-[11px] font-black text-ink">{getOrdinal(position)}</div>
					<div className="text-[7px] text-ink-light uppercase font-bold tracking-tighter opacity-60">Rang</div>
				</div>

				<div className="flex flex-col items-center text-center border-l border-paper-dark/10">
					<Star size={14} className="text-amber-500 mb-0.5" />
					<div className="text-[11px] font-black text-ink">{team?.reputation || 0}</div>
					<div className="text-[7px] text-ink-light uppercase font-bold tracking-tighter opacity-60">Prestige</div>
				</div>

				<div className="flex flex-col items-center text-center border-l border-paper-dark/10">
					<Users size={14} className="text-ink-light mb-0.5" />
					<div className="text-[11px] font-black text-ink">{team?.fanCount ? (team.fanCount >= 1000 ? (team.fanCount / 1000).toFixed(1) + 'k' : team.fanCount) : 0}</div>
					<div className="text-[7px] text-ink-light uppercase font-bold tracking-tighter opacity-60">Fans</div>
				</div>

				<div className="flex flex-col items-center text-center border-l border-paper-dark/10">
					<Wallet size={14} className="text-accent mb-0.5" />
					<div className="text-[11px] font-black text-ink">
						<CreditAmount amount={team?.budget || 0} size="xs" color="text-accent" />
					</div>
					<div className="text-[7px] text-ink-light uppercase font-bold tracking-tighter opacity-60">Budget</div>
				</div>
			</div>
		</div>
	);
}
