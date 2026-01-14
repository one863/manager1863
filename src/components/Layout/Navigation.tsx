import { db } from "@/db/db";
import { useGameStore } from "@/store/gameSlice";
import {
	Briefcase,
	Home,
	Newspaper,
	Trophy,
	Users,
	Wallet,
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

	return (
		<nav className="bg-paper-dark border-t border-gray-300 pb-safe absolute bottom-0 w-full z-30 shadow-[0_-5px_10px_rgba(0,0,0,0.02)]">
			<ul className="flex justify-around items-center h-16 px-1">
				<NavIcon
					icon={Home}
					label={t("game.office")}
					active={currentView === "dashboard"}
					onClick={() => onNavigate("dashboard")}
				/>
				<NavIcon
					icon={Wallet}
					label={t("game.finances", "Budget")}
					active={currentView === "finances"}
					onClick={() => onNavigate("finances")}
				/>
				<NavIcon
					icon={Newspaper}
					label={t("dashboard.news_short", "Actus")}
					active={currentView === "news"}
					onClick={() => onNavigate("news")}
					badge={unreadCount > 0 ? unreadCount : undefined}
				/>
				<NavIcon
					icon={Users}
					label={t("game.squad")}
					active={currentView === "squad"}
					onClick={() => onNavigate("squad")}
				/>
				<NavIcon
					icon={Briefcase}
					label={t("game.staff", "Staff")}
					active={currentView === "training"}
					onClick={() => onNavigate("training")}
					dot={hasActiveProject}
				/>
				<NavIcon
					icon={Trophy}
					label={t("game.league")}
					active={currentView === "league" || currentView === "match-report"}
					onClick={() => onNavigate("league")}
				/>
			</ul>
		</nav>
	);
}

function NavIcon({ icon: Icon, label, active, onClick, dot, badge }: any) {
	return (
		<li>
			<button
				onClick={onClick}
				className={`flex flex-col items-center justify-center gap-1 transition-all relative w-[60px] h-full py-1 rounded-xl active:bg-gray-200/50 ${active ? "text-black" : "text-ink-light hover:text-ink"}`}
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
