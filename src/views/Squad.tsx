import { useState, useEffect } from 'preact/hooks';
import { db, Player, Team } from '@/db/db';
import { useGameStore } from '@/store/gameSlice';
import { useTranslation } from 'react-i18next';
import PlayerCard from '@/components/PlayerCard';
import PlayerAvatar from '@/components/PlayerAvatar';
import { Check, Star, Settings2, Target, Shield, Zap, TrendingUp, Users, Layout } from 'lucide-preact';
import Button from '@/components/Common/Button';

const FORMATIONS: Record<string, { GK: number, DEF: number, MID: number, FWD: number }> = {
  '4-4-2': { GK: 1, DEF: 4, MID: 4, FWD: 2 },
  '4-3-3': { GK: 1, DEF: 4, MID: 3, FWD: 3 },
  '3-5-2': { GK: 1, DEF: 3, MID: 5, FWD: 2 },
  '3-4-3': { GK: 1, DEF: 3, MID: 4, FWD: 3 },
  '4-2-4': { GK: 1, DEF: 4, MID: 2, FWD: 4 },
  '5-4-1': { GK: 1, DEF: 5, MID: 4, FWD: 1 },
};

export default function Squad() {
  const { t } = useTranslation();
  const userTeamId = useGameStore((state) => state.userTeamId);
  const currentSaveId = useGameStore((state) => state.currentSaveId);
  const day = useGameStore((state) => state.day);

  const [players, setPlayers] = useState<Player[]>([]);
  const [team, setTeam] = useState<Team | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [activeTab, setActiveTab] = useState<'squad' | 'tactics'>('squad');

  const loadData = async () => {
    if (!userTeamId || currentSaveId === null) return;
    const [squad, teamData] = await Promise.all([
      db.players.where('[saveId+teamId]').equals([currentSaveId, userTeamId]).toArray(),
      db.teams.get(userTeamId)
    ]);
    setPlayers(squad);
    if (teamData) setTeam(teamData);
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [userTeamId, currentSaveId, day]);

  const toggleStarter = async (player: Player) => {
    const isCurrentlyStarter = !!player.isStarter;
    const startersCount = players.filter(p => p.isStarter).length;

    if (!isCurrentlyStarter && startersCount >= 11) {
      alert("Vous avez déjà 11 titulaires !");
      return;
    }

    await db.players.update(player.id!, { isStarter: !isCurrentlyStarter });
    loadData();
  };

  const updateTactic = async (tactic: Team['tacticType']) => {
    if (!userTeamId) return;
    await db.teams.update(userTeamId, { tacticType: tactic });
    loadData();
  };

  const updateFormation = async (formation: Team['formation']) => {
    if (!userTeamId) return;
    await db.teams.update(userTeamId, { formation });
    loadData();
  };

  const getPlayersByPos = (pos: string) =>
    players.filter((p) => p.position === pos).sort((a, b) => b.skill - a.skill);

  const PlayerRow = ({ player }: { player: Player }) => (
    <div
      className={`flex items-center justify-between p-3 border-b border-gray-100 last:border-0 hover:bg-yellow-50 transition-colors ${player.isStarter ? 'bg-accent/5 border-l-4 border-l-accent' : 'bg-white'}`}
    >
      <div className="flex items-center gap-3 flex-1 cursor-pointer" onClick={() => setSelectedPlayer(player)}>
        <PlayerAvatar dna={player.dna} size={40} className={`border ${player.isStarter ? 'border-accent shadow-sm' : 'border-gray-200'}`} />
        <div>
          <div className="font-bold text-ink leading-tight flex items-center gap-1">
            {player.lastName}
            {player.isStarter && <Star size={10} className="fill-accent text-accent" />}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`px-1 rounded-[2px] text-[9px] font-bold border ${getPositionClass(player.position)}`}>
              {player.position}{player.position !== 'GK' && ` (${player.side || 'C'})`}
            </span>
            <div className="flex items-center gap-1">
               <div className={`w-1.5 h-1.5 rounded-full ${player.energy > 70 ? 'bg-green-500' : player.energy > 40 ? 'bg-amber-500' : 'bg-red-500'}`}></div>
               <span className="text-[10px] text-ink-light font-mono">{player.energy}% NRJ</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-right">
          <div className="text-[9px] text-ink-light uppercase font-bold tracking-tighter">Skill</div>
          <div className={`font-mono font-bold text-sm ${player.skill > 80 ? 'text-accent' : 'text-ink'}`}>
            {player.skill}
          </div>
        </div>
        
        <button
          onClick={(e) => { e.stopPropagation(); toggleStarter(player); }}
          className={`h-10 w-10 rounded-full flex items-center justify-center transition-all border-2 ${player.isStarter ? 'bg-accent border-accent text-white shadow-md' : 'bg-white border-gray-200 text-gray-200 hover:border-accent/50 hover:text-accent'}`}
        >
          <Check size={20} strokeWidth={3} />
        </button>
      </div>
    </div>
  );

  if (isLoading) return <div className="p-8 text-center animate-pulse">{t('game.loading')}</div>;

  return (
    <div className="pb-24 animate-fade-in">
      <div className="flex bg-paper-dark rounded-xl p-1 mb-6 border border-gray-200 shadow-inner">
        <button
          onClick={() => setActiveTab('squad')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'squad' ? 'bg-white text-accent shadow-sm' : 'text-ink-light'}`}
        >
          <Users size={18} /> Effectif
        </button>
        <button
          onClick={() => setActiveTab('tactics')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'tactics' ? 'bg-white text-accent shadow-sm' : 'text-ink-light'}`}
        >
          <Settings2 size={18} /> Dispositif
        </button>
      </div>

      {activeTab === 'squad' ? (
        <>
          <div className="flex justify-between items-end mb-4 px-2">
            <div>
              <h2 className="text-xl font-serif font-bold text-ink leading-none mb-2">{t('squad.title')}</h2>
              <div className="flex items-center gap-2">
                <span className="text-[10px] bg-paper-dark px-2 py-0.5 rounded border border-gray-200 text-ink-light font-bold uppercase">
                  {players.filter(p => p.isStarter).length} / 11 Mobilisés
                </span>
                <span className="text-[10px] bg-accent/10 px-2 py-0.5 rounded border border-accent/20 text-accent font-bold uppercase italic">
                  {team?.formation || '4-4-2'}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-5">
            {['GK', 'DEF', 'MID', 'FWD'].map(pos => (
              <section key={pos} className="rounded-xl overflow-hidden border border-gray-200 shadow-sm bg-white">
                <div className={`px-3 py-2 border-b font-bold text-[10px] uppercase tracking-widest flex justify-between items-center ${getSectionBgClass(pos)}`}>
                  <span>{t(`squad.${pos.toLowerCase()}`)}</span>
                  <span className="opacity-40">{getPlayersByPos(pos).length}</span>
                </div>
                {getPlayersByPos(pos).map((p) => (
                  <PlayerRow key={p.id} player={p} />
                ))}
              </section>
            ))}
          </div>
        </>
      ) : (
        <div className="space-y-6 animate-fade-in">
          {/* SÉLECTEUR DE FORMATION */}
          <section className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
             <h3 className="text-sm font-bold text-ink-light uppercase tracking-widest mb-4 flex items-center gap-2">
                <Layout size={18} className="text-accent" /> Schéma Tactique
             </h3>
             <div className="grid grid-cols-3 gap-2">
                {Object.keys(FORMATIONS).map(f => (
                   <button
                     key={f}
                     onClick={() => updateFormation(f as any)}
                     className={`py-3 rounded-xl border-2 font-mono font-bold text-sm transition-all ${team?.formation === f ? 'bg-accent border-accent text-white shadow-md' : 'bg-paper-dark border-gray-100 text-ink-light hover:border-gray-300'}`}
                   >
                     {f}
                   </button>
                ))}
             </div>
          </section>

          {/* STYLE DE JEU */}
          <section className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
            <h3 className="text-sm font-bold text-ink-light uppercase tracking-widest mb-4 flex items-center gap-2">
              <Target size={18} className="text-accent" /> Philosophie de Jeu
            </h3>
            <div className="grid grid-cols-1 gap-3">
              <TacticButton 
                active={team?.tacticType === 'NORMAL'} title="Équilibre" desc="Tactique standard."
                icon={TrendingUp} onClick={() => updateTactic('NORMAL')}
              />
              <TacticButton 
                active={team?.tacticType === 'PRESSING'} title="Pressing" desc="Étouffer l'adversaire."
                icon={Zap} onClick={() => updateTactic('PRESSING')}
              />
              <TacticButton 
                active={team?.tacticType === 'CA'} title="Contre-Attaque" desc="Attendre l'erreur et jaillir."
                icon={Shield} onClick={() => updateTactic('CA')}
              />
            </div>
          </section>
        </div>
      )}

      {selectedPlayer && (
        <PlayerCard
          player={selectedPlayer}
          onClose={() => setSelectedPlayer(null)}
          onPlayerAction={loadData}
        />
      )}
    </div>
  );
}

