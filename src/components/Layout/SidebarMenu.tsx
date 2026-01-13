import { 
  Calendar as CalendarIcon, 
  Dumbbell, 
  Building2, 
  Coins, 
  LogOut 
} from 'lucide-preact';

interface SidebarMenuProps {
  currentView: string;
  onNavigate: (view: any) => void;
  onQuit: () => void;
  onClose: () => void;
}

export function SidebarMenu({ currentView, onNavigate, onQuit, onClose }: SidebarMenuProps) {
  return (
    <>
      <div
        className="absolute inset-0 bg-black/20 backdrop-blur-[2px] z-40 transition-opacity animate-fade-in"
        onClick={onClose}
      />
      <div
        className="absolute top-16 left-4 w-64 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden animate-slide-up"
      >
        <div className="p-2 space-y-1">
          <MenuLink
            icon={CalendarIcon}
            label="Calendrier"
            active={currentView === 'calendar'}
            onClick={() => onNavigate('calendar')}
          />
          <MenuLink
            icon={Dumbbell}
            label="Entraînement"
            active={currentView === 'training'}
            onClick={() => onNavigate('training')}
          />
          <MenuLink
            icon={Building2}
            label="Infrastructures"
            active={currentView === 'club'}
            onClick={() => onNavigate('club')}
          />
          <MenuLink
            icon={Coins}
            label="Finances & Sponsors"
            active={currentView === 'finances'}
            onClick={() => onNavigate('finances')}
          />
          <div className="border-t border-gray-100 my-1" />
          <button
            onClick={onQuit}
            className="w-full flex items-center gap-3 p-3 text-red-600 hover:bg-red-50 transition-colors rounded-lg font-bold text-sm"
          >
            <LogOut size={18} />
            Quitter la partie
          </button>
        </div>
      </div>
    </>
  );
}

function MenuLink({ icon: Icon, label, active, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-3 transition-colors rounded-lg text-sm font-medium ${active ? 'bg-accent/10 text-accent font-bold' : 'text-ink hover:bg-gray-50'}`}
    >
      <Icon size={18} />
      {label}
    </button>
  );
}
