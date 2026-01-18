import { useEffect, useRef } from "preact/hooks";
import { X } from "lucide-preact";
import Button from "./Button";

interface BottomSheetProps {
	isOpen: boolean;
	onClose: () => void;
	title?: string;
	children: any;
	maxHeight?: string;
}

export function BottomSheet({
	isOpen,
	onClose,
	title,
	children,
	maxHeight = "90vh",
}: BottomSheetProps) {
	const overlayRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (isOpen) {
			document.body.style.overflow = "hidden";
		} else {
			document.body.style.overflow = "";
		}
		return () => {
			document.body.style.overflow = "";
		};
	}, [isOpen]);

	if (!isOpen) return null;

	const handleOverlayClick = (e: MouseEvent) => {
		if (e.target === overlayRef.current) {
			onClose();
		}
	};

	return (
		<div
			ref={overlayRef}
			className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm transition-opacity animate-in fade-in duration-300 flex items-end justify-center"
			onClick={handleOverlayClick}
		>
			<div
				className="w-full max-w-2xl bg-white rounded-t-2xl shadow-2xl transition-transform animate-in slide-in-from-bottom duration-300 ease-out flex flex-col overflow-hidden"
				style={{ maxHeight }}
			>
				{/* Handle bar for visual cue */}
				<div className="w-full flex justify-center py-2 shrink-0">
					<div className="w-12 h-1.5 bg-slate-200 rounded-full" />
				</div>

				{/* Header */}
				<div className="px-4 pb-3 flex items-center justify-between border-b border-slate-100 shrink-0">
					<h3 className="text-lg font-bold text-slate-800">{title}</h3>
					<Button variant="ghost" size="sm" onClick={onClose} className="rounded-full p-1 h-8 w-8">
						<X size={20} className="text-slate-500" />
					</Button>
				</div>

				{/* Content */}
				<div className="flex-1 overflow-y-auto p-4 overscroll-contain">
					{children}
				</div>
			</div>
		</div>
	);
}
