import { useEffect, useRef } from "preact/hooks";

interface Tab {
	id: string;
	label: string;
	badge?: number;
}

interface SubTabsProps {
	tabs: Tab[];
	activeTab: string;
	onChange: (id: any) => void;
	sticky?: boolean;
}

export function SubTabs({ tabs, activeTab, onChange, sticky = true }: SubTabsProps) {
	const scrollRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const container = scrollRef.current;
		if (!container) return;

		const activeElement = container.querySelector(
			`[data-tab-id="${activeTab}"]`,
		) as HTMLElement;

		if (activeElement) {
			const targetScroll =
				activeElement.offsetLeft -
				container.offsetWidth / 2 +
				activeElement.offsetWidth / 2;

			container.scrollTo({
				left: targetScroll,
				behavior: "smooth",
			});
		}
	}, [activeTab]);

	return (
		<div
			className={`${sticky ? "sticky top-0 z-20" : ""} bg-white border-b border-gray-100 mb-4`}
		>
			<div
				ref={scrollRef}
				className="flex overflow-x-auto no-scrollbar scroll-smooth px-1 items-center"
			>
				{tabs.map((tab) => {
					const isActive = activeTab === tab.id;
					return (
						<button
							key={tab.id}
							data-tab-id={tab.id}
							onClick={() => onChange(tab.id)}
							className={`
								flex-shrink-0 flex items-center gap-2 px-3.5 py-3.5 text-[10px] uppercase tracking-[0.1em] font-black transition-all relative
								${isActive ? "text-ink" : "text-gray-600 hover:text-ink"}
							`}
						>
							<span>{tab.label}</span>
							{tab.badge !== undefined && tab.badge > 0 && (
								<span className="bg-red-600 text-white text-[10px] px-1.5 rounded-full min-w-[18px] h-4.5 flex items-center justify-center font-black shadow-md border border-white/20">
									{tab.badge}
								</span>
							)}
							{isActive && (
								<div className="absolute bottom-0 left-3 right-3 h-[3px] bg-accent rounded-t-full" />
							)}
						</button>
					);
				})}
			</div>
		</div>
	);
}
