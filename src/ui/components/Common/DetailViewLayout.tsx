import { type ReactNode } from "preact/compat";
import { ArrowLeft } from "lucide-preact";

interface DetailViewLayoutProps {
	title: string | ReactNode;
	subtitle?: string | ReactNode;
	icon?: ReactNode;
	onClose: () => void;
	headerRight?: ReactNode;
	tabs?: {
		id: string;
		label: string;
		isActive: boolean;
		onClick: () => void;
	}[];
	children: ReactNode;
	footer?: ReactNode;
    alert?: {
        content: ReactNode;
        variant: "error" | "warning" | "info" | "success";
        icon?: ReactNode;
    };
    className?: string;
}

export default function DetailViewLayout({
	title,
	subtitle,
	icon,
	onClose,
	headerRight,
	tabs,
	children,
	footer,
    alert,
    className = ""
}: DetailViewLayoutProps) {
	return (
		<div className={`flex flex-col h-full bg-white animate-fade-in ${className}`}>
			{/* Header */}
			<div className="bg-white px-4 py-4 border-b flex justify-between items-center sticky top-0 z-[100] shrink-0">
				<div className="flex gap-3 items-center min-w-0">
					<button 
						onClick={(e) => {
                            e.stopPropagation();
                            onClose();
                        }} 
						className="text-ink-light hover:text-accent p-1 transition-colors shrink-0"
					>
						<ArrowLeft size={24} />
					</button>
					
					{icon && <div className="shrink-0">{icon}</div>}
					
					<div className="min-w-0">
						<h2 className="text-lg font-bold text-ink leading-tight truncate">
							{title}
						</h2>
						{subtitle && (
							<div className="flex items-center gap-2 mt-0.5 truncate">
								{subtitle}
							</div>
						)}
					</div>
				</div>
				
				{headerRight && <div className="text-right shrink-0">{headerRight}</div>}
			</div>

			{/* Alert Section */}
			{alert && (
				<div className={`px-4 py-2 flex items-center gap-3 border-b shrink-0 ${
					alert.variant === "error" ? "bg-red-50 text-red-700" :
					alert.variant === "warning" ? "bg-amber-50 text-amber-700" :
					alert.variant === "info" ? "bg-blue-50 text-blue-700" :
					"bg-green-50 text-green-700"
				}`}>
					{alert.icon}
					<div className="text-xs font-bold">{alert.content}</div>
				</div>
			)}

			{/* Tabs Navigation */}
			{tabs && tabs.length > 0 && (
				<div className="flex border-b bg-white shrink-0">
					{tabs.map((tab) => (
						<button 
							key={tab.id}
							onClick={tab.onClick}
							className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-wider transition-all ${
								tab.isActive 
									? "text-accent border-b-2 border-accent" 
									: "text-ink-light"
							}`}
						>
							{tab.label}
						</button>
					))}
				</div>
			)}

			{/* Body */}
			<div className="flex-1 overflow-y-auto relative">
				{children}
			</div>

			{/* Footer */}
			{footer && (
				<div className="shrink-0 bg-white border-t">
					{footer}
				</div>
			)}
		</div>
	);
}
