import { useState, useEffect } from 'preact/hooks';
import { db, Player, Team, StaffMember } from '@/db/db';
import { useGameStore } from '@/store/gameSlice';
import { TrainingService } from '@/services/training-service';
import Card from '@/components/Common/Card';
import Button from '@/components/Common/Button';
import {
  Dumbbell,
  Target,
  Zap,
  AlertTriangle,
  ChevronUp,
  Clock,
  CalendarCheck,
  Users2,
  UserPlus,
  Trash2,
  Star
} from 'lucide-preact';
import { useTranslation } from 'react-i18next';

const STAFF_ROLES = {
  'COACH': 'Entraîneur Principal',
  'PHYSICAL_TRAINER': 'Prép. Physique',
  'SCOUT': 'Recruteur'
};

export default function Training() {
  const { t } = useTranslation();
  const currentSaveId = useGameStore((state) => state.currentSaveId);
  const userTeamId = useGameStore((state) => state.userTeamId);
  const currentDay = useGameStore((state) => state.day);

  const [team, setTeam] = useState<Team | null>(null);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [availableStaff, setAvailableStaff] = useState<StaffMember[]>([]);
  const [isTraining, setIsTraining] = useState(false);
  const [lowEnergyWarning, setLowEnergyWarning] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'academy' | 'staff'>('academy');

  const loadData = async () => {
    if (!userTeamId || !currentSaveId) return;
    const [teamData, staffData] = await Promise.all([
      db.teams.get(userTeamId),
      db.staff.where('[saveId+teamId]').equals([currentSaveId, userTeamId]).toArray()
    ]);
    
    setTeam(teamData || null);
    setStaff(staffData);

    const players = await db.players.where('[saveId+teamId]').equals([currentSaveId, userTeamId]).toArray();
    const avgEnergy = players.reduce((acc, p) => acc + p.energy, 0) / (players.length || 1);
    setLowEnergyWarning(avgEnergy < 40);
    
    // Générer du staff à recruter si l'onglet staff est actif
    if (availableStaff.length === 0) {
      generateAvailableStaff();
    }
    
    setIsLoading(false);
  };

  const generateAvailableStaff = () => {
    const names = ['John Smith', 'Thomas Taylor', 'William Brown', 'James Wilson', 'George Walker', 'Edward Moore'];
    const roles: StaffMember['role'][] = ['COACH', 'PHYSICAL_TRAINER', 'SCOUT'];
    const candidates = Array.from({ length: 4 }).map(() => ({
      name: names[Math.floor(Math.random() * names.length)],
      role: roles[Math.floor(Math.random() * roles.length)],
      skill: Math.floor(Math.random() * 30) + 40,
      wage: Math.floor(Math.random() * 50) + 50
    })) as StaffMember[];
    setAvailableStaff(candidates);
  };

  useEffect(() => {
    loadData();
  }, [userTeamId, currentSaveId, currentDay]);

  const handleTrain = async (focus: 'PHYSICAL' | 'TECHNICAL') => {
    if (!currentSaveId || !userTeamId) return;
    setIsTraining(true);
    const result = await TrainingService.startTrainingCycle(userTeamId, focus, currentDay);
    if (result.success) await loadData();
    else alert(result.error);
    setIsTraining(false);
  };

  const hireStaff = async (candidate: StaffMember) => {
    if (!currentSaveId || !userTeamId || !team) return;
    
    // Vérifier si rôle déjà occupé
    if (staff.some(s => s.role === candidate.role)) {
      alert("Ce poste est déjà occupé par un membre de votre staff.");
      return;
    }

    await db.staff.add({ ...candidate, saveId: currentSaveId, teamId: userTeamId });
    setAvailableStaff(prev => prev.filter(s => s !== candidate));
    await loadData();
  };

  const fireStaff = async (id: number) => {
    await db.staff.delete(id);
    await loadData();
  };

  if (isLoading) return <div className="p-8 text-center animate-pulse">{t('game.loading')}</div>;

  const activeTraining = team?.trainingEndDay && team.trainingEndDay > currentDay;
  const daysRemaining = activeTraining ? team.trainingEndDay - currentDay : 0;

  return (
    <div className="space-y-5 pb-24 animate-fade-in">
      <div className="flex bg-paper-dark rounded-xl p-1 mb-4 border border-gray-200 shadow-inner">
        <button
          onClick={() => setActiveTab('academy')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'academy' ? 'bg-white text-accent shadow-sm' : 'text-ink-light'}`}
        >
          <Dumbbell size={16} /> Académie
        </button>
        <button
          onClick={() => setActiveTab('staff')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'staff' ? 'bg-white text-accent shadow-sm' : 'text-ink-light'}`}
        >
          <Users2 size={16} /> Équipe Technique
        </button>
      </div>

      {activeTab === 'academy' ? (
        <div className="space-y-5">
           {lowEnergyWarning && (
            <div className="bg-amber-50 border border-amber-200 p-2 rounded-lg flex gap-2 items-center">
              <AlertTriangle className="text-amber-600 shrink-0" size={16} />
              <p className="text-[10px] text-amber-800 leading-tight">
                <strong>AVIS MÉDICAL :</strong> L'effectif est épuisé. Un cycle intense pourrait être contre-productif.
              </p>
            </div>
          )}

          {activeTraining ? (
            <div className="bg-white border-2 border-accent rounded-xl p-5 shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 p-2 opacity-10"><CalendarCheck size={80} /></div>
              <h3 className="text-sm font-bold text-ink uppercase tracking-widest mb-1">Cycle en cours</h3>
              <p className="text-2xl font-serif font-bold text-accent">Focus {team?.trainingFocus === 'PHYSICAL' ? 'Physique' : 'Technique'}</p>
              <div className="flex items-center gap-2 mt-4 text-ink-light text-xs font-medium">
                 <Clock size={14} /> 
                 <span>Fin prévue dans {daysRemaining} jours (Jour {team!.trainingEndDay})</span>
              </div>
              <div className="mt-4 h-1.5 bg-paper-dark rounded-full overflow-hidden">
                 <div className="h-full bg-accent animate-pulse-slow" style={{ width: `${((7 - daysRemaining) / 7) * 100}%` }}></div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-200 flex items-center justify-between gap-4">
                <div className="bg-paper-dark p-2 rounded-lg"><Zap size={20} className="text-accent" /></div>
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-ink">Constitution & Force</h3>
                  <p className="text-[10px] text-ink-light italic">Améliore la vitesse et la vigueur.</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                   <span className="text-[9px] font-bold text-red-600 flex items-center gap-0.5"><Clock size={10} /> 7 JOURS</span>
                   <Button onClick={() => handleTrain('PHYSICAL')} variant="primary" className="py-1 px-4 text-xs h-8" disabled={isTraining}>Lancer</Button>
                </div>
              </div>

              <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-200 flex items-center justify-between gap-4">
                <div className="bg-paper-dark p-2 rounded-lg"><Target size={20} className="text-blue-600" /></div>
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-ink">Arts du Cuir</h3>
                  <p className="text-[10px] text-ink-light italic">Améliore la frappe et la précision.</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                   <span className="text-[9px] font-bold text-blue-600 flex items-center gap-0.5"><Clock size={10} /> 7 JOURS</span>
                   <Button onClick={() => handleTrain('TECHNICAL')} variant="secondary" className="py-1 px-4 text-xs h-8 border-accent text-accent" disabled={isTraining}>Lancer</Button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6 animate-fade-in">
          {/* STAFF ACTUEL */}
          <div className="space-y-3">
             <h3 className="text-xs font-black text-ink-light uppercase tracking-widest px-2">Mon Staff</h3>
             {staff.length === 0 ? (
               <div className="bg-paper-dark/30 border-2 border-dashed border-gray-200 rounded-2xl p-6 text-center italic text-xs text-ink-light">
                  Aucun membre dans votre équipe technique.
               </div>
             ) : (
               <div className="space-y-2">
                 {staff.map(s => (
                    <div key={s.id} className="bg-white p-4 rounded-2xl border border-gray-200 flex items-center justify-between shadow-sm">
                       <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-accent/10 rounded-full flex items-center justify-center text-accent font-black text-xs">
                             {s.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                             <div className="text-sm font-bold text-ink">{s.name}</div>
                             <div className="text-[10px] text-ink-light font-bold uppercase tracking-tight">{STAFF_ROLES[s.role]}</div>
                          </div>
                       </div>
                       <div className="flex items-center gap-4">
                          <div className="text-right">
                             <div className="text-[9px] font-bold text-accent uppercase">Niv. {s.skill}</div>
                             <div className="text-[9px] font-mono text-ink-light">M{s.wage}/jour</div>
                          </div>
                          <button onClick={() => fireStaff(s.id!)} className="p-2 text-gray-300 hover:text-red-600 transition-colors">
                             <Trash2 size={16} />
                          </button>
                       </div>
                    </div>
                 ))}
               </div>
             )}
          </div>

          {/* RECRUTEMENT */}
          <div className="space-y-3">
             <div className="flex justify-between items-center px-2">
                <h3 className="text-xs font-black text-ink-light uppercase tracking-widest">Candidatures</h3>
                <button onClick={generateAvailableStaff} className="text-[9px] font-bold text-accent uppercase hover:underline">Rafraîchir</button>
             </div>
             <div className="space-y-2">
                {availableStaff.map((s, idx) => (
                  <div key={idx} className="bg-paper-dark/40 p-4 rounded-2xl border border-gray-100 flex items-center justify-between">
                     <div className="flex items-center gap-3">
                        <div className="p-2 bg-white rounded-xl shadow-sm text-ink-light"><Star size={18} /></div>
                        <div>
                           <div className="text-sm font-bold text-ink">{s.name}</div>
                           <div className="text-[10px] text-ink-light font-bold uppercase">{STAFF_ROLES[s.role]}</div>
                        </div>
                     </div>
                     <div className="flex items-center gap-3">
                        <div className="text-right">
                           <div className="text-[9px] font-bold text-accent uppercase">Talent : {s.skill}</div>
                           <div className="text-[9px] font-mono text-ink-light">Salaire : M{s.wage}</div>
                        </div>
                        <button 
                          onClick={() => hireStaff(s)}
                          className="bg-white hover:bg-accent hover:text-white p-2 rounded-xl border border-gray-200 text-accent transition-all shadow-sm active:scale-90"
                        >
                           <UserPlus size={18} />
                        </button>
                     </div>
                  </div>
                ))}
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
