import { useState, useEffect } from 'preact/hooks';
import { db, Player, Team } from '@/db/db';
import { useGameStore } from '@/store/gameSlice';
import { TrainingService } from '@/services/training-service';
import Card from '@/components/Common/Card';
import Button from '@/components/Common/Button';
import {
  Dumbbell,
  Target,
  Zap,
  AlertTriangle,
  ChevronUp,
  Clock,
  CalendarCheck
} from 'lucide-preact';
import { useTranslation } from 'react-i18next';

export default function Training() {
  const { t } = useTranslation();
  const currentSaveId = useGameStore((state) => state.currentSaveId);
  const userTeamId = useGameStore((state) => state.userTeamId);
  const currentDay = useGameStore((state) => state.day);
  const currentDate = useGameStore((state) => state.currentDate);

  const [team, setTeam] = useState<Team | null>(null);
  const [isTraining, setIsTraining] = useState(false);
  const [lowEnergyWarning, setLowEnergyWarning] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    if (!userTeamId || !currentSaveId) return;
    const teamData = await db.teams.get(userTeamId);
    setTeam(teamData || null);

    const players = await db.players
      .where('[saveId+teamId]')
      .equals([currentSaveId, userTeamId])
      .toArray();
    const avgEnergy = players.reduce((acc, p) => acc + p.energy, 0) / (players.length || 1);
    setLowEnergyWarning(avgEnergy < 40);
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [userTeamId, currentSaveId, currentDay]);

  const handleTrain = async (focus: 'PHYSICAL' | 'TECHNICAL') => {
    if (!currentSaveId || !userTeamId) return;

    setIsTraining(true);
    // Correction ici : on passe currentDay (nombre) au lieu de currentDate (Date)
    const result = await TrainingService.startTrainingCycle(userTeamId, focus, currentDay);
    if (result.success) {
      await loadData();
    } else {
      alert(result.error || "Erreur lors du lancement");
    }
    setIsTraining(false);
  };

  if (isLoading) return <div className="p-8 text-center animate-pulse">{t('game.loading')}</div>;

  const activeTraining = team?.trainingEndDay && team.trainingEndDay > currentDay;
  const daysRemaining = activeTraining ? team.trainingEndDay - currentDay : 0;

  return (
    <div className="space-y-5 pb-24 animate-fade-in">
      <div className="px-2 border-b border-gray-200 pb-4">
        <h2 className="text-xl font-serif font-bold text-ink flex items-center gap-2">
          <Dumbbell className="text-accent" />
          Académie du Club
        </h2>
        <p className="text-[10px] text-ink-light italic uppercase tracking-wider">
          Cycles de perfectionnement hebdomadaire
        </p>
      </div>

      {lowEnergyWarning && (
        <div className="bg-amber-50 border border-amber-200 p-2 rounded-lg flex gap-2 items-center">
          <AlertTriangle className="text-amber-600 shrink-0" size={16} />
          <p className="text-[10px] text-amber-800 leading-tight">
            <strong>AVIS MÉDICAL :</strong> L'effectif est épuisé. Un cycle intense pourrait être contre-productif.
          </p>
        </div>
      )}

      {/* État de l'entraînement actuel */}
      {activeTraining ? (
        <div className="bg-white border-2 border-accent rounded-xl p-5 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 p-2 opacity-10">
            <CalendarCheck size={80} />
          </div>
          <h3 className="text-sm font-bold text-ink uppercase tracking-widest mb-1">Cycle en cours</h3>
          <p className="text-2xl font-serif font-bold text-accent">Focus {team?.trainingFocus === 'PHYSICAL' ? 'Physique' : 'Technique'}</p>
          <div className="flex items-center gap-2 mt-4 text-ink-light text-xs font-medium">
             <Clock size={14} /> 
             <span>Fin prévue dans {daysRemaining} jours (Jour {team!.trainingEndDay})</span>
          </div>
          <div className="mt-4 h-1.5 bg-paper-dark rounded-full overflow-hidden">
             <div 
               className="h-full bg-accent animate-pulse-slow" 
               style={{ width: `${((7 - daysRemaining) / 7) * 100}%` }}
             ></div>
          </div>
          <p className="text-[10px] text-ink-light italic mt-2">Les joueurs progresseront à la fin du cycle.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-200 flex items-center justify-between gap-4">
            <div className="bg-paper-dark p-2 rounded-lg"><Zap size={20} className="text-accent" /></div>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-ink">Constitution & Force</h3>
              <p className="text-[10px] text-ink-light italic">Vélocité, Vigueur, Endurance</p>
            </div>
            <div className="flex flex-col items-end gap-1">
               <span className="text-[9px] font-bold text-red-600 flex items-center gap-0.5"><Clock size={10} /> 7 JOURS</span>
               <Button
                onClick={() => handleTrain('PHYSICAL')}
                variant="primary"
                className="py-1 px-4 text-xs h-8"
                disabled={isTraining}
              >
                Lancer
              </Button>
            </div>
          </div>

          <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-200 flex items-center justify-between gap-4">
            <div className="bg-paper-dark p-2 rounded-lg"><Target size={20} className="text-blue-600" /></div>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-ink">Arts du Cuir</h3>
              <p className="text-[10px] text-ink-light italic">Frappe, Précision, Agilité</p>
            </div>
            <div className="flex flex-col items-end gap-1">
               <span className="text-[9px] font-bold text-blue-600 flex items-center gap-0.5"><Clock size={10} /> 7 JOURS</span>
               <Button
                onClick={() => handleTrain('TECHNICAL')}
                variant="secondary"
                className="py-1 px-4 text-xs h-8 border-accent text-accent"
                disabled={isTraining}
              >
                Lancer
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-paper-dark/30 p-4 rounded-xl border border-dashed border-gray-300 text-center">
        <p className="text-[10px] text-ink-light italic uppercase tracking-widest font-bold">
          "Un corps sain pour un club prospère"
        </p>
      </div>
    </div>
  );
}
