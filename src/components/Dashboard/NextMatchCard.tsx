import type { Match, Team } from "@/db/db";
import { Shield, MapPin, Clock } from "lucide-preact";
import { useTranslation } from "react-i18next";

interface NextMatchCardProps {
	nextMatch: {
		match: Match;
		opponent: Team;
	} | null;
	userTeamId: number;
	userTeamName: string;
	currentDate: Date;
	onShowOpponent?: (id: number) => void;
	userForm?: Match[];
	opponentForm?: Match[];
	currentDay: number;
}

export default function NextMatchCard({
	nextMatch,
	userTeamId,
	userTeamName,
	onShowOpponent,
	userForm = [],
	opponentForm = [],
	currentDay,
}: NextMatchCardProps) {
	const { t } = useTranslation();

	if (!nextMatch) {
		return (
			<div className="bg-paper-dark/30 p-8 rounded-[2rem] border border-dashed border-gray-300 text-center">
				<p className="text-ink-light text-xs font-black uppercase tracking-[0.2em]">
					Aucun match prévu
				</p>
			</div>
		);
	}

	// L'utilisateur est-il à domicile pour ce match ?
	const isUserHome = nextMatch.match.homeTeamId === userTeamId;
	const daysUntil = nextMatch.match.day - currentDay;
	
	const getFormResult = (m: Match, teamId: number) => {
		const isHomeMatch = m.homeTeamId === teamId;
		const myScore = isHomeMatch ? (m.homeScore ?? 0) : (m.awayScore ?? 0);
		const oppScore = isHomeMatch ? (m.awayScore ?? 0) : (m.homeScore ?? 0);
		if (myScore > oppScore) return 'W';
		if (myScore < oppScore) return 'L';
		return 'D';
	};

	const userResults = userForm.slice().reverse().map(m => getFormResult(m, userTeamId));
	const opponentResults = opponentForm.slice().reverse().map(m => getFormResult(m, nextMatch.opponent.id!));

	// CELUI QUI REÇOIT EST À GAUCHE
	const leftTeamName = isUserHome ? userTeamName : nextMatch.opponent.name;
	const rightTeamName = isUserHome ? nextMatch.opponent.name : userTeamName;
	const leftForm = isUserHome ? userResults : opponentResults;
	const rightForm = isUserHome ? opponentResults : userResults;
	
	const isLeftOpponent = !isUserHome;

	const FormDisplay = ({ results }: { results: string[] }) => (
		<div className="flex gap-1 mt-2 justify-center pointer-events-none">
			{results.map((res, i) => (
				<div 
					key={i} 
					className={`w-3.5 h-3.5 rounded-sm flex items-center justify-center text-[7px] font-black text-white shadow-sm ${
						res === 'W' ? 'bg-green-500' : res === 'L' ? 'bg-red-500' : 'bg-gray-400'
					}`}
				>
					{res}
				</div>
			))}
			{[...Array(Math.max(0, 5 - results.length))].map((_, i) => (
				<div key={i + results.length} className="w-3.5 h-3.5 rounded-sm border border-gray-100 bg-gray-50" />
			))}
		</div>
	);

	return (
		<div className="bg-white p-5 rounded-[2rem] shadow-sm border border-gray-100 relative overflow-hidden group">
			<div className="absolute top-0 right-0 w-32 h-32 bg-accent opacity-5 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-700" />
			
			<div className="flex justify-between items-center mb-6 relative z-10">
				<div className="flex items-center gap-2 px-3 py-1.5 bg-paper-dark rounded-full border border-gray-100">
					<Clock size={12} className="text-accent" />
					<span className="text-[10px] font-black uppercase tracking-[0.1em] text-ink-light">
						{daysUntil === 0 ? "AUJOURD'HUI" : `DANS ${daysUntil} JOUR${daysUntil > 1 ? 'S' : ''}`}
					</span>
				</div>
				<div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.15em] text-accent">
					<div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
					{isUserHome ? "À DOMICILE" : "À L'EXTÉRIEUR"}
				</div>
			</div>

			<div className="flex items-center justify-between gap-4 mb-4 relative z-10">
				{/* HOME TEAM (GAUCHE) */}
				<div 
					className={`flex-1 text-center min-w-0 ${isLeftOpponent ? 'cursor-pointer' : ''}`}
					onClick={() => isLeftOpponent && onShowOpponent?.(nextMatch.opponent.id!)}
				>
					<div className="text-[8px] font-black text-ink-light uppercase tracking-widest mb-1 opacity-60">Home</div>
					<div className={`text-base font-black font-serif leading-tight uppercase truncate ${isLeftOpponent ? 'text-accent hover:underline' : 'text-ink'}`}>
						{leftTeamName}
					</div>
					<FormDisplay results={leftForm} />
				</div>

				<div className="flex flex-col items-center shrink-0">
					<div className="w-10 h-10 bg-paper-dark rounded-xl flex items-center justify-center shadow-sm border border-gray-100 transform -rotate-3 group-hover:rotate-0 transition-all duration-300">
						<Shield size={20} className="text-accent/40" />
					</div>
					<div className="text-xl font-black mt-2 text-accent italic tracking-tighter">VS</div>
				</div>

				{/* AWAY TEAM (DROITE) */}
				<div 
					className={`flex-1 text-center min-w-0 ${!isLeftOpponent ? 'cursor-pointer' : ''}`}
					onClick={() => !isLeftOpponent && onShowOpponent?.(nextMatch.opponent.id!)}
				>
					<div className="text-[8px] font-black text-ink-light uppercase tracking-widest mb-1 opacity-60">Away</div>
					<div className={`text-base font-black font-serif leading-tight uppercase truncate ${!isLeftOpponent ? 'text-accent hover:underline' : 'text-ink'}`}>
						{rightTeamName}
					</div>
					<FormDisplay results={rightForm} />
				</div>
			</div>

			<div className="flex items-center justify-center border-t border-gray-100 pt-4 relative z-10">
				<div className="flex items-center gap-2 text-ink-light">
					<MapPin size={12} className="text-accent/60" />
					<span className="text-[10px] font-black truncate max-w-[200px] uppercase tracking-widest">
						{isUserHome ? "STADE MUNICIPAL" : nextMatch.opponent.stadiumName}
					</span>
				</div>
			</div>
		</div>
	);
}
