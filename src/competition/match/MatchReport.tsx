import { db, type Match, type Player } from "@/core/db/db";
import type { MatchResult } from "@/core/engine/core/types";
import { ArrowLeft, BarChart2, Shield, User, Award, TrendingUp, Users } from "lucide-preact";
import { useEffect, useState } from "preact/hooks";
import { useTranslation } from "react-i18next";
import Button from "@/ui/components/Common/Button";
import PlayerAvatar from "@/squad/components/PlayerAvatar";
import { SubTabs } from "@/ui/components/Common/SubTabs";
import PlayerCard from "@/squad/components/PlayerCard";

interface MatchReportProps {
	matchId: number;
	onClose: () => void;
	directData?: {
		homeScore: number;
		awayScore: number;
		result: MatchResult;
		homeTeam: any;
		awayTeam: any;
	};
}

export default function MatchReport({ matchId, onClose, directData }: MatchReportProps) {
	const { t } = useTranslation();
	const [match, setMatch] = useState<Partial<Match> | null>(null);
	const [homeTeam, setHomeTeam] = useState<any>(directData?.homeTeam || null);
	const [awayTeam, setAwayTeam] = useState<any>(directData?.awayTeam || null);
	const [details, setDetails] = useState<MatchResult | null>(directData?.result || null);
	const [mom, setMom] = useState<Player | null>(null);
	const [ratings, setRatings] = useState<Record<string, number>>({});
    const [homePlayers, setHomePlayers] = useState<Player[]>([]);
    const [awayPlayers, setAwayPlayers] = useState<Player[]>([]);
    const [activeTab, setActiveTab] = useState<"summary" | "home" | "away">("summary");
    const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

	useEffect(() => {
		const loadMatch = async () => {
			if (directData) {
				const m = await db.matches.get(matchId);
                const mergedMatch = {
                    ...(m || {}),
                    id: matchId,
                    homeScore: directData.homeScore,
                    awayScore: directData.awayScore,
                };
				setMatch(mergedMatch);
                
                if (directData.result) {
                    setDetails(directData.result);
                    setRatings(directData.result.playerPerformances || {});
                }
				return;
			}

			const m = await db.matches.get(matchId);
			if (m) {
				setMatch(m);
				const [h, a] = await Promise.all([
					db.teams.get(m.homeTeamId),
					db.teams.get(m.awayTeamId),
				]);
				setHomeTeam(h);
				setAwayTeam(a);
				if (m.details) {
					const det = m.details as MatchResult;
					setDetails(det);
                    setRatings(det.playerPerformances || {});
				}
			}
		};
		loadMatch();
	}, [matchId, directData]);

    useEffect(() => {
        const loadPlayers = async () => {
            if (!match) return;
            const [hp, ap] = await Promise.all([
                db.players.where("teamId").equals(match.homeTeamId!).toArray(),
                db.players.where("teamId").equals(match.awayTeamId!).toArray()
            ]);
            
            // On ne garde que ceux qui ont une note (donc qui ont joué)
            setHomePlayers(hp.filter(p => ratings[p.id!.toString()]).sort((a,b) => (ratings[b.id!.toString()] || 0) - (ratings[a.id!.toString()] || 0)));
            setAwayPlayers(ap.filter(p => ratings[p.id!.toString()]).sort((a,b) => (ratings[b.id!.toString()] || 0) - (ratings[a.id!.toString()] || 0)));
        };
        loadPlayers();
    }, [match, ratings]);

	useEffect(() => {
		const loadMom = async () => {
			if (ratings && Object.keys(ratings).length > 0) {
				let bestId = "";
				let bestRating = -1;
				Object.entries(ratings).forEach(([pid, rating]) => {
					if (rating > bestRating) {
						bestRating = rating;
						bestId = pid;
					}
				});
				if (bestId) {
					const p = await db.players.get(parseInt(bestId));
					setMom(p || null);
				}
			}
		};
		loadMom();
	}, [ratings]);

	if (!match || !homeTeam || !awayTeam) return (
		<div className="flex flex-col items-center justify-center h-full bg-white">
			<div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
		</div>
	);

	const getScoreColor = (home: number, away: number, isHome: boolean) => {
		if (home === away) return "text-gray-900";
		if (isHome) return home > away ? "text-green-600" : "text-gray-400";
		return away > home ? "text-green-600" : "text-gray-400";
	};

    const tabs = [
        { id: "summary", label: "Résumé" },
        { id: "home", label: homeTeam.name.substring(0, 12) },
        { id: "away", label: awayTeam.name.substring(0, 12) },
    ];

    const RatingList = ({ players }: { players: Player[] }) => (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden divide-y divide-gray-50">
            {players.map(p => {
                const rating = ratings[p.id!.toString()];
                return (
                    <div 
                        key={p.id} 
                        className="flex items-center p-3 gap-3 cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => setSelectedPlayer(p)}
                    >
                        <PlayerAvatar dna={p.dna} size={32} />
                        <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm text-ink truncate">{p.lastName}</p>
                            <p className="text-[10px] text-gray-400 uppercase font-black">{p.position}</p>
                        </div>
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm border ${
                            rating >= 8 ? 'bg-amber-50 text-amber-600 border-amber-100' :
                            rating >= 7 ? 'bg-green-50 text-green-600 border-green-100' :
                            rating >= 6 ? 'bg-blue-50 text-blue-600 border-blue-100' :
                            'bg-red-50 text-red-600 border-red-100'
                        }`}>
                            {rating?.toFixed(1)}
                        </div>
                    </div>
                );
            })}
        </div>
    );

	return (
		<div className="flex flex-col h-full bg-gray-50 animate-fade-in relative overflow-hidden">
			{/* Header */}
			<div className="bg-white px-4 py-4 border-b border-gray-100 flex items-center gap-3 sticky top-0 z-10">
				<button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
					<ArrowLeft size={24} />
				</button>
				<h2 className="text-sm font-bold text-gray-900 uppercase tracking-tight">Feuille de Match</h2>
			</div>

            <SubTabs 
                tabs={tabs} 
                activeTab={activeTab} 
                onChange={setActiveTab as any} 
                sticky={false}
            />

			<div className="flex-1 overflow-y-auto p-4 space-y-4">
                {activeTab === "summary" && (
                    <>
                        {/* Score Card */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col items-center">
                            <div className="flex justify-between w-full items-center mb-2">
                                <div className="flex flex-col items-center w-1/3">
                                    <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mb-2 border border-gray-100 shadow-sm overflow-hidden">
                                        <Shield size={28} style={{ color: homeTeam.colors?.[0] || '#3b82f6' }} />
                                    </div>
                                    <span className="text-[10px] font-bold text-center leading-tight uppercase text-gray-900">{homeTeam.name}</span>
                                </div>

                                <div className="text-4xl font-black tabular-nums tracking-tight flex items-center gap-4">
                                    <span className={getScoreColor(match.homeScore ?? 0, match.awayScore ?? 0, true)}>{match.homeScore}</span>
                                    <span className="text-gray-200 text-2xl">-</span>
                                    <span className={getScoreColor(match.homeScore ?? 0, match.awayScore ?? 0, false)}>{match.awayScore}</span>
                                </div>

                                <div className="flex flex-col items-center w-1/3">
                                    <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mb-2 border border-gray-100 shadow-sm overflow-hidden">
                                        <Shield size={28} style={{ color: awayTeam.colors?.[0] || '#ef4444' }} />
                                    </div>
                                    <span className="text-[10px] font-bold text-center leading-tight uppercase text-gray-900">{awayTeam.name}</span>
                                </div>
                            </div>
                        </div>

                        {/* Man of the Match */}
                        {mom && (
                            <div 
                                className="bg-white rounded-2xl p-4 flex items-center gap-4 border border-blue-100 shadow-sm relative overflow-hidden cursor-pointer active:scale-[0.98] transition-all"
                                onClick={() => setSelectedPlayer(mom)}
                            >
                                <div className="absolute top-0 right-0 p-2 opacity-5 text-blue-600">
                                    <Award size={64} />
                                </div>
                                <div className="relative">
                                    <PlayerAvatar dna={mom.dna} size={52} className="border-2 border-blue-50 shadow-sm" />
                                    <div className="absolute -bottom-1 -right-1 bg-blue-600 text-white px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase border-2 border-white">MVP</div>
                                </div>
                                <div className="flex-1">
                                    <span className="text-[9px] font-bold uppercase tracking-widest text-blue-600">Homme du match</span>
                                    <h3 className="text-lg font-bold text-gray-900 leading-none mt-0.5">{mom.firstName} {mom.lastName}</h3>
                                    <div className="flex items-center gap-2 mt-1.5">
                                        <div className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded text-[10px] font-bold">
                                            Note: {ratings[mom.id!.toString()]?.toFixed(1) || "8.5"}
                                        </div>
                                        <span className="text-[10px] text-gray-400 font-bold uppercase">{mom.position}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Stats */}
                        {details && details.stats && (
                            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
                                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50 pb-2">Statistiques</h3>
                                <StatRow label="Possession" h={details.homePossession || 50} a={100 - (details.homePossession || 50)} unit="%" />
                                <StatRow label="Tirs" h={details.stats.homeShots || 0} a={details.stats.awayShots || 0} />
                                <StatRow label="Expected Goals" h={details.stats.homeXG?.toFixed(2) || "0.00"} a={details.stats.awayXG?.toFixed(2) || "0.00"} />
                            </div>
                        )}

                        {/* Key Events */}
                        <div className="space-y-3 pb-20">
                            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Faits marquants</h3>
                            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden divide-y divide-gray-50">
                                {details?.events && details.events.filter(e => e.type === "GOAL" || e.type === "CARD").length > 0 ? (
                                    details.events.filter(e => e.type === "GOAL" || e.type === "CARD").map((event, i) => (
                                        <div key={i} className="flex items-center p-3 gap-3">
                                            <span className="font-bold text-[10px] text-blue-600 w-6 tabular-nums">{event.minute}'</span>
                                            <span className="text-xs font-medium text-gray-700">{event.description || event.text}</span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-4 text-center text-xs text-gray-400 font-medium">Aucun événement majeur</div>
                                )}
                            </div>
                        </div>
                    </>
                )}

                {activeTab === "home" && <RatingList players={homePlayers} />}
                {activeTab === "away" && <RatingList players={awayPlayers} />}
			</div>

            {/* Overlay Fiche Joueur - Corrigé pour respecter les dimensions du téléphone */}
            {selectedPlayer && (
                <div className="absolute inset-0 z-[200] bg-white flex flex-col animate-in slide-in-from-bottom-full duration-300">
                    <PlayerCard 
                        player={selectedPlayer} 
                        onClose={() => setSelectedPlayer(null)} 
                    />
                </div>
            )}
		</div>
	);
}

const StatRow = ({ label, h, a, unit = "" }: { label: string, h: number | string, a: number | string, unit?: string }) => (
	<div className="space-y-1">
		<div className="flex justify-between text-[10px] font-bold text-gray-500 uppercase">
			<span>{h}{unit}</span>
			<span className="text-[9px] text-gray-300 tracking-widest">{label}</span>
			<span>{a}{unit}</span>
		</div>
		<div className="h-1.5 bg-gray-50 rounded-full overflow-hidden flex border border-gray-100">
			<div className="h-full bg-blue-600 transition-all" style={{ width: `${(Number(h)/(Number(h)+Number(a)))*100}%` }} />
		</div>
	</div>
);
