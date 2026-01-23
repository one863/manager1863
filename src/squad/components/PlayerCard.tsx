import type { Player } from "@/core/types";
import { TransferService } from "@/market/transfers/transfer-service";
import { useGameStore } from "@/infrastructure/store/gameSlice";
import { ArrowLeft, Trash2, Handshake, Heart, Activity, Target, Brain, Sparkles } from "lucide-preact";
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
				<span className="w-24 text-gray-500 truncate font-bold uppercase tracking-tight text-[10px]">{label}</span>
				<div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden mx-2">
					<div className={`h-full transition-all duration-500 ${value > 16 ? "bg-emerald-500" : value > 12 ? "bg-blue-500" : value > 8 ? "bg-amber-500" : "bg-rose-500"}`} style={{ width: `${Math.min(100, Math.max(0, progressPercentage))}%` }} />
				</div>
				<span className="w-6 text-right font-bold text-gray-800 text-[10px]">{Math.floor(value)}</span>
			</div>
		);
	};

	const DataMetric = ({ label, value, sub, color="text-gray-900", icon }: { label: string, value: string | number, sub?: string, color?: string, icon?: any }) => (
		<div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
			<span className="block text-[9px] text-gray-400 uppercase font-black tracking-wider mb-1">{label}</span>
			<div className="flex items-center gap-1.5">
                {icon && <span className="text-gray-400">{icon}</span>}
				<span className={`text-lg font-black tracking-tight ${color}`}>{value}</span>
				{sub && <span className="text-[10px] text-gray-400 font-bold">{sub}</span>}
			</div>
		</div>
	);

	return (
		<div className="flex flex-col h-full bg-white animate-fade-in">
			<div className="bg-white px-4 py-4 border-b flex justify-between items-center sticky top-0 z-10">
				<div className="flex gap-3 items-center">
					<button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1"><ArrowLeft size={24} /></button>
					<PlayerAvatar dna={player.dna} size={52} className={`border-2 ${player.injuryDays > 0 ? "border-red-500 grayscale" : "border-gray-100 shadow-sm"}`} />
					<div>
						<h2 className="text-lg font-black text-slate-900 leading-none">{player.firstName} {player.lastName}</h2>
						<div className="flex items-center gap-2 mt-1.5">
                            {/* Affichage unique du Rôle avec la couleur du Secteur */}
							<span className={`px-2 py-0.5 rounded-md text-[9px] font-black border ${getPositionColor(player.position)}`}>
								{player.role}
							</span>
							<span className="text-[10px] font-bold text-slate-400 uppercase">{player.age} ans</span>
						</div>
					</div>
				</div>
				<div className="text-right">
					<div className="text-2xl font-black text-slate-900 leading-none">{Math.floor(player.skill)}</div>
					<div className="text-[8px] text-slate-400 uppercase font-black tracking-widest mt-1">Skill</div>
				</div>
			</div>

			<div className="flex border-b bg-white">
                {[{ id: "stats", label: "Profil" }, { id: "data", label: "Stats" }, { id: "history", label: "Carrière" }, { id: "transfer", label: "Contrat" }].map((tab) => (
					<button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex-1 py-3 text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? "text-blue-600 border-b-2 border-blue-600" : "text-slate-400"}`}>{tab.label}</button>
				))}
			</div>

			<div className="flex-1 overflow-y-auto p-4 space-y-4">
				{activeTab === "stats" && (
					<div className="space-y-4">
						<div className="grid grid-cols-2 gap-3">
                            <DataMetric label="Potentiel" value={Math.floor(player.potential)} icon={<Target size={14}/>} />
                            <DataMetric label="Confiance" value={Math.round(player.morale)} color={player.morale > 75 ? "text-emerald-600" : player.morale < 40 ? "text-rose-600" : "text-blue-600"} icon={<Brain size={14}/>} />
                            <DataMetric label="Condition" value={`${Math.round(player.condition)}%`} color={player.condition < 60 ? "text-rose-600" : "text-emerald-600"} icon={<Activity size={14}/>} />
                            <DataMetric label="Énergie" value={`${Math.round(player.energy)}%`} color={player.energy < 50 ? "text-amber-600" : "text-emerald-600"} icon={<Sparkles size={14}/>} />
						</div>

						<div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 shadow-sm space-y-3">
							<h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Sparkles size={12} className="text-blue-500" /> Caractéristiques Techniques</h3>
							<StatBar label="Technique" value={player.stats.technical} />
							<StatBar label="Finition" value={player.stats.finishing} />
							<StatBar label="Défense" value={player.stats.defense} />
							<StatBar label="Physique" value={player.stats.physical} />
							<StatBar label="Mental" value={player.stats.mental} />
							<StatBar label="Gardien" value={player.stats.goalkeeping} />
						</div>

                        {isUserPlayer && (
                            <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm"><Heart size={20} className="text-rose-500 fill-rose-500" /></div>
                                <div>
                                    <p className="text-[9px] font-black text-rose-400 uppercase tracking-widest">Fidélité au club</p>
                                    <p className="text-sm font-black text-rose-700">{totalDaysAtClub} jours au club</p>
                                </div>
                            </div>
                        )}
					</div>
				)}

				{activeTab === "data" && (
					<div className="space-y-4">
						<div className="grid grid-cols-3 gap-2">
							<DataMetric label="Matchs" value={player.seasonStats.matches} />
							<DataMetric label="Buts" value={player.seasonStats.goals} color="text-emerald-600" />
							<DataMetric label="Passes D." value={player.seasonStats.assists} color="text-blue-600" />
						</div>
                        <div className="grid grid-cols-2 gap-2">
                            <DataMetric label="xG Saison" value={player.seasonStats.xg.toFixed(2)} />
                            <DataMetric label="Note Moy." value={player.seasonStats.avgRating.toFixed(2)} color="text-amber-600" />
                        </div>
					</div>
				)}

                {activeTab === "history" && <CareerHistoryView playerName={`${player.firstName} ${player.lastName}`} />}

				{activeTab === "transfer" && (
					<div className="space-y-4">
						<div className="grid grid-cols-1 gap-3">
							<DataMetric label="Salaire Hebdo" value={`£${player.wage.toLocaleString()}`} />
							<DataMetric label="Valeur Marchande" value={`£${player.marketValue.toLocaleString()}`} />
						</div>
                        {isUserPlayer ? (
                            <button onClick={() => setShowConfirmSell(true)} className="w-full py-4 bg-rose-50 text-rose-600 border border-rose-100 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-transform"><Trash2 size={16} /> Vendre (£{sellValue.toLocaleString()})</button>
                        ) : (
                            <button onClick={() => setShowConfirmBuy(true)} className="w-full py-4 bg-blue-50 text-blue-600 border border-blue-100 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-transform"><Handshake size={16} /> Négocier (£{player.marketValue.toLocaleString()})</button>
                        )}
					</div>
				)}
			</div>
		</div>
	);
}
