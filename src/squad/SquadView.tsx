import { type Player, type StaffMember } from "@/core/db/db";
import { useGameStore } from "@/infrastructure/store/gameSlice";
import { useTranslation } from "react-i18next";
import { SubTabs } from "@/ui/components/Common/SubTabs";
import Roster from "./Roster";
import Training from "./training/TrainingView";
import Tactics from "./tactics/TacticsView";
import StaffList from "./StaffList";

type TeamTab = "squad" | "staff" | "tactics" | "training";

export default function SquadView({ 
	onSelectPlayer, 
	onSelectStaff
}: { 
	onSelectPlayer?: (p: Player) => void, 
	onSelectStaff?: (s: StaffMember) => void
}) {
	const { t } = useTranslation();
    const activeTab = useGameStore((state) => (state.uiContext.squad as TeamTab) || "squad");
    const setUIContext = useGameStore((state) => state.setUIContext);

	const tabs = [
		{ id: "squad", label: t("team.squad", "Effectif") },
		{ id: "staff", label: t("team.staff", "Staff") },
		{ id: "tactics", label: t("team.tactics", "Tactique") },
		{ id: "training", label: t("team.training", "Entrain.") },
	];

	return (
		<div className="animate-fade-in">
			<SubTabs
				tabs={tabs}
				activeTab={activeTab}
				onChange={(id) => setUIContext("squad", id)}
			/>

			<div className="mt-2 px-4">
				{activeTab === "squad" && <Roster onSelectPlayer={onSelectPlayer} />}
				{activeTab === "staff" && <StaffList onSelectStaff={onSelectStaff} />}
				{activeTab === "tactics" && <Tactics />}
				{activeTab === "training" && <Training />}
			</div>
		</div>
	);
}
