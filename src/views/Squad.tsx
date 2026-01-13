import { useState, useEffect } from 'preact/hooks';
import { db, Player } from '@/db/db';
import { useGameStore } from '@/store/gameSlice';
import { useTranslation } from 'react-i18next';
import PlayerCard from '@/components/PlayerCard';
import PlayerAvatar from '@/components/PlayerAvatar';

export default function Squad() {
  const { t } = useTranslation();
  const userTeamId = useGameStore(state => state.userTeamId);
  const currentSaveId = useGameStore(state => state.currentSaveId);
  
  const [players, setPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  useEffect(() => {
    const loadSquad = async () => {
      if (!userTeamId || currentSaveId === null) return;
      
      const squad = await db.players
        .where('[saveId+teamId]')
        .equals([currentSaveId, userTeamId])
        .toArray();
        
      setPlayers(squad);
      setIsLoading(false);
    };

    loadSquad();
  }, [userTeamId, currentSaveId]);

  const getPlayersByPos = (pos: string) => players.filter(p => p.position === pos).sort((a, b) => b.skill - a.skill);

  const PlayerRow = ({ player }: { player: Player }) => (
    <div 
      onClick={() => setSelectedPlayer(player)}
      className="flex items-center justify-between p-3 bg-white border-b border-gray-100 last:border-0 hover:bg-yellow-50 active:bg-yellow-100 cursor-pointer transition-colors"
    >
      <div className="flex items-center gap-3">
        <PlayerAvatar dna={player.dna} size={40} className="border border-gray-200" />
        <div>
          <div className="font-bold text-ink leading-tight">{player.lastName}</div>
          <div className="text-xs text-ink-light flex items-center gap-1">
            <span className={`
              px-1 rounded-[2px] text-[10px] font-bold border
              ${player.position === 'GK' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' : ''}
              ${player.position === 'DEF' ? 'bg-blue-100 text-blue-800 border-blue-300' : ''}
              ${player.position === 'MID' ? 'bg-green-100 text-green-800 border-green-300' : ''}
              ${player.position === 'FWD' ? 'bg-red-100 text-red-800 border-red-300' : ''}
            `}>
              {player.position}
            </span>
            {player.firstName}
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-4 text-right">
        <div className="w-8">
          <div className="text-[10px] text-ink-light uppercase">Age</div>
          <div className="font-mono text-sm">{player.age}</div>
        </div>
        <div className="w-8">
          <div className="text-[10px] text-ink-light uppercase">Skill</div>
          <div className={`font-mono font-bold text-sm ${player.skill > 80 ? 'text-accent' : 'text-ink'}`}>
            {player.skill}
          </div>
        </div>
        <div className="hidden sm:block w-8">
           <div className="text-[10px] text-ink-light uppercase">Cond</div>
           <div className={`font-mono text-xs ${player.condition < 80 ? 'text-red-500' : 'text-green-600'}`}>
             {player.condition}%
           </div>
        </div>
      </div>
    </div>
  );

  if (isLoading) return <div className="p-8 text-center animate-pulse">{t('game.loading')}</div>;

  return (
    <div className="pb-20">
      <div className="flex justify-between items-center mb-4 px-2">
        <h2 className="text-xl font-serif font-bold text-ink">{t('squad.title')}</h2>
        <span className="bg-paper-dark px-2 py-1 rounded text-xs font-mono border border-gray-300">
          {players.length} Joueurs
        </span>
      </div>

      {players.length === 0 ? (
        <div className="p-8 text-center text-ink-light italic bg-white rounded border border-gray-200">
          {t('squad.no_players')}
        </div>
      ) : (
        <div className="space-y-4">
          <section className="rounded-lg overflow-hidden border border-gray-200 shadow-sm">
            <div className="bg-yellow-50 px-3 py-2 border-b border-yellow-100 font-bold text-yellow-800 text-[10px] uppercase tracking-wider">
              {t('squad.gk')}
            </div>
            {getPlayersByPos('GK').map(p => <PlayerRow key={p.id} player={p} />)}
          </section>

          <section className="rounded-lg overflow-hidden border border-gray-200 shadow-sm">
            <div className="bg-blue-50 px-3 py-2 border-b border-blue-100 font-bold text-blue-800 text-[10px] uppercase tracking-wider">
              {t('squad.def')}
            </div>
            {getPlayersByPos('DEF').map(p => <PlayerRow key={p.id} player={p} />)}
          </section>

          <section className="rounded-lg overflow-hidden border border-gray-200 shadow-sm">
            <div className="bg-green-50 px-3 py-2 border-b border-green-100 font-bold text-green-800 text-[10px] uppercase tracking-wider">
              {t('squad.mid')}
            </div>
            {getPlayersByPos('MID').map(p => <PlayerRow key={p.id} player={p} />)}
          </section>

          <section className="rounded-lg overflow-hidden border border-gray-200 shadow-sm">
            <div className="bg-red-50 px-3 py-2 border-b border-red-100 font-bold text-red-800 text-[10px] uppercase tracking-wider">
              {t('squad.fwd')}
            </div>
            {getPlayersByPos('FWD').map(p => <PlayerRow key={p.id} player={p} />)}
          </section>
        </div>
      )}

      {selectedPlayer && (
        <PlayerCard 
          player={selectedPlayer} 
          onClose={() => setSelectedPlayer(null)} 
        />
      )}
    </div>
  );
}
