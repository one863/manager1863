import { AlertTriangle, Play, Settings2 } from "lucide-preact";
import Button from "../Common/Button";

interface MatchReadyOverlayProps {
	onConfirm: () => void;
	onPrepare: () => void;
}

export function MatchReadyOverlay({
	onConfirm,
	onPrepare,
}: MatchReadyOverlayProps) {
	return (
		<div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in">
			<div className="bg-white rounded-2xl p-8 shadow-2xl border-4 border-accent flex flex-col items-center gap-6 max-w-sm w-full">
				<div className="bg-accent/10 p-4 rounded-full text-accent animate-pulse">
					<Play size={48} fill="currentColor" />
				</div>

				<div className="text-center">
					<h2 className="font-serif font-bold text-2xl text-ink mb-2">
						C'EST L'HEURE DU MATCH !
					</h2>
					<p className="text-sm text-ink-light leading-relaxed">
						Vos joueurs attendent dans le tunnel. Êtes-vous certain d'avoir
						choisi la meilleure tactique pour aujourd'hui ?
					</p>
				</div>

				<div className="w-full space-y-3 pt-2">
					<button
						onClick={onConfirm}
						className="w-full bg-accent hover:bg-amber-700 text-white font-bold py-4 px-6 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-transform active:scale-95"
					>
						DISPUTER LE MATCH
					</button>

					<button
						onClick={onPrepare}
						className="w-full bg-paper-dark hover:bg-gray-200 text-ink-light font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-colors text-xs"
					>
						<Settings2 size={16} /> REVOIR LA TACTIQUE
					</button>
				</div>
			</div>
		</div>
	);
}
