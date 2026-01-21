import { db, type Player } from "@/core/db/db";
import type { MatchResult as MatchResultType, MatchEvent, Match } from "@/core/engine/core/types";
import { ArrowLeft, Award, Goal, Copy, Check, Terminal, Download } from "lucide-preact";
import { useEffect, useState } from "preact/hooks";
import { useTranslation } from "react-i18next";
import PlayerAvatar from "@/squad/components/PlayerAvatar";
import { SubTabs } from "@/ui/components/Common/SubTabs";
import PlayerCard from "@/squad/components/PlayerCard";
import { TeamCrest } from "@/ui/components/Common/TeamCrest";

const getRatingColor = (rating: number) => {
    if (rating >= 9.0) return "bg-purple-100 text-purple-700 border-purple-200";
    if (rating >= 7.5) return "bg-emerald-100 text-emerald-700 border-emerald-200";
    if (rating >= 6.5) return "bg-blue-50 text-blue-700 border-blue-100";
    if (rating >= 5.5) return "bg-gray-100 text-gray-700 border-gray-200";
    return "bg-red-50 text-red-700 border-red-100";
};

export default function MatchReport({ matchId, onClose }: any) {
	const [match, setMatch] = useState<Partial<Match> | null>(null);
	const [homeTeam, setHomeTeam] = useState<any>(null);
	const [awayTeam, setAwayTeam] = useState<any>(null);
	const [details, setDetails] = useState<MatchResultType | null>(null);
	const [mom, setMom] = useState<Player | null>(null);
	const [ratings, setRatings] = useState<Record<string, number>>({});
    const [homePlayers, setHomePlayers] = useState<Player[]>([]);
    const [awayPlayers, setAwayPlayers] = useState<Player[]>([]);
    const [activeTab, setActiveTab] = useState<"summary" | "home" | "away" | "logs">("summary");
    const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
    const [copyFeedback, setCopyFeedback] = useState(false);

	useEffect(() => {
		const load = async () => {
			const m = await db.matches.get(matchId);
			if (m) {
				setMatch(m);
				const [h, a] = await Promise.all([db.teams.get(m.homeTeamId), db.teams.get(m.awayTeamId)]);
				setHomeTeam(h); setAwayTeam(a);
				if (m.details) {
					const det = m.details as MatchResultType;
					setDetails(det);
                    const r: Record<string, number> = {};
                    if (det.playerStats) Object.entries(det.playerStats).forEach(([pid, s]) => { if (s.rating > 0) r[pid] = s.rating; });
                    setRatings(r);
				}
			}
		};
		load();
	}, [matchId]);

    useEffect(() => {
        const loadPlayers = async () => {
            if (!match) return;
            const [hp, ap] = await Promise.all([db.players.where("teamId").equals(match.homeTeamId!).toArray(), db.players.where("teamId").equals(match.awayTeamId!).toArray()]);
            setHomePlayers(hp.filter(p => ratings[p.id!.toString()]).sort((a,b) => (ratings[b.id!.toString()] || 0) - (ratings[a.id!.toString()] || 0)));
            setAwayPlayers(ap.filter(p => ratings[p.id!.toString()]).sort((a,b) => (ratings[b.id!.toString()] || 0) - (ratings[a.id!.toString()] || 0)));
        };
        loadPlayers();
    }, [match, ratings]);

	useEffect(() => {
		if (ratings && Object.keys(ratings).length > 0) {
			let bId = ""; let bR = -1;
			Object.entries(ratings).forEach(([pid, r]) => { if (r > bR) { bR = r; bId = pid; } });
			if (bId) db.players.get(parseInt(bId)).then(p => setMom(p || null));
		}
	}, [ratings]);

    const executeCopy = (text: string) => {
        try {
            const textArea = document.createElement("textarea");
            textArea.value = text;
            textArea.style.position = "fixed";
            textArea.style.left = "-9999px";
            textArea.style.top = "0";
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            
            const successful = document.execCommand('copy');
            document.body.removeChild(textArea);
            
            if (successful) {
                setCopyFeedback(true);
                setTimeout(() => setCopyFeedback(false), 2000);
            }
        } catch (err) {
            console.error("Échec critique de la copie", err);
            alert("Impossible de copier. Veuillez sélectionner le texte manuellement.");
        }
    };

    const executeDownload = (text: string) => {
        const element = document.createElement("a");
        const file = new Blob([text], {type: 'text/plain'});
        element.href = URL.createObjectURL(file);
        element.download = `match_log_${matchId}_${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(element); // Required for this to work in FireFox
        element.click();
        document.body.removeChild(element);
    }

	if (!match || !homeTeam || !awayTeam) return <div className="h-full flex items-center justify-center bg-white"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>;

    const tabs = [
        { id: "summary", label: "Résumé" },
        { id: "home", label: homeTeam.name.substring(0, 12) },
        { id: "away", label: awayTeam.name.substring(0, 12) },
        ...(details?.debugLogs && details.debugLogs.length > 0 ? [{ id: "logs", label: "Journal" }] : [])
    ];

    const events = details?.events || [];
    const homeGoals = events.filter(e => e.type === "GOAL" && e.teamId === match.homeTeamId);
    const awayGoals = events.filter(e => e.type === "GOAL" && e.teamId === match.awayTeamId);

	return (
		<div className="flex flex-col h-full bg-gray-50 animate-fade-in relative overflow-hidden">
			<div className="bg-white px-4 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 z-10">
				<div className="flex items-center gap-3">
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1"><ArrowLeft size={24} /></button>
				    <h2 className="text-sm font-bold text-gray-900 uppercase tracking-tight">Match</h2>
                </div>
			</div>

            <SubTabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab as any} />

			<div className="flex-1 overflow-y-auto p-4 space-y-4">
                {activeTab === "summary" && (
                    <>
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col items-center">
                            <div className="flex justify-between w-full items-center mb-6">
                                <div className="flex flex-col items-center w-1/3">
                                    <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mb-2 border border-gray-100 overflow-hidden"><TeamCrest primary={homeTeam.primaryColor} secondary={homeTeam.secondaryColor} size="md" name={homeTeam.name} type={homeTeam.logoType} /></div>
                                    <span className="text-[10px] font-bold text-center uppercase text-gray-900 truncate w-full">{homeTeam.name}</span>
                                </div>
                                <div className="text-4xl font-black tabular-nums tracking-tight">{match.homeScore} - {match.awayScore}</div>
                                <div className="flex flex-col items-center w-1/3">
                                    <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mb-2 border border-gray-100 overflow-hidden"><TeamCrest primary={awayTeam.primaryColor} secondary={awayTeam.secondaryColor} size="md" name={awayTeam.name} type={awayTeam.logoType} /></div>
                                    <span className="text-[10px] font-bold text-center uppercase text-gray-900 truncate w-full">{awayTeam.name}</span>
                                </div>
                            </div>

                            <div className="w-full flex justify-between border-t border-gray-50 pt-4">
                                <div className="flex flex-col items-start gap-1 w-1/2 pr-2 border-r border-gray-50">
                                    {homeGoals.length === 0 && <span className="text-[9px] text-gray-300 italic">Aucun buteur</span>}
                                    {homeGoals.map((g, i) => (
                                        <div key={i} className="flex items-center gap-1.5 text-[10px] font-bold text-gray-700 animate-in slide-in-from-left-2 duration-300" style={{ animationDelay: `${i*100}ms` }}>
                                            <Goal size={10} className="text-emerald-500" />
                                            <span>{g.scorerName}</span> <span className="text-gray-400 font-normal">({g.minute}')</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex flex-col items-end gap-1 w-1/2 pl-2">
                                    {awayGoals.length === 0 && <span className="text-[9px] text-gray-300 italic">Aucun buteur</span>}
                                    {awayGoals.map((g, i) => (
                                        <div key={i} className="flex items-center gap-1.5 text-[10px] font-bold text-gray-700 animate-in slide-in-from-right-2 duration-300" style={{ animationDelay: `${i*100}ms` }}>
                                            <span>{g.scorerName}</span> <span className="text-gray-400 font-normal">({g.minute}')</span>
                                            <Goal size={10} className="text-orange-500" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {mom && (
                            <div className="bg-white rounded-2xl p-4 flex items-center gap-4 border border-blue-100 shadow-sm relative overflow-hidden" onClick={() => setSelectedPlayer(mom)}>
                                <div className="relative"><PlayerAvatar dna={mom.dna} size={52} className="border-2 border-blue-50" /><div className="absolute -bottom-1 -right-1 bg-blue-600 text-white px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase border-2 border-white">MVP</div></div>
                                <div className="flex-1">
                                    <span className="text-[9px] font-bold uppercase tracking-widest text-blue-600">MVP du match</span>
                                    <h3 className="text-lg font-bold text-gray-900 leading-none mt-0.5">{mom.firstName} {mom.lastName}</h3>
                                    <div className={`px-2 py-0.5 rounded text-[10px] font-bold w-fit mt-1.5 border ${getRatingColor(ratings[mom.id!.toString()] || 6)}`}>Note: {ratings[mom.id!.toString()]?.toFixed(1)}</div>
                                </div>
                            </div>
                        )}

                        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
                            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50 pb-2">Stats</h3>
                            <StatRow label="Possession" h={details?.homePossession || 50} a={100 - (details?.homePossession || 50)} unit="%" />
                            <StatRow label="Tirs" h={details?.stats.homeShots || 0} a={details?.stats.awayShots || 0} />
                            <StatRow label="Expected Goals" h={details?.stats.homeXG?.toFixed(2) || "0.00"} a={details?.stats.awayXG?.toFixed(2) || "0.00"} />
                        </div>
                    </>
                )}

                {activeTab === "logs" && (
                    <div className="bg-black/95 rounded-2xl p-4 font-mono text-[10px] text-emerald-400 space-y-1 border-2 border-emerald-900/20 shadow-2xl">
                        <div className="flex justify-between items-center border-b border-emerald-900/30 pb-2 mb-3">
                            <span className="text-emerald-500 flex items-center gap-2 font-black uppercase tracking-[0.2em]"><Terminal size={12}/> Console_Output</span>
                            <div className="flex items-center gap-2">
                                <button onClick={() => executeDownload(details?.debugLogs?.join('\n') || '')} className="p-1.5 hover:bg-emerald-500/10 rounded-lg transition-all text-emerald-500" title="Télécharger le log"><Download size={16}/></button>
                                <button onClick={() => executeCopy(details?.debugLogs?.join('\n') || '')} className="p-1.5 hover:bg-emerald-500/10 rounded-lg transition-all text-emerald-500" title="Copier">{copyFeedback ? <Check size={16}/> : <Copy size={16}/>}</button>
                            </div>
                        </div>
                        <div className="max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
                            {details?.debugLogs?.map((log, i) => (
                                <div key={i} className="py-0.5 leading-relaxed opacity-90 border-l border-emerald-900/20 pl-2 mb-0.5">
                                    <span className="text-emerald-800 mr-2 select-none">{i.toString().padStart(3,'0')}</span>
                                    {log}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {(activeTab === "home" || activeTab === "away") && (
                    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden divide-y divide-gray-50">
                        {(activeTab === "home" ? homePlayers : awayPlayers).map(p => {
                            const rating = ratings[p.id!.toString()] || 0;
                            return (
                                <div key={p.id} className="flex items-center p-3 gap-3" onClick={() => setSelectedPlayer(p)}>
                                    <PlayerAvatar dna={p.dna} size={32} />
                                    <div className="flex-1 min-w-0"><p className="font-bold text-sm text-ink truncate">{p.lastName}</p><p className="text-[10px] text-gray-400 uppercase font-black">{p.position}</p></div>
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm border ${getRatingColor(rating)}`}>{rating.toFixed(1)}</div>
                                </div>
                            );
                        })}
                    </div>
                )}
			</div>

            {selectedPlayer && <div className="absolute inset-0 z-[200] bg-white flex flex-col animate-in slide-in-from-bottom-full duration-300"><PlayerCard player={selectedPlayer} onClose={() => setSelectedPlayer(null)} /></div>}
		</div>
	);
}

const StatRow = ({ label, h, a, unit = "" }: any) => (
	<div className="space-y-1">
		<div className="flex justify-between text-xs font-bold text-gray-700 uppercase"><span>{h}{unit}</span><span className="text-[9px] text-gray-400 tracking-widest">{label}</span><span>{a}{unit}</span></div>
		<div className="h-1.5 bg-gray-50 rounded-full overflow-hidden flex border border-gray-100"><div className="h-full bg-blue-600 transition-all" style={{ width: `${(Number(h)/(Number(h)+Number(a)))*100}%` }} /></div>
	</div>
);
