import EventItem from "@/components/Match/EventItem";
import Scoreboard from "@/components/Match/Scoreboard";
import { type Match, type Team, db } from "@/db/db";
import { useSignal } from "@preact/signals";
import { ArrowLeft, Check, Copy, Download } from "lucide-preact";
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
	const [isLoading, setIsLoading] = useState(true);
	const [copyFeedback, setCopyFeedback] = useState(false);

	// Signaux pour Scoreboard (pour compatibilité d'interface)
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

			const [hTeam, aTeam] = await Promise.all([
				db.teams.get(matchData.homeTeamId),
				db.teams.get(matchData.awayTeamId),
			]);

			setMatch(matchData);
			setHomeTeam(hTeam || null);
			setAwayTeam(aTeam || null);

			// Calculer les stats pour le scoreboard
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

	const downloadLogs = () => {
		if (!match || !homeTeam || !awayTeam) return;
		const logs = {
			matchInfo: {
				home: homeTeam.name,
				away: awayTeam.name,
				score: `${match.homeScore}-${match.awayScore}`,
				possession: `${match.details?.homePossession}% / ${100 - (match.details?.homePossession || 50)}%`,
			},
			events: match.details?.events,
		};
		const blob = new Blob([JSON.stringify(logs, null, 2)], {
			type: "application/json",
		});
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `match_report_${homeTeam.name}_vs_${awayTeam.name}.json`;
		a.click();
	};

	const copyLogs = async () => {
		if (!match || !homeTeam || !awayTeam) return;
		const logs = {
			matchInfo: {
				home: homeTeam.name,
				away: awayTeam.name,
				score: `${match.homeScore}-${match.awayScore}`,
				possession: `${match.details?.homePossession}% / ${100 - (match.details?.homePossession || 50)}%`,
			},
			events: match.details?.events,
		};
		const text = JSON.stringify(logs, null, 2);

		try {
			const textArea = document.createElement("textarea");
			textArea.value = text;
			textArea.style.position = "fixed";
			textArea.style.left = "-9999px";
			document.body.appendChild(textArea);
			textArea.focus();
			textArea.select();
			const success = document.execCommand("copy");
			document.body.removeChild(textArea);

			if (!success) await navigator.clipboard.writeText(text);

			setCopyFeedback(true);
			setTimeout(() => setCopyFeedback(false), 2000);
		} catch (e) {
			console.error("Copy failed", e);
		}
	};

	if (isLoading || !match || !homeTeam || !awayTeam) {
		return (
			<div className="p-8 text-center animate-pulse">{t("game.loading")}</div>
		);
	}

	return (
		<div className="flex flex-col h-full bg-white font-sans relative animate-fade-in">
			{/* HEADER CONTROLS */}
			<div className="absolute top-0 left-0 w-full p-3 z-50 flex justify-between pointer-events-none">
				<div className="pointer-events-auto flex gap-3">
					<button
						onClick={onBack}
						className="text-gray-400 hover:text-black transition-colors"
						title="Retour"
					>
						<ArrowLeft size={18} />
					</button>
				</div>
				<div className="pointer-events-auto flex gap-3">
					<button
						onClick={downloadLogs}
						className="text-gray-300 hover:text-gray-900 transition-colors"
					>
						<Download size={16} />
					</button>
					<button
						onClick={copyLogs}
						className="text-gray-300 hover:text-gray-900 transition-colors"
					>
						{copyFeedback ? (
							<Check size={16} className="text-green-500" />
						) : (
							<Copy size={16} />
						)}
					</button>
				</div>
			</div>

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
				possession={match.details?.homePossession || 50}
				isFinished={true}
			/>

			<div className="flex-1 overflow-y-auto p-4 bg-white relative">
				<div className="space-y-0 max-w-md mx-auto pb-20 mt-4">
					{match.details?.events.map((event, idx) => (
						<EventItem key={idx} event={event} homeTeamId={homeTeam.id!} />
					))}

					<div className="pt-4 pb-12 opacity-80">
						<EventItem
							event={{
								minute: 90,
								type: "SE",
								teamId: 0,
								description: "L'arbitre siffle la fin du match.",
							}}
							homeTeamId={homeTeam.id!}
						/>
					</div>
				</div>
			</div>
		</div>
	);
}
