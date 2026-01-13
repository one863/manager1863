import { useEffect, useRef } from 'preact/hooks';
import { useSignal } from '@preact/signals';
import { useGameStore } from '@/store/gameSlice';
import { useTranslation } from 'react-i18next';
import Scoreboard from './Match/Scoreboard';
import EventItem from './Match/EventItem';
import Button from './Common/Button';
import { Download, FastForward } from 'lucide-preact';

export default function MatchLive() {
  const { t } = useTranslation();
  const liveMatch = useGameStore((state) => state.liveMatch);
  const finishLiveMatch = useGameStore((state) => state.finishLiveMatch);
  const updateLiveMatchMinute = useGameStore((state) => state.updateLiveMatchMinute);

  const currentMinute = useSignal(liveMatch?.currentMinute || 0);
  const homeScore = useSignal(0);
  const awayScore = useSignal(0);
  const displayedEvents = useSignal<any[]>([]);
  const isFinished = useSignal(false);
  const isGoalFlash = useSignal(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Initialisation du score et des événements si reprise en cours de match
  useEffect(() => {
    if (!liveMatch) return;
    const pastEvents = liveMatch.result.events.filter((e: any) => e.minute <= currentMinute.value);
    displayedEvents.value = pastEvents;
    
    let h = 0; let a = 0;
    pastEvents.forEach((e: any) => {
      if (e.type === 'GOAL') {
        if (e.teamId === liveMatch.homeTeam.id) h++;
        else a++;
      }
    });
    homeScore.value = h;
    awayScore.value = a;
    
    if (currentMinute.value >= 90) isFinished.value = true;
  }, []);

  useEffect(() => {
    if (!liveMatch || isFinished.value) return;
    
    let tickRate = 150;
    let isPaused = false;

    const timer = setInterval(() => {
      if (isPaused) return;

      if (currentMinute.value >= 90) {
        clearInterval(timer);
        isFinished.value = true;
        updateLiveMatchMinute(90);
        return;
      }
      
      currentMinute.value += 1;
      
      // Sauvegarder la progression toutes les 5 minutes pour ne pas trop solliciter l'IDB
      if (currentMinute.value % 5 === 0) {
        updateLiveMatchMinute(currentMinute.value);
      }

      const eventsNow = liveMatch.result.events.filter(
        (e: any) => e.minute === currentMinute.value,
      );

      if (eventsNow.length > 0) {
        displayedEvents.value = [...displayedEvents.value, ...eventsNow];
        const hasGoal = eventsNow.some((e: any) => e.type === 'GOAL');
        
        if (hasGoal) {
          isPaused = true;
          isGoalFlash.value = true;
          setTimeout(() => {
            eventsNow.forEach((e: any) => {
              if (e.type === 'GOAL') {
                if (e.teamId === liveMatch.homeTeam.id) homeScore.value += 1;
                else awayScore.value += 1;
              }
            });
            setTimeout(() => {
              isGoalFlash.value = false;
              isPaused = false;
            }, 1500);
          }, 500);
        }

        if (scrollRef.current) {
          setTimeout(() => {
            if (scrollRef.current) {
              scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
            }
          }, 50);
        }
      }
    }, tickRate);

    return () => clearInterval(timer);
  }, [liveMatch, isFinished.value]);

  const handleSkip = () => {
    if (!liveMatch) return;
    currentMinute.value = 90;
    isFinished.value = true;
    displayedEvents.value = liveMatch.result.events;
    homeScore.value = liveMatch.result.homeScore;
    awayScore.value = liveMatch.result.awayScore;
    updateLiveMatchMinute(90);
  };

  const exportMatchLogs = () => {
    if (!liveMatch) return;
    const logs = {
      matchInfo: {
        home: liveMatch.homeTeam.name, away: liveMatch.awayTeam.name,
        score: `${homeScore.value}-${awayScore.value}`,
        possession: `${liveMatch.result.homePossession}% / ${100 - liveMatch.result.homePossession}%`,
      },
      events: liveMatch.result.events,
    };
    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `match_log_${liveMatch.homeTeam.name}_vs_${liveMatch.awayTeam.name}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!liveMatch) return null;

  return (
    <div className={`fixed inset-0 z-50 bg-paper flex flex-col transition-colors duration-200 ${isGoalFlash.value ? 'bg-yellow-400' : ''}`}>
      <div className={`transition-transform duration-200 ${isGoalFlash.value ? 'scale-110' : 'scale-100'}`}>
        <Scoreboard
          homeTeam={liveMatch.homeTeam}
          awayTeam={liveMatch.awayTeam}
          homeScore={homeScore.value}
          awayScore={awayScore.value}
          minute={currentMinute.value}
        />
      </div>

      <div className="flex-1 overflow-y-auto p-4 bg-paper/50 relative scroll-smooth" ref={scrollRef}>
        {!isFinished.value && (
          <button 
            onClick={handleSkip}
            className="absolute top-2 right-2 z-30 bg-white/80 backdrop-blur-sm border border-gray-200 px-3 py-1.5 rounded-full text-[10px] font-bold text-ink-light flex items-center gap-1 shadow-sm active:scale-95"
          >
            <FastForward size={12} /> PASSER L'ANIMATION
          </button>
        )}

        {isGoalFlash.value && (
          <div className="sticky top-0 z-30 text-center animate-bounce mt-4">
            <span className="bg-accent text-white px-8 py-2 rounded-full font-black text-xl shadow-2xl border-4 border-white italic">
              GOOOOOAL !!!
            </span>
          </div>
        )}

        <div className="text-center py-4 opacity-50 flex justify-between items-center px-4">
          <span className="bg-paper-dark px-3 py-1 rounded-full text-[10px] font-bold border border-gray-200 uppercase tracking-widest">
            Début du Match
          </span>
          {isFinished.value && (
            <button onClick={exportMatchLogs} type="button" className="text-accent hover:underline flex items-center gap-1 text-[10px] font-bold">
              <Download size={12} /> LOGS IA
            </button>
          )}
        </div>

        <div className="space-y-6 max-w-md mx-auto pb-20">
          {displayedEvents.value.map((event, idx) => (
            <EventItem key={idx} event={event} homeTeamId={liveMatch.homeTeam.id!} />
          ))}
        </div>

        {isFinished.value && (
          <div className="text-center py-12 animate-fade-in">
            <div className="bg-accent text-white px-8 py-4 rounded-2xl shadow-xl inline-flex flex-col items-center">
              <span className="text-2xl font-black italic tracking-tighter">COUP DE SIFFLET FINAL</span>
              <span className="text-xs font-bold opacity-80 uppercase tracking-widest mt-1">Match terminé</span>
            </div>
          </div>
        )}
        <div className="h-32"></div>
      </div>

      <div className="bg-white p-4 border-t border-gray-300 sticky bottom-0 z-20 shadow-[0_-10px_20px_rgba(0,0,0,0.05)]">
        <div className="max-w-md mx-auto">
          {isFinished.value ? (
            <Button onClick={finishLiveMatch} variant="primary" className="w-full py-4 text-lg">
              {t('game.continue')}
            </Button>
          ) : (
            <div className="flex items-center justify-center gap-2 text-xs text-ink-light font-serif italic">
              <div className="w-2 h-2 bg-accent rounded-full animate-ping"></div>
              Match en cours...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
