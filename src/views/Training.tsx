import { useState, useEffect } from 'preact/hooks';
import { db, Player } from '@/db/db';
import { useGameStore } from '@/store/gameSlice';
import { TrainingService } from '@/services/training-service';
import Card from '@/components/Common/Card';
import Button from '@/components/Common/Button';
import {
  Dumbbell,
  Target,
  Brain,
  Zap,
  AlertTriangle,
  ChevronUp,
} from 'lucide-preact';
import { useTranslation } from 'react-i18next';

export default function Training() {
  const { t } = useTranslation();
  const currentSaveId = useGameStore((state) => state.currentSaveId);
  const userTeamId = useGameStore((state) => state.userTeamId);

  const [results, setResults] = useState<
    { name: string; stat: string }[] | null
  >(null);
  const [isTraining, setIsTraining] = useState(false);
  const [lowEnergyWarning, setLowEnergyWarning] = useState(false);

  useEffect(() => {
    const checkEnergy = async () => {
      if (!userTeamId || !currentSaveId) return;
      const players = await db.players
        .where('[saveId+teamId]')
        .equals([currentSaveId, userTeamId])
        .toArray();
      const avgEnergy =
        players.reduce((acc, p) => acc + p.energy, 0) / players.length;
      setLowEnergyWarning(avgEnergy < 40);
    };
    checkEnergy();
  }, [userTeamId, currentSaveId, results]);

  const handleTrain = async (focus: 'PHYSICAL' | 'TECHNICAL') => {
    if (!currentSaveId || !userTeamId) return;

    setIsTraining(true);
    setResults(null);

    // Petit délai pour simuler l'effort
    setTimeout(async () => {
      const trainingResults = await TrainingService.trainSquad(
        currentSaveId,
        userTeamId,
        focus,
      );
      setResults(trainingResults);
      setIsTraining(false);
    }, 800);
  };

  return (
    <div className="space-y-6 pb-24 animate-fade-in">
      <div className="px-2">
        <h2 className="text-xl font-serif font-bold text-ink flex items-center gap-2">
          <Dumbbell />
          Centre d'Entraînement
        </h2>
        <p className="text-xs text-ink-light italic">
          Développez le potentiel de vos athlètes
        </p>
      </div>

      {lowEnergyWarning && (
        <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg flex gap-3 items-start animate-pulse">
          <AlertTriangle className="text-amber-600 shrink-0" size={20} />
          <p className="text-xs text-amber-800 font-medium">
            Attention : Votre effectif est épuisé. Un entraînement intensif
            pourrait affecter leurs performances au prochain match.
          </p>
        </div>
      )}

      {/* Options d'Entraînement */}
      <div className="grid grid-cols-1 gap-4">
        <Card title="Focus Physique">
          <div className="flex justify-between items-center">
            <div className="flex-1">
              <p className="text-xs text-ink-light mb-2">
                Améliore la Vitesse, la Force et l'Endurance.
              </p>
              <div className="flex gap-2">
                <span className="text-[10px] bg-paper-dark px-2 py-0.5 rounded font-bold">
                  Énergie : -20%
                </span>
              </div>
            </div>
            <Button
              onClick={() => handleTrain('PHYSICAL')}
              variant="primary"
              className="w-auto px-6"
              disabled={isTraining}
            >
              <Zap size={16} />
              Lancer
            </Button>
          </div>
        </Card>

        <Card title="Focus Technique">
          <div className="flex justify-between items-center">
            <div className="flex-1">
              <p className="text-xs text-ink-light mb-2">
                Travail spécifique sur les Tirs, les Passes et le Dribble.
              </p>
              <div className="flex gap-2">
                <span className="text-[10px] bg-paper-dark px-2 py-0.5 rounded font-bold">
                  Énergie : -15%
                </span>
              </div>
            </div>
            <Button
              onClick={() => handleTrain('TECHNICAL')}
              variant="secondary"
              className="w-auto px-6 border-accent text-accent"
              disabled={isTraining}
            >
              <Target size={16} />
              Lancer
            </Button>
          </div>
        </Card>
      </div>

      {/* Résultats du jour */}
      {isTraining && (
        <div className="text-center py-12 flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
          <p className="text-accent font-bold animate-pulse">
            Entraînement en cours...
          </p>
        </div>
      )}

      {results && (
        <Card title="Rapport de Progression" className="animate-slide-up">
          {results.length === 0 ? (
            <p className="text-sm text-ink-light italic text-center py-4">
              Séance terminée. Aucun progrès majeur noté aujourd'hui, mais la
              condition physique a été travaillée.
            </p>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-ink-light mb-3">
                {results.length} joueur(s) ont montré des signes de progression
                :
              </p>
              <div className="max-h-48 overflow-y-auto pr-2 space-y-2">
                {results.map((res, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center bg-paper-dark p-2 rounded text-sm"
                  >
                    <span className="font-bold">{res.name}</span>
                    <div className="flex items-center gap-1 text-green-700 font-bold">
                      <ChevronUp size={14} />
                      <span className="uppercase text-[10px]">{res.stat}</span>
                      <span>+1</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
