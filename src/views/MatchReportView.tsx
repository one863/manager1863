import EventItem from "@/components/Match/EventItem";
import Scoreboard from "@/components/Match/Scoreboard";
import { type Match, type Team, type Player, db } from "@/db/db";
import { useSignal } from "@preact/signals";
import { ArrowLeft, Check, Copy, Download, Star } from "lucide-preact";
import { useEffect, useState } from "preact/hooks";
import { useTranslation } from "react-i18next";

interface MatchReportViewProps {
	matchId: number;
	onBack: () => void;
}

interface Scorer {
	name: string;
	minute: number;
}

export default function MatchReportView({
	matchId,
	onBack,
}: MatchReportViewProps) {
	const { t } = useTranslation();
	const [match, setMatch] = useState<Match | null>(null);
	const [homeTeam, setHomeTeam] = useState<Team | null>(null);
	const [awayTeam, setAwayTeam] = useState<Team | null>(null);
	const [players, setPlayers] = useState<Record<number, Player>>({});
	const [isLoading, setIsLoading] = useState(true);
	const [copyFeedback, setCopyFeedback] = useState(false);

	// Signaux pour Scoreboard
	const homeScore = useSignal(0);
	const awayScore = useSignal(0);
	const homeScorers = useSignal<Scorer[]>([]);
	const awayScorers = useSignal<Scorer[]>([]);
	const homeChances = useSignal(0);
	const awayChances = useSignal(0);

	useEffect(() => {
		const loadData = async () => {
			const matchData = await db.matches.get(matchId);
			if (!matchData || !matchData.details) return;

			const [hTeam, aTeam, allPlayers] = await Promise.all([
				db.teams.get(matchData.homeTeamId),
				db.teams.get(matchData.awayTeamId),
				db.players.where("teamId").anyOf([matchData.homeTeamId, matchData.awayTeamId]).toArray()
			]);

			setMatch(matchData);
			setHomeTeam(hTeam || null);
			setAwayTeam(aTeam || null);
			
			const pMap = allPlayers.reduce((acc, p) => {
				acc[p.id!] = p;
				return acc;
			}, {} as Record<number, Player>);
			setPlayers(pMap);

			homeScore.value = matchData.homeScore;
			awayScore.value = matchData.awayScore;
			homeChances.value = matchData.details.stats.homeChances;
			awayChances.value = matchData.details.stats.awayChances;

			const hScorers: Scorer[] = [];
			const aScorers: Scorer[] = [];
			matchData.details.events.forEach((e) => {
				if (e.type === "GOAL") {
					if (e.teamId === matchData.homeTeamId)
						hScorers.push({ name: e.scorerName || "???", minute: e.minute });
					else aScorers.push({ name: e.scorerName || "???", minute: e.minute });
				}
			});
			homeScorers.value = hScorers;
			awayScorers.value = aScorers;

			setIsLoading(false);
		};
		loadData();
	}, [matchId]);

	const RatingBadge = ({ rating }: { rating: number }) => {
		const getColor = (r: number) => {
			if (r >= 9) return "bg-lime-400 text-black";
			if (r >= 7) return "bg-green-500 text-white";
			if (r >= 5) return "bg-yellow-500 text-white";
			if (r >= 4) return "bg-orange-500 text-white";
			return "bg-red-600 text-white";
		};
		return (
			<span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${getColor(rating)}`}>
				{rating.toFixed(1)}
			</span>
		);
	};

	if (isLoading || !match || !homeTeam || !awayTeam) {
		return (
			<div className="p-8 text-center animate-pulse">{t("game.loading")}</div>
		);
	}

	const details = match.details!;

	return (
		<div className="flex flex-col h-full bg-paper font-sans relative animate-fade-in overflow-hidden">
			{/* HEADER CONTROLS */}
			<div className="absolute top-0 left-0 w-full p-3 z-50 flex justify-between pointer-events-none">
				<div className="pointer-events-auto flex gap-3">
					<button
						onClick={onBack}
						className="bg-white/80 backdrop-blur p-2 rounded-full shadow-sm text-ink-light hover:text-accent transition-colors"
					>
						<ArrowLeft size={18} />
					</button>
				</div>
			</div>

			<div className="flex-1 overflow-y-auto">
				<Scoreboard
					homeTeam={homeTeam}
					awayTeam={awayTeam}
					homeScore={homeScore}
					awayScore={awayScore}
					minute={90}
					homeScorers={homeScorers}
					awayScorers={awayScorers}
					homeChances={homeChances}
					awayChances={awayChances}
					possession={details.homePossession || 50}
					isFinished={true}
				/>

				<div className="p-4 space-y-6 max-w-md mx-auto pb-24">
					{/* NOTES DES JOUEURS (RATINGS) */}
					{details.playerPerformances && (
						<div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm">
							<h3 className="text-[10px] font-black text-accent uppercase tracking-widest mb-4 border-b border-accent/10 pb-1 flex justify-between">
								<span>Notes du match</span>
								<Star size={12} />
							</h3>
							
							<div className="grid grid-cols-2 gap-x-8">
								<div className="space-y-2">
									{Object.entries(details.playerPerformances)
										.filter(([id]) => players[parseInt(id)]?.teamId === match.homeTeamId)
										.map(([id, rating]) => (
											<div key={id} className="flex justify-between items-center text-[11px] border-b border-gray-50 pb-1">
												<span className="text-ink font-bold truncate pr-2">{players[parseInt(id)]?.lastName}</span>
												<RatingBadge rating={rating} />
											</div>
										))}
								</div>
								<div className="space-y-2">
									{Object.entries(details.playerPerformances)
										.filter(([id]) => players[parseInt(id)]?.teamId === match.awayTeamId)
										.map(([id, rating]) => (
											<div key={id} className="flex justify-between items-center text-[11px] border-b border-gray-50 pb-1 flex-row-reverse">
												<span className="text-ink font-bold truncate pl-2">{players[parseInt(id)]?.lastName}</span>
												<RatingBadge rating={rating} />
											</div>
										))}
								</div>
							</div>
						</div>
					)}

					{/* CHRONOLOGIE */}
					<div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm">
						<h3 className="text-[10px] font-black text-accent uppercase tracking-widest mb-4 border-b border-accent/10 pb-1">
							Événements marquants
						</h3>
						<div className="space-y-4">
							{details.events.map((event, idx) => (
								<EventItem key={idx} event={event} homeTeamId={homeTeam.id!} />
							))}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
