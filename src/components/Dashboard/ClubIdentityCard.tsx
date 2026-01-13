import { h } from 'preact';
import { useTranslation } from 'react-i18next';
import { Team, League } from '@/db/db';
import { Landmark, Trophy } from 'lucide-preact';

interface ClubIdentityCardProps {
  team: Team | null;
  league: League | null;
  position: number;
}

export default function ClubIdentityCard({ team, league, position }: ClubIdentityCardProps) {
  const { t } = useTranslation();

  const getOrdinal = (n: number) => {
    if (n <= 0) return '-';
    const s = ["th", "st", "nd", "rd"], v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
      <div className="flex justify-between items-start mb-2">
         <h2 className="text-xl font-serif font-bold text-accent truncate">{team?.name || 'Club inconnu'}</h2>
         <span className="bg-paper-dark text-xs font-mono px-2 py-1 rounded border border-gray-200 flex items-center gap-1">
           <Trophy size={12} className="text-accent" />
           {getOrdinal(position)}
         </span>
      </div>
      
      <div className="grid grid-cols-2 gap-4 text-sm mt-3">
        <div className="flex items-center gap-2">
          <div className="bg-paper-dark p-2 rounded">
             <Landmark size={16} className="text-ink-light" />
          </div>
          <div>
            <span className="text-ink-light block text-[10px] uppercase tracking-wider">{t('dashboard.division')}</span>
            <span className="font-semibold block truncate max-w-[100px]">{league?.name || 'Amateur League'}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-paper-dark p-2 rounded">
             <span className="text-lg font-bold text-accent">£</span>
          </div>
          <div>
            <span className="text-ink-light block text-[10px] uppercase tracking-wider">{t('dashboard.finances')}</span>
            <span className="font-semibold text-green-700 block">{team?.budget || 0}</span> 
          </div>
        </div>
      </div>
    </div>
  );
}
