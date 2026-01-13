import { useState, useEffect } from 'preact/hooks';
import { db, CURRENT_DATA_VERSION } from '@/db/db';
import { WorldGenerator } from '@/data/world-generator';
import Button from '@/components/Common/Button';
import { useTranslation } from 'react-i18next';
import { Scroll, Palette, Shield, User, Check } from 'lucide-preact';
import { useGameStore } from '@/store/gameSlice';

const CLUB_COLORS = [
  { name: 'Noir & Blanc', primary: '#171717', secondary: '#ffffff' },
  { name: 'Rouge & Blanc', primary: '#ef4444', secondary: '#ffffff' },
  { name: 'Bleu & Blanc', primary: '#3b82f6', secondary: '#ffffff' },
  { name: 'Vert & Blanc', primary: '#22c55e', secondary: '#ffffff' },
  { name: 'Violet & Blanc', primary: '#a855f7', secondary: '#ffffff' },
  { name: 'Jaune & Bleu', primary: '#eab308', secondary: '#1e40af' },
  { name: 'Ciel & Marine', primary: '#7dd3fc', secondary: '#1e3a8a' },
  { name: 'Bordeaux & Or', primary: '#991b1b', secondary: '#fbbf24' },
  { name: 'Orange & Noir', primary: '#f97316', secondary: '#171717' },
  { name: 'Jaune & Noir', primary: '#facc15', secondary: '#171717' },
  { name: 'Blanc & Rouge', primary: '#ffffff', secondary: '#ef4444' },
  { name: 'Marine & Ciel', primary: '#1e3a8a', secondary: '#7dd3fc' },
  { name: 'Marron & Blanc', primary: '#78350f', secondary: '#ffffff' },
  { name: 'Gris & Bleu', primary: '#6b7280', secondary: '#1e40af' },
  { name: 'Rose & Noir', primary: '#ec4899', secondary: '#171717' },
  { name: 'Menthe & Marine', primary: '#2dd4bf', secondary: '#1e3a8a' },
  { name: 'Rubis & Noir', primary: '#be123c', secondary: '#171717' },
  { name: 'Émeraude & Or', primary: '#065f46', secondary: '#facc15' },
];

