import { db, type Match, type Player, type Team } from "@/db/db";
import { useEffect, useState } from "preact/hooks";
import { useTranslation } from "react-i18next";
import { Star, StarHalf } from "lucide-preact";

interface MatchReportProps {
	match: Match;
	homeTeam?: Team;
	awayTeam?: Team;
	onClose: () => void;
}

export default function MatchReport({
	match,
	homeTeam,
	awayTeam,
	onClose,
}: MatchReportProps) {
	const { t } = useTranslation();
	const [copied, setCopied] = useState(false);
	const [players, setPlayers] = useState<Record<number, Player>>({});
	const details = match.details;

	useEffect(() => {
		const loadPlayers = async () => {
			const teamIds = [];
			if (match.homeTeamId) teamIds.push(match.homeTeamId);
			if (match.awayTeamId) teamIds.push(match.awayTeamId);
			
			if (teamIds.length === 0) return;

			const allPlayers = await db.players
				.where("teamId")
				.anyOf(teamIds)
				.toArray();
			const playerMap = allPlayers.reduce((acc, p) => {
				acc[p.id!] = p;
				return acc;
			}, {} as Record<number, Player>);
			setPlayers(playerMap);
		};
		loadPlayers();
	}, [match]);

	if (!details) return null;

	const handleCopyLogs = async () => {
		const logData = {
			matchInfo: {
				id: match.id,
				date: match.date,
				home: homeTeam?.name || "Home",
				away: awayTeam?.name || "Away",
				score: `${match.homeScore}-${match.awayScore}`,
				possession: `${details.homePossession}% / ${100 - details.homePossession}%`,
				ratings: {
					homeChances: details.stats.homeChances,
					awayChances: details.stats.awayChances,
				}
			},
			playerRatings: details.playerPerformances,
			events: details.events.map((e) => ({
				minute: e.minute,
				type: e.type,
				team: e.teamId === match.homeTeamId ? "Home" : "Away",
				scorer: e.scorerName,
				desc: e.description,
			})),
		};

		const text = JSON.stringify(logData, null, 2);
		let success = false;

		try {
			const textArea = document.createElement("textarea");
			textArea.value = text;
			textArea.style.position = "fixed";
			textArea.style.left = "-9999px";
			textArea.style.top = "0";
			document.body.appendChild(textArea);
			textArea.focus();
			textArea.select();
			success = document.execCommand("copy");
			document.body.removeChild(textArea);
		} catch (e) {
			console.warn("execCommand failed", e);
		}

		if (!success) {
			try {
				await navigator.clipboard.writeText(text);
				success = true;
			} catch (err) {
				console.error("Clipboard API failed", err);
			}
		}

		if (success) {
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		}
	};

	const RatingBadge = ({ rating }: { rating: number }) => {
		const r = isNaN(rating) ? 0 : rating;
		const getColor = (val: number) => {
			if (val >= 9) return "bg-lime-400 text-black";
			if (val >= 7) return "bg-green-500 text-white";
			if (val >= 5) return "bg-yellow-500 text-white";
			if (val >= 4) return "bg-orange-500 text-white";
			return "bg-red-600 text-white";
		};

		return (
			<div className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold shadow-sm ${getColor(r)}`}>
				{r > 0 ? r.toFixed(1) : "-"}
			</div>
		);
	};

	const StarRating = ({ rating }: { rating: number }) => {
		if (isNaN(rating) || rating <= 0) return null;
		
		const fullStars = Math.max(0, Math.floor(rating / 2));
		const hasHalfStar = (rating % 2) >= 1;
		
		return (
			<div className="flex items-center text-yellow-500">
				{[...Array(fullStars)].map((_, i) => (
					<Star key={i} size={10} fill="currentColor" />
				))}
				{hasHalfStar && <StarHalf size={10} fill="currentColor" />}
			</div>
		);
	};

	const PlayerPerfRow = ({ playerId, rating }: { playerId: string, rating: number }) => {
		const player = players[parseInt(playerId)];
		if (!player) return null;

		return (
			<div className="flex items-center justify-between py-1 border-b border-gray-100 last:border-0">
				<div className="flex items-center gap-2">
					<span className="text-[10px] font-bold text-ink w-4 text-center opacity-50">{player.position}</span>
					<span className="text-xs font-bold text-ink truncate max-w-[100px]">{player.lastName}</span>
				</div>
				<div className="flex items-center gap-2">
					<StarRating rating={rating} />
					<RatingBadge rating={rating} />
				</div>
			</div>
		);
	};

	return (
		<div
			className="fixed inset-0 z-[500] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in"
			onClick={onClose}
		>
			<div
				className="bg-paper w-full max-w-md rounded-lg shadow-2xl border-4 border-paper-dark overflow-hidden flex flex-col max-h-[90vh]"
				onClick={(e) => e.stopPropagation()}
			>
				{/* Header Score */}
				<div className="bg-paper-dark p-4 border-b border-gray-300 shrink-0">
					<div className="flex justify-between items-center mb-2 text-xs font-mono text-ink-light uppercase">
						<span>{t("game.date_format", { date: match.date })}</span>
						<button
							onClick={handleCopyLogs}
							className="text-[9px] bg-white/50 hover:bg-white px-2 py-0.5 rounded border border-gray-300 transition-colors"
						>
							{copied ? "Copied!" : "Debug Logs"}
						</button>
					</div>

					<div className="flex items-center justify-between">
						<div className="flex-1 text-center">
							<div className="font-serif font-bold text-base leading-tight text-ink">
								{homeTeam?.name || "Home"}
							</div>
						</div>

						<div className="px-4 py-2 bg-white rounded border border-gray-300 font-mono font-bold text-2xl mx-2 shadow-inner">
							{match.homeScore} - {match.awayScore}
						</div>

						<div className="flex-1 text-center">
							<div className="font-serif font-bold text-base leading-tight text-ink">
								{awayTeam?.name || "Away"}
							</div>
						</div>
					</div>
				</div>

				{/* Body */}
				<div className="flex-1 overflow-y-auto">
					<div className="p-4 space-y-6">
						{/* Performances Individuelles */}
						<div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
							<h3 className="text-[10px] font-black text-accent uppercase tracking-widest mb-3 border-b border-accent/10 pb-1 flex justify-between">
								<span>Notes des Joueurs</span>
								<Star size={12} />
							</h3>
							
							<div className="grid grid-cols-2 gap-x-6">
								<div>
									<h4 className="text-[9px] font-bold text-ink-light uppercase mb-2">Home</h4>
									{Object.entries(details.playerPerformances || {})
										.filter(([id]) => players[parseInt(id)]?.teamId === match.homeTeamId)
										.map(([id, rating]) => (
											<PlayerPerfRow key={id} playerId={id} rating={rating} />
										))}
								</div>
								<div>
									<h4 className="text-[9px] font-bold text-ink-light uppercase mb-2 text-right">Away</h4>
									{Object.entries(details.playerPerformances || {})
										.filter(([id]) => players[parseInt(id)]?.teamId === match.awayTeamId)
										.map(([id, rating]) => (
											<PlayerPerfRow key={id} playerId={id} rating={rating} />
										))}
								</div>
							</div>
						</div>

						{/* Stats Match */}
						<div className="grid grid-cols-2 gap-4">
							<div className="bg-paper-dark p-3 rounded-xl border border-gray-200">
								<span className="block text-[8px] text-ink-light uppercase font-black tracking-widest text-center mb-1">Possession</span>
								<div className="flex items-center gap-2">
									<span className="text-xs font-bold text-accent">{details.homePossession}%</span>
									<div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden flex">
										<div className="bg-accent h-full" style={{ width: `${details.homePossession}%` }} />
									</div>
									<span className="text-xs font-bold text-gray-500">{100 - details.homePossession}%</span>
								</div>
							</div>
							<div className="bg-paper-dark p-3 rounded-xl border border-gray-200">
								<span className="block text-[8px] text-ink-light uppercase font-black tracking-widest text-center mb-1">Chances</span>
								<div className="flex justify-around items-baseline">
									<span className="text-lg font-black text-accent">{details.stats.homeChances}</span>
									<span className="text-xs text-gray-300 font-bold">vs</span>
									<span className="text-lg font-black text-gray-500">{details.stats.awayChances}</span>
								</div>
							</div>
						</div>

						{/* Timeline */}
						<div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
							<h3 className="text-[10px] font-black text-accent uppercase tracking-widest mb-3 border-b border-accent/10 pb-1">Chronologie</h3>
							<div className="space-y-3">
								{details.events.map((event, idx) => (
									<div key={idx} className={`flex gap-3 text-sm ${event.teamId === match.homeTeamId ? "flex-row" : "flex-row-reverse text-right"}`}>
										<div className="font-mono font-bold text-accent text-[10px] bg-paper-dark px-1.5 py-0.5 rounded border border-gray-200 h-fit">{event.minute}'</div>
										<div className="flex-1">
											<div className={`font-bold text-ink text-xs ${event.teamId === match.homeTeamId ? "text-left" : "text-right"}`}>
												{event.type === "GOAL" && "⚽ BUT !"}
												{event.type === "MISS" && "❌ Manqué"}
												{event.description}
											</div>
										</div>
									</div>
								))}
							</div>
						</div>
					</div>
				</div>

				{/* Footer */}
				<div className="p-4 bg-paper-dark border-t border-gray-200 shrink-0">
					<button
						onClick={onClose}
						className="w-full py-3 bg-accent text-white rounded-xl font-bold uppercase text-xs tracking-widest shadow-lg active:scale-95 transition-transform"
					>
						Continuer
					</button>
				</div>
			</div>
		</div>
	);
}
