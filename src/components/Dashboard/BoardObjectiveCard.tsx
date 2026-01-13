import { Target, TrendingUp, AlertCircle, Trophy, ShieldAlert } from 'lucide-preact';
import { Team } from '@/db/db';

interface BoardObjectiveProps {
  team: Team | null;
  position: number;
}

export function BoardObjectiveCard({ team, position }: BoardObjectiveProps) {
  if (!team) return null;

  const getObjectiveLabel = (goal?: string) => {
    switch (goal) {
      case 'CHAMPION': return 'Être Sacré Champion';
      case 'PROMOTION': return 'Obtenir la Promotion';
      case 'MID_TABLE': return 'Milieu de Tableau';
      case 'AVOID_RELEGATION': return 'Éviter la Relégation';
      default: return 'Non défini';
    }
  };

  const isAtRisk = () => {
    if (!team.seasonGoal) return false;
    if (team.seasonGoal === 'CHAMPION' && position > 1) return true;
    if (team.seasonGoal === 'PROMOTION' && position > 3) return true;
    if (team.seasonGoal === 'MID_TABLE' && position > 6) return true;
    return false;
  };

  const getStatusIcon = () => {
    if (isAtRisk()) return <ShieldAlert className="text-red-500" size={20} />;
    return <TrendingUp className="text-green-600" size={20} />;
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="bg-paper-dark px-4 py-2 border-b border-gray-200 flex justify-between items-center">
        <h3 className="text-[10px] font-bold text-ink-light uppercase tracking-widest flex items-center gap-1.5">
          <Target size={14} className="text-accent" />
          Objectif de la Direction
        </h3>
        {isAtRisk() && (
          <span className="bg-red-100 text-red-700 text-[9px] font-bold px-2 py-0.5 rounded-full animate-pulse">
            SIÈGE ÉJECTABLE
          </span>
        )}
      </div>
      
      <div className="p-4 flex items-center gap-4">
        <div className={`p-3 rounded-xl ${isAtRisk() ? 'bg-red-50' : 'bg-green-50'}`}>
          {getStatusIcon()}
        </div>
        
        <div className="flex-1">
          <div className="font-serif font-bold text-ink leading-tight">
            {getObjectiveLabel(team.seasonGoal)}
          </div>
          <div className="text-xs text-ink-light mt-0.5">
            Position actuelle : <span className={`font-bold ${isAtRisk() ? 'text-red-600' : 'text-green-600'}`}>{position}e</span>
          </div>
        </div>

        <div className="text-right">
          <div className="text-[10px] text-ink-light uppercase">Confiance</div>
          <div className={`text-lg font-serif font-bold ${team.confidence < 30 ? 'text-red-600' : 'text-accent'}`}>
            {team.confidence}%
          </div>
        </div>
      </div>

      {isAtRisk() && (
        <div className="px-4 py-2 bg-red-50/50 border-t border-red-100 flex items-start gap-2">
          <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
          <p className="text-[10px] text-red-700 italic leading-tight">
            Les dirigeants ne sont pas satisfaits. Améliorez votre classement pour éviter le licenciement à la fin de la saison.
          </p>
        </div>
      )}
    </div>
  );
}
