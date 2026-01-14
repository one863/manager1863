import { type SaveSlot, db } from "@/db/db";
import { exportSaveToJSON, importSaveFromJSON } from "@/db/export-system";
import { type CloudSaveMetadata, CloudService } from "@/services/cloud-service";
import {
	AlertTriangle,
	ChevronRight,
	Cloud,
	Download,
	DownloadCloud,
	Shield,
	Trash2,
	Upload,
	X,
} from "lucide-preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { useTranslation } from "react-i18next";

interface LoadGameProps {
	onGameLoaded: (slotId: number) => void;
	onCancel: () => void;
}

export default function LoadGame({ onGameLoaded, onCancel }: LoadGameProps) {
	const { t } = useTranslation();
	const [slots, setSlots] = useState<(SaveSlot | undefined)[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [deleteTarget, setDeleteTarget] = useState<number | null>(null);

	const [user, setUser] = useState(CloudService.getCurrentUser());
	const [viewMode, setViewMode] = useState<"local" | "cloud">("local");
	const [cloudSaves, setCloudSaves] = useState<CloudSaveMetadata[]>([]);
	const [selectedCloudSave, setSelectedCloudSave] =
		useState<CloudSaveMetadata | null>(null);

	const fileInputRef = useRef<HTMLInputElement>(null);
	const [targetImportSlot, setTargetImportSlot] = useState<number | null>(null);

	const refreshSlots = async () => {
		try {
			const loadedSlots = [];
			for (let i = 1; i <= 3; i++) {
				const slot = await db.saveSlots.get(i);
				loadedSlots.push(slot);
			}
			setSlots(loadedSlots);
		} catch (e) {
			console.error("Erreur chargement slots:", e);
		} finally {
			if (viewMode === "local") setIsLoading(false);
		}
	};

	useEffect(() => {
		refreshSlots();
	}, []);

	useEffect(() => {
		if (user && viewMode === "cloud") {
			setIsLoading(true);
			CloudService.getCloudSaves()
				.then((saves) => {
					setCloudSaves(saves || []); // Ensure array
					setIsLoading(false);
				})
				.catch(() => {
					setCloudSaves([]);
					setIsLoading(false);
				});
		}
	}, [user, viewMode]);

	const handleExport = async (slotId: number, e: Event) => {
		e.preventDefault();
		e.stopPropagation();
		const slot = slots[slotId - 1];
		if (!slot) return;

		try {
			const json = await exportSaveToJSON(slotId);
			const blob = new Blob([json], { type: "application/json" });
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `1863_save_${slot.teamName.replace(/\s+/g, "_")}_S${slot.season}_D${slot.day}.json`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
		} catch (err) {
			console.error("Export failed:", err);
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
				await refreshSlots();
			} catch (err) {
				alert("Fichier invalide ou corrompu.");
			} finally {
				setTargetImportSlot(null);
				if (fileInputRef.current) fileInputRef.current.value = "";
			}
		};
		reader.readAsText(file);
	};

	const performDelete = async () => {
		if (deleteTarget === null) return;
		try {
			const id = deleteTarget;
			await db.transaction(
				"rw",
				[
					db.players,
					db.teams,
					db.matches,
					db.leagues,
					db.saveSlots,
					db.gameState,
					db.news,
					db.history,
				],
				async () => {
					await db.saveSlots.delete(id);
					await db.gameState.delete(id);
					await db.players.where("saveId").equals(id).delete();
					await db.teams.where("saveId").equals(id).delete();
					await db.matches.where("saveId").equals(id).delete();
					await db.news.where("saveId").equals(id).delete();
					await db.history.where("saveId").equals(id).delete();
				},
			);
			setDeleteTarget(null);
			await refreshSlots();
		} catch (err) {
			console.error("Delete failed:", err);
		}
	};

	const performCloudImport = async (targetSlotId: number) => {
		if (!selectedCloudSave) return;
		try {
			setIsLoading(true);
			await importSaveFromJSON(selectedCloudSave.data, targetSlotId);
			await refreshSlots();
			setSelectedCloudSave(null);
			setViewMode("local");
		} catch (e) {
			console.error("Cloud import failed", e);
			alert("Erreur lors de l'importation Cloud");
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="flex flex-col h-screen max-w-md mx-auto bg-paper p-6 animate-fade-in relative overflow-hidden">
			<header className="mb-6 flex items-center justify-between">
				<h1 className="text-2xl font-serif font-bold text-accent tracking-tight">
					{t("load.title")}
				</h1>
				<button
					onClick={onCancel}
					className="p-2 hover:bg-paper-dark rounded-full transition-colors text-ink-light"
				>
					<X size={24} />
				</button>
			</header>

			{/* Tabs */}
			{user && (
				<div className="flex bg-paper-dark rounded-xl p-1 mb-6">
					<button
						onClick={() => setViewMode("local")}
						className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === "local" ? "bg-white shadow text-accent" : "text-gray-400"}`}
					>
						LOCAL
					</button>
					<button
						onClick={() => setViewMode("cloud")}
						className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${viewMode === "cloud" ? "bg-white shadow text-blue-600" : "text-gray-400"}`}
					>
						<Cloud size={12} /> CLOUD
					</button>
				</div>
			)}

			<input
				type="file"
				ref={fileInputRef}
				onChange={handleFileChange}
				accept=".json"
				className="hidden"
			/>

			{isLoading ? (
				<div className="flex-1 flex flex-col items-center justify-center gap-3">
					<div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
					<p className="text-ink-light italic text-sm">
						{viewMode === "cloud" ? "Synchronisation..." : t("load.searching")}
					</p>
				</div>
			) : (
				<div className="flex-1 overflow-y-auto space-y-4 pb-20">
					{/* VUE LOCAL */}
					{viewMode === "local" &&
						slots &&
						slots.map((slot, index) => {
							const slotId = index + 1;

							if (!slot) {
								return (
									<div
										key={slotId}
										className="bg-white border-2 border-dashed border-gray-200 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 transition-colors hover:border-accent group"
									>
										<div className="w-10 h-10 bg-paper-dark rounded-full flex items-center justify-center text-gray-300 group-hover:text-accent transition-colors">
											<Shield size={20} />
										</div>
										<div className="text-center">
											<span className="block text-xs font-bold text-gray-400 uppercase tracking-widest">
												{t("load.empty_slot")} #{slotId}
											</span>
											<button
												onClick={(e) => handleImportClick(slotId, e)}
												className="text-[10px] font-bold text-accent hover:underline flex items-center gap-1 mt-1"
											>
												<Download size={10} /> IMPORTER (.JSON)
											</button>
										</div>
									</div>
								);
							}

							return (
								<div
									key={slotId}
									className="bg-white border-2 border-gray-200 rounded-2xl overflow-hidden shadow-sm hover:border-accent transition-all animate-slide-up group"
								>
									<div className="flex">
										<button
											onClick={() => onGameLoaded(slotId)}
											className="flex-1 p-5 text-left active:bg-paper-dark transition-colors"
										>
											<div className="flex justify-between items-start mb-3">
												<div>
													<h3 className="font-serif font-bold text-xl text-ink leading-tight">
														{slot.teamName}
													</h3>
													<p className="text-xs text-accent font-bold uppercase tracking-tighter">
														Président {slot.managerName}
													</p>
												</div>
												<span className="text-[10px] font-mono bg-paper-dark px-2 py-0.5 rounded border border-gray-200 text-ink-light">
													PARTIE #{slotId}
												</span>
											</div>

											<div className="flex items-center gap-4 text-xs">
												<div className="flex items-center gap-1 bg-accent/5 px-2 py-1 rounded text-accent font-bold">
													<Shield size={12} /> Saison {slot.season} • Jour{" "}
													{slot.day}
												</div>
												<div className="text-ink-light italic opacity-60">
													{new Date(slot.lastPlayedDate).toLocaleDateString()}
												</div>
											</div>
										</button>

										<div className="flex flex-col border-l border-gray-100 bg-paper-dark/30">
											<button
												onClick={(e) => {
													e.stopPropagation();
													setDeleteTarget(slotId);
												}}
												className="flex-1 px-4 hover:bg-red-50 hover:text-red-600 text-gray-400 transition-colors"
											>
												<Trash2 size={18} />
											</button>
											<button
												onClick={(e) => handleExport(slotId, e)}
												className="flex-1 px-4 border-t border-gray-100 hover:bg-blue-50 hover:text-blue-600 text-gray-400 transition-colors"
											>
												<Upload size={18} />
											</button>
										</div>
									</div>
								</div>
							);
						})}

					{/* VUE CLOUD */}
					{viewMode === "cloud" && cloudSaves && (
						<div className="space-y-4">
							{cloudSaves.length === 0 ? (
								<div className="text-center py-12 opacity-50">
									<Cloud size={48} className="mx-auto mb-2 text-gray-300" />
									<p className="text-sm">Aucune sauvegarde Cloud trouvée.</p>
								</div>
							) : (
								cloudSaves.map((save) => (
									<div
										key={save.id}
										className="bg-white border-2 border-blue-100 rounded-2xl p-5 shadow-sm hover:border-blue-300 transition-all animate-slide-up relative overflow-hidden"
									>
										<div className="absolute top-0 right-0 bg-blue-500 text-white text-[9px] font-bold px-2 py-1 rounded-bl-lg">
											CLOUD
										</div>
										<div className="flex justify-between items-center">
											<div>
												<h3 className="font-serif font-bold text-lg text-ink">
													{save.clubName}
												</h3>
												<div className="flex gap-3 text-xs text-gray-500 mt-1">
													<span>Saison {save.season}</span>
													<span>Jour {save.day}</span>
												</div>
												<div className="text-[10px] text-gray-400 mt-2 italic">
													Sauvegardé le{" "}
													{new Date(save.updatedAt).toLocaleDateString()} à{" "}
													{new Date(save.updatedAt).toLocaleTimeString()}
												</div>
											</div>
											<button
												onClick={() => setSelectedCloudSave(save)}
												className="bg-blue-50 text-blue-600 p-3 rounded-full hover:bg-blue-100 transition-colors"
											>
												<DownloadCloud size={20} />
											</button>
										</div>
									</div>
								))
							)}
						</div>
					)}
				</div>
			)}

			{/* OVERLAY DE CONFIRMATION DE SUPPRESSION */}
			{deleteTarget !== null && (
				<div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
					<div className="bg-white rounded-3xl p-8 shadow-2xl border-4 border-red-500 max-w-xs w-full animate-slide-up text-center">
						<div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
							<AlertTriangle size={32} />
						</div>
						<h2 className="text-xl font-serif font-bold text-ink mb-2">
							Supprimer la partie ?
						</h2>
						<p className="text-sm text-ink-light mb-8 leading-relaxed">
							Voulez-vous vraiment supprimer la partie locale ?
						</p>
						<div className="space-y-3">
							<button
								onClick={performDelete}
								className="w-full py-4 bg-red-600 text-white rounded-2xl font-bold shadow-lg active:scale-95 transition-all"
							>
								OUI, SUPPRIMER
							</button>
							<button
								onClick={() => setDeleteTarget(null)}
								className="w-full py-3 bg-paper-dark text-ink-light rounded-xl font-bold active:scale-95 transition-all"
							>
								ANNULER
							</button>
						</div>
					</div>
				</div>
			)}

			{/* OVERLAY CHOIX SLOT POUR IMPORT CLOUD */}
			{selectedCloudSave && (
				<div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
					<div className="bg-white rounded-3xl p-6 shadow-2xl border-4 border-blue-500 max-w-xs w-full animate-slide-up text-center">
						<div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
							<Cloud size={24} />
						</div>
						<h2 className="text-lg font-serif font-bold text-ink mb-1">
							Importer la sauvegarde
						</h2>
						<p className="text-xs text-ink-light mb-6">
							Sur quel emplacement local (1-3) voulez-vous installer la
							sauvegarde de <b>{selectedCloudSave.clubName}</b> ?
							<br />
							<span className="text-red-500 font-bold">
								Cela écrasera les données locales.
							</span>
						</p>

						<div className="space-y-2">
							{[1, 2, 3].map((id) => (
								<button
									key={id}
									onClick={() => performCloudImport(id)}
									className="w-full py-3 bg-gray-50 border border-gray-200 hover:border-blue-500 hover:bg-blue-50 text-ink rounded-xl font-bold transition-all flex justify-between px-4 items-center"
								>
									<span>Emplacement {id}</span>
									{slots?.[id - 1] ? (
										<span className="text-[10px] text-red-400 uppercase">
											Occupé
										</span>
									) : (
										<span className="text-[10px] text-green-500 uppercase">
											Libre
										</span>
									)}
								</button>
							))}

							<button
								onClick={() => setSelectedCloudSave(null)}
								className="w-full py-3 mt-4 text-gray-400 font-bold hover:text-gray-600"
							>
								Annuler
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
