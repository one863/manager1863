import { db } from "@/core/db/db";
import { importSaveFromJSON } from "@/core/db/export-system";
import {
	ArrowLeft,
	Calendar,
	ChevronRight,
	Clock,
	HardDrive,
	Trash2,
	User,
    Upload
} from "lucide-preact";
import { useEffect, useState, useRef } from "preact/hooks";
import { useTranslation } from "react-i18next";

/** Calcule la taille approximative d'une sauvegarde en octets */
async function getSaveSize(saveId: number): Promise<number> {
	let totalSize = 0;
	
	try {
		// Compte les éléments de chaque table liée à cette sauvegarde
		const gameStates = await db.gameState.where("saveId").equals(saveId).toArray();
		totalSize += gameStates.reduce((acc, item) => acc + JSON.stringify(item).length, 0);
		
		const leagues = await db.leagues.where("saveId").equals(saveId).toArray();
		totalSize += leagues.reduce((acc, item) => acc + JSON.stringify(item).length, 0);
		
		const teams = await db.teams.where("saveId").equals(saveId).toArray();
		totalSize += teams.reduce((acc, item) => acc + JSON.stringify(item).length, 0);
		
		const players = await db.players.where("saveId").equals(saveId).toArray();
		totalSize += players.reduce((acc, item) => acc + JSON.stringify(item).length, 0);
		
		const staffMembers = await db.staff.where("saveId").equals(saveId).toArray();
		totalSize += staffMembers.reduce((acc, item) => acc + JSON.stringify(item).length, 0);
		
		const matches = await db.matches.where("saveId").equals(saveId).toArray();
		totalSize += matches.reduce((acc, item) => acc + JSON.stringify(item).length, 0);
		
		const newsItems = await db.news.where("saveId").equals(saveId).toArray();
		totalSize += newsItems.reduce((acc, item) => acc + JSON.stringify(item).length, 0);
		
		const historyItems = await db.history.where("saveId").equals(saveId).toArray();
		totalSize += historyItems.reduce((acc, item) => acc + JSON.stringify(item).length, 0);
		
		const backupItems = await db.backups.where("saveId").equals(saveId).toArray();
		totalSize += backupItems.reduce((acc, item) => acc + JSON.stringify(item).length, 0);
	} catch (e) {
		console.error("Erreur calcul taille save", saveId, e);
	}
	
	return totalSize;
}

