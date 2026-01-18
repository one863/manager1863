import type { Player, PlayerTrait } from "@/core/db/db";
import { TransferService } from "@/market/transfers/transfer-service";
import { useGameStore } from "@/infrastructure/store/gameSlice";
import { AlertCircle, ArrowLeft, Trash2, TrendingUp, User, Award, Activity, ShieldAlert, BarChart3, Info, Zap, Shield, Repeat, Clock, CircleDollarSign, Handshake, Heart, History } from "lucide-preact";
import { useState } from "preact/hooks";
import { useTranslation } from "react-i18next";
import PlayerAvatar from "./PlayerAvatar";
import CareerHistoryView from "@/ui/components/Common/CareerHistoryView";

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
    const currentDay = useGameStore((state) => state.day);
    const currentSeason = useGameStore((state) => state.season);
	const triggerRefresh = useGameStore((state) => state.triggerRefresh);
	const [showConfirmSell, setShowConfirmSell] = useState(false);
	const [showConfirmBuy, setShowConfirmBuy] = useState(false);
	const [activeTab, setActiveTab] = useState<"stats" | "data" | "transfer" | "history">("stats");

	if (!player) return null;

	const isUserPlayer = player.teamId === userTeamId;
	const sellPercentage = TransferService.getSellingPercentage(player.skill);
	const sellValue = Math.round(player.marketValue * sellPercentage);

    // Calcul de la fidélité
    const totalDaysAtClub = (currentSeason - (player.joinedSeason || 1)) * 365 + (currentDay - (player.joinedDay || 1));
    const loyaltyBonus = Math.min(20, Math.floor(totalDaysAtClub / 100) * 2);

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

	const handleBuy = async () => {
		if (!userTeamId || !player.id) return;
		const res = await TransferService.buyPlayer(player.id, userTeamId, player.marketValue);
		if (res.success) {
			triggerRefresh();
			setShowConfirmBuy(false);
			if (onPlayerAction) onPlayerAction();
			onClose();
		} else {
			alert(res.error);
		}
	};

	const getPositionColor = (pos: string) => {
		switch (pos) {
			case "GK": return "bg-yellow-100 text-yellow-800 border-yellow-200";
			case "DEF": return "bg-blue-100 text-blue-800 border-blue-200";
			case "MID": return "bg-green-100 text-green-800 border-green-200";
			case "FWD": return "bg-red-100 text-red-800 border-red-200";
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

	const RatingBadge = ({ rating }: { rating: number }) => {
		const getColor = (r: number) => {
			if (r >= 18) return "bg-lime-500 text-white";
			if (r >= 15) return "bg-green-500 text-white";
			if (r >= 12) return "bg-yellow-500 text-white";
			if (r >= 8) return "bg-orange-500 text-white";
			return "bg-red-600 text-white";
		};

		return (
			<span className={`px-2 py-0.5 rounded text-[11px] font-bold ${getColor(rating)}`}>
				{rating.toFixed(1)}
			</span>
		);
	};

	const StatBar = ({ label, value, max=20 }: { label: string; value: number, max?: number }) => {
		const progressPercentage = (value / max) * 100;
		return (
			<div className="flex items-center mb-2">
				<span className="w-24 text-gray-500 truncate font-bold uppercase tracking-tight text-[10px]">
					{label}
				</span>
				<div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
					<div
						className={`h-full transition-all duration-500 ${value > 16 ? "bg-green-500" : value > 12 ? "bg-blue-500" : value > 8 ? "bg-yellow-500" : "bg-red-500"}`}
						style={{ width: `${Math.min(100, Math.max(0, progressPercentage))}%` }}
					/>
				</div>
				<span className="w-6 text-right font-bold text-gray-800 ml-2 text-xs">
					{Math.floor(value)}
				</span>
			</div>
		);
	};

	const DataMetric = ({ label, value, sub, color="text-gray-900", icon }: { label: string, value: string | number, sub?: string, color?: string, icon?: any }) => (
		<div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
			<span className="block text-[9px] text-gray-400 uppercase font-bold tracking-wider mb-1">{label}</span>
			<div className="flex items-baseline gap-1">
                {icon && <span className="mr-1">{icon}</span>}
				<span className={`text-lg font-bold ${color}`}>{value}</span>
				{sub && <span className="text-[10px] text-gray-400 font-medium">{sub}</span>}
			</div>
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
					<div className="relative">
						<PlayerAvatar
							dna={player.dna}
							size={48}
							className={`border-2 ${player.injuryDays > 0 ? "border-red-500 grayscale" : "border-gray-100"}`}
						/>
					</div>
					<div>
						<h2 className="text-lg font-bold text-gray-900 leading-tight">{player.firstName} {player.lastName}</h2>
						<div className="flex items-center gap-2 mt-0.5">
							<span className={`px-1.5 py-0 rounded text-[10px] font-bold border ${getPositionColor(player.position)}`}>
								{player.position}
							</span>
							<span className="text-xs text-gray-500">{player.age} ans</span>
						</div>
					</div>
				</div>
				<div className="text-right">
					<div className="text-2xl font-black text-gray-900">{Math.floor(player.skill)}</div>
					<div className="text-[9px] text-gray-400 uppercase font-bold tracking-tight">Skill</div>
				</div>
			</div>

			{/* Status Alerts */}
			{(player.injuryDays > 0 || player.suspensionMatches > 0) && (
				<div className={`px-4 py-2 flex items-center gap-3 border-b ${player.injuryDays > 0 ? "bg-red-50 text-red-700" : "bg-red-100 text-red-900"}`}>
					{player.injuryDays > 0 ? <Activity size={16} /> : <ShieldAlert size={16} />}
					<p className="text-xs font-bold">
						{player.injuryDays > 0 ? `Blessé (${player.injuryDays}j)` : `Suspendu (${player.suspensionMatches}m)`}
					</p>
				</div>
			)}

			{/* Tabs Navigation */}
			<div className="flex border-b bg-white">
                {[
                    { id: "stats", label: "Profil" },
                    { id: "data", label: "Stats" },
                    { id: "history", label: "Carrière" },
                    { id: "transfer", label: "Contrat" }
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
					<>
						{player.traits && player.traits.length > 0 && (
							<div className="flex flex-wrap gap-2">
								{player.traits.map(t => (
									<span key={t} className="px-2 py-1 bg-blue-50 text-blue-600 text-[10px] font-bold rounded-lg border border-blue-100 flex items-center gap-1">
										<Zap size={10} /> {getTraitLabel(t)}
									</span>
								))}
							</div>
						)}

						<div className="grid grid-cols-2 gap-3">
							<DataMetric label="Potentiel" value={Math.floor(player.potential || player.skill)} />
							<DataMetric 
                                label="Fidélité" 
                                value={`+${loyaltyBonus}%`} 
                                sub="bonus" 
                                color="text-pink-600"
                                icon={<Heart size={14} className="text-pink-500 fill-pink-500" />}
                            />
						</div>

                        {isUserPlayer && (
                            <div className="bg-pink-50 border border-pink-100 rounded-xl p-3 flex items-center gap-3">
                                <Heart size={16} className="text-pink-500 fill-pink-500" />
                                <p className="text-[11px] font-bold text-pink-700">
                                    Au club depuis {totalDaysAtClub} jours ({Math.floor(totalDaysAtClub / 365)} saisons).
                                </p>
                            </div>
                        )}

						<div className="space-y-4">
							<div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
								<h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
									<Zap size={14} className="text-blue-500" /> Attaque
								</h3>
								<StatBar label="Finition" value={player.stats.finishing} />
								<StatBar label="Création" value={player.stats.creation} />
								<StatBar label="Vision" value={player.stats.vision} />
							</div>

							<div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
								<h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
									<Shield size={14} className="text-blue-500" /> Défense
								</h3>
								<StatBar label="Pressing" value={player.stats.pressing} />
								<StatBar label="Intervention" value={player.stats.intervention} />
								<StatBar label="Impact" value={player.stats.impact} />
							</div>

							<div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
								<h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
									<Repeat size={14} className="text-blue-500" /> Physique
								</h3>
								<StatBar label="Résistance" value={player.stats.resistance} />
								<StatBar label="Volume" value={player.stats.volume} />
								<StatBar label="Explosivité" value={player.stats.explosivity} />
							</div>
						</div>
					</>
				)}

				{activeTab === "data" && (
					<div className="space-y-6">
						{!player.seasonStats || player.seasonStats.matches === 0 ? (
							<div className="py-12 text-center">
								<p className="text-xs text-gray-400 font-bold uppercase">Aucune donnée cette saison</p>
							</div>
						) : (
							<>
								<div className="grid grid-cols-3 gap-2">
									<DataMetric label="Matchs" value={player.seasonStats.matches} />
									<DataMetric label="Buts" value={player.seasonStats.goals} color="text-green-600" />
									<DataMetric label="Passes D." value={player.seasonStats.assists} color="text-blue-600" />
								</div>
								<div className="bg-white p-4 rounded-xl border border-gray-100">
									<h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Performance Moyenne</h3>
									<div className="flex items-center justify-between">
										<span className="text-sm font-bold">Note Moyenne</span>
										<RatingBadge rating={player.seasonStats.avgRating} />
									</div>
								</div>
							</>
						)}
					</div>
				)}

                {activeTab === "history" && (
                    <CareerHistoryView playerName={`${player.firstName} ${player.lastName}`} />
                )}

				{activeTab === "transfer" && (
					<div className="space-y-6">
						<div className="grid grid-cols-1 gap-3">
							<DataMetric label="Salaire" value={`M ${player.wage}`} sub="/ semaine" />
							<DataMetric label="Valeur" value={`M ${player.marketValue}`} />
						</div>

						{isUserPlayer ? (
							<div className="pt-4">
								{showConfirmSell ? (
									<div className="bg-red-50 p-4 rounded-xl border border-red-100 space-y-4">
										<p className="text-xs font-bold text-red-700">Vendre pour M {sellValue} ?</p>
										<div className="flex gap-2">
											<button onClick={() => setShowConfirmSell(false)} className="flex-1 py-2 bg-white text-gray-500 border border-gray-200 rounded-lg text-xs font-bold">Annuler</button>
											<button onClick={handleSell} className="flex-1 py-2 bg-red-600 text-white rounded-lg text-xs font-bold">Confirmer</button>
										</div>
									</div>
								) : (
									<button
										onClick={() => setShowConfirmSell(true)}
										className="w-full py-4 bg-red-50 text-red-600 border border-red-100 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
									>
										<Trash2 size={16} /> Vendre le joueur
									</button>
								)}
							</div>
						) : (
							<div className="pt-4">
								{showConfirmBuy ? (
									<div className="bg-blue-50 p-4 rounded-xl border border-blue-100 space-y-4">
										<p className="text-xs font-bold text-blue-700">Recruter pour M {player.marketValue} ?</p>
										<div className="flex gap-2">
											<button onClick={() => setShowConfirmBuy(false)} className="flex-1 py-2 bg-white text-gray-500 border border-gray-200 rounded-lg text-xs font-bold">Annuler</button>
											<button onClick={handleBuy} className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold">Confirmer</button>
										</div>
									</div>
								) : (
									<button
										onClick={() => setShowConfirmBuy(true)}
										className="w-full py-4 bg-blue-50 text-blue-600 border border-blue-100 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
									>
										<Handshake size={16} /> Recruter le joueur
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
