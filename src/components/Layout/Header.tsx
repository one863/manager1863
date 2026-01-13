import { useTranslation } from 'react-i18next';
import { Menu, X, ChevronRight, Loader2 } from 'lucide-preact';

interface HeaderProps {
  currentDate: Date;
  isProcessing: boolean;
  showOverlay: boolean;
  isMenuOpen: boolean;
  onToggleMenu: () => void;
  onContinue: () => void;
}

export function Header({ 
  currentDate, 
  isProcessing, 
  showOverlay, 
  isMenuOpen, 
  onToggleMenu, 
  onContinue 
}: HeaderProps) {
  const { t } = useTranslation();

  return (
    <header className="bg-paper-dark p-4 border-b border-gray-300 flex justify-between items-center sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMenu}
          className="p-2 hover:bg-white/50 rounded-full transition-colors text-accent"
        >
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
        <h1 className="text-xl font-serif font-bold text-accent tracking-tight">
          1863
        </h1>
      </div>

      <div className="flex items-center gap-2">
        <div className="text-xs font-mono text-ink-light bg-white px-3 py-1.5 rounded-full border border-gray-200 shadow-sm">
          {t('game.date_format', { date: currentDate })}
        </div>

        <button
          onClick={onContinue}
          disabled={isProcessing || showOverlay}
          className="bg-accent text-white font-bold py-1.5 px-3 rounded-full shadow-sm flex items-center gap-1 hover:scale-105 active:scale-95 transition-transform disabled:opacity-70 disabled:scale-100"
        >
          {isProcessing || showOverlay ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <ChevronRight size={18} strokeWidth={3} />
          )}
        </button>
      </div>
    </header>
  );
}
