interface ButtonProps {
	children: any;
	onClick: () => void;
	variant?: "primary" | "secondary" | "danger" | "ghost";
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
		"w-full py-3.5 px-6 rounded-2xl font-black uppercase tracking-widest text-[11px] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm";

	const variants = {
		primary:
			"bg-white text-ink border-2 border-paper-dark hover:bg-paper-dark active:scale-95 transition-transform",
		secondary:
			"bg-paper-dark text-ink-light border border-gray-100 hover:text-ink active:scale-95 transition-transform",
		danger:
			"bg-white text-red-600 border-2 border-red-50 hover:bg-red-50 active:scale-95",
		ghost: "bg-transparent text-ink-light hover:text-ink shadow-none",
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
