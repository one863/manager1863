import {
	Building2,
	Coins,
	Dumbbell,
	LayoutDashboard,
	LogOut,
	ShoppingCart,
	Trophy,
	Users2,
	X,
} from "lucide-preact";

interface SidebarMenuProps {
	currentView: string;
	onNavigate: (view: any) => void;
	onQuit: () => void;
	onClose: () => void;
}

export function SidebarMenu({
	currentView,
	onNavigate,
	onQuit,
	onClose,
}: SidebarMenuProps) {
	return (
		<>
			<div
				className="absolute inset-0 bg-black/40 backdrop-blur-[3px] z-[200] transition-opacity animate-fade-in"
				onClick={onClose}
			/>
			<div className="absolute top-0 left-0 h-full w-72 bg-paper shadow-2xl border-r border-gray-200 z-[210] overflow-hidden animate-slide-right flex flex-col">
				{/* Header du Menu */}
				<div className="p-6 bg-white border-b-2 border-paper-dark flex justify-between items-center shadow-sm">
					<div>
						<h2 className="text-2xl font-serif font-black tracking-tighter text-ink leading-none">
							1863
						</h2>
						<p className="text-[10px] font-black uppercase tracking-[0.2em] text-accent mt-1">
							Football Manager
						</p>
					</div>
					<button
						onClick={onClose}
						className="p-2 hover:bg-paper-dark rounded-full transition-colors"
					>
						<X size={24} className="text-ink-light" />
					</button>
				</div>

				<div className="flex-1 overflow-y-auto p-4 space-y-2 mt-2">
					<MenuLink
						icon={LayoutDashboard}
						label="Bureau du Président"
						active={currentView === "dashboard"}
						onClick={() => onNavigate("dashboard")}
					/>

					<div className="pt-2 pb-1 px-4 text-[9px] font-black text-ink-light uppercase tracking-[0.2em] opacity-50">
						Gestion Sportive
					</div>

					<MenuLink
						icon={Users2}
						label="Effectif & Tactique"
						active={currentView === "squad"}
						onClick={() => onNavigate("squad")}
					/>
					<MenuLink
						icon={Trophy}
						label="Classement"
						active={currentView === "league"}
						onClick={() => onNavigate("league")}
					/>
					<MenuLink
						icon={Dumbbell}
						label="Académie & Staff"
						active={currentView === "training"}
						onClick={() => onNavigate("training")}
					/>
					<MenuLink
						icon={ShoppingCart}
						label="Marché des Transferts"
						active={currentView === "transfers"}
						onClick={() => onNavigate("transfers")}
					/>

					<div className="pt-4 pb-1 px-4 text-[9px] font-black text-ink-light uppercase tracking-[0.2em] opacity-50">
						Institution
					</div>

					<MenuLink
						icon={Building2}
						label="Infrastructures & Stade"
						active={currentView === "club"}
						onClick={() => onNavigate("club")}
					/>
					<MenuLink
						icon={Coins}
						label="Finances & Sponsors"
						active={currentView === "finances"}
						onClick={() => onNavigate("finances")}
					/>

					<div className="border-t border-gray-100 my-4" />

					<button
						onClick={onQuit}
						className="w-full flex items-center gap-4 p-4 text-red-600 hover:bg-red-50 transition-colors rounded-2xl font-black text-[11px] uppercase tracking-widest border border-transparent hover:border-red-100"
					>
						<LogOut size={18} />
						Quitter la partie
					</button>
				</div>

				<div className="p-6 text-center border-t border-gray-100 bg-paper-dark/30">
					<p className="text-[10px] text-ink-light italic opacity-50 font-serif">
						"The game is nothing without the supporters"
					</p>
				</div>
			</div>
		</>
	);
}

function MenuLink({ icon: Icon, label, active, onClick }: any) {
	return (
		<button
			onClick={onClick}
			className={`w-full flex items-center gap-4 p-4 transition-all rounded-2xl text-sm font-bold active:scale-95 ${active ? "bg-white text-ink border-2 border-paper-dark shadow-sm" : "text-ink hover:bg-paper-dark"}`}
		>
			<Icon size={20} className={active ? "text-accent" : "text-ink-light"} strokeWidth={active ? 2.5 : 2} />
			<span className={`flex-1 text-left tracking-tight ${active ? "font-black" : "font-bold"}`}>{label}</span>
		</button>
	);
}
