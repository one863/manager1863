import { db } from "@/db/db";
import { useGameStore } from "@/store/gameSlice";
import { useLiveMatchStore } from "@/store/liveMatchStore";
import {
	ArrowRightLeft,
	Home,
	Shield,
	Trophy,
	Users,
} from "lucide-preact";
import { useEffect, useState } from "preact/hooks";
import { useTranslation } from "react-i18next";

interface NavigationProps {
	currentView: string;
	onNavigate: (view: any) => void;
}

export function Navigation({ currentView, onNavigate }: NavigationProps) {
	const { t } = useTranslation();
	const unreadCount = useGameStore((state) => state.unreadNewsCount);
	const userTeamId = useGameStore((state) => state.userTeamId);
	const day = useGameStore((state) => state.day);
	const liveMatch = useLiveMatchStore((state) => state.liveMatch);

	const [hasActiveProject, setHasActiveProject] = useState(false);

	useEffect(() => {
		const checkProjects = async () => {
			if (!userTeamId) return;
			const team = await db.teams.get(userTeamId);
			if (team) {
				const training = !!(team.trainingEndDay && team.trainingEndDay > day);
				const stadium = !!(
					team.stadiumUpgradeEndDay && team.stadiumUpgradeEndDay > day
				);
				setHasActiveProject(training || stadium);
			}
		};
		checkProjects();
	}, [userTeamId, day, currentView]);

	// Le menu est désactivé seulement si un match est en cours ET n'est pas fini
	const isMatchInProgress = liveMatch && liveMatch.currentMinute < 90;

	return (
		<nav className="bg-paper-dark border-t border-gray-300 pb-safe absolute bottom-0 w-full z-30 shadow-[0_-5px_10px_rgba(0,0,0,0.02)]">
			<ul className="flex justify-around items-center h-16 px-1">
				<NavIcon
					icon={Home}
					label={t("game.dashboard", "Dashboard")}
					active={currentView === "dashboard"}
					onClick={() => !isMatchInProgress && onNavigate("dashboard")}
					badge={unreadCount > 0 ? unreadCount : undefined}
					disabled={isMatchInProgress}
				/>
				<NavIcon
					icon={Shield}
					label={t("game.club", "Club")}
					active={currentView === "club"}
					onClick={() => !isMatchInProgress && onNavigate("club")}
					dot={hasActiveProject}
					disabled={isMatchInProgress}
				/>
				<NavIcon
					icon={Users}
					label={t("game.team", "Équipe")}
					active={currentView === "squad"}
					onClick={() => !isMatchInProgress && onNavigate("squad")}
					disabled={isMatchInProgress}
				/>
				<NavIcon
					icon={ArrowRightLeft}
					label={t("game.transfers", "Mercato")}
					active={currentView === "transfers"}
					onClick={() => !isMatchInProgress && onNavigate("transfers")}
					disabled={isMatchInProgress}
				/>
				<NavIcon
					icon={Trophy}
					label={t("game.league", "Ligue")}
					active={currentView === "league" || currentView === "match-report"}
					onClick={() => !isMatchInProgress && onNavigate("league")}
					disabled={isMatchInProgress}
				/>
			</ul>
		</nav>
	);
}

function NavIcon({ icon: Icon, label, active, onClick, dot, badge, disabled }: any) {
	return (
		<li>
			<button
				onClick={onClick}
				disabled={disabled}
				className={`flex flex-col items-center justify-center gap-1 transition-all relative w-[60px] h-full py-1 rounded-xl active:bg-gray-200/50 
					${active ? "text-black" : "text-ink-light hover:text-ink"}
					${disabled ? "opacity-30 cursor-not-allowed" : ""}
				`}
			>
				<div
					className={`transition-transform duration-200 ${active ? "-translate-y-1.5" : ""}`}
				>
					<Icon size={24} strokeWidth={active ? 2.5 : 2} />
				</div>
				<span
					className={`text-[8px] font-bold uppercase tracking-tighter transition-opacity ${active ? "opacity-100" : "opacity-70"}`}
				>
					{label}
				</span>
				{dot && (
					<span className="absolute top-2 right-3 w-2 h-2 bg-black rounded-full border border-paper-dark animate-pulse" />
				)}
				{badge !== undefined && (
					<span className="absolute top-1 right-2 bg-red-600 text-white text-[9px] font-bold h-3.5 w-3.5 rounded-full flex items-center justify-center border border-paper-dark shadow-sm">
						{badge}
					</span>
				)}
			</button>
		</li>
	);
}
