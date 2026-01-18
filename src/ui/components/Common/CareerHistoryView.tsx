import { db } from "@/core/db/db";
import { useEffect, useState } from "preact/hooks";
import { useGameStore } from "@/infrastructure/store/gameSlice";
import { Trophy, Award, Calendar, ChevronRight, History } from "lucide-preact";

interface CareerHistoryProps {
    teamId?: number;
    playerName?: string;
}

export default function CareerHistoryView({ teamId, playerName }: CareerHistoryProps) {
    const saveId = useGameStore((state) => state.currentSaveId);
    const [history, setHistory] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadHistory = async () => {
            if (!saveId) return;
            let results: any[] = [];
            
            if (teamId) {
                results = await db.history.where("saveId").equals(saveId).and(h => h.teamId === teamId).toArray();
            } else if (playerName) {
                // Pour un joueur, on cherche les entrées où il était top scorer (car c'est la seule info joueur qu'on a en history pour l'instant)
                // OU on pourrait chercher d'autres types d'entrées si on en ajoute plus tard
                results = await db.history.where("saveId").equals(saveId).and(h => h.topScorerName === playerName).toArray();
            }

            // Trier par saison décroissante
            setHistory(results.sort((a, b) => b.seasonYear - a.seasonYear));
            setIsLoading(false);
        };
        loadHistory();
    }, [saveId, teamId, playerName]);

    if (isLoading) return <div className="p-8 text-center animate-pulse text-xs text-gray-400 font-bold uppercase tracking-widest">Chargement de l'historique...</div>;

    if (history.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                <History size={40} className="text-gray-300 mb-3" />
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-tight">Aucun antécédent</h3>
                <p className="text-[10px] text-gray-400 mt-1">L'historique sera complété à la fin de chaque saison.</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {history.map((entry, idx) => (
                <div key={idx} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm relative overflow-hidden group">
                    {entry.achievements?.includes("Champion") && (
                        <div className="absolute top-0 right-0 p-1">
                            <div className="bg-amber-100 text-amber-600 p-1.5 rounded-bl-xl">
                                <Trophy size={14} />
                            </div>
                        </div>
                    )}
                    
                    <div className="flex justify-between items-start mb-3">
                        <div>
                            <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded-full">
                                Saison {entry.seasonYear}
                            </span>
                            <h4 className="text-sm font-bold text-gray-900 mt-1">{entry.leagueName}</h4>
                        </div>
                        <div className="text-right">
                            <span className="text-[10px] font-bold text-gray-400 uppercase block">Position</span>
                            <span className={`text-xl font-black ${entry.position === 1 ? 'text-amber-500' : 'text-gray-900'}`}>
                                {entry.position}{entry.position === 1 ? 'er' : 'e'}
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-3 border-t border-gray-50">
                        <div className="text-center">
                            <span className="text-[8px] font-bold text-gray-400 uppercase block mb-0.5">Points</span>
                            <span className="text-xs font-bold text-gray-700">{entry.points} pts</span>
                        </div>
                        <div className="text-center border-x border-gray-50">
                            <span className="text-[8px] font-bold text-gray-400 uppercase block mb-0.5">Attaque</span>
                            <span className="text-xs font-bold text-gray-700">{entry.goalsFor} b.</span>
                        </div>
                        <div className="text-center">
                            <span className="text-[8px] font-bold text-gray-400 uppercase block mb-0.5">Défense</span>
                            <span className="text-xs font-bold text-gray-700">{entry.goalsAgainst} b.</span>
                        </div>
                    </div>

                    {playerName && entry.topScorerName === playerName && (
                        <div className="mt-3 bg-amber-50 rounded-xl p-2 flex items-center gap-2 border border-amber-100">
                            <Award size={14} className="text-amber-500" />
                            <span className="text-[9px] font-bold text-amber-700 uppercase">Meilleur buteur du club ({entry.topScorerGoals} buts)</span>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}
