import type { League, Team } from "@/engine/types";
import { ChevronRight, Landmark, Shield, Trophy, Users, Wallet, Star } from "lucide-preact";
import { useTranslation } from "react-i18next";
import CreditAmount from "../Common/CreditAmount";

interface ClubIdentityCardProps {
	team: Team | null;
	league: League | null;
	position: number;
	onClick?: () => void;
}

export default function ClubIdentityCard({
	team,
	league,
	position,
	onClick,
}: ClubIdentityCardProps) {
	const { t } = useTranslation();

	const getOrdinal = (n: number) => {
		if (n <= 0) return "-";
		return n + (n === 1 ? "er" : "e");
	};

	return (
		<div
			onClick={onClick}
			className="bg-white p-7 rounded-[2rem] shadow-sm border-2 border-paper-dark cursor-pointer hover:border-accent transition-all group active:scale-[0.98] relative overflow-hidden"
		>
			{/* Fond décoratif subtil */}
			<div
				className="absolute top-0 right-0 w-64 h-64 opacity-[0.02] pointer-events-none -mr-16 -mt-16"
				style={{
					backgroundColor: team?.primaryColor || "#991b1b",
					borderRadius: "100%",
				}}
			/>

			<div className="flex items-center gap-6 mb-8 relative z-10">
				{/* ÉCUSSON DU CLUB */}
				<div className="relative w-20 h-20 rounded-3xl overflow-hidden shadow-sm border border-gray-100 flex flex-col shrink-0">
					<div
						className="flex-1"
						style={{ backgroundColor: team?.primaryColor || "#991b1b" }}
					/>
					<div
						className="h-1/3"
						style={{ backgroundColor: team?.secondaryColor || "#ffffff" }}
					/>
					<div className="absolute inset-0 flex items-center justify-center">
						<Shield size={40} className="text-white/30" strokeWidth={2} />
					</div>
				</div>

				<div className="flex-1">
					<div className="flex items-center gap-1">
						<h2 className="text-3xl font-serif font-black text-ink leading-tight">
							{team?.name || "Club inconnu"}
						</h2>
						<ChevronRight
							size={20}
							className="text-gray-200 group-hover:text-accent transition-colors"
						/>
					</div>
					<p className="text-[10px] text-ink-light font-black uppercase tracking-[0.25em] mt-1 opacity-50">
						Institution de Football
					</p>
				</div>
			</div>

			<div className="grid grid-cols-2 gap-y-8 gap-x-6 pt-8 border-t border-paper-dark/30 relative z-10">
				{/* Division & Classement */}
				<div className="flex flex-col gap-2">
					<span className="text-[10px] text-ink-light font-black uppercase tracking-widest opacity-40">
						Compétition
					</span>
					<div className="flex items-center gap-3">
						<div className="w-12 h-12 bg-paper-dark/50 rounded-2xl flex items-center justify-center border border-gray-100 shrink-0">
							<Trophy size={20} className="text-accent" />
						</div>
						<div className="leading-tight">
							<div className="font-serif font-black text-ink text-xl">
								{getOrdinal(position)}
							</div>
							<div className="text-[10px] text-ink-light font-black uppercase tracking-wider truncate max-w-[100px]">
								{league?.name || "Ligue"}
							</div>
						</div>
					</div>
				</div>

				{/* Réputation */}
				<div className="flex flex-col gap-2 border-l border-paper-dark/30 pl-6">
					<span className="text-[10px] text-ink-light font-black uppercase tracking-widest opacity-40">
						Réputation
					</span>
					<div className="flex items-center gap-3">
						<div className="w-12 h-12 bg-paper-dark/50 rounded-2xl flex items-center justify-center border border-gray-100 shrink-0">
							<Star size={20} className="text-amber-500 fill-amber-500/10" />
						</div>
						<div className="font-serif font-black text-ink text-xl">
							{team?.reputation || 0}
							<span className="text-[10px] text-ink-light ml-0.5 opacity-30 font-sans">/100</span>
						</div>
					</div>
				</div>

				{/* Fans */}
				<div className="flex flex-col gap-2">
					<span className="text-[10px] text-ink-light font-black uppercase tracking-widest opacity-40">
						Supporteurs
					</span>
					<div className="flex items-center gap-3">
						<div className="w-12 h-12 bg-paper-dark/50 rounded-2xl flex items-center justify-center border border-gray-100 shrink-0">
							<Users size={20} className="text-ink-light" />
						</div>
						<div className="font-serif font-black text-ink text-xl">
							{team?.fanCount?.toLocaleString() || 0}
						</div>
					</div>
				</div>

				{/* Trésorerie */}
				<div className="flex flex-col gap-2 border-l border-paper-dark/30 pl-6">
					<span className="text-[10px] text-ink-light font-black uppercase tracking-widest opacity-40">
						Budget
					</span>
					<div className="flex items-center gap-3">
						<div className="w-12 h-12 bg-paper-dark/50 rounded-2xl flex items-center justify-center border border-gray-100 shrink-0">
							<Wallet size={20} className="text-accent" />
						</div>
						<CreditAmount amount={team?.budget || 0} size="lg" color="text-accent" />
					</div>
				</div>
			</div>
		</div>
	);
}
