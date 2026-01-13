import { useState, useEffect, useRef } from 'preact/hooks';
import { db, SaveSlot } from '@/db/db';
import { useTranslation } from 'react-i18next';
import { exportSaveToJSON, importSaveFromJSON } from '@/db/export-system';

interface LoadGameProps {
  onGameLoaded: (slotId: number) => void;
  onCancel: () => void;
}

export default function LoadGame({ onGameLoaded, onCancel }: LoadGameProps) {
  const { t } = useTranslation();
  const [slots, setSlots] = useState<(SaveSlot | undefined)[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [targetImportSlot, setTargetImportSlot] = useState<number | null>(null);

  const refreshSlots = async () => {
    try {
      const loadedSlots = [];
      for (let i = 1; i <= 10; i++) {
        const slot = await db.saveSlots.get(i);
        loadedSlots.push(slot);
      }
      setSlots(loadedSlots);
    } catch (e) {
      console.error('Erreur chargement slots:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshSlots();
  }, []);

  const handleExport = async (slotId: number, e: Event) => {
    e.preventDefault();
    e.stopPropagation();
    const slot = slots[slotId - 1];
    if (!slot) return;

    try {
      const json = await exportSaveToJSON(slotId);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fm1863_save_${slot.teamName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
      alert("Erreur lors de l'export.");
    }
  };

  const handleImportClick = (slotId: number, e: Event) => {
    e.preventDefault();
    e.stopPropagation();
    setTargetImportSlot(slotId);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: Event) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file || targetImportSlot === null) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = event.target?.result as string;
        await importSaveFromJSON(json, targetImportSlot);
        alert('Importation réussie !');
        await refreshSlots();
      } catch (err) {
        console.error('Import failed:', err);
        alert('Fichier invalide ou corrompu.');
      } finally {
        setTargetImportSlot(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handleDeleteClick = (slotId: number, e: Event) => {
    e.preventDefault();
    e.stopPropagation();

    if (confirmDeleteId === slotId) {
      performDelete(slotId);
    } else {
      setConfirmDeleteId(slotId);
      setTimeout(() => setConfirmDeleteId(null), 3000);
    }
  };

  const performDelete = async (slotId: number) => {
    try {
      const id = Number(slotId);
      await db.transaction(
        'rw',
        db.players,
        db.teams,
        db.matches,
        db.saveSlots,
        db.gameState,
        async () => {
          await db.saveSlots.delete(id);
          await db.gameState.delete(id);
          await db.players.where('saveId').equals(id).delete();
          await db.teams.where('saveId').equals(id).delete();
          await db.matches.where('saveId').equals(id).delete();
        },
      );
      setConfirmDeleteId(null);
      await refreshSlots();
    } catch (err) {
      console.error('Erreur critique lors de la suppression:', err);
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-paper p-6 overflow-hidden">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-serif font-bold text-accent">
          {t('load.title')}
        </h1>
        <button
          onClick={onCancel}
          className="text-sm text-ink-light hover:text-ink"
        >
          {t('load.back')}
        </button>
      </header>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".json"
        className="hidden"
      />

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-ink-light animate-pulse">{t('load.searching')}</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-3 pb-safe">
          {slots.map((slot, index) => {
            const slotId = index + 1;
            const isConfirming = confirmDeleteId === slotId;

            if (!slot) {
              return (
                <div
                  key={slotId}
                  className="bg-paper-dark border-2 border-dashed border-gray-300 flex flex-col items-center justify-center h-24 rounded-lg gap-2"
                >
                  <span className="text-sm font-medium text-gray-400">
                    {t('load.empty_slot')} {slotId}
                  </span>
                  <button
                    onClick={(e) => handleImportClick(slotId, e)}
                    className="text-[10px] uppercase font-bold text-accent hover:underline"
                  >
                    📥 Importer un fichier .json
                  </button>
                </div>
              );
            }

            return (
              <div
                key={slotId}
                className="bg-white border-2 border-gray-300 rounded-lg shadow-sm flex overflow-hidden hover:shadow-md transition-shadow h-28"
              >
                <button
                  onClick={() => onGameLoaded(slotId)}
                  className="flex-1 p-3 text-left hover:bg-gray-50 active:bg-gray-100 transition-colors flex flex-col justify-between"
                >
                  <div className="flex justify-between items-start w-full">
                    <div className="truncate pr-2">
                      <h3 className="font-bold text-lg text-ink truncate leading-tight">
                        {slot.teamName}
                      </h3>
                      <p className="text-sm text-ink-light truncate">
                        {slot.managerName}
                      </p>
                    </div>
                    <span className="bg-paper-dark text-xs font-mono px-1.5 py-0.5 rounded text-ink-light border border-gray-200 shrink-0">
                      #{slotId}
                    </span>
                  </div>

                  <div className="text-xs text-ink-light space-y-0.5 w-full">
                    <div className="flex items-center gap-1 font-semibold text-accent">
                      <span>📅 {t('load.game_date')}:</span>
                      <span>
                        {t('game.date_format', { date: slot.currentDate })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-[10px] text-gray-400">
                        Dernier accès:{' '}
                        {slot.lastPlayedDate.toLocaleDateString()}
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => handleExport(slotId, e)}
                          className="text-[10px] font-bold text-blue-600 hover:underline"
                          title="Sauvegarder en fichier externe"
                        >
                          📤 EXPORTER
                        </button>
                      </div>
                    </div>
                  </div>
                </button>

                <button
                  onClick={(e) => handleDeleteClick(slotId, e)}
                  className={`w-14 border-l border-gray-200 transition-all flex flex-col items-center justify-center gap-1
                    ${
                      isConfirming
                        ? 'bg-red-600 text-white hover:bg-red-700'
                        : 'bg-gray-50 text-gray-400 hover:bg-red-50 hover:text-red-500'
                    }
                  `}
                >
                  <span className="text-xl">{isConfirming ? '⚠️' : '🗑️'}</span>
                  {isConfirming && (
                    <span className="text-[10px] font-bold">Sûr?</span>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
