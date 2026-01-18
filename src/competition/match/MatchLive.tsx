import { useGameStore } from "@/infrastructure/store/gameSlice";
import { useLiveMatchStore } from "@/infrastructure/store/liveMatchStore";
import { useSignal } from "@preact/signals";
import { Check, Copy, Download, FastForward } from "lucide-preact";
import { useEffect, useRef } from "preact/hooks";
import { useTranslation } from "react-i18next";
import EventItem from "./components/EventItem";
import Scoreboard from "./components/Scoreboard";

interface Scorer {
	name: string;
	minute: number;
}

interface MatchLiveProps {
    onShowReport?: (matchId: number) => void;
}

export default function MatchLive({ onShowReport }: MatchLiveProps) {
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
	const isStarted = useSignal(false);
	const copyFeedback = useSignal(false);

	const homeScorers = useSignal<Scorer[]>([]);
	const awayScorers = useSignal<Scorer[]>([]);
	const homeChances = useSignal(0);
	const awayChances = useSignal(0);
	const homeShots = useSignal(0);
	const awayShots = useSignal(0);
	const homeXG = useSignal(0);
	const awayXG = useSignal(0);
	const currentPossession = useSignal(50);
	const stoppageTime = useSignal(0);

	const isPausedRef = useRef(false);
	const scrollRef = useRef<HTMLDivElement>(null);

	// Helper to calculate possession at a given minute
	const calculatePossessionAtMinute = (minute: number, finalPossession: number) => {
		if (minute <= 0) return 50;
		const weight = minute / 90;
		const base = 50 * (1 - weight) + finalPossession * weight;
		const jitter = Math.sin(minute * 0.5) * 2;
		return Math.round(Math.max(30, Math.min(70, base + jitter)));
	};

	// Initialisation
	useEffect(() => {
		if (!liveMatch || !liveMatch.result) return;
		
		const events = liveMatch.result.events || [];
		const pastEvents = events.filter(
			(e: any) => e.minute <= currentMinute.value,
		);
		// Don't show technical SHOT events in the feed
		displayedEvents.value = pastEvents.filter((e: any) => e.type !== "SHOT");

		let h = 0;
		let a = 0;
		const hScorersList: Scorer[] = [];
		const aScorersList: Scorer[] = [];
		let hXG = 0;
		let aXG = 0;
		let hShots = 0;
		let aShots = 0;
		let hChances = 0;
		let aChances = 0;

		// Calculate stoppage time based on events (e.g. goals, subs)
		let totalStoppage = 0;
		events.forEach((e: any) => {
			if (e.type === "GOAL") totalStoppage += 1;
			if (e.type === "SUBSTITUTION") totalStoppage += 0.5;
			if (e.type === "INJURY") totalStoppage += 1;
		});
		stoppageTime.value = Math.ceil(Math.min(10, Math.max(1, totalStoppage)));


		pastEvents.forEach((e: any) => {
			if (e.type === "GOAL") {
				if (e.teamId === liveMatch.homeTeam.id) {
					h++;
					hScorersList.push({ name: e.scorerName, minute: e.minute });
				} else {
					a++;
					aScorersList.push({ name: e.scorerName, minute: e.minute });
				}
			}
			
			if (e.xg) {
				if (e.teamId === liveMatch.homeTeam.id) {
					hXG += e.xg;
					hShots++;
					if (e.type === "GOAL" || e.xg > 0.18) hChances++;
				} else {
					aXG += e.xg;
					aShots++;
					if (e.type === "GOAL" || e.xg > 0.18) aChances++;
				}
			}
		});

		homeScore.value = h;
		awayScore.value = a;
		homeChances.value = hChances;
		awayChances.value = aChances;
		homeShots.value = hShots;
		awayShots.value = aShots;
		homeXG.value = hXG;
		awayXG.value = aXG;
		homeScorers.value = hScorersList;
		awayScorers.value = aScorersList;
		currentPossession.value = calculatePossessionAtMinute(currentMinute.value, liveMatch.result.homePossession || 50);

		const maxMinute = 90 + stoppageTime.value;
		if (currentMinute.value >= maxMinute) isFinished.value = true;
	}, [liveMatch]);

	// Timer Loop
	useEffect(() => {
		if (!liveMatch || !liveMatch.result || isFinished.value) return;

		const tickRate = 200;
		let timer: NodeJS.Timeout;

		const startDelay = currentMinute.value === 0 ? 2000 : 0;
		
		const startTimeout = setTimeout(() => {
			isStarted.value = true;
			
			timer = setInterval(() => {
				if (isPausedRef.current) return;

				const maxMinute = 90 + stoppageTime.value;

				if (currentMinute.value >= maxMinute) {
					clearInterval(timer);
					isFinished.value = true;
					currentPossession.value = liveMatch.result.homePossession || 50;
					if (liveMatch.result.stats) {
						homeXG.value = liveMatch.result.stats.homeXG || homeXG.value;
						awayXG.value = liveMatch.result.stats.awayXG || awayXG.value;
						homeShots.value = liveMatch.result.stats.homeShots || homeShots.value;
						awayShots.value = liveMatch.result.stats.awayShots || awayShots.value;
						homeChances.value = liveMatch.result.stats.homeChances || homeChances.value;
						awayChances.value = liveMatch.result.stats.awayChances || awayChances.value;
					}
					if (currentSaveId) updateLiveMatchMinute(90, currentSaveId);
					return;
				}

				currentMinute.value += 1;
				if (currentMinute.value <= 90) {
					currentPossession.value = calculatePossessionAtMinute(currentMinute.value, liveMatch.result.homePossession || 50);
				}

				if (currentMinute.value % 5 === 0 && currentSaveId && currentMinute.value <= 90) {
					updateLiveMatchMinute(currentMinute.value, currentSaveId);
				}

				const events = liveMatch.result.events || [];
				const eventsNow = events.filter(
					(e: any) => e.minute === currentMinute.value,
				);

				if (eventsNow.length > 0) {
					const displayableEvents = eventsNow.filter((e: any) => e.type !== "SHOT");
					
					const nonGoalEvents = displayableEvents.filter((e: any) => e.type !== "GOAL");
					if (nonGoalEvents.length > 0) {
						displayedEvents.value = [...displayedEvents.value, ...nonGoalEvents];
					}

					eventsNow.forEach((e: any) => {
						if (e.xg) {
							if (e.teamId === liveMatch.homeTeam.id) {
								homeXG.value += e.xg;
								homeShots.value++;
								if (e.type === "GOAL" || e.xg > 0.18) homeChances.value++;
							} else {
								awayXG.value += e.xg;
								awayShots.value++;
								if (e.type === "GOAL" || e.xg > 0.18) awayChances.value++;
							}
						}
					});

					const goals = eventsNow.filter((e: any) => e.type === "GOAL");

					if (goals.length > 0) {
						isPausedRef.current = true;
						
						const primaryGoal = goals[0];
						const isPenalty = primaryGoal.description.includes("penalty");

						const suspenseMessage = {
							minute: currentMinute.value,
							type: "SUSPENSE",
							teamId: primaryGoal.teamId,
							description: isPenalty ? "L'arbitre siffle un penalty..." : "🔥 Grosse occasion...",
							xg: null
						};
						
						displayedEvents.value = [...displayedEvents.value, suspenseMessage];
						
						setTimeout(() => {
							if (scrollRef.current) {
								scrollRef.current.scrollTo({
									top: scrollRef.current.scrollHeight,
									behavior: "smooth",
								});
							}
						}, 50);

						setTimeout(() => {
							const currentEventsWithoutSuspense = displayedEvents.value.filter((e: any) => e.type !== "SUSPENSE");
							
							const newGoals = goals.filter(g => !currentEventsWithoutSuspense.some(e => e.minute === g.minute && e.type === "GOAL" && e.scorerName === g.scorerName));
							
							displayedEvents.value = [
								...currentEventsWithoutSuspense,
								...newGoals
							];

							newGoals.forEach((g: any) => {
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
								if (scrollRef.current) {
									scrollRef.current.scrollTo({
										top: scrollRef.current.scrollHeight,
										behavior: "smooth",
									});
								}
							}, 50);

							setTimeout(() => {
								isPausedRef.current = false;
							}, 2000);
						}, 1500); 
					} else {
						if (displayableEvents.length > 0 && scrollRef.current) {
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
				}
			}, tickRate);
		}, startDelay);

		return () => {
			clearTimeout(startTimeout);
			if (timer) clearInterval(timer);
		};
	}, [liveMatch, isFinished.value]);

	const handleSkip = () => {
		if (!liveMatch || !liveMatch.result || !currentSaveId) return;
		isPausedRef.current = false;
		
		const events = liveMatch.result.events || [];
		if (stoppageTime.value === 0) {
			let totalStoppage = 0;
			events.forEach((e: any) => {
				if (e.type === "GOAL") totalStoppage += 1;
				if (e.type === "SUBSTITUTION") totalStoppage += 0.5;
				if (e.type === "INJURY") totalStoppage += 1;
			});
			stoppageTime.value = Math.ceil(Math.min(10, Math.max(1, totalStoppage)));
		}

		currentMinute.value = 90 + stoppageTime.value;
		isFinished.value = true;
		
		displayedEvents.value = events.filter((e: any) => e.type !== "SHOT");
		
		currentPossession.value = liveMatch.result.homePossession || 50;
		
		if (liveMatch.result.stats) {
			homeXG.value = liveMatch.result.stats.homeXG || 0;
			awayXG.value = liveMatch.result.stats.awayXG || 0;
			homeShots.value = liveMatch.result.stats.homeShots || 0;
			awayShots.value = liveMatch.result.stats.awayShots || 0;
			homeChances.value = liveMatch.result.stats.homeChances || 0;
			awayChances.value = liveMatch.result.stats.awayChances || 0;
		}

		let h = 0;
		let a = 0;
		const hScorersList: Scorer[] = [];
		const aScorersList: Scorer[] = [];
		
		events.forEach((e: any) => {
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
				possession: `${liveMatch.result.homePossession}% / ${100 - liveMatch.result.homePossession}%`,
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

	const handleFinalize = async () => {
        if (liveMatch) {
            const matchId = liveMatch.matchId;
            // ON FINALISE VRAIMENT EN DB ICI
            await finalizeLiveMatch();
            // On demande l'affichage du rapport
            if (onShowReport) {
                onShowReport(matchId);
            }
        }
    };

	return (
		<div className="absolute inset-0 z-[200] flex flex-col bg-white animate-fade-in">
			{/* HEADER CONTROLS */}
			<div className="absolute top-0 left-0 w-full p-4 z-50 flex justify-between pointer-events-none">
				<div className="pointer-events-auto flex items-center gap-3">
					{!isFinished.value && (
						<button
							onClick={handleSkip}
							className="flex items-center gap-1.5 px-3 py-1.5 bg-white/90 rounded-full shadow-lg text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:text-gray-900 transition-all active:scale-95 border border-gray-100 backdrop-blur-sm"
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
								className="p-2 bg-white/90 rounded-full shadow-lg text-gray-400 hover:text-blue-600 transition-all border border-gray-100"
							>
								{copyFeedback.value ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
							</button>
							<button
								onClick={downloadMatchLogs}
								className="p-2 bg-white/90 rounded-full shadow-lg text-gray-400 hover:text-gray-900 transition-all border border-gray-100"
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
				homeShots={homeShots}
				awayShots={awayShots}
				homeXG={homeXG}
				awayXG={awayXG}
				possession={currentPossession}
				isFinished={isFinished.value}
				stoppageTime={stoppageTime}
				onFinalize={handleFinalize}
			/>

			<div
				className="flex-1 overflow-y-auto p-4 bg-gray-50 relative scroll-smooth"
				ref={scrollRef}
			>
				<div className="space-y-0 max-w-md mx-auto pb-12 mt-4">
					{!isStarted.value && (
						<div className="text-center py-12">
							<span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 animate-pulse">
								Préparation du terrain...
							</span>
						</div>
					)}
					
					{isStarted.value && displayedEvents.value.length === 0 && (
						<div className="text-center py-12 animate-fade-in">
							<span className="text-[10px] font-bold uppercase tracking-widest text-gray-800">
								Coup d'envoi !
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
							<div className="inline-block px-4 py-2 bg-white rounded-full border border-gray-100 text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-8">
								Fin du Match
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
