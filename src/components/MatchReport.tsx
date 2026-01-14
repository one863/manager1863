import { Match, Team } from '@/db/db';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';

interface MatchReportProps {
  match: Match;
  homeTeam?: Team;
  awayTeam?: Team;
  onClose: () => void;
}

export default function MatchReport({
  match,
  homeTeam,
  awayTeam,
  onClose,
}: MatchReportProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const details = match.details;

  if (!details) return null;

  const handleCopyLogs = () => {
    const logData = {
      matchInfo: {
        id: match.id,
        date: match.date,
        home: homeTeam?.name || 'Home',
        away: awayTeam?.name || 'Away',
        score: `${match.homeScore}-${match.awayScore}`,
        possession: `${details.homePossession}% / ${100 - details.homePossession}%`,
        ratings: {
            // Placeholder: Les ratings ne sont pas stockés dans l'objet Match final actuellement,
            // il faudrait les ajouter au MatchResultSchema si on veut les débugger ici.
            // Pour l'instant on met les stats disponibles
            homeChances: details.stats.homeChances,
            awayChances: details.stats.awayChances
        }
      },
      events: details.events.map(e => ({
        minute: e.minute,
        type: e.type,
        team: e.teamId === match.homeTeamId ? 'Home' : 'Away',
        scorer: e.scorerName,
        desc: e.description
      }))
    };

    navigator.clipboard.writeText(JSON.stringify(logData, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-paper w-full max-w-md rounded-lg shadow-2xl border-4 border-paper-dark overflow-hidden flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Score */}
        <div className="bg-paper-dark p-4 border-b border-gray-300">
          <div className="flex justify-between items-center mb-2 text-xs font-mono text-ink-light uppercase">
            <span>{t('game.date_format', { date: match.date })}</span>
            <div className="flex gap-2">
                <button 
                    onClick={handleCopyLogs}
                    className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded border border-blue-200 hover:bg-blue-200 transition-colors"
                    title="Copy JSON for debugging"
                >
                    {copied ? "Copied!" : "📋 Copy Debug Logs"}
                </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex-1 text-center">
              <div className="font-serif font-bold text-lg leading-tight text-ink">
                {homeTeam?.name || 'Home'}
              </div>
            </div>

            <div className="px-4 py-2 bg-white rounded border border-gray-300 font-mono font-bold text-2xl mx-2 shadow-inner">
              {match.homeScore} - {match.awayScore}
            </div>

            <div className="flex-1 text-center">
              <div className="font-serif font-bold text-lg leading-tight text-ink">
                {awayTeam?.name || 'Away'}
              </div>
            </div>
          </div>
        </div>

        {/* Corps - Stats & Timeline */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Stats Possession */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-ink-light uppercase text-center tracking-widest">
              Possession
            </h3>
            <div className="h-4 bg-gray-200 rounded-full overflow-hidden flex border border-gray-300">
              <div
                className="h-full bg-accent"
                style={{ width: `${details.homePossession}%` }}
              />
              <div
                className="h-full bg-gray-400"
                style={{ width: `${100 - details.homePossession}%` }}
              />
            </div>
            <div className="flex justify-between text-xs font-bold">
              <span>{details.homePossession}%</span>
              <span>{100 - details.homePossession}%</span>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-xs font-bold text-ink-light uppercase text-center tracking-widest">
              Chances
            </h3>
            <div className="flex justify-between text-sm px-8">
              <span className="font-bold text-accent">{details.stats.homeChances}</span>
              <span className="font-bold text-gray-600">{details.stats.awayChances}</span>
            </div>
          </div>

          {/* Timeline Events */}
          <div>
            <h3 className="text-xs font-bold text-ink-light uppercase text-center tracking-widest mb-3 border-b border-gray-200 pb-2">
              Match Events
            </h3>

            <div className="space-y-3">
              {details.events.length === 0 ? (
                <p className="text-center text-sm text-gray-400 italic">
                  No major events.
                </p>
              ) : (
                details.events.map((event, idx) => (
                  <div
                    key={idx}
                    className={`flex gap-3 text-sm ${event.teamId === match.homeTeamId ? 'flex-row' : 'flex-row-reverse text-right'}`}
                  >
                    <div className="font-mono font-bold text-accent w-8 shrink-0 text-center bg-gray-100 rounded py-1 h-fit border border-gray-200">
                      {event.minute}'
                    </div>
                    <div className="flex-1">
                      <div className={`font-bold text-ink flex items-center gap-1 ${event.teamId === match.homeTeamId ? 'justify-start' : 'justify-end'}`}>
                        {event.type === 'GOAL' && '⚽ GOAL!'}
                        {event.type === 'MISS' && '❌ Miss'}
                        {event.type === 'TRANSITION' && '⚡ Transition'}
                        {event.type === 'SET_PIECE' && '🎯 Set Piece'}
                        {event.type === 'SPECIAL' && '🌟 Special Event'}
                        {event.type === 'CARD' && '🟨 Card'}
                      </div>
                      <div className="text-xs text-ink-light leading-relaxed">
                        {event.description}
                      </div>
                       <div className="text-[10px] text-gray-400 mt-1 font-mono">
                           Type: {event.type} {event.scorerName ? `| Player: ${event.scorerName}` : ''}
                       </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-300">
          <button
            onClick={onClose}
            className="w-full py-3 bg-white border border-gray-400 rounded text-ink font-bold shadow-sm hover:bg-gray-100 active:bg-gray-200 transition-colors"
          >
            {t('player_card.close')}
          </button>
        </div>
      </div>
    </div>
  );
}
