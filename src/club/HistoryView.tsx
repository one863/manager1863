import { db } from "@/core/db/db";
import { useGameStore } from "@/infrastructure/store/gameSlice";
import { useEffect, useState } from "preact/hooks";
import { useTranslation } from "react-i18next";
import { Trophy, History as HistoryIcon, Award, Star, TrendingUp, Users, Target } from "lucide-preact";
import Card from "@/ui/components/Common/Card";

export default function HistoryView() {
	const { t } = useTranslation();
	const currentSaveId = useGameStore((state) => state.currentSaveId);
	const userTeamId = useGameStore((state) => state.userTeamId);
	const [history, setHistory] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const loadHistory = async () => {
			if (!currentSaveId || !userTeamId) return;
			const data = await db.history
				.where("saveId")
				.equals(currentSaveId)
				.and(h => h.teamId === userTeamId)
				.toArray();
			// Trier du plus récent au plus ancien
			setHistory(data.sort((a, b) => b.seasonYear - a.seasonYear));
			setLoading(false);
		};
		loadHistory();
	}, [currentSaveId, userTeamId]);

	if (loading) {
		return (
			<div className="flex items-center justify-center py-20">
				<div className="w-8 h-8 border-4 border-gray-100 border-t-ink rounded-full animate-spin" />
			</div>
		);
	}

	if (history.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center py-20 px-10 text-center animate-fade-in">
				<div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6 text-gray-200">
					<HistoryIcon size={40} />
				</div>
				<h3 className="text-lg font-black text-ink uppercase tracking-tight mb-2">Le Musée est vide</h3>
				<p className="text-xs text-ink-light font-bold">
					Terminez votre première saison pour archiver vos exploits et vos trophées ici.
				</p>
			</div>
		);
	}

	return (
		<div className="p-4 space-y-6 animate-fade-in pb-24">
			<header className="space-y-1">
				<h2 className="text-2xl font-black text-ink uppercase tracking-tight flex items-center gap-3">
					<Trophy className="text-amber-500" size={28} />
					Le Musée du Club
				</h2>
				<p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">
                    Archives historiques & Palmarès
                </p>
			</header>

			<div className="space-y-8 relative">
                {/* Timeline vertical line */}
                <div className="absolute left-[19px] top-4 bottom-4 w-0.5 bg-gray-100 -z-10" />

				{history.map((record, index) => (
					<div key={record.id} className="relative pl-12">
                        {/* Timeline dot */}
                        <div className={`absolute left-0 top-1 w-10 h-10 rounded-full border-4 border-white flex items-center justify-center shadow-sm ${record.achievements?.includes("Champion") ? "bg-amber-500 text-white" : "bg-ink text-white"}`}>
                            <span className="text-[10px] font-black">{record.seasonYear}</span>
                        </div>

						<Card className={`overflow-hidden border-l-4 ${record.achievements?.includes("Champion") ? "border-l-amber-500" : "border-l-ink"}`}>
							<div className="p-4 space-y-4">
								<div className="flex justify-between items-start">
									<div>
										<h4 className="text-sm font-black text-ink uppercase tracking-tight">{record.leagueName}</h4>
										<div className="flex items-center gap-2 mt-1">
											<span className="text-xs font-black text-gray-400">Position :</span>
											<span className={`text-xs font-black ${record.position === 1 ? "text-amber-600" : "text-ink"}`}>
												{record.position}
                                                {record.position === 1 ? "er" : "ème"}
											</span>
										</div>
									</div>
									<div className="text-right">
										<div className="text-lg font-black text-ink leading-none">{record.points}</div>
										<div className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Points</div>
									</div>
								</div>

								<div className="grid grid-cols-2 gap-3">
									<div className="bg-gray-50 p-2 rounded-lg border border-gray-100 flex items-center gap-3">
                                        <div className="w-8 h-8 rounded bg-white flex items-center justify-center text-ink shadow-sm">
                                            <Target size={16} />
                                        </div>
                                        <div>
                                            <p className="text-[8px] font-black text-gray-400 uppercase leading-none mb-1">Meilleur Buteur</p>
                                            <p className="text-[10px] font-bold text-ink truncate max-w-[80px]">{record.topScorerName}</p>
                                        </div>
									</div>
                                    <div className="bg-gray-50 p-2 rounded-lg border border-gray-100 flex items-center gap-3">
                                        <div className="w-8 h-8 rounded bg-white flex items-center justify-center text-amber-500 shadow-sm">
                                            <Star size={16} fill="currentColor" />
                                        </div>
                                        <div>
                                            <p className="text-[8px] font-black text-gray-400 uppercase leading-none mb-1">Buts</p>
                                            <p className="text-[10px] font-bold text-ink">{record.topScorerGoals}</p>
                                        </div>
									</div>
								</div>

                                {record.achievements && record.achievements.length > 0 && (
                                    <div className="flex flex-wrap gap-2 pt-2">
                                        {record.achievements.map((a: string) => (
                                            <span key={a} className="px-2 py-1 bg-amber-50 text-amber-600 border border-amber-100 rounded text-[9px] font-black uppercase tracking-widest flex items-center gap-1">
                                                <Trophy size={10} /> {a}
                                            </span>
                                        ))}
                                    </div>
                                )}
							</div>
						</Card>
					</div>
				))}
			</div>
		</div>
	);
}
