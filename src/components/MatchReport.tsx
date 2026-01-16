import { db, type Match, type Player, type Team } from "@/db/db";
import { useEffect, useState } from "preact/hooks";
import { useTranslation } from "react-i18next";
import { TrendingUp, Shield, Repeat, Activity, Target, Copy, Zap } from "lucide-preact";

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
			const allPlayers = await db.players.where("teamId").anyOf(teamIds).toArray();
			setPlayers(allPlayers.reduce((acc, p) => ({ ...acc, [p.id!]: p }), {}));
		};
		loadPlayers();
	}, [match]);

	if (!details) {
		return (
			<div className="fixed inset-0 z-[500] flex items-center justify-center bg-gray-900/40 p-4 backdrop-blur-sm" onClick={onClose}>
				<div className="bg-white p-8 rounded-3xl shadow-2xl text-center max-w-sm">
					<div className="text-4xl mb-4">📊</div>
					<h2 className="text-xl font-black text-ink mb-2">Rapport Indisponible</h2>
					<p className="text-ink-light text-sm mb-6">Les données détaillées de ce match n'ont pas pu être récupérées.</p>
					<button onClick={onClose} className="w-full py-3 bg-accent text-white rounded-xl font-black uppercase text-xs tracking-widest">Fermer</button>
				</div>
			</div>
		);
	}

	const stats = details.stats || {};
	const homeXG = stats.homeXG || 0;
	const awayXG = stats.awayXG || 0;
	const homePossession = details.homePossession || 50;
	const awayPossession = 100 - homePossession;

	const handleCopyLogs = async () => {
		const logData = { matchInfo: match, stats: details.stats, events: details.events };
		try {
			await navigator.clipboard.writeText(JSON.stringify(logData, null, 2));
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		} catch (e) {}
	};

	const RatingBadge = ({ rating }: { rating: number }) => {
		const r = isNaN(rating) ? 0 : rating;
		const getColor = (val: number) => {
			if (val >= 8.5) return "bg-lime-400 text-black";
			if (val >= 7.0) return "bg-green-500 text-white";
			if (val >= 6.0) return "bg-yellow-500 text-white";
			if (val >= 5.0) return "bg-orange-500 text-white";
			return "bg-red-600 text-white";
		};
		return <div className={`px-2 py-1 rounded-lg text-xs font-mono font-bold shadow-sm ${getColor(r)}`}>{r > 0 ? r.toFixed(1) : "-"}</div>;
	};

	const PlayerPerfRow = ({ playerId, rating }: { playerId: string, rating: number }) => {
		const player = players[parseInt(playerId)];
		const pStats = details.playerStats?.[playerId] || {};
		if (!player) return null;
		return (
			<div className="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0">
				<div className="flex flex-col min-w-0">
					<div className="flex items-center gap-2">
						<span className="text-[10px] font-black text-ink-light w-6 opacity-50">{player.position}</span>
						<span className="text-sm font-bold text-ink truncate max-w-[120px]">{player.lastName}</span>
					</div>
					{(pStats.goals > 0 || pStats.assists > 0) && (
						<div className="flex gap-1 mt-1 ml-8">
							{[...Array(pStats.goals || 0)].map((_, i) => <span key={i} className="text-xs">⚽</span>)}
							{[...Array(pStats.assists || 0)].map((_, i) => <span key={i} className="text-xs">👟</span>)}
						</div>
					)}
				</div>
				<div className="flex items-center gap-3 shrink-0">
					<RatingBadge rating={rating} />
				</div>
			</div>
		);
	};

	return (
		<div className="fixed inset-0 z-[500] flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-md animate-fade-in" onClick={onClose}>
			<div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-gray-200" onClick={(e) => e.stopPropagation()}>
				
				<div className="bg-paper-dark p-8 border-b border-gray-200 shrink-0 relative overflow-hidden">
					<div className="flex justify-between items-center mb-8 text-xs font-black uppercase tracking-[0.2em] text-ink-light relative z-10">
						<span className="flex items-center gap-2"><TrendingUp size={16} /> Rapport de Match</span>
						<button onClick={handleCopyLogs} className="bg-white border border-gray-200 px-4 py-1.5 rounded-full shadow-sm hover:bg-gray-50 transition-all text-[10px]">
							{copied ? "COPIÉ !" : "EXPORT JSON"}
						</button>
					</div>
					<div className="flex items-center justify-between relative z-10">
						<div className="flex-1 text-center px-2">
							<div className="font-serif font-black text-xl leading-tight uppercase text-ink mb-1">{homeTeam?.name || "Domicile"}</div>
							<div className="text-[10px] text-ink-light font-bold">DOMICILE</div>
						</div>
						<div className="flex flex-col items-center px-4">
							<div className="text-6xl font-black font-mono tracking-tighter mb-2 text-ink">{match.homeScore} - {match.awayScore}</div>
							<div className="px-4 py-1.5 bg-accent text-white text-[11px] font-black rounded-full shadow-lg shadow-accent/20">MATCH TERMINÉ</div>
						</div>
						<div className="flex-1 text-center px-2">
							<div className="font-serif font-black text-xl leading-tight uppercase text-ink mb-1">{awayTeam?.name || "Extérieur"}</div>
							<div className="text-[10px] text-ink-light font-bold">EXTÉRIEUR</div>
						</div>
					</div>
				</div>

				<div className="flex-1 overflow-y-auto bg-white scrollbar-hide">
					<div className="p-8 space-y-10">
						{/* Statistiques Détaillées */}
						<div className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-xl shadow-gray-100/50">
							<h3 className="text-xs font-black text-accent uppercase tracking-[0.25em] mb-8 flex items-center gap-3">
								<Zap size={18} fill="currentColor" /> Statistiques Clés
							</h3>
							<div className="space-y-7">
								<StatRow label="Possession" h={`${homePossession}%`} a={`${awayPossession}%`} hVal={homePossession} aVal={awayPossession} />
								<StatRow label="Expected Goals (xG)" h={homeXG.toFixed(2)} a={awayXG.toFixed(2)} hVal={homeXG} aVal={awayXG} />
								<StatRow label="Tirs Totaux" h={stats.homeShots || 0} a={stats.awayShots || 0} hVal={stats.homeShots} aVal={stats.awayShots} />
								<StatRow label="Tirs Cadrés" h={stats.homeShotsOnTarget || 0} a={stats.awayShotsOnTarget || 0} hVal={stats.homeShotsOnTarget} aVal={stats.awayShotsOnTarget} />
								<StatRow label="Passes réussies" h={stats.homePasses || 0} a={stats.awayPasses || 0} hVal={stats.homePasses} aVal={stats.awayPasses} />
								<StatRow label="Duels Gagnés" h={stats.homeDuelsWon || 0} a={stats.awayDuelsWon || 0} hVal={stats.homeDuelsWon} aVal={stats.awayDuelsWon} />
								<StatRow label="Interventions" h={stats.homeDefensiveActions || 0} a={stats.awayDefensiveActions || 0} hVal={stats.homeDefensiveActions} aVal={stats.awayDefensiveActions} />
								<StatRow label="Pressing (PPDA)" h={stats.homePPDA || 0} a={stats.awayPPDA || 0} hVal={stats.awayPPDA} aVal={stats.homePPDA} invert />
								<StatRow label="Distance (km)" h={(stats.homeDistance || 0).toFixed(1)} a={(stats.awayDistance || 0).toFixed(1)} hVal={stats.homeDistance} aVal={stats.awayDistance} />
							</div>
						</div>

						{/* Notes des Joueurs */}
						<div className="grid grid-cols-2 gap-10">
							<div>
								<h3 className="text-[10px] font-black text-accent uppercase mb-5 border-b-2 border-accent/10 pb-2 tracking-widest">Notes {homeTeam?.name || "Home"}</h3>
								<div className="space-y-0.5">
									{Object.entries(details.playerPerformances || {})
										.filter(([id]) => players[parseInt(id)]?.teamId === match.homeTeamId)
										.sort((a, b) => b[1] - a[1])
										.map(([id, rating]) => <PlayerPerfRow key={id} playerId={id} rating={rating as number} />)}
								</div>
							</div>
							<div>
								<h3 className="text-[10px] font-black text-ink uppercase mb-5 border-b-2 border-gray-100 pb-2 text-right tracking-widest">Notes {awayTeam?.name || "Away"}</h3>
								<div className="space-y-0.5">
									{Object.entries(details.playerPerformances || {})
										.filter(([id]) => players[parseInt(id)]?.teamId === match.awayTeamId)
										.sort((a, b) => b[1] - a[1])
										.map(([id, rating]) => <PlayerPerfRow key={id} playerId={id} rating={rating as number} />)}
								</div>
							</div>
						</div>
					</div>
				</div>

				<div className="p-8 bg-paper-dark border-t border-gray-200 shrink-0">
					<button onClick={onClose} className="w-full py-5 bg-ink text-white rounded-2xl font-black uppercase text-xs tracking-[0.4em] shadow-xl hover:bg-black active:scale-[0.98] transition-all">
						CONTINUER LA JOURNÉE
					</button>
				</div>
			</div>
		</div>
	);
}

function StatRow({ label, h, a, hVal, aVal, invert = false }: { label: string, h: string | number, a: string | number, hVal?: number, aVal?: number, invert?: boolean }) {
	const valH = Number(hVal) || 0;
	const valA = Number(aVal) || 0;
	const total = valH + valA || 1;
	
	let hPerc = (valH / total) * 100;
	if (invert) hPerc = 100 - hPerc;

	return (
		<div className="flex flex-col gap-2.5">
			<div className="flex justify-between items-end px-1">
				<span className="text-sm font-black text-ink w-20">{h}</span>
				<span className="text-[11px] text-ink-light font-bold uppercase tracking-wider mb-0.5">{label}</span>
				<span className="text-sm font-black text-ink w-20 text-right">{a}</span>
			</div>
			<div className="flex h-2.5 w-full bg-gray-100 rounded-full overflow-hidden">
				<div 
					className="bg-accent h-full transition-all duration-700 ease-out" 
					style={{ width: `${hPerc}%` }} 
				/>
				<div className="flex-1 bg-gray-200 h-full" />
			</div>
		</div>
	);
}
