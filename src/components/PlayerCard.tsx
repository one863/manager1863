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
		<div className="flex items-center text-[10px] mb-1">
			<span className="w-24 text-ink-light truncate font-bold uppercase tracking-tighter">
				{label}
			</span>
			<div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden border border-gray-200">
				<div
					className={`h-full ${value > 75 ? "bg-green-500" : value > 50 ? "bg-accent" : value > 25 ? "bg-orange-400" : "bg-red-500"}`}
					style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
				/>
			</div>
			<span className="w-6 text-right font-mono font-bold text-ink ml-1">
				{value}
			</span>
		</div>
	);

	return (
		<div
			className="absolute inset-0 z-[110] bg-white flex flex-col animate-fade-in overflow-hidden"
			onClick={(e) => e.stopPropagation()}
		>
			{/* Header */}
			<div className="bg-white p-4 border-b flex justify-between items-start sticky top-0 z-10">
				<div className="flex gap-4 items-center">
					<button
						onClick={onClose}
						className="mr-2 text-ink-light hover:text-accent transition-colors"
					>
						<ArrowLeft size={24} />
					</button>
					<PlayerAvatar
						dna={player.dna}
						size={56}
						className="border-2 border-accent shadow-md"
					/>
					<div>
						<h2 className="text-xl font-serif font-bold text-accent leading-tight">
							{player.firstName} {player.lastName}
						</h2>
						<div className="flex items-center gap-2 mt-1">
							<span
								className={`px-2 py-0.5 rounded text-xs font-bold border ${getPositionColor(player.position)}`}
							>
								{player.position}{" "}
								{player.position !== "GK" && `(${player.side || "C"})`}
							</span>
							<span className="text-sm text-ink-light">{player.age} ans</span>
						</div>
					</div>
				</div>
				<div className="text-right">
					<div className="text-3xl font-bold text-ink">{player.skill}</div>
					<div className="text-[10px] text-ink-light uppercase tracking-widest">
						Niveau
					</div>
				</div>
			</div>

			{/* Main Body */}
			<div className="p-4 space-y-4 flex-1 overflow-y-auto pb-24">
				{/* Quick Stats */}
				<div className="grid grid-cols-2 gap-3 text-sm bg-white p-3 rounded border border-gray-200 shadow-sm">
					<div>
						<span className="block text-[10px] text-ink-light uppercase font-bold">
							{t("player_card.value")}
						</span>
						<span className="font-bold text-ink">M {player.marketValue}</span>
					</div>
					<div className="text-right">
						<span className="block text-[10px] text-ink-light uppercase font-bold">
							{t("player_card.condition")}
						</span>
						<span
							className={`font-bold ${player.condition < 80 ? "text-red-600" : "text-green-700"}`}
						>
							{player.condition}%
						</span>
					</div>
				</div>

				{/* New Stats Structure */}
				<div className="space-y-4">
					{/* Phase & Structure */}
					<div>
						<h3 className="text-[10px] font-bold text-accent uppercase tracking-wider mb-2 border-b border-accent/20 pb-0.5 flex justify-between">
							<span>{t("player_card.phase")}</span>
							<TrendingUp size={10} />
						</h3>
						<StatBar
							label={t("player_card.stamina")}
							value={player.stats.stamina}
						/>
						<StatBar
							label={t("player_card.playmaking")}
							value={player.stats.playmaking}
						/>
						<StatBar
							label={t("player_card.defense")}
							value={player.stats.defense}
						/>
					</div>

					{/* Specialties */}
					<div>
						<h3 className="text-[10px] font-bold text-accent uppercase tracking-wider mb-2 border-b border-accent/20 pb-0.5">
							{t("player_card.specialty")}
						</h3>
						<StatBar
							label={t("player_card.speed")}
							value={player.stats.speed}
						/>
						<StatBar
							label={t("player_card.head")}
							value={player.stats.head}
						/>
						<StatBar
							label={t("player_card.technique")}
							value={player.stats.technique}
						/>
					</div>

					{/* Conversion */}
					<div>
						<h3 className="text-[10px] font-bold text-accent uppercase tracking-wider mb-2 border-b border-accent/20 pb-0.5">
							{t("player_card.conversion")}
						</h3>
						<StatBar
							label={t("player_card.scoring")}
							value={player.stats.scoring}
						/>
						<StatBar
							label={t("player_card.setPieces")}
							value={player.stats.setPieces}
						/>
					</div>
				</div>
			</div>

			{/* Actions */}
			{isUserPlayer && (
				<div className="p-4 bg-paper-dark border-t border-gray-300">
					<button
						onClick={() => setShowConfirmSell(true)}
						className="w-full py-2.5 bg-red-50 text-red-600 border border-red-200 rounded text-xs font-bold flex items-center justify-center gap-2 hover:bg-red-100 transition-colors"
					>
						<Trash2 size={14} /> VENDRE (M {sellValue})
					</button>
				</div>
			)}

			{/* Confirmation Vente */}
			{showConfirmSell && (
				<div className="absolute inset-0 bg-white/95 flex flex-col items-center justify-center p-6 text-center animate-fade-in z-20">
					<AlertCircle size={48} className="text-red-500 mb-4" />
					<h4 className="font-serif font-bold text-xl mb-2">
						Vendre le joueur ?
					</h4>
					<p className="text-sm text-ink-light mb-6 leading-relaxed">
						Un club nous propose <span className="font-bold text-accent">{sellValue} M</span> pour acheter <span className="font-bold">{player.firstName} {player.lastName}</span>.
					</p>
					<div className="flex gap-3 w-full">
						<Button
							onClick={() => setShowConfirmSell(false)}
							variant="secondary"
							className="flex-1"
						>
							Annuler
						</Button>
						<Button
							onClick={handleSell}
							variant="primary"
							className="flex-1 !bg-red-600 !border-red-800"
						>
							Confirmer
						</Button>
					</div>
				</div>
			)}
		</div>
	);
}
