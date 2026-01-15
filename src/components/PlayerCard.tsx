import type { Player } from "@/db/db";
import { TransferService } from "@/services/transfer-service";
import { useGameStore } from "@/store/gameSlice";
import { AlertCircle, ArrowLeft, Trash2, TrendingUp, User, Star, Award, TrendingDown, Minus } from "lucide-preact";
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
			case "GK": return "bg-yellow-100 text-yellow-800 border-yellow-300";
			case "DEF": return "bg-blue-100 text-blue-800 border-blue-300";
			case "MID": return "bg-green-100 text-green-800 border-green-300";
			case "FWD": return "bg-red-100 text-red-800 border-red-300";
			default: return "bg-gray-100";
		}
	};

	const getFormLabel = (form: number) => {
		const f = Math.floor(form);
		if (f >= 8) return "Incroyable";
		if (f >= 7) return "Excellent";
		if (f >= 6) return "Très Bon";
		if (f >= 5) return "Bon";
		if (f >= 4) return "Passable";
		if (f >= 3) return "Médiocre";
		if (f >= 2) return "Faible";
		return "Désastreux";
	};

	const FormTrend = ({ form, background }: { form: number, background: number }) => {
		const diff = background - form;
		if (diff > 0.5) return <TrendingUp size={16} className="text-green-500" />;
		if (diff < -0.5) return <TrendingDown size={16} className="text-red-500" />;
		return <Minus size={16} className="text-gray-400" />;
	};

	const RatingBadge = ({ rating }: { rating: number }) => {
		const getColor = (r: number) => {
			if (r >= 9) return "bg-lime-400 text-black";
			if (r >= 7) return "bg-green-500 text-white";
			if (r >= 5) return "bg-yellow-500 text-white";
			if (r >= 4) return "bg-orange-500 text-white";
			return "bg-red-600 text-white";
		};

		return (
			<span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold shadow-sm ${getColor(rating)}`}>
				{rating.toFixed(1)}
			</span>
		);
	};

	const StatBar = ({ label, value }: { label: string; value: number }) => {
		const displayValue = Math.floor(value);
		const progressPercentage = (value / 10) * 100;
		
		return (
			<div className="flex items-center mb-1.5">
				<span className="w-20 text-ink-light truncate font-bold uppercase tracking-tighter text-[9px]">
					{label}
				</span>
				<div className="flex-1 h-2 bg-gray-100 rounded-sm overflow-hidden border border-gray-200">
					<div
						className={`h-full transition-all duration-500 ${value > 8 ? "bg-green-500" : value > 6 ? "bg-accent" : value > 4 ? "bg-orange-400" : "bg-red-500"}`}
						style={{ width: `${Math.min(100, Math.max(0, progressPercentage))}%` }}
					/>
				</div>
				<span className="w-6 text-right font-mono font-bold text-ink ml-1.5 text-[10px]">
					{displayValue}
				</span>
			</div>
		);
	};

	const lastRating = player.lastRatings && player.lastRatings.length > 0 ? player.lastRatings[0] : null;

	return (
		<div
			className="fixed inset-x-0 bottom-0 z-[200] bg-white flex flex-col max-w-md mx-auto rounded-t-3xl shadow-2xl overflow-hidden animate-slide-up h-[90vh]"
			onClick={(e) => e.stopPropagation()}
		>
			{/* Pull bar for drawer feel */}
			<div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto my-3 shrink-0" />

			{/* Unified Header */}
			<div className="bg-white px-4 pb-4 border-b flex justify-between items-center sticky top-0 z-10 shrink-0">
				<div className="flex gap-4 items-center">
					<button
						onClick={onClose}
						className="text-ink-light hover:text-accent p-1 transition-colors"
					>
						<ArrowLeft size={24} />
					</button>
					<PlayerAvatar
						dna={player.dna}
						size={56}
						className="border-2 border-accent shadow-sm"
					/>
					<div>
						<h2 className="text-xl font-serif font-bold text-accent leading-tight">
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
				<div className="text-right flex flex-col items-end">
					<div className="text-2xl font-black text-ink">{Math.floor(player.skill)}</div>
					<div className="text-[8px] text-ink-light uppercase tracking-widest font-black">
						Niveau
					</div>
					{lastRating && (
						<div className="mt-1 flex items-center gap-1">
							<span className="text-[8px] text-ink-light uppercase font-bold">Dernier Match:</span>
							<RatingBadge rating={lastRating} />
						</div>
					)}
				</div>
			</div>

			{/* Unified Body */}
			<div className="p-5 space-y-6 flex-1 overflow-y-auto">
				<div className="grid grid-cols-2 gap-3">
					<div className="bg-paper-dark p-3 rounded-2xl border border-gray-200">
						<span className="block text-[8px] text-ink-light uppercase font-black tracking-widest">
							{t("player_card.value")}
						</span>
						<span className="text-lg font-bold text-ink">M {player.marketValue}</span>
					</div>
					<div className="bg-paper-dark p-3 rounded-2xl border border-gray-200">
						<span className="block text-[8px] text-ink-light uppercase font-black tracking-widest">
							{t("player_card.condition")}
						</span>
						<span
							className={`text-lg font-bold ${player.condition < 80 ? "text-red-600" : "text-green-700"}`}
						>
							{player.condition}%
						</span>
					</div>
					<div className="bg-paper-dark p-3 rounded-2xl border border-gray-200 flex items-center justify-between">
						<div>
							<span className="block text-[8px] text-ink-light uppercase font-black tracking-widest">
								Forme
							</span>
							<div className="flex items-center gap-2">
								<span className="text-sm font-bold text-ink">{getFormLabel(player.form)}</span>
								<FormTrend form={player.form} background={player.formBackground} />
							</div>
						</div>
						<Star size={20} className="text-yellow-500 opacity-50" />
					</div>
					<div className="bg-paper-dark p-3 rounded-2xl border border-gray-200 flex items-center justify-between">
						<div>
							<span className="block text-[8px] text-ink-light uppercase font-black tracking-widest">
								Expérience
							</span>
							<span className="text-lg font-bold text-ink">{Math.floor(player.experience)}/10</span>
						</div>
						<Award size={20} className="text-blue-500 opacity-50" />
					</div>
				</div>

				{/* Historique des notes */}
				{player.lastRatings && player.lastRatings.length > 0 && (
					<div className="bg-paper-dark p-4 rounded-2xl border border-gray-200">
						<span className="block text-[8px] text-ink-light uppercase font-black tracking-widest mb-3">Historique des Performances</span>
						<div className="flex gap-2">
							{player.lastRatings.map((r, i) => (
								<RatingBadge key={i} rating={r} />
							))}
						</div>
					</div>
				)}

				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
						<h3 className="text-[10px] font-black text-accent uppercase tracking-widest mb-3 border-b border-accent/10 pb-1 flex justify-between">
							<span>{t("player_card.phase")}</span>
							<TrendingUp size={12} />
						</h3>
						<StatBar label={t("player_card.stamina")} value={player.stats.stamina} />
						<StatBar label={t("player_card.playmaking")} value={player.stats.playmaking} />
						<StatBar label={t("player_card.defense")} value={player.stats.defense} />
					</div>

					<div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
						<h3 className="text-[10px] font-black text-accent uppercase tracking-widest mb-3 border-b border-accent/10 pb-1">
							{t("player_card.specialty")}
						</h3>
						<StatBar label={t("player_card.speed")} value={player.stats.speed} />
						<StatBar label={t("player_card.head")} value={player.stats.head} />
						<StatBar label={t("player_card.technique")} value={player.stats.technique} />
					</div>

					<div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm md:col-span-2">
						<h3 className="text-[10px] font-black text-accent uppercase tracking-widest mb-3 border-b border-accent/10 pb-1">
							{t("player_card.conversion")}
						</h3>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
							<StatBar label={t("player_card.scoring")} value={player.stats.scoring} />
							<StatBar label={t("player_card.setPieces")} value={player.stats.setPieces} />
						</div>
					</div>
				</div>
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

			{/* Confirmation Overlay */}
			{showConfirmSell && (
				<div className="absolute inset-0 bg-white/95 flex flex-col items-center justify-center p-8 text-center animate-fade-in z-[210]">
					<div className="p-4 bg-red-100 rounded-full text-red-500 mb-4">
						<AlertCircle size={48} />
					</div>
					<h4 className="font-serif font-bold text-2xl mb-2 text-ink">
						Vendre le joueur ?
					</h4>
					<p className="text-sm text-ink-light mb-8 leading-relaxed max-w-[280px]">
						Confirmez-vous la vente de <span className="font-bold text-ink">{player.firstName} {player.lastName}</span> pour <span className="font-bold text-accent">M {sellValue}</span> ?
					</p>
					<div className="flex flex-col gap-3 w-full max-w-[280px]">
						<button
							onClick={handleSell}
							className="w-full py-4 bg-red-600 text-white rounded-xl font-bold uppercase text-xs tracking-widest shadow-lg active:scale-95 transition-transform"
						>
							Confirmer la vente
						</button>
						<button
							onClick={() => setShowConfirmSell(false)}
							className="w-full py-4 bg-paper-dark text-ink-light rounded-xl font-bold uppercase text-xs tracking-widest"
						>
							Annuler
						</button>
					</div>
				</div>
			)}
		</div>
	);
}
