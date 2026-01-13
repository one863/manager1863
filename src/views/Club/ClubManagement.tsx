import { useState, useEffect } from 'preact/hooks';
import { db, Team } from '@/db/db';
import { useGameStore } from '@/store/gameSlice';
import Card from '@/components/Common/Card';
import Button from '@/components/Common/Button';
import CreditAmount from '@/components/Common/CreditAmount'; // Nouvel import
import { 
  Building2, 
  Users, 
  Heart, 
  Star, 
  Construction,
  Award
} from 'lucide-preact';
import { useTranslation } from 'react-i18next';

export default function ClubManagement() {
  const { t } = useTranslation();
  const userTeamId = useGameStore(state => state.userTeamId);
  const [team, setTeam] = useState<Team | null>(null);
  const [squadSize, setSquadSize] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const loadClubData = async () => {
    if (!userTeamId) return;
    const teamData = await db.teams.get(userTeamId);
    setTeam(teamData || null);

    const players = await db.players.where('teamId').equals(userTeamId).count();
    setSquadSize(players);
    setIsLoading(false);
  };

  useEffect(() => {
    loadClubData();
  }, [userTeamId]);

  if (isLoading || !team) return <div className="p-8 text-center animate-pulse">{t('game.loading')}</div>;

  const ProgressBar = ({ label, value, icon: Icon, color = "bg-accent" }: any) => (
    <div className="space-y-1">
      <div className="flex justify-between items-center text-[10px] uppercase font-bold text-ink-light">
        <div className="flex items-center gap-1">
          <Icon size={12} />
          {label}
        </div>
        <span>{value}%</span>
      </div>
      <div className="h-2 bg-paper-dark rounded-full overflow-hidden border border-gray-200">
        <div 
          className={`h-full ${color} transition-all duration-500`} 
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-6 pb-24 animate-fade-in">
      {/* En-tête Club */}
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-serif font-bold text-ink">{team.name}</h2>
        <p className="text-ink-light italic text-sm">Fondé en 1863 • {team.managerName}</p>
      </div>

      {/* Statistiques Vitales */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="flex flex-col items-center text-center py-4">
          <Users className="text-accent mb-2" size={24} />
          <span className="text-2xl font-bold text-ink">{team.fanCount}</span>
          <span className="text-[10px] uppercase text-ink-light tracking-widest">Fans</span>
        </Card>
        <Card className="flex flex-col items-center text-center py-4">
          <Star className="text-yellow-600 mb-2" size={24} />
          <span className="text-2xl font-bold text-ink">{team.reputation}</span>
          <span className="text-[10px] uppercase text-ink-light tracking-widest">Réputation</span>
        </Card>
      </div>

      {/* Confiance & Moral */}
      <Card title="État du Club">
        <div className="space-y-4">
          <ProgressBar 
            label="Confiance des Dirigeants" 
            value={team.confidence} 
            icon={Heart}
            color={team.confidence > 50 ? 'bg-green-600' : 'bg-red-500'}
          />
          <div className="flex justify-between items-center pt-2">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-paper-dark rounded">
                <Users size={16} />
              </div>
              <div>
                <span className="text-[10px] uppercase text-ink-light block">Effectif</span>
                <span className="font-bold text-sm">{squadSize} Joueurs</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-paper-dark rounded">
                <Award size={16} />
              </div>
              <div>
                <span className="text-[10px] uppercase text-ink-light block">Palmarès</span>
                <span className="font-bold text-sm">0 Titres</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Infrastructures */}
      <Card title="Infrastructures">
        <div className="flex items-start gap-4">
          <div className="bg-paper-dark p-4 rounded-lg">
            <Building2 size={32} className="text-accent" />
          </div>
          <div className="flex-1">
            <h4 className="font-bold text-ink">{team.stadiumName}</h4>
            <p className="text-xs text-ink-light mb-3">Niveau {team.stadiumLevel} • {team.stadiumCapacity} Places</p>
            <Button 
              onClick={() => {}} 
              variant="secondary" 
              className="py-2 text-[10px] h-8 w-auto flex items-center gap-2"
            >
              <Construction size={12} />
              AGRANDIR (<CreditAmount amount={team.stadiumLevel * 500} size="sm" color="text-accent" />)
            </Button>
          </div>
        </div>
      </Card>

      {/* Objectifs des Dirigeants */}
      <Card title="Objectifs de la Saison">
        <div className="space-y-2">
           <div className="flex items-center gap-2 text-sm">
             <div className="w-2 h-2 rounded-full bg-accent"></div>
             <p className="text-ink">Maintenir la réputation au dessus de 50</p>
           </div>
           <div className="flex items-center gap-2 text-sm">
             <div className="w-2 h-2 rounded-full bg-gray-300"></div>
             <p className="text-ink-light">Atteindre le top 5 du classement</p>
           </div>
        </div>
      </Card>
    </div>
  );
}
