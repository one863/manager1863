import { db } from "@/core/db/db";
import { useGameStore } from "@/infrastructure/store/gameSlice";
import { useLiveMatchStore } from "@/infrastructure/store/liveMatchStore";
import {
	ArrowRightLeft,
	Home,
	Shield,
	Trophy,
	Users,
    History as HistoryIcon
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

	// Bloquer la navigation tant que le match n'est pas clôturé (même si fini à 90')
    // Pour forcer l'utilisateur à cliquer sur "Continuer" dans le header
	const isMatchActive = !!liveMatch;

	return (
		<nav className="bg-white border-t border-gray-100 pb-safe absolute bottom-0 w-full z-30">
			<ul className="flex justify-around items-center h-16 px-1">
				<NavIcon
					icon={Home}
					label={t("game.dashboard", "Dashboard")}
					active={currentView === "dashboard"}
					onClick={() => !isMatchActive && onNavigate("dashboard")}
					badge={unreadCount > 0 ? unreadCount : undefined}
					disabled={isMatchActive}
				/>
				<NavIcon
					icon={Shield}
					label={t("game.club", "Club")}
					active={currentView === "club" || currentView === "history"}
					onClick={() => !isMatchActive && onNavigate("club")}
					dot={hasActiveProject}
					disabled={isMatchActive}
				/>
				<NavIcon
					icon={Users}
					label={t("game.team", "Équipe")}
					active={currentView === "squad"}
					onClick={() => !isMatchActive && onNavigate("squad")}
					disabled={isMatchActive}
				/>
				<NavIcon
					icon={ArrowRightLeft}
					label={t("game.transfers", "Marché")}
					active={currentView === "transfers"}
					onClick={() => !isMatchActive && onNavigate("transfers")}
					disabled={isMatchActive}
				/>
				<NavIcon
					icon={Trophy}
					label={t("game.league", "Ligue")}
					active={currentView === "league" || currentView === "match-report"}
					onClick={() => !isMatchActive && onNavigate("league")}
					disabled={isMatchActive}
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
				className={`flex flex-col items-center justify-center gap-1 transition-all relative w-[64px] h-full py-1 
					${active ? "text-ink" : "text-slate-500 hover:text-ink"}
					${disabled ? "opacity-30 cursor-not-allowed" : ""}
				`}
			>
				<Icon size={22} strokeWidth={active ? 2.5 : 2} />
				<span
					className={`text-[9px] font-black uppercase tracking-tight transition-opacity ${active ? "opacity-100" : "opacity-80"}`}
				>
					{label}
				</span>
				{dot && (
					<span className="absolute top-2 right-4 w-2 h-2 bg-accent rounded-full border-2 border-white" />
				)}
				{badge !== undefined && (
					<span className="absolute top-1 right-1 bg-red-600 text-white text-[10px] font-black h-5 min-w-[20px] px-2 rounded-full flex items-center justify-center border-2 border-white shadow-sm transform translate-x-1 -translate-y-1">
						{badge}
					</span>
				)}
			</button>
		</li>
	);
}
