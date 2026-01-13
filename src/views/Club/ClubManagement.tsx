import { useState, useEffect } from 'preact/hooks';
import { db, Team } from '@/db/db';
import { useGameStore } from '@/store/gameSlice';
import { ClubService } from '@/services/club-service';
import Card from '@/components/Common/Card';
import Button from '@/components/Common/Button';
import CreditAmount from '@/components/Common/CreditAmount';
import {
  Building2,
  Users,
  Heart,
  Star,
  Construction,
  Award,
  AlertTriangle,
  ChevronRight,
  Clock
} from 'lucide-preact';
import { useTranslation } from 'react-i18next';

export default function ClubManagement() {
  const { t } = useTranslation();
  const userTeamId = useGameStore((state) => state.userTeamId);
  const currentDay = useGameStore((state) => state.day);
  const [team, setTeam] = useState<Team | null>(null);
  const [squadSize, setSquadSize] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showUpgradeConfirm, setShowUpgradeConfirm] = useState(false);

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
  }, [userTeamId, currentDay]);

  const handleUpgradeStadium = async () => {
    if (!userTeamId) return;
    const result = await ClubService.upgradeStadium(userTeamId, currentDay);
    if (result.success) {
      setShowUpgradeConfirm(false);
      await loadClubData();
    } else {
      alert(result.error);
    }
  };

  if (isLoading || !team)
    return (
      <div className="p-8 text-center animate-pulse">{t('game.loading')}</div>
    );

  const stadiumLevel = team.stadiumLevel || 1;
  const upgradeCost = stadiumLevel * 500;
  const isUpgrading = team.stadiumUpgradeEndDay && team.stadiumUpgradeEndDay > currentDay;
  const upgradeDaysLeft = isUpgrading ? team.stadiumUpgradeEndDay! - currentDay : 0;

  const ProgressBar = ({
    label,
    value,
    icon: Icon,
    color = 'bg-accent',
  }: any) => (
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
    <div className="space-y-6 pb-24 animate-fade-in relative">
      <div className="text-center space-y-1 px-4">
        <h2 className="text-2xl font-serif font-bold text-ink leading-tight">{team.name}</h2>
        <div className="flex items-center justify-center gap-2 text-ink-light italic text-xs">
          <span>Fondé en 1863</span>
          <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
          <span>Président {team.presidentName || team.managerName}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 px-2">
        <Card className="flex flex-col items-center text-center py-5 border-b-4 border-b-accent shadow-sm">
          <Users className="text-accent mb-3" size={24} />
          <span className="text-2xl font-bold text-ink mb-1">{team.fanCount || 0}</span>
          <span className="text-[10px] uppercase text-ink-light tracking-widest font-black opacity-80">Supporters</span>
        </Card>
        <Card className="flex flex-col items-center text-center py-5 border-b-4 border-b-yellow-600 shadow-sm">
          <Star className="text-yellow-600 mb-3" size={24} />
          <span className="text-2xl font-bold text-ink mb-1">{team.reputation || 0}</span>
          <span className="text-[10px] uppercase text-ink-light tracking-widest font-black opacity-80">Réputation</span>
        </Card>
      </div>

      <Card title="Conseil d'Administration">
        <div className="space-y-5">
          <ProgressBar
            label="Soutien du Board"
            value={team.confidence || 0}
            icon={Heart}
            color={(team.confidence || 0) > 50 ? 'bg-green-600' : 'bg-red-500'}
          />
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-paper-dark rounded-xl border border-gray-100">
                <Users size={16} className="text-ink-light" />
              </div>
              <div>
                <span className="text-[10px] uppercase text-ink-light font-bold block leading-none mb-1">Effectif</span>
                <span className="font-bold text-sm text-ink">{squadSize} Joueurs</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-paper-dark rounded-xl border border-gray-100">
                <Award size={16} className="text-ink-light" />
              </div>
              <div>
                <span className="text-[10px] uppercase text-ink-light font-bold block leading-none mb-1">Palmarès</span>
                <span className="font-bold text-sm text-ink">0 Titres</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card title="Infrastructures">
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-4">
            <div className="bg-paper-dark p-4 rounded-2xl border border-gray-200 shadow-inner">
              <Building2 size={32} className="text-accent" />
            </div>
            <div className="flex-1">
              <h4 className="font-serif font-bold text-lg text-ink leading-tight">{team.stadiumName}</h4>
              <div className="flex items-center gap-2 text-xs text-ink-light mt-1">
                <span className="bg-paper-dark px-2 py-0.5 rounded border border-gray-200 font-bold">Niveau {stadiumLevel}</span>
                <span className="font-medium">{team.stadiumCapacity} Places</span>
              </div>
            </div>
          </div>
          
          {isUpgrading ? (
            <div className="bg-white border-2 border-accent rounded-xl p-4 shadow-sm relative overflow-hidden">
               <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                     <Construction size={18} className="text-accent animate-spin-slow" />
                     <span className="text-xs font-bold text-ink uppercase tracking-tight">Chantier en cours</span>
                  </div>
                  <span className="text-[10px] font-bold text-accent">{upgradeDaysLeft} JOURS RESTANTS</span>
               </div>
               <div className="h-1.5 bg-paper-dark rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-accent animate-pulse" 
                    style={{ width: `${((14 - upgradeDaysLeft) / 14) * 100}%` }}
                  ></div>
               </div>
               <p className="text-[9px] text-ink-light italic mt-2 text-center">Les ouvriers travaillent sur les nouvelles tribunes.</p>
            </div>
          ) : (
            <button
              onClick={() => setShowUpgradeConfirm(true)}
              className="w-full bg-paper-dark hover:bg-gray-200 border border-gray-300 p-3 rounded-xl flex items-center justify-between transition-all group active:scale-[0.98]"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-lg group-hover:bg-accent group-hover:text-white transition-colors">
                  <Construction size={18} />
                </div>
                <div className="text-left">
                  <span className="block text-xs font-bold text-ink uppercase tracking-tight">Agrandir le stade</span>
                  <span className="text-[10px] text-ink-light italic">+400 nouvelles places</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <CreditAmount amount={upgradeCost} size="sm" color="text-accent font-bold" />
                <ChevronRight size={16} className="text-gray-400" />
              </div>
            </button>
          )}
        </div>
      </Card>

      {showUpgradeConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-white rounded-2xl p-6 shadow-2xl border-4 border-paper-dark max-w-sm w-full animate-slide-up">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="bg-accent/10 p-4 rounded-full text-accent">
                <Construction size={40} />
              </div>
              <div>
                <h3 className="text-xl font-serif font-bold text-ink">Agrandir le stade</h3>
                <p className="text-sm text-ink-light mt-2 leading-relaxed">
                  Souhaitez-vous investir <span className="font-bold text-accent">£{upgradeCost}</span> pour ajouter <span className="font-bold text-ink">400 places</span> à votre stade ?
                </p>
                <p className="text-[10px] text-ink-light italic mt-2">Délai de livraison : 14 jours.</p>
              </div>
              <div className="flex gap-3 w-full mt-4">
                <button onClick={() => setShowUpgradeConfirm(false)} className="flex-1 py-3 border border-gray-300 rounded-xl font-bold text-ink-light hover:bg-gray-50">ANNULER</button>
                <button onClick={handleUpgradeStadium} className="flex-1 py-3 bg-accent text-white rounded-xl font-bold shadow-lg hover:bg-amber-700 transition-colors">INVESTIR</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Card title="Objectifs de la Saison">
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-2 rounded-lg bg-paper-dark/50 border border-gray-100">
            <div className={`w-2 h-2 rounded-full ${team.reputation >= 50 ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <p className="text-xs text-ink font-medium">Réputation minimale de 50</p>
          </div>
          <div className="flex items-center gap-3 p-2 rounded-lg bg-paper-dark/50 border border-gray-100">
            <div className={`w-2 h-2 rounded-full bg-gray-300`}></div>
            <p className="text-xs text-ink font-medium uppercase">
              Objectif : <span className="font-bold text-accent">{team.seasonGoal ? t(`season_goals.${team.seasonGoal}`) : t('season_goals.MID_TABLE')}</span>
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
