import type { Player, PlayerTrait } from "@/db/db";
import { TransferService } from "@/services/transfer-service";
import { useGameStore } from "@/store/gameSlice";
import { AlertCircle, ArrowLeft, Trash2, TrendingUp, User, Star, Award, TrendingDown, Minus, Activity, ShieldAlert, BarChart3, Info, Zap, Shield, Repeat } from "lucide-preact";
import { useState } from "preact/hooks";
import { useTranslation } from "react-i18next";
import PlayerAvatar from "./PlayerAvatar";

interface PlayerCardProps {
	player: Player | null;
	onClose: () => void;
	onPlayerAction?: () => void;
}

export default function PlayerCard({
	player,
	onClose,
	onPlayerAction,
}: PlayerCardProps) {
	const { t } = useTranslation();
	const userTeamId = useGameStore((state) => state.userTeamId);
	const triggerRefresh = useGameStore((state) => state.triggerRefresh);
	const [showConfirmSell, setShowConfirmSell] = useState(false);
	const [activeTab, setActiveTab] = useState<"stats" | "data">("stats");

	if (!player) return null;

	const isUserPlayer = player.teamId === userTeamId;
	const sellPercentage = TransferService.getSellingPercentage(player.skill);
	const sellValue = Math.round(player.marketValue * sellPercentage);

	const handleSell = async () => {
		if (!userTeamId) return;
		try {
			await TransferService.sellPlayer(player.id!, userTeamId);
			triggerRefresh();
			setShowConfirmSell(false);
			if (onPlayerAction) onPlayerAction();
			onClose();
		} catch (e) {
			alert("Erreur lors de la vente");
		}
	};

	const getPositionColor = (pos: string) => {
		switch (pos) {
			case "GK": return "bg-yellow-100 text-yellow-800 border-yellow-300";
			case "DEF": return "bg-blue-100 text-blue-800 border-blue-300";
			case "MID": return "bg-green-100 text-green-800 border-green-300";
			case "FWD": return "bg-red-100 text-red-800 border-red-300";
			default: return "bg-gray-100";
		}
	};

	const getTraitLabel = (trait: PlayerTrait) => {
		const labels: Record<PlayerTrait, string> = {
			COUNTER_ATTACKER: "Expert Contre-Attaque",
			SHORT_PASSER: "Relanceur Court",
			CLUTCH_FINISHER: "Buteur Décisif",
			WING_WIZARD: "Magicien des Ailes",
			IRON_DEFENDER: "Défenseur de Fer",
			MARATHON_MAN: "Marathonien",
			BOX_TO_BOX: "Box-to-Box",
			FREE_KICK_EXPERT: "Expert Coups Francs",
			SWEEPER_GK: "Gardien Libéro"
		};
		return labels[trait] || trait;
	};

	const FormTrend = ({ form, background }: { form: number, background: number }) => {
		const diff = background - form;
		if (diff > 0.5) return <TrendingUp size={16} className="text-green-500" />;
		if (diff < -0.5) return <TrendingDown size={16} className="text-red-500" />;
		return <Minus size={16} className="text-gray-400" />;
	};

	const RatingBadge = ({ rating }: { rating: number }) => {
		const getColor = (r: number) => {
			if (r >= 18) return "bg-lime-400 text-black";
			if (r >= 15) return "bg-green-500 text-white";
			if (r >= 12) return "bg-yellow-500 text-white";
			if (r >= 8) return "bg-orange-500 text-white";
			return "bg-red-600 text-white";
		};

		return (
			<span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold shadow-sm ${getColor(rating)}`}>
				{rating.toFixed(1)}
			</span>
		);
	};

	const StatBar = ({ label, value, max=20 }: { label: string; value: number, max?: number }) => {
		const progressPercentage = (value / max) * 100;
		return (
			<div className="flex items-center mb-1.5">
				<span className="w-20 text-ink-light truncate font-bold uppercase tracking-tighter text-[9px]">
					{label}
				</span>
				<div className="flex-1 h-2 bg-gray-100 rounded-sm overflow-hidden border border-gray-200">
					<div
						className={`h-full transition-all duration-500 ${value > 16 ? "bg-green-500" : value > 12 ? "bg-accent" : value > 8 ? "bg-orange-400" : "bg-red-500"}`}
						style={{ width: `${Math.min(100, Math.max(0, progressPercentage))}%` }}
					/>
				</div>
				<span className="w-6 text-right font-mono font-bold text-ink ml-1.5 text-[10px]">
					{Math.floor(value)}
				</span>
			</div>
		);
	};

	const DataMetric = ({ label, value, sub, color="text-ink" }: { label: string, value: string | number, sub?: string, color?: string }) => (
		<div className="bg-paper-dark p-3 rounded-2xl border border-gray-200">
			<span className="block text-[8px] text-ink-light uppercase font-black tracking-widest mb-1">{label}</span>
			<div className="flex items-baseline gap-1">
				<span className={`text-lg font-black ${color}`}>{value}</span>
				{sub && <span className="text-[10px] text-ink-light font-bold">{sub}</span>}
			</div>
		</div>
	);

	const lastRating = player.lastRatings && player.lastRatings.length > 0 ? player.lastRatings[0] : null;

	return (
		<div
			className="fixed inset-x-0 bottom-0 z-[300] bg-white flex flex-col max-w-md mx-auto rounded-t-3xl shadow-2xl overflow-hidden animate-slide-up h-[90vh]"
			onClick={(e) => e.stopPropagation()}
		>
			{/* Pull bar */}
			<div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto my-3 shrink-0" />

			{/* Header */}
			<div className="bg-white px-4 pb-4 border-b flex justify-between items-center sticky top-0 z-10 shrink-0">
				<div className="flex gap-4 items-center">
					<button onClick={onClose} className="text-ink-light hover:text-accent p-1 transition-colors">
						<ArrowLeft size={24} />
					</button>
					<div className="relative">
						<PlayerAvatar
							dna={player.dna}
							size={56}
							className={`border-2 shadow-sm ${player.injuryDays > 0 ? "border-red-500 grayscale" : player.suspensionMatches > 0 ? "border-red-700 brightness-50" : "border-accent"}`}
						/>
						{player.injuryDays > 0 && <div className="absolute -bottom-1 -right-1 bg-red-600 text-white p-1 rounded-full"><Activity size={12} /></div>}
						{player.suspensionMatches > 0 && <div className="absolute -bottom-1 -right-1 bg-red-800 text-white p-1 rounded-full"><ShieldAlert size={12} /></div>}
					</div>
					<div>
						<h2 className="text-xl font-serif font-bold text-accent leading-tight">{player.firstName} {player.lastName}</h2>
						<div className="flex items-center gap-2 mt-0.5">
							<span className={`px-1.5 py-0 rounded text-[10px] font-bold border ${getPositionColor(player.position)}`}>
								{player.position} {player.position !== "GK" && `(${player.side || "C"})`}
							</span>
							<span className="text-xs text-ink-light">{player.age} ans</span>
						</div>
					</div>
				</div>
				<div className="text-right flex flex-col items-end">
					<div className="text-2xl font-black text-ink">{Math.floor(player.skill)}</div>
					<div className="text-[8px] text-ink-light uppercase tracking-widest font-black">Niveau</div>
					{lastRating && (
						<div className="mt-1 flex items-center gap-1">
							<span className="text-[8px] text-ink-light uppercase font-bold">Dernier Match:</span>
							<RatingBadge rating={lastRating} />
						</div>
					)}
				</div>
			</div>

			{/* Tabs Navigation */}
			<div className="flex border-b shrink-0">
				<button 
					onClick={() => setActiveTab("stats")}
					className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${activeTab === "stats" ? "text-accent border-b-2 border-accent" : "text-ink-light"}`}
				>
					<Award size={14} /> Profil & Attributs
				</button>
				<button 
					onClick={() => setActiveTab("data")}
					className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${activeTab === "data" ? "text-accent border-b-2 border-accent" : "text-ink-light"}`}
				>
					<BarChart3 size={14} /> Data Analytics
				</button>
			</div>

			{/* Unified Body */}
			<div className="p-5 space-y-6 flex-1 overflow-y-auto">
				{activeTab === "stats" ? (
					<>
						{/* Traits Section */}
						{player.traits && player.traits.length > 0 && (
							<div className="flex flex-wrap gap-2 mb-4">
								{player.traits.map(t => (
									<span key={t} className="px-2 py-1 bg-accent/10 text-accent text-[9px] font-black uppercase tracking-widest rounded-full border border-accent/20 flex items-center gap-1">
										<Zap size={10} /> {getTraitLabel(t)}
									</span>
								))}
							</div>
						)}

						<div className="grid grid-cols-2 gap-3">
							<div className="bg-paper-dark p-3 rounded-2xl border border-gray-200 flex items-center justify-between">
								<div>
									<span className="block text-[8px] text-ink-light uppercase font-black tracking-widest">Moral</span>
									<span className={`text-lg font-bold ${player.morale > 70 ? "text-green-600" : "text-orange-500"}`}>{player.morale}%</span>
								</div>
								<User size={20} className="text-ink-light opacity-30" />
							</div>
							<div className="bg-paper-dark p-3 rounded-2xl border border-gray-200">
								<span className="block text-[8px] text-ink-light uppercase font-black tracking-widest">{t("player_card.condition")}</span>
								<span className={`text-lg font-bold ${player.condition < 80 ? "text-red-600" : "text-green-700"}`}>{player.condition}%</span>
							</div>
						</div>

						<div className="space-y-4">
							<div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
								<h3 className="text-[10px] font-black text-accent uppercase tracking-widest mb-3 border-b border-accent/10 pb-1 flex justify-between items-center">
									<span>1. OFFENSE (Production)</span>
									<Zap size={14} />
								</h3>
								<StatBar label="Finition (xG)" value={player.stats.finishing} />
								<StatBar label="Création (xA)" value={player.stats.creation} />
								<StatBar label="Vision" value={player.stats.vision} />
							</div>

							<div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
								<h3 className="text-[10px] font-black text-accent uppercase tracking-widest mb-3 border-b border-accent/10 pb-1 flex justify-between items-center">
									<span>2. DEFENSE (Obstruction)</span>
									<Shield size={14} />
								</h3>
								<StatBar label="Pressing" value={player.stats.pressing} />
								<StatBar label="Intervention" value={player.stats.intervention} />
								<StatBar label="Impact" value={player.stats.impact} />
							</div>

							<div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
								<h3 className="text-[10px] font-black text-accent uppercase tracking-widest mb-3 border-b border-accent/10 pb-1 flex justify-between items-center">
									<span>3. TRANSITION (Circulation)</span>
									<Repeat size={14} />
								</h3>
								<StatBar label="Résistance" value={player.stats.resistance} />
								<StatBar label="Volume" value={player.stats.volume} />
								<StatBar label="Explosivité" value={player.stats.explosivity} />
							</div>
							
							{player.position === "GK" && player.stats.goalkeeping && (
								<div className="bg-white rounded-2xl p-4 border border-yellow-100 shadow-sm">
									<h3 className="text-[10px] font-black text-yellow-700 uppercase tracking-widest mb-3 border-b border-yellow-100 pb-1">
										4. DERNIER REMPART
									</h3>
									<StatBar label="Arrêts (xCG)" value={player.stats.goalkeeping} />
								</div>
							)}
						</div>
					</>
				) : (
					<div className="space-y-6">
						{!player.seasonStats || player.seasonStats.matches === 0 ? (
							<div className="bg-paper-dark p-8 rounded-3xl border border-dashed border-gray-300 text-center">
								<Info size={32} className="mx-auto text-ink-light opacity-30 mb-3" />
								<p className="text-xs font-bold text-ink-light uppercase tracking-widest">Pas encore de data pour cette saison</p>
							</div>
						) : (
							<>
								<div className="grid grid-cols-3 gap-2">
									<DataMetric label="Matchs" value={player.seasonStats.matches} />
									<DataMetric label="Buts" value={player.seasonStats.goals} color="text-green-600" />
									<DataMetric label="Passes D." value={player.seasonStats.assists} color="text-blue-600" />
								</div>

								<div className="space-y-4">
									<h3 className="text-[10px] font-black text-accent uppercase tracking-widest border-b pb-1">Offensive production</h3>
									<div className="grid grid-cols-2 gap-3">
										<DataMetric label="Expected Goals (xG)" value={player.seasonStats.xg.toFixed(2)} sub={`vs ${player.seasonStats.goals} buts`} />
										<DataMetric label="Expected Assists (xA)" value={player.seasonStats.xa.toFixed(2)} sub={`vs ${player.seasonStats.assists} pd`} />
									</div>
								</div>

								<div className="space-y-4">
									<h3 className="text-[10px] font-black text-accent uppercase tracking-widest border-b pb-1">Volume & Circulation</h3>
									<div className="grid grid-cols-2 gap-3">
										<DataMetric label="Distance Moyenne" value={(player.seasonStats.distance / player.seasonStats.matches).toFixed(1)} sub="km / match" />
										<DataMetric label="Précision Passes" value={Math.round(player.seasonStats.passAccuracy * 100)} sub="%" />
										<DataMetric label="Duels Gagnés" value={Math.round(player.seasonStats.duelsWinRate * 100)} sub="%" />
										<DataMetric label="Note Moyenne" value={player.seasonStats.avgRating.toFixed(2)} color="text-accent" />
									</div>
								</div>
							</>
						)}
					</div>
				)}
			</div>

			{/* Unified Footer */}
			{isUserPlayer && (
				<div className="p-4 bg-paper-dark border-t border-gray-200 pb-10 shrink-0">
					<button
						onClick={() => setShowConfirmSell(true)}
						className="w-full py-4 bg-red-50 text-red-600 border border-red-200 rounded-2xl text-[10px] font-black tracking-widest flex items-center justify-center gap-2 hover:bg-red-100 active:scale-[0.98] transition-all uppercase"
					>
						<Trash2 size={14} /> Vendre (M {sellValue})
					</button>
				</div>
			)}
		</div>
	);
}
