import { useState, useEffect } from 'preact/hooks';
import { db, Player, Team } from '@/db/db';
import { useGameStore } from '@/store/gameSlice';
import { TransferService } from '@/services/transfer-service';
import Card from '@/components/Common/Card';
import Button from '@/components/Common/Button';
import CreditAmount from '@/components/Common/CreditAmount'; // Nouvel import
import PlayerAvatar from '@/components/PlayerAvatar';
import PlayerCard from '@/components/PlayerCard';
import { ShoppingCart, UserPlus } from 'lucide-preact';
import { useTranslation } from 'react-i18next';

export default function TransferMarket() {
  const { t } = useTranslation();
  const currentSaveId = useGameStore(state => state.currentSaveId);
  const userTeamId = useGameStore(state => state.userTeamId);
  
  const [marketPlayers, setMarketPlayers] = useState<Player[]>([]);
  const [userTeam, setUserTeam] = useState<Team | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  const loadData = async () => {
    if (!currentSaveId || !userTeamId) return;
    
    const team = await db.teams.get(userTeamId);
    setUserTeam(team || null);

    let players = await db.players.where('teamId').equals(-1).and(p => p.saveId === currentSaveId).toArray();
    
    if (players.length === 0) {
      await TransferService.generateMarket(currentSaveId, 12, team?.reputation || 50);
      players = await db.players.where('teamId').equals(-1).and(p => p.saveId === currentSaveId).toArray();
    }
    
    setMarketPlayers(players.sort((a, b) => b.skill - a.skill));
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [currentSaveId, userTeamId]);

  const handleBuy = async (player: Player) => {
    if (!userTeamId || !userTeam) return;

    try {
      await TransferService.buyPlayer(player.id!, userTeamId);
      setMessage({ text: `${player.lastName} a rejoint votre club !`, type: 'success' });
      await loadData();
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    }

    setTimeout(() => setMessage(null), 3000);
  };

  if (isLoading) return <div className="p-8 text-center animate-pulse">{t('game.loading')}</div>;

  return (
    <div className="space-y-4 pb-24">
      <div className="flex justify-between items-center px-2">
        <h2 className="text-xl font-serif font-bold text-ink flex items-center gap-2">
          <ShoppingCart />
          Marché des Transferts
        </h2>
        <div className="bg-white px-3 py-1 rounded-full border border-gray-200 shadow-sm">
          <CreditAmount amount={userTeam?.budget || 0} size="md" />
        </div>
      </div>

      {message && (
        <div className={`p-3 rounded-lg text-sm font-bold text-center animate-fade-in ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3">
        {marketPlayers.map(player => (
          <Card key={player.id} noPadding className="hover:border-accent transition-colors">
            <div className="flex items-center p-3 gap-3">
              <PlayerAvatar dna={player.dna} size={48} className="shrink-0" />
              
              <div className="flex-1 min-w-0" onClick={() => setSelectedPlayer(player)}>
                <div className="font-bold text-ink truncate">{player.lastName}</div>
                <div className="flex items-center gap-2 text-[10px] text-ink-light uppercase">
                  <span className="bg-paper-dark px-1 rounded">{player.position}</span>
                  <span>{player.age} ans</span>
                  <span className="font-bold text-accent">Niv. {player.skill}</span>
                </div>
              </div>

              <div className="text-right shrink-0">
                <div className="mb-1">
                   <CreditAmount amount={player.marketValue} size="sm" color="text-ink" />
                </div>
                <Button 
                  onClick={() => handleBuy(player)}
                  variant="primary" 
                  className="py-1 px-3 text-[10px] h-8 w-auto"
                  disabled={!!userTeam && userTeam.budget < player.marketValue}
                >
                  <UserPlus size={12} />
                  ACHETER
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {selectedPlayer && (
        <PlayerCard 
          player={selectedPlayer} 
          onClose={() => setSelectedPlayer(null)} 
        />
      )}
    </div>
  );
}
