import { useState, useEffect } from 'preact/hooks';
import { db, Team, Player } from '@/db/db';
import { useTranslation } from 'react-i18next';
import { Trophy, Users, Landmark, MapPin, X, TrendingUp, Shield, Zap, Target } from 'lucide-preact';
import PlayerAvatar from './PlayerAvatar';

interface ClubDetailsProps {
  teamId: number;
  onClose: () => void;
}

export default function ClubDetails({ teamId, onClose }: ClubDetailsProps) {
  const { t } = useTranslation();
  const [team, setTeam] = useState<Team | null>(null);
  const [keyPlayers, setKeyPlayers] = useState<Player[]>([]);
  const [stats, setStats] = useState({ avgSkill: 0, totalValue: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadClubData = async () => {
      const teamData = await db.teams.get(teamId);
      if (teamData) {
        setTeam(teamData);
        const players = await db.players.where('teamId').equals(teamId).toArray();
        
        // Trier par skill pour avoir les meilleurs
        const sorted = [...players].sort((a, b) => b.skill - a.skill);
        setKeyPlayers(sorted.slice(0, 3));

        const avg = players.reduce((acc, p) => acc + p.skill, 0) / (players.length || 1);
        const totalV = players.reduce((acc, p) => acc + p.marketValue, 0);
        setStats({ avgSkill: Math.round(avg), totalValue: totalV });
      }
      setIsLoading(false);
    };
    loadClubData();
  }, [teamId]);

  if (isLoading || !team) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-paper w-full max-w-sm rounded-2xl shadow-2xl border-x-4 border-t-4 border-paper-dark overflow-hidden relative animate-slide-up" onClick={(e) => e.stopPropagation()}>
        
        {/* Header avec blason/couleur */}
        <div className="bg-paper-dark p-6 text-center border-b border-gray-300 relative">
          <button onClick={onClose} className="absolute top-4 right-4 text-ink-light hover:text-accent p-1 transition-colors">
            <X size={20} />
          </button>
          <div className="w-20 h-20 bg-white rounded-full mx-auto mb-3 flex items-center justify-center border-4 border-accent shadow-lg">
             <Trophy size={40} className="text-accent" />
          </div>
          <h2 className="text-2xl font-serif font-bold text-ink leading-tight">{team.name}</h2>
          <div className="text-[10px] uppercase tracking-[0.3em] text-ink-light font-bold mt-1">Fondé en 1863</div>
        </div>

        <div className="p-5 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Stats de Force */}
          <div className="grid grid-cols-2 gap-3">
             <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm text-center">
                <div className="text-[10px] text-ink-light uppercase font-bold mb-1">Niveau Moyen</div>
                <div className="text-2xl font-mono font-bold text-accent">{stats.avgSkill}</div>
             </div>
             <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm text-center">
                <div className="text-[10px] text-ink-light uppercase font-bold mb-1">Réputation</div>
                <div className="text-2xl font-mono font-bold text-ink">{Math.round(team.reputation)}</div>
             </div>
          </div>

          {/* Infos Club */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
               <div className="w-8 h-8 rounded-lg bg-paper-dark flex items-center justify-center text-accent">
                  <MapPin size={16} />
               </div>
               <div>
                  <div className="text-[10px] text-ink-light uppercase font-bold">Stade</div>
                  <div className="font-bold text-ink">{team.stadiumName} <span className="text-xs font-normal text-ink-light">({team.stadiumCapacity} pl.)</span></div>
               </div>
            </div>
            <div className="flex items-center gap-3 text-sm">
               <div className="w-8 h-8 rounded-lg bg-paper-dark flex items-center justify-center text-accent">
                  <Landmark size={16} />
               </div>
               <div>
                  <div className="text-[10px] text-ink-light uppercase font-bold">Valeur de l'Effectif</div>
                  <div className="font-bold text-ink">£ {stats.totalValue.toLocaleString()}</div>
               </div>
            </div>
            <div className="flex items-center gap-3 text-sm">
               <div className="w-8 h-8 rounded-lg bg-paper-dark flex items-center justify-center text-accent">
                  <Shield size={16} />
               </div>
               <div>
                  <div className="text-[10px] text-ink-light uppercase font-bold">Style Tactique</div>
                  <div className="font-bold text-ink capitalize">{team.tacticType.replace('_', ' ')}</div>
               </div>
            </div>
          </div>

          {/* Joueurs Clés */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-ink-light mb-3 flex items-center gap-2">
               <Users size={14} /> Joueurs à surveiller
            </h3>
            <div className="space-y-2">
               {keyPlayers.map(player => (
                 <div key={player.id} className="flex items-center justify-between p-2 bg-paper-dark/50 rounded-lg border border-gray-100">
                    <div className="flex items-center gap-3">
                       <PlayerAvatar dna={player.dna} size={32} className="border border-white" />
                       <div className="text-sm">
                          <div className="font-bold text-ink">{player.lastName}</div>
                          <div className="text-[10px] text-ink-light font-bold uppercase">{player.position}</div>
                       </div>
                    </div>
                    <div className="font-mono font-bold text-accent">{player.skill}</div>
                 </div>
               ))}
            </div>
          </div>
        </div>

        <div className="p-4 bg-paper-dark border-t border-gray-200">
           <button onClick={onClose} className="w-full py-3 bg-white border border-gray-300 rounded-xl text-ink font-bold shadow-sm active:scale-95 transition-all uppercase text-xs tracking-widest">
              Fermer le dossier
           </button>
        </div>
      </div>
    </div>
  );
}
