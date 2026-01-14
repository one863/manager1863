import { Coins } from "lucide-preact";
import { h } from "preact";

interface CreditAmountProps {
	amount: number;
	size?: "sm" | "md" | "lg" | "xl";
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
		sm: { text: "text-xs", icon: 12 },
		md: { text: "text-sm", icon: 14 },
		lg: { text: "text-lg", icon: 20 },
		xl: { text: "text-2xl", icon: 24 },
	};

	return (
		<span
			className={`inline-flex items-center gap-1 font-bold font-mono ${color} ${sizes[size].text} ${className}`}
		>
			<Coins size={sizes[size].icon} className="shrink-0" />
			{amount.toLocaleString()}
		</span>
	);
}
