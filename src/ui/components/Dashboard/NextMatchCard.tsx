import type { Match, Team } from "@/core/db/db";
import {
	Trophy
} from "lucide-preact";
import { useTranslation } from "react-i18next";
import { TeamCrest, getTeamColors } from "../Common/TeamCrest";

interface NextMatchCardProps {
	nextMatch: { match: Match; opponent: Team; opponentRank?: number } | null;
	userTeam: Team | null; 
	userRank?: number;
	currentDate: Date;
	onShowOpponent?: (id: number) => void;
	userForm?: Match[];
	opponentForm?: Match[];
	currentDay: number;
}

export default function NextMatchCard({
	nextMatch,
	userTeam,
	userRank,
	onShowOpponent,
	userForm = [],
	opponentForm = [],
	currentDay,
}: NextMatchCardProps) {
	const { t, i18n } = useTranslation();

	if (!nextMatch) {
		return (
			<div className="bg-white rounded-2xl p-8 text-center border border-gray-100 shadow-sm">
				<p className="text-xs font-bold uppercase tracking-widest text-gray-400">Aucun match prévu</p>
			</div>
		);
	}

	const { match, opponent, opponentRank } = nextMatch;
	const isHome = match.homeTeamId === userTeam?.id;
	const daysUntil = match.day - currentDay;

    // Calcul du numéro de la journée (en supposant 1 match par semaine à partir du jour 6)
    // Jour 6 = Journée 1, Jour 13 = Journée 2, etc.
    const matchDayNumber = Math.floor((match.day - 6) / 7) + 1;

	const FormPills = ({ matches, teamId }: { matches: Match[], teamId: number }) => (
		<div className="flex gap-2 justify-center mt-3">
			{matches.map((m, i) => {
				const isHome = m.homeTeamId === teamId;
				const score = isHome ? m.homeScore : m.awayScore;
				const oppScore = isHome ? m.awayScore : m.homeScore;
				const result = score > oppScore ? "W" : score === oppScore ? "D" : "L";
				const color = result === "W" ? "bg-green-500" : result === "D" ? "bg-gray-300" : "bg-red-500";
				
				return (
					<div 
						key={i} 
						className={`w-5 h-5 rounded-md ${color} shadow-sm flex items-center justify-center border border-white/50`}
						title={`${m.homeScore}-${m.awayScore}`}
					>
						<span className="text-[9px] font-black text-white">{result}</span>
					</div>
				);
			})}
			{matches.length === 0 && (
				<div className="flex gap-2">
					{[1,2,3,4,5].map(i => <div key={i} className="w-5 h-5 rounded-md bg-gray-100" />)}
				</div>
			)}
		</div>
	);

	const opponentColors = getTeamColors(opponent);
	const userColors = getTeamColors(userTeam); 
    // @ts-ignore
    const userLogoType = userTeam?.logoType;
    // @ts-ignore
    const opponentLogoType = opponent?.logoType;

	const getRankSuffix = (rank: number) => {
        if (i18n.language.startsWith('fr')) {
            return rank === 1 ? "er" : "e";
        }
		if (rank === 1) return "st";
		if (rank === 2) return "nd";
		if (rank === 3) return "rd";
		return "th";
	};

	const renderRank = (rank?: number) => {
		if (!rank) return null;
		return (
			<span className="text-[10px] text-gray-500 font-bold mt-1">
				{rank}<sup className="text-[8px]">{getRankSuffix(rank)}</sup>
			</span>
		);
	};

	return (
		<div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 relative overflow-hidden">
			{/* Header */}
			<div className="flex justify-between items-center mb-8">
				<div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400">
					<Trophy size={14} className="text-accent" />
					<span>Journée {matchDayNumber > 0 ? matchDayNumber : 1}</span>
				</div>
				<div className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${daysUntil === 0 ? "bg-red-50 text-red-600 animate-pulse" : "bg-gray-50 text-gray-400"}`}>
					{daysUntil === 0 ? "JOUR DE MATCH" : `J-${daysUntil}`}
				</div>
			</div>

			{/* Matchup */}
			<div className="flex items-center justify-between gap-2">
				{/* User Team */}
				<div className="flex flex-col items-center w-[40%]">
					<div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center border border-gray-100 mb-3 shadow-sm">
						<TeamCrest primary={userColors.primary} secondary={userColors.secondary} size="sm" name={userTeam?.name} type={userLogoType} />
					</div>
					<span className="text-[11px] font-black text-ink uppercase tracking-tight text-center leading-tight truncate w-full">{userTeam?.name || "Votre Club"}</span>
					{renderRank(userRank)}
					<FormPills matches={userForm} teamId={userTeam?.id || 0} />
				</div>

				{/* VS */}
				<div className="flex flex-col items-center gap-1.5 px-2">
					<div className="text-[10px] font-black text-gray-300">VS</div>
				</div>

				{/* Opponent */}
				<div 
					className="flex flex-col items-center w-[40%] cursor-pointer group"
					onClick={() => onShowOpponent && onShowOpponent(opponent.id!)}
				>
					<div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center border border-gray-100 mb-3 shadow-sm group-hover:border-accent/20 transition-colors">
						<TeamCrest primary={opponentColors.primary} secondary={opponentColors.secondary} size="sm" name={opponent.name} type={opponentLogoType} />
					</div>
					<span className="text-[11px] font-black text-ink uppercase tracking-tight text-center leading-tight truncate w-full">{opponent.name}</span>
					{renderRank(opponentRank)}
					<FormPills matches={opponentForm} teamId={opponent.id!} />
				</div>
			</div>
		</div>
	);
}
