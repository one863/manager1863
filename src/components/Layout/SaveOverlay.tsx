import { Save, CheckCircle2, X } from 'lucide-preact';

interface SaveOverlayProps {
  status: 'saving' | 'verified' | 'error';
}

export function SaveOverlay({ status }: SaveOverlayProps) {
  return (
    <div className="absolute inset-0 bg-paper/80 backdrop-blur-md z-[100] flex flex-col items-center justify-center animate-fade-in text-center">
      <div className="bg-white p-8 rounded-2xl shadow-2xl border-2 border-accent/20 flex flex-col items-center gap-4 min-w-[240px]">
        {status === 'saving' && (
          <>
            <Save size={48} className="text-accent animate-pulse" />
            <div>
              <p className="font-serif font-bold text-xl text-ink">Journal de Bord</p>
              <p className="text-sm text-ink-light italic">Mise à jour des archives...</p>
            </div>
          </>
        )}

        {status === 'verified' && (
          <div className="animate-bounce-in flex flex-col items-center gap-3">
            <CheckCircle2 size={56} className="text-green-600" />
            <div>
              <p className="font-serif font-bold text-xl text-ink">Progression Sauvée</p>
              <p className="text-sm text-green-700 font-medium">Signature numérique vérifiée</p>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center gap-3">
            <X size={56} className="text-red-600" />
            <div>
              <p className="font-serif font-bold text-xl text-ink">Erreur Critique</p>
              <p className="text-sm text-red-600">Échec de l'écriture en base</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
