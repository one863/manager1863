import { h } from "preact";

interface CardProps {
	children: any;
	title?: string;
	className?: string;
	noPadding?: boolean;
}

export default function Card({
	children,
	title,
	className = "",
	noPadding = false,
}: CardProps) {
	return (
		<div
			className={`bg-white rounded-[2rem] shadow-sm border-2 border-paper-dark overflow-hidden ${className}`}
		>
			{title && (
				<div className="bg-paper-dark/30 px-6 py-3 border-b border-gray-100">
					<h3 className="text-[10px] font-black text-ink-light uppercase tracking-[0.2em]">
						{title}
					</h3>
				</div>
			)}
			<div className={noPadding ? "" : "p-6"}>{children}</div>
		</div>
	);
}
