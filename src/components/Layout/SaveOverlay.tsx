import { Save, CheckCircle2, X, FileCheck } from 'lucide-preact';

interface SaveOverlayProps {
  status: 'saving' | 'verified' | 'error';
}

export function SaveOverlay({ status }: SaveOverlayProps) {
  return (
    <div className="absolute inset-0 bg-paper/60 backdrop-blur-sm z-[100] flex flex-col items-center justify-center animate-fade-in text-center">
      <div className="bg-white p-6 rounded-3xl shadow-2xl border border-gray-100 flex flex-col items-center gap-4 min-w-[220px]">
        {status === 'saving' && (
          <>
            <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
            <div>
              <p className="text-sm font-bold text-ink uppercase tracking-widest">Enregistrement</p>
              <p className="text-[10px] text-ink-light italic">Mise à jour des registres...</p>
            </div>
          </>
        )}

        {status === 'verified' && (
          <div className="animate-scale-in flex flex-col items-center gap-3">
            <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center">
               <CheckCircle2 size={32} className="text-green-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-green-700 uppercase tracking-widest">Terminé</p>
              <p className="text-[10px] text-green-600/70 font-medium">Archives consolidées</p>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center">
               <X size={32} className="text-red-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-red-600 uppercase tracking-widest">Erreur</p>
              <p className="text-[10px] text-red-500 font-medium">Échec de la sauvegarde</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
