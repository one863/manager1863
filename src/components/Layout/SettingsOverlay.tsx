import { ArrowLeft, LogOut, Settings, ShieldAlert, Save } from "lucide-preact";
import { useTranslation } from "react-i18next";
import { useGameStore } from "@/store/gameSlice";

interface SettingsOverlayProps {
	onClose: () => void;
	onQuit: () => void;
}

export default function SettingsOverlay({ onClose, onQuit }: SettingsOverlayProps) {
	const { t } = useTranslation();
	const saveId = useGameStore((state) => state.currentSaveId);

	return (
		<div className="fixed inset-0 z-[300] bg-white flex flex-col max-w-md mx-auto border-x border-paper-dark shadow-2xl overflow-hidden animate-fade-in">
			{/* Header */}
			<div className="bg-paper-dark p-6 text-center border-b border-gray-300 relative flex flex-col items-center shrink-0">
				<button
					onClick={onClose}
					className="absolute top-6 left-6 text-ink-light hover:text-accent p-1 transition-colors"
				>
					<ArrowLeft size={24} />
				</button>
				
				<div className="w-16 h-16 bg-white rounded-full mb-3 flex items-center justify-center border-4 border-accent shadow-lg">
					<Settings size={32} className="text-accent" />
				</div>
				<h2 className="text-2xl font-serif font-bold text-ink leading-tight">
					Paramètres
				</h2>
				<div className="text-[10px] uppercase tracking-[0.3em] text-ink-light font-bold mt-1">
					Session de Jeu #{saveId}
				</div>
			</div>

			{/* Content */}
			<div className="flex-1 p-6 space-y-8 overflow-y-auto">
				<section className="space-y-4">
					<h3 className="text-[10px] font-black uppercase tracking-widest text-ink-light px-2">Gestion de la Partie</h3>
					
					<div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-50">
						<button 
							onClick={onClose}
							className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
						>
							<div className="flex items-center gap-3">
								<div className="p-2 bg-paper-dark rounded-lg text-ink-light">
									<Save size={18} />
								</div>
								<span className="font-bold text-sm text-ink">Sauvegarder et Continuer</span>
							</div>
						</button>

						<button 
							onClick={onQuit}
							className="w-full p-4 flex items-center justify-between hover:bg-red-50 transition-colors group"
						>
							<div className="flex items-center gap-3">
								<div className="p-2 bg-red-50 rounded-lg text-red-500 group-hover:bg-red-500 group-hover:text-white transition-colors">
									<LogOut size={18} />
								</div>
								<span className="font-bold text-sm text-red-600">Quitter la Partie</span>
							</div>
						</button>
					</div>
				</section>

				<section className="space-y-4">
					<h3 className="text-[10px] font-black uppercase tracking-widest text-ink-light px-2">Infos Système</h3>
					<div className="p-4 bg-paper-dark/50 rounded-2xl border border-white/50 space-y-3">
						<div className="flex justify-between text-[10px] font-bold">
							<span className="text-ink-light uppercase">Version</span>
							<span className="text-ink">1.0.0-PROD</span>
						</div>
						<div className="flex justify-between text-[10px] font-bold">
							<span className="text-ink-light uppercase">Moteur</span>
							<span className="text-ink">Manager-1863-Engine</span>
						</div>
					</div>
				</section>

				<div className="pt-8 border-t border-gray-100 text-center space-y-2 opacity-30">
					<ShieldAlert size={24} className="mx-auto" />
					<p className="text-[9px] font-black uppercase tracking-[0.2em]">Usage Professionnel Uniquement</p>
				</div>
			</div>
			
			<div className="h-16 shrink-0 bg-white" />
		</div>
	);
}
