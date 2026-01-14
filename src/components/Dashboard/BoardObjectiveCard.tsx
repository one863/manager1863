import { Target, TrendingUp, AlertCircle, Trophy, ShieldAlert, CalendarClock } from 'lucide-preact';
import { Team } from '@/db/db';

interface BoardObjectiveProps {
  team: Team | null;
  position: number;
}

export function BoardObjectiveCard({ team, position }: BoardObjectiveProps) {
  if (!team) return null;

  const matchesPlayed = team.matchesPlayed || 0;
  // Période de grâce de 3 matchs
  const isGracePeriod = matchesPlayed < 4;

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
    // Pas de risque pendant la période de grâce, sauf si la confiance est catastrophique
    if (isGracePeriod) return false;
    
    if (!team.seasonGoal) return false;
    if (team.seasonGoal === 'CHAMPION' && position > 2) return true; // Tolérance légère
    if (team.seasonGoal === 'PROMOTION' && position > 5) return true; // Tolérance légère
    if (team.seasonGoal === 'MID_TABLE' && position > 8) return true;
    if (team.seasonGoal === 'AVOID_RELEGATION' && position > 8) return true;
    return false;
  };

  const showWarning = isAtRisk() && !isGracePeriod;

  const getStatusIcon = () => {
    if (isGracePeriod) return <CalendarClock className="text-accent" size={20} />;
    if (showWarning) return <ShieldAlert className="text-red-500" size={20} />;
    return <TrendingUp className="text-green-600" size={20} />;
  };

  const getStatusMessage = () => {
    if (isGracePeriod) {
      return (
        <div className="px-4 py-3 bg-blue-50 border-t border-blue-100 flex items-start gap-3">
          <CalendarClock size={16} className="text-accent shrink-0 mt-0.5" />
          <p className="text-xs text-blue-800 italic leading-snug font-medium">
            La saison ne fait que commencer. Les dirigeants attendent de voir les premiers résultats avant de juger.
          </p>
        </div>
      );
    }
    
    if (showWarning) {
      return (
        <div className="px-4 py-3 bg-red-50 border-t border-red-100 flex items-start gap-3">
          <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
          <p className="text-xs text-red-700 italic leading-snug font-medium">
            Les dirigeants ne sont pas satisfaits. Améliorez votre classement pour éviter le licenciement.
          </p>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="bg-paper-dark px-4 py-2 border-b border-gray-200 flex justify-between items-center">
        <h3 className="text-[10px] font-bold text-ink-light uppercase tracking-widest flex items-center gap-1.5">
          <Target size={14} className="text-accent" />
          Objectif de la Direction
        </h3>
        {showWarning && (
          <span className="bg-red-100 text-red-700 text-[9px] font-bold px-2 py-0.5 rounded-full animate-pulse">
            SIÈGE ÉJECTABLE
          </span>
        )}
        {isGracePeriod && (
          <span className="bg-blue-100 text-blue-700 text-[9px] font-bold px-2 py-0.5 rounded-full">
            DÉBUT DE SAISON
          </span>
        )}
      </div>
      
      <div className="p-4 flex items-center gap-4">
        <div className={`p-3 rounded-xl ${showWarning ? 'bg-red-50' : (isGracePeriod ? 'bg-blue-50' : 'bg-green-50')}`}>
          {getStatusIcon()}
        </div>
        
        <div className="flex-1">
          <div className="font-serif font-bold text-lg text-ink leading-tight">
            {getObjectiveLabel(team.seasonGoal)}
          </div>
          <div className="text-xs text-ink-light mt-0.5">
            Position actuelle : <span className={`font-bold ${showWarning ? 'text-red-600' : 'text-green-600'}`}>{position}e</span>
          </div>
        </div>

        <div className="text-right border-l border-gray-100 pl-4">
          <div className="text-[10px] text-ink-light uppercase font-bold">Confiance</div>
          <div className={`text-xl font-serif font-bold ${team.confidence < 30 ? 'text-red-600' : 'text-accent'}`}>
            {team.confidence}%
          </div>
        </div>
      </div>

      {getStatusMessage()}
    </div>
  );
}
