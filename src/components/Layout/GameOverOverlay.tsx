import { AlertTriangle, LogOut, RefreshCcw } from "lucide-preact";

interface GameOverOverlayProps {
	onRestart: () => void;
}

export function GameOverOverlay({ onRestart }: GameOverOverlayProps) {
	return (
		<div className="absolute inset-0 bg-red-900/90 backdrop-blur-md z-[200] flex flex-col items-center justify-center animate-fade-in text-center p-6">
			<div className="bg-white p-8 rounded-2xl shadow-2xl border-4 border-red-500 flex flex-col items-center gap-6 max-w-sm">
				<div className="bg-red-100 p-4 rounded-full">
					<AlertTriangle size={48} className="text-red-600" />
				</div>

				<div>
					<h2 className="font-serif font-bold text-3xl text-ink mb-2">
						CONTRAT ROMPU
					</h2>
					<p className="text-sm text-ink-light leading-relaxed">
						Vos dirigeants ont perdu patience. L'aventure s'arrête ici pour vous
						à la tête du club. Votre nom restera dans les archives, mais le banc
						est désormais libre.
					</p>
				</div>

				<div className="w-full space-y-3">
					<button
						onClick={onRestart}
						className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-6 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-transform active:scale-95"
					>
						<RefreshCcw size={20} />
						RECOMMENCER LA CARRIÈRE
					</button>

					<p className="text-[10px] text-ink-light uppercase tracking-widest font-bold">
						Attention : la sauvegarde sera supprimée
					</p>
				</div>
			</div>

			<p className="mt-8 text-white/60 italic font-serif text-sm">
				"On ne perd jamais. Soit on gagne, soit on apprend."
			</p>
		</div>
	);
}
