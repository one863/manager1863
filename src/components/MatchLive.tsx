import { useEffect, useRef } from 'preact/hooks';
import { useSignal } from '@preact/signals';
import { useLiveMatchStore } from '@/store/liveMatchStore';
import { useTranslation } from 'react-i18next';
import Scoreboard from './Match/Scoreboard';
import EventItem from './Match/EventItem';
import { Download, FastForward, Copy, Check } from 'lucide-preact';

interface Scorer {
  name: string;
  minute: number;
}

export default function MatchLive() {
  const { t } = useTranslation();
  
  const liveMatch = useLiveMatchStore((state) => state.liveMatch);
  const finishLiveMatch = useLiveMatchStore((state) => state.finishLiveMatch);
  const updateLiveMatchMinute = useLiveMatchStore((state) => state.updateLiveMatchMinute);

  const currentMinute = useSignal(liveMatch?.currentMinute || 0);
  const homeScore = useSignal(0);
  const awayScore = useSignal(0);
  const displayedEvents = useSignal<any[]>([]);
  const isFinished = useSignal(false);
  const copyFeedback = useSignal(false);
  
  const homeScorers = useSignal<Scorer[]>([]);
  const awayScorers = useSignal<Scorer[]>([]);
  const homeChances = useSignal(0);
  const awayChances = useSignal(0);

  // UseRef for pause state to persist across renders/effects
  const isPausedRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Initialisation
  useEffect(() => {
    if (!liveMatch) return;
    const pastEvents = liveMatch.result.events.filter((e: any) => e.minute <= currentMinute.value);
    displayedEvents.value = pastEvents;
    
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
  }, []); // Run once on mount

  // Timer Loop
  useEffect(() => {
    if (!liveMatch || isFinished.value) return;
    
    let tickRate = 200; 

    const timer = setInterval(() => {
      // Check pause ref
      if (isPausedRef.current) return;

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
        
        eventsNow.forEach((e: any) => {
          if (e.teamId === liveMatch.homeTeam.id) homeChances.value++;
          else if (e.teamId === liveMatch.awayTeam.id) awayChances.value++;
        });

        const goals = eventsNow.filter((e: any) => e.type === 'GOAL');
        
        if (goals.length > 0) {
          isPausedRef.current = true;

          // Immediate Score Update (Triggers Scoreboard Flash)
          goals.forEach((g: any) => {
              if (g.teamId === liveMatch.homeTeam.id) {
                  homeScore.value += 1;
                  homeScorers.value = [...homeScorers.value, { name: g.scorerName, minute: g.minute }];
              } else {
                  awayScore.value += 1;
                  awayScorers.value = [...awayScorers.value, { name: g.scorerName, minute: g.minute }];
              }
          });

          // Pause of 3 seconds to let the scoreboard flash
          setTimeout(() => {
            isPausedRef.current = false;
          }, 3000); 
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
    isPausedRef.current = false; // Force unpause
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

  const getLogsObject = () => {
    if (!liveMatch) return null;
    return {
      matchInfo: {
        home: liveMatch.homeTeam.name, away: liveMatch.awayTeam.name,
        score: `${homeScore.value}-${awayScore.value}`,
        possession: `${liveMatch.result.homePossession}% / ${100 - liveMatch.result.homePossession}%`,
      },
      events: liveMatch.result.events,
    };
  };

  const downloadMatchLogs = () => {
    if (!liveMatch) return;
    const logs = getLogsObject();
    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `match_log_${liveMatch.homeTeam.name}_vs_${liveMatch.awayTeam.name}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyMatchLogs = async () => {
      const logs = getLogsObject();
      if (!logs) return;
      
      const text = JSON.stringify(logs, null, 2);
      let success = false;

      // 1. Try execCommand (Synchronous)
      try {
          const textArea = document.createElement("textarea");
          textArea.value = text;
          textArea.style.position = "fixed";
          textArea.style.left = "-9999px";
          textArea.style.top = "0";
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();
          success = document.execCommand('copy');
          document.body.removeChild(textArea);
      } catch (e) {
          console.warn("execCommand failed", e);
      }

      // 2. Fallback to Clipboard API
      if (!success) {
          try {
              await navigator.clipboard.writeText(text);
              success = true;
          } catch (err) {
              console.error("Clipboard API failed", err);
          }
      }

      if (success) {
          copyFeedback.value = true;
          setTimeout(() => copyFeedback.value = false, 2000);
      } else {
          alert("Impossible de copier les logs.");
      }
  };

  if (!liveMatch) return null;

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col font-sans">
      
      {/* DISCREET CONTROLS HEADER */}
      <div className="absolute top-0 left-0 w-full p-3 z-50 flex justify-between pointer-events-none">
          {/* Left: Utilities */}
          <div className="pointer-events-auto flex gap-3">
             {!isFinished.value && (
                <button 
                  onClick={handleSkip} 
                  className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-gray-300 hover:text-gray-900 transition-colors"
                  title="Passer"
                >
                   <FastForward size={14} />
                </button>
             )}
             {isFinished.value && (
                <>
                  <button onClick={downloadMatchLogs} className="text-gray-300 hover:text-gray-900 transition-colors" title="Télécharger">
                      <Download size={14} />
                  </button>
                  <button onClick={copyMatchLogs} className="text-gray-300 hover:text-gray-900 transition-colors" title="Copier logs">
                      {copyFeedback.value ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                  </button>
                </>
             )}
          </div>

          {/* Right: Continue */}
          <div className="pointer-events-auto">
             {isFinished.value && (
                 <button 
                   onClick={finishLiveMatch} 
                   className="text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-gray-900 transition-colors border border-transparent hover:border-gray-200 rounded px-2 py-1"
                 >
                    {t('game.continue')} →
                 </button>
             )}
          </div>
       </div>

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
      <div className="flex-1 overflow-y-auto p-4 bg-white relative scroll-smooth" ref={scrollRef}>
        <div className="space-y-0 max-w-md mx-auto pb-20 mt-4">
          {displayedEvents.value.length === 0 && (
             <div className="text-center py-12 opacity-30">
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Coup d'envoi...</span>
             </div>
          )}

          {displayedEvents.value.map((event, idx) => (
            <EventItem key={idx} event={event} homeTeamId={liveMatch.homeTeam.id!} />
          ))}

          {isFinished.value && (
             <div className="text-center py-8 opacity-30 animate-fade-in">
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Fin du match</span>
             </div>
          )}
        </div>
      </div>
    </div>
  );
}
