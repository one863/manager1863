import { h } from 'preact';
import { useTranslation } from 'react-i18next';
import { Team, League } from '@/db/db';
import { Landmark, Trophy, ChevronRight, Shield } from 'lucide-preact';
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
    const s = ['e', 'er'], v = n % 100;
    return n + (n === 1 ? 'er' : 'e');
  };

  return (
    <div 
      onClick={onClick}
      className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 cursor-pointer hover:border-accent transition-all group active:scale-[0.98] relative overflow-hidden"
    >
      {/* Petit rappel de couleur en fond */}
      <div 
        className="absolute top-0 right-0 w-32 h-32 opacity-[0.03] pointer-events-none -mr-8 -mt-8"
        style={{ backgroundColor: team?.primaryColor || '#991b1b', borderRadius: '100%' }}
      ></div>

      <div className="flex justify-between items-start mb-2 relative z-10">
        <div className="flex items-center gap-3">
          {/* ÉCUSSON BICOLORE DU CLUB */}
          <div className="relative w-12 h-12 rounded-xl overflow-hidden shadow-sm border border-gray-100 flex flex-col shrink-0">
             <div className="flex-1" style={{ backgroundColor: team?.primaryColor || '#991b1b' }}></div>
             <div className="h-1/3" style={{ backgroundColor: team?.secondaryColor || '#ffffff' }}></div>
             <div className="absolute inset-0 flex items-center justify-center">
                <Shield size={20} className="text-white/30" strokeWidth={3} />
             </div>
          </div>
          
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-xl font-serif font-black text-ink truncate max-w-[150px] leading-tight">
                {team?.name || 'Club inconnu'}
              </h2>
              <ChevronRight size={14} className="text-gray-300 group-hover:text-accent transition-colors" />
            </div>
            <p className="text-[10px] text-ink-light font-black uppercase tracking-widest opacity-60">
              Institution Fondée en 1863
            </p>
          </div>
        </div>
        <span className="bg-paper-dark text-[10px] font-black uppercase px-3 py-1.5 rounded-full border border-gray-200 flex items-center gap-1.5 shadow-sm text-ink-light">
          <Trophy size={10} className="text-accent" />
          {getOrdinal(position)} place
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm mt-5 relative z-10">
        <div className="flex items-center gap-3">
          <div className="bg-paper-dark p-2 rounded-xl border border-gray-100 shadow-inner">
            <Landmark size={18} className="text-ink-light" />
          </div>
          <div>
            <span className="text-ink-light block text-[9px] font-black uppercase tracking-widest opacity-50">Ligue</span>
            <span className="font-bold block truncate max-w-[100px] text-ink text-xs">{league?.name || 'Amateur'}</span>
          </div>
        </div>
        <div className="flex items-center gap-3 border-l border-gray-100 pl-4">
          <div className="bg-paper-dark p-2 rounded-xl border border-gray-100 shadow-inner">
             <span className="text-accent font-black text-xs">£</span>
          </div>
          <div>
            <span className="text-ink-light block text-[9px] font-black uppercase tracking-widest opacity-50">Budget</span>
            <span className="font-black text-accent text-sm"><CreditAmount amount={team?.budget || 0} size="sm" /></span>
          </div>
        </div>
      </div>
    </div>
  );
}
