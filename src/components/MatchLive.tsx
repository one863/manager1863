import { useEffect, useRef } from 'preact/hooks';
import { useSignal } from '@preact/signals';
import { useGameStore } from '@/store/gameSlice'; // On garde pour les traductions ou autre si besoin, mais surtout pour le liveMatchStore
import { useLiveMatchStore } from '@/store/liveMatchStore';
import { useTranslation } from 'react-i18next';
import Scoreboard from './Match/Scoreboard';
import EventItem from './Match/EventItem';
import Button from './Common/Button';
import { Download, FastForward, Trophy } from 'lucide-preact';

interface Scorer {
  name: string;
  minute: number;
}

interface GoalOverlayData {
  scorer: string;
  teamName: string;
  isHome: boolean;
  newHomeScore: number;
  newAwayScore: number;
}

export default function MatchLive() {
  const { t } = useTranslation();
  
  // Utilisation du nouveau store
  const liveMatch = useLiveMatchStore((state) => state.liveMatch);
  const finishLiveMatch = useLiveMatchStore((state) => state.finishLiveMatch);
  const updateLiveMatchMinute = useLiveMatchStore((state) => state.updateLiveMatchMinute);

  const currentMinute = useSignal(liveMatch?.currentMinute || 0);
  const homeScore = useSignal(0);
  const awayScore = useSignal(0);
  const displayedEvents = useSignal<any[]>([]);
  const isFinished = useSignal(false);
  
  // Nouveaux signaux pour stats
  const homeScorers = useSignal<Scorer[]>([]);
  const awayScorers = useSignal<Scorer[]>([]);
  const homeChances = useSignal(0);
  const awayChances = useSignal(0);

  // Overlay But
  const goalOverlay = useSignal<GoalOverlayData | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Initialisation
  useEffect(() => {
    if (!liveMatch) return;
    const pastEvents = liveMatch.result.events.filter((e: any) => e.minute <= currentMinute.value);
    displayedEvents.value = pastEvents;
    
    // Recalculer l'état initial complet
    let h = 0; let a = 0;
    let hChances = 0; let aChances = 0;
    const hScorersList: Scorer[] = [];
    const aScorersList: Scorer[] = [];

    pastEvents.forEach((e: any) => {
      if (e.teamId === liveMatch.homeTeam.id) hChances++;
      else if (e.teamId === liveMatch.awayTeam.id) aChances++;

      if (e.type === 'GOAL') {
        if (e.teamId === liveMatch.homeTeam.id) {
          h++;
          hScorersList.push({ name: e.scorerName, minute: e.minute });
        } else {
          a++;
          aScorersList.push({ name: e.scorerName, minute: e.minute });
        }
      }
    });
    
    homeScore.value = h;
    awayScore.value = a;
    homeChances.value = hChances;
    awayChances.value = aChances;
    homeScorers.value = hScorersList;
    awayScorers.value = aScorersList;
    
    if (currentMinute.value >= 90) isFinished.value = true;
  }, []);

  // Timer Loop
  useEffect(() => {
    if (!liveMatch || isFinished.value) return;
    
    let tickRate = 200; 
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
      
      if (currentMinute.value % 5 === 0) {
        updateLiveMatchMinute(currentMinute.value);
      }

      const eventsNow = liveMatch.result.events.filter(
        (e: any) => e.minute === currentMinute.value,
      );

      if (eventsNow.length > 0) {
        displayedEvents.value = [...displayedEvents.value, ...eventsNow];
        
        // Mise à jour stats
        eventsNow.forEach((e: any) => {
          if (e.teamId === liveMatch.homeTeam.id) homeChances.value++;
          else if (e.teamId === liveMatch.awayTeam.id) awayChances.value++;
        });

        const goalEvent = eventsNow.find((e: any) => e.type === 'GOAL');
        
        if (goalEvent) {
          isPaused = true;
          const isHome = goalEvent.teamId === liveMatch.homeTeam.id;
          const teamName = isHome ? liveMatch.homeTeam.name : liveMatch.awayTeam.name;
          
          // Calculer le futur score pour l'affichage immédiat
          const currentHome = homeScore.value;
          const currentAway = awayScore.value;
          const newHome = isHome ? currentHome + 1 : currentHome;
          const newAway = isHome ? currentAway : currentAway + 1;
          
          // Trigger Overlay
          goalOverlay.value = {
            scorer: goalEvent.scorerName || 'Inconnu',
            teamName: teamName,
            isHome,
            newHomeScore: newHome,
            newAwayScore: newAway
          };

          // Delay score update in scoreboard
          setTimeout(() => {
            if (isHome) {
              homeScore.value += 1;
              homeScorers.value = [...homeScorers.value, { name: goalEvent.scorerName, minute: goalEvent.minute }];
            } else {
              awayScore.value += 1;
              awayScorers.value = [...awayScorers.value, { name: goalEvent.scorerName, minute: goalEvent.minute }];
            }
            
            // Hide overlay and resume
            setTimeout(() => {
              goalOverlay.value = null;
              isPaused = false;
            }, 2500); // 2.5s display time
          }, 800); 
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
    
    // Recalculer le score final
    let h = 0; let a = 0;
    const hScorers: Scorer[] = [];
    const aScorers: Scorer[] = [];
    liveMatch.result.events.forEach((e: any) => {
       if (e.type === 'GOAL') {
         if (e.teamId === liveMatch.homeTeam.id) {
           h++;
           hScorers.push({ name: e.scorerName, minute: e.minute });
         } else {
           a++;
           aScorers.push({ name: e.scorerName, minute: e.minute });
         }
       }
    });
    homeScore.value = h;
    awayScore.value = a;
    homeScorers.value = hScorers;
    awayScorers.value = aScorers;
    
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
    <div className="fixed inset-0 z-50 bg-gray-50 flex flex-col font-sans">
      
      {/* GOAL OVERLAY */}
      {goalOverlay.value && (
        <div className="absolute inset-0 z-[60] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center animate-fade-in p-6 text-center">
          <div className="animate-bounce-in flex flex-col items-center w-full">
            
            {/* BIG SCORE DISPLAY */}
            <div className="flex items-center justify-center gap-4 md:gap-8 mb-8 text-white w-full">
                <div className="text-2xl md:text-4xl font-black opacity-60 w-24 text-right truncate">
                  {liveMatch.homeTeam.name}
                </div>
                <div className="text-6xl md:text-8xl font-black tracking-tighter tabular-nums flex items-center gap-4 bg-white/10 px-6 py-2 md:px-8 md:py-4 rounded-3xl backdrop-blur-sm border border-white/10 shadow-2xl">
                    <span>{goalOverlay.value.newHomeScore}</span>
                    <span className="opacity-50 text-4xl md:text-6xl">-</span>
                    <span>{goalOverlay.value.newAwayScore}</span>
                </div>
                <div className="text-2xl md:text-4xl font-black opacity-60 w-24 text-left truncate">
                  {liveMatch.awayTeam.name}
                </div>
            </div>

            <Trophy size={48} className="text-yellow-400 mx-auto mb-2 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]" />
            <h1 className="text-5xl font-black text-white italic tracking-tighter transform -rotate-2 mb-4">
              BUT !
            </h1>
            <div className="space-y-1">
              <p className="text-3xl font-bold text-white">{goalOverlay.value.scorer}</p>
              <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">pour {goalOverlay.value.teamName}</p>
            </div>
          </div>
        </div>
      )}

      {/* HEADER & SCOREBOARD */}
      <Scoreboard
        homeTeam={liveMatch.homeTeam}
        awayTeam={liveMatch.awayTeam}
        homeScore={homeScore}
        awayScore={awayScore}
        minute={currentMinute}
        homeScorers={homeScorers}
        awayScorers={awayScorers}
        homeChances={homeChances}
        awayChances={awayChances}
        possession={liveMatch.result.homePossession}
      />

      {/* FEED */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50 relative scroll-smooth" ref={scrollRef}>
        
        {!isFinished.value && (
          <button 
            onClick={handleSkip}
            className="fixed top-4 right-4 z-40 bg-white shadow-lg border border-gray-100 p-2 rounded-full text-gray-400 hover:text-gray-900 transition-colors"
            title="Passer à la fin"
          >
            <FastForward size={20} />
          </button>
        )}

        <div className="space-y-4 max-w-md mx-auto pb-20 mt-4">
          {displayedEvents.value.length === 0 && (
             <div className="text-center py-12 opacity-40">
                <div className="animate-spin w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full mx-auto mb-2"></div>
                <span className="text-xs font-bold uppercase tracking-widest">Coup d'envoi...</span>
             </div>
          )}

          {displayedEvents.value.map((event, idx) => (
            <EventItem key={idx} event={event} homeTeamId={liveMatch.homeTeam.id!} />
          ))}
        </div>

        {isFinished.value && (
          <div className="text-center py-12 animate-fade-in mb-24">
            <div className="bg-gray-900 text-white px-8 py-4 rounded-xl shadow-xl inline-flex flex-col items-center border border-gray-700">
              <span className="text-xl font-black italic tracking-tighter">FIN DU MATCH</span>
            </div>
            <div className="mt-4">
               <button onClick={exportMatchLogs} className="text-xs font-bold text-gray-400 hover:text-gray-900 underline">
                 Télécharger le rapport
               </button>
            </div>
          </div>
        )}
      </div>

      {/* FOOTER ACTION */}
      <div className="bg-white p-4 border-t border-gray-200 sticky bottom-0 z-20 pb-8">
        <div className="max-w-md mx-auto">
          {isFinished.value ? (
            <Button onClick={finishLiveMatch} variant="primary" className="w-full py-3 text-base shadow-lg shadow-blue-900/20">
              {t('game.continue')}
            </Button>
          ) : (
            <div className="flex items-center justify-center gap-3 opacity-60">
              <div className="h-1.5 w-1.5 bg-green-500 rounded-full animate-ping"></div>
              <span className="text-xs font-bold uppercase tracking-widest text-gray-500">Live Feed</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
