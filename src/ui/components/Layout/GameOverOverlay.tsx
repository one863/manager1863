import { Trash2, RotateCcw } from "lucide-preact";

interface GameOverOverlayProps {
	onRestart: () => void;
}

export default function GameOverOverlay({ onRestart }: GameOverOverlayProps) {
	return (
		<div className="flex flex-col h-full bg-white animate-fade-in items-center justify-center p-8 text-center">
			<div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center text-red-600 mb-6">
				<Trash2 size={40} />
			</div>
			
			<h2 className="text-2xl font-black text-gray-900 mb-2 uppercase tracking-tight">Fin de carrière</h2>
			<p className="text-gray-500 text-sm mb-8 leading-relaxed">
				Le conseil d'administration a décidé de mettre fin à votre contrat. Les résultats n'ont pas été à la hauteur des attentes du club.
			</p>

			<button 
				onClick={onRestart}
				className="w-full py-4 bg-blue-600 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-100 active:scale-95 transition-all"
			>
				<RotateCcw size={18} />
				Recommencer une carrière
			</button>
		</div>
	);
}
