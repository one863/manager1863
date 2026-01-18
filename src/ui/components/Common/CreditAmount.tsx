import { Coins } from "lucide-preact";
import { h } from "preact";

interface CreditAmountProps {
	amount: number;
	size?: "xs" | "sm" | "md" | "lg" | "xl";
	className?: string;
	color?: string;
}

export default function CreditAmount({
	amount,
	size = "md",
	className = "",
	color = "text-green-700",
}: CreditAmountProps) {
	const sizes = {
		xs: { text: "text-[10px]", icon: 10 },
		sm: { text: "text-xs", icon: 12 },
		md: { text: "text-sm", icon: 14 },
		lg: { text: "text-lg", icon: 20 },
		xl: { text: "text-2xl", icon: 24 },
	};

	// Fallback to 'sm' if size is not found in sizes map
	const currentSize = sizes[size as keyof typeof sizes] || sizes.sm;

	return (
		<span
			className={`inline-flex items-center gap-1 font-bold font-mono ${color} ${currentSize.text} ${className}`}
		>
			<Coins size={currentSize.icon} className="shrink-0" />
			{amount.toLocaleString()}
		</span>
	);
}
