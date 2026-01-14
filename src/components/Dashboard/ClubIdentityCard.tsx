import type { League, Team } from "@/db/db";
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
			className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 cursor-pointer hover:border-accent transition-all group active:scale-[0.98] relative overflow-hidden"
		>
			{/* Fond décoratif subtil */}
			<div
				className="absolute top-0 right-0 w-48 h-48 opacity-[0.03] pointer-events-none -mr-12 -mt-12"
				style={{
					backgroundColor: team?.primaryColor || "#991b1b",
					borderRadius: "100%",
				}}
			/>

			<div className="flex items-center gap-5 mb-8 relative z-10">
				{/* ÉCUSSON DU CLUB */}
				<div className="relative w-16 h-16 rounded-2xl overflow-hidden shadow-md border border-gray-100 flex flex-col shrink-0">
					<div
						className="flex-1"
						style={{ backgroundColor: team?.primaryColor || "#991b1b" }}
					/>
					<div
						className="h-1/3"
						style={{ backgroundColor: team?.secondaryColor || "#ffffff" }}
					/>
					<div className="absolute inset-0 flex items-center justify-center">
						<Shield size={32} className="text-white/40" strokeWidth={2.5} />
					</div>
				</div>

				<div className="flex-1">
					<div className="flex items-center gap-1">
						<h2 className="text-3xl font-serif font-black text-ink leading-none">
							{team?.name || "Club inconnu"}
						</h2>
						<ChevronRight
							size={20}
							className="text-gray-300 group-hover:text-accent transition-colors"
						/>
					</div>
					<p className="text-xs text-ink-light font-bold uppercase tracking-[0.2em] mt-2 opacity-70">
						Institution Fondée en 1863
					</p>
				</div>
			</div>

			<div className="grid grid-cols-2 gap-y-6 gap-x-4 pt-6 border-t border-gray-100 relative z-10">
				{/* Division & Classement */}
				<div className="flex flex-col gap-2">
					<span className="text-[10px] text-ink-light font-black uppercase tracking-widest opacity-60">
						Compétition
					</span>
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 bg-paper-dark rounded-xl flex items-center justify-center border border-gray-100 shrink-0">
							<Trophy size={20} className="text-accent" />
						</div>
						<div className="leading-tight">
							<div className="font-black text-ink text-base">
								{getOrdinal(position)}
							</div>
							<div className="text-xs text-ink-light font-bold truncate max-w-[100px]">
								{league?.name || "Ligue"}
							</div>
						</div>
					</div>
				</div>

				{/* Réputation */}
				<div className="flex flex-col gap-2 border-l border-gray-100 pl-4">
					<span className="text-[10px] text-ink-light font-black uppercase tracking-widest opacity-60">
						Réputation
					</span>
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 bg-paper-dark rounded-xl flex items-center justify-center border border-gray-100 shrink-0">
							<Star size={20} className="text-amber-500 fill-amber-500/20" />
						</div>
						<div className="font-black text-ink text-lg">
							{team?.reputation || 0}
							<span className="text-[10px] text-ink-light ml-0.5 opacity-50">/100</span>
						</div>
					</div>
				</div>

				{/* Fans */}
				<div className="flex flex-col gap-2">
					<span className="text-[10px] text-ink-light font-black uppercase tracking-widest opacity-60">
						Supporteurs
					</span>
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 bg-paper-dark rounded-xl flex items-center justify-center border border-gray-100 shrink-0">
							<Users size={20} className="text-ink-light" />
						</div>
						<div className="font-black text-ink text-lg">
							{team?.fanCount?.toLocaleString() || 0}
						</div>
					</div>
				</div>

				{/* Trésorerie */}
				<div className="flex flex-col gap-2 border-l border-gray-100 pl-4">
					<span className="text-[10px] text-ink-light font-black uppercase tracking-widest opacity-60">
						Budget
					</span>
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 bg-paper-dark rounded-xl flex items-center justify-center border border-gray-100 shrink-0">
							<Wallet size={20} className="text-accent" />
						</div>
						<CreditAmount amount={team?.budget || 0} size="lg" color="text-accent" />
					</div>
				</div>
			</div>
		</div>
	);
}
