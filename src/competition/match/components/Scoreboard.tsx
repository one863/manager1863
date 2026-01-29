import type { Team } from "@/core/types";
import { type Signal } from "@preact/signals";
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
    possession: Signal<number[]>;
    isFinished: boolean;
    stoppageTime: Signal<number>;
    onFinalize?: () => void;
}

export default function Scoreboard({
    homeTeam, awayTeam, homeScore, awayScore, minute, homeScorers, awayScorers,
    possession, isFinished, stoppageTime
}: ScoreboardProps) {

    // Sécurité : Si les données d'équipe ne sont pas encore là
    if (!homeTeam || !awayTeam) return <div className="h-[115px] bg-white animate-pulse" />;

    const homeColors = getTeamColors(homeTeam);
    const awayColors = getTeamColors(awayTeam);

    // Formatage des buteurs (nom + minutes, dédoublonné)
    const formatScorers = (scorersList: Scorer[] | undefined) => {
        if (!scorersList || !Array.isArray(scorersList)) return "";
        const map = new Map<string, number[]>();
        scorersList.forEach(s => {
            if (s && s.name) {
                if (!map.has(s.name)) map.set(s.name, []);
                map.get(s.name)!.push(s.minute);
            }
        });
        return Array.from(map.entries())
            .map(([name, mins]) => `${name} (${mins.sort((a, b) => a - b).join("', ") + "'"})`)
            .join(" • ");
    };

    return (
        <div className="bg-white border-b border-gray-100 shadow-sm relative overflow-hidden shrink-0 h-[115px]">
            {/* Barre de possession (Barre supérieure) */}
            <div className="absolute top-0 inset-x-0 h-1 flex overflow-hidden bg-gray-100">
                <div
                    className="h-full bg-blue-500 transition-all duration-1000"
                    style={{ width: `${(possession?.value?.[0] ?? 50)}%` }}
                />
                <div
                    className="h-full bg-orange-500 transition-all duration-1000"
                    style={{ width: `${(possession?.value?.[1] ?? 50)}%` }}
                />
            </div>

            <div className="relative z-10 px-4 h-full flex flex-col justify-center pt-2">
                <div className="grid grid-cols-[1fr_auto_1fr] items-start max-w-lg mx-auto w-full gap-4">
                    
                    {/* Équipe Domicile */}
                    <div className="flex flex-col items-start min-w-0 pr-1">
                        <div className="flex items-center gap-2 mb-1 w-full">
                            <div className="w-9 h-9 bg-gray-50 rounded-lg flex items-center justify-center border border-gray-100 shadow-sm overflow-hidden shrink-0">
                                <TeamCrest primary={homeColors.primary} secondary={homeColors.secondary} name={homeTeam.name} size="sm" />
                            </div>
                            <span className="text-[13px] font-black text-gray-900 truncate uppercase leading-tight">
                                {homeTeam.name}
                            </span>
                        </div>
                        <div className="min-h-8 w-full">
                            <p className="text-[10px] font-black text-emerald-600/70 text-left leading-tight break-words">
                                {formatScorers(homeScorers?.value)}
                            </p>
                        </div>
                    </div>

                    {/* Bloc Central (Score & Temps) */}
                    <div className="flex flex-col items-center justify-center px-4 shrink-0 min-w-[90px] pt-1">
                        <div className="flex items-center gap-2 transition-all duration-300 text-gray-900">
                            <span className="text-3xl font-black tabular-nums leading-none">
                                {homeScore?.value ?? 0}
                            </span>
                            <span className="text-gray-200 font-bold text-xl leading-none">:</span>
                            <span className="text-3xl font-black tabular-nums leading-none">
                                {awayScore?.value ?? 0}
                            </span>
                        </div>
                        <div className="mt-1.5 flex flex-col items-center gap-1">
                            {!isFinished ? (
                                <span className="text-[11px] font-black text-slate-600 tabular-nums bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                                    {minute?.value ?? 0}'
                                    {(minute?.value ?? 0) >= 45 && (stoppageTime?.value ?? 0) > 0 ? `+${stoppageTime.value}` : ""}
                                </span>
                            ) : (
                                <span className="text-[9px] font-black text-white bg-gray-900 px-3 py-1 rounded-full uppercase tracking-widest">
                                    FIN
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Équipe Extérieure */}
                    <div className="flex flex-col items-end min-w-0 pl-1">
                        <div className="flex items-center gap-2 mb-1 justify-end w-full">
                            <span className="text-[13px] font-black text-gray-900 truncate uppercase leading-tight text-right">
                                {awayTeam.name}
                            </span>
                            <div className="w-9 h-9 bg-gray-50 rounded-lg flex items-center justify-center border border-gray-100 shadow-sm overflow-hidden shrink-0">
                                <TeamCrest primary={awayColors.primary} secondary={awayColors.secondary} name={awayTeam.name} size="sm" />
                            </div>
                        </div>
                        <div className="min-h-8 w-full">
                            <p className="text-[10px] font-black text-emerald-600/70 text-right leading-tight break-words">
                                {formatScorers(awayScorers?.value)}
                            </p>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}