export default function CreateTeam({ onGameCreated, onCancel }: { onGameCreated: () => void; onCancel: () => void }) {
  const { t } = useTranslation();
  const initializeStore = useGameStore(state => state.initialize);
  
  const [step, setStep] = useState(1);
  const [managerName, setManagerName] = useState('');
  const [teamName, setTeamName] = useState('');
  const [selectedColor, setSelectedColor] = useState(CLUB_COLORS[0]);
  const [isCreating, setIsCreating] = useState(false);
  const [slots, setSlots] = useState<any[]>([]);

  useEffect(() => {
    db.saveSlots.toArray().then(setSlots);
  }, []);

  const handleCreate = async (slotId: number) => {
    if (!managerName || !teamName || isCreating) return;
    setIsCreating(true);

    try {
      // Nettoyage préalable du slot
      await db.transaction('rw', [db.players, db.teams, db.matches, db.leagues, db.saveSlots, db.gameState, db.news, db.history], async () => {
         await Promise.all([
             db.saveSlots.delete(slotId), 
             db.gameState.delete(slotId), 
             db.players.where('saveId').equals(slotId).delete(), 
             db.teams.where('saveId').equals(slotId).delete(), 
             db.matches.where('saveId').equals(slotId).delete(), 
             db.news.where('saveId').equals(slotId).delete(), 
             db.history.where('saveId').equals(slotId).delete()
         ]);
      });

      // Génération du monde (5 divisions)
      const teamId = await WorldGenerator.generateWorld(
        slotId, 
        teamName, 
        managerName, 
        selectedColor.primary, 
        selectedColor.secondary
      );
      
      // On doit générer les matchs pour la division du joueur (et les autres si possible, mais au moins celle du joueur)
      // generateWorld ne lance pas generateSeasonFixtures. On doit le faire ici pour la ligue du joueur.
      const userTeam = await db.teams.get(teamId);
      if (userTeam) {
          // On génère le calendrier pour TOUTES les ligues du saveId
          // Pour l'instant, le moteur ne simule que les matchs de la ligue courante dans MatchService.checkSeasonEnd
          // Pour la cohérence, générons le calendrier de la division du joueur.
          // Idéalement, on génère pour toutes les divisions pour avoir un univers vivant.
          const leagues = await db.leagues.where('saveId').equals(slotId).toArray();
          const { generateSeasonFixtures } = await import('@/data/league-templates'); // Lazy import
          
          for (const league of leagues) {
             const teamsInLeague = await db.teams.where('leagueId').equals(league.id!).primaryKeys();
             await generateSeasonFixtures(slotId, league.id!, teamsInLeague as number[]);
          }
      }

      const date = new Date('1863-09-01');
      await db.saveSlots.put({ id: slotId, managerName, teamName, presidentName: managerName, season: 1, day: 1, lastPlayedDate: new Date() });
      await db.gameState.put({ saveId: slotId, season: 1, day: 1, currentDate: date, userTeamId: teamId, version: CURRENT_DATA_VERSION, isGameOver: false });

      await initializeStore(slotId, date, teamId, managerName, teamName);
      onGameCreated();
    } catch (e) {
      console.error("Creation error", e);
      alert("Une erreur est survenue lors de la création.");
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper p-4 flex flex-col items-center animate-fade-in pb-20 overflow-y-auto">
      <div className="max-w-md w-full space-y-6">
        <header className="text-center">
          <div className="inline-block p-3 bg-white rounded-full text-accent mb-2 shadow-sm border border-gray-100">
            <Shield size={32} />
          </div>
          <h1 className="text-2xl font-serif font-bold text-ink tracking-tight">{t('create.title')}</h1>
          <p className="text-ink-light italic text-xs">{t('create.subtitle')}</p>
        </header>

        {step === 1 && (
          <div className="space-y-4 animate-slide-up">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-5">
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-black text-ink-light flex items-center gap-1.5 tracking-widest px-1">
                    <User size={10} /> {t('create.manager_label')}
                  </label>
                  <input
                    type="text"
                    value={managerName}
                    onInput={(e) => setManagerName(e.currentTarget.value)}
                    placeholder={t('create.manager_placeholder')}
                    className="w-full bg-paper-dark/30 border-2 border-gray-100 rounded-xl px-4 py-2.5 text-sm text-ink font-serif focus:border-accent outline-none transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-black text-ink-light flex items-center gap-1.5 tracking-widest px-1">
                    <Shield size={10} /> {t('create.club_label')}
                  </label>
                  <input
                    type="text"
                    value={teamName}
                    onInput={(e) => setTeamName(e.currentTarget.value)}
                    placeholder={t('create.club_placeholder')}
                    className="w-full bg-paper-dark/30 border-2 border-gray-100 rounded-xl px-4 py-2.5 text-sm text-ink font-serif focus:border-accent outline-none transition-all"
                  />
                </div>
              </div>

              <div className="space-y-3 pt-1">
                <label className="text-[9px] uppercase font-black text-ink-light flex items-center gap-1.5 tracking-widest px-1">
                  <Palette size={10} /> Couleurs de l'Institution
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {CLUB_COLORS.map((c, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedColor(c)}
                      className={`group relative aspect-square rounded-lg transition-all active:scale-95 border ${selectedColor.name === c.name ? 'border-accent ring-2 ring-accent/20 scale-110 z-10 shadow-md' : 'border-gray-200 hover:border-gray-300'}`}
                    >
                       <div className="h-full w-full rounded-md overflow-hidden flex flex-col">
                          <div className="flex-1" style={{ backgroundColor: c.primary }}></div>
                          <div className="h-1/3" style={{ backgroundColor: c.secondary }}></div>
                       </div>
                       {selectedColor.name === c.name && (
                         <div className="absolute inset-0 flex items-center justify-center bg-accent/10 rounded-md">
                            <Check size={14} className="text-white drop-shadow-md" strokeWidth={5} />
                         </div>
                       )}
                    </button>
                  ))}
                </div>
                <p className="text-[9px] text-center font-bold uppercase tracking-widest text-accent bg-accent/5 py-1 rounded-full">{selectedColor.name}</p>
              </div>
            </div>

            <div className="bg-paper-dark/20 p-4 rounded-xl border border-gray-200">
               <p className="text-[11px] text-ink-light leading-relaxed font-serif italic text-center px-2 opacity-80">
                  "{t('create.charter_text')}"
               </p>
            </div>

            <div className="flex gap-3">
              <button onClick={onCancel} className="flex-1 py-3 text-ink-light font-bold text-[10px] uppercase tracking-widest hover:text-accent">Annuler</button>
              <Button
                onClick={() => setStep(2)}
                disabled={!managerName || !teamName}
                variant="primary"
                className="flex-[2] py-3 text-sm shadow-lg"
              >
                Continuer
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 animate-slide-up">
            <div className="text-center mb-2">
              <h2 className="text-xl font-serif font-bold text-ink leading-tight">Choisir une Partie</h2>
              <p className="text-xs text-ink-light italic">Où souhaitez-vous sceller l'acte de fondation ?</p>
            </div>
            
            <div className="space-y-3">
              {[1, 2, 3].map((id) => {
                const slot = slots.find((s) => s.id === id);
                return (
                  <button
                    key={id}
                    disabled={isCreating}
                    onClick={() => handleCreate(id)}
                    className={`w-full p-4 rounded-2xl border-2 text-left transition-all flex items-center justify-between bg-white hover:border-accent group ${isCreating ? 'opacity-50 grayscale' : ''}`}
                  >
                    <div className="flex items-center gap-4">
                       <div className={`p-2.5 rounded-xl ${slot ? 'bg-amber-100 text-amber-700' : 'bg-paper-dark text-gray-400 group-hover:bg-accent/10 group-hover:text-accent transition-colors'}`}>
                          <Scroll size={20} />
                       </div>
                       <div>
                          <div className="font-bold text-sm text-ink">{slot ? slot.teamName : `Partie vierge #${id}`}</div>
                          <div className="text-[9px] text-ink-light uppercase tracking-widest font-black">
                             {slot ? `Saison ${slot.season || 1}` : 'Libre pour signature'}
                          </div>
                       </div>
                    </div>
                    {slot && <span className="text-[8px] font-black text-red-500 border border-red-200 px-2 py-0.5 rounded uppercase tracking-tighter">Écraser</span>}
                  </button>
                );
              })}
            </div>
            
            {isCreating && (
               <div className="flex flex-col items-center gap-3 py-4">
                  <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-accent font-bold animate-pulse text-[10px] uppercase tracking-widest">Sceau en cours...</p>
               </div>
            )}

            <button 
              disabled={isCreating}
              onClick={() => setStep(1)} 
              className="w-full py-2 text-ink-light font-bold text-[10px] uppercase tracking-widest hover:text-accent transition-colors"
            >
              Modifier l'identité
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
