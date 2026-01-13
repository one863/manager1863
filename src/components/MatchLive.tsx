import { useEffect, useRef } from 'preact/hooks';
import { useSignal, useComputed } from '@preact/signals';
import { useGameStore } from '@/store/gameSlice';
import { useTranslation } from 'react-i18next';
import Scoreboard from './Match/Scoreboard';
import EventItem from './Match/EventItem';
import Button from './Common/Button';
import { Download } from 'lucide-preact';

export default function MatchLive() {
  const { t } = useTranslation();
  const liveMatch = useGameStore((state) => state.liveMatch);
  const finishLiveMatch = useGameStore((state) => state.finishLiveMatch);

  // Signaux pour les mises à jour ultra-fluides sans re-render complet
  const currentMinute = useSignal(0);
  const homeScore = useSignal(0);
  const awayScore = useSignal(0);
  const displayedEvents = useSignal<any[]>([]);
  const isFinished = useSignal(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!liveMatch) return;
    const TICK_RATE = 200;

    const timer = setInterval(() => {
      if (currentMinute.value >= 90) {
        clearInterval(timer);
        isFinished.value = true;
        return;
      }
      currentMinute.value += 1;

      // Traiter les événements à chaque minute
      const eventsNow = liveMatch.result.events.filter(
        (e: any) => e.minute === currentMinute.value,
      );

      if (eventsNow.length > 0) {
        displayedEvents.value = [...displayedEvents.value, ...eventsNow];

        eventsNow.forEach((e: any) => {
          if (e.type === 'GOAL') {
            if (e.teamId === liveMatch.homeTeam.id) homeScore.value += 1;
            else awayScore.value += 1;
          }
        });

        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }
    }, TICK_RATE);

    return () => clearInterval(timer);
  }, [liveMatch]);

  /**
   * Exporte les logs du match en JSON pour analyse par une IA.
   */
  const exportMatchLogs = () => {
    if (!liveMatch) return;
    const logs = {
      matchInfo: {
        home: liveMatch.homeTeam.name,
        away: liveMatch.awayTeam.name,
        score: `${homeScore.value}-${awayScore.value}`,
        possession: `${liveMatch.result.homePossession}% / ${100 - liveMatch.result.homePossession}%`,
      },
      events: liveMatch.result.events,
    };
    const blob = new Blob([JSON.stringify(logs, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `match_log_${liveMatch.homeTeam.name}_vs_${liveMatch.awayTeam.name}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!liveMatch) return null;

  return (
    <div className="fixed inset-0 z-50 bg-paper flex flex-col">
      <Scoreboard
        homeTeam={liveMatch.homeTeam}
        awayTeam={liveMatch.awayTeam}
        homeScore={homeScore.value}
        awayScore={awayScore.value}
        minute={currentMinute.value}
      />

      <div
        className="flex-1 overflow-y-auto p-4 bg-paper relative"
        ref={scrollRef}
      >
        <div className="text-center py-4 opacity-50 flex justify-between items-center px-4">
          <span className="bg-paper-dark px-3 py-1 rounded-full text-xs font-bold border border-gray-200">
            KICK OFF
          </span>
          {isFinished.value && (
            <button
              onClick={exportMatchLogs}
              type="button"
              className="text-accent hover:underline flex items-center gap-1 text-xs font-bold"
            >
              <Download size={14} /> EXPORTER LOGS IA
            </button>
          )}
        </div>

        <div className="space-y-4 max-w-md mx-auto">
          {displayedEvents.value.map((event, idx) => (
            <EventItem
              key={idx}
              event={event}
              homeTeamId={liveMatch.homeTeam.id!}
            />
          ))}
        </div>

        {isFinished.value && (
          <div className="text-center py-8">
            <span className="bg-accent text-white px-6 py-2 rounded-full text-lg font-bold shadow-lg">
              FULL TIME
            </span>
          </div>
        )}

        <div className="h-24"></div>
      </div>

      <div className="bg-paper-dark p-4 border-t border-gray-300 sticky bottom-0 z-20">
        <div className="max-w-md mx-auto">
          {isFinished.value ? (
            <Button onClick={finishLiveMatch} variant="primary">
              {t('game.continue')}
            </Button>
          ) : (
            <div className="text-center text-xs text-ink-light italic">
              Match in progress...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
