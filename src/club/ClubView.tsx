import { useGameStore } from "@/infrastructure/store/gameSlice";
import InfrastructureView from "./infrastructure/InfrastructureView";
import FinancesView from "./finance/FinancesView";
import FansView from "./fans/FansView";
import AcademyView from "./academy/AcademyView";
import HistoryView from "./HistoryView";
import { useTranslation } from "react-i18next";
import { SubTabs } from "@/ui/components/Common/SubTabs";

type ClubTab = "finances" | "stadium" | "academy" | "history" | "fans";

export default function ClubView() {
	const { t } = useTranslation();
    const activeTab = useGameStore((state) => (state.uiContext.club as ClubTab) || "finances");
    const setUIContext = useGameStore((state) => state.setUIContext);

	const tabs = [
		{ id: "finances", label: t("club.finances_tab", "Finances") },
		{ id: "stadium", label: t("club.stadium_tab", "Stade") },
		{ id: "academy", label: "Academy" },
		{ id: "history", label: t("club.palmares_tab", "Histoire") },
		{ id: "fans", label: t("club.fans_tab", "Fans") },
	];

	return (
		<div className="animate-fade-in">
			<SubTabs
				tabs={tabs}
				activeTab={activeTab}
				onChange={(id) => setUIContext("club", id)}
			/>

			<div className="mt-2 px-0 pb-24">
				{activeTab === "finances" && <div className="px-4"><FinancesView /></div>}
				{activeTab === "stadium" && <div className="px-4"><InfrastructureView /></div>}
				{activeTab === "academy" && <div className="px-4"><AcademyView /></div>}
				{activeTab === "history" && <HistoryView />}
				{activeTab === "fans" && <div className="px-4"><FansView /></div>}
			</div>
		</div>
	);
}
