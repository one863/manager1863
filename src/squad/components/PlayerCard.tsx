import type { Player } from "@/core/db/db";
import { TransferService } from "@/market/transfers/transfer-service";
import { useGameStore } from "@/infrastructure/store/gameSlice";
import { ArrowLeft, Trash2, Handshake, Heart, Activity, ShieldAlert, Target, Brain, PersonStanding, Star, Sparkles, ShieldCheck } from "lucide-preact";
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

    const totalDaysAtClub = (currentSeason - (player.joinedSeason || 1)) * 365 + (currentDay - (player.joinedDay || 1));

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

	const StatBar = ({ label, value, max=20 }: { label: string; value: number, max?: number }) => {
		const progressPercentage = (value / max) * 100;
		return (
			<div className="flex items-center mb-2">
				<span className="w-24 text-gray-500 truncate font-bold uppercase tracking-tight text-[10px]">
					{label}
				</span>
				<div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden mx-2">
					<div
						className={`h-full transition-all duration-500 ${value > 16 ? "bg-green-500" : value > 12 ? "bg-blue-500" : value > 8 ? "bg-yellow-500" : "bg-red-500"}`}
						style={{ width: `${Math.min(100, Math.max(0, progressPercentage))}%` }}
					/>
				</div>
				<span className="w-6 text-right font-bold text-gray-800 text-[10px]">
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
					<PlayerAvatar dna={player.dna} size={48} className={`border-2 ${player.injuryDays > 0 ? "border-red-500 grayscale" : "border-gray-100"}`} />
					<div>
						<h2 className="text-lg font-bold text-gray-900 leading-tight">{player.firstName} {player.lastName}</h2>
						<div className="flex items-center gap-2 mt-0.5">
							<span className={`px-1.5 py-0 rounded text-[10px] font-bold border ${getPositionColor(player.position)}`}>
								{player.position}
							</span>
                            <span className="px-1.5 py-0 rounded text-[10px] font-bold bg-gray-50 text-gray-500 border border-gray-200">
                                {player.role}
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

			{/* Tabs */}
			<div className="flex border-b bg-white">
                {[{ id: "stats", label: "Profil" }, { id: "data", label: "Stats" }, { id: "history", label: "Carrière" }, { id: "transfer", label: "Contrat" }].map((tab) => (
					<button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-wider transition-all ${activeTab === tab.id ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-600"}`}>
						{tab.label}
					</button>
				))}
			</div>

			<div className="flex-1 overflow-y-auto p-4 space-y-6">
				{activeTab === "stats" && (
					<div className="space-y-4">
						<div className="grid grid-cols-2 gap-3">
							<DataMetric label="Potentiel" value={Math.floor(player.potential)} />
							<DataMetric label="Morale" value={Math.round(player.morale)} color={player.morale > 70 ? "text-green-600" : "text-blue-600"} />
						</div>

						<div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm space-y-2">
							<h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
								<Sparkles size={14} className="text-blue-500" /> Caractéristiques
							</h3>
							<StatBar label="Technique" value={player.stats.technical} />
							<StatBar label="Finition" value={player.stats.finishing} />
							<StatBar label="Défense" value={player.stats.defense} />
							<StatBar label="Physique" value={player.stats.physical} />
							<StatBar label="Mental" value={player.stats.mental} />
							<StatBar label="Gardien" value={player.stats.goalkeeping} />
						</div>

                        {isUserPlayer && (
                            <div className="bg-pink-50 border border-pink-100 rounded-xl p-3 flex items-center gap-3">
                                <Heart size={16} className="text-pink-500 fill-pink-500" />
                                <p className="text-[11px] font-bold text-pink-700">Fidélité : {totalDaysAtClub} jours au club</p>
                            </div>
                        )}
					</div>
				)}

				{activeTab === "data" && (
					<div className="space-y-4">
						<div className="grid grid-cols-3 gap-2">
							<DataMetric label="Matchs" value={player.seasonStats.matches} />
							<DataMetric label="Buts" value={player.seasonStats.goals} color="text-green-600" />
							<DataMetric label="Passes D." value={player.seasonStats.assists} color="text-blue-600" />
						</div>
					</div>
				)}

                {activeTab === "history" && <CareerHistoryView playerName={`${player.firstName} ${player.lastName}`} />}

				{activeTab === "transfer" && (
					<div className="space-y-6">
						<div className="grid grid-cols-1 gap-3">
							<DataMetric label="Salaire" value={`M ${player.wage}`} sub="/ sem" />
							<DataMetric label="Valeur" value={`M ${player.marketValue}`} />
						</div>
                        {isUserPlayer ? (
                            <button onClick={() => setShowConfirmSell(true)} className="w-full py-4 bg-red-50 text-red-600 border border-red-100 rounded-xl text-sm font-bold flex items-center justify-center gap-2">
                                <Trash2 size={16} /> Vendre (M {sellValue})
                            </button>
                        ) : (
                            <button onClick={() => setShowConfirmBuy(true)} className="w-full py-4 bg-blue-50 text-blue-600 border border-blue-100 rounded-xl text-sm font-bold flex items-center justify-center gap-2">
                                <Handshake size={16} /> Recruter (M {player.marketValue})
                            </button>
                        )}
					</div>
				)}
			</div>
		</div>
	);
}
