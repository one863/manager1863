import { useState, useEffect, useRef } from 'preact/hooks';
import { db, Player, Team } from '@/db/db';
import { useGameStore } from '@/store/gameSlice';
import { TransferService } from '@/services/transfer-service';
import Card from '@/components/Common/Card';
import Button from '@/components/Common/Button';
import CreditAmount from '@/components/Common/CreditAmount';
import PlayerAvatar from '@/components/PlayerAvatar';
import PlayerCard from '@/components/PlayerCard';
import { ShoppingCart, UserPlus, AlertCircle } from 'lucide-preact';
import { useTranslation } from 'react-i18next';
import { useVirtualizer } from '@tanstack/react-virtual';

export default function TransferMarket() {
  const { t } = useTranslation();
  const currentSaveId = useGameStore((state) => state.currentSaveId);
  const userTeamId = useGameStore((state) => state.userTeamId);

  const [marketPlayers, setMarketPlayers] = useState<Player[]>([]);
  const [userTeam, setUserTeam] = useState<Team | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [playerToBuy, setPlayerToBuy] = useState<Player | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Ref pour le conteneur scrollable
  const parentRef = useRef<HTMLDivElement>(null);

  const loadData = async () => {
    if (!currentSaveId || !userTeamId) return;
    setIsLoading(true);
    
    try {
      const team = await db.teams.get(userTeamId);
      setUserTeam(team || null);

      if (team) {
        // Rafraîchir le marché selon la réputation actuelle
        await TransferService.refreshMarketForReputation(currentSaveId, team.reputation);
      }

      // Charger les joueurs du marché (après rafraîchissement)
      const players = await db.players
        .where('[saveId+teamId]')
        .equals([currentSaveId, -1])
        .toArray();

      // Tri par skill décroissant pour afficher les meilleurs en premier
      players.sort((a, b) => b.skill - a.skill);
      
      setMarketPlayers(players);
    } catch (e) {
      console.error("Erreur chargement marché", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [currentSaveId, userTeamId]);

  // Virtualizer configuration
  const rowVirtualizer = useVirtualizer({
    count: marketPlayers.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100, 
    overscan: 5,
  });

  const confirmBuy = (player: Player) => {
    setPlayerToBuy(player);
  };

  const handleBuy = async () => {
    if (!userTeamId || !userTeam || !playerToBuy) return;

    try {
      await TransferService.buyPlayer(playerToBuy.id!, userTeamId);
      setMessage({ text: `${playerToBuy.lastName} a rejoint votre club !`, type: 'success' });
      setPlayerToBuy(null);
      await loadData(); // Recharger pour enlever le joueur acheté et potentiellement en ajouter d'autres si le pool est bas
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
      setPlayerToBuy(null);
    }
    setTimeout(() => setMessage(null), 3000);
  };

  if (isLoading) return <div className="p-8 text-center animate-pulse">{t('game.loading')}</div>;

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center px-2 mb-4 shrink-0">
        <div className="flex flex-col">
          <h2 className="text-xl font-serif font-bold text-ink flex items-center gap-2">
            <ShoppingCart /> Marché des Transferts
          </h2>
          <span className="text-xs text-ink-light">
            Joueurs intéressés par votre réputation ({userTeam?.reputation || 0})
          </span>
        </div>
        <div className="bg-white px-3 py-1 rounded-full border border-gray-200 shadow-sm">
          <CreditAmount amount={userTeam?.budget || 0} size="md" />
        </div>
      </div>

      {message && (
        <div className={`mb-4 p-3 rounded-lg text-sm font-bold text-center animate-fade-in shrink-0 ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {message.text}
        </div>
      )}

      {/* Container scrollable virtualisé */}
      <div 
        ref={parentRef} 
        className="flex-1 overflow-y-auto"
        style={{ height: '600px', contain: 'strict' }}
      >
        {marketPlayers.length === 0 ? (
          <div className="text-center p-8 text-ink-light">Aucun joueur disponible pour le moment.</div>
        ) : (
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const player = marketPlayers[virtualRow.index];
              return (
                <div
                  key={player.id}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                    paddingBottom: '0.75rem' // Marge visuelle entre les cartes
                  }}
                >
                  <Card noPadding className="hover:border-accent transition-colors h-full">
                    <div className="flex items-center p-3 gap-3 h-full">
                      <PlayerAvatar dna={player.dna} size={48} className="shrink-0 cursor-pointer" onClick={() => setSelectedPlayer(player)} />
                      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setSelectedPlayer(player)}>
                        <div className="font-bold text-ink truncate">{player.lastName}</div>
                        <div className="flex items-center gap-2 text-[10px] text-ink-light uppercase">
                          <span className="bg-paper-dark px-1 rounded">{player.position}</span>
                          <span>{player.age} ans</span>
                          <span className="font-bold text-accent">Niv. {player.skill}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0 flex flex-col items-end gap-1">
                        <CreditAmount amount={player.marketValue} size="sm" color="text-ink" />
                        <Button 
                          onClick={() => confirmBuy(player)} 
                          variant="primary" 
                          className="h-8 w-8 flex items-center justify-center p-0" 
                          disabled={!!userTeam && userTeam.budget < player.marketValue}
                          title="Acheter"
                        >
                          <UserPlus size={16} />
                        </Button>
                      </div>
                    </div>
                  </Card>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL DE CONFIRMATION D'ACHAT */}
      {playerToBuy && (
        <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-white rounded-2xl p-6 shadow-2xl max-w-sm w-full border-2 border-accent">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="p-3 bg-accent/10 rounded-full text-accent">
                <ShoppingCart size={32} />
              </div>
              <h3 className="font-serif font-bold text-xl text-ink">Confirmer l'achat ?</h3>
              <p className="text-sm text-ink-light leading-relaxed">
                Voulez-vous vraiment recruter <span className="font-bold text-ink">{playerToBuy.lastName}</span> pour <span className="font-bold text-accent">{playerToBuy.marketValue} M</span> ?
              </p>
              <div className="flex gap-3 w-full pt-2">
                <Button onClick={() => setPlayerToBuy(null)} variant="secondary" className="flex-1">Annuler</Button>
                <Button onClick={handleBuy} variant="primary" className="flex-1">Confirmer</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedPlayer && (
        <PlayerCard player={selectedPlayer} onClose={() => setSelectedPlayer(null)} />
      )}
    </div>
  );
}
