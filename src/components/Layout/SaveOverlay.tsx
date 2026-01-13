import { Save, X } from 'lucide-preact';

interface SaveOverlayProps {
  status: 'saving' | 'verified' | 'error';
}

export function SaveOverlay({ status }: SaveOverlayProps) {
  return (
    <div className="absolute inset-0 bg-paper/60 backdrop-blur-sm z-[100] flex flex-col items-center justify-center animate-fade-in text-center">
      <div className="bg-white p-6 rounded-3xl shadow-2xl border border-gray-100 flex flex-col items-center gap-4 min-w-[220px]">
        
        <div className="relative flex items-center justify-center w-16 h-16">
            {status === 'error' ? (
                <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center animate-scale-in">
                    <X size={32} className="text-red-600" />
                </div>
            ) : (
                <Save 
                    size={48} 
                    className={`transition-all duration-500 ${
                        status === 'verified' 
                            ? 'text-green-600 scale-110' 
                            : 'text-accent animate-pulse'
                    }`} 
                />
            )}
        </div>

        <div>
            {status === 'saving' && (
                <>
                    <p className="text-sm font-bold text-ink uppercase tracking-widest">Enregistrement</p>
                    <p className="text-[10px] text-ink-light italic">Mise à jour des registres...</p>
                </>
            )}
            {status === 'verified' && (
                <>
                    <p className="text-sm font-bold text-green-700 uppercase tracking-widest animate-fade-in">Terminé</p>
                    <p className="text-[10px] text-green-600/70 font-medium animate-fade-in">Archives consolidées</p>
                </>
            )}
            {status === 'error' && (
                <>
                    <p className="text-sm font-bold text-red-600 uppercase tracking-widest">Erreur</p>
                    <p className="text-[10px] text-red-500 font-medium">Échec de la sauvegarde</p>
                </>
            )}
        </div>
      </div>
    </div>
  );
}
