import type { Player } from "@/db/db";
import { TransferService } from "@/services/transfer-service";
import { useGameStore } from "@/store/gameSlice";
import { AlertCircle, ArrowLeft, Trash2, TrendingUp, X } from "lucide-preact";
import { useState } from "preact/hooks";
import { useTranslation } from "react-i18next";
import Button from "./Common/Button";
import PlayerAvatar from "./PlayerAvatar";

interface PlayerCardProps {
	player: Player | null;
	onClose: () => void;
	onPlayerAction?: () => void; // Pour forcer le refresh du parent
}

export default function PlayerCard({
	player,
	onClose,
	onPlayerAction,
}: PlayerCardProps) {
	const { t } = useTranslation();
	const userTeamId = useGameStore((state) => state.userTeamId);
	const [showConfirmSell, setShowConfirmSell] = useState(false);

	if (!player) return null;

	const isUserPlayer = player.teamId === userTeamId;
	const sellPercentage = TransferService.getSellingPercentage(player.skill);
	const sellValue = Math.round(player.marketValue * sellPercentage);

	const handleSell = async () => {
		if (!userTeamId) return;
		try {
			await TransferService.sellPlayer(player.id!, userTeamId);
			setShowConfirmSell(false);
			if (onPlayerAction) onPlayerAction();
			onClose();
		} catch (e) {
			alert("Erreur lors de la vente");
		}
	};

	const getPositionColor = (pos: string) => {
		switch (pos) {
			case "GK":
				return "bg-yellow-100 text-yellow-800 border-yellow-300";
			case "DEF":
				return "bg-blue-100 text-blue-800 border-blue-300";
			case "MID":
				return "bg-green-100 text-green-800 border-green-300";
			case "FWD":
				return "bg-red-100 text-red-800 border-red-300";
			default:
				return "bg-gray-100";
		}
	};

	const StatBar = ({ label, value }: { label: string; value: number }) => (
		<div className="flex items-center mb-1.5">
			<span className="w-20 text-ink-light truncate font-bold uppercase tracking-tighter text-[9px]">
				{label}
			</span>
			<div className="flex-1 h-2 bg-gray-100 rounded-sm overflow-hidden border border-gray-200">
				<div
					className={`h-full transition-all duration-500 ${value > 75 ? "bg-green-500" : value > 50 ? "bg-accent" : value > 25 ? "bg-orange-400" : "bg-red-500"}`}
					style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
				/>
			</div>
			<span className="w-6 text-right font-mono font-bold text-ink ml-1.5 text-[10px]">
				{value}
			</span>
		</div>
	);

	return (
		<div
			className="absolute inset-0 z-[110] bg-white flex flex-col animate-fade-in overflow-hidden"
			onClick={(e) => e.stopPropagation()}
		>
			{/* Header - Plus compact */}
			<div className="bg-white p-3 border-b flex justify-between items-center sticky top-0 z-10">
				<div className="flex gap-3 items-center">
					<button
						onClick={onClose}
						className="text-ink-light hover:text-accent p-1"
					>
						<ArrowLeft size={20} />
					</button>
					<PlayerAvatar
						dna={player.dna}
						size={56}
						className="border-2 border-accent shadow-sm"
					/>
					<div>
						<h2 className="text-lg font-serif font-bold text-accent leading-tight">
							{player.firstName} {player.lastName}
						</h2>
						<div className="flex items-center gap-2 mt-0.5">
							<span
								className={`px-1.5 py-0 rounded text-[10px] font-bold border ${getPositionColor(player.position)}`}
							>
								{player.position}{" "}
								{player.position !== "GK" && `(${player.side || "C"})`}
							</span>
							<span className="text-xs text-ink-light">{player.age} ans</span>
						</div>
					</div>
				</div>
				<div className="text-right">
					<div className="text-2xl font-bold text-ink">{player.skill}</div>
					<div className="text-[8px] text-ink-light uppercase tracking-widest font-black">
						Niveau
					</div>
				</div>
			</div>

			{/* Main Body - Grille compacte */}
			<div className="p-3 space-y-3 flex-1 overflow-y-auto pb-20">
				{/* Quick Stats - Côte à côte plus fin */}
				<div className="flex gap-2 text-sm bg-paper-dark p-2.5 rounded-xl border border-gray-200">
					<div className="flex-1">
						<span className="block text-[8px] text-ink-light uppercase font-black tracking-widest">
							{t("player_card.value")}
						</span>
						<span className="text-sm font-bold text-ink">M {player.marketValue}</span>
					</div>
					<div className="flex-1 text-right">
						<span className="block text-[8px] text-ink-light uppercase font-black tracking-widest">
							{t("player_card.condition")}
						</span>
						<span
							className={`text-sm font-bold ${player.condition < 80 ? "text-red-600" : "text-green-700"}`}
						>
							{player.condition}%
						</span>
					</div>
				</div>

				{/* Stats en grille 2 colonnes pour gagner de la place */}
				<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
					{/* Phase */}
					<div className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm">
						<h3 className="text-[9px] font-black text-accent uppercase tracking-widest mb-2 border-b border-accent/10 pb-1 flex justify-between">
							<span>{t("player_card.phase")}</span>
							<TrendingUp size={10} />
						</h3>
						<StatBar label={t("player_card.stamina")} value={player.stats.stamina} />
						<StatBar label={t("player_card.playmaking")} value={player.stats.playmaking} />
						<StatBar label={t("player_card.defense")} value={player.stats.defense} />
					</div>

					{/* Specialties */}
					<div className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm">
						<h3 className="text-[9px] font-black text-accent uppercase tracking-widest mb-2 border-b border-accent/10 pb-1">
							{t("player_card.specialty")}
						</h3>
						<StatBar label={t("player_card.speed")} value={player.stats.speed} />
						<StatBar label={t("player_card.head")} value={player.stats.head} />
						<StatBar label={t("player_card.technique")} value={player.stats.technique} />
					</div>

					{/* Conversion (sur toute la largeur ou en colonne) */}
					<div className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm md:col-span-2">
						<h3 className="text-[9px] font-black text-accent uppercase tracking-widest mb-2 border-b border-accent/10 pb-1">
							{t("player_card.conversion")}
						</h3>
						<div className="grid grid-cols-2 gap-x-4">
							<StatBar label={t("player_card.scoring")} value={player.stats.scoring} />
							<StatBar label={t("player_card.setPieces")} value={player.stats.setPieces} />
						</div>
					</div>
				</div>
			</div>

			{/* Actions - Plus fin */}
			{isUserPlayer && (
				<div className="p-2.5 bg-paper-dark border-t border-gray-300">
					<button
						onClick={() => setShowConfirmSell(true)}
						className="w-full py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg text-[10px] font-black tracking-widest flex items-center justify-center gap-2 hover:bg-red-100 active:scale-[0.98] transition-all uppercase"
					>
						<Trash2 size={12} /> Vendre (M {sellValue})
					</button>
				</div>
			)}

			{/* Confirmation Vente */}
			{showConfirmSell && (
				<div className="absolute inset-0 bg-white/95 flex flex-col items-center justify-center p-6 text-center animate-fade-in z-20">
					<div className="bg-red-100 p-3 rounded-full text-red-500 mb-3">
						<AlertCircle size={32} />
					</div>
					<h4 className="font-serif font-bold text-xl mb-1 text-ink">
						Vendre le joueur ?
					</h4>
					<p className="text-xs text-ink-light mb-6 leading-relaxed max-w-[240px]">
						Confirmez-vous la vente de <span className="font-bold text-ink">{player.firstName} {player.lastName}</span> pour <span className="font-bold text-accent">M {sellValue}</span> ?
					</p>
					<div className="flex flex-col gap-2 w-full max-w-[240px]">
						<button
							onClick={handleSell}
							className="w-full py-3 bg-red-600 text-white rounded-xl font-bold uppercase text-[10px] tracking-widest shadow-md active:scale-95"
						>
							Confirmer
						</button>
						<button
							onClick={() => setShowConfirmSell(false)}
							className="w-full py-3 bg-paper-dark text-ink-light rounded-xl font-bold uppercase text-[10px] tracking-widest"
						>
							Annuler
						</button>
					</div>
				</div>
			)}
		</div>
	);
}
