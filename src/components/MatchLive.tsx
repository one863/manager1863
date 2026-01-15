import { useGameStore } from "@/store/gameSlice";
import { useLiveMatchStore } from "@/store/liveMatchStore";
import { useSignal } from "@preact/signals";
import { ArrowLeft, Check, Copy, Download, FastForward } from "lucide-preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { useTranslation } from "react-i18next";
import EventItem from "./Match/EventItem";
import Scoreboard from "./Match/Scoreboard";
import MatchReport from "./MatchReport";

interface Scorer {
	name: string;
	minute: number;
}

export default function MatchLive() {
	const { t } = useTranslation();
	const currentSaveId = useGameStore((state) => state.currentSaveId);
	const finalizeLiveMatch = useGameStore((state) => state.finalizeLiveMatch);

	const liveMatch = useLiveMatchStore((state) => state.liveMatch);
	const updateLiveMatchMinute = useLiveMatchStore(
		(state) => state.updateLiveMatchMinute,
	);

	const currentMinute = useSignal(liveMatch?.currentMinute || 0);
	const homeScore = useSignal(0);
	const awayScore = useSignal(0);
	const displayedEvents = useSignal<any[]>([]);
	const isFinished = useSignal(false);
	const copyFeedback = useSignal(false);
	const [showReport, setShowReport] = useState(false);

	const homeScorers = useSignal<Scorer[]>([]);
	const awayScorers = useSignal<Scorer[]>([]);
	const homeChances = useSignal(0);
	const awayChances = useSignal(0);

	const isPausedRef = useRef(false);
	const scrollRef = useRef<HTMLDivElement>(null);

	// Initialisation
	useEffect(() => {
		if (!liveMatch) return;
		const pastEvents = liveMatch.result.events.filter(
			(e: any) => e.minute <= currentMinute.value,
		);
		displayedEvents.value = pastEvents;

		let h = 0;
		let a = 0;
		let hChances = 0;
		let aChances = 0;
		const hScorersList: Scorer[] = [];
		const aScorersList: Scorer[] = [];

		pastEvents.forEach((e: any) => {
			if (e.teamId === liveMatch.homeTeam.id) hChances++;
			else if (e.teamId === liveMatch.awayTeam.id) aChances++;

			if (e.type === "GOAL") {
				if (e.teamId === liveMatch.homeTeam.id) {
					h++;
					hScorersList.push({ name: e.scorerName, minute: e.minute });
				} else {
					a++;
					aScorersList.push({ name: e.scorerName, minute: e.minute });
				}
			}
		});

		homeScore.value = h;
		awayScore.value = a;
		homeChances.value = hChances;
		awayChances.value = aChances;
		homeScorers.value = hScorersList;
		awayScorers.value = aScorersList;

		if (currentMinute.value >= 90) isFinished.value = true;
	}, []);

	// Timer Loop
	useEffect(() => {
		if (!liveMatch || isFinished.value) return;

		const tickRate = 200;

		const timer = setInterval(() => {
			if (isPausedRef.current) return;

			if (currentMinute.value >= 90) {
				clearInterval(timer);
				isFinished.value = true;
				if (currentSaveId) updateLiveMatchMinute(90, currentSaveId);
				return;
			}

			currentMinute.value += 1;

			if (currentMinute.value % 5 === 0 && currentSaveId) {
				updateLiveMatchMinute(currentMinute.value, currentSaveId);
			}

			const eventsNow = liveMatch.result.events.filter(
				(e: any) => e.minute === currentMinute.value,
			);

			if (eventsNow.length > 0) {
				displayedEvents.value = [...displayedEvents.value, ...eventsNow];

				eventsNow.forEach((e: any) => {
					if (e.teamId === liveMatch.homeTeam.id) homeChances.value++;
					else if (e.teamId === liveMatch.awayTeam.id) awayChances.value++;
				});

				const goals = eventsNow.filter((e: any) => e.type === "GOAL");

				if (goals.length > 0) {
					isPausedRef.current = true;
					goals.forEach((g: any) => {
						if (g.teamId === liveMatch.homeTeam.id) {
							homeScore.value += 1;
							homeScorers.value = [
								...homeScorers.value,
								{ name: g.scorerName, minute: g.minute },
							];
						} else {
							awayScore.value += 1;
							awayScorers.value = [
								...awayScorers.value,
								{ name: g.scorerName, minute: g.minute },
							];
						}
					});

					setTimeout(() => {
						isPausedRef.current = false;
					}, 3000);
				}

				if (scrollRef.current) {
					setTimeout(() => {
						if (scrollRef.current) {
							scrollRef.current.scrollTo({
								top: scrollRef.current.scrollHeight,
								behavior: "smooth",
							});
						}
					}, 50);
				}
			}
		}, tickRate);

		return () => clearInterval(timer);
	}, [liveMatch, isFinished.value]);

	const handleSkip = () => {
		if (!liveMatch || !currentSaveId) return;
		isPausedRef.current = false;
		currentMinute.value = 90;
		isFinished.value = true;
		displayedEvents.value = liveMatch.result.events;

		let h = 0;
		let a = 0;
		const hScorersList: Scorer[] = [];
		const aScorersList: Scorer[] = [];
		liveMatch.result.events.forEach((e: any) => {
			if (e.type === "GOAL") {
				if (e.teamId === liveMatch.homeTeam.id) {
					h++;
					hScorersList.push({ name: e.scorerName, minute: e.minute });
				} else {
					a++;
					aScorersList.push({ name: e.scorerName, minute: e.minute });
				}
			}
		});
		homeScore.value = h;
		awayScore.value = a;
		homeScorers.value = hScorersList;
		awayScorers.value = aScorersList;

		updateLiveMatchMinute(90, currentSaveId);
	};

	const downloadMatchLogs = () => {
		if (!liveMatch) return;
		const logs = {
			matchInfo: {
				home: liveMatch.homeTeam.name,
				away: liveMatch.awayTeam.name,
				score: `${homeScore.value}-${awayScore.value}`,
				possession: `${liveMatch.result.homePossession}% / ${100 - liveMatch.result.homePossession}%`,
			},
			events: liveMatch.result.events,
		};
		const blob = new Blob([JSON.stringify(logs, null, 2)], { type: "application/json" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `match_log_${liveMatch.homeTeam.name}_vs_${liveMatch.awayTeam.name}.json`;
		a.click();
		URL.revokeObjectURL(url);
	};

	const copyMatchLogs = async () => {
		if (!liveMatch) return;
		const logs = {
			matchInfo: {
				home: liveMatch.homeTeam.name,
				away: liveMatch.awayTeam.name,
				score: `${homeScore.value}-${awayScore.value}`,
				possession: `${liveMatch.result.homePossession}% / ${100 - liveiamatch.result.homePossession}%`,
			},
			events: liveMatch.result.events,
		};
		const text = JSON.stringify(logs, null, 2);
		
		let success = false;
		try {
			const textArea = document.createElement("textarea");
			textArea.value = text;
			textArea.style.position = "fixed";
			textArea.style.left = "-9999px";
			document.body.appendChild(textArea);
			textArea.focus();
			textArea.select();
			success = document.execCommand("copy");
			document.body.removeChild(textArea);
		} catch (e) {}

		if (!success) {
			try {
				await navigator.clipboard.writeText(text);
				success = true;
			} catch (err) {}
		}

		if (success) {
			copyFeedback.value = true;
			setTimeout(() => (copyFeedback.value = false), 2000);
		}
	};

	if (!liveMatch) return null;

	if (showReport) {
		return (
			<MatchReport 
				match={{
					...liveMatch,
					id: liveMatch.matchId,
					homeTeamId: liveMatch.homeTeam.id, 
					awayTeamId: liveMatch.awayTeam.id, 
					homeScore: homeScore.value,
					awayScore: awayScore.value,
					details: liveMatch.result,
					date: new Date(),
					played: true,
					leagueId: 0,
					saveId: currentSaveId || 0
				}}
				homeTeam={liveMatch.homeTeam}
				awayTeam={liveMatch.awayTeam}
				onClose={() => finalizeLiveMatch()}
			/>
		);
	}

	return (
		<div className="fixed inset-0 z-[400] bg-white flex flex-col max-w-md mx-auto border-x border-paper-dark shadow-2xl overflow-hidden animate-fade-in">
			{/* HEADER CONTROLS */}
			<div className="absolute top-0 left-0 w-full p-4 z-50 flex justify-between pointer-events-none">
				<div className="pointer-events-auto flex items-center gap-3">
					{isFinished.value ? (
						<button
							onClick={() => setShowReport(true)}
							className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-full shadow-lg text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all"
						>
							<Check size={14} /> Voir le Rapport
						</button>
					) : (
						<button
							onClick={handleSkip}
							className="flex items-center gap-1.5 px-3 py-1.5 bg-white/90 rounded-full shadow-lg text-[10px] font-black uppercase tracking-widest text-ink-light hover:text-ink transition-all active:scale-95 border border-gray-100"
						>
							<FastForward size={14} /> Passer
						</button>
					)}
				</div>
				<div className="pointer-events-auto flex gap-2">
					{isFinished.value && (
						<>
							<button
								onClick={copyMatchLogs}
								className="p-2 bg-white/90 rounded-full shadow-lg text-ink-light hover:text-accent transition-all border border-gray-100"
								title="Copier les logs"
							>
								{copyFeedback.value ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
							</button>
							<button
								onClick={downloadMatchLogs}
								className="p-2 bg-white/90 rounded-full shadow-lg text-ink-light hover:text-ink transition-all border border-gray-100"
								title="Télécharger"
							>
								<Download size={18} />
							</button>
						</>
					)}
				</div>
			</div>

			<Scoreboard
				homeTeam={liveMatch.homeTeam}
				awayTeam={liveMatch.awayTeam}
				homeScore={homeScore}
				awayScore={awayScore}
				minute={currentMinute}
				homeScorers={homeScorers}
				awayScorers={awayScorers}
				homeChances={homeChances}
				awayChances={awayChances}
				possession={liveMatch.result.homePossession}
				isFinished={isFinished.value}
			/>

			<div
				className="flex-1 overflow-y-auto p-4 bg-white relative scroll-smooth"
				ref={scrollRef}
			>
				<div className="space-y-0 max-w-md mx-auto pb-32 mt-4">
					{displayedEvents.value.length === 0 && (
						<div className="text-center py-12 opacity-30">
							<span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
								Coup d'envoi...
							</span>
						</div>
					)}

					{displayedEvents.value.map((event, idx) => (
						<EventItem
							key={idx}
							event={event}
							homeTeamId={liveMatch.homeTeam.id!}
						/>
					))}

					{isFinished.value && (
						<div className="pt-4 animate-fade-in text-center">
							<div className="inline-block px-4 py-2 bg-paper-dark rounded-full border border-gray-100 text-[10px] font-black uppercase tracking-widest text-ink-light mb-12">
								Fin du Match
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
