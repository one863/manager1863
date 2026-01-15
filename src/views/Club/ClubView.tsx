import { useState } from "preact/hooks";
import ClubManagement from "./ClubManagement";
import SponsorsFinances from "./SponsorsFinances";
import FansView from "./FansView";
import { useTranslation } from "react-i18next";
import { SubTabs } from "@/components/Common/SubTabs";
import { Trophy, History as HistoryIcon } from "lucide-preact";

type ClubTab = "finances" | "stadium" | "palmares" | "fans";

export default function ClubView() {
	const { t } = useTranslation();
	const [activeTab, setActiveTab] = useState<ClubTab>("finances");

	const tabs = [
		{ id: "finances", label: t("club.finances_tab", "Finances") },
		{ id: "stadium", label: t("club.stadium_tab", "Stade") },
		{ id: "palmares", label: t("club.palmares_tab", "Palmarès") },
		{ id: "fans", label: t("club.fans_tab", "Fans") },
	];

	return (
		<div className="animate-fade-in">
			<SubTabs
				tabs={tabs}
				activeTab={activeTab}
				onChange={(id) => setActiveTab(id as ClubTab)}
			/>

			<div className="mt-2 px-4 pb-24">
				{activeTab === "finances" && <SponsorsFinances />}
				{activeTab === "stadium" && <ClubManagement />}
				{activeTab === "palmares" && <PalmaresView />}
				{activeTab === "fans" && <FansView />}
			</div>
		</div>
	);
}

function PalmaresView() {
	return (
		<div className="space-y-6 animate-fade-in">
			<div className="bg-white p-12 rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center gap-4 opacity-50">
				<div className="w-20 h-20 bg-paper-dark rounded-full flex items-center justify-center text-ink-light border border-gray-200">
					<Trophy size={40} />
				</div>
				<div className="space-y-1">
					<h3 className="font-serif font-bold text-lg text-ink">Armoire à Trophées</h3>
					<p className="text-xs text-ink-light italic max-w-[200px]">
						"Monsieur, nous n'avons pas encore de trophées officiels à exposer dans nos vitrines."
					</p>
				</div>
			</div>

			<div className="bg-paper-dark/50 p-6 rounded-3xl border border-white/50 flex gap-4 items-start">
				<HistoryIcon size={20} className="text-accent shrink-0 mt-0.5" />
				<div className="space-y-1">
					<h4 className="text-[10px] font-black uppercase tracking-widest text-ink">Archives du Club</h4>
					<p className="text-xs text-ink-light leading-relaxed">
						L'histoire de l'institution s'écrit à chaque match. Les titres de champion et victoires en coupe apparaîtront ici.
					</p>
				</div>
			</div>
		</div>
	);
}