function TacticButton({ active, title, desc, icon: Icon, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className={`flex items-start gap-4 p-4 rounded-xl border-2 transition-all text-left ${active ? 'bg-accent/5 border-accent shadow-sm' : 'bg-white border-gray-100 hover:border-gray-200'}`}
    >
      <div className={`p-2 rounded-lg ${active ? 'bg-accent text-white' : 'bg-gray-100 text-gray-400'}`}>
        <Icon size={20} />
      </div>
      <div>
        <div className={`font-bold text-sm ${active ? 'text-accent' : 'text-ink'}`}>{title}</div>
        <div className="text-[10px] text-ink-light italic">{desc}</div>
      </div>
      {active && <div className="ml-auto mt-1"><Check size={16} className="text-accent" strokeWidth={3} /></div>}
    </button>
  );
}

function getPositionClass(pos: string) {
  switch(pos) {
    case 'GK': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'DEF': return 'bg-blue-100 text-blue-800 border-blue-300';
    case 'MID': return 'bg-green-100 text-green-800 border-green-100';
    case 'FWD': return 'bg-red-100 text-red-800 border-red-300';
    default: return '';
  }
}

function getSectionBgClass(pos: string) {
  switch(pos) {
    case 'GK': return 'bg-yellow-50 text-yellow-800 border-yellow-100';
    case 'DEF': return 'bg-blue-50 text-blue-800 border-blue-100';
    case 'MID': return 'bg-green-50 text-green-800 border-green-100';
    case 'FWD': return 'bg-red-50 text-red-800 border-red-100';
    default: return '';
  }
}
