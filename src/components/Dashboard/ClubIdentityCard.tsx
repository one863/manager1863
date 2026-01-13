import { h } from 'preact';
import { useTranslation } from 'react-i18next';
import { Team, League } from '@/db/db';
import { Landmark, Trophy, ChevronRight } from 'lucide-preact';
import CreditAmount from '../Common/CreditAmount';

interface ClubIdentityCardProps {
  team: Team | null;
  league: League | null;
  position: number;
  onClick?: () => void;
}

export default function ClubIdentityCard({ team, league, position, onClick }: ClubIdentityCardProps) {
  const { t } = useTranslation();

  const getOrdinal = (n: number) => {
    if (n <= 0) return '-';
    const s = ['th', 'st', 'nd', 'rd'], v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  return (
    <div 
      onClick={onClick}
      className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 cursor-pointer hover:border-accent transition-all group active:scale-[0.98]"
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-serif font-bold text-accent truncate max-w-[180px]">
            {team?.name || 'Club inconnu'}
          </h2>
          <ChevronRight size={16} className="text-gray-300 group-hover:text-accent transition-colors" />
        </div>
        <span className="bg-paper-dark text-[10px] font-bold uppercase px-3 py-1 rounded-full border border-gray-200 flex items-center gap-1.5 shadow-sm">
          <Trophy size={10} className="text-accent" />
          {getOrdinal(position)} place
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm mt-4">
        <div className="flex items-center gap-3">
          <div className="bg-paper-dark p-2 rounded-lg">
            <Landmark size={18} className="text-ink-light" />
          </div>
          <div>
            <span className="text-ink-light block text-[9px] font-bold uppercase tracking-widest">Division</span>
            <span className="font-bold block truncate max-w-[100px] text-ink">{league?.name || 'Amateur'}</span>
          </div>
        </div>
        <div className="flex items-center gap-3 border-l border-gray-100 pl-4">
          <div className="bg-paper-dark p-2 rounded-lg">
             <span className="text-accent font-bold">£</span>
          </div>
          <div>
            <span className="text-ink-light block text-[9px] font-bold uppercase tracking-widest">Trésorerie</span>
            <span className="font-bold text-accent"><CreditAmount amount={team?.budget || 0} size="md" /></span>
          </div>
        </div>
      </div>
    </div>
  );
}
