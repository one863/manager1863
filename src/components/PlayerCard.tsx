import { Player } from '@/db/db';
import { useTranslation } from 'react-i18next';
import PlayerAvatar from './PlayerAvatar';

interface PlayerCardProps {
  player: Player | null;
  onClose: () => void;
}

export default function PlayerCard({ player, onClose }: PlayerCardProps) {
  const { t } = useTranslation();

  if (!player) return null;

  const getPositionColor = (pos: string) => {
    switch (pos) {
      case 'GK': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'DEF': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'MID': return 'bg-green-100 text-green-800 border-green-300';
      case 'FWD': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100';
    }
  };

  const StatBar = ({ label, value }: { label: string, value: number }) => (
    <div className="flex items-center text-xs mb-1">
      <span className="w-20 text-ink-light truncate">{label}</span>
      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden border border-gray-300">
        <div 
          className="h-full bg-accent" 
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
      <span className="w-8 text-right font-mono font-bold text-ink">{value}</span>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div 
        className="bg-paper w-full max-w-sm rounded-lg shadow-2xl border-4 border-paper-dark overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Carte */}
        <div className="bg-paper-dark p-4 border-b border-gray-300 flex justify-between items-start">
          <div className="flex gap-4 items-center">
            <PlayerAvatar dna={player.dna} size={64} className="border-2 border-accent shadow-md" />
            <div>
              <h2 className="text-xl font-serif font-bold text-accent leading-tight">
                {player.firstName} {player.lastName}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span className={`px-2 py-0.5 rounded text-xs font-bold border ${getPositionColor(player.position)}`}>
                  {player.position}
                </span>
                <span className="text-sm text-ink-light">{player.age} ans</span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-ink">{player.skill}</div>
            <div className="text-[10px] text-ink-light uppercase tracking-widest">Skill</div>
          </div>
        </div>

        {/* Corps de la carte - Scrollable si petit écran */}
        <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
          
          {/* Info Contrat & Forme */}
          <div className="grid grid-cols-2 gap-3 text-sm bg-white p-3 rounded border border-gray-200 shadow-sm">
            <div>
              <span className="block text-[10px] text-ink-light uppercase">{t('player_card.value')}</span>
              <span className="font-bold">£ {player.marketValue}</span>
            </div>
            <div>
              <span className="block text-[10px] text-ink-light uppercase">{t('player_card.wage')}</span>
              <span className="font-bold">£ {player.wage}/s</span>
            </div>
            <div>
              <span className="block text-[10px] text-ink-light uppercase">{t('player_card.condition')}</span>
              <span className={`font-bold ${player.condition < 80 ? 'text-red-600' : 'text-green-700'}`}>{player.condition}%</span>
            </div>
            <div>
              <span className="block text-[10px] text-ink-light uppercase">{t('player_card.morale')}</span>
              <span className="font-bold text-blue-700">{player.morale}%</span>
            </div>
          </div>

          {/* Attributs */}
          <div>
            <h3 className="text-sm font-bold text-ink uppercase tracking-wider mb-2 border-b border-gray-300 pb-1">
              {t('player_card.physical')}
            </h3>
            <StatBar label={t('player_card.speed')} value={player.stats.speed} />
            <StatBar label={t('player_card.strength')} value={player.stats.strength} />
            <StatBar label={t('player_card.stamina')} value={player.stats.stamina} />
          </div>

          <div>
            <h3 className="text-sm font-bold text-ink uppercase tracking-wider mb-2 border-b border-gray-300 pb-1">
              {t('player_card.technical')}
            </h3>
            <StatBar label={t('player_card.shooting')} value={player.stats.shooting} />
            <StatBar label={t('player_card.passing')} value={player.stats.passing} />
            <StatBar label={t('player_card.dribbling')} value={player.stats.dribbling} />
            <StatBar label={t('player_card.defense')} value={player.stats.defense} />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-paper-dark border-t border-gray-300">
          <button 
            onClick={onClose}
            className="w-full py-3 bg-white border border-gray-400 rounded text-ink font-bold shadow-sm hover:bg-gray-50 active:bg-gray-200"
          >
            {t('player_card.close')}
          </button>
        </div>
      </div>
    </div>
  );
}