/** Formate une taille en octets en format lisible */
function formatSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} o`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

interface LoadGameProps {
	onGameLoaded: (slotId: number) => void;
	onCancel: () => void;
}

export default function LoadGame({ onGameLoaded, onCancel }: LoadGameProps) {
	const { t } = useTranslation();
	const [saves, setSaves] = useState<any[]>([]);
	const [saveSizes, setSaveSizes] = useState<Record<number, number>>({});
	const [deleteConfirmation, setDeleteConfirmation] = useState<number | null>(null);
    const [isImporting, setIsImporting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

	const fetchSaves = async () => {
		const allSaves = await db.saveSlots.toArray();
		const sortedSaves = allSaves.sort((a, b) => b.lastPlayedDate.getTime() - a.lastPlayedDate.getTime());
		setSaves(sortedSaves);
		
		// Calcule les tailles en arrière-plan (progressivement)
		for (const save of sortedSaves) {
			if (save.id) {
				const size = await getSaveSize(save.id);
				setSaveSizes(prev => ({ ...prev, [save.id!]: size }));
			}
		}
	};

	useEffect(() => {
		fetchSaves();
	}, []);

	const requestDelete = (e: Event, id: number) => {
		e.stopPropagation();
		setDeleteConfirmation(id);
	};

	const performDelete = async () => {
		if (deleteConfirmation === null) return;
		const id = deleteConfirmation;
		
		try {
			console.log(`Starting Dexie transaction for save ID: ${id}`);
			// Include all tables in the transaction
			const tables = [
				"saveSlots", 
				"gameState", 
				"leagues",
				"teams", 
				"players", 
				"matches", 
				"news", 
				"staff",
				"history",
                "backups"
			];
			
			await db.transaction("rw", tables, async () => {
				console.log(`Inside transaction: Attempting to delete save with ID: ${id}`);
				
				// Delete the save slot itself
				await db.saveSlots.delete(id);
				
				// Delete related data in all other tables
				await db.gameState.where("saveId").equals(id).delete();
				await db.leagues.where("saveId").equals(id).delete();
				await db.teams.where("saveId").equals(id).delete();
				await db.players.where("saveId").equals(id).delete();
				await db.staff.where("saveId").equals(id).delete();
				await db.matches.where("saveId").equals(id).delete();
				await db.news.where("saveId").equals(id).delete();
				await db.history.where("saveId").equals(id).delete();
                await db.backups.where("saveId").equals(id).delete();
			});
			
			console.log(`Dexie transaction completed for save ID: ${id}.`);
			setDeleteConfirmation(null);
			fetchSaves();
		} catch (error) {
			console.error("Failed to delete save game:", error);
			alert(t("load_game.delete_error", "Erreur lors de la suppression de la sauvegarde.") + ": " + (error as Error).message);
		}
	};

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (event: any) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsImporting(true);
        try {
            const reader = new FileReader();
            reader.onload = async (e) => {
                const jsonContent = e.target?.result as string;
                if (jsonContent) {
                    try {
                        // Create a new slot for the imported game
                        const newSlotId = Date.now(); // Simple unique ID generation or use Dexie auto-increment if needed logic
                        
                        // Note: importSaveFromJSON expects a targetSlotId. 
                        // If we want to create a new one, we might need to handle ID generation carefully.
                        // However, Dexie auto-increments IDs. Let's just create a slot first to get an ID?
                        // Actually, our current importSaveFromJSON uses the provided ID.
                        // Let's rely on time-based ID for now or find a free ID.
                        // Better: Find the highest existing ID and add 1, or just use Date.now() as it is safe enough for local single user.
                        
                        // Wait, saveSlots has auto-increment ++id.
                        // But importSaveFromJSON forces the ID.
                        // Let's create a "placeholder" slot to reserve an ID properly from Dexie.
                        const tempId = await db.saveSlots.add({
                            managerName: "Importing...",
                            teamName: "Importing...",
                            lastPlayedDate: new Date(),
                            day: 1,
                            season: 1
                        });

                        await importSaveFromJSON(jsonContent, tempId as number);
                        
                        setIsImporting(false);
                        fetchSaves();
                        alert(t("load_game.import_success", "Sauvegarde importée avec succès !"));
                    } catch (err) {
                        console.error("Import failed content parsing", err);
                        alert(t("load_game.import_error_content", "Le fichier est invalide ou corrompu."));
                        setIsImporting(false);
                        // Clean up if possible?
                    }
                }
            };
            reader.readAsText(file);
        } catch (error) {
            console.error("Import failed file reading", error);
            alert(t("load_game.import_error_file", "Impossible de lire le fichier."));
            setIsImporting(false);
        }
        
        // Reset input
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

	return (
		<div className="flex flex-col h-screen bg-white animate-fade-in w-full max-w-md mx-auto shadow-2xl relative">
            {/* Hidden File Input */}
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept=".json" 
                className="hidden" 
            />

            {/* Overlays */}
			{deleteConfirmation !== null && (
				<div className="absolute inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4">
					<div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-xs border border-gray-100 animate-in fade-in zoom-in duration-200">
						<div className="flex flex-col items-center text-center gap-4">
							<div className="w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center">
								<Trash2 size={24} />
							</div>
							<div>
								<h3 className="text-lg font-bold text-ink">{t("load_game.confirm_delete_title", "Supprimer la partie ?")}</h3>
								<p className="text-sm text-gray-500 mt-1">{t("load_game.confirm_delete_desc", "Cette action est irréversible.")}</p>
							</div>
							<div className="flex gap-3 w-full mt-2">
								<button 
									onClick={() => setDeleteConfirmation(null)}
									className="flex-1 px-4 py-2 rounded-xl bg-gray-50 text-ink font-medium hover:bg-gray-100 transition-colors"
								>
									{t("common.cancel", "Annuler")}
								</button>
								<button 
									onClick={performDelete}
									className="flex-1 px-4 py-2 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 shadow-md shadow-red-200 transition-colors"
								>
									{t("common.delete", "Supprimer")}
								</button>
							</div>
						</div>
					</div>
				</div>
			)}
            
            {isImporting && (
				<div className="absolute inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm p-4">
					<div className="flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-sm font-bold text-ink">{t("load_game.importing", "Importation en cours...")}</p>
                    </div>
                </div>
            )}

			<div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
				<Clock size={200} />
			</div>

			<div className="p-4 border-b border-gray-100 flex-none bg-white/80 backdrop-blur-md sticky top-0 z-20">
				<div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={onCancel}
                            className="w-10 h-10 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center text-ink-light hover:bg-gray-100 transition-colors"
                        >
                            <ArrowLeft size={20} />
                        </button>
                        
                        <h1 className="text-2xl font-black italic tracking-tighter text-ink">
                            Charger
                        </h1>
                    </div>

                    <button
                        onClick={handleImportClick}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 text-xs font-bold text-ink-light transition-colors border border-gray-200"
                    >
                        <Upload size={14} />
                        <span>Importer JSON</span>
                    </button>
				</div>
			</div>

			<div className="flex-1 overflow-y-auto p-4 space-y-2">
				{saves.length === 0 ? (
					<div className="text-center py-12 opacity-50">
						<Clock size={48} className="mx-auto text-gray-500 mb-4" />
						<p className="text-sm font-serif italic text-gray-600">Aucune sauvegarde trouvée.</p>
					</div>
				) : (
					saves.map((save) => (
						<div
							key={save.id}
							onClick={() => onGameLoaded(save.id)}
							className="group bg-white border border-gray-100 p-4 rounded-xl shadow-sm hover:border-accent/30 hover:shadow-md transition-all cursor-pointer relative overflow-hidden"
						>
							<div className="flex justify-between items-center relative z-10">
								<div className="flex-1 min-w-0">
									<h3 className="text-base font-bold text-ink leading-tight truncate">{save.teamName}</h3>
									<div className="flex items-center gap-3 text-xs text-ink-light mt-1">
										<span className="flex items-center gap-1 truncate">
											<User size={10} /> {save.managerName}
										</span>
										<span className="text-gray-500">•</span>
										<span className="font-mono text-gray-500">
											S{save.season} J{save.day}
										</span>
										{save.id in saveSizes && (
											<>
												<span className="text-gray-500">•</span>
												<span className="flex items-center gap-1 text-gray-500">
													<HardDrive size={10} /> {formatSize(saveSizes[save.id])}
												</span>
											</>
										)}
									</div>
								</div>

								<div className="flex items-center gap-3 pl-3">
									<span className="text-[10px] text-gray-600 font-medium">
										{new Date(save.lastPlayedDate).toLocaleDateString()}
									</span>
									<button
										onClick={(e) => requestDelete(e, save.id)}
										className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors z-20"
									>
										<Trash2 size={14} />
									</button>
									<ChevronRight size={16} className="text-gray-500 group-hover:text-accent transition-colors" />
								</div>
							</div>
						</div>
					))
				)}
			</div>
		</div>
	);
}
