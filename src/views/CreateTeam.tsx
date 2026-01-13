import { useState, useEffect } from 'preact/hooks';
import { db, SaveSlot, CURRENT_DATA_VERSION } from '@/db/db';
import { useGameStore } from '@/store/gameSlice';
import { useTranslation } from 'react-i18next';
import { generateTeamSquad } from '@/data/players-generator'; 
import { generateLeagueStructure } from '@/data/league-templates'; // NOUVEL IMPORT

interface CreateTeamProps {
  onGameCreated: () => void;
  onCancel: () => void;
}

export default function CreateTeam({ onGameCreated, onCancel }: CreateTeamProps) {
  const { t } = useTranslation();
  
  const [managerName, setManagerName] = useState('');
  const [teamName, setTeamName] = useState('');
  
  const [step, setStep] = useState<1 | 2>(1); 
  const [slots, setSlots] = useState<(SaveSlot | undefined)[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(''); // Pour afficher l'avancement
  
  const initializeGame = useGameStore(state => state.initialize);

  useEffect(() => {
    const loadSlots = async () => {
      const loadedSlots = [];
      for (let i = 1; i <= 10; i++) {
        loadedSlots.push(await db.saveSlots.get(i));
      }
      setSlots(loadedSlots);
    };
    loadSlots();
  }, []);

  const handleInfoSubmit = (e: Event) => {
    e.preventDefault();
    if (managerName && teamName) {
      setStep(2);
    }
  };

  const handleSlotSelect = async (slotId: number) => {
    const slot = slots[slotId - 1];
    if (slot && !confirm(`This slot is already used by "${slot.teamName}". Do you want to overwrite it?`)) return;

    setIsCreating(true);
    setLoadingStatus(t('create.creating'));

    try {
      let createdTeamId = 0;

      // On utilise toujours une transaction pour la cohérence
      await db.transaction('rw', db.players, db.teams, db.matches, db.leagues, db.saveSlots, db.gameState, async () => {
        
        // 1. Nettoyage du slot
        setLoadingStatus("Nettoyage des archives...");
        await db.players.where('saveId').equals(slotId).delete();
        await db.teams.where('saveId').equals(slotId).delete();
        await db.matches.where('saveId').equals(slotId).delete();
        await db.leagues.where('saveId').equals(slotId).delete();
        
        // 2. Création de l'équipe Joueur
        setLoadingStatus("Fondation de votre club...");
        createdTeamId = await db.teams.add({
          saveId: slotId,
          name: teamName,
          leagueId: 0, // Sera mis à jour par generateLeagueStructure
          managerName: managerName, 
          version: CURRENT_DATA_VERSION
        }) as number;

        // 3. Génération des joueurs du Joueur
        const squad = generateTeamSquad(50);
        const playersToInsert = squad.map(player => ({
          ...player,
          saveId: slotId,
          teamId: createdTeamId
        }));
        await db.players.bulkAdd(playersToInsert);
        
        // 4. Génération de la Ligue et des Adversaires
        setLoadingStatus("Organisation de la Football Association...");
        await generateLeagueStructure(slotId, createdTeamId, teamName);
        
      });

      // 5. Init store (après transaction)
      setLoadingStatus("Finalisation...");
      if (createdTeamId > 0) {
          await initializeGame(
            slotId, 
            (new Date('1863-09-01')), 
            createdTeamId,
            managerName,
            teamName
          );
          onGameCreated();
      } else {
        throw new Error("Erreur ID Team");
      }

    } catch (error) {
      console.error("Error creating game:", error);
      setIsCreating(false);
    }
  };

  if (step === 1) {
    return (
      <div className="flex flex-col h-screen max-w-md mx-auto bg-paper p-6 overflow-y-auto">
        <header className="mb-8 text-center">
          <h1 className="text-2xl font-serif font-bold text-accent">{t('create.title')}</h1>
          <p className="text-ink-light text-sm italic mt-1">{t('create.subtitle')}</p>
        </header>

        <form onSubmit={handleInfoSubmit} className="space-y-6 flex-1">
          <div className="space-y-2">
            <label className="block text-sm font-bold text-ink uppercase tracking-wider">
              {t('create.manager_label')}
            </label>
            <input
              type="text"
              value={managerName}
              onInput={(e) => setManagerName(e.currentTarget.value)}
              placeholder={t('create.manager_placeholder')}
              className="w-full p-3 bg-white border border-gray-300 rounded focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-colors"
              required
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-bold text-ink uppercase tracking-wider">
              {t('create.club_label')}
            </label>
            <input
              type="text"
              value={teamName}
              onInput={(e) => setTeamName(e.currentTarget.value)}
              placeholder={t('create.club_placeholder')}
              className="w-full p-3 bg-white border border-gray-300 rounded focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-colors"
              required
            />
          </div>

          <div className="pt-4 text-xs text-ink-light text-justify leading-relaxed bg-paper-dark p-3 rounded border border-gray-200">
            <p>{t('create.charter_text')}</p>
          </div>

          <div className="pt-6 space-y-3">
            <button
              type="submit"
              className="w-full py-4 bg-accent text-white font-bold rounded shadow-lg border-b-4 border-amber-900 active:border-b-0 active:translate-y-1 transition-all"
            >
              {t('create.sign_button')}
            </button>
            
            <button
              type="button"
              onClick={onCancel}
              className="w-full py-3 text-ink-light hover:text-ink transition-colors text-sm"
            >
              {t('create.cancel')}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-paper p-6 overflow-hidden">
      <header className="mb-6 text-center">
        <h1 className="text-xl font-serif font-bold text-accent">{t('create.choose_slot')}</h1>
        <p className="text-ink-light text-sm italic">{t('create.slot_desc')}</p>
      </header>

      {isCreating ? (
         <div className="flex-1 flex flex-col items-center justify-center gap-4">
           <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
           <p className="text-accent font-bold animate-pulse text-center px-8">{loadingStatus}</p>
         </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto space-y-3 pb-safe">
            {slots.map((slot, index) => {
              const slotId = index + 1;
              return (
                <button
                  key={slotId}
                  onClick={() => handleSlotSelect(slotId)}
                  className={`w-full text-left relative border-2 rounded-lg p-3 transition-all
                    ${slot 
                      ? 'bg-paper-dark border-gray-300 opacity-80 hover:opacity-100 hover:border-red-300' 
                      : 'bg-white border-dashed border-gray-300 hover:border-accent hover:shadow-md'
                    }
                  `}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-xs text-ink-light bg-gray-200 px-2 rounded">Slot {slotId}</span>
                    {slot ? <span className="text-xs text-red-500 font-bold">{t('create.slot_occupied')}</span> : <span className="text-xs text-green-600 font-bold">{t('create.slot_free')}</span>}
                  </div>
                  {slot ? (
                    <div className="mt-1">
                      <div className="font-bold text-ink">{slot.teamName}</div>
                      <div className="text-xs text-ink-light">{slot.managerName} - {slot.currentDate.toLocaleDateString()}</div>
                    </div>
                  ) : (
                    <div className="mt-2 text-center text-gray-400 text-sm">{t('create.slot_new')}</div>
                  )}
                </button>
              );
            })}
          </div>
          
          <button 
            onClick={() => setStep(1)} 
            className="mt-4 py-3 w-full text-ink-light hover:text-ink border-t border-gray-200"
          >
            {t('load.back')}
          </button>
        </>
      )}
    </div>
  );
}
