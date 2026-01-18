interface ButtonProps {
	children: any;
	onClick: () => void;
	variant?: "primary" | "secondary" | "danger" | "ghost" | "accent";
	className?: string;
	disabled?: boolean;
	title?: string;
}

export default function Button({
	children,
	onClick,
	variant = "primary",
	className = "",
	disabled = false,
	title,
}: ButtonProps) {
	const baseStyles =
		"w-full py-3.5 px-6 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm active:scale-[0.98]";

	const variants = {
		primary:
			"bg-ink text-white hover:bg-slate-800 shadow-lg shadow-slate-200",
		accent:
			"bg-accent text-white hover:bg-blue-700 shadow-lg shadow-blue-200",
		secondary:
			"bg-white text-ink border border-slate-200 hover:bg-slate-50",
		danger:
			"bg-white text-red-600 border border-red-100 hover:bg-red-50",
		ghost: 
			"bg-transparent text-ink-light hover:text-ink shadow-none",
	};

	return (
		<button
			onClick={onClick}
			disabled={disabled}
			className={`${baseStyles} ${variants[variant]} ${className}`}
			title={title}
		>
			{children}
		</button>
	);
}
