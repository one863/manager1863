import type { Team } from "@/core/types";
import { type Signal, useSignalEffect } from "@preact/signals";
import { useSignal } from "@preact/signals";
import { TeamCrest, getTeamColors } from "@/ui/components/Common/TeamCrest";

interface Scorer {
	name: string;
	minute: number;
}

interface ScoreboardProps {
	homeTeam: Team;
	awayTeam: Team;
	homeScore: Signal<number>;
	awayScore: Signal<number>;
	minute: Signal<number>;
	homeScorers: Signal<Scorer[]>;
	awayScorers: Signal<Scorer[]>;
	possession: Signal<number>;
	isFinished: boolean;
	stoppageTime: Signal<number>;
	onFinalize?: () => void;
}

export default function Scoreboard({
	homeTeam, awayTeam, homeScore, awayScore, minute, homeScorers, awayScorers,
	isFinished, stoppageTime, logs
}: ScoreboardProps & { logs?: any[] }) {

	const homeColors = getTeamColors(homeTeam);
const awayColors = getTeamColors(awayTeam);

// Extraction des logs de but (type EVENT, eventSubtype GOAL, hors célébration/remise en jeu si texte existe)
const isGoalLog = (l: any) =>
	l.type === 'EVENT' &&
	l.eventSubtype === 'GOAL' &&
	(!l.text || !/célébration|remise en jeu/i.test(l.text));
const goalLogs = (logs || []).filter(isGoalLog);
const homeId = homeTeam?.id;
const awayId = awayTeam?.id;
// Score par équipe (tous les logs valides, dédoublonnés par minute/joueur si playerName, sinon par minute seulement)
const dedupeScore = (arr: any[]) => {
	const seen = new Set();
	return arr.filter(e => {
		const key = (e.playerName || 'X') + '-' + Math.floor(e.time / 60);
		if (seen.has(key)) return false;
		seen.add(key);
		return true;
	});
};
const homeGoals = dedupeScore(goalLogs.filter(l => l.teamId === homeId)).length;
const awayGoals = dedupeScore(goalLogs.filter(l => l.teamId === awayId)).length;
// Buteurs par équipe (playerName ou nom parsé du texte, dédoublonné)
const extractScorerName = (log: any) => {
	if (log.playerName && log.playerName !== 'undefined') return log.playerName;
	if (typeof log.text === 'string') {
		const match = log.text.match(/de ([^!]+)!/);
		if (match && match[1]) {
			const name = match[1].trim();
			if (name && name !== 'undefined') return name;
		}
	}
	return undefined;
};
const dedupeScorers = (arr: any[]) => {
	const seen = new Set();
	return arr.filter(e => {
		const name = extractScorerName(e);
		if (!name) return false;
		const key = name + '-' + Math.floor(e.time / 60);
		if (seen.has(key)) return false;
		seen.add(key);
		return true;
	});
};
const homeScorersArr = dedupeScorers(goalLogs.filter(l => l.teamId === homeId)).map(l => ({ name: extractScorerName(l), minute: Math.floor(l.time / 60) }));
const awayScorersArr = dedupeScorers(goalLogs.filter(l => l.teamId === awayId)).map(l => ({ name: extractScorerName(l), minute: Math.floor(l.time / 60) }));
// Formatage des buteurs (nom + minutes, dédoublonné)
const formatScorers = (scorers: { name: string, minute: number }[]) => {
  if (!scorers || !Array.isArray(scorers)) return "";
  const map = new Map<string, number[]>();
  scorers.forEach(s => {
    if (s && s.name) {
      if (!map.has(s.name)) map.set(s.name, []);
      map.get(s.name)!.push(s.minute);
    }
  });
  return Array.from(map.entries())
    .map(([name, mins]) => `${name} (${mins.sort((a, b) => a - b).join("', ") + "'"})`)
    .join(" • ");
};
const hStr = formatScorers(homeScorersArr);
const aStr = formatScorers(awayScorersArr);

	return (
		<div className="bg-white border-b border-gray-100 shadow-sm relative overflow-hidden shrink-0 h-[115px]">
            <div className="absolute top-0 inset-x-0 h-1 flex overflow-hidden">
                <div className="h-full w-1/2 bg-blue-500 transition-all duration-1000" />
                <div className="h-full w-1/2 bg-orange-500 transition-all duration-1000" />
            </div>

			<div className="relative z-10 px-4 h-full flex flex-col justify-center pt-2">
				<div className="grid grid-cols-[1fr_auto_1fr] items-start max-w-lg mx-auto w-full gap-4">
					{/* Home Team */}
					<div className="flex flex-col items-start min-w-0 pr-1">
						<div className="flex items-center gap-2 mb-1 w-full">
							<div className="w-9 h-9 bg-gray-50 rounded-lg flex items-center justify-center border border-gray-100 shadow-sm overflow-hidden shrink-0">
								<TeamCrest primary={homeColors.primary} secondary={homeColors.secondary} name={homeTeam.name} size="sm" />
							</div>
							<span className="text-[13px] font-black text-gray-900 truncate uppercase leading-tight">{homeTeam.name}</span>
						</div>
						<div className="min-h-8 w-full">
							<p className="text-[10px] font-black text-emerald-600/70 text-left leading-tight break-words">
								{hStr}
							</p>
						</div>
					</div>

					{/* Center Block */}
					<div className="flex flex-col items-center justify-center px-4 shrink-0 min-w-[90px] pt-1">
						<div className="flex items-center gap-2 transition-all duration-300 text-gray-900">
							<span className="text-3xl font-black tabular-nums leading-none">{homeGoals}</span>
							<span className="text-gray-200 font-bold text-xl leading-none">:</span>
							<span className="text-3xl font-black tabular-nums leading-none">{awayGoals}</span>
						</div>
						<div className="mt-1.5 flex flex-col items-center gap-1">
							{!isFinished ? (
								<span className="text-[11px] font-black text-slate-600 tabular-nums bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
									{minute.value}'{minute.value >= 90 && stoppageTime.value > 0 ? `+${stoppageTime.value}` : ""}
								</span>
							) : (
								<span className="text-[9px] font-black text-white bg-gray-900 px-3 py-1 rounded-full uppercase tracking-widest">FIN</span>
							)}
						</div>
					</div>

					{/* Away Team */}
					<div className="flex flex-col items-end min-w-0 pl-1">
						<div className="flex items-center gap-2 mb-1 justify-end w-full">
							<span className="text-[13px] font-black text-gray-900 truncate uppercase leading-tight text-right">{awayTeam.name}</span>
							<div className="w-9 h-9 bg-gray-50 rounded-lg flex items-center justify-center border border-gray-100 shadow-sm overflow-hidden shrink-0">
								<TeamCrest primary={awayColors.primary} secondary={awayColors.secondary} name={awayTeam.name} size="sm" />
							</div>
						</div>
						<div className="min-h-8 w-full">
							<p className="text-[10px] font-black text-emerald-600/70 text-right leading-tight break-words">
								{aStr}
							</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
