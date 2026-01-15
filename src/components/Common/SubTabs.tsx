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
			className={`${sticky ? "sticky top-0 z-20" : ""} bg-paper border-b border-gray-200 mb-4`}
		>
			<div
				ref={scrollRef}
				className="flex overflow-x-auto no-scrollbar scroll-smooth px-2 items-center"
			>
				{tabs.map((tab) => {
					const isActive = activeTab === tab.id;
					return (
						<button
							key={tab.id}
							data-tab-id={tab.id}
							onClick={() => onChange(tab.id)}
							className={`
								flex-shrink-0 flex items-center gap-2 px-6 py-4 text-[11px] uppercase tracking-widest font-black transition-all relative
								${isActive ? "text-accent" : "text-ink-light hover:text-ink"}
							`}
						>
							<span>{tab.label}</span>
							{tab.badge !== undefined && tab.badge > 0 && (
								<span className="bg-accent text-white text-[9px] px-1 rounded-full min-w-[14px] h-3.5 flex items-center justify-center font-bold">
									{tab.badge}
								</span>
							)}
							{isActive && (
								<div className="absolute bottom-0 left-0 right-0 h-[3px] bg-accent" />
							)}
						</button>
					);
				})}
			</div>
		</div>
	);
}
