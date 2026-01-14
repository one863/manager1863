import { useState, lazy, Suspense } from 'preact/compat';
import { useTranslation } from 'react-i18next';
import { Trophy, Calendar as CalendarIcon, Loader2 } from 'lucide-preact';

const LeagueTable = lazy(() => import('./LeagueTable'));
const Calendar = lazy(() => import('./Calendar'));

interface LeagueViewProps {
  onSelectMatch: (id: number) => void;
  initialTab?: 'table' | 'calendar';
}

export default function LeagueView({ onSelectMatch, initialTab = 'table' }: LeagueViewProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'table' | 'calendar'>(initialTab);

  return (
    <div className="flex flex-col h-full animate-fade-in overflow-hidden">
      {/* TABS SELECTOR (Sticky/Static Header) */}
      <div className="flex-shrink-0 mb-4 px-2">
          <div className="flex bg-paper-dark rounded-xl p-1 border border-gray-200 shadow-inner">
            <button
              onClick={() => setActiveTab('table')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'table' ? 'bg-white text-black shadow-sm' : 'text-gray-400'}`}
            >
              <Trophy size={14} /> {t('league_table.title')}
            </button>
            <button
              onClick={() => setActiveTab('calendar')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'calendar' ? 'bg-white text-black shadow-sm' : 'text-gray-400'}`}
            >
              <CalendarIcon size={14} /> {t('calendar.title')}
            </button>
          </div>
      </div>

      {/* CONTENT (Scrollable Area) */}
      <div className="flex-1 overflow-y-auto px-1 scroll-smooth pb-20">
          <Suspense fallback={<div className="p-12 text-center"><Loader2 className="animate-spin mx-auto text-gray-300" /></div>}>
            {activeTab === 'table' ? (
              <LeagueTable hideHeader />
            ) : (
              <Calendar onSelectMatch={onSelectMatch} hideHeader />
            )}
          </Suspense>
      </div>
    </div>
  );
}
